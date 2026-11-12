import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { addToGrid, countItem, LAYOUTS } from '../src/core/inventory';
import { makeUid } from '../src/core/rng';
import { getItem, ITEMS } from '../src/core/data/items';
import { CRAFT_RECIPES } from '../src/core/data/crafting';
import { VENDORS } from '../src/core/data/vendors';
import { buyPrice, sellPrice } from '../src/core/economy';
import { withDurability } from '../src/core/durability';
import { isSimpleRecipe, needsConfirm, rollSalvage, salvage, salvageInfo, scrapMaterial } from '../src/core/salvage';
import type { Profile } from '../src/core/types';

// Bloque 2, fase 5: desguace nuevo (seguro y posible, azar por rareza, recluta bloqueado, varios a la vez).

const base = () => createProfile('Sim', 'warrior', { cloak: 0, skin: 0 });
function give(p: Profile, itemId: string, qty = 1, extra: object = {}): Profile {
  const r = addToGrid(p.stash, { uid: makeUid(), itemId, qty, ...extra }, LAYOUTS.stash);
  expect(r.leftover).toBeNull();
  return { ...p, stash: r.grid };
}
const total = (p: Profile, id: string) => countItem(p.backpack, id) + countItem(p.stash, id);
const st = (itemId: string, extra: object = {}) => ({ uid: 'x', itemId, qty: 1, ...extra });
// Valor esperado (a precio de ficha) de lo que da un desguace
const expected = (itemId: string, bench: number, extra: object = {}) => {
  const i = salvageInfo(st(itemId, extra), bench)!;
  return i.safe.reduce((s, m) => s + getItem(m.itemId).value * m.qty, 0) + i.possible.reduce((s, m) => s + getItem(m.itemId).value * m.qty * m.chance, 0);
};
const recipeValue = (itemId: string) => { const r = CRAFT_RECIPES.find((x) => x.result === itemId)!; return r.ingredients.reduce((s, m) => s + getItem(m.itemId).value * m.qty, 0) / r.qty; };

describe('desguace: seguro y posible', () => {
  it('el material base depende del tipo; lo que no es equipo no se desguaza', () => {
    expect(scrapMaterial('iron_sword')).toBe('scrap_metal');
    expect(scrapMaterial('apprentice_staff')).toBe('arcane_shard');
    expect(scrapMaterial('copper_ring')).toBe('arcane_shard');
    expect(scrapMaterial('padded_tunic')).toBe('leather_scrap');
    expect(salvageInfo(st('health_potion'))).toBeNull();
    expect(salvageInfo(st('copper_ore'))).toBeNull();
  });

  it('lo posible son los componentes de su receta, con la probabilidad de su rareza', () => {
    const r = CRAFT_RECIPES.find((x) => getItem(x.result).slot && getItem(x.result).rarity === 'uncommon' && x.ingredients.length > 1)!;
    const i = salvageInfo(st(r.result))!;
    expect(i.possible.map((m) => m.itemId)).toEqual(r.ingredients.map((m) => m.itemId));
    for (const m of i.possible) expect(m.chance).toBeCloseTo(0.25);
    expect(i.safe[0].qty).toBeGreaterThanOrEqual(1);
    expect(salvageInfo(st(r.result, { rarity: 'epic' }))!.possible[0].chance).toBeCloseTo(0.35);
  });

  it('el banco sube la probabilidad y lo roto la baja al 35 %', () => {
    const id = 'chainmail';
    const c0 = salvageInfo(st(id), 0)!.possible[0].chance;
    expect(salvageInfo(st(id), 1)!.possible[0].chance).toBeCloseTo(c0 * 1.25, 2);
    expect(salvageInfo(st(id), 3)!.possible[0].chance).toBeCloseTo(c0 * 1.55, 2);
    const broken = salvageInfo(withDurability(st(id), 0), 0)!;
    expect(broken.broken).toBe(true);
    expect(broken.possible[0].chance).toBeCloseTo(c0 * 0.35, 2);
  });

  it('las recetas simples no tienen parte segura', () => {
    const simple = CRAFT_RECIPES.filter((r) => getItem(r.result).slot && isSimpleRecipe(r.result));
    expect(simple.length).toBeGreaterThanOrEqual(10);
    for (const r of simple) expect(salvageInfo(st(r.result))!.safe, r.result).toEqual([]);
  });

  it('el equipo de recluta no se desguaza; lo raro pide confirmación', () => {
    const recruit = Object.values(ITEMS).find((d) => d.recruit && d.slot)!;
    expect(salvageInfo(st(recruit.id))).toBeNull();
    expect(needsConfirm(st('chainmail', { rarity: 'rare' }))).toBe(true);
    expect(needsConfirm(st('chainmail', { rarity: 'common' }))).toBe(false);
  });

  it('las tiradas: lo seguro siempre; lo posible, entre 0 y el máximo', () => {
    const i = salvageInfo(st('chainmail'), 3)!;
    for (let s = 1; s < 60; s++) {
      const got = rollSalvage(i, s);
      for (const x of i.safe) expect(got.find((g) => g.itemId === x.itemId)!.qty).toBeGreaterThanOrEqual(x.qty);
      for (const m of i.possible) expect(got.find((g) => g.itemId === m.itemId)?.qty ?? 0).toBeLessThanOrEqual(m.qty + (i.safe.find((x) => x.itemId === m.itemId)?.qty ?? 0));
    }
  });
});

describe('desguace: sin bucles', () => {
  it('fabricar y desguazar pierde: un 40 % o más con el banco de nivel 1 y un 25 % o más con el de maestro (épico)', () => {
    for (const r of CRAFT_RECIPES.filter((x) => getItem(x.result).slot && !getItem(x.result).recruit)) {
      expect(expected(r.result, 1, { rarity: 'epic' }) / recipeValue(r.result), r.result).toBeLessThanOrEqual(0.6);
      expect(expected(r.result, 3, { rarity: 'epic' }) / recipeValue(r.result), r.result).toBeLessThan(0.75);
    }
  });
  it('comprar un objeto para desguazarlo y vender lo sacado siempre pierde', () => {
    for (const v of Object.values(VENDORS)) for (const { itemId } of v.stock) {
      const i = salvageInfo(st(itemId), 3);
      if (!i) continue;
      const exp = i.safe.reduce((s, m) => s + sellPrice(m.itemId) * m.qty, 0) + i.possible.reduce((s, m) => s + sellPrice(m.itemId) * m.qty * m.chance, 0);
      expect(exp, itemId).toBeLessThan(buyPrice(itemId));
    }
  });
});

describe('desguace: varios a la vez', () => {
  it('destruye cada objeto una sola vez y suma lo obtenido', () => {
    let p = give(give(give(base(), 'chainmail'), 'iron_helm'), 'chainmail');
    const idx = p.stash.map((x, i) => (x && ['chainmail', 'iron_helm'].includes(x.itemId) ? i : -1)).filter((i) => i >= 0);
    const scrapBefore = total(p, 'scrap_metal');
    const r = salvage(p, [...idx, idx[0]].map((index) => ({ container: 'stash' as const, index })), 42);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    p = r.profile;
    expect(total(p, 'chainmail')).toBe(0);
    expect(total(p, 'iron_helm')).toBe(0);
    expect(total(p, 'scrap_metal')).toBeGreaterThan(scrapBefore);
    expect(salvage(p, [{ container: 'stash', index: idx[0] }], 1).ok).toBe(false);
  });
  it('si hay algo de recluta en la selección no toca nada', () => {
    const recruit = Object.values(ITEMS).find((d) => d.recruit && d.slot)!;
    const p = give(give(base(), 'chainmail'), recruit.id);
    const idx = p.stash.map((x, i) => (x ? i : -1)).filter((i) => i >= 0 && p.stash[i] && !('cover' in (p.stash[i] as object)));
    const r = salvage(p, idx.map((index) => ({ container: 'stash' as const, index })), 1);
    expect(r.ok).toBe(false);
  });
});
