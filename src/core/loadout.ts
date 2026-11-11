// ════════════════════════════════════════════════════════════════════
// Acciones de combate según quién eres y qué llevas:
//  · Ataque básico: el del arma de la mano derecha (sin arma: puñetazo). Sin coste ni recarga.
//  · 2 especiales de la mano derecha y 2 de la izquierda (un arma a dos manos da los 4).
//    Mano vacía: acciones básicas sin arma.
//  · 1 habilidad de clase.
// ════════════════════════════════════════════════════════════════════
import type { AttackDef, ClassId, Equipment } from './types';
import { isBroken } from './durability';
import { CLASSES } from './data/classes';
import { getItem } from './data/items';
import { EMPTY_LEFT_SPECIALS, EMPTY_RIGHT_SPECIALS, FISTS, basicAttackOf, isTwoHanded, itemSpecials } from './data/weapons';

export { FISTS };
export const FIST_SKILLS = EMPTY_RIGHT_SPECIALS;

export interface SkillGroup {
  source: 'class' | 'weapon' | 'offhand';
  label: string;
  skills: string[];
}

export interface Loadout {
  basicAttack: AttackDef;
  /** Especiales de la mano derecha (2, o 4 con un arma a dos manos). */
  right: { label: string; skills: string[] };
  /** Especiales de la mano izquierda (vacío si el arma es a dos manos). */
  left: { label: string; skills: string[] };
  classSkill: string;
  groups: SkillGroup[];
  /** Todas las habilidades disponibles, sin repetir. */
  skills: string[];
}

export function combatLoadout(classId: ClassId, equipment: Equipment, classSkill?: string): Loadout {
  const cls = CLASSES[classId];
  const weapon = equipment.mainHand ? getItem(equipment.mainHand.itemId) : null;
  const off = equipment.offHand ? getItem(equipment.offHand.itemId) : null;
  // Rota: el arma sigue dando su ataque básico, pero no sus especiales
  const wBroken = isBroken(equipment.mainHand), oBroken = isBroken(equipment.offHand);
  const twoHanded = !!weapon && isTwoHanded(weapon);
  const right = weapon ? { label: wBroken ? `${weapon.name} (rota)` : weapon.name, skills: wBroken ? [] : itemSpecials(weapon) } : { label: 'Puños', skills: EMPTY_RIGHT_SPECIALS };
  const left = twoHanded ? { label: weapon!.name, skills: [] } : off ? { label: oBroken ? `${off.name} (rota)` : off.name, skills: oBroken ? [] : itemSpecials(off) } : { label: 'Mano libre', skills: EMPTY_LEFT_SPECIALS };
  const cs = classSkill ?? cls.classSkill;
  const groups: SkillGroup[] = [{ source: 'class', label: cls.name, skills: [cs] }, { source: 'weapon', ...right }];
  if (left.skills.length) groups.push({ source: 'offhand', ...left });
  const skills = [...new Set(groups.flatMap((g) => g.skills))];
  return { basicAttack: basicAttackOf(weapon), right, left, classSkill: cs, groups, skills };
}
