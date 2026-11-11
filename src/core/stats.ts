import type { ClassId, Equipment, Stats } from './types';
import { STAT_KEYS } from './types';
import { CLASSES } from './data/classes';
import { getItem } from './data/items';
import { stackStats } from './data/rarity';
import { isBroken } from './durability';
import { MAX_LEVEL, STAT_GROWTH_PER_LEVEL, XP_BASE, XP_EXPONENT } from '../config/progression';

export { MAX_LEVEL };

export function emptyStats(): Stats {
  return { maxHp: 0, maxMp: 0, atk: 0, def: 0, mag: 0, res: 0, spd: 0, crit: 0, eva: 0 };
}

export function baseStats(classId: ClassId, level: number): Stats {
  const c = CLASSES[classId];
  const s = { ...c.base };
  for (const k of STAT_KEYS) s[k] += Math.round((c.perLevel[k] ?? 0) * STAT_GROWTH_PER_LEVEL * (level - 1));
  return s;
}

export function equipmentBonus(equipment: Equipment): Stats {
  const s = emptyStats();
  for (const stack of Object.values(equipment)) {
    if (!stack || isBroken(stack)) continue; // roto: no da nada hasta repararlo
    const def = getItem(stack.itemId);
    const st = stackStats(stack, def);
    for (const k of STAT_KEYS) s[k] += st[k] ?? 0;
  }
  return s;
}

/** Estadísticas finales = base de clase y nivel + equipamiento. */
export function computeStats(classId: ClassId, level: number, equipment: Equipment): Stats {
  const b = baseStats(classId, level);
  const e = equipmentBonus(equipment);
  const s = emptyStats();
  for (const k of STAT_KEYS) s[k] = Math.max(k === 'maxHp' ? 1 : 0, b[k] + e[k]);
  return s;
}

// ── Experiencia ──
export function xpForNextLevel(level: number): number {
  return Math.round(XP_BASE * Math.pow(level, XP_EXPONENT));
}


export function applyXp(level: number, xp: number, gained: number): { level: number; xp: number; levelsGained: number } {
  let l = level;
  let x = xp + gained;
  let gainedLevels = 0;
  while (l < MAX_LEVEL && x >= xpForNextLevel(l)) {
    x -= xpForNextLevel(l);
    l += 1;
    gainedLevels += 1;
  }
  if (l >= MAX_LEVEL) x = 0; // en el nivel máximo la experiencia ya no se acumula
  return { level: l, xp: x, levelsGained: gainedLevels };
}
