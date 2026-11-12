// Armadura contra lesiones (Fase 10): qué pieza cubre cada región y cuánto protege según su desgaste.
import { ARMOR_COVER, ARMOR_GUARD, INJURY_BY_FX } from '../config/armor';
import { DAMAGE_NAME, GUARD_CAP, MATERIAL_OVERRIDE, MATERIAL_RESIST, type ArmorMaterial, type DamageType } from '../config/damage';
import { damageTypeOf, injuryModsFor, zonesShort, zonesText } from './damage';
import { REGIONS, type Region } from '../config/anatomy';
import { getItem } from './data/items';
import { getEnemy } from './data/enemies';
import { getSkill } from './data/skills';
import { STATUSES } from './statuses';
import { durability, hasDurability, maxDurability } from './durability';
import type { EquipSlot, Equipment, ItemStack } from './types';

export interface RegionGuard { slot: EquipSlot; guard: number; material?: ArmorMaterial }

/** Protección de una pieza según su estado (bloque 1): baja poco a poco con la durabilidad; rota, nada. */
export function pieceGuard(st: ItemStack): number {
  const max = maxDurability(st);
  if (max <= 0) return ARMOR_GUARD.full;
  return ARMOR_GUARD.full * Math.max(0, Math.min(1, durability(st) / max));
}

/** Material de una pieza: el de la lista o el que dice su nombre. */
export function materialOf(itemId: string): ArmorMaterial {
  if (MATERIAL_OVERRIDE[itemId]) return MATERIAL_OVERRIDE[itemId];
  const n = getItem(itemId).name.toLowerCase();
  if (/malla|cota/.test(n)) return 'mail';
  if (/placa|coraza|yelmo|guantelete|acero|hierro|escudo/.test(n) && !/madera|tablas/.test(n)) return 'plate';
  if (/cuero|capucha|bota|madera|tablas|guante/.test(n)) return 'leather';
  return 'cloth';
}

/** Protección contra un tipo de daño concreto (el material resiste distinto). */
export function guardVs(g: RegionGuard, type: DamageType): number {
  const k = g.material ? MATERIAL_RESIST[g.material][type] ?? 1 : 1;
  return Math.min(GUARD_CAP, g.guard * k);
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
    if (slot) out[r] = { slot, guard: pieceGuard(eq[slot]!), material: materialOf(eq[slot]!.itemId) };
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

/** Tipos de daño físico de una criatura (golpe básico primero, sin repetir). */
export function enemyDamageTypes(enemyId: string): DamageType[] {
  let e: ReturnType<typeof getEnemy>;
  try { e = getEnemy(enemyId); } catch { return []; }
  const by = { ref: enemyId };
  const out: DamageType[] = [];
  if (e.basicAttack.kind === 'physical') out.push(damageTypeOf('physical', e.basicAttack.fx, by));
  for (const k of e.skills.map(getSkill)) if (k.kind === 'physical') out.push(damageTypeOf('physical', k.fx, by, k.id));
  return [...new Set(out)];
}

/** Línea de la ficha y el bestiario: «Ataca las piernas · Mordisco, Cortante». */
export function enemyAttackLine(enemyId: string): string {
  const t = enemyDamageTypes(enemyId).map((x) => DAMAGE_NAME[x]);
  return `${zonesText(enemyId)}${t.length ? ` · ${t.join(', ')}` : ''}`;
}

/** Línea compacta de la ficha en pantallas bajas: «Piernas · Mordisco». */
export function enemyAttackShort(enemyId: string): string {
  const t = enemyDamageTypes(enemyId).map((x) => DAMAGE_NAME[x]);
  return `${zonesShort(enemyId)}${t.length ? ` · ${t.join(', ')}` : ''}`;
}

/** Lo que puede causar una criatura (ficha de combate): lesiones de cuerpo y estados de sus habilidades. */
export function enemyThreats(enemyId: string): string[] {
  let e: ReturnType<typeof getEnemy>;
  try { e = getEnemy(enemyId); } catch { return []; }
  const skills = e.skills.map(getSkill);
  const applied = new Set(skills.flatMap((k) => (k.applies ?? []).filter((a) => !a.self).map((a) => a.status)));
  const mods = enemyDamageTypes(enemyId).map((t) => injuryModsFor(t, { ref: enemyId }));
  const out: string[] = [];
  if (applied.has('bleed') || mods.some((m) => m.bleed >= 0.5)) out.push('Sangrado');
  if (mods.some((m) => m.fracture >= 1)) out.push('Fractura');
  for (const id of applied) if (id !== 'bleed' && STATUSES[id]?.harmful) out.push(STATUSES[id].name);
  return out;
}
