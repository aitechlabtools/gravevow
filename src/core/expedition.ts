import type { BossMemory } from './combat';
import { baseSupply, needsOf, toSaved, type Needs } from './needs';
import { gridGold } from './gold';
import type { Equipment, Grid, ItemStack, Profile } from './types';
import { cloneGrid, gridValue, equippedValue } from './inventory';
import { computeStats, applyXp } from './stats';
import { updateQuests } from './quests';
import { addToGrid, emptyEquipment, emptyGrid, LAYOUTS } from './inventory';
import { getItem } from './data/items';
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
      goldGained: extracted ? gridGold(e.backpack) + gridGold(e.pocket ?? []) : gridGold(e.pocket ?? []),
      goldLost: extracted ? 0 : gridGold(e.backpack),
      xpGained,
      levelsGained: xp.levelsGained,
      kills: { ...e.kills },
      kept: extracted ? carried(e) : [],
      lost: extracted ? [] : carried(e).filter((x) => !getItem(x.itemId).recruit),
      found: e.found.map((s) => ({ ...s })),
      extractedValue,
    },
  };
}

/** Si la página se recargó a mitad de expedición: se anula sin castigo (el equipo de entrada se conserva). */
export function abandonInterruptedExpedition(p: Profile): Profile {
  return { ...p, activeExpedition: null };
}
