import type { BossMemory } from './combat';
import { baseSupply, needsOf, toSaved, type Needs } from './needs';
import { gridGold, isCoins } from './gold';
import type { Equipment, Grid, ItemStack, Profile } from './types';
import { cloneGrid, gridValue, equippedValue, stackGoldValue } from './inventory';
import { computeStats, applyXp } from './stats';
import { updateQuests } from './quests';
import { addToGrid, emptyEquipment, emptyGrid, LAYOUTS } from './inventory';
import { getItem } from './data/items';
import { SUBZONE_ORDER } from './data/subzones';
import { fromWounds, stabilize, summaryHp, toWounds, type Body, type Region } from './anatomy';

// ════════════════════════════════════════════════════════════════════
// Reglas de extracción:
//  · Entras con lo que llevas equipado y en la mochila.
//  · Si extraes: conservas todo lo que llevas (incluido lo encontrado) y el oro recogido.
//  · Si mueres o se agota el tiempo: pierdes TODO lo que llevabas encima y el oro recogido.
//  · El almacén y el oro del banco nunca están en riesgo.
//  · La experiencia se conserva siempre.
// ════════════════════════════════════════════════════════════════════

export const EXPEDITION_DURATION_MS = 12 * 60 * 1000;
/** Experiencia extra por sobrevivir y extraer. */
export const EXTRACTION_XP = 50;

export interface ExpeditionState {
  startedAt: number;
  durationMs: number;
  backpack: Grid;
  /** Bolsillo seguro durante la expedición (vuelve al perfil pase lo que pase). */
  pocket: Grid;
  equipment: Equipment;
  /** Resumen de la vida: la suma de las regiones de `body` (0 si ha muerto). */
  hp: number;
  /** Anatomía de siete regiones (Fase 4). */
  body: Body;
  /** Saciedad, Hidratación y Descanso (Fase 5). Las expediciones antiguas no tienen: llenas. */
  needs?: Needs;
  /** Pacto de altar activo (Fase 7): uno como máximo, hasta el final de la incursión. */
  pact?: string | null;
  /** Preparación del Refugio con la que bajaste (Fase 9): recorta el consumo de necesidades en esta incursión. */
  prep?: { cot?: boolean | number; dish?: string; dishCut?: number } | null;
  /** Jefes de los que te retiraste (Fase 8): conservan vida, fase y auxiliar gastado hasta el final de la incursión. */
  bosses?: Record<string, BossMemory>;
  /** Cirugía de campo en marcha: región y pulsos que faltan (el equipo ya está reservado). */
  surgery?: { region: Region; left: number } | null;
  mp: number;
  goldFound: number;
  xpGained: number;
  kills: Record<string, number>;
  /** Objetos encontrados durante la expedición (para el resumen). */
  found: ItemStack[];
  /** Valor de lo que el jugador llevaba al entrar (lo que arriesga). */
  riskedValue: number;
  /** Lo que llevabas al bajar (objeto|rareza → unidades, sin monedas) y tus monedas: el resumen enseña solo lo de más. */
  startCounts?: Record<string, number>;
  startGold?: number;
  /** Primera vez en esta subzona (para el resumen). */
  firstVisit?: boolean;
  /** Reputación con Grizk que cambia al volver (traicionar a sus mercenarios, soltar prisioneros) y lo que te dirá. */
  grizkRep?: number;
  grizkNote?: string;
  /** Prisioneros a los que rompiste las cadenas sin que se unieran a ti. */
  released?: string[];
  /** Zona de la expedición. */
  zone?: string;
  /** Subzona de la expedición (las antiguas no la tienen). */
  subzone?: string;
  /** Cofres abiertos por tipo (para misiones). */
  chestsOpened?: Record<string, number>;
  /** Vetas picadas en esta expedición. */
  veinsMined?: number;
  /** Recargas pendientes de tus acciones: pasan de un combate al siguiente (al volver al pueblo, todo listo). */
  cooldowns?: Record<string, number>;
}

export type EndReason = 'extracted' | 'died' | 'timeout';

export interface ExpeditionSummary {
  reason: EndReason;
  durationMs: number;
  goldGained: number;
  goldLost: number;
  xpGained: number;
  levelsGained: number;
  kills: Record<string, number>;
  kept: ItemStack[];
  lost: ItemStack[];
  found: ItemStack[];
  extractedValue: number;
  /** Se entregó automáticamente el equipo de recluta. */
  recruitKit?: boolean;
  /** Qué ha pasado con tu mercenario (contrato gastado, roto, rescate…). */
  mercNote?: string;
  /** Despedida del errante que extrae contigo (y su parte del oro). */
  wandererNote?: string;
  /** Planos aprendidos al volver (bloque 2, fase 4). */
  blueprintsLearned?: string[];
  /** Fin del tutorial (o tutorial repetido). */
  tutorialNote?: string;
  /** Solo lo nuevo que traes (lo que no llevabas al bajar), de mayor a menor rareza. Sin monedas. */
  gained?: ItemStack[];
  /** Valor del botín conseguido: objetos nuevos + oro conseguido. */
  lootValue?: number;
  /** Al morir: lo que salvó el bolsillo seguro. */
  saved?: ItemStack[];
  /** Nivel y experiencia antes de sumar los de esta expedición (para la barra). */
  xpBefore?: { level: number; xp: number };
  subzone?: string;
  firstVisit?: boolean;
}

/** Unidades que llevas de cada objeto y rareza (equipo, mochila y bolsillo), sin monedas ni casillas tapadas. */
export function carriedCounts(eq: Equipment, ...grids: Grid[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of [...Object.values(eq), ...grids.flat()]) {
    if (!s || s.itemId === 'cover' || isCoins(s)) continue;
    const k = `${s.itemId}|${s.rarity ?? ''}`;
    out[k] = (out[k] ?? 0) + s.qty;
  }
  return out;
}

const RARITY_RANK: Record<string, number> = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };

/** Lo que hay de más al salir respecto a lo que llevabas al bajar, de mayor a menor rareza. */
export function gainedItems(start: Record<string, number>, end: Record<string, number>): ItemStack[] {
  const out: ItemStack[] = [];
  for (const [k, n] of Object.entries(end)) {
    const extra = n - (start[k] ?? 0);
    if (extra <= 0) continue;
    const [itemId, rarity] = k.split('|');
    out.push({ uid: `gain-${k}`, itemId, qty: extra, ...(rarity ? { rarity: rarity as ItemStack['rarity'] } : {}) });
  }
  const rank = (s: ItemStack) => RARITY_RANK[s.rarity ?? getItem(s.itemId).rarity] ?? 0;
  return out.sort((a, b) => rank(b) - rank(a) || getItem(a.itemId).name.localeCompare(getItem(b.itemId).name));
}

export function startExpedition(p: Profile, now: number): { profile: Profile; expedition: ExpeditionState } {
  const stats = computeStats(p.character.classId, p.character.level, p.equipment);
  const expedition: ExpeditionState = {
    startedAt: now,
    durationMs: EXPEDITION_DURATION_MS,
    backpack: cloneGrid(p.backpack),
    pocket: cloneGrid(p.pocket),
    equipment: { ...p.equipment },
    hp: 0,
    body: fromWounds(p.wounds, stats.maxHp),
    needs: needsOf(p.needs),
    prep: p.prep ?? null,
    mp: stats.maxMp,
    goldFound: 0,
    xpGained: 0,
    kills: {},
    found: [],
    riskedValue: gridValue(p.backpack) + equippedValue(p.equipment),
    startCounts: carriedCounts(p.equipment, p.backpack, p.pocket),
    startGold: gridGold(p.backpack) + gridGold(p.pocket),
  };
  expedition.hp = summaryHp(expedition.body);
  return {
    profile: { ...p, prep: null, activeExpedition: { startedAt: now }, stats: { ...p.stats, expeditions: p.stats.expeditions + 1 } },
    expedition,
  };
}

export function timeLeft(e: ExpeditionState, now: number): number {
  return Math.max(0, e.startedAt + e.durationMs - now);
}

/** Al morir, el equipo de recluta vuelve contigo (Bloque 1, fase 9): lo puesto sigue puesto. */
function keptRecruitGear(eq: ExpeditionState['equipment']): ExpeditionState['equipment'] {
  const out = emptyEquipment();
  for (const [slot, st] of Object.entries(eq)) if (st && getItem(st.itemId).recruit) (out as Record<string, unknown>)[slot] = st;
  return out;
}
function keptRecruitGrid(g: ExpeditionState['backpack'], size: number): ExpeditionState['backpack'] {
  let out = emptyGrid(size);
  for (const st of g) if (st && st.itemId !== 'cover' && getItem(st.itemId).recruit) out = addToGrid(out, st, LAYOUTS.backpack).grid;
  return out;
}

function carried(e: ExpeditionState): ItemStack[] {
  return [...Object.values(e.equipment), ...e.backpack].filter((s): s is ItemStack => !!s && s.itemId !== 'cover');
}

export function endExpedition(p: Profile, e: ExpeditionState, reason: EndReason, now: number): { profile: Profile; summary: ExpeditionSummary } {
  const extracted = reason === 'extracted';
  const xpGained = e.xpGained + (extracted ? EXTRACTION_XP : 0);
  const xp = applyXp(p.character.level, p.character.xp, xpGained);
  const totalKills = Object.values(e.kills).reduce((a, b) => a + b, 0);
  const extractedValue = extracted ? gridValue(e.backpack) + equippedValue(e.equipment) : 0;
  const quests = updateQuests(p.quests, { extracted, kills: e.kills, extractedValue: extracted ? gridValue(e.backpack) : 0, zone: e.zone, chestsOpened: e.chestsOpened, veinsMined: e.veinsMined ?? 0 });

  const profile0: Profile = {
    ...p,
    character: { ...p.character, level: xp.level, xp: xp.xp },
    backpack: extracted ? cloneGrid(e.backpack) : keptRecruitGrid(e.backpack, p.backpack.length),
    equipment: extracted ? { ...e.equipment } : keptRecruitGear(e.equipment),
    // El bolsillo seguro se conserva siempre, también al morir
    pocket: cloneGrid(e.pocket ?? p.pocket),
    quests,
    activeExpedition: null,
    fallen: !extracted,
    // Estabilización gratuita del Bastión: sin sangrados y cada región al menos al 50 % (las fracturas siguen)
    wounds: e.body ? toWounds(stabilize(e.body)) : p.wounds ?? null,
    // Suministro comunitario: Saciedad e Hidratación vuelven al menos a 60 (el Descanso se recupera en el catre)
    needs: toSaved(baseSupply(needsOf(e.needs ?? p.needs))),
    stats: {
      ...p.stats,
      extractions: p.stats.extractions + (extracted ? 1 : 0),
      deaths: p.stats.deaths + (extracted ? 0 : 1),
      kills: p.stats.kills + totalKills,
    },
  };  // Oro físico: lo que traes son las monedas de tu mochila (y del bolsillo); al morir, las de la mochila se pierden
  const profile = profile0;

  return {
    profile,
    summary: {
      reason,
      durationMs: Math.min(e.durationMs, now - e.startedAt),
      goldLost: extracted ? 0 : gridGold(e.backpack),
      xpGained,
      levelsGained: xp.levelsGained,
      kills: { ...e.kills },
      kept: extracted ? carried(e) : [],
      lost: extracted ? [] : carried(e).filter((x) => !getItem(x.itemId).recruit),
      found: e.found.map((s) => ({ ...s })),
      extractedValue,
      ...lootOf(e, extracted),
      xpBefore: { level: p.character.level, xp: p.character.xp },
      subzone: e.subzone,
      firstVisit: e.firstVisit,
    },
  };
}

/** Botín conseguido (solo lo nuevo), oro conseguido y su valor; al morir, lo que salvó el bolsillo. */
function lootOf(e: ExpeditionState, extracted: boolean): Pick<ExpeditionSummary, 'gained' | 'lootValue' | 'saved' | 'goldGained'> {
  const pocket = e.pocket ?? [];
  if (!extracted) return { gained: [], lootValue: 0, goldGained: gridGold(pocket), saved: pocket.filter((s): s is ItemStack => !!s && s.itemId !== 'cover') };
  // Expediciones empezadas antes de este cambio: sin foto de salida, todo cuenta como antes
  if (!e.startCounts) return { gained: e.found.filter((s) => !isCoins(s)), lootValue: gridValue(e.backpack) + equippedValue(e.equipment), saved: [], goldGained: gridGold(e.backpack) + gridGold(pocket) };
  const gained = gainedItems(e.startCounts, carriedCounts(e.equipment, e.backpack, pocket));
  const goldGained = Math.max(0, gridGold(e.backpack) + gridGold(pocket) - (e.startGold ?? 0));
  const lootValue = Math.round(goldGained + gained.reduce((n, s) => n + stackGoldValue({ ...s, gold: 0 }), 0));
  return { gained, lootValue, saved: [], goldGained };
}

/** Si la página se recargó a mitad de expedición: se anula sin castigo (el equipo de entrada se conserva). */
export function abandonInterruptedExpedition(p: Profile): Profile {
  return { ...p, activeExpedition: null };
}

/** Subzonas ya visitadas. Las partidas antiguas no las guardan: cuentan todas hasta la última a la que se bajó. */
export function visitedSubzones(p: Pick<Profile, 'visitedSubzones' | 'lastSubzone'>): string[] {
  if (p.visitedSubzones) return p.visitedSubzones;
  const i = p.lastSubzone ? SUBZONE_ORDER.indexOf(p.lastSubzone as never) : -1;
  return i >= 0 ? SUBZONE_ORDER.slice(0, i + 1) : [];
}
