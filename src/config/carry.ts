// INVENTARIO ESPACIAL Y PESO (Fase 6 de la expansión). Valores de prueba del plan maestro (apartado 11).
// Los tamaños son jugables, no medidas reales: ancho × alto en casillas, antes de girar.
import type { ItemCategory, WeaponFamily } from '../core/types';

export type Size = { w: number; h: number };

/** Tamaño de las armas y de lo que va en la mano izquierda, por familia. */
export const FAMILY_SIZE: Record<WeaponFamily, Size> = {
  dagger: { w: 2, h: 1 }, wand: { w: 2, h: 1 }, torch: { w: 2, h: 1 },
  sword: { w: 3, h: 1 }, axe: { w: 3, h: 1 }, mace: { w: 3, h: 1 }, scepter: { w: 3, h: 1 },
  spear: { w: 4, h: 1 }, staff: { w: 4, h: 1 }, greatsword: { w: 4, h: 1 }, greataxe: { w: 4, h: 1 }, greatstaff: { w: 4, h: 1 },
  shield: { w: 2, h: 2 }, tome: { w: 1, h: 2 }, orb: { w: 1, h: 1 },
};

/** Tamaño por categoría (si el objeto no dice otro). Armadura: ligera 2×2; pesada (resta velocidad) 2×3. */
export const CATEGORY_SIZE: Partial<Record<ItemCategory, Size>> = {
  armor: { w: 2, h: 2 }, shield: { w: 2, h: 2 }, tool: { w: 2, h: 1 }, bag: { w: 2, h: 2 },
};
export const HEAVY_ARMOR_SIZE: Size = { w: 2, h: 3 };

/** Peso por familia (unidades de carga). */
export const FAMILY_WEIGHT: Record<WeaponFamily, number> = {
  dagger: 1, wand: 0.8, torch: 1, orb: 1.5, tome: 1.5,
  sword: 3, axe: 3.5, mace: 4, scepter: 2, spear: 3.5, staff: 2.5,
  greatsword: 6, greataxe: 7, greatstaff: 4, shield: 5,
};
/** Peso por categoría (por unidad). */
export const CATEGORY_WEIGHT: Record<ItemCategory, number> = {
  weapon: 3, shield: 5, helmet: 2, armor: 4, gloves: 1, boots: 1.5, ring: 0.1, amulet: 0.2,
  potion: 0.3, material: 0.5, relic: 1, jewel: 0.1, key: 0.1, quest: 0.5, coin: 0.1, tool: 2.5,
  container: 0.3, cover: 0, gold: 0.01, bag: 1.5,
};
export const HEAVY_ARMOR_WEIGHT = 12;
/** Peso de cada moneda (sueltas o dentro de un saquito o un saco). */
export const COIN_WEIGHT = 0.01;
/** Pesos propios de algunos objetos. */
export const ITEM_WEIGHT: Record<string, number> = { ration: 0.5, water: 1, gold_sack: 0.5 };

/** Capacidad de carga por clase: el Guerrero lleva objetos más grandes y pesados, y aguanta más. */
export const CARRY_CAPACITY: Record<string, number> = { warrior: 40, mage: 30, rogue: 34, cleric: 36 };

/** Tramos de carga: hasta 100 % no pasa nada; luego menos paso y más gasto de Descanso. */
export const CARRY_TIERS = [
  { over: 1.0, mobility: 0.1, rest: 0.1 },
  { over: 1.2, mobility: 0.2, rest: 0.25 },
];
/** Ninguna transferencia voluntaria que suba el peso puede dejarlo por encima de esto. */
export const CARRY_MAX = 1.5;
