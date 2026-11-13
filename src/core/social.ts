import { GOLD_SCALE } from '../config/gold';
// ════════════════════════════════════════════════════════════════════
// Mercenarios errantes (y Kael, el más especial de ellos).
// Al aliarte se tira un dado UNA vez con su riesgo de traición (triángulo de color). Si sale, es un traidor «dormido»:
// solo actúa en un momento de debilidad, nunca en el primer minuto, y siempre avisa antes. El reparto de cofres
// cambia el riesgo y vuelve a tirar el dado. Valores en config/wanderers.ts.
// ════════════════════════════════════════════════════════════════════
import { BETRAY_MIN_ALLIED_MS, ENCOUNTER_CHANCE, HOSTILE_CHANCE, HOSTILE_FROM_SUBZONE, KAEL_CHANCE, KAEL_GUARANTEE_AFTER, RISK, ROB_CHANCE, GOLD_SHARE, GOLD_SHARE_FAIR, GOLD_SHARE_GREEDY, SHARE_FAIR_DELTA, SHARE_FAIR_RATIO, SHARE_GREEDY_DELTA, ZONE_RISK, WITNESS_DISTRUST, KAEL_TRUST, type RiskLevel } from '../config/wanderers';
import { getWanderer, wanderersOf } from './data/wanderers';
import type { SubzoneDef } from './data/subzones';
import type { Rng } from './rng';

export type Disposition = 'neutral' | 'allied' | 'hostile' | 'departed' | 'dead' | 'fleeing';

export interface RivalState {
  /** Errante de esta expedición (vacío si no hay ninguno). */
  who: string;
  disposition: Disposition;
  risk: RiskLevel;
  /** Probabilidad de traición actual (empieza en la de su triángulo). */
  chance: number;
  /** Resultado del dado: si es un traidor dormido. Oculto al jugador. */
  traitor: boolean;
  hp: number;
  potions: number;
  talkedTimes: number;
  /** Objetos que lleva (los que le diste en los repartos y los que te robó). Se recuperan si cae. */
  bagItemIds: string[];
  /** Oro que lleva encima. */
  gold: number;
  warned: boolean;
  betrayed: boolean;
  betrayedBy: 'player' | 'rival' | null;
  /** Cuándo os aliasteis (ms) y el oro que llevabas entonces: de lo que encuentres después se lleva su parte. */
  alliedAt: number;
  goldAtJoin: number;
  /** Ya se ha presentado (primera frase). */
  greeted: boolean;
  /** Cómo has repartido en esta bajada: +1 por reparto justo, −1 por avaricioso. Decide cuánto pide en el portal. */
  shareScore?: number;
  /** Oro que le pagaste en el portal (para el resumen). */
  paid?: number;
  /** Te negaste a pagarle su parte en el portal (traición menos grave para la confianza de Kael). */
  refused?: boolean;
  /** Te vio traicionar a tu aliado anterior para quedarse con él: se fía menos (👁). */
  witnessed?: boolean;
}

export function noRival(): RivalState {
  return { who: '', disposition: 'departed', risk: 'low', chance: 0, traitor: false, hp: 0, potions: 0, talkedTimes: 0, bagItemIds: [], gold: 0, warned: false, betrayed: false, betrayedBy: null, alliedAt: 0, goldAtJoin: 0, greeted: false };
}

/** Errante recién encontrado. `hostile`: de los que atacan al verte (Infierno profundo). */
export function initialRival(who = 'kael', risk: RiskLevel = 'kael', hostile = false): RivalState {
  const w = getWanderer(who);
  return {
    ...noRival(), who, risk: hostile ? 'hostile' : risk, chance: RISK[hostile ? 'hostile' : risk].chance,
    disposition: hostile ? 'hostile' : 'neutral', hp: w.stats.maxHp, potions: 1, gold: Math.max(1, Math.round((30 + w.stats.maxHp / 3) * GOLD_SCALE)),
    bagItemIds: [...(w.gear ?? ['health_potion', 'old_coin'])],
  };
}

/** ¿Hay un errante con quien hablar o luchar en esta expedición? */
export function hasRival(r: RivalState): boolean {
  return !!r.who;
}

export interface EncounterRoll { who: string | null; risk: RiskLevel; hostile: boolean; kaelStreak: number }

/**
 * Quién aparece en una expedición. Kael solo en la Mazmorra: 33 % y seguro tras 4 expediciones sin verlo.
 * Si no sale Kael, puede salir otro errante de la zona (los de las subzonas 8–10, a veces hostiles).
 */
export function rollEncounter(rng: Rng, sub: SubzoneDef, kaelStreak: number): EncounterRoll {
  if (sub.zone === 'mazmorra') {
    if (kaelStreak + 1 > KAEL_GUARANTEE_AFTER || rng.chance(KAEL_CHANCE)) return { who: 'kael', risk: 'kael', hostile: false, kaelStreak: 0 };
    kaelStreak += 1;
  }
  const pool = wanderersOf(sub.zone);
  if (!pool.length || !rng.chance(ENCOUNTER_CHANCE[sub.zone])) return { who: null, risk: ZONE_RISK[sub.zone], hostile: false, kaelStreak };
  const w = pool[rng.int(0, pool.length - 1)];
  const hostile = sub.index >= HOSTILE_FROM_SUBZONE && rng.chance(HOSTILE_CHANCE);
  return { who: w.id, risk: ZONE_RISK[sub.zone], hostile, kaelStreak };
}

export function greetLine(r: RivalState, timesMet = 0, lowTrust = false): string {
  const lines = getWanderer(r.who).lines;
  if (lowTrust && lines.greetLow?.length) return lines.greetLow[timesMet % lines.greetLow.length];
  const g = lines.greet;
  return g[Math.min(timesMet, g.length - 1)];
}

export function talk(r: RivalState): { rival: RivalState; line: string } {
  const t = getWanderer(r.who).lines.talk;
  return { rival: { ...r, talkedTimes: r.talkedTimes + 1 }, line: t[r.talkedTimes % t.length] };
}

/** Aliarse: acepta siempre (el riesgo está a la vista en el triángulo) y aquí se tira el dado de la traición. */
export function proposeAlliance(r: RivalState, rng: Rng, now: number, goldNow: number): { rival: RivalState; accepted: boolean; line: string } {
  if (r.disposition !== 'neutral') return { rival: r, accepted: false, line: `${getWanderer(r.who).name} no parece dispuesto a escucharte.` };
  return {
    rival: { ...r, disposition: 'allied', traitor: rng.chance(r.chance), alliedAt: now, goldAtJoin: goldNow },
    accepted: true, line: getWanderer(r.who).lines.join,
  };
}

export function rejectRival(r: RivalState): { rival: RivalState; line: string } {
  return { rival: { ...r, disposition: 'departed' }, line: getWanderer(r.who).lines.leave };
}

export function leaveAlliance(r: RivalState): { rival: RivalState; line: string } {
  return { rival: { ...r, disposition: 'departed' }, line: getWanderer(r.who).lines.leave };
}

export type ShareVerdict = 'fair' | 'stingy' | 'greedy';

/** Cómo ve el errante lo que le has dado (por valor). `single`: cofre de un solo objeto (quedártelo solo es tacaño). */
export function shareVerdict(givenValue: number, totalValue: number, single = false): ShareVerdict {
  if (givenValue <= 0) return single ? 'stingy' : 'greedy';
  return totalValue <= 0 || givenValue / totalValue >= SHARE_FAIR_RATIO ? 'fair' : 'stingy';
}

export interface ShareInput { givenValue: number; totalValue: number; givenIds: string[]; givenGold: number; single?: boolean }

/** Reparto del botín (cofre o saco de combate) estando aliados: cambia el riesgo y se vuelve a tirar el dado. */
export function shareLoot(r: RivalState, x: ShareInput, rng: Rng): { rival: RivalState; line: string | null; verdict: ShareVerdict | null } {
  if (r.disposition !== 'allied') return { rival: r, line: null, verdict: null };
  const w = getWanderer(r.who).lines;
  const verdict = shareVerdict(x.givenValue, x.totalValue, x.single);
  const delta = verdict === 'fair' ? SHARE_FAIR_DELTA : verdict === 'greedy' ? SHARE_GREEDY_DELTA : 0;
  const chance = Math.max(0, Math.min(1, r.chance + delta));
  // Si ya avisó, el dado ya no cambia: la decisión está tomada
  const traitor = r.warned ? r.traitor : rng.chance(chance);
  const shareScore = (r.shareScore ?? 0) + (verdict === 'fair' ? 1 : verdict === 'greedy' ? -1 : 0);
  const line = verdict === 'fair' ? w.fair : verdict === 'greedy' ? w.greedy : (w.stingy ?? 'Hmm. Poca cosa, para lo que hemos sudado.');
  return { rival: { ...r, chance, traitor, shareScore, bagItemIds: [...r.bagItemIds, ...x.givenIds], gold: r.gold + x.givenGold }, line, verdict };
}

/** Qué parte del oro pide en el portal, según cómo hayas repartido. */
export function sharePct(r: RivalState): number {
  const sc = r.shareScore ?? 0;
  return sc > 0 ? GOLD_SHARE_FAIR : sc < 0 ? GOLD_SHARE_GREEDY : GOLD_SHARE;
}

export interface BetrayalContext {
  now: number;
  playerHpPct: number;
  nearPortal: boolean;
  /** Acaba de abrir un cofre con llave o de jefe. */
  richChest?: boolean;
  zone: 'mazmorra' | 'cripta' | 'infierno';
}

/** ¿Es un momento de debilidad? Poca vida, cerca del portal o un cofre valioso abierto. */
export function weakMoment(ctx: BetrayalContext): boolean {
  return ctx.playerHpPct < 0.4 || ctx.nearPortal || !!ctx.richChest;
}

/**
 * Comprueba la traición. Un traidor dormido, pasado el primer minuto de alianza, en un momento de debilidad:
 * la primera vez solo avisa; la siguiente traiciona (atacando o, en el Infierno, a veces robando y huyendo).
 */
export function evaluateBetrayal(r: RivalState, ctx: BetrayalContext, rng: Rng): { rival: RivalState; action: 'none' | 'warn' | 'betray' | 'rob'; line: string | null } {
  if (r.disposition !== 'allied' || r.betrayed || !r.traitor) return { rival: r, action: 'none', line: null };
  if (ctx.now - r.alliedAt < BETRAY_MIN_ALLIED_MS || !weakMoment(ctx)) return { rival: r, action: 'none', line: null };
  const w = getWanderer(r.who).lines;
  if (!r.warned) return { rival: { ...r, warned: true }, action: 'warn', line: w.warn };
  if (w.rob && rng.chance(ROB_CHANCE[ctx.zone])) {
    return { rival: { ...r, disposition: 'fleeing', betrayed: true, betrayedBy: 'rival' }, action: 'rob', line: w.rob };
  }
  return { rival: { ...r, disposition: 'hostile', betrayed: true, betrayedBy: 'rival' }, action: 'betray', line: `${w.betray} ¡${getWanderer(r.who).name} te traiciona!` };
}

/** El jugador rompe la alianza y ataca. */
export function playerBetrays(r: RivalState): RivalState {
  return { ...r, disposition: 'hostile', betrayed: true, betrayedBy: 'player' };
}

export function playerAttacksNeutral(r: RivalState): RivalState {
  return { ...r, disposition: 'hostile', betrayedBy: 'player' };
}

/** Te ha visto traicionar a tu aliado anterior para quedarte con él: sube su riesgo y se vuelve a tirar el dado. */
export function witnessBetrayal(r: RivalState, rng: Rng): RivalState {
  if (r.witnessed) return r;
  const chance = Math.min(1, r.chance + WITNESS_DISTRUST);
  return { ...r, witnessed: true, chance, traitor: r.traitor || (r.disposition === 'allied' && rng.chance(WITNESS_DISTRUST)) };
}

/** Separar caminos con el errante aliado: se lleva ya su parte del oro encontrado desde que os aliasteis. */
export function partWays(r: RivalState): RivalState {
  return { ...r, disposition: 'departed' };
}

/** Parte del oro que pide un errante al llegar juntos al portal (del oro ganado desde que os aliasteis). */
export function goldShare(r: RivalState, goldNow: number, share = sharePct(r)): number {
  if (r.disposition !== 'allied' || r.hp <= 0) return 0;
  return Math.max(0, Math.round((goldNow - r.goldAtJoin) * share));
}

/** Lo que dice al pedir su parte en el portal. */
export function demandLine(r: RivalState, n: number): string {
  const w = getWanderer(r.who);
  const first = w.name.split(' ')[0];
  const base = w.lines.demand ?? `${first}: «Antes de cruzar, mi parte. {n} monedas.»`;
  return base.replace('{n}', String(n));
}

/** Lo que dice si te niegas a pagarle. */
export function refusedLine(r: RivalState): string {
  const w = getWanderer(r.who);
  return w.lines.refused ?? `${w.name.split(' ')[0]}: «¿Así que esas tenemos? Muy bien.»`;
}

/** Te niegas a pagarle en el portal: se vuelve hostil (y cuenta como traición tuya). */
export function refuseShare(r: RivalState): RivalState {
  return { ...r, disposition: 'hostile', betrayed: true, betrayedBy: 'player', refused: true };
}

/**
 * Confianza de Kael al acabar la expedición (puntos de traición, `Profile.kael.trust`):
 * traicionarle o atacarle suma más que negarle su parte en el portal; extraer juntos pagándole la recupera.
 * La hostilidad es permanente.
 */
export function kaelTrustAfter(points: number, r: RivalState, extracted: boolean): number {
  if (r.who !== 'kael') return points;
  if (points >= KAEL_TRUST.hostile) return points;
  if (r.betrayedBy === 'player') return Math.min(KAEL_TRUST.hostile, points + (r.refused ? KAEL_TRUST.refuse : KAEL_TRUST.betray));
  if (extracted && r.disposition === 'allied' && r.hp > 0 && r.paid !== undefined) return Math.max(0, points - KAEL_TRUST.recover);
  return points;
}
