import { equipBag } from '../src/core/bag';
import { endExpedition, startExpedition } from '../src/core/expedition';
import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { buy, buysThis, sell, sellPrice, vendorSellPrice } from '../src/core/economy';
import { addToGrid } from '../src/core/inventory';
import { withGold } from './helpers';

/** Grizk llega al abrir Las mazmorras del Bastión (nivel 20). */
const lvl = <T extends { character: { level: number } }>(p: T): T => ({ ...p, character: { ...p.character, level: 25 } });

describe('Grizk', () => {
  it('vende saquitos (5) y sacos (25) que van a la mochila', () => {
    let p = withGold(lvl(createProfile('A', 'warrior', { cloak: 0, skin: 0 })), 100);
    const r = buy(p, 'gold_pouch', 'grizk');
    expect(r.ok && r.profile.gold).toBe(95);
    if (!r.ok) return; p = r.profile;
    const r2 = buy(p, 'gold_sack', 'grizk');
    expect(r2.ok && r2.profile.gold).toBe(70);
    expect(r2.ok && r2.profile.backpack.filter((x) => x?.itemId === 'gold_sack')).toHaveLength(1);
  });
  it('mochilas: comprar una más grande te la pone y la vieja pasa a tu mochila como objeto', () => {
    let p = withGold(lvl(createProfile('A', 'warrior', { cloak: 0, skin: 0 })), 1000);
    expect(p.bag.itemId).toBe('backpack_basic');
    const r = buy(p, 'backpack_30', 'grizk');
    expect(r.ok).toBe(true);
    if (!r.ok) return; p = r.profile;
    expect(p.bag.itemId).toBe('backpack_30');
    expect(p.backpack).toHaveLength(30); expect(p.gold).toBe(850);
    expect(p.backpack.some((x) => x?.itemId === 'backpack_basic')).toBe(true);
  });
  it('cambiar de mochila: a una más pequeña solo con las últimas casillas vacías', () => {
    let p = withGold(lvl(createProfile('A', 'warrior', { cloak: 0, skin: 0 })), 1000);
    const r = buy(p, 'backpack_36', 'grizk');
    if (!r.ok) throw new Error(r.error); p = r.profile;
    const i = p.backpack.findIndex((x) => x?.itemId === 'backpack_basic');
    p.backpack[35] = { uid: 'z', itemId: 'iron_sword', qty: 1 };
    expect(equipBag(p, 'backpack', i).ok).toBe(false);
    p.backpack[35] = null;
    const r2 = equipBag(p, 'backpack', i);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.profile.bag.itemId).toBe('backpack_basic');
    expect(r2.profile.backpack).toHaveLength(24);
    expect(r2.profile.backpack.some((x) => x?.itemId === 'backpack_36')).toBe(true);
  });
  it('la mochila puesta no se pierde al morir', () => {
    let p = withGold(lvl(createProfile('A', 'warrior', { cloak: 0, skin: 0 })), 1000);
    const r = buy(p, 'backpack_30', 'grizk'); if (!r.ok) throw new Error(r.error); p = r.profile;
    const { profile, expedition } = startExpedition(p, 0);
    const d = endExpedition(profile, expedition, 'died', 1);
    expect(d.profile.bag.itemId).toBe('backpack_30');
    expect(d.profile.backpack).toHaveLength(30);
  });
  it('compra joyas y tesoros (cálices, gemas, anillos, amuletos) y paga mejor; lo demás, no', () => {
    expect(buysThis('grizk', 'golden_chalice')).toBe(true);
    expect(buysThis('grizk', 'blood_gem')).toBe(true);
    expect(buysThis('grizk', 'copper_ring')).toBe(true);
    expect(buysThis('grizk', 'iron_sword')).toBe(false);
    expect(vendorSellPrice('grizk', 'golden_chalice')).toBeGreaterThan(sellPrice('golden_chalice'));
    const p = withGold(lvl(createProfile('A', 'warrior', { cloak: 0, skin: 0 })), 0);
    let bp = addToGrid(p.backpack, { uid: 'c', itemId: 'golden_chalice', qty: 1 }).grid;
    bp = addToGrid(bp, { uid: 's', itemId: 'iron_sword', qty: 1 }).grid;
    const q = { ...p, backpack: bp };
    const ci = bp.findIndex((x) => x?.uid === 'c'), si = bp.findIndex((x) => x?.uid === 's');
    expect(sell(q, 'backpack', si, false, 'grizk').ok).toBe(false);
    const r = sell(q, 'backpack', ci, false, 'grizk');
    expect(r.ok && r.profile.gold).toBe(vendorSellPrice('grizk', 'golden_chalice'));
  });
});
