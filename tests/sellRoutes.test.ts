import { describe, expect, it } from 'vitest';
import { ITEMS } from '../src/core/data/items';
import { buyerOf, isHeavy, sellable, whoBuys } from '../src/core/sellRoutes';
import { buysThis, sell, sellPrice, vendorSellPrice } from '../src/core/economy';
import { createProfile } from '../src/core/profile';
import { addToGrid } from '../src/core/inventory';
import { refugeOf } from '../src/core/refuge';
import type { Profile } from '../src/core/types';

const base = () => createProfile('A', 'warrior', { cloak: 0, skin: 0 });
const withStations = (p: Profile, lv: number): Profile => ({ ...p, refuge: { ...refugeOf(p), infirmary: lv, kitchen: lv, bench: lv, forge: lv, armory: lv, alchemy: lv, tannery: lv } });

describe('venta por oficio', () => {
  it('todo lo vendible tiene comprador, y es uno de los 8', () => {
    const v = ['nira', 'vesper', 'garth', 'orik', 'grizk', 'brand', 'valerius', 'eldrin'];
    for (const d of Object.values(ITEMS)) if (sellable(d.id)) expect(v).toContain(buyerOf(d.id));
  });
  it('reparto por oficio', () => {
    expect(buyerOf('iron_sword')).toBe('brand');
    expect(buyerOf('iron_shield')).toBe('valerius');
    expect(buyerOf('chainmail')).toBe('valerius');
    expect(buyerOf('linen_robe')).toBe('nira');
    expect(buyerOf('tanned_leather')).toBe('nira');
    expect(buyerOf('health_potion')).toBe('vesper');
    expect(buyerOf('bitter_herb')).toBe('vesper');
    expect(buyerOf('jerky')).toBe('garth');
    expect(buyerOf('salted_meat')).toBe('garth');
    expect(buyerOf('iron_ore')).toBe('orik');
    expect(buyerOf('miner_pick')).toBe('orik');
    expect(buyerOf('copper_ring')).toBe('grizk');
    expect(buyerOf('golden_chalice')).toBe('grizk');
    expect(buyerOf('crypt_key')).toBe('grizk');
    expect(buyerOf('arcane_shard')).toBe('eldrin');
    expect(buyerOf('nail_bomb')).toBe('eldrin');
    expect(buyerOf('murky_orb')).toBe('eldrin');
    expect(buyerOf('bp_bastion_plate')).toBe('valerius');
  });
  it('ligeras y pesadas: 16 pesadas (más los escudos); los guanteletes de forja, pesados', () => {
    const armor = Object.values(ITEMS).filter((d) => ['helmet', 'armor', 'gloves', 'boots'].includes(d.category) && !d.recruit);
    expect(armor.filter(isHeavy).length).toBe(17);
    expect(isHeavy(ITEMS.forge_gauntlets)).toBe(true);
    expect(isHeavy(ITEMS.leather_gloves)).toBe(false);
  });
  it('sin su estación, lo del especialista lo compra Nira al precio de siempre', () => {
    const p = withStations(base(), 0);
    expect(whoBuys(p, 'iron_sword')).toBe('nira');
    expect(buysThis('brand', 'iron_sword', p)).toBe(false);
    expect(vendorSellPrice('nira', 'iron_sword')).toBe(sellPrice('iron_sword'));
    expect(whoBuys(p, 'copper_ring')).toBe('grizk');
    const q = withStations(base(), 1);
    expect(whoBuys(q, 'iron_sword')).toBe('brand');
    expect(buysThis('nira', 'iron_sword', q)).toBe(false);
  });
  it('el especialista paga un 10 % más; vender al equivocado dice a quién', () => {
    expect(vendorSellPrice('brand', 'knight_sword' in ITEMS ? 'knight_sword' : 'iron_sword')).toBeGreaterThanOrEqual(sellPrice('iron_sword'));
    expect(vendorSellPrice('valerius', 'bastion_plate')).toBe(Math.round(sellPrice('bastion_plate') * 1.1));
    const p = withStations(base(), 1);
    const bp = addToGrid(p.backpack, { uid: 'r', itemId: 'copper_ring', qty: 1 }).grid;
    const r = sell({ ...p, backpack: bp }, 'backpack', bp.findIndex((x) => x?.uid === 'r'), false, 'brand');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('Grizk en La Lonja');
  });
});

import { salvageBlock } from '../src/core/salvage';
describe('venta: cantidades y candado', () => {
  it('vende N unidades de una pila', () => {
    const p = withStations(base(), 1);
    const bp = addToGrid(p.backpack.map(() => null), { uid: 'h', itemId: 'health_potion', qty: 5 }).grid;
    const i = bp.findIndex((x) => x?.itemId === 'health_potion');
    const r = sell({ ...p, backpack: bp }, 'backpack', i, false, 'vesper', 3);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.profile.backpack[i]?.qty).toBe(2); expect(r.profile.gold - p.gold).toBe(vendorSellPrice('vesper', 'health_potion') * 3); }
  });
  it('lo protegido no se vende ni se desguaza', () => {
    const p = withStations(base(), 1);
    const bp = addToGrid(p.backpack, { uid: 's', itemId: 'iron_sword', qty: 1, locked: true }).grid;
    const i = bp.findIndex((x) => x?.uid === 's');
    expect(sell({ ...p, backpack: bp }, 'backpack', i, true, 'brand').ok).toBe(false);
    expect(salvageBlock(bp[i]!)).toContain('protegido');
  });
});
