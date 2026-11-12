// ════════════════════════════════════════════════════════════════════
// Bloque 2, fase 5: desguace en el taller de Orik. Lógica pura (cifras en config/salvage.ts).
//  · Seguro: material base según el tipo (chatarra, retales o esquirla arcana).
//    Las recetas simples (una sola materia prima) no tienen parte segura: fabricar y desguazar siempre pierde.
//  · Posible: cada componente de su receta, unidad a unidad, con probabilidad según la rareza.
//  · No se desguaza el equipo de recluta, lo equipado (no está en la mochila ni en el almacén) ni lo que no es equipo.
// ════════════════════════════════════════════════════════════════════
import type { Grid, ItemStack, Profile } from './types';
import { getItem } from './data/items';
import { stackRarity, RARITY_ORDER } from './data/rarity';
import { CRAFT_RECIPES } from './data/crafting';
import { anchorIndex, cloneGrid, isCover, removeAt } from './inventory';
import { durability, hasDurability } from './durability';
import { deliver, giveItems, receptionAt, refugeOf, withoutReception, RECEPTION_NOTE, type Result } from './refuge';
import { makeRng } from './rng';
import { SALVAGE_CFG } from '../config/salvage';
import { STATION_FX } from '../config/stations';

const ARCANE_FAMILIES = ['staff', 'tome', 'wand', 'orb'];
const JEWEL_SLOTS = ['ring', 'amulet'];

/** Material base que sale de un objeto según su tipo. null: no es equipo. */
export function scrapMaterial(itemId: string): string | null {
  const def = getItem(itemId);
  if (!def.slot) return null;
  if (ARCANE_FAMILIES.includes(def.family ?? '') || JEWEL_SLOTS.includes(def.slot)) return 'arcane_shard';
  const armorPiece = ['helmet', 'armor', 'gloves', 'boots'].includes(def.slot);
  if (armorPiece && !(def.classes ?? []).includes('warrior')) return 'leather_scrap';
  return 'scrap_metal';
}

const recipeOf = (itemId: string) => CRAFT_RECIPES.find((r) => r.result === itemId);
const made = new Set(CRAFT_RECIPES.map((r) => r.result));
/** Receta simple: una sola materia prima (apartado 6). Al desguazarla no hay parte segura. */
export function isSimpleRecipe(itemId: string): boolean {
  const r = recipeOf(itemId);
  return !!r && r.ingredients.length === 1 && !made.has(r.ingredients[0].itemId);
}

export interface SalvageInfo {
  safe: { itemId: string; qty: number }[];
  possible: { itemId: string; qty: number; chance: number }[];
  broken: boolean;
}

/** Por qué no se puede desguazar (null si se puede). */
export function salvageBlock(stack: ItemStack): string | null {
  const def = getItem(stack.itemId);
  if (def.recruit) return 'Es equipo de recluta: el Bastión te lo presta, no se desguaza.';
  if (isCover(stack) || (stack.gold ?? 0) > 0 || !scrapMaterial(stack.itemId)) return `Orik no saca nada útil de ${def.name.toLowerCase()}.`;
  return null;
}

/** Lo que puede dar este ejemplar: la parte segura y la posible (con su probabilidad). null si no se desguaza. */
export function salvageInfo(stack: ItemStack, bench = 0): SalvageInfo | null {
  if (salvageBlock(stack)) return null;
  const def = getItem(stack.itemId);
  const mat = scrapMaterial(stack.itemId)!;
  const r = recipeOf(stack.itemId);
  const n = Math.max(1, stack.qty);
  const broken = hasDurability(def) && durability(stack) <= 0;
  const compValue = r ? r.ingredients.reduce((s, m) => s + getItem(m.itemId).value * m.qty, 0) / r.qty : def.value * 0.7;
  // Al menos 1 si no se pasa de mucho (el redondeo no puede convertir el desguace en un bucle)
  const share = (compValue * SALVAGE_CFG.safeShare) / getItem(mat).value;
  const safeQty = Math.floor(share) || (share >= SALVAGE_CFG.minSafeShare ? 1 : 0);
  const safe = isSimpleRecipe(stack.itemId) || !safeQty ? [] : [{ itemId: mat, qty: safeQty * n }];
  const base = SALVAGE_CFG.chance[stackRarity(stack, def)] * (1 + (STATION_FX.benchBonus[Math.min(3, Math.max(0, bench))] ?? 0)) * (broken ? SALVAGE_CFG.brokenMult : 1);
  const chance = Math.min(SALVAGE_CFG.maxChance, Math.round(base * 100) / 100);
  const possible = (r?.ingredients ?? []).map((m) => ({ itemId: m.itemId, qty: m.qty * n, chance }));
  return { safe, possible, broken };
}

/** Pide confirmación: raro o mejor. */
export function needsConfirm(stack: ItemStack): boolean {
  return RARITY_ORDER.indexOf(stackRarity(stack, getItem(stack.itemId))) >= RARITY_ORDER.indexOf(SALVAGE_CFG.confirmFrom);
}

/** Tira los dados de un desguace: lo seguro siempre; lo posible, unidad a unidad. */
export function rollSalvage(info: SalvageInfo, seed: number): { itemId: string; qty: number }[] {
  const rng = makeRng(seed);
  const out = info.safe.map((s) => ({ ...s }));
  for (const m of info.possible) {
    let got = 0;
    for (let i = 0; i < m.qty; i++) if (rng.chance(m.chance)) got++;
    if (got) out.push({ itemId: m.itemId, qty: got });
  }
  return out;
}

/** Suma listas de materiales por objeto. */
export function sumItems(lists: { itemId: string; qty: number }[][]): { itemId: string; qty: number }[] {
  const m = new Map<string, number>();
  for (const l of lists) for (const x of l) m.set(x.itemId, (m.get(x.itemId) ?? 0) + x.qty);
  return [...m].map(([itemId, qty]) => ({ itemId, qty }));
}

export type SalvageRef = { container: 'backpack' | 'stash'; index: number };

/** Desguaza varios objetos a la vez (mochila o almacén). Se destruyen una sola vez y se entrega lo obtenido. */
export function salvage(p: Profile, refs: SalvageRef[], seed: number): Result & { got?: { itemId: string; qty: number }[] } {
  const bench = refugeOf(p).bench;
  const grids: Record<'backpack' | 'stash', Grid> = { backpack: cloneGrid(p.backpack), stash: cloneGrid(p.stash) };
  const seen = new Set<string>();
  const lists: { itemId: string; qty: number }[][] = [];
  let k = 0;
  for (const ref of refs) {
    const g = grids[ref.container];
    const a = anchorIndex(g, ref.index);
    const st = a >= 0 ? g[a] : null;
    if (!st || isCover(st) || seen.has(`${ref.container}-${a}`)) continue;
    const block = salvageBlock(st);
    if (block) return { ok: false, error: block };
    seen.add(`${ref.container}-${a}`);
    lists.push(rollSalvage(salvageInfo(st, bench)!, (seed + k++ * 7919) >>> 0));
    removeAt(g, a);
  }
  if (!lists.length) return { ok: false, error: 'No hay nada que desguazar ahí.' };
  const got = sumItems(lists);
  const d = deliver({ ...p, backpack: grids.backpack, stash: grids.stash }, got);
  return { ok: true, profile: d.profile, got, note: `${salvageNote(got)}${d.toReception ? '.' + RECEPTION_NOTE : ''}` };
}

/** Desguazar desde la recepción. */
export function receptionSalvage(p: Profile, i: number, seed: number): Result {
  const st = receptionAt(p, i);
  if (!st) return { ok: false, error: 'Ya no está en la recepción.' };
  const block = salvageBlock(st);
  if (block) return { ok: false, error: block };
  const got = rollSalvage(salvageInfo(st, refugeOf(p).bench)!, seed);
  return { ok: true, profile: giveItems(withoutReception(p, i), got), note: salvageNote(got) };
}

export function salvageNote(got: { itemId: string; qty: number }[]): string {
  return got.length ? got.map((g) => `${getItem(g.itemId).name} ×${g.qty}`).join(', ') : 'nada aprovechable esta vez';
}
