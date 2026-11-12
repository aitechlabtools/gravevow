// Llegada de los mercaderes al Bastión y migración de la reputación de los antiguos (Fase 5b).
import type { Profile } from './types';
import { VENDORS, type VendorId } from './data/vendors';
import { vendorBlueprints } from './craftDrops';

// Bloque 2, fase 4: Brand, Valerius y Eldrin venden planos raros con reputación alta.
for (const v of ['brand', 'valerius', 'eldrin'] as const) {
  const have = new Set(VENDORS[v].stock.map((s) => s.itemId));
  for (const b of vendorBlueprints(v)) if (!have.has(b.itemId)) VENDORS[v].stock.push(b);
}

/** ¿Está en el Bastión? Desde la parte 2.1 del bloque 2 todos los mercaderes están desde el principio. */
export function vendorUnlocked(_p: Profile, _id: VendorId): boolean {
  return true;
}

/** Sin esperas de llegada: no hay texto de bloqueo. */
export function vendorLockText(_id: VendorId): string {
  return '';
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
