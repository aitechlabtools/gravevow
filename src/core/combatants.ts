import { ENEMY_SCALE_PER_LEVEL, ENEMY_XP_PER_LEVEL } from '../config/progression';
import type { CharacterData, Equipment } from './types';
import type { Combatant, Side } from './combat';
import { CLASSES } from './data/classes';
import { getEnemy } from './data/enemies';
import { computeStats } from './stats';
import { combatLoadout } from './loadout';
import { getItem } from './data/items';
import { specialMods } from './data/rarity';
import { itemSpecials } from './data/weapons';
import { getWanderer } from './data/wanderers';
import { ZONE_NORMALIZE, subzoneGrowth } from '../config/subzones';
import { ZONES, ZONE_ORDER } from './data/zones';
import { effectiveMaxMp, type Needs } from './needs';
import { getPact } from './data/altars';
import { resizeBody, summaryHp, type Body } from './anatomy';

/** Zona de origen de una criatura (la de su archivo de datos). Las nuevas, diseñadas a escala de la Mazmorra, no se tocan. */
const ORIGIN: Record<string, string> = {};
for (const z of ZONE_ORDER) for (const e of ZONES[z].enemies) ORIGIN[e.id] ??= z;
function homeZone(id: string): string {
  return ORIGIN[id] ?? 'mazmorra';
}

/** `cooldowns`: las recargas que quedaron pendientes del combate anterior de la expedición. */
/** `opts.body`: anatomía de la expedición (la vida pasa a ser su resumen). `opts.headHits`: los golpes pueden ir a la cabeza. */
export function playerCombatant(ch: CharacterData, equipment: Equipment, hp: number, mp: number, cooldowns: Record<string, number> = {}, classSkill?: string, opts: { body?: Body; headHits?: boolean; noInjuries?: boolean; needs?: Needs; restExtra?: number; pact?: string | null } = {}): Combatant {
  const cls = CLASSES[ch.classId];
  const stats = computeStats(ch.classId, ch.level, equipment);
  const kit = combatLoadout(ch.classId, equipment, classSkill);
  const body = opts.body ? resizeBody(opts.body, stats.maxHp) : undefined;
  // Hambre, sed y cansancio recortan el máximo del recurso (no rellenan lo gastado al recuperarse)
  const baseMaxMp = stats.maxMp;
  // Pacto de altar (Fase 7): sube unos atributos y recorta el máximo del recurso (con las necesidades, hasta un techo)
  const pact = getPact(opts.pact);
  if (pact) for (const [k, m] of Object.entries(pact.mult) as [keyof typeof pact.mult, number][]) stats[k] = Math.round(stats[k] * m);
  const pactMpLoss = pact?.mpLoss ?? 0;
  if (opts.needs || pactMpLoss) stats.maxMp = effectiveMaxMp(baseMaxMp, opts.needs ?? { sat: 100, hyd: 100, rest: 100 }, pactMpLoss);
  return {
    ...(body ? { body, headHits: !!opts.headHits, noInjuries: opts.noInjuries } : {}),
    ...(opts.needs ? { needs: { ...opts.needs }, baseMaxMp, ...(opts.restExtra ? { restExtra: opts.restExtra } : {}) } : {}),
    ...(pactMpLoss ? { pactMpLoss, baseMaxMp } : {}),
    id: 'player', name: ch.name, side: 'A', sprite: `hero_${ch.classId}`,
    stats, hp: body ? summaryHp(body) : Math.min(hp, stats.maxHp), mp: Math.min(mp, stats.maxMp),
    resourceName: cls.resourceName, resourceRegen: cls.resourceRegen,
    statuses: [], skills: kit.skills, basicAttack: kit.basicAttack,
    control: 'player', skillChance: 0, undead: false, defending: false, potions: 0,
    cooldowns: { ...cooldowns },
    wear: { swings: 0, hits: 0 },
    // Atributos del equipo («del vampiro», «de sangrado»…) y especiales mejorados por la rareza de cada arma
    affixes: [equipment.mainHand, equipment.offHand].flatMap((x) => x?.affixes ?? []),
    skillMods: Object.assign({}, ...(['mainHand', 'offHand'] as const).map((sl) => {
      const st = equipment[sl];
      if (!st) return {};
      const def = getItem(st.itemId);
      return specialMods(st, def, itemSpecials(def));
    })),
  };
}

/** Las criaturas se hacen más duras según su nivel (ver config/progression.ts). */
export function levelScale(level: number): number {
  return 1 + ENEMY_SCALE_PER_LEVEL * (Math.max(1, level) - 1);
}

/** Experiencia que da una criatura de cierto nivel. */
export function enemyXp(baseXp: number, level: number): number {
  return Math.round(baseXp * (1 + ENEMY_XP_PER_LEVEL * (Math.max(1, level) - 1)));
}

export function enemyCombatant(enemyId: string, instanceId: string, side: Side = 'B', level = 1): Combatant {
  const e = getEnemy(enemyId);
  // Criaturas comunes: bases igualadas entre zonas y un crecimiento suave por nivel (config/subzones.ts).
  // Élites y jefes ya están ajustados uno a uno (tests/balance.test.ts).
  const common = !e.elite && !e.boss;
  const k = levelScale(level) * (common ? subzoneGrowth(level) : 1);
  const stats = { ...e.stats };
  const norm = common ? ZONE_NORMALIZE[homeZone(enemyId)] : undefined;
  if (norm) { stats.maxHp *= norm.maxHp; stats.def *= norm.def; }
  for (const key of ['maxHp', 'atk', 'def', 'mag', 'res'] as const) stats[key] = Math.round(stats[key] * k);
  return {
    id: instanceId, name: e.name, side, sprite: e.sprite,
    stats, hp: stats.maxHp, mp: 0,
    resourceName: '—', resourceRegen: 0, statuses: [], skills: [...e.skills],
    basicAttack: e.basicAttack, control: 'ai', skillChance: e.skillChance,
    undead: e.undead, defending: false, potions: 0, boss: e.boss, ref: enemyId, level,
    phase2: e.phase2,
  };
}

/** Vida de Kael tras un combate, de vuelta a su escala base. */
export function rivalHpBack(hp: number, level = 1): number {
  return hp <= 0 ? 0 : Math.max(1, Math.round(hp / levelScale(level)));
}

// ── Mercenario errante (Kael y los demás) controlado por la IA ──
/** El errante crece con el nivel del combate igual que las criaturas. Su vida se guarda en la escala base. */
export function rivalCombatant(who: string, hp: number, side: Side, potions: number, level = 1): Combatant {
  const w = getWanderer(who);
  const k = levelScale(level);
  const stats = { ...w.stats };
  for (const key of ['maxHp', 'atk', 'def', 'mag', 'res'] as const) stats[key] = Math.round(stats[key] * k);
  return {
    id: 'rival', name: w.name, side, sprite: w.sprite,
    stats, hp: Math.max(1, Math.min(Math.round(hp * k), stats.maxHp)), mp: 20,
    resourceName: w.resourceName, resourceRegen: 3, statuses: [], skills: [...w.skills],
    basicAttack: w.basicAttack,
    control: 'ai', skillChance: 0.45, undead: false, defending: false, potions, ref: 'rival',
  };
}
