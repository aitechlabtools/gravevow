// ════════════════════════════════════════════════════════════════════
// Refugio, desguace y cocina (Fase 9). Lógica pura: sin React ni Phaser.
//  · Estaciones: 3 niveles; las construye y mejora su encargado al momento, con materiales y oro (config/stations.ts).
//  · El desguace (taller de Orik) está en core/salvage.ts.
//  · Cocina: los platos se cocinan con el menú de crafteo común (core/crafting.ts); aquí solo se comen y preparan.
//  · Preparación: el catre mejorado y los platos recortan el consumo de necesidades en la siguiente incursión.
// ════════════════════════════════════════════════════════════════════
import type { ItemStack, Profile } from './types';
import type { Need } from '../config/needs';
import { REFUGE_CFG } from '../config/refuge';
import { MODULES, MODULE_ORDER, DISHES, dishOfItem, type ModuleId } from './data/refuge';
import { getItem } from './data/items';
import { addToGrid, countItem, LAYOUTS, removeItem } from './inventory';
import { sellPrice } from './economy';
import { earnGoldSafe, spendGold } from './wallet';
import { VENDORS, type VendorId } from './data/vendors';
import { STATION_FX } from '../config/stations';
import { CRAFT_CFG } from '../config/crafting';
import { makeUid } from './rng';
import { subzoneLock } from './data/zones';
import { getSubzone } from './data/subzones';

export type Result = { ok: true; profile: Profile; note?: string } | { ok: false; error: string };

// ── Estado del Refugio en el perfil ─────────────────────────────────
/** Nivel de cada estación (0 = bloqueada, 1 a 3). `v: 2` = formato de la parte 2.1 (catre desde nivel 1). */
export interface RefugeState { cot: number; kitchen: number; bench: number; infirmary: number; forge: number; alchemy: number; runic: number; v?: 2 }
export const EMPTY_REFUGE: RefugeState = { cot: 1, kitchen: 0, bench: 0, infirmary: 0, forge: 0, alchemy: 0, runic: 0, v: 2 };
/** Estado con migración: en el formato antiguo el catre empezaba en 0 (paja) y el jergón era el 1; ahora son 1 y 2.
 *  Lo demás conserva su nivel (el antiguo nivel 1 es el desbloqueo, el 2 de la cocina es su primera mejora). */
export function refugeOf(p: Pick<Profile, 'refuge'>): RefugeState {
  const raw = (p.refuge ?? {}) as Partial<RefugeState>;
  const out: RefugeState = { ...EMPTY_REFUGE, ...raw, v: 2 };
  if (p.refuge && raw.v !== 2) out.cot = Math.min(3, (raw.cot ?? 0) + 1);
  for (const k of MODULE_ORDER) out[k] = Math.max(0, Math.min(3, Math.floor(out[k] ?? 0)));
  out.cot = Math.max(1, out.cot);
  return out;
}

/** Preparación para la siguiente incursión: catre mejorado y un plato (el último que comiste sustituye al anterior).
 *  `cot` y `dishCut` guardan el recorte según el nivel de la estación (true = 10 %, de partidas antiguas). */
export interface Prep { cot?: boolean | number; dish?: string; dishCut?: number }

const cotCut = (prep: Prep) => (typeof prep.cot === 'number' ? prep.cot : prep.cot ? REFUGE_CFG.prepCut : 0);
const dishCut = (prep: Prep) => prep.dishCut ?? REFUGE_CFG.prepCut;

/** Recorte del consumo de cada necesidad por la preparación (negativo = gastas menos). Las fuentes se suman. */
export function prepMods(prep: Prep | null | undefined): Partial<Record<Need, number>> {
  const out: Partial<Record<Need, number>> = {};
  if (!prep) return out;
  if (cotCut(prep)) out.rest = (out.rest ?? 0) - cotCut(prep);
  const d = prep.dish ? DISHES.find((x) => x.result === prep.dish) : undefined;
  for (const n of d?.prep ?? []) out[n] = (out[n] ?? 0) - dishCut(prep);
  return out;
}

/** Texto corto de la preparación (para el panel y el HUD). */
export function prepText(prep: Prep | null | undefined): string[] {
  const t: string[] = [];
  if (prep && cotCut(prep)) t.push(`Bien dormido: −${Math.round(cotCut(prep) * 100)} % de Descanso`);
  if (prep?.dish) t.push(`${getItem(prep.dish).name}: ${(dishOfItem(prep.dish)?.prep ?? []).map((n) => ({ sat: 'Saciedad', hyd: 'Hidratación', rest: 'Descanso' })[n]).join(' e ')} −${Math.round(dishCut(prep) * 100)} %`);
  return t;
}

// ── Materiales: de la mochila primero y después del almacén ─────────
export function ownedQty(p: Profile, itemId: string): number {
  return countItem(p.backpack, itemId) + countItem(p.stash, itemId);
}
export function takeItems(p: Profile, items: { itemId: string; qty: number }[]): Profile | null {
  let { backpack, stash } = p;
  for (const m of items) {
    if (countItem(backpack, m.itemId) + countItem(stash, m.itemId) < m.qty) return null;
    let left = m.qty;
    const fromB = Math.min(left, countItem(backpack, m.itemId));
    if (fromB) { backpack = removeItem(backpack, m.itemId, fromB) ?? backpack; left -= fromB; }
    if (left) { const s2 = removeItem(stash, m.itemId, left); if (!s2) return null; stash = s2; }
  }
  return { ...p, backpack, stash };
}
/** Entrega objetos: a la mochila, si no caben al almacén y, si tampoco, a la recepción. Nunca se pierde nada. */
export function deliver(p: Profile, items: { itemId: string; qty: number; quality?: number; forgedBy?: string }[]): { profile: Profile; toReception: boolean } {
  let { backpack, stash } = p;
  const reception = [...(p.reception ?? [])];
  for (const m of items) {
    if (m.qty <= 0) continue;
    const st: ItemStack = { uid: makeUid(), itemId: m.itemId, qty: m.qty, ...(m.quality !== undefined ? { quality: m.quality } : {}), ...(m.forgedBy ? { forgedBy: m.forgedBy } : {}) };
    const a = addToGrid(backpack, st, LAYOUTS.backpack);
    backpack = a.grid;
    if (!a.leftover) continue;
    const b = addToGrid(stash, a.leftover, LAYOUTS.stash);
    stash = b.grid;
    if (b.leftover) reception.push(b.leftover);
  }
  const toReception = reception.length > (p.reception ?? []).length;
  return { profile: { ...p, backpack, stash, reception }, toReception };
}
export const RECEPTION_NOTE = ' No cabía: está en la recepción del Refugio.';
export function giveItems(p: Profile, items: { itemId: string; qty: number }[]): Profile {
  return deliver(p, items).profile;
}

// ── Recepción de excedentes ─────────────────────────────────────────
/** Mientras haya excedentes no se baja (nunca se bloquea la llegada ni se borra nada). */
export function receptionBlock(p: Profile): string | null {
  const n = (p.reception ?? []).length;
  return n ? `Tienes ${n} ${n === 1 ? 'objeto' : 'objetos'} en la recepción del Refugio: retíralos, véndelos, desguázalos o descártalos antes de bajar.` : null;
}
export function receptionAt(p: Profile, i: number): ItemStack | null {
  return (p.reception ?? [])[i] ?? null;
}
export function withoutReception(p: Profile, i: number): Profile {
  return { ...p, reception: (p.reception ?? []).filter((_, k) => k !== i) };
}
/** Retirar a la mochila o al almacén (si cabe entero). */
export function receptionWithdraw(p: Profile, i: number): Result {
  const st = receptionAt(p, i);
  if (!st) return { ok: false, error: 'Ya no está en la recepción.' };
  const a = addToGrid(p.backpack, st, LAYOUTS.backpack);
  if (!a.leftover) return { ok: true, profile: { ...withoutReception(p, i), backpack: a.grid }, note: 'a la mochila' };
  const b = addToGrid(p.stash, st, LAYOUTS.stash);
  if (!b.leftover) return { ok: true, profile: { ...withoutReception(p, i), stash: b.grid }, note: 'al almacén' };
  return { ok: false, error: 'No cabe ni en la mochila ni en el almacén: haz hueco, véndelo o desguázalo.' };
}
/** Vender directamente desde la recepción (a Nira, a su precio de venta). */
export function receptionSell(p: Profile, i: number): Result {
  const st = receptionAt(p, i);
  if (!st) return { ok: false, error: 'Ya no está en la recepción.' };
  const gold = sellPrice(st.itemId, st) * st.qty;
  return { ok: true, profile: earnGoldSafe(withoutReception(p, i), gold), note: `${gold} oro` };
}
/** Descartar (se pierde para siempre). */
export function receptionDiscard(p: Profile, i: number): Result {
  if (!receptionAt(p, i)) return { ok: false, error: 'Ya no está en la recepción.' };
  return { ok: true, profile: withoutReception(p, i) };
}

// ── Estaciones ──────────────────────────────────────────────────────
/** Coste del siguiente nivel (null si está al máximo). */
export function nextCost(p: Profile, id: ModuleId) {
  return MODULES[id].levels[refugeOf(p)[id] + 1]?.cost ?? null;
}
/** Lo que falta para el siguiente nivel (vacío = se puede pedir ya). */
export function missingFor(p: Profile, id: ModuleId): { itemId: string; have: number; need: number }[] {
  const cost = nextCost(p, id);
  return (cost?.items ?? []).map((m) => ({ itemId: m.itemId, have: ownedQty(p, m.itemId), need: m.qty })).filter((m) => m.have < m.need);
}
/** null si se puede construir o mejorar; si no, el motivo (se enseña junto al botón). */
export function upgradeBlock(p: Profile, id: ModuleId): string | null {
  const cost = nextCost(p, id);
  if (!cost) return 'Está al máximo.';
  const miss = missingFor(p, id)[0];
  if (miss) return `Te falta ${getItem(miss.itemId).name.toLowerCase()} (${miss.have}/${miss.need}).`;
  if (p.gold < cost.gold) return `Oro insuficiente: necesitas ${cost.gold}.`;
  return null;
}
/**
 * Estaciones que se ven en el Refugio: el Catre siempre; las demás, cuando ya están construidas o cuando el personaje
 * ha abierto la subzona en la que llega su encargado (`unlockAt` de data/vendors.ts). Hasta entonces, ni se ven ni avisan.
 */
export function stationVisible(p: Profile, id: ModuleId): boolean {
  if (id === 'cot' || refugeOf(p)[id] >= 1) return true;
  const at = VENDORS[MODULES[id].by].unlockAt;
  return !at || !subzoneLock(getSubzone(at), p.character.level, p.bossesDefeated ?? []);
}
export function visibleStations(p: Profile): ModuleId[] {
  return MODULE_ORDER.filter((id) => stationVisible(p, id));
}
/** Estaciones que se pueden construir o mejorar ya con lo que tienes (para los avisos). Solo las que se ven. */
export function readyStations(p: Profile, by?: VendorId): ModuleId[] {
  return MODULE_ORDER.filter((id) => (!by || MODULES[id].by === by) && stationVisible(p, id) && !upgradeBlock(p, id));
}

/** Pedir al encargado que construya (nivel 1) o mejore la estación: cobra materiales y oro y la deja lista al momento. */
export function upgradeModule(p: Profile, id: ModuleId): Result {
  const block = upgradeBlock(p, id);
  if (block) return { ok: false, error: block };
  const ref = refugeOf(p);
  const lvl = ref[id] + 1;
  const cost = nextCost(p, id)!;
  const taken = takeItems(p, cost.items);
  if (!taken) return { ok: false, error: 'Te faltan materiales.' };
  const paid = spendGold(taken, cost.gold);
  if (!paid.ok) return paid;
  const m = MODULES[id];
  return { ok: true, profile: { ...paid.profile, refuge: { ...ref, [id]: lvl } }, note: `${VENDORS[m.by].name}: ${m.lines[lvl - 1]}` };
}

/** Lote máximo de la estación según su nivel (5, 10 o 20). */
export function stationBatch(p: Pick<Profile, 'refuge'>, id: ModuleId): number {
  return Math.max(1, CRAFT_CFG.batch[refugeOf(p)[id]] ?? 1);
}

/** Dormir en el catre: con el catre mejorado (nivel 2 o 3), además, preparación de Descanso. */
export function cotPrepCut(p: Profile): number {
  return STATION_FX.cotPrep[refugeOf(p).cot] ?? 0;
}
export function canSleepForPrep(p: Profile): boolean {
  return cotPrepCut(p) > 0 && cotCut(p.prep ?? {}) < cotPrepCut(p);
}
