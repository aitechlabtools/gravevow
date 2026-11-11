import { spendGold, scaleCost } from './wallet';
// Lógica de la forja: comprobar requisitos, gastar materiales y oro, y tirar la calidad.
import type { Profile, Stats } from './types';
import { RECIPES, QUALITIES, ENSURE_MATERIAL_MULT, type Recipe } from './data/forge';
import { addToGrid, countItem, LAYOUTS, removeItem } from './inventory';
import { rankOf } from '../config/reputation';
import type { Rng } from './rng';
import { makeUid } from './rng';

export function recipe(id: string): Recipe {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) throw new Error(`Receta desconocida: ${id}`);
  return r;
}

export function materialsFor(r: Recipe, ensure: boolean): { itemId: string; qty: number }[] {
  return r.materials.map((m) => ({ itemId: m.itemId, qty: ensure ? Math.ceil(m.qty * ENSURE_MATERIAL_MULT) : m.qty }));
}

export function owned(p: Profile, itemId: string): number {
  return countItem(p.backpack, itemId) + countItem(p.stash, itemId);
}

/** null si se puede forjar; si no, el motivo. */
export function forgeBlock(p: Profile, r: Recipe, ensure: boolean): string | null {
  if (rankOf(p.reputation.brand ?? 0) < r.rank) return 'Maese Brand aún no te enseña esta receta.';
  if (p.gold < forgeCost(r)) return `Oro insuficiente: necesitas ${forgeCost(r)}.`;
  for (const m of materialsFor(r, ensure)) if (owned(p, m.itemId) < m.qty) return 'Te faltan materiales.';
  return null;
}

export function forge(p: Profile, recipeId: string, ensure: boolean, rng: Rng): { ok: true; profile: Profile; quality: number } | { ok: false; error: string } {
  const r = recipe(recipeId);
  const block = forgeBlock(p, r, ensure);
  if (block) return { ok: false, error: block };
  let { backpack, stash } = p;
  for (const m of materialsFor(r, ensure)) {
    let left = m.qty;
    const fromB = Math.min(left, countItem(backpack, m.itemId));
    if (fromB) { backpack = removeItem(backpack, m.itemId, fromB) ?? backpack; left -= fromB; }
    if (left) stash = removeItem(stash, m.itemId, left) ?? stash;
  }
  // Tirada de calidad
  const weights = QUALITIES.map((q) => (ensure ? q.ensuredWeight : q.weight));
  let roll = rng.next() * weights.reduce((a, b) => a + b, 0);
  let quality = 0;
  for (let i = 0; i < weights.length; i++) { roll -= weights[i]; if (roll < 0) { quality = i; break; } }
  const stack = { uid: makeUid(), itemId: r.result, qty: 1, quality, forgedBy: p.character.name };
  const intoBack = addToGrid(backpack, stack, LAYOUTS.backpack);
  if (!intoBack.leftover) backpack = intoBack.grid;
  else {
    const intoStash = addToGrid(stash, stack, LAYOUTS.stash);
    if (intoStash.leftover) return { ok: false, error: 'No tienes sitio en la mochila ni en el almacén.' };
    stash = intoStash.grid;
  }
  const paid = spendGold({ ...p, backpack, stash }, forgeCost(r));
  if (!paid.ok) return paid;
  return { ok: true, profile: paid.profile, quality };
}

/** Estadísticas de un objeto con su calidad de forja aplicada. */
export function qualityStats(stats: Partial<Stats> | undefined, quality?: number): Partial<Stats> {
  if (!stats || !quality) return stats ?? {};
  const b = 1 + (QUALITIES[quality]?.bonus ?? 0);
  const out: Partial<Stats> = {};
  for (const [k, v] of Object.entries(stats)) out[k as keyof Stats] = v! > 0 ? Math.round(v! * b) : v;
  return out;
}

/** Lo que cobra Brand por forjar (en la escala de monedas). */
export function forgeCost(r: { gold: number }): number { return scaleCost(r.gold); }
