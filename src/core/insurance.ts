// Seguro de equipo por bajada (24/11). Lógica pura: qué se puede asegurar, cuánto cuesta, qué queda pendiente al caer
// y cómo se recoge. Cifras en config/insurance.ts; reglas en docs/plan-seguro-equipo.md.
import { INSURANCE, INSURE_ORDER, REFORGER } from '../config/insurance';
import { GOLD_SCALE } from '../config/gold';
import { RARITY_RULES } from './data/rarity';
import { getItem } from './data/items';
import type { VendorId } from './data/vendors';
import type { Equipment, EquipSlot, ItemStack, Profile } from './types';
import { stationLevel } from './crafting';
import { addToGrid, LAYOUTS } from './inventory';
import { spendGold } from './wallet';

import { reforgeLost, type Reforged } from './insuranceLoss';
export { reforgeLost, type Reforged };

/** Valor del ejemplar en monedas: el de su ficha, ajustado por su rareza y sus atributos, más sus runas. */
export function stackValue(s: ItemStack): number {
  const def = getItem(s.itemId);
  const k = s.rarity ? RARITY_RULES[s.rarity].statMult / RARITY_RULES[def.rarity].statMult : 1;
  const runes = (s.runes ?? []).reduce((n, r) => n + (r ? getItem(r).value * GOLD_SCALE : 0), 0);
  return def.value * GOLD_SCALE * k * k * (1 + 0.1 * (s.affixes?.length ?? 0)) + runes;
}

/** Lo que cuesta asegurar esta pieza una bajada. */
export function insuranceCost(s: ItemStack): number {
  return Math.max(INSURANCE.min, Math.round(stackValue(s) * INSURANCE.rate));
}

/** Estado de una ranura para la ventana del seguro. */
export type SlotInsure = { slot: EquipSlot; item: ItemStack | null; cost: number; vendor: VendorId; locked: boolean };

/** Las ocho ranuras con su pieza, su coste y si su mercader ya puede reforjarla (estación reconstruida). El equipo de recluta no cuenta. */
export function insurableSlots(p: Profile, eq: Equipment = p.equipment): SlotInsure[] {
  return INSURE_ORDER.map((slot) => {
    const it = eq[slot];
    const item = it && !getItem(it.itemId).recruit ? it : null;
    const r = REFORGER[slot];
    return { slot, item, cost: item ? insuranceCost(item) : 0, vendor: r.vendor, locked: stationLevel(p, r.station) < 1 };
  });
}

/** ¿Hay algo que se pueda asegurar ahora? (si no, la ventana no sale) */
export function canInsureAny(p: Profile): boolean {
  return insurableSlots(p).some((s) => s.item && !s.locked);
}

/** Ranuras que de verdad se aseguran de una lista (con pieza y con su estación reconstruida). */
export function validSlots(p: Profile, slots: EquipSlot[]): SlotInsure[] {
  return insurableSlots(p).filter((s) => s.item && !s.locked && slots.includes(s.slot));
}

/** Paga el seguro de las ranuras elegidas. Devuelve el perfil cobrado y los `uid` asegurados. */
export function payInsurance(p: Profile, slots: EquipSlot[]): { ok: true; profile: Profile; uids: string[]; cost: number } | { ok: false; error: string } {
  const list = validSlots(p, slots);
  const cost = list.reduce((n, s) => n + s.cost, 0);
  const plan = { ...p, insurePlan: slots };
  if (!cost) return { ok: true, profile: plan, uids: [], cost: 0 };
  const paid = spendGold(plan, cost);
  if (!paid.ok) return paid;
  return { ok: true, profile: paid.profile, uids: list.map((s) => s.item!.uid), cost };
}

/** Piezas pendientes de un mercader. */
export function pendingFor(p: Profile, vendor: VendorId): Reforged[] {
  return (p.reforged ?? []).filter((r) => r.vendor === vendor);
}

/** Recoge las piezas de un mercader (una por su `uid`, o todas): a la mochila y, si no cabe, al almacén. Lo que no quepa sigue pendiente. */
export function collectReforged(p: Profile, vendor: VendorId, uid?: string): { profile: Profile; taken: number; left: number } {
  let backpack = p.backpack, stash = p.stash, taken = 0;
  const keep: Reforged[] = [];
  for (const r of p.reforged ?? []) {
    if (r.vendor !== vendor || (uid && r.item.uid !== uid)) { keep.push(r); continue; }
    const a = addToGrid(backpack, r.item, LAYOUTS.backpack);
    if (!a.leftover) { backpack = a.grid; taken++; continue; }
    const b = addToGrid(stash, r.item, LAYOUTS.stash);
    if (!b.leftover) { stash = b.grid; taken++; continue; }
    keep.push(r);
  }
  const left = keep.filter((r) => r.vendor === vendor).length;
  return { profile: { ...p, backpack, stash, reforged: keep }, taken, left };
}
