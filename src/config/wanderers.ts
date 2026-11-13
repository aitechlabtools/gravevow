// Mercenarios errantes: probabilidades, riesgo de traición, colores y costes. Todo editable.
// Los errantes y sus frases están en core/data/wanderers.ts.
import type { ZoneId } from '../core/data/zones/types';

/** Probabilidad de encontrarse un errante en una expedición, por zona (Kael tiene su propia regla en la Mazmorra). */
export const ENCOUNTER_CHANCE: Record<ZoneId, number> = { mazmorra: 0.45, cripta: 0.5, infierno: 0.6 };

export type RiskLevel = 'kael' | 'low' | 'mid' | 'high' | 'hostile';

/** Triángulo sobre la cabeza: color, símbolo (se distinguen sin color) y texto. */
export const RISK: Record<RiskLevel, { color: string; symbol: string; label: string; chance: number }> = {
  kael: { color: '#5fd19a', symbol: '✓', label: 'Riesgo muy bajo', chance: 0.1 },
  low: { color: '#e8913a', symbol: '!', label: 'Riesgo medio', chance: 0.15 },
  mid: { color: '#e8913a', symbol: '!!', label: 'Riesgo alto', chance: 0.25 },
  high: { color: '#c4283b', symbol: '☠', label: 'Riesgo muy alto', chance: 0.5 },
  hostile: { color: '#ff3a3a', symbol: '⚔', label: 'Hostil: ataca al verte', chance: 1 },
};

/** Riesgo de cada zona para los errantes que no son Kael. */
export const ZONE_RISK: Record<ZoneId, RiskLevel> = { mazmorra: 'low', cripta: 'mid', infierno: 'high' };

/** Errantes hostiles desde el principio: solo en las subzonas de este índice en adelante (8–10) y con esta probabilidad. */
export const HOSTILE_FROM_SUBZONE = 8;
export const HOSTILE_CHANCE = 0.2;

/** Kael el Errante: probabilidad por expedición a la Mazmorra y garantía tras N expediciones sin verlo. */
export const KAEL_CHANCE = 0.33;
export const KAEL_GUARANTEE_AFTER = 4;

/** Coste de aliarse: su parte de cofres y sacos de combate, y al llegar al portal este porcentaje del oro ganado. */
export const GOLD_SHARE = 0.2;
/** En el portal pide menos si has repartido bien durante la bajada y más si has sido avaricioso. */
export const GOLD_SHARE_FAIR = 0.1;
export const GOLD_SHARE_GREEDY = 0.3;

/**
 * El reparto se mide por VALOR: darle al menos este porcentaje del botín es justo (baja el riesgo de traición);
 * darle algo pero menos es tacaño (no cambia); no darle nada es avaricioso (lo sube). Se vuelve a tirar el dado.
 */
export const SHARE_FAIR_RATIO = 0.25;
export const SHARE_FAIR_DELTA = -0.05;
export const SHARE_GREEDY_DELTA = 0.1;
/** Un cofre con un solo objeto solo pide reparto si el objeto es de esta rareza o mejor (y quedárselo es solo tacaño). */
export const SHARE_SINGLE_MIN_RARITY: 'rare' | 'epic' | 'legendary' = 'rare';

/** Cuándo puede actuar un traidor: nunca antes de este tiempo de alianza, y solo en un momento de debilidad. */
export const BETRAY_MIN_ALLIED_MS = 60_000;
export const BETRAY_LOW_HP = 0.4;
export const BETRAY_PORTAL_DIST = 5;

/** En el Infierno, al traicionar, a veces roba y huye hacia el portal en lugar de atacar. */
export const ROB_CHANCE: Record<ZoneId, number> = { mazmorra: 0, cripta: 0, infierno: 0.5 };
export const ROB_ITEMS: [number, number] = [1, 2];

// ── Un solo aliado (13/11) ──────────────────────────────────────────────
/** Si te ve traicionar a tu aliado anterior, el nuevo se fía menos: su probabilidad de traición sube esto (👁 en su triángulo). */
export const WITNESS_DISTRUST = 0.15;
/** Reputación con Grizk (Garra Roja) por lo que haces con sus mercenarios y prisioneros. */
export const GRIZK_REP = {
  /** Traicionar a un mercenario contratado: el contrato se rompe. */
  betrayContract: -150,
  /** Traicionar a un prisionero que liberaste: corre la voz. */
  betrayRescued: -50,
  /** Romper las cadenas de un prisionero y dejarle marchar sin que se una a ti. */
  releaseCaptive: 25,
};

/**
 * Confianza de Kael: puntos de traición guardados en el personaje (`Profile.kael.trust`).
 * Traicionarle (atacarle o cambiarle por otro a traición) suma `betray`; negarle su parte en el portal, `refuse` (menos grave).
 * Extraer juntos pagándole su parte resta `recover`, salvo si ya es hostil: la hostilidad es permanente.
 */
export const KAEL_TRUST = {
  betray: 2,
  refuse: 1,
  recover: 1,
  /** Desde cuántos puntos es «baja» y desde cuántos «hostil» (3 traiciones). */
  low: 2,
  hostile: 6,
};
export type KaelTrust = 'high' | 'low' | 'hostile';
/** Nivel, triángulo y nombre de cada confianza. */
export const KAEL_TRUST_LEVEL: Record<KaelTrust, { risk: RiskLevel; label: string }> = {
  high: { risk: 'kael', label: 'Confianza alta' },
  low: { risk: 'mid', label: 'Confianza baja' },
  hostile: { risk: 'hostile', label: 'Hostil' },
};
export function kaelTrust(points: number | undefined): KaelTrust {
  const p = points ?? 0;
  return p >= KAEL_TRUST.hostile ? 'hostile' : p >= KAEL_TRUST.low ? 'low' : 'high';
}
