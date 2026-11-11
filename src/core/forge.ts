import { scaleCost } from './wallet';
// Recetas de la forja: requisitos, coste y lo que la calidad añade. El trabajo en el yunque está en workshop.ts.
import type { Profile, Stats } from './types';
import { RECIPES, QUALITIES, type Recipe } from './data/forge';
import { countItem } from './inventory';
import { rankOf } from '../config/reputation';

export function recipe(id: string): Recipe {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) throw new Error(`Receta desconocida: ${id}`);
  return r;
}

export function materialsFor(r: Recipe): { itemId: string; qty: number }[] {
  return r.materials.map((m) => ({ ...m }));
}

export function owned(p: Profile, itemId: string): number {
  return countItem(p.backpack, itemId) + countItem(p.stash, itemId);
}

/** null si se puede forjar; si no, el motivo. */
export function forgeBlock(p: Profile, r: Recipe): string | null {
  if (rankOf(p.reputation.brand ?? 0) < r.rank) return 'Maese Brand aún no te enseña esta receta.';
  if (p.gold < forgeCost(r)) return `Oro insuficiente: necesitas ${forgeCost(r)}.`;
  for (const m of materialsFor(r)) if (owned(p, m.itemId) < m.qty) return 'Te faltan materiales.';
  return null;
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
