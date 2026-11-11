import { RARITY_RULES } from './data/rarity';
import type { ItemStack } from './types';
import type { Profile } from './types';
import { getItem } from './data/items';
import { SELL_RATIO } from './data/merchant';
import { vendorUnlocked } from './vendors';
import { VENDORS, type VendorId } from './data/vendors';
import { REP_RANKS, rankOf } from '../config/reputation';
import { addToGrid, anchorIndex, cloneGrid, isCover, LAYOUTS, removeAt } from './inventory';
import { BAG_SIZES, COIN_ID, COLLECTOR_BUYS, COLLECTOR_PRICE_MULT, GOLD_SCALE } from '../config/gold';
import { earnGold, NOT_ENOUGH, spendGold } from './wallet';
import { makeUid } from './rng';

export type EconomyResult = { ok: true; profile: Profile } | { ok: false; error: string };

/** Precio de compra: el valor del objeto, con el descuento del rango de reputación con ese vendedor. */
export function buyPrice(itemId: string, rep = 0): number {
  return Math.max(1, Math.round(getItem(itemId).value * GOLD_SCALE * (1 - REP_RANKS[rankOf(rep)].discount)));
}

/** Precio de venta. Un ejemplar de rareza superior a la de su ficha vale más (y uno con atributos, un poco más). */
export function sellPrice(itemId: string, stack?: Pick<ItemStack, 'rarity' | 'affixes'>): number {
  const def = getItem(itemId);
  const k = stack?.rarity ? RARITY_RULES[stack.rarity].statMult / RARITY_RULES[def.rarity].statMult : 1;
  const extra = 1 + 0.1 * (stack?.affixes?.length ?? 0);
  return Math.max(1, Math.floor(def.value * GOLD_SCALE * SELL_RATIO * k * k * extra));
}

export function buy(p: Profile, itemId: string, vendorId: VendorId = 'nira'): EconomyResult {
  if (!vendorUnlocked(p, vendorId)) return { ok: false, error: `${VENDORS[vendorId].name} aún no ha llegado al Bastión.` };
  const entry = VENDORS[vendorId].stock.find((s) => s.itemId === itemId);
  if (!entry) return { ok: false, error: 'Este vendedor no vende eso.' };
  const rep = p.reputation?.[vendorId] ?? 0;
  if (rankOf(rep) < entry.rank) return { ok: false, error: `Necesitas el rango «${REP_RANKS[entry.rank].name}» con ${VENDORS[vendorId].name}.` };
  const price = buyPrice(itemId, rep);
  if (p.gold < price) return { ok: false, error: NOT_ENOUGH };
  // Mochilas: si es más grande que la tuya, te la pones al momento y la vieja pasa a tu mochila (para venderla o dársela a otro)
  if (BAG_SIZES[itemId] && BAG_SIZES[itemId] > (BAG_SIZES[p.bag?.itemId] ?? 24)) {
    const paidBag = spendGold(p, price);
    if (!paidBag.ok) return paidBag;
    const q = paidBag.profile;
    const size = BAG_SIZES[itemId];
    let backpack = [...q.backpack, ...Array(Math.max(0, size - q.backpack.length)).fill(null)];
    const old = q.bag;
    const r0 = addToGrid(backpack, old, LAYOUTS.backpack);
    if (r0.leftover) return { ok: false, error: 'Tu mochila está llena.' };
    backpack = r0.grid;
    return { ok: true, profile: { ...q, backpack, bag: { uid: makeUid(), itemId, qty: 1 } } };
  }
  const r = addToGrid(p.backpack, { uid: makeUid(), itemId, qty: 1 }, LAYOUTS.backpack);
  if (r.leftover) return { ok: false, error: 'Tu mochila está llena.' };
  const paid = spendGold({ ...p, backpack: r.grid }, price);
  return paid.ok ? { ok: true, profile: paid.profile } : paid;
}

/** Vende una unidad (o toda la pila si all=true) desde la mochila o el almacén. */
/** ¿Lo compra este mercader? Nira compra de todo; Grizk, solo joyas y tesoros (y paga mejor). */
export function buysThis(vendor: VendorId, itemId: string): boolean {
  if (vendor === 'grizk') return COLLECTOR_BUYS.includes(getItem(itemId).category);
  return VENDORS[vendor].buysItems;
}
export function vendorSellPrice(vendor: VendorId, itemId: string, stack?: Pick<ItemStack, 'rarity' | 'affixes'>): number {
  const base = sellPrice(itemId, stack);
  return vendor === 'grizk' ? Math.max(1, Math.round(base * COLLECTOR_PRICE_MULT)) : base;
}

export function sell(p: Profile, container: 'backpack' | 'stash', index: number, all = false, vendor: VendorId = 'nira'): EconomyResult {
  const grid = cloneGrid(p[container]);
  index = anchorIndex(grid, index); // una casilla tapada por un saco vende el saco
  const s = index >= 0 ? grid[index] : null;
  if (!s || isCover(s)) return { ok: false, error: 'No hay nada que vender.' };
  if (s.itemId === COIN_ID) return { ok: false, error: 'Las monedas ya son oro: no se venden.' };
  if ((s.gold ?? 0) > 0) return { ok: false, error: 'Vacía el saco antes de venderlo.' };
  const qty = all ? s.qty : 1;
  if (!buysThis(vendor, s.itemId)) return { ok: false, error: `${VENDORS[vendor].name} no compra eso: solo joyas y tesoros.` };
  const gain = vendorSellPrice(vendor, s.itemId, s) * qty;
  if (s.qty - qty <= 0) removeAt(grid, index);
  else grid[index] = { ...s, qty: s.qty - qty };
  // El oro de la venta entra en el almacén (primero en los sacos con hueco). Sin sitio, la venta no se hace.
  const after = { ...p, [container]: grid } as Profile;
  const got = earnGold(after, gain);
  return got.ok ? { ok: true, profile: got.profile } : got;
}

/** Ampliaciones del almacén ya compradas (según su tamaño actual). */
