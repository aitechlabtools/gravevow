// ════════════════════════════════════════════════════════════════════
// Minería: vetas en las paredes de cada zona que se pican con un pico.
// Cada veta da su mineral (y a veces algo extra); el pico pierde un uso.
// ════════════════════════════════════════════════════════════════════
import type { Rng } from './rng';
import type { Grid, ItemStack } from './types';
import { getItem } from './data/items';
import { makeUid } from './rng';

export type VeinId = 'copper' | 'iron' | 'silver' | 'obsidian' | 'sulfur';

export interface VeinDef {
  id: VeinId;
  name: string;
  item: string;
  min: number;
  max: number;
  /** Premio raro que a veces sale al picar. */
  bonus?: { itemId: string; chance: number };
  /** Colores del mineral en la roca. */
  color: string;
  glint: string;
}

export const VEINS: Record<VeinId, VeinDef> = {
  copper: { id: 'copper', name: 'Veta de cobre', item: 'copper_ore', min: 2, max: 4, color: '#c8743a', glint: '#5fbf8a' },
  iron: { id: 'iron', name: 'Veta de hierro', item: 'iron_ore', min: 1, max: 3, bonus: { itemId: 'old_coin', chance: 0.15 }, color: '#8a96a4', glint: '#d8e0e8' },
  silver: { id: 'silver', name: 'Veta de plata', item: 'silver_ore', min: 1, max: 3, bonus: { itemId: 'blessed_silver', chance: 0.2 }, color: '#dfe5ec', glint: '#ffffff' },
  obsidian: { id: 'obsidian', name: 'Veta de obsidiana', item: 'obsidian_shard', min: 1, max: 2, bonus: { itemId: 'demon_blood', chance: 0.1 }, color: '#3a2a3a', glint: '#c86aff' },
  sulfur: { id: 'sulfur', name: 'Veta de azufre', item: 'sulfur', min: 2, max: 3, color: '#e8d24a', glint: '#fff3a0' },
};

/** Qué vetas hay en cada zona y con qué frecuencia. */
export const ZONE_VEINS: Record<string, { id: VeinId; weight: number }[]> = {
  mazmorra: [{ id: 'copper', weight: 60 }, { id: 'iron', weight: 40 }],
  cripta: [{ id: 'silver', weight: 60 }, { id: 'iron', weight: 40 }],
  infierno: [{ id: 'obsidian', weight: 55 }, { id: 'sulfur', weight: 45 }],
};

export function pickVein(rng: Rng, zone: string): VeinId {
  const pool = ZONE_VEINS[zone] ?? ZONE_VEINS.mazmorra;
  let r = rng.next() * pool.reduce((s, v) => s + v.weight, 0);
  for (const v of pool) { r -= v.weight; if (r < 0) return v.id; }
  return pool[0].id;
}

/** Lo que sale de una veta. */
export function mineYield(vein: VeinId, rng: Rng): ItemStack[] {
  const v = VEINS[vein];
  const out: ItemStack[] = [{ uid: makeUid(), itemId: v.item, qty: rng.int(v.min, v.max) }];
  if (v.bonus && rng.chance(v.bonus.chance)) out.push({ uid: makeUid(), itemId: v.bonus.itemId, qty: 1 });
  return out;
}

export function usesLeft(s: ItemStack): number {
  return s.uses ?? getItem(s.itemId).uses ?? 0;
}

/** El mejor pico de la mochila (el más rápido; a igualdad, el más gastado para acabarlo antes). */
export function bestPick(grid: Grid): { index: number; stack: ItemStack } | null {
  let best: { index: number; stack: ItemStack } | null = null;
  grid.forEach((s, index) => {
    if (!s || getItem(s.itemId).category !== 'tool' || !getItem(s.itemId).mineTime || usesLeft(s) <= 0) return;
    if (!best) { best = { index, stack: s }; return; }
    const a = getItem(s.itemId).mineTime!, b = getItem(best.stack.itemId).mineTime!;
    if (a < b || (a === b && usesLeft(s) < usesLeft(best.stack))) best = { index, stack: s };
  });
  return best;
}

/** Gasta un uso del pico; si se queda sin usos, se rompe (queda en la mochila, a 0, hasta repararlo). */
export function wearPick(grid: Grid, index: number): { grid: Grid; broke: boolean } {
  const g = grid.map((s) => (s ? { ...s } : null));
  const s = g[index];
  if (!s) return { grid: g, broke: false };
  const left = usesLeft(s) - 1;
  g[index] = { ...s, uses: Math.max(0, left) };
  if (left <= 0) return { grid: g, broke: true };
  return { grid: g, broke: false };
}
