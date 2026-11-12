// Armadura contra lesiones (Fase 10): qué pieza cubre cada región y cuánto protege según su desgaste.
import { ARMOR_COVER, ARMOR_GUARD, INJURY_BY_FX } from '../config/armor';
import { REGIONS, type Region } from '../config/anatomy';
import { getItem } from './data/items';
import { getEnemy } from './data/enemies';
import { getSkill } from './data/skills';
import { STATUSES } from './statuses';
import { durability, hasDurability, maxDurability } from './durability';
import type { EquipSlot, Equipment, ItemStack } from './types';

export interface RegionGuard { slot: EquipSlot; guard: number }

/** Protección de una pieza según su estado: entera por encima del 25 %, la mitad hasta el 10 %, nada por debajo o rota. */
export function pieceGuard(st: ItemStack): number {
  const max = maxDurability(st);
  if (max <= 0) return ARMOR_GUARD.full;
  const k = durability(st) / max;
  if (k <= ARMOR_GUARD.criticalAt) return 0;
  if (k <= ARMOR_GUARD.wornAt) return ARMOR_GUARD.full * ARMOR_GUARD.wornFactor;
  return ARMOR_GUARD.full;
}

function isArmorPiece(st: ItemStack | null | undefined): st is ItemStack {
  if (!st) return false;
  const def = getItem(st.itemId);
  // Protecciones: yelmo, armadura, guantes, botas y escudo (un arma en la mano izquierda no protege)
  return def.category !== 'weapon' && hasDurability(def);
}

/** La pieza que cubre cada región (la primera puesta de su lista) y lo que protege ahora mismo. */
export function armorGuards(eq: Equipment): Partial<Record<Region, RegionGuard>> {
  const out: Partial<Record<Region, RegionGuard>> = {};
  for (const r of REGIONS) {
    const slot = ARMOR_COVER[r].find((sl) => isArmorPiece(eq[sl]));
    if (slot) out[r] = { slot, guard: pieceGuard(eq[slot]!) };
  }
  return out;
}

/** Lesiones según el tipo de golpe. */
export function injuryMods(fx: string | undefined): { bleed: number; fracture: number } {
  return INJURY_BY_FX[fx ?? 'default'] ?? INJURY_BY_FX.default;
}

/** Estados de cuerpo que puede causar una criatura (para su ficha), según sus golpes y habilidades. */
export function bodyThreats(fxs: (string | undefined)[], appliesBleed: boolean): ('bleed' | 'fracture')[] {
  const m = fxs.map(injuryMods);
  const out: ('bleed' | 'fracture')[] = [];
  if (appliesBleed || m.some((x) => x.bleed >= 0.5)) out.push('bleed');
  if (m.some((x) => x.fracture >= 1)) out.push('fracture');
  return out;
}

/** Lo que puede causar una criatura (ficha de combate): lesiones de cuerpo y estados de sus habilidades. */
export function enemyThreats(enemyId: string): string[] {
  let e: ReturnType<typeof getEnemy>;
  try { e = getEnemy(enemyId); } catch { return []; }
  const skills = e.skills.map(getSkill);
  const physical = [e.basicAttack.kind === 'physical' ? e.basicAttack.fx : undefined, ...skills.filter((k) => k.kind === 'physical').map((k) => k.fx)].filter(Boolean) as string[];
  const applied = new Set(skills.flatMap((k) => (k.applies ?? []).filter((a) => !a.self).map((a) => a.status)));
  const out: string[] = bodyThreats(physical, applied.has('bleed')).map((t) => (t === 'bleed' ? 'Sangrado' : 'Fractura'));
  for (const id of applied) if (id !== 'bleed' && STATUSES[id]?.harmful) out.push(STATUSES[id].name);
  return out;
}
