// ════════════════════════════════════════════════════════════════════
// Taller (Fase 9): yunque de Maese Brand, mesa de alquimia y rincón de cura. Lógica pura: sin React ni Phaser.
//  · Forja y alquimia: los materiales (y el oro) se gastan al empezar y las lecturas de cada paso se fijan con una
//    semilla en `Profile.workshop`: recargar no cambia nada ni deja repetir para buscar más calidad.
//    Cada paso se decide leyendo la lectura y la franja: por debajo se aviva, dentro se mantiene, por encima se rebaja.
//  · Fallar nunca pierde el objeto: sale la versión estándar (forja tosca; poción normal).
//  · Tras la primera vez, producción rápida con calidad estándar. Lo que no cabe va a la recepción.
// ════════════════════════════════════════════════════════════════════
import type { Profile } from './types';
import { STATIONS, FORGE_BANDS, FORGE_STEPS, ALCHEMY, getAlchemy, getCare, type Move, type Station } from './data/workshop';
import { QUALITIES } from './data/forge';
import { forgeBlock, forgeCost, recipe as forgeRecipe } from './forge';
import { getItem } from './data/items';
import { cheapestIngredient, deliver, ownedQty, RECEPTION_NOTE, refugeOf, takeItems, type Result } from './refuge';
import { spendGold } from './wallet';
import { makeRng } from './rng';
import { REFUGE_CFG } from '../config/refuge';

export type WorkshopJob = NonNullable<Profile['workshop']>;

// ── Lecturas y franjas ──────────────────────────────────────────────
export function rightMove(reading: number, band: readonly [number, number]): Move {
  return reading < band[0] ? 'up' : reading > band[1] ? 'down' : 'hold';
}
/** Lecturas de cada paso (deterministas por semilla), siempre a un lado claro de la franja o dentro. */
export function rollReadings(seed: number, station: Station, band: readonly [number, number], steps: number): number[] {
  const rng = makeRng(seed);
  const { spread, round } = STATIONS[station];
  const pick = (n: number) => Math.floor(rng.next() * n);
  const out: number[] = [];
  for (let i = 0; i < steps; i++) {
    const m: Move = (['up', 'hold', 'down'] as const)[pick(3)];
    const far = 1 + pick(Math.max(1, Math.floor(spread / round)));
    if (m === 'up') out.push(band[0] - far * round);
    else if (m === 'down') out.push(band[1] + far * round);
    else out.push(band[0] + pick(Math.floor((band[1] - band[0]) / round) + 1) * round);
  }
  return out;
}

export function jobBand(job: Pick<WorkshopJob, 'station' | 'recipe'>): readonly [number, number] {
  if (job.station === 'alchemy') return getAlchemy(job.recipe).band;
  return FORGE_BANDS[forgeKind(job.recipe)];
}
export function jobSteps(job: Pick<WorkshopJob, 'station' | 'recipe'>): number {
  return job.station === 'alchemy' ? getAlchemy(job.recipe).steps : FORGE_STEPS[forgeKind(job.recipe)];
}
export function jobResult(job: Pick<WorkshopJob, 'station' | 'recipe'>): string {
  return job.station === 'alchemy' ? getAlchemy(job.recipe).result : forgeRecipe(job.recipe).result;
}
function forgeKind(recipeId: string): 'weapon' | 'armor' {
  return getItem(forgeRecipe(recipeId).result).category === 'weapon' ? 'weapon' : 'armor';
}
function busy(p: Profile): string | null {
  const w = p.workshop;
  if (!w) return null;
  return w.station === 'forge' ? 'Tienes una pieza a medias en el yunque de Brand.' : 'Tienes una mezcla a medias en la mesa de alquimia.';
}
const done = (p: Profile, id: string) => (p.crafted ?? []).includes(id);
const markDone = (p: Profile, id: string): Profile => ({ ...p, crafted: [...new Set([...(p.crafted ?? []), id])] });

// ── Forja ───────────────────────────────────────────────────────────
export function anvilBlock(p: Profile, recipeId: string): string | null {
  return busy(p) ?? forgeBlock(p, forgeRecipe(recipeId));
}
function payForge(p: Profile, recipeId: string): Result {
  const r = forgeRecipe(recipeId);
  const taken = takeItems(p, r.materials);
  if (!taken) return { ok: false, error: 'Te faltan materiales.' };
  return spendGold(taken, forgeCost(r));
}
/** Al yunque: se pagan materiales y trabajo, y se fijan las temperaturas de cada golpe. */
export function startForging(p: Profile, recipeId: string, seed: number): Result {
  const block = anvilBlock(p, recipeId);
  if (block) return { ok: false, error: block };
  const paid = payForge(p, recipeId);
  if (!paid.ok) return paid;
  const kind = forgeKind(recipeId);
  return { ok: true, profile: { ...paid.profile, workshop: { station: 'forge', recipe: recipeId, readings: rollReadings(seed, 'forge', FORGE_BANDS[kind], FORGE_STEPS[kind]), picks: [] } } };
}
/** Forja rápida (calidad tosca): solo si ya la forjaste una vez en el yunque. */
export function quickForge(p: Profile, recipeId: string): Result {
  if (!done(p, recipeId)) return { ok: false, error: 'Primero fórjala una vez en el yunque.' };
  const block = anvilBlock(p, recipeId);
  if (block) return { ok: false, error: block };
  const paid = payForge(p, recipeId);
  if (!paid.ok) return paid;
  const res = forgeRecipe(recipeId).result;
  const d = deliver(paid.profile, [{ itemId: res, qty: 1, quality: 0, forgedBy: p.character.name }]);
  return { ok: true, profile: d.profile, note: `${getItem(res).name} · calidad tosca.${d.toReception ? RECEPTION_NOTE : ''}` };
}

// ── Alquimia ────────────────────────────────────────────────────────
export function knownAlchemy(p: Profile) {
  return ALCHEMY.filter((r) => r.level <= refugeOf(p).alchemy);
}
export function alchemyBlock(p: Profile, recipeId: string, qty = 1): string | null {
  const r = getAlchemy(recipeId);
  if (refugeOf(p).alchemy < r.level) return 'Tu Refugio aún no tiene mesa de alquimia.';
  const b = busy(p);
  if (b) return b;
  for (const m of r.ingredients) if (ownedQty(p, m.itemId) < m.qty * qty) return `Te falta ${getItem(m.itemId).name.toLowerCase()} (${ownedQty(p, m.itemId)}/${m.qty * qty}).`;
  return null;
}
export function startAlchemy(p: Profile, recipeId: string, seed: number): Result {
  const block = alchemyBlock(p, recipeId);
  if (block) return { ok: false, error: block };
  const r = getAlchemy(recipeId);
  const taken = takeItems(p, r.ingredients);
  if (!taken) return { ok: false, error: 'Te faltan reactivos.' };
  return { ok: true, profile: { ...taken, workshop: { station: 'alchemy', recipe: recipeId, readings: rollReadings(seed, 'alchemy', r.band, r.steps), picks: [] } } };
}
export function alchemyBatch(p: Profile, recipeId: string, qty: number): Result {
  if (!done(p, recipeId)) return { ok: false, error: 'Primero prepárala una vez en la mesa.' };
  const n = Math.max(1, Math.min(REFUGE_CFG.maxBatch, Math.floor(qty)));
  const block = alchemyBlock(p, recipeId, n);
  if (block) return { ok: false, error: block };
  const r = getAlchemy(recipeId);
  const taken = takeItems(p, r.ingredients.map((m) => ({ itemId: m.itemId, qty: m.qty * n })));
  if (!taken) return { ok: false, error: 'Te faltan reactivos.' };
  const d = deliver(taken, [{ itemId: r.result, qty: r.qty * n }]);
  return { ok: true, profile: d.profile, note: `${getItem(r.result).name} ×${r.qty * n}.${d.toReception ? RECEPTION_NOTE : ''}` };
}

// ── Un paso del yunque o de la mesa ─────────────────────────────────
/** Decide el paso actual. En el último se resuelve una sola vez: se entrega el resultado y se libera el puesto. */
export function workshopStep(p: Profile, move: Move): Result & { done?: boolean; quality?: number; perfect?: boolean } {
  const job = p.workshop;
  if (!job) return { ok: false, error: 'No hay ningún trabajo a medias.' };
  const picks = [...job.picks, move];
  const steps = jobSteps(job);
  if (picks.length < steps) return { ok: true, profile: { ...p, workshop: { ...job, picks } } };
  const band = jobBand(job);
  const right = picks.filter((m, i) => m === rightMove(job.readings[i], band)).length;
  const free = markDone({ ...p, workshop: null }, job.recipe);
  if (job.station === 'forge') {
    const quality = right === steps ? 2 : right === steps - 1 ? 1 : 0;
    const res = jobResult(job);
    const d = deliver(free, [{ itemId: res, qty: 1, quality, forgedBy: p.character.name }]);
    return { ok: true, done: true, quality, profile: d.profile, note: `${getItem(res).name} · calidad ${QUALITIES[quality].name.toLowerCase()}.${d.toReception ? RECEPTION_NOTE : ''}` };
  }
  const r = getAlchemy(job.recipe);
  const perfect = right === steps;
  const out = [{ itemId: r.result, qty: r.qty }];
  if (perfect) out.push({ itemId: cheapestIngredient(r), qty: 1 });
  const d = deliver(free, out);
  return { ok: true, done: true, perfect, profile: d.profile, note: (perfect ? `${getItem(r.result).name}, limpia. Te sobra: ${getItem(cheapestIngredient(r)).name.toLowerCase()}.` : `${getItem(r.result).name}.`) + (d.toReception ? RECEPTION_NOTE : '') };
}

// ── Rincón de cura ──────────────────────────────────────────────────
export function careBlock(p: Profile, id: string, qty = 1): string | null {
  if (refugeOf(p).infirmary < 1) return 'Tu Refugio aún no tiene rincón de cura.';
  const r = getCare(id);
  if (p.gold < r.gold * qty) return `Oro insuficiente: necesitas ${r.gold * qty}.`;
  for (const m of r.ingredients) if (ownedQty(p, m.itemId) < m.qty * qty) return `Te falta ${getItem(m.itemId).name.toLowerCase()} (${ownedQty(p, m.itemId)}/${m.qty * qty}).`;
  return null;
}
export function prepareCare(p: Profile, id: string, qty: number): Result {
  const n = Math.max(1, Math.min(REFUGE_CFG.maxBatch, Math.floor(qty)));
  const block = careBlock(p, id, n);
  if (block) return { ok: false, error: block };
  const r = getCare(id);
  const taken = takeItems(p, r.ingredients.map((m) => ({ itemId: m.itemId, qty: m.qty * n })));
  if (!taken) return { ok: false, error: 'Te faltan materiales.' };
  const paid = spendGold(taken, r.gold * n);
  if (!paid.ok) return paid;
  const d = deliver(paid.profile, [{ itemId: r.result, qty: r.qty * n }]);
  return { ok: true, profile: d.profile, note: `${getItem(r.result).name} ×${r.qty * n}.${d.toReception ? RECEPTION_NOTE : ''}` };
}
