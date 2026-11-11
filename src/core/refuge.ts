// ════════════════════════════════════════════════════════════════════
// Refugio, desguace y cocina (Fase 9). Lógica pura: sin React ni Phaser.
//  · Módulos: se mejoran al momento con materiales y oro; cada nivel lo construye un mercader que ya esté en el Bastión.
//  · Desguace (taller de Orik): un objeto de equipo se convierte en materiales según tipo, rareza y estado, una sola vez.
//    Nunca rinde (a precio de venta) más de lo que cuesta comprarlo: no hay bucle de comprar, desguazar y vender.
//  · Cocina: la receta se compromete al empezar (los ingredientes se gastan una vez) y se guarda en el perfil; cada paso
//    se elige a la vista de lo que pasa en el fogón. Fallar da el plato estándar; acertar todo devuelve un ingrediente.
//  · Preparación: el catre mejorado y los platos recortan el consumo de necesidades en la siguiente incursión.
// ════════════════════════════════════════════════════════════════════
import type { Grid, ItemStack, Profile } from './types';
import type { Need } from '../config/needs';
import { REFUGE_CFG } from '../config/refuge';
import { MODULES, COOK_EVENTS, DISHES, getDish, dishOfItem, type Heat, type ModuleId, type DishRecipe } from './data/refuge';
import { getItem } from './data/items';
import { addToGrid, anchorIndex, cloneGrid, countItem, isCover, LAYOUTS, removeAt, removeItem } from './inventory';
import { durability, hasDurability, maxDurability } from './durability';
import { RARITY_RULES } from './data/rarity';
import { buyPrice, sellPrice } from './economy';
import { earnGoldSafe, spendGold } from './wallet';
import { vendorUnlocked } from './vendors';
import { VENDORS } from './data/vendors';
import { makeRng, makeUid } from './rng';

export type Result = { ok: true; profile: Profile; note?: string } | { ok: false; error: string };

// ── Estado del Refugio en el perfil ─────────────────────────────────
export interface RefugeState { cot: number; kitchen: number; bench: number; infirmary: number; alchemy: number }
export const EMPTY_REFUGE: RefugeState = { cot: 0, kitchen: 0, bench: 0, infirmary: 0, alchemy: 0 };
export function refugeOf(p: Pick<Profile, 'refuge'>): RefugeState {
  return { ...EMPTY_REFUGE, ...(p.refuge ?? {}) };
}

/** Preparación para la siguiente incursión: catre mejorado y un plato (el último que comiste sustituye al anterior). */
export interface Prep { cot?: boolean; dish?: string }

/** Recorte del consumo de cada necesidad por la preparación (negativo = gastas menos). Las fuentes se suman. */
export function prepMods(prep: Prep | null | undefined): Partial<Record<Need, number>> {
  const out: Partial<Record<Need, number>> = {};
  if (!prep) return out;
  if (prep.cot) out.rest = (out.rest ?? 0) - REFUGE_CFG.prepCut;
  const d = prep.dish ? DISHES.find((x) => x.result === prep.dish) : undefined;
  for (const n of d?.prep ?? []) out[n] = (out[n] ?? 0) - REFUGE_CFG.prepCut;
  return out;
}

/** Texto corto de la preparación (para el panel y el HUD). */
export function prepText(prep: Prep | null | undefined): string[] {
  const t: string[] = [];
  if (prep?.cot) t.push('Bien dormido: −10 % de Descanso');
  if (prep?.dish) t.push(`${getItem(prep.dish).name}: ${(dishOfItem(prep.dish)?.prep ?? []).map((n) => ({ sat: 'Saciedad', hyd: 'Hidratación', rest: 'Descanso' })[n]).join(' e ')} −10 %`);
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
function giveItems(p: Profile, items: { itemId: string; qty: number }[]): Profile {
  return deliver(p, items).profile;
}

// ── Recepción de excedentes ─────────────────────────────────────────
/** Mientras haya excedentes no se baja (nunca se bloquea la llegada ni se borra nada). */
export function receptionBlock(p: Profile): string | null {
  const n = (p.reception ?? []).length;
  return n ? `Tienes ${n} ${n === 1 ? 'objeto' : 'objetos'} en la recepción del Refugio: retíralos, véndelos, desguázalos o descártalos antes de bajar.` : null;
}
function receptionAt(p: Profile, i: number): ItemStack | null {
  return (p.reception ?? [])[i] ?? null;
}
function withoutReception(p: Profile, i: number): Profile {
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
/** Desguazar desde la recepción (Orik): los materiales se entregan como cualquier otra cosa. */
export function receptionScrap(p: Profile, i: number): Result {
  const st = receptionAt(p, i);
  if (!st) return { ok: false, error: 'Ya no está en la recepción.' };
  const y = scrapYield(st, refugeOf(p).bench);
  if (!y) return { ok: false, error: `Orik no saca nada útil de ${getItem(st.itemId).name.toLowerCase()}.` };
  return { ok: true, profile: giveItems(withoutReception(p, i), [y]), note: `${getItem(y.itemId).name} ×${y.qty}` };
}
/** Descartar (se pierde para siempre). */
export function receptionDiscard(p: Profile, i: number): Result {
  if (!receptionAt(p, i)) return { ok: false, error: 'Ya no está en la recepción.' };
  return { ok: true, profile: withoutReception(p, i) };
}

// ── Módulos ─────────────────────────────────────────────────────────
/** null si se puede mejorar; si no, el motivo (se enseña junto al botón). */
export function upgradeBlock(p: Profile, id: ModuleId): string | null {
  const lvl = refugeOf(p)[id];
  const next = MODULES[id].levels[lvl + 1];
  if (!next?.cost) return 'Ya está al máximo.';
  const by = next.cost.by;
  if (!vendorUnlocked(p, by)) return `Lo construye ${VENDORS[by].name}, que aún no ha llegado al Bastión.`;
  if (p.gold < next.cost.gold) return `Oro insuficiente: necesitas ${next.cost.gold}.`;
  for (const m of next.cost.items) if (ownedQty(p, m.itemId) < m.qty) return `Te falta ${getItem(m.itemId).name.toLowerCase()} (${ownedQty(p, m.itemId)}/${m.qty}).`;
  return null;
}

export function upgradeModule(p: Profile, id: ModuleId): Result {
  const block = upgradeBlock(p, id);
  if (block) return { ok: false, error: block };
  const ref = refugeOf(p);
  const next = MODULES[id].levels[ref[id] + 1];
  const taken = takeItems(p, next.cost!.items);
  if (!taken) return { ok: false, error: 'Te faltan materiales.' };
  const paid = spendGold(taken, next.cost!.gold);
  if (!paid.ok) return paid;
  return { ok: true, profile: { ...paid.profile, refuge: { ...ref, [id]: ref[id] + 1 } }, note: `${next.name}: ${next.effect}` };
}

/** Dormir en el catre: Descanso a 100 y, con el catre mejorado, preparación de Descanso. */
export function canSleepForPrep(p: Profile): boolean {
  return refugeOf(p).cot >= 1 && !p.prep?.cot;
}

// ── Desguace ────────────────────────────────────────────────────────
const ARCANE_FAMILIES = ['staff', 'tome', 'wand', 'orb'];
const JEWEL_SLOTS = ['ring', 'amulet'];

/** Material que sale de un objeto según su tipo. null: no se desguaza. */
export function scrapMaterial(itemId: string): string | null {
  const def = getItem(itemId);
  if (!def.slot) return null;
  if (ARCANE_FAMILIES.includes(def.family ?? '') || JEWEL_SLOTS.includes(def.slot)) return 'arcane_shard';
  const armorPiece = ['helmet', 'armor', 'gloves', 'boots'].includes(def.slot);
  if (armorPiece && !(def.classes ?? []).includes('warrior')) return 'leather_scrap';
  return 'scrap_metal';
}

/** Lo que rinde desguazar este ejemplar (con o sin banco). null si no se puede. */
export function scrapYield(stack: ItemStack, bench = 0): { itemId: string; qty: number } | null {
  if (isCover(stack) || (stack.gold ?? 0) > 0) return null;
  const mat = scrapMaterial(stack.itemId);
  if (!mat) return null;
  const def = getItem(stack.itemId);
  const cond = hasDurability(def) ? REFUGE_CFG.scrapBrokenFloor + (1 - REFUGE_CFG.scrapBrokenFloor) * (durability(stack) / Math.max(1, maxDurability(stack))) : 1;
  const rk = stack.rarity ? RARITY_RULES[stack.rarity].statMult / RARITY_RULES[def.rarity].statMult : 1;
  const raw = def.value * REFUGE_CFG.scrapPerValue * rk * cond * (1 + (bench >= 1 ? REFUGE_CFG.benchBonus : 0));
  // Tope: lo desguazado, a precio de venta, nunca supera el 80 % de lo que cuesta comprar el objeto
  const cap = Math.floor((buyPrice(stack.itemId) * REFUGE_CFG.scrapMaxOfBuy) / sellPrice(mat));
  const qty = Math.max(1, Math.min(cap, Math.floor(raw)));
  return { itemId: mat, qty: qty * stack.qty };
}

/** Desguaza el objeto de esa casilla de la mochila o del almacén: se destruye una vez y entrega sus materiales. */
export function scrap(p: Profile, container: 'backpack' | 'stash', index: number): Result {
  const grid: Grid = p[container];
  const a = anchorIndex(grid, index);
  const st = a >= 0 ? grid[a] : null;
  if (!st || isCover(st)) return { ok: false, error: 'No hay nada que desguazar ahí.' };
  const y = scrapYield(st, refugeOf(p).bench);
  if (!y) return { ok: false, error: `Orik no saca nada útil de ${getItem(st.itemId).name.toLowerCase()}.` };
  const removed = cloneGrid(grid);
  removeAt(removed, a);
  const d = deliver({ ...p, [container]: removed }, [y]);
  return { ok: true, profile: d.profile, note: `${getItem(y.itemId).name} ×${y.qty}${d.toReception ? '.' + RECEPTION_NOTE : ''}` };
}

// ── Cocina ──────────────────────────────────────────────────────────
/** Receta en el fogón: ingredientes ya gastados; los sucesos de cada paso se fijan al empezar (recargar no los cambia). */
export interface CookingJob { recipe: string; events: number[]; picks: Heat[] }

export function knownDishes(p: Profile): DishRecipe[] {
  const k = refugeOf(p).kitchen;
  return DISHES.filter((d) => d.kitchen <= k);
}

export function cookBlock(p: Profile, recipeId: string, qty = 1): string | null {
  const d = getDish(recipeId);
  if (refugeOf(p).kitchen < d.kitchen) return 'Tu cocina aún no tiene lo necesario para esta receta.';
  if (p.cooking) return 'Ya tienes algo en el fogón.';
  for (const m of d.ingredients) if (ownedQty(p, m.itemId) < m.qty * qty) return `Te falta ${getItem(m.itemId).name.toLowerCase()} (${ownedQty(p, m.itemId)}/${m.qty * qty}).`;
  return null;
}

/** Empieza a cocinar (minijuego): se gastan los ingredientes y se fijan los sucesos de los pasos. */
export function startCooking(p: Profile, recipeId: string, seed: number): Result {
  const block = cookBlock(p, recipeId);
  if (block) return { ok: false, error: block };
  const d = getDish(recipeId);
  const taken = takeItems(p, d.ingredients);
  if (!taken) return { ok: false, error: 'Te faltan ingredientes.' };
  const rng = makeRng(seed);
  const events: number[] = [];
  for (let i = 0; i < d.steps; i++) events.push(Math.floor(rng.next() * COOK_EVENTS.length));
  return { ok: true, profile: { ...taken, cooking: { recipe: recipeId, events, picks: [] } } };
}

/** Elige el fuego del paso actual. Al terminar el último paso, entrega el plato (una sola vez) y libera el fogón. */
export function cookStep(p: Profile, heat: Heat): Result & { done?: boolean; perfect?: boolean } {
  const job = p.cooking;
  if (!job) return { ok: false, error: 'No hay nada en el fogón.' };
  const d = getDish(job.recipe);
  const picks = [...job.picks, heat];
  if (picks.length < d.steps) return { ok: true, profile: { ...p, cooking: { ...job, picks } } };
  const perfect = picks.every((h, i) => COOK_EVENTS[job.events[i]].heat === h);
  const out = [{ itemId: d.result, qty: 1 }];
  if (perfect && REFUGE_CFG.perfectRefund) out.push({ itemId: cheapestIngredient(d), qty: 1 });
  const dl = deliver({ ...p, cooking: null }, out);
  const given = dl.profile;
  const cooked = [...new Set([...(p.cooked ?? []), d.id])];
  return { ok: true, done: true, perfect, profile: { ...given, cooked }, note: (perfect ? `${getItem(d.result).name}, esmerado. Te queda de más: ${getItem(cheapestIngredient(d)).name.toLowerCase()}.` : `${getItem(d.result).name}.`) + (dl.toReception ? RECEPTION_NOTE : '') };
}
export function cheapestIngredient(d: { ingredients: { itemId: string; qty: number }[] }): string {
  return [...d.ingredients].sort((a, b) => getItem(a.itemId).value - getItem(b.itemId).value)[0].itemId;
}

/** Producción normal (sin minijuego, calidad estándar, por lotes): solo después de haberla cocinado una vez. */
export function cookBatch(p: Profile, recipeId: string, qty: number): Result {
  const d = getDish(recipeId);
  if (!(p.cooked ?? []).includes(d.id)) return { ok: false, error: 'Primero cocínala una vez en el fogón.' };
  const n = Math.max(1, Math.min(REFUGE_CFG.maxBatch, Math.floor(qty)));
  const block = cookBlock(p, recipeId, n);
  if (block) return { ok: false, error: block };
  const taken = takeItems(p, d.ingredients.map((m) => ({ itemId: m.itemId, qty: m.qty * n })));
  if (!taken) return { ok: false, error: 'Te faltan ingredientes.' };
  const dl = deliver(taken, [{ itemId: d.result, qty: n }]);
  return { ok: true, profile: dl.profile, note: `${getItem(d.result).name} ×${n}.${dl.toReception ? RECEPTION_NOTE : ''}` };
}
