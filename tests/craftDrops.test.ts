import { describe, expect, it } from 'vitest';
import { makeRng } from '../src/core/rng';
import { getItem } from '../src/core/data/items';
import { VENDORS } from '../src/core/data/vendors';
import { buy } from '../src/core/economy';
import { CRAFT_RECIPES } from '../src/core/crafting';
import { blueprintPool, blueprintTier, chestCraftDrops, enemyCraftDrops, legendaryPool, subzoneTier, vendorBlueprints } from '../src/core/craftDrops';
import { CHEST_MATERIALS } from '../src/config/craftDrops';
import '../src/core/vendors';

const many = <T,>(n: number, f: (i: number) => T[]) => Array.from({ length: n }, (_, i) => f(i)).flat();

describe('Bloque 2, fase 4: fuentes de materias y planos', () => {
  it('toda materia prima de una receta tiene de dónde salir', () => {
    const made = new Set(CRAFT_RECIPES.map((r) => r.result));
    const sellers = new Set(Object.values(VENDORS).flatMap((v) => v.stock.map((s) => s.itemId)));
    const chest = new Set(CHEST_MATERIALS.map((m) => m.itemId));
    const raws = new Set(CRAFT_RECIPES.flatMap((r) => r.ingredients.map((i) => i.itemId)).filter((id) => !made.has(id) && getItem(id).category === 'material'));
    for (const id of ['old_wood', 'ragged_cloth', 'bitter_herb', 'flour', 'goat_milk', 'sour_wine']) expect(raws.has(id) || sellers.has(id)).toBe(true);
    for (const id of ['old_wood', 'ragged_cloth', 'bitter_herb', 'flour', 'goat_milk', 'sour_wine']) expect(sellers.has(id), id).toBe(true);
    for (const id of ['scrap_metal', 'arcane_shard']) expect(chest.has(id), id).toBe(true);
  });

  it('cada plano tiene subzona y los raros y épicos caen en alguna', () => {
    const bps = [...new Set(CRAFT_RECIPES.map((r) => r.blueprint).filter((b): b is string => !!b))];
    const anywhere = new Set(Array.from({ length: 10 }, (_, i) => blueprintPool(i + 1)).flat());
    for (const b of bps) {
      expect(blueprintTier(b), b).toBeGreaterThan(0);
      if (getItem(b).rarity !== 'legendary') expect(anywhere.has(b), b).toBe(true);
    }
    expect(legendaryPool().length).toBeGreaterThan(0);
  });

  it('los cofres de las Afueras dan madera y chatarra, pero no planos si no tienen cerradura', () => {
    const rng = makeRng(7);
    const got = many(300, () => chestCraftDrops(1, { locked: false, boss: false }, rng));
    expect(got.some((s) => s.itemId === 'old_wood')).toBe(true);
    expect(got.some((s) => s.itemId === 'scrap_metal')).toBe(true);
    expect(got.some((s) => getItem(s.itemId).category === 'blueprint')).toBe(false);
    expect(got.some((s) => s.itemId === 'bitter_herb')).toBe(true);
    // La madera no sale en el Infierno
    expect(many(300, () => chestCraftDrops(9, { locked: false, boss: false }, rng)).some((s) => s.itemId === 'old_wood')).toBe(false);
  });

  it('los cofres con cerradura sueltan planos de su subzona', () => {
    const rng = makeRng(3);
    const bps = many(400, () => chestCraftDrops(5, { locked: true, boss: false }, rng)).filter((s) => getItem(s.itemId).category === 'blueprint');
    expect(bps.length).toBeGreaterThan(10);
    for (const s of bps) expect(Math.abs(blueprintTier(s.itemId) - 5)).toBeLessThanOrEqual(1);
    expect(bps.some((s) => getItem(s.itemId).rarity === 'legendary')).toBe(false);
  });

  it('los planos legendarios solo los dan jefes y élites del fondo', () => {
    const rng = makeRng(11);
    const leg = (tier: number) => many(600, () => enemyCraftDrops('x', tier, { elite: false, boss: true }, rng)).filter((s) => getItem(s.itemId).rarity === 'legendary');
    expect(leg(5).length).toBe(0);
    expect(leg(9).length).toBeGreaterThan(0);
    // Un enemigo normal no suelta planos
    expect(many(300, () => enemyCraftDrops('x', 9, { elite: false, boss: false }, rng)).length).toBe(0);
  });

  it('lobos y bandidos dan retales; cultistas y ahorcados, tela', () => {
    const rng = makeRng(5);
    expect(many(50, () => enemyCraftDrops('starving_wolf', 1, { elite: false, boss: false }, rng)).some((s) => s.itemId === 'leather_scrap')).toBe(true);
    expect(many(50, () => enemyCraftDrops('flame_cultist', 7, { elite: false, boss: false }, rng)).some((s) => s.itemId === 'ragged_cloth')).toBe(true);
  });

  it('Brand, Valerius y Eldrin venden planos raros con reputación alta, nunca legendarios', () => {
    for (const v of ['brand', 'valerius', 'eldrin'] as const) {
      const list = vendorBlueprints(v);
      expect(list.length, v).toBeGreaterThan(0);
      for (const b of list) {
        expect(getItem(b.itemId).rarity).toBe('rare');
        expect(b.rank).toBeGreaterThanOrEqual(2);
        expect(VENDORS[v].stock.some((s) => s.itemId === b.itemId)).toBe(true);
      }
    }
  });

  it('un plano no se vende sin la reputación', () => {
    const bp = vendorBlueprints('brand')[0];
    const p = { gold: 99999, reputation: {}, backpack: Array(24).fill(null), stash: [] } as never;
    const r = buy(p, bp.itemId, 'brand');
    expect(r.ok).toBe(false);
  });

  it('el número de subzona va de 1 a 10', () => {
    expect(subzoneTier('afueras')).toBe(1);
    expect(subzoneTier('trono')).toBe(10);
    expect(subzoneTier(undefined)).toBe(0);
  });
});
