// Seguro por bajada: lo que pasa al caer. Aparte de core/insurance.ts para que core/expedition.ts no arrastre
// la cadena de imports de las estaciones (crafting → vendors → craftDrops) y no haya importaciones circulares.
import { INSURE_ORDER, REFORGER } from '../config/insurance';
import type { VendorId } from './data/vendors';
import type { Equipment, ItemStack } from './types';
import { makeUid } from './rng';
import { getItem } from './data/items';
import type { EquipSlot } from './types';

/** Quién reforja esta pieza: el de su ranura, salvo los escudos de la mano izquierda, que son de Valerius. */
export function reforgerFor(slot: EquipSlot, it: ItemStack | null) {
  if (slot === 'offHand' && it && getItem(it.itemId).category === 'shield') return REFORGER.helmet;
  return REFORGER[slot];
}

/** Pieza reforjada esperando en su mercader. */
export interface Reforged { vendor: VendorId; item: ItemStack }

/** Al caer: las piezas aseguradas que llevabas puestas pasan a pendientes, como nuevas (otro `uid`, durabilidad entera). */
export function reforgeLost(eq: Equipment, insured: string[] | undefined): Reforged[] {
  if (!insured?.length) return [];
  const out: Reforged[] = [];
  for (const slot of INSURE_ORDER) {
    const it = eq[slot];
    if (!it || !insured.includes(it.uid)) continue;
    const { dur: _d, ...rest } = it;
    out.push({ vendor: reforgerFor(slot, it).vendor, item: { ...rest, uid: makeUid() } });
  }
  return out;
}

