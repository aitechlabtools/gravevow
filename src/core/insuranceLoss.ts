// Seguro por bajada: lo que pasa al caer. Aparte de core/insurance.ts para que core/expedition.ts no arrastre
// la cadena de imports de las estaciones (crafting → vendors → craftDrops) y no haya importaciones circulares.
import { INSURE_ORDER, REFORGER } from '../config/insurance';
import type { VendorId } from './data/vendors';
import type { Equipment, ItemStack } from './types';
import { makeUid } from './rng';

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
    out.push({ vendor: REFORGER[slot].vendor, item: { ...rest, uid: makeUid() } });
  }
  return out;
}

