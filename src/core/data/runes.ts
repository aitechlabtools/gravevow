// ════════════════════════════════════════════════════════════════════
// Runas (bloque 2, parte 2.1): se graban en el Atril rúnico (nivel 3) y se aplican a un arma, armadura o equipo mágico.
//  · Cada runa añade un atributo de data/rarity.ts; las de estadística son la mitad que las encontradas (rune_*),
//    porque se pueden grabar en todas las piezas (comprobado con scripts/simular-runas.mjs).
//  · Huecos según la rareza: común y poco común 1, rara y épica 2, legendaria 0 (no se encanta).
//  · Una runa sobre un hueco ocupado sustituye a la anterior (la vieja se pierde). No se repite una runa en el mismo objeto. Las runas no suben el precio de venta: no hay bucle de grabar y vender.
// Todo editable.
// ════════════════════════════════════════════════════════════════════
import type { EquipSlot, ItemDef, Rarity } from '../types';
import type { CraftRecipe } from './crafting';

export interface RuneDef { id: string; affix: string; on: 'weapon' | 'any' }

export const RUNES: Record<string, RuneDef> = {
  rune_vampire: { id: 'rune_vampire', affix: 'vampire', on: 'weapon' },
  rune_stone: { id: 'rune_stone', affix: 'rune_stone', on: 'any' },
  rune_hermit: { id: 'rune_hermit', affix: 'rune_hermit', on: 'any' },
  rune_swift: { id: 'rune_swift', affix: 'rune_swift', on: 'any' },
};

export const RUNE_SLOTS: Record<Rarity, number> = { common: 1, uncommon: 1, rare: 2, epic: 2, legendary: 0 };

/** Huecos donde se puede encantar: armas, escudos y equipo mágico de mano, armaduras y amuletos. */
export const RUNE_TARGETS: EquipSlot[] = ['mainHand', 'offHand', 'helmet', 'armor', 'gloves', 'boots', 'amulet'];

export const RUNE_ITEMS: ItemDef[] = [
  { id: 'rune_vampire', name: 'Runa del vampiro', description: 'Grabada en un arma, te cura el 8 % del daño que haces.', icon: 'rune_vampire', category: 'material', rarity: 'rare', value: 120, stack: 5 },
  { id: 'rune_stone', name: 'Runa de piedra', description: 'Grabada en una pieza, +2 de defensa.', icon: 'rune_stone', category: 'material', rarity: 'uncommon', value: 70, stack: 5 },
  { id: 'rune_hermit', name: 'Runa del ermitaño', description: 'Grabada en una pieza, +6 de vida máxima.', icon: 'rune_hermit', category: 'material', rarity: 'uncommon', value: 70, stack: 5 },
  { id: 'rune_swift', name: 'Runa veloz', description: 'Grabada en una pieza, +1 de velocidad.', icon: 'rune_swift', category: 'material', rarity: 'uncommon', value: 80, stack: 5 },
];

const r = (result: string, ingredients: [string, number][]): CraftRecipe => ({
  id: `c_${result}`, result, qty: 1, station: 'runic', level: 3, ingredients: ingredients.map(([itemId, qty]) => ({ itemId, qty })),
});
export const RUNE_RECIPES: CraftRecipe[] = [
  r('rune_vampire', [['rune_ink', 2], ['ecto_crystal', 1], ['silver_ingot', 1]]),
  r('rune_stone', [['rune_ink', 1], ['cut_crystal', 1], ['iron_ingot', 2]]),
  r('rune_hermit', [['rune_ink', 1], ['cut_crystal', 1], ['bone_powder', 2]]),
  r('rune_swift', [['rune_ink', 1], ['cut_crystal', 1], ['woven_cloth', 2]]),
];
