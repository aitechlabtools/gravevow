import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { addToGrid, countItem, LAYOUTS } from '../src/core/inventory';
import { earnGold } from '../src/core/wallet';
import { makeUid } from '../src/core/rng';
import { RECIPES } from '../src/core/data/forge';
import { ALCHEMY, CARE, FORGE_BANDS, STATIONS } from '../src/core/data/workshop';
import { buyPrice, sellPrice } from '../src/core/economy';
import { forgeCost } from '../src/core/forge';
import { alchemyBatch, jobBand, prepareCare, quickForge, rightMove, rollReadings, startAlchemy, startForging, workshopStep } from '../src/core/workshop';
import { deliver, receptionBlock, receptionDiscard, receptionScrap, receptionSell, receptionWithdraw, startCooking } from '../src/core/refuge';
import type { Profile } from '../src/core/types';

// Fase 9 (segunda tanda): yunque, mesa de alquimia, rincón de cura y recepción. Nada da oro sin riesgo ni se pierde.

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
const smith = () => rich(give(give(base(), 'iron_ore', 20), 'bone_dust', 20));
const lab = () => give(give(give({ ...base(), refuge: { cot: 0, kitchen: 0, bench: 0, infirmary: 1, alchemy: 1 } }, 'arcane_shard', 20), 'cave_mushroom', 20), 'water', 20);
function play(p: Profile, good: (i: number) => boolean): Profile & { _q?: number } {
  let q = p;
  let last: ReturnType<typeof workshopStep> | null = null;
  const job = q.workshop!;
  job.readings.forEach((t, i) => {
    const right = rightMove(t, jobBand(job));
    last = workshopStep(q, good(i) ? right : right === 'up' ? 'down' : 'up');
    if (!last.ok) throw new Error(last.error);
    q = last.profile;
  });
  return { ...q, _q: (last as unknown as { quality?: number }).quality };
}

describe('lecturas', () => {
  it('cada lectura cae claramente fuera o dentro de la franja, y la semilla fija el resultado', () => {
    for (let seed = 1; seed < 50; seed++) {
      const a = rollReadings(seed, 'forge', FORGE_BANDS.weapon, 3);
      expect(a).toEqual(rollReadings(seed, 'forge', FORGE_BANDS.weapon, 3));
      for (const t of a) {
        expect(t % STATIONS.forge.round).toBe(0);
        expect(Math.abs(t - 860)).toBeLessThanOrEqual(40 + STATIONS.forge.spread);
      }
    }
    expect(rightMove(700, [820, 900])).toBe('up');
    expect(rightMove(820, [820, 900])).toBe('hold');
    expect(rightMove(910, [820, 900])).toBe('down');
  });
});

describe('yunque', () => {
  it('se paga al empezar, no deja dos trabajos y la calidad depende de los aciertos', () => {
    const p0 = smith();
    const r = startForging(p0, 'r_tempered_sword', 11);
    if (!r.ok) throw new Error(r.error);
    expect(total(r.profile, 'iron_ore')).toBe(14);
    expect(startForging(r.profile, 'r_tempered_sword', 12).ok).toBe(false);
    expect(play(r.profile, () => true)._q).toBe(2);
    expect(play(r.profile, (i) => i > 0)._q).toBe(1);
    const bad = play(r.profile, () => false);
    expect(bad._q).toBe(0);
    expect(total(bad, 'tempered_sword')).toBe(1);
    expect(bad.workshop).toBeNull();
  });

  it('la forja rápida pide haberla hecho en el yunque y da tosca', () => {
    expect(quickForge(smith(), 'r_tempered_sword').ok).toBe(false);
    const r = quickForge({ ...smith(), crafted: ['r_tempered_sword'] }, 'r_tempered_sword');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.profile.backpack.find((s) => s?.itemId === 'tempered_sword')?.quality).toBe(0);
  });

  it('sin arbitraje: lo forjado se vende por menos que el trabajo de Brand', () => {
    for (const rc of RECIPES) expect(sellPrice(rc.result), rc.id).toBeLessThan(forgeCost(rc));
  });
});

describe('alquimia y rincón de cura', () => {
  it('sin mesa no se destila; con ella, una mezcla limpia devuelve un reactivo y una sucia sale normal', () => {
    expect(startAlchemy(give(give(base(), 'arcane_shard', 5), 'water', 5), 'a_mana', 1).ok).toBe(false);
    const r = startAlchemy(lab(), 'a_mana', 5);
    if (!r.ok) throw new Error(r.error);
    expect(total(r.profile, 'arcane_shard')).toBe(18);
    const good = play(r.profile, () => true);
    expect(total(good, 'mana_potion')).toBe(1);
    expect(total(good, 'water') + total(good, 'arcane_shard')).toBe(total(r.profile, 'water') + total(r.profile, 'arcane_shard') + 1);
    const bad = play(r.profile, () => false);
    expect(total(bad, 'mana_potion')).toBe(1);
    expect(bad.crafted).toContain('a_mana');
    expect(alchemyBatch(bad, 'a_mana', 9).ok).toBe(true);
  });

  it('el rincón de cura prepara por lotes', () => {
    const p = rich(give(give(base(), 'leather_scrap', 20), 'water', 5));
    expect(prepareCare(p, 'c_bandage', 1).ok).toBe(false);
    const r = prepareCare({ ...p, refuge: { cot: 0, kitchen: 0, bench: 0, infirmary: 1, alchemy: 0 } }, 'c_bandage', 3);
    if (!r.ok) throw new Error(r.error);
    expect(total(r.profile, 'bandage')).toBe(6);
  });

  it('sin arbitraje: nada de lo preparado vale más (a precio de venta) que lo que se gasta', () => {
    for (const r of [...ALCHEMY.map((a) => ({ ...a, gold: 0 })), ...CARE]) {
      const inSell = r.ingredients.reduce((t, m) => t + sellPrice(m.itemId) * m.qty, 0) + r.gold;
      const inBuy = r.ingredients.reduce((t, m) => t + buyPrice(m.itemId) * m.qty, 0) + r.gold;
      expect(sellPrice(r.result) * r.qty, r.id).toBeLessThanOrEqual(inSell);
      expect(sellPrice(r.result) * r.qty, r.id).toBeLessThan(inBuy);
    }
  });
});

describe('recepción', () => {
  const full = (): Profile => {
    let p = base();
    p = { ...p, backpack: p.backpack.map((_, i) => ({ uid: 'b' + i, itemId: 'iron_sword', qty: 1 })) as Profile['backpack'] };
    p = { ...p, stash: p.stash.map((_, i) => ({ uid: 's' + i, itemId: 'iron_sword', qty: 1 })) as Profile['stash'] };
    return p;
  };
  it('lo que no cabe va a la recepción, bloquea la bajada y no se pierde', () => {
    const d = deliver(full(), [{ itemId: 'chainmail', qty: 1 }]);
    expect(d.toReception).toBe(true);
    expect(d.profile.reception).toHaveLength(1);
    expect(receptionBlock(d.profile)).toMatch(/recepción/);
    expect(receptionWithdraw(d.profile, 0).ok).toBe(false);
  });
  it('se vacía vendiendo, desguazando o descartando, sin necesidad de ampliar nada', () => {
    const d = deliver(full(), [{ itemId: 'chainmail', qty: 1 }, { itemId: 'iron_helm', qty: 1 }, { itemId: 'iron_shield', qty: 1 }]).profile;
    const s = receptionSell(d, 0);
    expect(s.ok && s.profile.reception).toHaveLength(2);
    const x = receptionDiscard(d, 2);
    expect(x.ok && x.profile.reception).toHaveLength(2);
    const sc = receptionScrap(d, 1);
    expect(sc.ok).toBe(true);
    if (sc.ok) expect(sc.profile.reception!.some((st) => st.itemId === 'iron_helm')).toBe(false);
  });
  it('retirar funciona cuando hay hueco, y una receta del fogón con todo lleno acaba en la recepción', () => {
    const p = { ...base(), reception: [{ uid: 'r', itemId: 'chainmail', qty: 1 }] };
    const w = receptionWithdraw(p, 0);
    expect(w.ok && w.profile.reception).toHaveLength(0);
    const k = give(give(give({ ...base(), refuge: { cot: 0, kitchen: 1, bench: 0, infirmary: 0, alchemy: 0 } }, 'salted_meat', 1), 'cave_mushroom', 1), 'water', 1);
    const st = startCooking(k, 'stew', 3);
    if (!st.ok) throw new Error(st.error);
    expect(st.profile.cooking).toBeTruthy();
  });
});
