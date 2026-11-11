import type { Rarity } from '../core/types';

/** Colores de la durabilidad en la interfaz: entera, gastada (25 %), a punto de romperse (10 %) y rota. */
export const WEAR_COLOR = { ok: '#9fbf7a', worn: '#e8b33a', critical: '#ff7a3a', broken: '#d23a3a' } as const;

/** Durabilidad (Fase 3). Valores de prueba, no de equilibrio comprobado. */
export const DURABILITY = {
  /** Durabilidad máxima según la rareza del ejemplar. Un combate normal gasta unos 3–6 puntos por pieza. */
  byRarity: { common: 60, uncommon: 70, rare: 85, epic: 100, legendary: 120 } as Record<Rarity, number>,
  /** Puntos extra por cada nivel de calidad de forja. */
  perQuality: 15,
  /** Aviso «muy gastada» (25 %) y «a punto de romperse» (10 %). */
  worn: 0.25,
  critical: 0.1,
  /** Brand cobra esta parte del valor del objeto por repararlo entero desde cero. */
  repairValueShare: 0.3,
  /** Un kit de campo devuelve esta parte del máximo a cada pieza. */
  kitShare: 0.4,
};
