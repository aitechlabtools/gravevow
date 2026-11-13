import { GOLD_SCALE } from '../config/gold';
import { spendGold } from './wallet';
// ════════════════════════════════════════════════════════════════════
// Mercenarios: contratos con Grizk, rescate de prisioneros y el
// combatiente que lucha a tu lado. Lógica pura, sin interfaz.
// ════════════════════════════════════════════════════════════════════
import { CONTRACT_OPTIONS, MERC_POTIONS, MERC_ZONE_POWER, RESCUE_DISCOUNT } from '../config/contracts';
import { REP_RANKS, rankOf } from '../config/reputation';
import type { Combatant, Side } from './combat';
import { levelScale } from './combatants';
import { getMerc, MERC_ORDER, MERCENARIES, type MercDef } from './data/mercenaries';
import type { MercStance, Profile } from './types';

export type MercResult = { ok: true; profile: Profile } | { ok: false; error: string };

/** Compañero en la expedición en curso. La vida se guarda en la escala de nivel 1 (como Kael). */
export interface MercState {
  id: string;
  hp: number;
  potions: number;
  stance: MercStance;
  /** Rescatado en esta expedición (va gratis; si extraes con él vivo, se desbloquea). */
  rescued: boolean;
  alive: boolean;
  /** Ya no te acompaña sin haber caído en combate: os separasteis o lo traicionaste (solo cabe un aliado). */
  left?: 'parted' | 'betrayed';
}

export const STANCE_NAME: Record<MercStance, string> = { aggressive: 'Agresivo', cautious: 'Prudente' };
export const STANCE_DESC: Record<MercStance, string> = {
  aggressive: 'Remata al enemigo más débil y apura la vida antes de beber poción.',
  cautious: 'Se protege y se cura antes; a veces se defiende en lugar de atacar.',
};

/** Estadísticas base del mercenario (nivel 1) con el refuerzo de su zona. */
export function mercBaseStats(m: MercDef) {
  const k = MERC_ZONE_POWER[m.zone] ?? 1;
  const st = { ...m.stats };
  for (const key of ['maxHp', 'atk', 'def', 'mag', 'res'] as const) st[key] = Math.round(st[key] * k);
  return st;
}

export function isUnlocked(p: Profile, m: MercDef): boolean {
  return m.captive ? p.mercsRescued.includes(m.id) : true;
}

/** Motivo por el que aún no se puede contratar (o null si se puede). */
export function hireBlock(p: Profile, m: MercDef): string | null {
  if (m.captive && !p.mercsRescued.includes(m.id)) return 'Está prisionero en la mazmorra. Rescátalo y extrae con él.';
  if (!m.captive && rankOf(p.reputation.grizk ?? 0) < m.rank) return `Necesitas el rango «${REP_RANKS[m.rank].name}» con Grizk.`;
  return null;
}

/** Precio total de un contrato: por expedición × expediciones × multiplicador, con el descuento de reputación y el de rescate. */
export function contractPrice(p: Profile, mercId: string, expeditions: number): number {
  const m = getMerc(mercId);
  const opt = CONTRACT_OPTIONS.find((o) => o.expeditions === expeditions) ?? CONTRACT_OPTIONS[0];
  const rep = REP_RANKS[rankOf(p.reputation.grizk ?? 0)].discount;
  const rescue = p.mercDiscounts.includes(mercId) ? RESCUE_DISCOUNT : 0;
  return Math.max(1, Math.round(m.price * GOLD_SCALE * opt.expeditions * opt.mult * (1 - rep) * (1 - rescue)));
}

export function hire(p: Profile, mercId: string, expeditions: number, stance: MercStance): MercResult {
  const m = MERCENARIES[mercId];
  if (!m) return { ok: false, error: 'Ese mercenario no existe.' };
  if (p.contract) return { ok: false, error: `Ya tienes un contrato con ${getMerc(p.contract.mercId).name}.` };
  if (!CONTRACT_OPTIONS.some((o) => o.expeditions === expeditions)) return { ok: false, error: 'Duración de contrato no válida.' };
  const block = hireBlock(p, m);
  if (block) return { ok: false, error: block };
  const price = contractPrice(p, mercId, expeditions);
  const paid = spendGold(p, price);
  if (!paid.ok) return paid;
  return {
    ok: true,
    profile: { ...paid.profile, contract: { mercId, left: expeditions, stance }, mercDiscounts: p.mercDiscounts.filter((id) => id !== mercId) },
  };
}

/** Rescindir: el mercenario se va y no se devuelve el oro. */
export function dismiss(p: Profile): Profile {
  return { ...p, contract: null };
}

export function setStance(p: Profile, stance: MercStance): Profile {
  return p.contract ? { ...p, contract: { ...p.contract, stance } } : p;
}

/** Compañero con el que empiezas la expedición (si hay contrato). */
export function mercForExpedition(p: Profile): MercState | null {
  if (!p.contract) return null;
  const m = getMerc(p.contract.mercId);
  return { id: m.id, hp: mercBaseStats(m).maxHp, potions: MERC_POTIONS, stance: p.contract.stance, rescued: false, alive: true };
}

/** Prisionero liberado: se une gratis por esta expedición. */
export function rescuedMerc(mercId: string, stance: MercStance = 'cautious'): MercState {
  const m = getMerc(mercId);
  return { id: m.id, hp: Math.round(mercBaseStats(m).maxHp * 0.6), potions: 1, stance, rescued: true, alive: true };
}

/** Combatiente del mercenario, escalado al nivel del combate. */
export function mercCombatant(ms: MercState, side: Side, level = 1): Combatant {
  const m = getMerc(ms.id);
  const k = levelScale(level);
  const stats = mercBaseStats(m);
  for (const key of ['maxHp', 'atk', 'def', 'mag', 'res'] as const) stats[key] = Math.round(stats[key] * k);
  return {
    id: 'merc', name: m.name, side, sprite: m.sprite,
    stats, hp: Math.max(1, Math.min(Math.round(ms.hp * k), stats.maxHp)), mp: 20,
    resourceName: m.resourceName, resourceRegen: 3, statuses: [], skills: [...m.skills], basicAttack: m.basicAttack,
    control: 'ai', skillChance: ms.stance === 'aggressive' ? 0.6 : 0.4, undead: false, defending: false,
    potions: ms.potions, ref: 'merc', stance: ms.stance,
  };
}

export function mercHpBack(hp: number, level = 1): number {
  return hp <= 0 ? 0 : Math.max(1, Math.round(hp / levelScale(level)));
}

export interface MercOutcome { profile: Profile; note: string | null }

/**
 * Al terminar la expedición:
 * - Contratado y vivo: gasta una expedición del contrato (si muere, el contrato se rompe).
 * - Rescatado: si extraes con él vivo, queda desbloqueado en la lista de Garra con descuento; si no, se pierde.
 */
export function settleMerc(p: Profile, ms: MercState | null, extracted: boolean): MercOutcome {
  if (!ms) return { profile: p, note: null };
  const m = getMerc(ms.id);
  // Separados por el camino: el rescatado sigue el suyo; el contratado vuelve sano, pero esa bajada del contrato se pierde
  if (ms.left === 'parted') {
    if (ms.rescued) return { profile: p, note: `${m.name} siguió su propio camino. Volverá a aparecer prisionero en ${zoneLabel(m.zone)}.` };
    if (!p.contract || p.contract.mercId !== m.id) return { profile: p, note: null };
    const left = p.contract.left - 1;
    return { profile: { ...p, contract: left > 0 ? { ...p.contract, left } : null }, note: `${m.name} volvió al Bastión por su cuenta: esa bajada del contrato se ha perdido.` };
  }
  if (ms.left === 'betrayed') {
    if (ms.rescued) return { profile: p, note: null };
    return { profile: p.contract?.mercId === m.id ? { ...p, contract: null } : p, note: null };
  }
  if (ms.rescued) {
    if (!ms.alive) return { profile: p, note: `${m.name} no sobrevivió. Volverá a aparecer prisionero en ${zoneLabel(m.zone)}.` };
    if (!extracted) return { profile: p, note: `${m.name} se ha perdido contigo en la oscuridad. Volverá a aparecer prisionero.` };
    if (p.mercsRescued.includes(m.id)) return { profile: p, note: null };
    return {
      profile: { ...p, mercsRescued: [...p.mercsRescued, m.id], mercDiscounts: [...p.mercDiscounts.filter((x) => x !== m.id), m.id] },
      note: `${m.name} ha llegado al refugio. Ya puedes contratar sus servicios con Grizk (el primer contrato, a mitad de precio).`,
    };
  }
  if (!p.contract || p.contract.mercId !== m.id) return { profile: p, note: null };
  if (!ms.alive) return { profile: { ...p, contract: null }, note: `${m.name} ha muerto: el contrato se rompe.` };
  const left = p.contract.left - 1;
  if (left <= 0) return { profile: { ...p, contract: null }, note: `El contrato con ${m.name} ha terminado.` };
  return { profile: { ...p, contract: { ...p.contract, left } }, note: null };
}

function zoneLabel(z: string): string {
  return z === 'cripta' ? 'La Cripta' : z === 'infierno' ? 'El Infierno' : 'La Mazmorra';
}

/** Prisionero que puede aparecer en una zona: uno aún no rescatado. Si ya llevas aliado, decides en la conversación (solo cabe uno). */
export function captiveCandidate(p: Profile, zone: string): string | null {
  const c = MERC_ORDER.map(getMerc).find((m) => m.captive && m.zone === zone && !p.mercsRescued.includes(m.id));
  return c?.id ?? null;
}
