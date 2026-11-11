// Llegada de los mercaderes al Bastión y migración de la reputación de los antiguos (Fase 5b).
import type { Profile } from './types';
import { VENDORS, type VendorId } from './data/vendors';
import { getSubzone } from './data/subzones';
import { subzoneLock } from './data/zones';

/** ¿Está ya en el Bastión? Llega cuando tienes abierta su subzona. Grizk, además, si ya tienes un contrato o un
 *  mercenario rescatado (nadie pierde lo que ya tenía con Garra Roja). */
export function vendorUnlocked(p: Profile, id: VendorId): boolean {
  const at = VENDORS[id].unlockAt;
  if (!at) return true;
  if (id === 'grizk' && (p.contract || p.mercsRescued.length > 0)) return true;
  return !subzoneLock(getSubzone(at), p.character.level, p.bossesDefeated);
}

/** Texto para el mercader que aún no ha llegado. */
export function vendorLockText(id: VendorId): string {
  const at = VENDORS[id].unlockAt;
  return at ? `Llegará cuando abras ${getSubzone(at).name}.` : '';
}

/** Reputación de los mercaderes que se fueron: la de Orvel pasa a Nira y la de Garra Roja a Grizk (se queda la
 *  mayor); la del Coleccionista se pierde. Idempotente. */
export function migrateReputation(rep: Record<string, number>): Record<string, number> {
  const r = { ...rep };
  const move = (from: string, to: VendorId) => {
    if (typeof r[from] === 'number') r[to] = Math.max(r[to] ?? 0, r[from]);
    delete r[from];
  };
  move('orvel', 'nira');
  move('garra', 'grizk');
  delete r.coleccionista;
  return r;
}
