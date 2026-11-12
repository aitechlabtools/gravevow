// ════════════════════════════════════════════════════════════════════
// Bloque 2, fase 5: desguace nuevo (taller de Orik). Todo editable.
//  · Seguro: un poco del material base (chatarra, retales o esquirla), ~10 % del valor de los componentes.
//  · Posible: cada componente de la receta, unidad a unidad, con la probabilidad de su rareza.
//  · El banco de trabajo multiplica esa probabilidad (×1,25 / ×1,4 / ×1,55, de STATION_FX.benchBonus); un objeto roto la deja en el 35 %.
// ════════════════════════════════════════════════════════════════════
import type { Rarity } from '../core/types';

export const SALVAGE_CFG = {
  /** Parte segura: este porcentaje del valor de los componentes, pagado en material base. */
  safeShare: 0.1,
  /** Si el 10 % no llega a una unidad, se redondea a 1 desde esta fracción (por debajo, la parte segura queda vacía). */
  minSafeShare: 0.75,
  /** Probabilidad de recuperar cada unidad de componente, según la rareza del ejemplar. */
  chance: { common: 0.2, uncommon: 0.25, rare: 0.3, epic: 0.35, legendary: 0.4 } as Record<Rarity, number>,
  /** Un objeto roto: la probabilidad se multiplica por esto. */
  brokenMult: 0.35,
  /** Ninguna probabilidad pasa de aquí. */
  maxChance: 0.95,
  /** Desde esta rareza (o si el lote lleva algo así) se pide confirmación. */
  confirmFrom: 'rare' as Rarity,
};
