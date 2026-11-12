import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { addToGrid, countItem, LAYOUTS, emptyGrid } from '../src/core/inventory';
import { makeUid } from '../src/core/rng';
import { CRAFT_RECIPES, BLUEPRINT_ITEMS } from '../src/core/data/crafting';
import { ITEMS, getItem } from '../src/core/data/items';
import { RARITY_RULES, RARITY_ORDER } from '../src/core/data/rarity';
import { CRAFT_CFG } from '../src/config/crafting';
import { craft, craftBlock, fineChance, getRecipe, learnBlueprints, maxCraftable, recipeFor, settlePendingJobs, storeCrafted, takeComponents } from '../src/core/crafting';
import type { Profile } from '../src/core/types';

// Bloque 2, fase 1: datos del crafteo y lógica común. Nada se pierde y ningún bucle da beneficio.

const base = () => createProfile('Sim', 'warrior', { cloak: 0, skin: 0 });
function give(p: Profile, itemId: string, qty: number, where: 'stash' | 'backpack' = 'stash'): Profile {
  const r = addToGrid(p[where], { uid: makeUid(), itemId, qty }, LAYOUTS[where]);
  expect(r.leftover).toBeNull();
  return { ...p, [where]: r.grid };
}
const total = (p: Profile, id: string) => countItem(p.backpack, id) + countItem(p.stash, id);
const open = (p: Profile, lv = 1): Profile => ({ ...p, refuge: { cot: 0, kitchen: lv, bench: lv, infirmary: lv, alchemy: lv, forge: lv } as Profile['refuge'] });

describe('datos del crafteo', () => {
  it('cada receta usa objetos que existen y no hay ciclos', () => {
    for (const r of CRAFT_RECIPES) {
      expect(() => getItem(r.result)).not.toThrow();
      for (const m of r.ingredients) expect(() => getItem(m.itemId), `${r.id}: ${m.itemId}`).not.toThrow();
      if (r.blueprint) expect(getItem(r.blueprint).category).toBe('blueprint');
      if (r.fine) expect(() => getItem(r.fine!)).not.toThrow();
    }
    const seen = new Set<string>();
    const walk = (id: string, path: string[]) => {
      expect(path, `ciclo: ${path.join(' → ')}`).not.toContain(id);
      if (seen.has(id)) return;
      const r = recipeFor(id);
      if (r) for (const m of r.ingredients) walk(m.itemId, [...path, id]);
      seen.add(id);
    };
    for (const r of CRAFT_RECIPES) walk(r.result, []);
  });
  it('una receta por objeto; todo el equipo que se encuentra tiene receta (menos recluta y tesoros)', () => {
    const ids = CRAFT_RECIPES.map((r) => r.result);
    expect(new Set(ids).size).toBe(ids.length);
    const missing = Object.values(ITEMS).filter((d) => d.slot && !d.recruit && d.value > 0 && !recipeFor(d.id)).map((d) => d.id);
    expect(missing).toEqual([]);
    for (const d of Object.values(ITEMS)) if (d.recruit) expect(recipeFor(d.id)).toBeUndefined();
  });
  it('raro, épico y legendario piden plano; lo legendario, nivel 3', () => {
    for (const r of CRAFT_RECIPES) {
      const rar = getItem(r.result).rarity;
      if (['rare', 'epic', 'legendary'].includes(rar) && getItem(r.result).slot) expect(r.blueprint, r.id).toBeTruthy();
      if (rar === 'legendary') expect(r.level).toBe(3);
    }
    expect(BLUEPRINT_ITEMS.length).toBe(CRAFT_RECIPES.filter((r) => r.blueprint).length);
  });
});

describe('economía: ningún bucle gana', () => {
  // Valor en materias primas de una unidad (descomponiendo los intermedios)
  const rawValue = (id: string): number => {
    const r = recipeFor(id);
    if (!r || getItem(id).slot || !r.ingredients.length || !CRAFT_RECIPES.some((x) => x.ingredients.some((m) => m.itemId === id))) return getItem(id).value;
    return r.ingredients.reduce((s, m) => s + rawValue(m.itemId) * m.qty, 0) / r.qty;
  };
  const inputValue = (id: string) => getRecipe(id).ingredients.reduce((s, m) => s + rawValue(m.itemId) * m.qty, 0);
  it('comprar los componentes y vender lo fabricado siempre pierde, incluso con acabado fino y atributos', () => {
    const bad: string[] = [];
    for (const r of CRAFT_RECIPES) {
      const def = getItem(r.result);
      const cap = def.slot ? CRAFT_CFG.fineCap[def.rarity] : def.rarity;
      const best = RARITY_RULES[cap].statMult / RARITY_RULES[def.rarity].statMult * (1 + 0.1 * RARITY_RULES[cap].affixes[1]);
      const sellMax = 0.4 * def.value * r.qty * best;
      if (sellMax >= inputValue(r.id)) bad.push(`${r.id}: vende ${sellMax.toFixed(1)} y cuesta ${inputValue(r.id).toFixed(1)}`);
    }
    expect(bad).toEqual([]);
  });
  it('fabricar el equipo cuesta menos que comprarlo, pero no regalado (mediana 50–90 %)', () => {
    const ratios = CRAFT_RECIPES.filter((r) => getItem(r.result).slot).map((r) => inputValue(r.id) / getItem(r.result).value).sort((a, b) => a - b);
    for (const x of ratios) expect(x).toBeLessThanOrEqual(1.0001);
    const med = ratios[Math.floor(ratios.length / 2)];
    expect(med).toBeGreaterThan(0.5);
    expect(med).toBeLessThan(0.9);
  });
});

describe('fabricar', () => {
  it('pide el espacio abierto, su nivel y el plano', () => {
    const p = give(give(base(), 'scrap_metal', 10), 'old_wood', 4);
    expect(craftBlock(p, 'c_scrap_bar')).toMatch(/cerrada/);
    expect(craftBlock(open(p), 'c_scrap_bar')).toBeNull();
    const knight = CRAFT_RECIPES.find((r) => r.blueprint && r.level === 1)!;
    expect(craftBlock(open(p), knight.id)).toMatch(/plano/);
    const high = CRAFT_RECIPES.find((r) => r.level === 3 && !r.blueprint)!;
    expect(craftBlock(open(p), high.id)).toMatch(/nivel 3/);
  });
  it('toma del almacén primero, respeta el lote y no cobra oro', () => {
    let p = open(give(give(base(), 'scrap_metal', 3, 'stash'), 'scrap_metal', 20, 'backpack'));
    const gold = p.gold;
    expect(maxCraftable(p, getRecipe('c_scrap_bar'))).toBe(CRAFT_CFG.batch[1]);
    expect(craftBlock(p, 'c_scrap_bar', 6)).toMatch(/Lote/);
    const r = craft(p, 'c_scrap_bar', 2, false, 1);
    if (!r.ok) throw new Error(r.error);
    p = r.crafted.profile;
    expect(countItem(p.stash, 'scrap_metal')).toBe(0);
    expect(countItem(p.backpack, 'scrap_metal')).toBe(19);
    expect(p.gold).toBe(gold);
    expect(r.crafted.made).toEqual([expect.objectContaining({ itemId: 'scrap_bar', qty: 2 })]);
  });
  it('si falta algo no toca nada', () => {
    const p = open(give(base(), 'scrap_metal', 1));
    expect(craft(p, 'c_scrap_bar', 1, false, 1).ok).toBe(false);
    expect(takeComponents(p, [{ itemId: 'scrap_metal', qty: 2 }])).toBeNull();
  });
  it('el acabado fino sube una rareza, gasta el material fino y respeta el tope', () => {
    const r = CRAFT_RECIPES.find((x) => x.fine === 'blessed_silver' && getItem(x.result).rarity === 'uncommon' && !x.blueprint)!;
    let p = open(base(), 3);
    for (const m of r.ingredients) p = give(p, m.itemId, m.qty * 5);
    p = give(p, 'blessed_silver', 5);
    expect(fineChance(p, r, true)).toBeCloseTo(0.45);
    expect(fineChance(open(base(), 1), r, false)).toBe(0);
    const out = craft(p, r.id, 5, true, 7);
    if (!out.ok) throw new Error(out.error);
    expect(total(out.crafted.profile, 'blessed_silver')).toBe(0);
    for (const s of out.crafted.made) expect(['uncommon', 'rare']).toContain(s.rarity ?? 'uncommon');
    const n = out.crafted.made.filter((s) => s.rarity === 'rare').length;
    expect(n).toBe(out.crafted.fineCount);
    // Lo épico no sube nunca y nada se vuelve legendario
    const epic = CRAFT_RECIPES.find((x) => getItem(x.result).rarity === 'epic')!;
    expect(fineChance(open(base(), 3), epic, true)).toBe(0);
    expect(RARITY_ORDER.indexOf(CRAFT_CFG.fineCap.rare)).toBeLessThan(RARITY_ORDER.indexOf('legendary'));
  });
  it('lo fabricado va a la mochila o al almacén; si no cabe, al otro y luego a la recepción', () => {
    const p = base();
    const made = [{ uid: makeUid(), itemId: 'iron_sword', qty: 1 }];
    expect(countItem(storeCrafted(p, made, 'backpack').profile.backpack, 'iron_sword')).toBe(1);
    expect(countItem(storeCrafted(p, made, 'stash').profile.stash, 'iron_sword')).toBe(1);
    const full = (n: number) => Array.from({ length: n }, () => ({ uid: makeUid(), itemId: 'rusty_sword', qty: 1 }));
    const jammed = { ...p, backpack: full(p.backpack.length), stash: full(p.stash.length) };
    const s = storeCrafted(jammed, made, 'backpack');
    expect(s.toReception).toBe(true);
    expect(s.profile.reception?.at(-1)?.itemId).toBe('iron_sword');
    expect(emptyGrid).toBeDefined();
  });
});

describe('planos y migración', () => {
  it('los planos se aprenden una vez y los repetidos se quedan', () => {
    const bp = BLUEPRINT_ITEMS[0].id;
    let p = give(give(base(), bp, 1), bp, 1, 'backpack');
    const l = learnBlueprints(p);
    expect(l.learned).toEqual([bp]);
    p = l.profile;
    expect(p.blueprints).toContain(bp);
    expect(total(p, bp)).toBe(1);
    expect(learnBlueprints(p).learned).toEqual([]);
  });
  it('un minijuego a medias se entrega con el resultado estándar', () => {
    const p = { ...base(), cooking: { recipe: 'stew', events: [0, 1, 2], picks: [] }, workshop: { station: 'forge' as const, recipe: 'r_tempered_sword', readings: [800, 850, 900], picks: ['up' as const] } };
    const r = settlePendingJobs(p);
    if (!r.ok) throw new Error(r.error);
    expect(r.profile.cooking).toBeNull();
    expect(r.profile.workshop).toBeNull();
    expect(total(r.profile, 'hearty_stew')).toBe(1);
    const sword = [...r.profile.backpack, ...r.profile.stash].find((s) => s?.itemId === 'tempered_sword');
    expect(sword?.quality).toBe(0);
    expect(settlePendingJobs(base()).ok).toBe(true);
  });
});
