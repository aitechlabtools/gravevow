import { NEED_LOW, NEED_NAME, type Need } from '../config/needs';
import { effectiveMaxMp, exhaustionLoss, feed, tickNeeds, type NeedLevel, type Needs } from './needs';
import { BOMBS, BOMB_DMG_NAME, type BombDef } from '../config/bombs';
import { potionAmount, resourcePotionAmount, resourceGain, skillCost, turnRegen, IMPETUS_ON_HIT, IMPETUS_WHEN_HIT } from '../config/progression';
import type { DamageKind, ItemEffect, SkillDef, Stats, StatusId, StatusInstance } from './types';
import { makeRng, type Rng } from './rng';
import { getSkill } from './data/skills';
import { getItem } from './data/items';
import { STATUSES } from './statuses';
import { ANATOMY } from '../config/anatomy';
import { ENEMY_STATUS_CHANCE, PIECE_NAME, PLAYER_DOT, SKILL_BLEED_TO_PLAYER, STATUS_MAX_TURNS } from '../config/armor';
import { DAMAGE_NAME, HEAD_STUN_BLUNT, VITAL_DAMAGE } from '../config/damage';
import { damageTypeOf, injuryModsFor, rollHitRegion } from './damage';
import { guardVs, type RegionGuard } from './armor';
import type { EquipSlot } from './types';
import { DEFEND_TELEGRAPHED, EXPOSED_MULT, DRAIN_PCT } from '../config/intents';
import { getMove, type BossPhaseDef, type PatternDef } from './data/intents';
import { tickPain, addBleed, bleedTick, applyTreatment, damageRegion, damageSpread, healBody, initiativeMult, offenseMult, rollInjury, rollRegion, summaryHp, treatError, REGION_NAME, type Body, type Region } from './anatomy';

// ════════════════════════════════════════════════════════════════════
// Motor de combate por turnos.
// - Puro y determinista: mismo estado + misma acción = mismo resultado.
// - La velocidad decide el orden en cada ronda (empate: bando A primero, luego orden de entrada).
// - Soporta varios combatientes por bando (aliados, PvP, grupos de monstruos).
// ════════════════════════════════════════════════════════════════════

export type Side = 'A' | 'B';
export type Fx = SkillDef['fx'];

export interface BasicAttack { name: string; kind: DamageKind; power: number; fx: Fx }

export interface Combatant {
  id: string;
  name: string;
  side: Side;
  sprite: string;
  stats: Stats;
  hp: number;
  mp: number;
  resourceName: string;
  resourceRegen: number;
  statuses: StatusInstance[];
  skills: string[];
  basicAttack: BasicAttack;
  control: 'player' | 'ai';
  skillChance: number;
  undead: boolean;
  defending: boolean;
  /** Pociones de vida que puede usar la IA (el jugador usa su mochila). */
  potions: number;
  boss?: boolean;
  /** Nivel de la criatura en este combate (solo para mostrarlo: las estadísticas ya vienen escaladas). */
  level?: number;
  /** Referencia libre (id de enemigo, del rival...) para quien orquesta el combate. */
  ref?: string;
  /** Actitud de un compañero controlado por la IA (mercenarios): agresivo o prudente. */
  stance?: 'aggressive' | 'cautious';
  /** Jefes: al bajar de la mitad de la vida cambian de habilidades (una sola vez). */
  phase2?: { skills: string[]; line: string; skillChance?: number };
  /** Ya ha entrado en su segunda fase. */
  enraged?: boolean;
  /** Turnos que le faltan a cada habilidad para poder usarse otra vez (el jugador los conserva entre combates). */
  cooldowns?: Record<string, number>;
  /** Escudo de maná: puntos de daño que absorbe antes de tocar la vida. */
  shield?: number;
  /** Atributos de las armas que lleva (ids de data/rarity.ts). */
  affixes?: string[];
  /** Especiales mejorados por la rareza del arma: turnos de recarga de menos y potencia extra. */
  skillMods?: Record<string, { cooldown: number; power: number }>;
  /** Desgaste del equipo (solo el jugador): ataques hechos y golpes encajados. */
  wear?: { swings: number; hits: number; /** Golpes que ha encajado cada pieza (Fase 10: se desgasta la que cubre la región). */ slots?: Partial<Record<EquipSlot, number>> };
  /** Qué pieza cubre cada región y cuánto protege de sangrados y fracturas (solo el jugador). */
  armor?: Partial<Record<Region, RegionGuard>>;
  /** Tutorial: no puede caer; al llegar a 1 se levanta con algo de vida. */
  unbreakable?: boolean;
  /** Anatomía de siete regiones (solo el jugador): la vida `hp` es su resumen y la muerte la decide la cabeza o el tórax. */
  body?: Body;
  /** Los golpes normales pueden ir a la cabeza (no en S1 ni S2). */
  headHits?: boolean;
  /** Subzona de la incursión (0 = S1): decide si los golpes alcanzan zonas vitales. */
  depth?: number;
  /** Tras perder un turno, no se le puede volver a aturdir ni congelar enseguida. */
  skipImmune?: number;
  /** Sin lesiones (tutorial): los golpes quitan vida por regiones, pero no abren sangrados ni rompen huesos. */
  noInjuries?: boolean;
  /** Necesidades (Fase 5, solo el jugador): se gastan una vez por ronda. `baseMaxMp` es el máximo sin hambre ni sed. */
  needs?: Needs;
  baseMaxMp?: number;
  /** Carga (Fase 6): gasto extra de Descanso por ronda. */
  restExtra?: number;
  /** Preparación del Refugio (Fase 9): recortes del consumo de necesidades. */
  prepMods?: Partial<Record<'sat' | 'hyd' | 'rest', number>>;
  /** Pacto de altar (Fase 7): parte del máximo del recurso que se pierde además de las necesidades. */
  pactMpLoss?: number;
  /** Cirugía en curso (dos turnos propios): la región. Un golpe la interrumpe. */
  surgery?: { region: Region };
  /** Última región golpeada (ahí se abre el sangrado de una habilidad). */
  lastRegion?: Region;
  /** Ataques anunciados (Fase 8): patrón, intención en curso y acciones normales desde la última. */
  pattern?: PatternDef;
  intent?: Intent;
  sinceIntent?: number;
  /** Siguiente movimiento de la lista del patrón. */
  patternIdx?: number;
  /** Turnos propios que pierde recuperándose tras descargar (tambaleo). */
  recovering?: number;
  /** Turnos propios que sigue expuesto (recibe más daño) tras descargar. */
  exposed?: number;
  /** Jefes regionales: fases por umbral, la fase actual (0 = la primera) y su auxiliar aún fuera del combate. */
  phases?: BossPhaseDef[];
  phase?: number;
  reserve?: Combatant;
  /** Llamado por un jefe: su premio es el del jefe (no da experiencia ni botín propios). */
  summoned?: boolean;
}

/** Lo que recuerda un jefe del que te retiras, hasta el final de la incursión: vida, fase y si ya gastó su auxiliar. */
export interface BossMemory { hp: number; phase: number; summoned: boolean }

/** Ataque anunciado en preparación: a quién, dónde (si apunta a una región), turnos que faltan y golpes que lo cortan. */
export interface Intent { move: string; targetId: string; region?: Region; wait: number; breaks: number; breakRound?: number }

export type CombatAction =
  | { type: 'attack'; targetId: string }
  | { type: 'skill'; skillId: string; targetId?: string }
  | { type: 'defend' }
  | { type: 'item'; itemId: string; /** Región a tratar (vendas, férulas…). */ region?: Region; /** Bombas: enemigo al que se lanza. */ targetId?: string }
  | { type: 'flee' }
  /** Segunda ronda de una cirugía empezada (o `cancel` para dejarla: el equipo se pierde). */
  | { type: 'surgery'; cancel?: boolean }
  /** Solo la IA: seguir preparando el ataque anunciado o descargarlo (el anuncio va al final de una acción normal). */
  | { type: 'unleash' };

export type CombatEvent =
  | { type: 'action'; actorId: string; label: string; fx: Fx | 'item' | 'defend' | 'flee'; targetId?: string }
  | { type: 'damage'; targetId: string; amount: number; crit: boolean; source: 'hit' | 'dot' | 'doom'; status?: StatusId; region?: Region }
  | { type: 'miss'; targetId: string }
  | { type: 'heal'; targetId: string; amount: number }
  | { type: 'mana'; targetId: string; amount: number }
  | { type: 'status'; targetId: string; status: StatusId; applied: boolean }
  | { type: 'skip'; actorId: string; status: StatusId }
  | { type: 'death'; targetId: string }
  | { type: 'flee'; actorId: string; success: boolean }
  | { type: 'itemUsed'; actorId: string; itemId: string }
  | { type: 'intent'; actorId: string; label: string; targetId?: string; broken?: boolean };

export type Outcome = 'victory' | 'defeat' | 'fled';

export interface CombatState {
  round: number;
  combatants: Combatant[];
  order: string[];
  turnIndex: number;
  log: string[];
  /** Eventos producidos por el último paso (para animaciones). */
  events: CombatEvent[];
  step: number;
  outcome: Outcome | null;
  rngState: number;
  canFlee: boolean;
}

/** A partir de esta ronda la cripta castiga a todos: evita combates interminables. */
export const DOOM_ROUND = 25;

const DAMAGE_K = 60;

/** Máximo de combatientes por bando (jefes, invocaciones y refuerzos incluidos). */
export const MAX_PER_SIDE = 2;

/** Dos enemigos con el mismo nombre se distinguen con I y II (también en el registro). */
export function distinctNames(combatants: Combatant[]): Combatant[] {
  const count = new Map<string, number>();
  for (const c of combatants) count.set(c.name, (count.get(c.name) ?? 0) + 1);
  const seen = new Map<string, number>();
  return combatants.map((c) => {
    if ((count.get(c.name) ?? 0) < 2) return c;
    const n = (seen.get(c.name) ?? 0) + 1;
    seen.set(c.name, n);
    return { ...c, name: `${c.name} ${'I'.repeat(n)}` };
  });
}

export function createCombat(combatants: Combatant[], seed: number, opts: { canFlee?: boolean } = {}): CombatState {
  for (const side of ['A', 'B'] as const) {
    if (combatants.filter((c) => c.side === side).length > MAX_PER_SIDE) throw new Error(`Demasiados combatientes en el bando ${side} (máximo ${MAX_PER_SIDE})`);
  }
  const s: CombatState = {
    round: 0,
    combatants: combatants.map((c) => ({ ...c, statuses: c.statuses.map((x) => ({ ...x })) })),
    order: [],
    turnIndex: -1,
    log: [],
    events: [],
    step: 0,
    outcome: null,
    rngState: seed >>> 0,
    canFlee: opts.canFlee ?? true,
  };
  const rng = makeRng(s.rngState);
  advance(s, rng);
  s.rngState = rng.state;
  return s;
}

export function getCombatant(s: CombatState, id: string): Combatant {
  const c = s.combatants.find((x) => x.id === id);
  if (!c) throw new Error(`Combatiente desconocido: ${id}`);
  return c;
}

export function currentActor(s: CombatState): Combatant | null {
  if (s.outcome) return null;
  const id = s.order[s.turnIndex];
  return id ? getCombatant(s, id) : null;
}

export function alive(c: Combatant): boolean {
  return c.hp > 0;
}

export function opponents(s: CombatState, c: Combatant): Combatant[] {
  return s.combatants.filter((x) => x.side !== c.side && alive(x));
}

/** Velocidad efectiva: las piernas rotas o inutilizadas restan iniciativa. */
export function speedOf(c: Combatant): number {
  if (c.body) return c.stats.spd * initiativeMult(c.body, c.needs ? exhaustionLoss(c.needs) : 0);
  return c.needs ? c.stats.spd * Math.max(ANATOMY.minInitiative, 1 - exhaustionLoss(c.needs)) : c.stats.spd;
}

export function turnOrder(combatants: Combatant[]): string[] {
  return combatants
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => alive(c))
    .sort((a, b) => speedOf(b.c) - speedOf(a.c) || (a.c.side === b.c.side ? 0 : a.c.side === 'A' ? -1 : 1) || a.i - b.i)
    .map(({ c }) => c.id);
}

export function hasStatus(c: Combatant, id: StatusId): boolean {
  return c.statuses.some((s) => s.id === id && s.turns > 0);
}

/** Turnos que faltan para poder volver a usar una habilidad (0 = lista). */
export function cooldownLeft(c: Combatant, skillId: string): number {
  return c.cooldowns?.[skillId] ?? 0;
}

export function canUseSkill(c: Combatant, skillId: string): boolean {
  return c.skills.includes(skillId) && c.mp >= costOf(c, skillId) && cooldownLeft(c, skillId) === 0;
}

// ── Fórmulas ──

export interface DamageRoll { amount: number; crit: boolean; miss: boolean }

export function rollDamage(att: Combatant, def: Combatant, kind: DamageKind, power: number, rng: Rng, opts: { ignoresEvasion?: boolean; undeadMult?: number; armorPierce?: number } = {}): DamageRoll {
  if (kind === 'physical' && !opts.ignoresEvasion && rng.chance(def.stats.eva / 100)) {
    return { amount: 0, crit: false, miss: true };
  }
  const off = kind === 'physical' ? att.stats.atk : att.stats.mag;
  const mit = (kind === 'physical' ? def.stats.def : def.stats.res) * (1 - (opts.armorPierce ?? 0));
  let dmg = power * off * (DAMAGE_K / (DAMAGE_K + Math.max(0, mit)));
  dmg *= 0.9 + rng.next() * 0.2;
  const crit = rng.chance(att.stats.crit / 100);
  if (crit) dmg *= 1.5;
  if (def.undead && opts.undeadMult) dmg *= opts.undeadMult;
  if (att.body) dmg *= offenseMult(att.body);
  if (def.body) dmg *= ANATOMY.damageTaken;
  if (att.affixes?.includes('executioner') && def.hp < def.stats.maxHp * 0.3) dmg *= 1.25;
  for (const st of att.statuses) {
    const m = STATUSES[st.id].damageDealtMult;
    if (m && st.turns > 0) dmg *= m;
  }
  if (def.defending) dmg *= 0.5;
  if (def.exposed && def.exposed > 0) dmg *= EXPOSED_MULT;
  for (const st of def.statuses) {
    const m = STATUSES[st.id].damageTakenMult;
    if (m && st.turns > 0) dmg *= m;
  }
  return { amount: Math.max(1, Math.round(dmg)), crit, miss: false };
}

/** Daño de una bomba: el mejor de Ataque y Magia, sin esquiva; Defensa contra metralla y clavos, Resistencia contra el fuego. */
export function bombDamage(att: Combatant, def: Combatant, b: BombDef, rng: Rng): { amount: number; crit: boolean } {
  const off = Math.max(att.stats.atk, att.stats.mag);
  const mit = b.dmg === 'fire' ? def.stats.res : def.stats.def;
  let dmg = b.power * off * (DAMAGE_K / (DAMAGE_K + Math.max(0, mit))) * (0.9 + rng.next() * 0.2);
  const crit = rng.chance(att.stats.crit / 100);
  if (crit) dmg *= 1.5;
  if (def.undead && b.undeadMult) dmg *= b.undeadMult;
  if (def.body) dmg *= ANATOMY.damageTaken;
  if (def.defending) dmg *= 0.5;
  for (const st of def.statuses) { const m = STATUSES[st.id].damageTakenMult; if (m && st.turns > 0) dmg *= m; }
  return { amount: Math.max(1, Math.round(dmg)), crit };
}
/** Daño esperado de una bomba contra un objetivo (para la ficha), sin azar. */
export function bombPreview(att: Combatant, def: Combatant, b: BombDef): number {
  const off = Math.max(att.stats.atk, att.stats.mag);
  const mit = b.dmg === 'fire' ? def.stats.res : def.stats.def;
  return Math.max(1, Math.round(b.power * off * (DAMAGE_K / (DAMAGE_K + Math.max(0, mit))) * (def.undead && b.undeadMult ? b.undeadMult : 1)));
}

export function fleeChance(actor: Combatant, foes: Combatant[]): number {
  const fastest = Math.max(...foes.map((f) => f.stats.spd), 0);
  return Math.min(0.85, Math.max(0.15, 0.4 + (actor.stats.spd - fastest) * 0.03));
}

// ── Aplicación de efectos ──

/** Coste real de una habilidad para este combatiente (crece con su recurso máximo). */
export function costOf(c: Combatant, skillId: string): number {
  return skillCost(getSkill(skillId).cost, c.stats.maxMp, c.resourceName === 'Maná' ? 'mana' : 'impetus');
}

/** El ímpetu se gana peleando: golpeando con el arma y encajando golpes. */
function gainImpetus(c: Combatant, n: number) {
  if (c.resourceName !== 'Ímpetu' || c.stats.maxMp <= 0 || !alive(c)) return;
  c.mp = Math.min(c.stats.maxMp, c.mp + n);
}

interface HitInfo { status?: StatusId; rng?: Rng; kind?: DamageKind; /** Tipo de golpe (decide sangrado o fractura). */ fx?: string; /** Golpe anunciado a una región. */ region?: Region; noInjury?: boolean; by?: Combatant; /** Habilidad del golpe (su tipo de daño). */ skillId?: string }

function dealDamage(s: CombatState, target: Combatant, amount: number, crit: boolean, source: 'hit' | 'dot' | 'doom', info: HitInfo = {}) {
  const status = info.status;
  if (target.shield && target.shield > 0 && source !== 'doom') {
    const absorbed = Math.min(target.shield, amount);
    target.shield -= absorbed;
    amount -= absorbed;
    s.log.push(`El escudo de ${target.name} absorbe ${absorbed} de daño${target.shield <= 0 ? ' y se rompe' : ''}.`);
    if (target.shield <= 0) { target.shield = 0; target.statuses = target.statuses.filter((x) => x.id !== 'ward'); }
  }
  const floor = (hasStatus(target, 'endure') && source !== 'doom') || target.unbreakable ? 1 : 0;
  let region: Region | undefined;
  if (target.surgery && source === 'hit' && amount > 0) {
    target.surgery = undefined;
    s.log.push(`El golpe interrumpe la cirugía de ${target.name}: el equipo se echa a perder.`);
  }
  if (target.body) {
    // Anatomía: el golpe cae en una región; el daño de estados y el tributo se reparten por todo el cuerpo
    const lethal = floor === 0;
    if (source === 'hit' && info.rng) {
      const depth = target.depth ?? (target.headHits ? ANATOMY.headFromDepth : 0);
      region = info.region ?? (info.by ? rollHitRegion(info.rng, info.by, depth) : rollRegion(info.rng, !!target.headHits));
      target.lastRegion = region;
      const type = damageTypeOf(info.kind, info.fx, info.by, info.skillId);
      // Bloque 1: las zonas vitales encajan más daño
      const vital = VITAL_DAMAGE[region as keyof typeof VITAL_DAMAGE];
      if (vital && amount > 0) { const extra = Math.round(amount * (vital - 1)); if (extra > 0) amount += extra; }
      target.body = damageRegion(target.body, region, amount, { lethal }).body;
      if (amount > 0) s.log.push(`El golpe ${DAMAGE_NAME[type].toLowerCase()} alcanza a ${target.name} en ${regionWith(region)}${vital ? ' (zona vital)' : ''}.`);
      // La pieza que cubre la región encaja el golpe (y se desgasta)
      const piece = target.armor?.[region];
      if (piece && amount > 0 && target.wear) { const sl = (target.wear.slots ??= {}); sl[piece.slot] = (sl[piece.slot] ?? 0) + 1; }
      if (info.kind === 'physical' && amount > 0 && !target.noInjuries && !info.noInjury && summaryHp(target.body) > 0) {
        const inj = rollInjury(target.body, region, crit, info.rng, injuryModsFor(type, info.by));
        const guard = piece ? guardVs(piece, type) : 0;
        if (inj.injury && piece && guard > 0 && info.rng.chance(guard)) {
          s.log.push(`${PIECE_NAME[piece.slot] ?? 'Tu armadura'} resiste${inj.injury.bleed ? ': no sangras' : ': el hueso aguanta'}.`);
        } else {
          target.body = inj.body;
          if (inj.injury?.bleed) s.log.push(`${REGION_NAME[region]}: sangrado ${inj.injury.bleed === 2 ? 'grave' : 'leve'}${piece ? '' : ' (no la cubre ninguna pieza)'}.`);
          if (inj.injury?.fracture) s.log.push(`${REGION_NAME[region]}: ¡fractura!`);
        }
        // Un golpe contundente en la cabeza puede aturdir (el yelmo lo frena)
        if (region === 'head' && type === 'blunt' && alive(target) && info.rng.chance(HEAD_STUN_BLUNT)) {
          if (piece && info.rng.chance(guard)) s.log.push(`${PIECE_NAME[piece.slot] ?? 'Tu yelmo'} amortigua el golpe en la cabeza.`);
          else applyStatus(s, target, 'stun', 1, info.rng);
        }
      }
    } else {
      target.body = damageSpread(target.body, amount, { lethal }).body;
    }
    target.hp = summaryHp(target.body);
    // Tutorial: nunca se cae; al quedar al borde, se levanta con algo de vida
    if (target.unbreakable && (target.body.parts.head.hp <= 1 || target.body.parts.thorax.hp <= 1)) {
      target.body = healBody(target.body, Math.round(target.body.total * 0.35)).body;
      target.hp = summaryHp(target.body);
      s.log.push(`${target.name} cae de rodillas… y se levanta. Aquí abajo aún no es su hora.`);
    }
  } else {
    target.hp = Math.max(Math.min(floor, target.hp), target.hp - amount);
  }
  if (source === 'hit') {
    if (amount > 0) gainImpetus(target, IMPETUS_WHEN_HIT);
    if (target.wear) target.wear.hits += 1;
    // Estados que se gastan al recibir un golpe (bloqueo con escudo)
    // El bloqueo frena de lleno el primer golpe y deja al defensor en guardia (mitad de daño) hasta su próximo turno:
    // así cubre también al segundo atacante de un 1 contra 2 sin ser invulnerable.
    for (const st of target.statuses.filter((x) => STATUSES[x.id].consumedOnHit)) {
      s.events.push({ type: 'status', targetId: target.id, status: st.id, applied: false });
      s.log.push(`${target.name} detiene el golpe con el escudo y sigue en guardia.`);
      if (target.hp - amount > 0) target.defending = true;
    }
    target.statuses = target.statuses.filter((x) => !STATUSES[x.id].consumedOnHit);
  }
  s.events.push({ type: 'damage', targetId: target.id, amount, crit, source, status, region });
  // Un golpe que impacta hace avanzar la interrupción de una preparación que se puede cortar (como mucho uno por ronda)
  if (source === 'hit' && amount > 0 && target.intent && target.hp > 0) {
    const mv = getMove(target.intent.move);
    if (mv.breakAt && target.intent.breakRound !== s.round) {
      target.intent.breaks += 1;
      target.intent.breakRound = s.round;
      if (target.intent.breaks >= mv.breakAt) {
        target.intent = undefined;
        s.events.push({ type: 'intent', actorId: target.id, label: mv.name, broken: true });
        s.log.push(`¡Interrumpido! ${target.name} pierde ${mv.name.toLowerCase()}.`);
      } else s.log.push(`${mv.name}: ${target.intent.breaks} de ${mv.breakAt} para romperlo.`);
    }
  }
  // Fases de los jefes regionales: al cruzar cada umbral, una sola vez, sin curarse
  if (target.phases && target.hp > 0) enterPhases(s, target);
  // Segunda fase de los jefes: por debajo de la mitad de la vida cambian de habilidades y avisan
  if (target.phase2 && !target.enraged && target.hp > 0 && target.hp <= target.stats.maxHp / 2) {
    target.enraged = true;
    target.skills = [...target.phase2.skills];
    if (target.phase2.skillChance !== undefined) target.skillChance = target.phase2.skillChance;
    s.log.push(target.phase2.line);
  }
  if (target.hp === 0) {
    s.events.push({ type: 'death', targetId: target.id });
    s.log.push(`${target.name} cae derrotado.`);
  }
}

/** Entra en las fases cuyos umbrales ya ha cruzado. No cura ni cancela el daño hecho; el auxiliar entra si hay sitio. */
function enterPhases(s: CombatState, boss: Combatant) {
  const phases = boss.phases!;
  while ((boss.phase ?? 0) < phases.length && boss.hp <= boss.stats.maxHp * phases[boss.phase ?? 0].at) {
    const ph = phases[boss.phase ?? 0];
    applyPhase(boss, ph);
    s.log.push(ph.line);
    s.events.push({ type: 'intent', actorId: boss.id, label: `Fase ${(boss.phase ?? 0) + 1}` });
    if (ph.summon && boss.reserve) {
      const aux = boss.reserve;
      boss.reserve = undefined;
      if (s.combatants.filter((c) => c.side === boss.side && alive(c)).length < MAX_PER_SIDE) {
        // Sustituye a un caído del mismo bando si lo hay (máximo dos por bando, también contando cuerpos)
        const dead = s.combatants.findIndex((c) => c.side === boss.side && !alive(c));
        if (dead >= 0 || s.combatants.filter((c) => c.side === boss.side).length < MAX_PER_SIDE) {
          if (dead >= 0) s.combatants.splice(dead, 1, aux); else s.combatants.push(aux);
          s.log.push(`${aux.name} se une al combate (actúa desde la próxima ronda).`);
        }
      }
    }
  }
}

/** Efectos permanentes de una fase (patrón y guardia rota). El auxiliar lo trae `enterPhases`. */
function applyPhase(boss: Combatant, ph: BossPhaseDef) {
  boss.phase = (boss.phase ?? 0) + 1;
  if (ph.pattern) { boss.pattern = ph.pattern; boss.patternIdx = 0; }
  if (ph.guard) boss.stats = { ...boss.stats, def: Math.round(boss.stats.def * ph.guard), res: Math.round(boss.stats.res * ph.guard) };
}

/** Recuerdo de un jefe vivo al acabar un combate del que te has retirado. */
export function bossMemory(c: Combatant): BossMemory {
  return { hp: c.hp, phase: c.phase ?? 0, summoned: !c.reserve };
}

/** Un jefe recién creado retoma su recuerdo: misma vida, misma fase (sin volver a anunciarla) y sin un segundo auxiliar. */
export function restoreBoss(c: Combatant, m: BossMemory): Combatant {
  const b: Combatant = { ...c, stats: { ...c.stats }, hp: Math.max(1, Math.min(c.stats.maxHp, m.hp)) };
  for (let i = 0; i < m.phase && b.phases && i < b.phases.length; i++) applyPhase(b, b.phases[i]);
  if (m.summoned) b.reserve = undefined;
  return b;
}

/** Anuncia el siguiente ataque del patrón: objetivo y, si apunta, la región. */
function telegraph(s: CombatState, actor: Combatant, rng: Rng) {
  const pt = actor.pattern!;
  const mv = getMove(pt.moves[(actor.patternIdx ?? 0) % pt.moves.length]);
  actor.patternIdx = ((actor.patternIdx ?? 0) + 1) % pt.moves.length;
  actor.sinceIntent = 0;
  const foes = opponents(s, actor);
  const target = foes.find((f) => f.control === 'player') && rng.chance(0.7) ? foes.find((f) => f.control === 'player')! : rng.pick(foes);
  const region = mv.regions ? rng.pick(mv.regions.filter((r) => r !== 'head' || target.headHits)) : undefined;
  actor.intent = { move: mv.id, targetId: target.id, region, wait: mv.prep ?? 1, breaks: 0 };
  const text = mv.tell.replace('{n}', actor.name).replace('{t}', mv.aoe ? 'todos' : target.name).replace('{r}', region ? regionWith(region) : '');
  s.events.push({ type: 'intent', actorId: actor.id, label: mv.name, targetId: target.id });
  s.log.push(`⚠ ${text}`);
}

/** Sigue preparando o descarga el ataque anunciado. La guardia del objetivo lo mitiga; después queda expuesto. */
function unleash(s: CombatState, actor: Combatant, rng: Rng) {
  const it = actor.intent!;
  const mv = getMove(it.move);
  if (it.wait > 1) {
    it.wait -= 1;
    s.events.push({ type: 'intent', actorId: actor.id, label: mv.name, targetId: it.targetId });
    s.log.push(`${actor.name} sigue preparando ${mv.name.toLowerCase()} (${(mv.prep ?? 1) - it.wait} de ${mv.prep ?? 1}).`);
    return;
  }
  actor.intent = undefined;
  const chosen = s.combatants.find((c) => c.id === it.targetId && alive(c) && c.side !== actor.side) ?? opponents(s, actor)[0];
  if (!chosen) return;
  s.events.push({ type: 'action', actorId: actor.id, label: mv.name, fx: mv.damage === 'magical' ? 'dark' : 'smash', targetId: chosen.id });
  if (mv.kind === 'drain') {
    const real = Math.min(chosen.mp, Math.round(chosen.stats.maxMp * DRAIN_PCT));
    chosen.mp -= real;
    s.events.push({ type: 'mana', targetId: chosen.id, amount: -real });
    s.log.push(`${actor.name} usa ${mv.name}: ${chosen.name} pierde ${real} de ${chosen.resourceName.toLowerCase()}.`);
  } else {
    const targets = mv.aoe ? [chosen, ...opponents(s, actor).filter((x) => x !== chosen)] : [chosen];
    for (const t of targets) {
      for (let h = 0; h < (mv.hits ?? 1) && alive(t); h++) {
        // Guardia o Bloqueo con escudo: los dos cuentan como defensa ante un ataque anunciado
        const guarded = t.defending || hasStatus(t, 'block');
        const r = rollDamage(actor, t, mv.damage!, mv.power!, rng);
        if (r.miss) { s.events.push({ type: 'miss', targetId: t.id }); s.log.push(`${actor.name} usa ${mv.name}, pero ${t.name} lo esquiva.`); continue; }
        const amount = guarded ? Math.max(1, Math.round(r.amount * DEFEND_TELEGRAPHED)) : r.amount;
        s.log.push(`${actor.name} usa ${mv.name}${targets.length > 1 || (mv.hits ?? 1) > 1 ? ` contra ${t.name}` : ''}: ${amount} de daño${guarded ? ' (en guardia)' : ''}${r.crit ? ' ¡CRÍTICO!' : ''}.`);
        dealDamage(s, t, amount, r.crit, 'hit', { rng, kind: mv.damage, fx: 'smash', by: actor, region: it.region && t.id === chosen.id ? it.region : undefined, noInjury: guarded });
      }
    }
  }
  if (alive(actor) && (mv.exposed || mv.stagger)) {
    actor.exposed = (mv.stagger ?? 0) + (mv.exposed ?? 0);
    actor.recovering = mv.stagger ?? 0;
    s.log.push(mv.stagger ? `${actor.name} se tambalea y queda expuesto.` : `${actor.name} queda expuesto tras el golpe.`);
  }
}

/** «el brazo izquierdo», «la cabeza»… */
export function regionWith(r: Region): string {
  return `${r === 'head' ? 'la' : r === 'legL' || r === 'legR' ? 'la' : 'el'} ${REGION_NAME[r].toLowerCase()}`;
}

function heal(s: CombatState, target: Combatant, amount: number) {
  let real: number;
  if (target.body) {
    // Anatomía: la cura se reparte entre las regiones que funcionan; no quita sangrados ni fracturas
    const r = healBody(target.body, amount);
    target.body = r.body;
    real = r.healed;
    target.hp = summaryHp(target.body);
  } else {
    real = Math.min(target.stats.maxHp - target.hp, Math.round(amount));
    target.hp += real;
  }
  s.events.push({ type: 'heal', targetId: target.id, amount: real });
  return real;
}

function applyStatus(s: CombatState, target: Combatant, id: StatusId, turns: number, rng?: Rng) {
  // Con anatomía, el sangrado no es un estado de unos turnos: es una herida en la última región golpeada
  if (id === 'bleed' && target.body && !target.noInjuries) {
    const r = target.lastRegion ?? 'thorax';
    // Fase 10: las habilidades que hacen sangrar aciertan la mitad contra el jugador, y la pieza que cubre la región lo puede evitar
    if (rng && !rng.chance(SKILL_BLEED_TO_PLAYER)) return;
    const piece = target.armor?.[r];
    if (rng && piece && piece.guard > 0 && rng.chance(piece.guard)) { s.log.push(`${PIECE_NAME[piece.slot] ?? 'Tu armadura'} detiene el golpe: no sangras.`); return; }
    const level = target.body.parts[r].bleed >= 1 ? 2 : 1;
    target.body = addBleed(target.body, r, level);
    s.events.push({ type: 'status', targetId: target.id, status: id, applied: true });
    s.log.push(`${target.name} sangra (${level === 2 ? 'grave' : 'leve'}) por ${regionWith(r)}.`);
    return;
  }
  // Tras perder un turno no se encadena otro: aturdir o congelar enseguida no hace efecto
  if (STATUSES[id].skipsTurn && target.skipImmune && target.body) { s.log.push(`${target.name} se sacude el aturdimiento: resiste.`); return; }
  const cap = target.body ? STATUS_MAX_TURNS[id] : undefined;
  if (cap) turns = Math.min(turns, cap);
  const ex = target.statuses.find((x) => x.id === id);
  if (ex) ex.turns = Math.min(cap ?? Infinity, Math.max(ex.turns, turns));
  else target.statuses.push({ id, turns });
  s.events.push({ type: 'status', targetId: target.id, status: id, applied: true });
  s.log.push(`${target.name} sufre ${STATUSES[id].name.toLowerCase()}.`);
}

function applyItemEffect(s: CombatState, actor: Combatant, effect: ItemEffect) {
  if (effect.kind === 'heal') {
    const h = heal(s, actor, potionAmount(effect.amount, actor.stats.maxHp));
    s.log.push(`${actor.name} recupera ${h} de vida.`);
  } else if (effect.kind === 'mana') {
    const real = Math.min(actor.stats.maxMp - actor.mp, resourcePotionAmount(effect.amount, actor.stats.maxMp));
    actor.mp += real;
    s.events.push({ type: 'mana', targetId: actor.id, amount: real });
    s.log.push(`${actor.name} recupera ${real} de ${actor.resourceName.toLowerCase()}.`);
  } else if (effect.kind === 'cleanse') {
    const before = actor.statuses.length;
    for (const st of actor.statuses.filter((x) => ['poison', 'burn', 'bleed'].includes(x.id))) {
      s.events.push({ type: 'status', targetId: actor.id, status: st.id, applied: false });
    }
    actor.statuses = actor.statuses.filter((x) => !['poison', 'burn', 'bleed'].includes(x.id));
    s.log.push(before !== actor.statuses.length ? `${actor.name} se purifica.` : `El antídoto no tiene efecto.`);
  }
}

/** Efectos de los atributos al golpear: sangrado (básico), robo de vida y congelar. */
function onHitAffixes(s: CombatState, actor: Combatant, target: Combatant, amount: number, rng: Rng, basic: boolean) {
  const a = actor.affixes;
  if (!a?.length) return;
  if (basic && a.includes('bleeding') && alive(target) && rng.chance(0.2)) applyStatus(s, target, 'bleed', 3, rng);
  if (a.includes('frost') && alive(target) && rng.chance(0.15)) applyStatus(s, target, 'freeze', 1);
  if (a.includes('vampire') && alive(actor)) {
    const h = heal(s, actor, amount * 0.08);
    if (h > 0) s.log.push(`${actor.name} absorbe ${h} de vida.`);
  }
}

/** Parpadeo: el próximo ataque contra quien lo tiene falla sin más. */
function evaded(s: CombatState, actor: Combatant, target: Combatant, label: string): boolean {
  if (!hasStatus(target, 'evade')) return false;
  target.statuses = target.statuses.filter((x) => x.id !== 'evade');
  s.events.push({ type: 'miss', targetId: target.id });
  s.log.push(`${actor.name} usa ${label}, pero ${target.name} se desvanece y reaparece a un lado.`);
  return true;
}

function resolveTarget(s: CombatState, actor: Combatant, targetId?: string): Combatant | null {
  const foes = opponents(s, actor);
  if (targetId) {
    const t = s.combatants.find((c) => c.id === targetId);
    if (t && alive(t) && t.side !== actor.side) return t;
  }
  return foes[0] ?? null;
}

function executeAction(s: CombatState, actor: Combatant, action: CombatAction, rng: Rng) {
  // Hacer otra cosa con una cirugía a medias la abandona (y el equipo ya está gastado)
  if (actor.surgery && action.type !== 'surgery') {
    actor.surgery = undefined;
    s.log.push(`${actor.name} abandona la cirugía: el equipo se echa a perder.`);
  }
  switch (action.type) {
    case 'surgery': {
      if (!actor.surgery || !actor.body) throw new Error('No estás operando.');
      const region = actor.surgery.region;
      actor.surgery = undefined;
      s.events.push({ type: 'action', actorId: actor.id, label: action.cancel ? 'Dejar la cirugía' : 'Cirugía', fx: 'item' });
      if (action.cancel) { s.log.push(`${actor.name} deja la cirugía a medias: el equipo se echa a perder.`); return; }
      const r = applyTreatment(actor.body, 'surgery', region);
      actor.body = r.body;
      actor.hp = summaryHp(actor.body);
      s.log.push(`(2 de 2) ${r.text}`);
      return;
    }
    case 'attack': {
      const target = resolveTarget(s, actor, action.targetId);
      if (!target) return;
      const atk = actor.basicAttack;
      const vs = opponents(s, actor).length > 1 ? ` contra ${target.name}` : '';
      s.events.push({ type: 'action', actorId: actor.id, label: atk.name, fx: atk.fx, targetId: target.id });
      if (actor.wear) actor.wear.swings += 1;
      if (evaded(s, actor, target, atk.name)) return;
      const r = rollDamage(actor, target, atk.kind, atk.power, rng);
      if (r.miss) {
        s.events.push({ type: 'miss', targetId: target.id });
        s.log.push(`${actor.name} usa ${atk.name}, pero ${target.name} lo esquiva.`);
      } else {
        s.log.push(`${actor.name} usa ${atk.name}${vs}: ${r.amount} de daño${r.crit ? ' ¡CRÍTICO!' : ''}.`);
        dealDamage(s, target, r.amount, r.crit, 'hit', { rng, kind: atk.kind, fx: atk.fx, by: actor });
        gainImpetus(actor, IMPETUS_ON_HIT);
        onHitAffixes(s, actor, target, r.amount, rng, true);
      }
      return;
    }
    case 'skill': {
      const sk = getSkill(action.skillId);
      if (!actor.skills.includes(sk.id)) throw new Error('Habilidad no disponible');
      const cost = costOf(actor, sk.id);
      if (actor.mp < cost) throw new Error('Recurso insuficiente');
      if (cooldownLeft(actor, sk.id) > 0) throw new Error('Habilidad en recarga');
      actor.mp -= cost;
      if (sk.resetCooldowns) actor.cooldowns = {};
      const mod = actor.skillMods?.[sk.id];
      const cd = sk.cooldown ? Math.max(1, sk.cooldown + (mod?.cooldown ?? 0)) : 0;
      if (cd) actor.cooldowns = { ...actor.cooldowns, [sk.id]: cd };
      const target = sk.target === 'self' ? actor : resolveTarget(s, actor, action.targetId);
      if (!target) return;
      s.events.push({ type: 'action', actorId: actor.id, label: sk.name, fx: sk.fx, targetId: target.id });
      // Golpes a todos: el objetivo elegido primero y luego el resto
      const targets = sk.aoe && sk.target === 'enemy' ? [target, ...opponents(s, actor).filter((x) => x !== target)] : [target];
      const landedOn = new Set<Combatant>();
      const many = opponents(s, actor).length > 1;
      if (sk.kind && sk.power && sk.target === 'enemy') {
        if (actor.wear) actor.wear.swings += 1;
        for (const t of targets) {
          if (evaded(s, actor, t, sk.name)) continue;
          const r = rollDamage(actor, t, sk.kind, sk.power * (1 + (mod?.power ?? 0)), rng, { ignoresEvasion: sk.ignoresEvasion, undeadMult: sk.bonusVsUndead, armorPierce: sk.armorPierce });
          if (r.miss) {
            s.events.push({ type: 'miss', targetId: t.id });
            s.log.push(`${actor.name} usa ${sk.name}, pero ${t.name} lo esquiva.`);
          } else {
            landedOn.add(t);
            s.log.push(`${actor.name} usa ${sk.name}${targets.length > 1 || many ? ` contra ${t.name}` : ''}: ${r.amount} de daño${r.crit ? ' ¡CRÍTICO!' : ''}.`);
            dealDamage(s, t, r.amount, r.crit, 'hit', { rng, kind: sk.kind, fx: sk.fx, by: actor, skillId: sk.id });
            onHitAffixes(s, actor, t, r.amount, rng, false);
            if (sk.lifesteal && alive(actor)) {
              const h = heal(s, actor, r.amount * sk.lifesteal);
              if (h > 0) s.log.push(`${actor.name} recupera ${h} de vida.`);
            }
          }
        }
      } else {
        for (const t of targets) landedOn.add(t);
        s.log.push(`${actor.name} usa ${sk.name}.`);
      }
      if (sk.selfDamagePct) {
        const loss = Math.min(actor.hp - 1, Math.round(actor.stats.maxHp * sk.selfDamagePct));
        if (loss > 0) { if (actor.body) { actor.body = damageSpread(actor.body, loss, { lethal: false }).body; actor.hp = summaryHp(actor.body); } else actor.hp -= loss; s.events.push({ type: 'damage', targetId: actor.id, amount: loss, crit: false, source: 'dot' }); s.log.push(`${actor.name} paga ${loss} de vida.`); }
        if (sk.resetCooldowns) s.log.push(`Las recargas de ${actor.name} vuelven a cero.`);
      }
      if (sk.shieldPct) {
        actor.shield = Math.round(actor.stats.maxHp * sk.shieldPct);
        s.log.push(`${actor.name} se envuelve en un escudo de ${actor.shield}.`);
      }
      if (sk.manaGain) {
        const real = Math.min(actor.stats.maxMp - actor.mp, resourceGain(sk.manaGain, actor.stats.maxMp));
        actor.mp += real;
        s.events.push({ type: 'mana', targetId: actor.id, amount: real });
        s.log.push(`${actor.name} recupera ${real} de ${actor.resourceName.toLowerCase()}.`);
      }
      if (sk.healPct) {
        const h = heal(s, actor, actor.stats.maxHp * sk.healPct);
        s.log.push(`${actor.name} recupera ${h} de vida.`);
      }
      for (const ap of sk.applies ?? []) {
        for (const who of ap.self ? [actor] : targets) {
          if (!alive(who)) continue;
          if (!ap.self && !landedOn.has(who)) continue;
          // Bloque 1: contra el jugador, los estados de habilidades salen menos; los de golpes físicos, además, los frena la armadura
          const vsPlayer = !ap.self && !!who.body;
          if (!rng.chance(ap.chance * (vsPlayer && ap.status !== 'bleed' ? ENEMY_STATUS_CHANCE : 1))) continue;
          if (vsPlayer && sk.kind === 'physical' && ap.status === 'stun' && who.lastRegion) {
            const piece = who.armor?.[who.lastRegion];
            if (piece && rng.chance(guardVs(piece, damageTypeOf(sk.kind, sk.fx, actor, sk.id)))) { s.log.push(`${PIECE_NAME[piece.slot] ?? 'Tu armadura'} encaja el golpe: no te aturde.`); continue; }
          }
          applyStatus(s, who, ap.status, ap.turns, rng);
        }
      }
      return;
    }
    case 'defend': {
      actor.defending = true;
      s.events.push({ type: 'action', actorId: actor.id, label: 'Defensa', fx: 'defend' });
      s.log.push(`${actor.name} se pone en guardia.`);
      return;
    }
    case 'item': {
      const def = getItem(action.itemId);
      if (!def.use || def.use.kind === 'repair') throw new Error('Objeto no utilizable');
      if (def.use.kind === 'treat') {
        // Tratamientos: se validan antes de gastar nada (si no sirven, ni turno ni objeto)
        if (!actor.body) throw new Error('Objeto no utilizable');
        const region = action.region ?? (def.use.treat === 'painkiller' ? 'thorax' : undefined);
        if (!region) throw new Error('Elige dónde aplicarlo.');
        const err = treatError(actor.body, def.use.treat, region);
        if (err) throw new Error(err);
        if (def.use.treat === 'surgery') {
          // Dos turnos propios: el equipo se reserva (se gasta) ahora y la región se recupera al terminar el segundo
          actor.surgery = { region };
          s.events.push({ type: 'action', actorId: actor.id, label: def.name, fx: 'item' });
          s.events.push({ type: 'itemUsed', actorId: actor.id, itemId: def.id });
          s.log.push(`${actor.name} empieza a operar ${regionWith(region)} (1 de 2). Si le golpean antes de su próximo turno, el equipo se pierde.`);
          return;
        }
        const r = applyTreatment(actor.body, def.use.treat, region);
        actor.body = r.body;
        s.events.push({ type: 'action', actorId: actor.id, label: def.name, fx: 'item' });
        s.events.push({ type: 'itemUsed', actorId: actor.id, itemId: def.id });
        s.log.push(r.text);
        return;
      }
      if (def.use.kind === 'need') {
        // Comer o beber en combate (bloque 1, fase 8): gasta el turno, como una poción. Los platos, solo en el Bastión.
        if (def.use.dish) throw new Error('Este plato se come en el Bastión, antes de bajar.');
        if (!actor.needs) throw new Error('Objeto no utilizable');
        const fed = feed(actor.needs, { sat: def.use.sat, hyd: def.use.hyd, rest: def.use.rest });
        if (!fed) throw new Error(def.use.hyd ? 'No tienes sed.' : 'No tienes hambre.');
        actor.needs = fed;
        s.events.push({ type: 'action', actorId: actor.id, label: def.name, fx: 'item' });
        s.events.push({ type: 'itemUsed', actorId: actor.id, itemId: def.id });
        s.log.push(`${actor.name} ${def.use.hyd && !def.use.sat ? 'bebe' : 'come'}: ${def.name.toLowerCase()}.`);
        return;
      }
      if (def.use.kind === 'bomb') {
        const b = BOMBS[def.use.bomb];
        if (!b) throw new Error('Objeto no utilizable');
        const first = resolveTarget(s, actor, action.targetId);
        if (!first) throw new Error('No hay a quién lanzarla.');
        const targets = b.target === 'all' ? [first, ...opponents(s, actor).filter((x) => x !== first)] : [first];
        s.events.push({ type: 'action', actorId: actor.id, label: def.name, fx: 'item', targetId: first.id });
        s.events.push({ type: 'itemUsed', actorId: actor.id, itemId: def.id });
        s.log.push(`${actor.name} lanza ${def.name.toLowerCase()}${b.target === 'all' ? ' contra todos' : ` contra ${first.name}`}.`);
        for (const t of targets) {
          const r = bombDamage(actor, t, b, rng);
          s.log.push(`${t.name} encaja ${r.amount} de daño ${BOMB_DMG_NAME[b.dmg]}${r.crit ? ' ¡CRÍTICO!' : ''}${b.undeadMult && t.undead ? ' (no muerto: el doble)' : ''}.`);
          dealDamage(s, t, r.amount, r.crit, 'hit', { rng, kind: 'physical', by: actor, noInjury: true });
          if (b.status && alive(t) && rng.chance(b.status.chance)) applyStatus(s, t, b.status.id, b.status.turns, rng);
        }
        return;
      }
      s.events.push({ type: 'action', actorId: actor.id, label: def.name, fx: 'item' });
      s.events.push({ type: 'itemUsed', actorId: actor.id, itemId: def.id });
      s.log.push(`${actor.name} usa ${def.name}.`);
      if (actor.control === 'ai') actor.potions = Math.max(0, actor.potions - 1);
      applyItemEffect(s, actor, def.use);
      return;
    }
    case 'unleash': {
      if (actor.control !== 'ai' || !actor.intent) throw new Error('Acción no disponible');
      unleash(s, actor, rng);
      return;
    }
    case 'flee': {
      s.events.push({ type: 'action', actorId: actor.id, label: 'Huir', fx: 'flee' });
      if (!s.canFlee) {
        s.events.push({ type: 'flee', actorId: actor.id, success: false });
        s.log.push(`¡No hay escapatoria de este combate!`);
        return;
      }
      const ok = rng.chance(fleeChance(actor, opponents(s, actor)));
      s.events.push({ type: 'flee', actorId: actor.id, success: ok });
      if (ok && actor.control === 'player') {
        s.outcome = 'fled';
        s.log.push(`${actor.name} consigue huir.`);
      } else if (!ok) {
        s.log.push(`${actor.name} intenta huir, pero no lo consigue.`);
      }
      return;
    }
  }
}

/** Efectos de final de turno: daño persistente, regeneración, duración de estados y recurso. */
function endOfTurn(s: CombatState, actor: Combatant, used?: string) {
  if (!alive(actor)) return;
  tickCooldowns(actor, used);
  if (actor.skipImmune) actor.skipImmune -= 1;
  for (const st of [...actor.statuses]) {
    const def = STATUSES[st.id];
    if (def.dotPct && alive(actor)) {
      const amount = Math.max(1, Math.round(actor.stats.maxHp * (actor.body ? PLAYER_DOT[st.id] ?? def.dotPct : def.dotPct)));
      s.log.push(`${actor.name} sufre ${amount} por ${def.name.toLowerCase()}.`);
      dealDamage(s, actor, amount, false, 'dot', { status: st.id });
    }
    if (def.regenPct && alive(actor)) {
      const h = heal(s, actor, actor.stats.maxHp * def.regenPct);
      if (h > 0) s.log.push(`${actor.name} regenera ${h} de vida.`);
    }
    if (!def.skipsTurn) {
      st.turns -= 1;
      if (st.turns <= 0) s.events.push({ type: 'status', targetId: actor.id, status: st.id, applied: false });
    }
  }
  actor.statuses = actor.statuses.filter((x) => x.turns > 0);
  if (actor.shield && !hasStatus(actor, 'ward')) actor.shield = 0;
  if (alive(actor) && actor.resourceRegen > 0) actor.mp = Math.min(actor.stats.maxMp, actor.mp + turnRegen(actor.resourceRegen, actor.stats.maxMp));
}

/** Cada turno propio resta 1 a las recargas (menos a la habilidad que se acaba de usar). */
export function tickCooldowns(c: Combatant, used?: string) {
  if (!c.cooldowns) return;
  const next: Record<string, number> = {};
  for (const [id, t] of Object.entries(c.cooldowns)) {
    const left = id === used ? t : t - 1;
    if (left > 0) next[id] = left;
  }
  c.cooldowns = next;
}

function checkOutcome(s: CombatState) {
  if (s.outcome) return;
  const player = s.combatants.find((c) => c.control === 'player');
  const sideBAlive = s.combatants.some((c) => c.side === 'B' && alive(c));
  const sideAAlive = s.combatants.some((c) => c.side === 'A' && alive(c));
  if (player && !alive(player)) s.outcome = 'defeat';
  else if (!sideAAlive) s.outcome = 'defeat';
  else if (!sideBAlive) s.outcome = 'victory';
  if (s.outcome === 'victory') s.log.push('¡Victoria!');
  if (s.outcome === 'defeat') s.log.push('Has caído...');
}

/** Una ronda es un pulso también para el hambre, la sed y el cansancio. */
function tickCombatNeeds(s: CombatState, c: Combatant) {
  const t = tickNeeds(c.needs!, c.body!, c.body!.total, c.restExtra ?? 0, c.prepMods ?? {});
  c.needs = t.needs;
  if (c.baseMaxMp !== undefined) {
    c.stats.maxMp = effectiveMaxMp(c.baseMaxMp, t.needs, c.pactMpLoss ?? 0);
    c.mp = Math.min(c.mp, c.stats.maxMp);
  }
  for (const x of t.crossed) if (x.level !== 'ok') s.log.push(needLog(x.need, x.level));
  if (t.dealt > 0) {
    c.body = t.body;
    c.hp = summaryHp(c.body);
    s.events.push({ type: 'damage', targetId: c.id, amount: t.dealt, crit: false, source: 'dot', region: 'thorax' });
    s.log.push(`${c.name} desfallece de ${t.needs.hyd <= 0 ? 'sed' : 'hambre'}: -${t.dealt} en el tórax.`);
    if (c.hp === 0) { s.events.push({ type: 'death', targetId: c.id }); s.log.push(`${c.name} cae, consumido.`); }
  }
}

/** Texto del registro o del aviso cuando una necesidad cruza un umbral. */
export function needLog(need: Need, level: NeedLevel): string {
  const what = NEED_NAME[need].toLowerCase();
  if (level === 'empty') return need === 'rest' ? 'Estás agotado: tu iniciativa cae.' : need === 'hyd' ? 'La sed te quema: pronto empezará a herirte.' : 'El hambre te roe: pronto empezará a herirte.';
  if (level === 'critical') return `${NEED_LOW[need]} grave (${what} 10 o menos): tu Ímpetu o Maná máximo cae un 20 %.`;
  return `${NEED_LOW[need]}: ${what} en 30 o menos; tu Ímpetu o Maná máximo cae un 10 %.`;
}

function startRound(s: CombatState) {
  s.round += 1;
  s.order = turnOrder(s.combatants);
  s.turnIndex = 0;
  // Cada ronda es un pulso: las hemorragias de la anatomía sangran una vez (sea cual sea el número de actores)
  if (s.round > 1) {
    for (const c of s.combatants.filter((x) => x.body && alive(x))) {
      const was = c.body!.painFree;
      c.body = tickPain(c.body!);
      if (was && !c.body.painFree) s.log.push(`El analgésico deja de hacer efecto en ${c.name}.`);
      if (c.needs) tickCombatNeeds(s, c);
      if (!alive(c)) continue;
      const r = bleedTick(c.body!);
      if (!r.bleeding.length) continue;
      c.body = r.body;
      c.hp = summaryHp(c.body);
      if (r.dealt > 0) {
        s.events.push({ type: 'damage', targetId: c.id, amount: r.dealt, crit: false, source: 'dot', status: 'bleed' });
        s.log.push(`${c.name} se desangra: -${r.dealt}.`);
      }
      if (c.hp === 0) { s.events.push({ type: 'death', targetId: c.id }); s.log.push(`${c.name} cae desangrado.`); }
    }
    checkOutcome(s);
    if (s.outcome) return;
  }
  if (s.round >= DOOM_ROUND) {
    const pct = 0.08 * (s.round - DOOM_ROUND + 1);
    s.log.push(`La cripta reclama su tributo (ronda ${s.round}).`);
    for (const c of s.combatants.filter(alive)) dealDamage(s, c, Math.max(1, Math.round(c.stats.maxHp * pct)), false, 'doom');
    checkOutcome(s);
  }
}

/** Pasa al siguiente combatiente capaz de actuar, resolviendo turnos perdidos. */
function advance(s: CombatState, rng: Rng) {
  void rng;
  for (let guard = 0; guard < 200 && !s.outcome; guard++) {
    s.turnIndex += 1;
    if (s.round === 0 || s.turnIndex >= s.order.length) startRound(s);
    if (s.outcome) return;
    const actor = getCombatant(s, s.order[s.turnIndex]);
    if (!alive(actor)) continue;
    actor.defending = false;
    // Recuperación tras un ataque anunciado: pierde el turno y sigue expuesto hasta que acaba
    if (actor.recovering && actor.recovering > 0) {
      actor.recovering -= 1;
      s.events.push({ type: 'intent', actorId: actor.id, label: 'Se recupera' });
      actor.exposed = Math.max(0, (actor.exposed ?? 0) - 1);
      s.log.push(`${actor.name} se recupera del golpe${actor.exposed ? '' : ' y recompone la guardia'}.`);
      endOfTurn(s, actor);
      checkOutcome(s);
      continue;
    }
    const skip = actor.statuses.find((x) => STATUSES[x.id].skipsTurn && x.turns > 0);
    if (skip) {
      skip.turns -= 1;
      s.events.push({ type: 'skip', actorId: actor.id, status: skip.id });
      s.log.push(`${actor.name} pierde el turno (${STATUSES[skip.id].name.toLowerCase()}).`);
      actor.skipImmune = 2;
      if (skip.turns <= 0) s.events.push({ type: 'status', targetId: actor.id, status: skip.id, applied: false });
      endOfTurn(s, actor);
      checkOutcome(s);
      continue;
    }
    return;
  }
}

function clone(s: CombatState): CombatState {
  return structuredClone(s);
}

/** Ejecuta la acción del combatiente actual y avanza hasta el siguiente turno. */
export function performAction(state: CombatState, action: CombatAction): CombatState {
  if (state.outcome) throw new Error('El combate ya ha terminado');
  const s = clone(state);
  s.events = [];
  s.step += 1;
  const rng = makeRng(s.rngState);
  const actor = currentActor(s);
  if (!actor) throw new Error('No hay combatiente activo');
  const wasExposed = action.type !== 'unleash' && (actor.exposed ?? 0) > 0;
  executeAction(s, actor, action, rng);
  // Tras actuar, el expuesto recompone la guardia; y quien sigue un patrón anuncia el siguiente ataque en este mismo turno
  if (wasExposed) actor.exposed = (actor.exposed ?? 1) - 1;
  if (actor.pattern && action.type !== 'unleash') {
    actor.sinceIntent = (actor.sinceIntent ?? 0) + 1;
    checkOutcome(s);
    // Mientras su auxiliar sigue en pie, el jefe no anuncia: la presión la pone el auxiliar
    const auxUp = s.combatants.some((c) => c.id === `${actor.id}_aux` && alive(c));
    // Una sola amenaza anunciada a la vez por bando: así una guardia siempre es una respuesta válida
    const mates = s.combatants.filter((c) => c !== actor && c.side === actor.side && alive(c));
    const busy = mates.some((c) => c.intent || (c.exposed ?? 0) > 0) || (!!actor.pattern.solo && mates.length > 0);
    if (!s.outcome && alive(actor) && !actor.intent && !auxUp && !busy && actor.sinceIntent >= actor.pattern.every && opponents(s, actor).length) telegraph(s, actor, rng);
  }
  checkOutcome(s);
  if (!s.outcome) {
    endOfTurn(s, actor, action.type === 'skill' ? action.skillId : undefined);
    checkOutcome(s);
  }
  if (!s.outcome) advance(s, rng);
  s.rngState = rng.state;
  return s;
}

/** Daño esperado de un ataque anunciado contra `def` sin guardia (sin crítico ni esquiva): lo enseña la ficha. */
export function intentDamage(att: Combatant, def: Combatant): number {
  if (!att.intent) return 0;
  const mv = getMove(att.intent.move);
  if (mv.kind !== 'strike') return 0;
  const off = mv.damage === 'physical' ? att.stats.atk : att.stats.mag;
  const mit = mv.damage === 'physical' ? def.stats.def : def.stats.res;
  let dmg = mv.power! * off * (DAMAGE_K / (DAMAGE_K + Math.max(0, mit)));
  if (att.body) dmg *= offenseMult(att.body);
  if (def.body) dmg *= ANATOMY.damageTaken;
  for (const st of att.statuses) { const m = STATUSES[st.id].damageDealtMult; if (m && st.turns > 0) dmg *= m; }
  for (const st of def.statuses) { const m = STATUSES[st.id].damageTakenMult; if (m && st.turns > 0) dmg *= m; }
  return Math.max(1, Math.round(dmg)) * (mv.hits ?? 1);
}

/** Lectura de intenciones para `c`: el golpe anunciado que le caerá antes de su próximo turno, la preparación que aún
 *  se puede cortar y el enemigo expuesto. Lo usan la IA aliada, las simulaciones de equilibrio y la interfaz. */
export function readIntents(s: CombatState, c: Combatant): { threat: Combatant | null; breakable: Combatant | null; exposed: Combatant | null } {
  const foes = opponents(s, c);
  const threat = foes.find((f) => f.intent && f.intent.wait <= 1 && getMove(f.intent.move).kind === 'strike' && (f.intent.targetId === c.id || getMove(f.intent.move).aoe)) ?? null;
  const breakable = foes.find((f) => f.intent && getMove(f.intent.move).breakAt) ?? null;
  const exposed = foes.find((f) => f.exposed) ?? null;
  return { threat, breakable, exposed };
}

// ── IA de combate ──

/** Decisiones sencillas pero coherentes: curarse si va mal, protegerse, rematar al débil. */
export function chooseAIAction(state: CombatState): CombatAction {
  const actor = currentActor(state);
  if (!actor) throw new Error('No hay combatiente activo');
  const rng = makeRng(state.rngState ^ 0x9e3779b9 ^ state.step);
  const foes = opponents(state, actor);
  const hpPct = actor.hp / actor.stats.maxHp;
  // Ataques anunciados: primero se termina lo preparado; después, tras `every` acciones normales, se anuncia el siguiente
  if (actor.intent) return { type: 'unleash' };

  // Prudente: se cura antes y se protege más; agresivo: aguanta hasta el límite y remata al más débil.
  const cautious = actor.stance === 'cautious';
  const aggressive = actor.stance === 'aggressive';
  const potionAt = cautious ? 0.5 : aggressive ? 0.25 : 0.35;
  if (hpPct < potionAt && actor.potions > 0) return { type: 'item', itemId: 'health_potion' };

  const usable = actor.skills.filter((id) => canUseSkill(actor, id)).map(getSkill);
  const selfSkills = usable.filter((sk) => sk.target === 'self' && !(sk.applies ?? []).every((a) => hasStatus(actor, a.status)));
  const selfAt = cautious ? 0.75 : aggressive ? 0.35 : 0.55;
  if (selfSkills.length && hpPct < selfAt && rng.chance(cautious ? 0.85 : 0.6)) return { type: 'skill', skillId: selfSkills[0].id };
  if (cautious && hpPct < 0.3 && rng.chance(0.5)) return { type: 'defend' };

  const weakest = [...foes].sort((a, b) => a.hp / a.stats.maxHp - b.hp / b.stats.maxHp)[0];
  const target = rng.chance(aggressive ? 0.9 : 0.6) ? weakest : rng.pick(foes);
  const offensive = usable.filter((sk) => sk.target === 'enemy');
  if (offensive.length && rng.chance(actor.skillChance)) {
    return { type: 'skill', skillId: rng.pick(offensive).id, targetId: target.id };
  }
  return { type: 'attack', targetId: target.id };
}

export function runAITurn(state: CombatState): CombatState {
  return performAction(state, chooseAIAction(state));
}
