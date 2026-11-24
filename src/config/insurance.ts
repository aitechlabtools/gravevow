// Seguro de equipo por bajada (24/11): cifras editables. Ver docs/plan-seguro-equipo.md.
import type { EquipSlot } from '../core/types';
import type { VendorId } from '../core/data/vendors';
import type { CraftStation } from '../core/data/crafting';

export const INSURANCE = {
  /** Parte del valor del ejemplar que cuesta asegurarlo una bajada. */
  rate: 0.04,
  /** Precio mínimo por pieza. */
  min: 1,
};

/** Quién reforja cada ranura (quien la fabrica) y la estación que tiene que estar reconstruida. Los escudos, Valerius. */
export const REFORGER: Record<EquipSlot, { vendor: VendorId; station: CraftStation }> = {
  mainHand: { vendor: 'brand', station: 'forge' },
  offHand: { vendor: 'brand', station: 'forge' },
  ring: { vendor: 'brand', station: 'forge' },
  helmet: { vendor: 'valerius', station: 'armory' },
  armor: { vendor: 'valerius', station: 'armory' },
  gloves: { vendor: 'valerius', station: 'armory' },
  boots: { vendor: 'valerius', station: 'armory' },
  amulet: { vendor: 'eldrin', station: 'alchemy' },
};
/** Orden de las casillas en la ventana del seguro (dos filas de cuatro). */
export const INSURE_ORDER: EquipSlot[] = ['mainHand', 'offHand', 'helmet', 'armor', 'gloves', 'boots', 'ring', 'amulet'];
export const SLOT_LABEL: Record<EquipSlot, string> = { mainHand: 'Arma', offHand: 'Secundaria', helmet: 'Cabeza', armor: 'Torso', gloves: 'Manos', boots: 'Pies', ring: 'Anillo', amulet: 'Amuleto' };
