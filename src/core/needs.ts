import { RESOURCE_LOSS_CAP } from '../config/exploration';
// Necesidades (Fase 5): Saciedad, Hidratación y Descanso de 0 a 100 (100 es lo bueno).
// Solo se gastan por pulso de juego activo (exploración o ronda de combate); en el Bastión no.
import { NEEDS, NEED_CFG, type Need } from '../config/needs';
import { damageRegion, isDisabled, type Body } from './anatomy';

export interface Needs {
  sat: number;
  hyd: number;
  rest: number;
  /** Pulsos seguidos con Saciedad / Hidratación a cero (deciden cuándo hiere el desgaste). */
  satZero?: number;
  hydZero?: number;
  /** Resto decimal del daño por hambre o sed. */
  residue?: number;
}

export const FULL_NEEDS: Needs = { sat: 100, hyd: 100, rest: 100 };

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Necesidades guardadas en el perfil (las partidas antiguas no tienen: llenas). */
export function needsOf(n: Partial<Needs> | null | undefined): Needs {
  return { ...FULL_NEEDS, ...(n ?? {}) };
}

/** Multiplicador del consumo de una necesidad (abdomen inutilizado, peso…), con sus topes. `restExtra`: carga (Fase 6). */
export function consumptionMult(need: Need, body?: Body, restExtra = 0): number {
  let mod = 0;
  if (body && need !== 'rest' && isDisabled(body, 'abdomen')) mod += NEED_CFG.abdomenExtra;
  if (need === 'rest') mod += restExtra;
  return 1 + Math.max(-NEED_CFG.maxReduction, Math.min(NEED_CFG.maxIncrease, mod));
}

/** Peor estado de las tres barras. */
export function worstNeed(n: Needs): number {
  return Math.min(n.sat, n.hyd, n.rest);
}

/** Pérdida del máximo de Ímpetu o Maná: 0, 10 % o 20 % según la peor barra (no se suman). */
export function resourceLoss(n: Needs): number {
  const w = worstNeed(n);
  return w <= NEED_CFG.criticalAt ? NEED_CFG.resourceLossCritical : w <= NEED_CFG.warnAt ? NEED_CFG.resourceLossLow : 0;
}

/** Máximo efectivo del recurso con las necesidades actuales. */
/** `extraLoss`: lo que quita además un pacto de altar (Fase 7); la suma tiene techo (config/exploration.ts). */
export function effectiveMaxMp(maxMp: number, n: Needs, extraLoss = 0): number {
  return Math.round(maxMp * (1 - Math.min(RESOURCE_LOSS_CAP, resourceLoss(n) + extraLoss)));
}

/** Pérdida de iniciativa por agotamiento (Descanso a cero). */
export function exhaustionLoss(n: Needs): number {
  return n.rest <= 0 ? NEED_CFG.exhaustedInitiative : 0;
}

/** Estado de una barra para la interfaz y los avisos. */
export type NeedLevel = 'ok' | 'low' | 'critical' | 'empty';
export function needLevel(v: number): NeedLevel {
  return v <= 0 ? 'empty' : v <= NEED_CFG.criticalAt ? 'critical' : v <= NEED_CFG.warnAt ? 'low' : 'ok';
}

export interface NeedsTick {
  needs: Needs;
  body: Body;
  /** Daño de hambre o sed aplicado al tórax en este pulso. */
  dealt: number;
  dead: boolean;
  /** Barras que han cruzado un umbral en este pulso (para avisar). */
  crossed: { need: Need; level: NeedLevel }[];
}

/** Un pulso: gasta las tres barras y, a cero de Hidratación o Saciedad, hiere el tórax de vez en cuando. */
export function tickNeeds(n0: Needs, body: Body, total: number, restExtra = 0): NeedsTick {
  const n: Needs = { ...n0 };
  const crossed: NeedsTick['crossed'] = [];
  for (const k of NEEDS) {
    const before = needLevel(n[k]);
    n[k] = clamp(n[k] - NEED_CFG.rate[k] * consumptionMult(k, body, restExtra));
    const after = needLevel(n[k]);
    if (after !== before) crossed.push({ need: k, level: after });
  }
  n.satZero = n.sat <= 0 ? (n.satZero ?? 0) + 1 : 0;
  n.hydZero = n.hyd <= 0 ? (n.hydZero ?? 0) + 1 : 0;
  const hurts = (n.hydZero > 0 && n.hydZero % NEED_CFG.hydDamageEvery === 0) || (n.satZero > 0 && n.satZero % NEED_CFG.satDamageEvery === 0);
  let dealt = 0, dead = false, b = body;
  if (hurts) {
    const raw = total * NEED_CFG.starveDamage + (n.residue ?? 0);
    const whole = Math.floor(raw);
    n.residue = raw - whole;
    if (whole > 0) {
      const r = damageRegion(b, 'thorax', whole, { lethal: true });
      b = r.body; dealt = r.dealt; dead = r.dead;
    }
  }
  return { needs: n, body: b, dealt, dead, crossed };
}

/** Pulsos que faltan para el siguiente efecto grave (penalización, cero o daño) de una barra. */
export function pulsesToNext(n: Needs, need: Need, body?: Body, restExtra = 0): number | null {
  const v = n[need];
  const rate = NEED_CFG.rate[need] * consumptionMult(need, body, restExtra);
  if (v > NEED_CFG.warnAt) return Math.ceil((v - NEED_CFG.warnAt) / rate);
  if (v > NEED_CFG.criticalAt) return Math.ceil((v - NEED_CFG.criticalAt) / rate);
  if (v > 0) return Math.ceil(v / rate);
  if (need === 'rest') return null;
  const every = need === 'hyd' ? NEED_CFG.hydDamageEvery : NEED_CFG.satDamageEvery;
  const z = (need === 'hyd' ? n.hydZero : n.satZero) ?? 0;
  return every - (z % every);
}

/** Comer o beber: sube la barra (nunca por encima de 100). Devuelve null si no sirve de nada. */
export function feed(n: Needs, gain: Partial<Record<Need, number>>): Needs | null {
  const out: Needs = { ...n };
  let useful = false;
  for (const k of NEEDS) {
    const g = gain[k] ?? 0;
    if (g > 0 && n[k] < 100) { out[k] = clamp(n[k] + g); useful = true; }
  }
  if (!useful) return null;
  if (out.sat > 0) out.satZero = 0;
  if (out.hyd > 0) out.hydZero = 0;
  return out;
}

/** Al volver al Bastión: suministro comunitario (Saciedad e Hidratación al menos a 60). */
export function baseSupply(n: Needs): Needs {
  return { sat: Math.max(n.sat, NEED_CFG.baseSupply), hyd: Math.max(n.hyd, NEED_CFG.baseSupply), rest: n.rest };
}

/** Dormir en el catre: Descanso a 100. */
export function sleep(n: Needs): Needs {
  return { ...n, rest: 100 };
}

/** Para guardar: redondeo a décimas y sin contadores (se reinician en el Bastión). */
export function toSaved(n: Needs): Needs {
  const r = (x: number) => Math.round(x * 10) / 10;
  return { sat: r(n.sat), hyd: r(n.hyd), rest: r(n.rest) };
}
