// ANATOMÍA DE SIETE REGIONES (Fase 4 de la expansión; plan maestro, apartados 08 y 09).
// La vida total es la suma de las regiones y solo sirve de resumen: se muere cuando la cabeza o el tórax
// llegan a cero. Un miembro o el abdomen a cero quedan inutilizados y el daño que les sobra se reparte
// entre las regiones que aún funcionan. Lógica pura y determinista: el azar llega siempre por `rng`.
import { ANATOMY, REGIONS, REGION_NAME, type Region } from '../config/anatomy';
import type { Rng } from './rng';

export type { Region } from '../config/anatomy';
export { REGIONS, REGION_NAME } from '../config/anatomy';

/** 0 = sin sangrado, 1 = leve, 2 = grave. */
export type BleedLevel = 0 | 1 | 2;

export interface RegionState {
  hp: number;
  bleed: BleedLevel;
  fracture: boolean;
  /** Ya operada en esta incursión: su máximo queda limitado hasta volver al Bastión. */
  operated: boolean;
  /** Restos decimales del sangrado (para no perder ni inventar vida al redondear). */
  residue: number;
}

export interface Body {
  /** Vida máxima total de referencia (la de las estadísticas). */
  total: number;
  /** Pulsos (o rondas) que le quedan al analgésico: mientras dure, no hay penalización por dolor. */
  painFree?: number;
  parts: Record<Region, RegionState>;
}

/** Lo que el perfil guarda entre incursiones: parte de vida de cada región y fracturas. */
export interface Wounds {
  pct: Partial<Record<Region, number>>;
  fractures: Region[];
}

export type Treatment = 'bandage' | 'hemostatic' | 'tourniquet' | 'splint' | 'surgery' | 'painkiller';

export const VITAL: Region[] = ['head', 'thorax'];
export const LIMBS: Region[] = ['armL', 'armR', 'legL', 'legR'];
export const ARMS: Region[] = ['armL', 'armR'];
export const LEGS: Region[] = ['legL', 'legR'];

export const isVital = (r: Region) => VITAL.includes(r);
export const isLimb = (r: Region) => LIMBS.includes(r);

/** Reparte un entero según pesos sin crear ni perder unidades (mayor resto, desempate por orden fijo). */
function apportion(amount: number, weights: [Region, number][]): Map<Region, number> {
  const out = new Map<Region, number>();
  const sum = weights.reduce((n, [, w]) => n + w, 0);
  if (amount <= 0 || sum <= 0) return out;
  const raw = weights.map(([r, w]) => ({ r, v: (amount * w) / sum }));
  let given = 0;
  for (const x of raw) { const f = Math.floor(x.v); out.set(x.r, f); given += f; }
  const order = [...raw].sort((a, b) => (b.v - Math.floor(b.v)) - (a.v - Math.floor(a.v)) || REGIONS.indexOf(a.r) - REGIONS.indexOf(b.r));
  for (let i = 0; given < amount; i++, given++) out.set(order[i % order.length].r, out.get(order[i % order.length].r)! + 1);
  return out;
}

/** Máximo normal de cada región: los restos de redondeo se reparten para que sumen exactamente `total`. */
export function regionMaxes(total: number): Record<Region, number> {
  const m = apportion(Math.max(0, Math.round(total)), REGIONS.map((r) => [r, ANATOMY.share[r]]));
  return Object.fromEntries(REGIONS.map((r) => [r, m.get(r) ?? 0])) as Record<Region, number>;
}

/** Máximo actual de una región (reducido si se operó en el campo). */
export function regionCap(b: Body, r: Region): number {
  const max = regionMaxes(b.total)[r];
  return b.parts[r].operated ? Math.max(1, Math.round(max * ANATOMY.surgeryCap)) : max;
}

export function fullBody(total: number): Body {
  const m = regionMaxes(total);
  return { total: Math.round(total), parts: Object.fromEntries(REGIONS.map((r) => [r, { hp: m[r], bleed: 0, fracture: false, operated: false, residue: 0 }])) as Record<Region, RegionState> };
}

function cloneBody(b: Body): Body {
  return { total: b.total, ...(b.painFree ? { painFree: b.painFree } : {}), parts: Object.fromEntries(REGIONS.map((r) => [r, { ...b.parts[r] }])) as Record<Region, RegionState> };
}

export function bodyHp(b: Body): number {
  return REGIONS.reduce((n, r) => n + b.parts[r].hp, 0);
}

export function isDead(b: Body): boolean {
  return b.parts.head.hp <= 0 || b.parts.thorax.hp <= 0;
}

/** Vida que se muestra como resumen: 0 si ha muerto (aunque le quede vida en los miembros). */
export function summaryHp(b: Body): number {
  return isDead(b) ? 0 : bodyHp(b);
}

/** Región no vital a cero: inutilizada hasta operarla. */
export function isDisabled(b: Body, r: Region): boolean {
  return !isVital(r) && b.parts[r].hp <= 0;
}

/** Cambia la vida máxima de referencia (otro equipo, otro nivel) conservando la parte de cada región. */
export function resizeBody(b: Body, total: number): Body {
  total = Math.round(total);
  if (total === b.total) return b;
  const old = regionMaxes(b.total);
  const out = cloneBody(b);
  out.total = total;
  for (const r of REGIONS) {
    const pct = old[r] > 0 ? b.parts[r].hp / old[r] : 1;
    out.parts[r].hp = Math.min(regionCap(out, r), Math.max(b.parts[r].hp > 0 ? 1 : 0, Math.round(pct * regionMaxes(total)[r])));
  }
  return out;
}

/** Región de un golpe normal, según pesos. Sin cabeza en S1 y S2. */
export function rollRegion(rng: Rng, allowHead: boolean): Region {
  const list = REGIONS.filter((r) => allowHead || r !== 'head');
  const sum = list.reduce((n, r) => n + ANATOMY.hitWeight[r], 0);
  let x = rng.next() * sum;
  for (const r of list) { x -= ANATOMY.hitWeight[r]; if (x < 0) return r; }
  return list[list.length - 1];
}

export interface DamageResult { body: Body; dealt: number; dead: boolean; disabled: Region[] }

/**
 * Daña una región. Lo que sobra de una región no vital (o el golpe a una ya inutilizada) se reparte entre las
 * regiones que aún funcionan, según su máximo, en una sola operación con iteración acotada. Nunca se crea ni se
 * pierde daño por redondeo. `lethal: false` (pagar vida con una habilidad) deja las vitales en 1 como mínimo.
 */
export function damageRegion(b: Body, region: Region, amount: number, opts: { lethal?: boolean } = {}): DamageResult {
  const out = cloneBody(b);
  const lethal = opts.lethal ?? true;
  const floorOf = (r: Region) => (!lethal && isVital(r) ? 1 : 0);
  let left = Math.max(0, Math.round(amount));
  let dealt = 0;
  const disabled: Region[] = [];
  const hit = (r: Region, n: number) => {
    const p = out.parts[r];
    const take = Math.max(0, Math.min(n, p.hp - floorOf(r)));
    p.hp -= take;
    dealt += take;
    if (take > 0 && p.hp <= 0 && !isVital(r)) disabled.push(r);
    return take;
  };
  // Primero la región golpeada (si aún funciona)
  if (out.parts[region].hp > 0) left -= hit(region, left);
  // Lo que sobra va a las regiones que funcionan (una región vital a cero ya es la muerte: no se reparte más)
  for (let guard = 0; left > 0 && guard < 8 && !(lethal && isDead(out)); guard++) {
    const pool = REGIONS.filter((r) => out.parts[r].hp > floorOf(r));
    if (!pool.length) break;
    const share = apportion(left, pool.map((r) => [r, regionMaxes(out.total)[r]]));
    for (const r of pool) left -= hit(r, share.get(r) ?? 0);
  }
  return { body: out, dealt, dead: isDead(out), disabled };
}

/** Daño de área o sin región (tributo de la cripta, pagar vida): un presupuesto repartido entre las regiones. */
export function damageSpread(b: Body, amount: number, opts: { lethal?: boolean } = {}): DamageResult {
  const floorOf = (r: Region) => ((opts.lethal ?? true) === false && isVital(r) ? 1 : 0);
  const pool = REGIONS.filter((r) => b.parts[r].hp > floorOf(r));
  if (!pool.length) return { body: b, dealt: 0, dead: isDead(b), disabled: [] };
  // Se reparte por partes (una por región) y cada parte usa la regla de exceso
  const share = apportion(Math.max(0, Math.round(amount)), pool.map((r) => [r, regionMaxes(b.total)[r]]));
  let cur = b; let dealt = 0; const disabled: Region[] = [];
  for (const r of pool) {
    const n = share.get(r) ?? 0;
    if (!n) continue;
    const res = damageRegion(cur, r, n, opts);
    cur = res.body; dealt += res.dealt; disabled.push(...res.disabled);
    if ((opts.lethal ?? true) && res.dead) break;
  }
  return { body: cur, dealt, dead: isDead(cur), disabled };
}

/**
 * Cura: primero la cabeza y el tórax, luego el resto de regiones que funcionan, según lo que les falta.
 * No toca las inutilizadas ni quita sangrados o fracturas. Un muerto no se cura.
 */
export function healBody(b: Body, amount: number): { body: Body; healed: number } {
  if (isDead(b)) return { body: b, healed: 0 };
  const out = cloneBody(b);
  let left = Math.max(0, Math.round(amount));
  let healed = 0;
  // Primero la cabeza y el tórax (lo que mata); lo que sobra, al resto según lo que le falta
  for (let guard = 0; left > 0 && guard < 10; guard++) {
    const hurt = (r: Region) => out.parts[r].hp > 0 && out.parts[r].hp < regionCap(out, r);
    const vital = VITAL.filter(hurt);
    const need = (vital.length ? vital : REGIONS.filter(hurt)).map((r) => [r, regionCap(out, r) - out.parts[r].hp] as [Region, number]);
    if (!need.length) break;
    const share = apportion(left, need);
    for (const [r, miss] of need) {
      const n = Math.min(miss, share.get(r) ?? 0);
      out.parts[r].hp += n; healed += n; left -= n;
    }
  }
  return { body: out, healed };
}

/** Pone toda la vida a una parte del máximo (tutorial y pruebas). Las regiones conservan su proporción. */
export function bodyAtPct(b: Body, pct: number): Body {
  const out = cloneBody(b);
  const m = regionMaxes(b.total);
  for (const r of REGIONS) out.parts[r].hp = Math.max(1, Math.min(m[r], Math.round(m[r] * pct)));
  return out;
}

// ── Lesiones ──

/** Abre o agrava un sangrado: el grave sustituye al leve de la misma región. */
export function addBleed(b: Body, r: Region, level: BleedLevel): Body {
  const out = cloneBody(b);
  out.parts[r].bleed = Math.max(out.parts[r].bleed, level) as BleedLevel;
  return out;
}

export interface Injury { region: Region; bleed?: BleedLevel; fracture?: boolean }

/** Tras un golpe físico que ha entrado: puede abrir un sangrado y, en brazos y piernas, romper un hueso. */
export function rollInjury(b: Body, region: Region, crit: boolean, rng: Rng): { body: Body; injury: Injury | null } {
  let out = b;
  const injury: Injury = { region };
  if (rng.chance(crit ? ANATOMY.bleedChanceCrit : ANATOMY.bleedChance)) {
    const level: BleedLevel = crit || b.parts[region].bleed === 1 ? 2 : 1;
    if (level > b.parts[region].bleed) { out = addBleed(out, region, level); injury.bleed = level; }
  }
  if (isLimb(region) && !b.parts[region].fracture && rng.chance(crit ? ANATOMY.fractureChanceCrit : ANATOMY.fractureChance)) {
    out = cloneBody(out);
    out.parts[region].fracture = true;
    injury.fracture = true;
  }
  return { body: out, injury: injury.bleed || injury.fracture ? injury : null };
}

/**
 * Sangrado de un pulso (o de una ronda de combate). Leve 0,5 % y grave 1 % de la vida máxima total; el
 * conjunto no pasa del 3 %: si lo supera, cada herida se reduce en proporción. Los decimales se guardan
 * en cada región. Cada herida daña su región (con la regla de exceso si está inutilizada).
 */
export function bleedTick(b: Body): { body: Body; dealt: number; dead: boolean; bleeding: Region[] } {
  const bleeding = REGIONS.filter((r) => b.parts[r].bleed > 0);
  if (!bleeding.length || isDead(b)) return { body: b, dealt: 0, dead: isDead(b), bleeding: [] };
  const per = (r: Region) => b.total * (b.parts[r].bleed === 2 ? ANATOMY.bleedHeavy : ANATOMY.bleedLight);
  const sum = bleeding.reduce((n, r) => n + per(r), 0);
  const k = Math.min(1, (b.total * ANATOMY.bleedCap) / sum);
  let cur = cloneBody(b);
  let dealt = 0;
  for (const r of bleeding) {
    cur.parts[r].residue += per(r) * k;
    const n = Math.floor(cur.parts[r].residue + 1e-9);
    if (n <= 0) continue;
    cur.parts[r].residue -= n;
    const res = damageRegion(cur, r, n);
    cur = res.body;
    dealt += res.dealt;
    if (res.dead) break;
  }
  return { body: cur, dealt, dead: isDead(cur), bleeding };
}

// ── Penalizaciones (sumadas por atributo y con tope) ──

/** Regiones que duelen: fracturas y miembros o abdomen inutilizados. */
export function painfulRegions(b: Body): Region[] {
  return REGIONS.filter((r) => b.parts[r].fracture || isDisabled(b, r));
}

/** Penalización por dolor (0 con el analgésico activo). Se suma a la de las lesiones y comparte sus topes. */
export function painLoss(b: Body): number {
  return b.painFree && b.painFree > 0 ? 0 : painfulRegions(b).length * ANATOMY.painPerRegion;
}

/** Un pulso o una ronda: el analgésico se va pasando. */
export function tickPain(b: Body): Body {
  if (!b.painFree) return b;
  const out = cloneBody(b);
  out.painFree = Math.max(0, (b.painFree ?? 0) - 1);
  if (!out.painFree) delete out.painFree;
  return out;
}

function limbLoss(b: Body, list: Region[], fracture: number, disabled: number): number {
  return list.reduce((n, r) => n + (isDisabled(b, r) ? disabled : b.parts[r].fracture ? fracture : 0), 0) + painLoss(b);
}

/** Multiplicador del daño que haces: brazos rotos o inutilizados. Nunca baja más de un 40 %. */
export function offenseMult(b: Body): number {
  return 1 - Math.min(ANATOMY.maxOffenseLoss, limbLoss(b, ARMS, ANATOMY.armFracture, ANATOMY.armDisabled));
}

/** Multiplicador de la iniciativa (velocidad en combate): piernas. Nunca baja del 50 %. */
export function initiativeMult(b: Body): number {
  return Math.max(ANATOMY.minInitiative, 1 - limbLoss(b, LEGS, ANATOMY.legFracture, ANATOMY.legDisabled));
}

/** Multiplicador del paso al explorar: piernas. Nunca baja del 40 %. */
export function mobilityMult(b: Body): number {
  return Math.max(ANATOMY.minMobility, 1 - limbLoss(b, LEGS, ANATOMY.legFracture, ANATOMY.legDisabled));
}

// ── Tratamientos ──

export const TREATMENT_NAME: Record<Treatment, string> = { bandage: 'Venda', hemostatic: 'Hemostático', tourniquet: 'Torniquete', splint: 'Férula', surgery: 'Equipo de cirugía', painkiller: 'Analgésico' };

/** ¿Se puede aplicar aquí? Devuelve el motivo si no (y entonces no se gasta nada). */
export function treatError(b: Body, t: Treatment, r: Region): string | null {
  const p = b.parts[r];
  const where = REGION_NAME[r].toLowerCase();
  if (isDead(b)) return 'Ya no hay nada que curar.';
  switch (t) {
    case 'bandage':
      if (p.bleed === 0) return `El ${where} no sangra.`;
      if (p.bleed === 2) return 'Una venda no basta para un sangrado grave: usa un hemostático o, en un miembro, un torniquete.';
      return null;
    case 'hemostatic':
      return p.bleed === 0 ? `El ${where} no sangra.` : null;
    case 'tourniquet':
      if (!isLimb(r)) return 'El torniquete solo sirve en brazos y piernas, no en la cabeza, el tórax ni el abdomen.';
      if (p.bleed === 0) return `El ${where} no sangra.`;
      return null;
    case 'splint':
      if (!isLimb(r)) return 'La férula solo sirve en brazos y piernas.';
      return p.fracture ? null : `El ${where} no está roto.`;
    case 'painkiller':
      if (!painfulRegions(b).length) return 'No te duele nada que calmar: el analgésico no cura heridas.';
      return b.painFree ? 'El analgésico anterior aún hace efecto.' : null;
    case 'surgery':
      if (isVital(r)) return 'La cirugía de campo no devuelve la vida a la cabeza ni al tórax.';
      if (p.hp > 0) return `El ${where} aún funciona: la cirugía es para regiones inutilizadas.`;
      if (p.operated) return `Ya operaste el ${where} en esta incursión: tendrás que volver al Bastión.`;
      return null;
  }
}

/** Aplica un tratamiento ya validado. Detener una hemorragia no devuelve la vida perdida. */
export function applyTreatment(b: Body, t: Treatment, r: Region): { body: Body; text: string } {
  const out = cloneBody(b);
  const p = out.parts[r];
  const where = REGION_NAME[r].toLowerCase();
  switch (t) {
    case 'bandage':
    case 'tourniquet': {
      p.bleed = 0; p.residue = 0;
      return { body: out, text: `${TREATMENT_NAME[t]} en el ${where}: deja de sangrar.` };
    }
    case 'hemostatic': {
      const light = p.bleed === 1;
      p.bleed = 0; p.residue = 0;
      return { body: out, text: light ? `Hemostático en el ${where}: era un sangrado leve; una venda habría bastado.` : `Hemostático en el ${where}: la hemorragia se corta.` };
    }
    case 'splint':
      p.fracture = false;
      return { body: out, text: `Férula en el ${where}: el hueso queda fijado (la vida perdida no vuelve).` };
    case 'painkiller':
      out.painFree = ANATOMY.painkillerPulses;
      return { body: out, text: `El analgésico adormece el dolor durante ${ANATOMY.painkillerPulses} pulsos. Las heridas siguen ahí.` };
    case 'surgery': {
      const max = regionMaxes(out.total)[r];
      p.operated = true;
      p.hp = Math.max(1, Math.round(max * ANATOMY.surgeryHp));
      p.bleed = 0; p.residue = 0;
      return { body: out, text: `Cirugía en el ${where}: vuelve a responder, pero no pasará del ${Math.round(ANATOMY.surgeryCap * 100)} % hasta el Bastión.` };
    }
  }
}

export interface Urgency { region: Region; need: 'bleed2' | 'bleed1' | 'fracture' | 'disabled' }

/** Lesiones de la más urgente a la menos: sangrado grave (vitales primero), leve, fractura e inutilizada. */
export function urgencies(b: Body): Urgency[] {
  const list: Urgency[] = [];
  const byVital = [...REGIONS].sort((x, y) => Number(isVital(y)) - Number(isVital(x)));
  for (const r of byVital) if (b.parts[r].bleed === 2) list.push({ region: r, need: 'bleed2' });
  for (const r of byVital) if (b.parts[r].bleed === 1) list.push({ region: r, need: 'bleed1' });
  for (const r of REGIONS) if (b.parts[r].fracture) list.push({ region: r, need: 'fracture' });
  for (const r of REGIONS) if (isDisabled(b, r) && !b.parts[r].operated) list.push({ region: r, need: 'disabled' });
  return list;
}

/** Tratamiento adecuado (el más barato que sirve) para una lesión, de entre los que llevas. */
export function bestTreatment(b: Body, u: Urgency, have: (t: Treatment) => boolean): Treatment | null {
  const prefs: Treatment[] = u.need === 'bleed2' ? ['tourniquet', 'hemostatic'] : u.need === 'bleed1' ? ['bandage', 'tourniquet', 'hemostatic'] : u.need === 'fracture' ? ['splint'] : ['surgery'];
  return prefs.find((t) => have(t) && !treatError(b, t, u.region)) ?? null;
}

// ── Bastión ──

/**
 * Estabilización gratuita al volver (extraer o morir): corta los sangrados, levanta lo inutilizado y deja
 * cada región al menos al 50 %. Quita el límite de las operaciones. Las fracturas siguen hasta tratarlas.
 */
export function stabilize(b: Body): Body {
  const out = cloneBody(b);
  const m = regionMaxes(b.total);
  for (const r of REGIONS) {
    const p = out.parts[r];
    p.bleed = 0; p.residue = 0; p.operated = false;
    p.hp = Math.min(m[r], Math.max(p.hp, Math.ceil(m[r] * ANATOMY.stabilizeTo)));
  }
  return out;
}

/** Lo que se guarda en el perfil (null si está entero y sin fracturas). */
export function toWounds(b: Body): Wounds | null {
  const m = regionMaxes(b.total);
  const pct: Partial<Record<Region, number>> = {};
  for (const r of REGIONS) if (b.parts[r].hp < m[r]) pct[r] = Math.round((b.parts[r].hp / m[r]) * 1000) / 1000;
  const fractures = REGIONS.filter((r) => b.parts[r].fracture);
  return Object.keys(pct).length || fractures.length ? { pct, fractures } : null;
}

/** Cuerpo a partir de lo guardado en el perfil (sin heridas = entero). */
export function fromWounds(w: Wounds | null | undefined, total: number): Body {
  const b = fullBody(total);
  if (!w) return b;
  const m = regionMaxes(b.total);
  for (const r of REGIONS) {
    const pct = w.pct?.[r];
    if (pct !== undefined) b.parts[r].hp = Math.max(1, Math.min(m[r], Math.round(m[r] * pct)));
    b.parts[r].fracture = !!w.fractures?.includes(r);
  }
  return b;
}

/** Precio del tratamiento completo de Hermana Vesper (0 si no hay nada que tratar). */
export function vesperPrice(b: Body): number {
  const missing = REGIONS.reduce((n, r) => n + Math.max(0, regionMaxes(b.total)[r] - b.parts[r].hp), 0);
  const fr = REGIONS.filter((r) => b.parts[r].fracture).length;
  if (!missing && !fr) return 0;
  return Math.ceil(ANATOMY.vesperBase + missing * ANATOMY.vesperPerHp + fr * ANATOMY.vesperPerFracture);
}
