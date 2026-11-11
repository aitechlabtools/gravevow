import { potionAmount, resourcePotionAmount, resourceGain, skillCost, turnRegen, IMPETUS_ON_HIT, IMPETUS_WHEN_HIT } from '../config/progression';
import type { DamageKind, ItemEffect, SkillDef, Stats, StatusId, StatusInstance } from './types';
import { makeRng, type Rng } from './rng';
import { getSkill } from './data/skills';
import { getItem } from './data/items';
import { STATUSES } from './statuses';

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
  wear?: { swings: number; hits: number };
}

export type CombatAction =
  | { type: 'attack'; targetId: string }
  | { type: 'skill'; skillId: string; targetId?: string }
  | { type: 'defend' }
  | { type: 'item'; itemId: string }
  | { type: 'flee' };

export type CombatEvent =
  | { type: 'action'; actorId: string; label: string; fx: Fx | 'item' | 'defend' | 'flee'; targetId?: string }
  | { type: 'damage'; targetId: string; amount: number; crit: boolean; source: 'hit' | 'dot' | 'doom'; status?: StatusId }
  | { type: 'miss'; targetId: string }
  | { type: 'heal'; targetId: string; amount: number }
  | { type: 'mana'; targetId: string; amount: number }
  | { type: 'status'; targetId: string; status: StatusId; applied: boolean }
  | { type: 'skip'; actorId: string; status: StatusId }
  | { type: 'death'; targetId: string }
  | { type: 'flee'; actorId: string; success: boolean }
  | { type: 'itemUsed'; actorId: string; itemId: string };

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

export function turnOrder(combatants: Combatant[]): string[] {
  return combatants
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => alive(c))
    .sort((a, b) => b.c.stats.spd - a.c.stats.spd || (a.c.side === b.c.side ? 0 : a.c.side === 'A' ? -1 : 1) || a.i - b.i)
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
  if (att.affixes?.includes('executioner') && def.hp < def.stats.maxHp * 0.3) dmg *= 1.25;
  for (const st of att.statuses) {
    const m = STATUSES[st.id].damageDealtMult;
    if (m && st.turns > 0) dmg *= m;
  }
  if (def.defending) dmg *= 0.5;
  for (const st of def.statuses) {
    const m = STATUSES[st.id].damageTakenMult;
    if (m && st.turns > 0) dmg *= m;
  }
  return { amount: Math.max(1, Math.round(dmg)), crit, miss: false };
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

function dealDamage(s: CombatState, target: Combatant, amount: number, crit: boolean, source: 'hit' | 'dot' | 'doom', status?: StatusId) {
  if (target.shield && target.shield > 0 && source !== 'doom') {
    const absorbed = Math.min(target.shield, amount);
    target.shield -= absorbed;
    amount -= absorbed;
    s.log.push(`El escudo de ${target.name} absorbe ${absorbed} de daño${target.shield <= 0 ? ' y se rompe' : ''}.`);
    if (target.shield <= 0) { target.shield = 0; target.statuses = target.statuses.filter((x) => x.id !== 'ward'); }
  }
  const floor = hasStatus(target, 'endure') && source !== 'doom' ? 1 : 0;
  target.hp = Math.max(Math.min(floor, target.hp), target.hp - amount);
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
  s.events.push({ type: 'damage', targetId: target.id, amount, crit, source, status });
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

function heal(s: CombatState, target: Combatant, amount: number) {
  const real = Math.min(target.stats.maxHp - target.hp, Math.round(amount));
  target.hp += real;
  s.events.push({ type: 'heal', targetId: target.id, amount: real });
  return real;
}

function applyStatus(s: CombatState, target: Combatant, id: StatusId, turns: number) {
  const ex = target.statuses.find((x) => x.id === id);
  if (ex) ex.turns = Math.max(ex.turns, turns);
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
  if (basic && a.includes('bleeding') && alive(target) && rng.chance(0.2)) applyStatus(s, target, 'bleed', 3);
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
  switch (action.type) {
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
        dealDamage(s, target, r.amount, r.crit, 'hit');
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
            dealDamage(s, t, r.amount, r.crit, 'hit');
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
        if (loss > 0) { actor.hp -= loss; s.events.push({ type: 'damage', targetId: actor.id, amount: loss, crit: false, source: 'dot' }); s.log.push(`${actor.name} paga ${loss} de vida.`); }
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
          if (rng.chance(ap.chance)) applyStatus(s, who, ap.status, ap.turns);
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
      s.events.push({ type: 'action', actorId: actor.id, label: def.name, fx: 'item' });
      s.events.push({ type: 'itemUsed', actorId: actor.id, itemId: def.id });
      s.log.push(`${actor.name} usa ${def.name}.`);
      if (actor.control === 'ai') actor.potions = Math.max(0, actor.potions - 1);
      applyItemEffect(s, actor, def.use);
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
  for (const st of [...actor.statuses]) {
    const def = STATUSES[st.id];
    if (def.dotPct && alive(actor)) {
      const amount = Math.max(1, Math.round(actor.stats.maxHp * def.dotPct));
      s.log.push(`${actor.name} sufre ${amount} por ${def.name.toLowerCase()}.`);
      dealDamage(s, actor, amount, false, 'dot', st.id);
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

function startRound(s: CombatState) {
  s.round += 1;
  s.order = turnOrder(s.combatants);
  s.turnIndex = 0;
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
    const skip = actor.statuses.find((x) => STATUSES[x.id].skipsTurn && x.turns > 0);
    if (skip) {
      skip.turns -= 1;
      s.events.push({ type: 'skip', actorId: actor.id, status: skip.id });
      s.log.push(`${actor.name} pierde el turno (${STATUSES[skip.id].name.toLowerCase()}).`);
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
  executeAction(s, actor, action, rng);
  checkOutcome(s);
  if (!s.outcome) {
    endOfTurn(s, actor, action.type === 'skill' ? action.skillId : undefined);
    checkOutcome(s);
  }
  if (!s.outcome) advance(s, rng);
  s.rngState = rng.state;
  return s;
}

// ── IA de combate ──

/** Decisiones sencillas pero coherentes: curarse si va mal, protegerse, rematar al débil. */
export function chooseAIAction(state: CombatState): CombatAction {
  const actor = currentActor(state);
  if (!actor) throw new Error('No hay combatiente activo');
  const rng = makeRng(state.rngState ^ 0x9e3779b9 ^ state.step);
  const foes = opponents(state, actor);
  const hpPct = actor.hp / actor.stats.maxHp;

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
