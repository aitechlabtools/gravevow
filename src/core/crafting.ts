// ════════════════════════════════════════════════════════════════════
// Crafteo común (bloque 2): receta → comprobar → tomar componentes → objeto. Lógica pura, sin minijuegos.
//  · Los componentes se toman primero del almacén y luego de la mochila (nunca de lo equipado ni del bolsillo).
//  · No se cobra oro: el coste es el material.
//  · El equipo puede salir con una rareza más («acabado fino») según el nivel del espacio y el material fino.
//  · `craft` devuelve el perfil sin los componentes y lo fabricado; `storeCrafted` lo coloca en la mochila o el almacén
//    (si no cabe, al almacén y, si tampoco, a la recepción). Nada se pierde.
// ════════════════════════════════════════════════════════════════════
import type { ItemStack, Profile, Rarity } from './types';
import { CRAFT_RECIPES, type CraftRecipe, type CraftStation } from './data/crafting';
import { getItem } from './data/items';
import { RARITY_ORDER, rollAffixes } from './data/rarity';
import { addToGrid, countItem, removeItem, LAYOUTS } from './inventory';
import { refugeOf, deliver, type Result } from './refuge';
import { makeRng, makeUid } from './rng';
import { DISHES } from './data/refuge';
import { getAlchemy } from './data/workshop';
import { jobResult } from './workshop';
import { CRAFT_CFG } from '../config/crafting';

export const STATION_NAMES: Record<CraftStation, string> = {
  kitchen: 'Cocina', bench: 'Banco de trabajo', infirmary: 'Rincón de cura', forge: 'Forja', alchemy: 'Mesa de alquimia',
};

export function getRecipe(id: string): CraftRecipe {
  const r = CRAFT_RECIPES.find((x) => x.id === id);
  if (!r) throw new Error(`Receta desconocida: ${id}`);
  return r;
}
export function recipeFor(itemId: string): CraftRecipe | undefined {
  return CRAFT_RECIPES.find((r) => r.result === itemId);
}
export function stationRecipes(st: CraftStation): CraftRecipe[] {
  return CRAFT_RECIPES.filter((r) => r.station === st);
}
export function stationLevel(p: Pick<Profile, 'refuge'>, st: CraftStation): number {
  return (refugeOf(p) as unknown as Partial<Record<CraftStation, number>>)[st] ?? 0;
}
export function batchLimit(p: Pick<Profile, 'refuge'>, st: CraftStation): number {
  return CRAFT_CFG.batch[Math.min(3, stationLevel(p, st))] ?? 0;
}

/** Cuántas unidades hay para usar: almacén + mochila. */
export function available(p: Profile, itemId: string): number {
  return countItem(p.stash, itemId) + countItem(p.backpack, itemId);
}

/** null si la receta está aprendida; si no, el motivo (nivel o plano). */
export function recipeLock(p: Profile, r: CraftRecipe): string | null {
  const lv = stationLevel(p, r.station);
  if (lv < 1) return `${STATION_NAMES[r.station]} cerrada.`;
  if (lv < r.level) return `Pide ${STATION_NAMES[r.station]} a nivel ${r.level}.`;
  if (r.blueprint && !(p.blueprints ?? []).includes(r.blueprint)) return 'Te falta el plano.';
  return null;
}

/** Componentes de n unidades (con el material fino si se pide y la receta lo admite). */
export function needs(r: CraftRecipe, n: number, fine = false): { itemId: string; qty: number }[] {
  const out = r.ingredients.map((m) => ({ itemId: m.itemId, qty: m.qty * n }));
  if (fine && r.fine) {
    const f = out.find((m) => m.itemId === r.fine);
    if (f) f.qty += n; else out.push({ itemId: r.fine, qty: n });
  }
  return out;
}

/** Cuántas veces se puede hacer ahora (por componentes y por el lote del nivel). */
export function maxCraftable(p: Profile, r: CraftRecipe, fine = false): number {
  if (recipeLock(p, r)) return 0;
  let n = batchLimit(p, r.station);
  for (const m of needs(r, 1, fine)) n = Math.min(n, Math.floor(available(p, m.itemId) / m.qty));
  return Math.max(0, n);
}

/** null si se puede fabricar n veces; si no, el motivo. */
export function craftBlock(p: Profile, recipeId: string, n = 1, fine = false): string | null {
  const r = getRecipe(recipeId);
  const lock = recipeLock(p, r);
  if (lock) return lock;
  if (!Number.isInteger(n) || n < 1) return 'Cantidad no válida.';
  if (n > batchLimit(p, r.station)) return `Lote máximo: ${batchLimit(p, r.station)}.`;
  if (fine && !r.fine) return 'Esta receta no admite material fino.';
  for (const m of needs(r, n, fine)) {
    const have = available(p, m.itemId);
    if (have < m.qty) return `Te falta ${getItem(m.itemId).name.toLowerCase()} (${have}/${m.qty}).`;
  }
  return null;
}

/** Toma componentes: primero del almacén, luego de la mochila. */
export function takeComponents(p: Profile, items: { itemId: string; qty: number }[]): Profile | null {
  let { stash, backpack } = p;
  for (const m of items) {
    if (countItem(stash, m.itemId) + countItem(backpack, m.itemId) < m.qty) return null;
    const fromS = Math.min(m.qty, countItem(stash, m.itemId));
    if (fromS) stash = removeItem(stash, m.itemId, fromS) ?? stash;
    const left = m.qty - fromS;
    if (left) { const b = removeItem(backpack, m.itemId, left); if (!b) return null; backpack = b; }
  }
  return { ...p, stash, backpack };
}

/** Probabilidad de acabado fino de una receta (0 si el objeto no puede subir de rareza). */
export function fineChance(p: Pick<Profile, 'refuge'>, r: CraftRecipe, fine = false): number {
  const def = getItem(r.result);
  if (!def.slot || RARITY_ORDER.indexOf(CRAFT_CFG.fineCap[def.rarity]) <= RARITY_ORDER.indexOf(def.rarity)) return 0;
  return Math.min(1, (CRAFT_CFG.fineByLevel[Math.min(3, stationLevel(p, r.station))] ?? 0) + (fine && r.fine ? CRAFT_CFG.fineMaterial : 0));
}

export interface Crafted { profile: Profile; made: ItemStack[]; fineCount: number }

/** Fabrica n veces. Devuelve el perfil ya sin componentes y lo fabricado, aún sin colocar (ver `storeCrafted`). */
export function craft(p: Profile, recipeId: string, n: number, fine: boolean, seed: number): { ok: true; crafted: Crafted } | { ok: false; error: string } {
  const block = craftBlock(p, recipeId, n, fine);
  if (block) return { ok: false, error: block };
  const r = getRecipe(recipeId);
  const taken = takeComponents(p, needs(r, n, fine));
  if (!taken) return { ok: false, error: 'Te faltan componentes.' };
  const def = getItem(r.result);
  const made: ItemStack[] = [];
  let fineCount = 0;
  if (!def.slot) {
    made.push({ uid: makeUid(), itemId: r.result, qty: r.qty * n });
  } else {
    const rng = makeRng(seed);
    const next = () => rng.next();
    const chance = fineChance(p, r, fine);
    for (let i = 0; i < n * r.qty; i++) {
      let rarity: Rarity = def.rarity;
      if (chance > 0 && next() < chance) { rarity = RARITY_ORDER[RARITY_ORDER.indexOf(def.rarity) + 1]; fineCount++; }
      const affixes = rollAffixes(def, rarity, next);
      made.push({ uid: makeUid(), itemId: r.result, qty: 1, ...(rarity !== def.rarity ? { rarity } : {}), ...(affixes.length ? { affixes } : {}), forgedBy: p.character.name });
    }
  }
  return { ok: true, crafted: { profile: taken, made, fineCount } };
}

/** ¿Cabe todo lo fabricado en la mochila? */
export function fitsInBackpack(p: Profile, made: ItemStack[]): boolean {
  let g = p.backpack;
  for (const s of made) { const a = addToGrid(g, s, LAYOUTS.backpack); if (a.leftover) return false; g = a.grid; }
  return true;
}

/** Coloca lo fabricado donde elige el jugador. Lo que no cabe pasa al almacén y, si tampoco, a la recepción. */
export function storeCrafted(p: Profile, made: ItemStack[], dest: 'backpack' | 'stash'): { profile: Profile; toReception: boolean } {
  let { backpack, stash } = p;
  const reception = [...(p.reception ?? [])];
  for (const s of made) {
    let rest: ItemStack | null = s;
    if (dest === 'backpack') { const a = addToGrid(backpack, rest, LAYOUTS.backpack); backpack = a.grid; rest = a.leftover; }
    if (rest) { const b = addToGrid(stash, rest, LAYOUTS.stash); stash = b.grid; rest = b.leftover; }
    if (rest && dest === 'stash') { const a = addToGrid(backpack, rest, LAYOUTS.backpack); backpack = a.grid; rest = a.leftover; }
    if (rest) reception.push(rest);
  }
  return { profile: { ...p, backpack, stash, reception }, toReception: reception.length > (p.reception ?? []).length };
}

// ── Planos ──────────────────────────────────────────────────────────
/** Aprende los planos que hay en la mochila y el almacén (al volver al Bastión). Los repetidos se quedan para vender. */
export function learnBlueprints(p: Profile): { profile: Profile; learned: string[] } {
  const known = new Set(p.blueprints ?? []);
  const learned: string[] = [];
  let { backpack, stash } = p;
  for (const which of ['stash', 'backpack'] as const) {
    const grid = which === 'stash' ? stash : backpack;
    for (const s of grid) {
      if (!s || getItem(s.itemId).category !== 'blueprint' || known.has(s.itemId)) continue;
      known.add(s.itemId); learned.push(s.itemId);
      const g = removeItem(which === 'stash' ? stash : backpack, s.itemId, 1);
      if (g) { if (which === 'stash') stash = g; else backpack = g; }
    }
  }
  return { profile: learned.length ? { ...p, backpack, stash, blueprints: [...known] } : p, learned };
}

// ── Migración de los minijuegos ─────────────────────────────────────
/** Un fogón, yunque o mezcla que quedó a medias se entrega con el resultado estándar (los materiales ya estaban pagados). */
export function settlePendingJobs(p: Profile): Result {
  if (!p.cooking && !p.workshop) return { ok: true, profile: p };
  const items: { itemId: string; qty: number; quality?: number; forgedBy?: string }[] = [];
  const dish = p.cooking ? DISHES.find((d) => d.id === p.cooking!.recipe) : undefined;
  if (dish) items.push({ itemId: dish.result, qty: 1 });
  const job = p.workshop;
  if (job) {
    try {
      if (job.station === 'forge') items.push({ itemId: jobResult(job), qty: 1, quality: 0, forgedBy: p.character.name });
      else items.push({ itemId: getAlchemy(job.recipe).result, qty: getAlchemy(job.recipe).qty });
    } catch { /* receta que ya no existe: no hay nada que entregar */ }
  }
  const out = deliver({ ...p, cooking: null, workshop: null }, items);
  return { ok: true, profile: out.profile, note: 'Un trabajo que dejaste a medias en el Refugio ya está terminado.' };
}
