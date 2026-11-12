import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { addToGrid, countItem, LAYOUTS } from '../src/core/inventory';
import { earnGold } from '../src/core/wallet';
import { makeUid } from '../src/core/rng';
import { ITEMS, getItem } from '../src/core/data/items';
import { VENDORS } from '../src/core/data/vendors';
import { buyPrice, sellPrice } from '../src/core/economy';
import { withDurability, maxDurability } from '../src/core/durability';
import { COOK_EVENTS, DISHES, MODULES, MODULE_ORDER } from '../src/core/data/refuge';
import { cookBatch, cookStep, prepMods, refugeOf, scrap, scrapMaterial, scrapYield, startCooking, upgradeBlock, upgradeModule } from '../src/core/refuge';
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
const withOrik = (p: Profile): Profile => ({ ...p, character: { ...p.character, level: 12 } });
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

describe('desguace', () => {
  it('el material depende del tipo y los consumibles no se desguazan', () => {
    expect(scrapMaterial('iron_sword')).toBe('scrap_metal');
    expect(scrapMaterial('apprentice_staff')).toBe('arcane_shard');
    expect(scrapMaterial('copper_ring')).toBe('arcane_shard');
    expect(scrapMaterial('padded_tunic')).toBe('leather_scrap');
    expect(scrapMaterial('health_potion')).toBeNull();
    expect(scrapMaterial('copper_ore')).toBeNull();
  });

  it('un objeto roto rinde menos, pero algo', () => {
    const st = { uid: 'x', itemId: 'chainmail', qty: 1 };
    const whole = scrapYield(st)!;
    const broken = scrapYield(withDurability(st, 0))!;
    expect(broken.qty).toBeGreaterThanOrEqual(1);
    expect(broken.qty).toBeLessThanOrEqual(whole.qty);
    expect(maxDurability(st)).toBeGreaterThan(0);
  });

  it('sin arbitraje: lo desguazado (con banco) nunca vale más que comprar el objeto', () => {
    for (const v of Object.values(VENDORS)) for (const { itemId } of v.stock) {
      const y = scrapYield({ uid: 'x', itemId, qty: 1 }, 1);
      if (!y) continue;
      const got = y.qty * sellPrice(y.itemId);
      expect(got, itemId).toBeLessThanOrEqual(buyPrice(itemId));
      if (buyPrice(itemId) > 1) expect(got, itemId).toBeLessThan(buyPrice(itemId));
    }
  });

  it('destruye el objeto una sola vez y entrega los materiales', () => {
    let p = give(withOrik(base()), 'iron_sword', 1);
    const idx = p.stash.findIndex((x) => x?.itemId === 'iron_sword');
    const r = scrap(p, 'stash', idx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    p = r.profile;
    expect(total(p, 'iron_sword')).toBe(0);
    expect(total(p, 'scrap_metal')).toBeGreaterThan(0);
    expect(scrap(p, 'stash', idx).ok).toBe(false);
  });

  it('el banco de trabajo rinde más', () => {
    const st = { uid: 'x', itemId: 'bastion_shield', qty: 1 };
    expect(scrapYield(st, 1)!.qty).toBeGreaterThanOrEqual(scrapYield(st, 0)!.qty);
  });
});

describe('cocina', () => {
  const cookReady = () => give(give(give({ ...base(), refuge: { cot: 0, kitchen: 2, bench: 0 } }, 'salted_meat', 5), 'cave_mushroom', 10), 'water', 5);

  it('hace falta el nivel de cocina de la receta', () => {
    const p = give(give(give(base(), 'salted_meat', 1), 'cave_mushroom', 1), 'water', 1);
    expect(startCooking(p, 'stew', 1).ok).toBe(false);
  });

  it('los ingredientes se gastan al empezar y los sucesos quedan fijados', () => {
    const p0 = cookReady();
    const r = startCooking(p0, 'stew', 42);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(total(r.profile, 'salted_meat')).toBe(total(p0, 'salted_meat') - 1);
    expect(r.profile.cooking!.events).toHaveLength(3);
    expect(startCooking(r.profile, 'stew', 43).ok).toBe(false);
  });

  it('acertar todos los pasos da el plato y devuelve un ingrediente; fallar da el plato estándar', () => {
    let r = startCooking(cookReady(), 'stew', 7);
    if (!r.ok) throw new Error();
    let p = r.profile;
    const shroom0 = total(p, 'cave_mushroom');
    for (const e of p.cooking!.events) { const s = cookStep(p, COOK_EVENTS[e].heat); if (!s.ok) throw new Error(s.error); p = s.profile; }
    expect(p.cooking).toBeNull();
    expect(total(p, 'hearty_stew')).toBe(1);
    expect(total(p, 'cave_mushroom')).toBe(shroom0 + 1);
    expect(p.cooked).toContain('stew');

    r = startCooking(p, 'stew', 8);
    if (!r.ok) throw new Error();
    p = r.profile;
    const wrong = (h: string) => (h === 'low' ? 'high' : 'low');
    for (const e of p.cooking!.events) { const s = cookStep(p, wrong(COOK_EVENTS[e].heat)); if (!s.ok) throw new Error(); p = s.profile; }
    expect(total(p, 'hearty_stew')).toBe(2);
  });

  it('la producción por lotes pide haberla cocinado antes y no supera el lote máximo', () => {
    const p = cookReady();
    expect(cookBatch(p, 'stew', 2).ok).toBe(false);
    const r = cookBatch({ ...p, cooked: ['stew'] }, 'stew', 3);
    expect(r.ok).toBe(true);
    if (r.ok) expect(total(r.profile, 'hearty_stew')).toBe(3);
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
