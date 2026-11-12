// ARMADURA Y ESTADOS (Fase 10, reequilibrio). Todo lo que decide si un golpe hace sangrar o rompe un hueso.
// Valores comprobados con el simulador: node scripts/simular.mjs 300 actual (docs/equilibrio/).
import type { EquipSlot } from '../core/types';
import type { Region } from './anatomy';

/** Qué protege cada pieza. La primera pieza puesta de la lista es la que cubre la región (y la que se desgasta). */
export const ARMOR_COVER: Record<Region, EquipSlot[]> = {
  head: ['helmet'],
  thorax: ['armor'],
  abdomen: ['armor'],
  armL: ['gloves', 'offHand'],
  armR: ['gloves'],
  legL: ['boots'],
  legR: ['boots'],
};

/**
 * Parte de los sangrados y fracturas que evita una pieza entera en la región que cubre (bloque 1: baja poco a poco
 * con la durabilidad; rota, nada). El material la ajusta según el tipo de daño (config/damage.ts).
 * `wornFactor`, `wornAt` y `criticalAt` ya no deciden la protección: solo quedan para los avisos de desgaste.
 */
export const ARMOR_GUARD = { full: 0.8, wornFactor: 0.5, wornAt: 0.25, criticalAt: 0.1 };

/**
 * (Antes del bloque 1) Lesiones según el efecto visual. Ya solo lo usa la ficha antigua: el combate usa DAMAGE_INJURY.
 * Lesiones según el tipo de golpe (su efecto visual): filos, garras y mordiscos hacen sangrar; los golpes
 * contundentes rompen huesos. Multiplican las probabilidades base de `ANATOMY` (bleedChance, fractureChance…).
 */
export const INJURY_BY_FX: Record<string, { bleed: number; fracture: number }> = {
  slash: { bleed: 1, fracture: 0.3 },
  bite: { bleed: 1, fracture: 0 },
  smash: { bleed: 0.2, fracture: 1.7 },
  poison: { bleed: 0.4, fracture: 0 },
  default: { bleed: 0.5, fracture: 0.5 },
};

/** El sangrado que ponen las habilidades enemigas al jugador se queda en esta parte (antes de la armadura). */
export const SKILL_BLEED_TO_PLAYER = 0.5;

/** Bloque 1: los estados que ponen las habilidades enemigas al jugador salen con esta parte de su probabilidad. */
export const ENEMY_STATUS_CHANCE = 0.6;

/** Daño por turno de algunos estados cuando los sufre el jugador (parte de su vida máxima). */
export const PLAYER_DOT: Partial<Record<string, number>> = { poison: 0.05, burn: 0.05 };

/** Turnos máximos de algunos estados en el jugador (la quemadura no se alarga sin fin). */
export const STATUS_MAX_TURNS: Partial<Record<string, number>> = { burn: 3 };

/** Nombre de cada pieza en el registro: «Tu yelmo detiene el golpe: no sangras». */
export const PIECE_NAME: Partial<Record<EquipSlot, string>> = {
  helmet: 'Tu yelmo', armor: 'Tu armadura', gloves: 'Tus guantes', boots: 'Tus botas', offHand: 'Tu escudo',
};
