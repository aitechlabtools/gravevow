import type { Stats } from '../types';
import type { LootTable } from '../loot';
import { MAZMORRA_ENEMIES } from './zones/mazmorra';
import { CRIPTA_ENEMIES } from './zones/cripta';
import { INFIERNO_ENEMIES } from './zones/infierno';
import { SUBZONE_ENEMIES, EXISTING_BOSS_PHASES } from './zones/subzoneEnemies';
import { ENEMY_PATTERNS, REGIONAL_BOSSES, type BossPhaseDef, type PatternDef } from './intents';

export interface EnemyDef {
  id: string;
  name: string;
  sprite: string;
  stats: Stats;
  skills: string[];
  /** Probabilidad de usar una habilidad en vez del ataque básico. */
  skillChance: number;
  basicAttack: { name: string; kind: 'physical' | 'magical'; power: number; fx: 'slash' | 'bite' | 'smash' | 'dark' | 'fire' | 'frost' };
  /** Rol en combate (informativo, para fichas y la guía). */
  role?: string;
  /** Élite: más duro que los normales, uno por mapa. */
  elite?: boolean;
  xp: number;
  loot: LootTable;
  undead: boolean;
  boss?: boolean;
  /** Jefes: habilidades y frase de la segunda fase (por debajo del 50 % de vida). */
  phase2?: { skills: string[]; line: string; skillChance?: number };
  /** Ataques anunciados (Fase 8): tras unas acciones normales prepara uno de la lista. */
  pattern?: PatternDef;
  /** Jefes regionales: fases por umbral de vida (sustituyen a `phase2`). */
  phases?: BossPhaseDef[];
  /** Comportamiento en exploración */
  wander: { speed: number; aggroRange: number };
}

export const ENEMIES: Record<string, EnemyDef> = {
  skeleton: {
    id: 'skeleton', name: 'Esqueleto guerrero', sprite: 'skeleton',
    stats: { maxHp: 64, maxMp: 0, atk: 16, def: 8, mag: 0, res: 6, spd: 7, crit: 5, eva: 2 },
    skills: ['bone_bash'], skillChance: 0.3,
    basicAttack: { name: 'Espada mellada', kind: 'physical', power: 1, fx: 'slash' },
    xp: 45, undead: true,
    loot: { rolls: 1, gold: [3, 12], entries: [
      { itemId: 'bone_dust', weight: 40, min: 1, max: 3 }, { itemId: 'old_coin', weight: 20, min: 1, max: 2 },
      { itemId: 'rusty_sword', weight: 10 }, { itemId: 'health_potion', weight: 15 }, { itemId: 'iron_key', weight: 4 }, { itemId: 'nothing', weight: 11 },
    ] },
    wander: { speed: 1.3, aggroRange: 3.5 },
  },
  bat: {
    id: 'bat', name: 'Murciélago cavernario', sprite: 'bat',
    stats: { maxHp: 34, maxMp: 0, atk: 11, def: 4, mag: 0, res: 4, spd: 17, crit: 8, eva: 18 },
    skills: ['leech_bite'], skillChance: 0.4,
    basicAttack: { name: 'Zarpazo', kind: 'physical', power: 0.9, fx: 'bite' },
    xp: 30, undead: false,
    loot: { rolls: 1, gold: [0, 5], entries: [
      { itemId: 'bat_wing', weight: 60, min: 1, max: 2 }, { itemId: 'nothing', weight: 40 },
    ] },
    wander: { speed: 2.4, aggroRange: 4 },
  },
  ossuary_lord: {
    id: 'ossuary_lord', name: 'Señor del Osario', sprite: 'boss', boss: true,
    stats: { maxHp: 270, maxMp: 0, atk: 23, def: 14, mag: 22, res: 13, spd: 8, crit: 8, eva: 2 },
    skills: ['grave_slam', 'necrotic_wave', 'bone_shield'], skillChance: 0.5,
    basicAttack: { name: 'Mandoble de hueso', kind: 'physical', power: 1.05, fx: 'smash' },
    xp: 250, undead: true, role: 'Jefe',
    loot: { rolls: 2, gold: [40, 80], always: [{ itemId: 'relic_key' }], entries: [
      { itemId: 'golden_chalice', weight: 30 }, { itemId: 'blood_gem', weight: 20 }, { itemId: 'executioner_axe', weight: 12 },
      { itemId: 'frost_staff', weight: 12 }, { itemId: 'knight_sword', weight: 12 }, { itemId: 'bone_amulet', weight: 14 },
    ] },
    wander: { speed: 0.8, aggroRange: 3 },
  },
};

Object.assign(ENEMIES, MAZMORRA_ENEMIES, CRIPTA_ENEMIES, INFIERNO_ENEMIES, SUBZONE_ENEMIES);
for (const [id, ph] of Object.entries(EXISTING_BOSS_PHASES)) if (ENEMIES[id]) ENEMIES[id].phase2 = ph;
for (const [id, pt] of Object.entries(ENEMY_PATTERNS)) if (ENEMIES[id]) ENEMIES[id].pattern = pt;
for (const [id, b] of Object.entries(REGIONAL_BOSSES)) if (ENEMIES[id]) { ENEMIES[id].pattern = b.pattern; ENEMIES[id].phases = b.phases; delete ENEMIES[id].phase2; if (b.hp) ENEMIES[id].stats = { ...ENEMIES[id].stats, maxHp: Math.round(ENEMIES[id].stats.maxHp * b.hp) }; }

export function getEnemy(id: string): EnemyDef {
  const e = ENEMIES[id];
  if (!e) throw new Error(`Enemigo desconocido: ${id}`);
  return e;
}
