// Peso y carga (Fase 6). Lógica pura: cuánto pesa lo que llevas encima y qué te cuesta.
// Cuenta el equipo puesto, la mochila (y su contenido), el bolsillo seguro y el oro que llevas. El almacén no.
import { CARRY_CAPACITY, CARRY_MAX, CARRY_TIERS, CATEGORY_WEIGHT, COIN_WEIGHT, FAMILY_WEIGHT, HEAVY_ARMOR_WEIGHT, ITEM_WEIGHT } from '../config/carry';
import { COIN_ID } from '../config/gold';
import { getItem } from './data/items';
import type { ClassId, Equipment, Grid, ItemDef, ItemStack } from './types';

/** Armadura pesada: la que resta velocidad (cota de malla, corazas). Ocupa 2×3 y pesa más. */
export function isHeavyArmor(def: ItemDef): boolean {
  return def.category === 'armor' && (def.stats?.spd ?? 0) < 0;
}

/** Peso de una unidad del objeto (sin contar monedas dentro). */
export function unitWeight(itemId: string): number {
  if (ITEM_WEIGHT[itemId] !== undefined) return ITEM_WEIGHT[itemId];
  const d = getItem(itemId);
  if (d.category === 'armor' && isHeavyArmor(d)) return HEAVY_ARMOR_WEIGHT;
  if (d.family) return FAMILY_WEIGHT[d.family];
  return CATEGORY_WEIGHT[d.category] ?? 0;
}

/** Peso de una casilla: unidades × peso, más las monedas que lleve dentro un saquito o un saco. */
export function stackWeight(s: ItemStack | null | undefined): number {
  if (!s || s.itemId === 'cover') return 0;
  if (s.itemId === COIN_ID) return s.qty * COIN_WEIGHT;
  return unitWeight(s.itemId) * s.qty + (s.gold ?? 0) * COIN_WEIGHT;
}

export const gridWeight = (g: Grid | null | undefined): number => (g ?? []).reduce((n, s) => n + stackWeight(s), 0);
export const equipmentWeight = (eq: Equipment): number => Object.values(eq).reduce((n, s) => n + stackWeight(s), 0);

export interface Carried { backpack: Grid; pocket: Grid; equipment: Equipment; bag?: ItemStack | null }

/** Todo lo que llevas encima. */
export function carriedWeight(c: Carried): number {
  return round1(gridWeight(c.backpack) + gridWeight(c.pocket) + equipmentWeight(c.equipment) + stackWeight(c.bag));
}

export function carryCapacity(classId: ClassId): number {
  return CARRY_CAPACITY[classId] ?? 34;
}

export interface Load { weight: number; capacity: number; pct: number; tier: 0 | 1 | 2; mobilityLoss: number; restExtra: number }

export function loadOf(c: Carried, classId: ClassId): Load {
  const weight = carriedWeight(c);
  const capacity = carryCapacity(classId);
  const pct = weight / capacity;
  let tier: Load['tier'] = 0;
  CARRY_TIERS.forEach((t, i) => { if (pct > t.over) tier = (i + 1) as Load['tier']; });
  const t = tier ? CARRY_TIERS[tier - 1] : null;
  return { weight, capacity, pct, tier, mobilityLoss: t?.mobility ?? 0, restExtra: t?.rest ?? 0 };
}

/**
 * ¿Se permite pasar de una carga a otra? Lo que no sube el peso siempre vale (soltar, consumir, cambiar por algo más ligero).
 * Lo que lo sube solo si termina dentro del 150 %. Devuelve el error o null.
 */
export function carryBlock(before: number, after: number, capacity: number): string | null {
  if (after <= before + 1e-9 || after <= capacity * CARRY_MAX + 1e-9) return null;
  return `Demasiado peso: llevarías ${fmtWeight(after)} de ${fmtWeight(capacity)} (más del ${Math.round(CARRY_MAX * 100)} %). Suelta algo antes.`;
}

export const round1 = (n: number): number => Math.round(n * 10) / 10;
export const fmtWeight = (n: number): string => round1(n).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

// Memoria de la última carga calculada (la escena la pide en cada fotograma; solo se recalcula si cambian los objetos)
let memo: { k: unknown[]; v: Load } | null = null;
export function loadOfMemo(c: Carried, classId: ClassId): Load {
  const k = [c.backpack, c.pocket, c.equipment, c.bag, classId];
  if (memo && memo.k.every((x, i) => x === k[i])) return memo.v;
  memo = { k, v: loadOf(c, classId) };
  return memo.v;
}
