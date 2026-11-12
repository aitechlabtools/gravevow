import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { addToGrid, countItem, LAYOUTS } from '../src/core/inventory';
import { earnGold } from '../src/core/wallet';
import { makeUid } from '../src/core/rng';
import { ITEMS, getItem } from '../src/core/data/items';
import { VENDORS } from '../src/core/data/vendors';
import { buyPrice, sellPrice } from '../src/core/economy';
import { DISHES, MODULES, MODULE_ORDER } from '../src/core/data/refuge';
import { prepMods, refugeOf, upgradeBlock, upgradeModule } from '../src/core/refuge';
import { craft, craftBlock } from '../src/core/crafting';
import { consumptionMult, tickNeeds, FULL_NEEDS } from '../src/core/needs';
import { startExpedition } from '../src/core/expedition';
import { fromWounds } from '../src/core/anatomy';
import { NEED_CFG } from '../src/config/needs';
import type { Profile } from '../src/core/types';

// Fase 9: Refugio, desguace y cocina. Ninguna combinación de comprar y transformar da oro sin riesgo.

const base = () => createProfile('Sim', 'warrior', { cloak: 0, skin: 0 });
function give(p: Profile, itemId: string, qty: number): Profile {
  const r = addToGrid(p.stash, { uid: makeUid(), itemId, qty }, LAYOUTS.stash);
  expect(r.leftover).toBeNull();
  return { ...p, stash: r.grid };
}
function rich(p: Profile, gold = 500): Profile {
  const r = earnGold(p, gold);
  if (!r.ok) throw new Error(r.error);
  return r.profile;
}
const total = (p: Profile, id: string) => countItem(p.backpack, id) + countItem(p.stash, id);

describe('Refugio', () => {
  it('parte 2.1: todo bloqueado menos el catre (nivel 1); el desbloqueo gasta materiales y oro una vez', () => {
    let p = rich(give(give(base(), 'scrap_metal', 3), 'cave_mushroom', 3));
    expect(refugeOf(p)).toEqual({ cot: 1, kitchen: 0, bench: 0, infirmary: 0, forge: 0, alchemy: 0, runic: 0, v: 2 });
    const gold0 = p.gold;
    const r = upgradeModule(p, 'kitchen');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    p = r.profile;
    expect(refugeOf(p).kitchen).toBe(1);
    expect(total(p, 'scrap_metal')).toBe(1);
    expect(total(p, 'cave_mushroom')).toBe(1);
    expect(gold0 - p.gold).toBe(MODULES.kitchen.levels[1].cost!.gold);
    expect(r.note).toMatch(/Garth/);
  });

  it('sin requisito de llegada: solo dice qué falta', () => {
    const p = rich(give(give(base(), 'scrap_metal', 20), 'leather_scrap', 20));
    expect(upgradeBlock(base(), 'bench')).toMatch(/chatarra|oro/i);
    expect(upgradeModule(p, 'bench').ok).toBe(true);
  });

  it('migración: el catre sube uno y lo demás conserva su nivel', () => {
    const old = { ...base(), refuge: { cot: 1, kitchen: 2, bench: 1, infirmary: 1, alchemy: 1 } };
    expect(refugeOf(old)).toMatchObject({ cot: 2, kitchen: 2, bench: 1, infirmary: 1, alchemy: 1, forge: 0, runic: 0 });
    expect(refugeOf({ ...base(), refuge: { cot: 0, kitchen: 0, bench: 0 } }).cot).toBe(1);
    // Ya migrado: no vuelve a subir
    expect(refugeOf({ ...base(), refuge: refugeOf(old) }).cot).toBe(2);
  });

  it('no se mejora por encima del nivel 3', () => {
    const p = { ...base(), refuge: { cot: 3, kitchen: 3, bench: 3, infirmary: 3, forge: 3, alchemy: 3, runic: 3, v: 2 as const } };
    for (const id of MODULE_ORDER) expect(upgradeBlock(p, id)).toMatch(/máximo/);
  });

  it('cada estación tiene 3 niveles con coste y encargado, y el desbloqueo es simbólico', () => {
    let gold = 0;
    for (const id of MODULE_ORDER) {
      const m = MODULES[id];
      expect(VENDORS[m.by]).toBeTruthy();
      for (const l of [2, 3]) expect(m.levels[l].cost!.gold).toBeGreaterThan(m.levels[1].cost?.gold ?? 0);
      if (id === 'cot') continue;
      const c = m.levels[1].cost!;
      gold += c.gold;
      for (const it of c.items) expect(['scrap_metal', 'leather_scrap', 'cave_mushroom', 'water', 'arcane_shard', 'bone_dust', 'copper_ore']).toContain(it.itemId);
      expect(c.items.reduce((a, b) => a + b.qty, 0)).toBeLessThanOrEqual(6);
    }
    expect(gold).toBeLessThanOrEqual(120);
  });
});

describe('preparación', () => {
  it('catre y plato se suman por fuente y respetan el tope del 30 %', () => {
    expect(prepMods({ cot: true, dish: 'hearty_stew' }).rest).toBeCloseTo(-0.2);
    expect(prepMods({ dish: 'spiced_broth' })).toEqual({ sat: -0.1, hyd: -0.1 });
    expect(consumptionMult('rest', undefined, 0, { rest: -0.2 })).toBeCloseTo(0.8);
    expect(consumptionMult('rest', undefined, 0, { rest: -0.9 })).toBeCloseTo(1 - NEED_CFG.maxReduction);
  });

  it('se lleva a la incursión y se gasta al bajar', () => {
    const p = { ...base(), prep: { cot: true } };
    const { profile, expedition } = startExpedition(p, 0);
    expect(profile.prep).toBeNull();
    expect(expedition.prep).toEqual({ cot: true });
    const body = fromWounds(null, 100);
    const a = tickNeeds({ ...FULL_NEEDS }, body, body.total, 0, prepMods(expedition.prep));
    const b = tickNeeds({ ...FULL_NEEDS }, body, body.total, 0, {});
    expect(100 - a.needs.rest).toBeLessThan(100 - b.needs.rest);
    expect(a.needs.sat).toBeCloseTo(b.needs.sat);
  });
});

describe('cocina', () => {
  const cookReady = () => { const p = give(give(give(base(), 'salted_meat', 5), 'cave_mushroom', 10), 'water', 5); return { ...p, refuge: { ...refugeOf(p), kitchen: 2 } }; };

  it('sin cocina no se cocina; con ella, el plato sale del menú común sin minijuego ni primera vez', () => {
    const raw = give(give(give(base(), 'salted_meat', 5), 'cave_mushroom', 10), 'water', 5);
    expect(craftBlock({ ...raw, refuge: { ...refugeOf(raw), kitchen: 0 } }, 'c_hearty_stew')).toMatch(/cerrada/);
    expect(craftBlock({ ...raw, refuge: { ...refugeOf(raw), kitchen: 1 } }, 'c_hearty_stew')).toMatch(/nivel 2/);
    const r = craft(cookReady(), 'c_hearty_stew', 3, false, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.crafted.made.reduce((t, m) => t + m.qty, 0)).toBe(3);
    expect(total(r.crafted.profile, 'salted_meat')).toBe(2);
    expect(r.crafted.profile.cooking ?? null).toBeNull();
  });

  it('sin arbitraje: un plato vale menos que sus ingredientes comprados', () => {
    for (const d of DISHES) {
      const cost = d.ingredients.reduce((t, m) => t + buyPrice(m.itemId) * m.qty, 0);
      expect(sellPrice(d.result), d.id).toBeLessThan(cost);
    }
    // Todo lo que pide una receta se puede conseguir sin bajar (Garth)
    const sold = new Set(VENDORS.garth.stock.map((s) => s.itemId));
    for (const d of DISHES) for (const m of d.ingredients) expect(sold.has(m.itemId), m.itemId).toBe(true);
    expect(getItem('hearty_stew').use?.kind).toBe('need');
    expect(ITEMS.scrap_metal).toBeTruthy();
  });
});
