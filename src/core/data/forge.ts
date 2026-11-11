// ════════════════════════════════════════════════════════════════════
// LA FORJA de Maese Brand: recetas, materiales y calidad. Todo es editable.
// Las armas forjadas tienen estadísticas base fijas y una calidad que sale del trabajo en el yunque.
// ════════════════════════════════════════════════════════════════════
import type { ItemDef } from '../types';
import { SLASH, CHOP, BOLT } from './attacks';

const W = ['warrior'] as const;
const M = ['mage'] as const;

/** Objetos que solo se consiguen en la forja. */
export const FORGED_ITEMS: ItemDef[] = [
  // Mazmorra
  { id: 'tempered_sword', name: 'Espada templada', description: 'Hierro de la Mazmorra, temple de la forja de Brand.', icon: 'sword', category: 'weapon', slot: 'mainHand', family: 'sword', rarity: 'rare', value: 180, levelReq: 12, stats: { atk: 11, crit: 4 }, classes: [...W], attack: SLASH, grants: ['rending_slash', 'thrust', 'pommel_strike'] },
  { id: 'tempered_axe', name: 'Hacha templada', description: 'Pesa lo justo y corta de más.', icon: 'axe', category: 'weapon', slot: 'mainHand', family: 'axe', rarity: 'rare', value: 190, levelReq: 12, stats: { atk: 13, crit: 4, spd: -1 }, classes: [...W], attack: CHOP, grants: ['brutal_blow', 'skull_splitter'] },
  { id: 'cavern_staff', name: 'Báculo de cristal de caverna', description: 'Un cristal que aún brilla al cerrar los ojos.', icon: 'staff_frost', category: 'weapon', slot: 'mainHand', family: 'staff', rarity: 'rare', value: 180, levelReq: 12, stats: { mag: 12, maxMp: 10 }, classes: [...M], attack: BOLT, grants: ['frost_lance', 'fireball', 'spark'] },
  // Cripta
  { id: 'silver_forged_sword', name: 'Espada de plata forjada', description: 'Brand dice que corta fantasmas. Brand exagera, pero poco.', icon: 'sword_knight', category: 'weapon', slot: 'mainHand', family: 'sword', rarity: 'epic', value: 900, levelReq: 42, stats: { atk: 26, crit: 6, res: 4 }, classes: [...W], attack: SLASH, grants: ['rending_slash', 'pommel_strike', 'dread_cut'] },
  { id: 'ecto_staff', name: 'Báculo de ectoplasma', description: 'Frío, húmedo y lleno de voces.', icon: 'staff_rune', category: 'weapon', slot: 'mainHand', family: 'staff', rarity: 'epic', value: 900, levelReq: 42, stats: { mag: 26, maxMp: 22, res: 4 }, classes: [...M], attack: BOLT, grants: ['frost_lance', 'blizzard', 'ice_prison'] },
  { id: 'bone_bulwark', name: 'Baluarte de hueso antiguo', description: 'Huesos más duros que el hierro, unidos con plata.', icon: 'shield_iron', category: 'shield', slot: 'offHand', family: 'shield', rarity: 'epic', value: 850, levelReq: 40, stats: { def: 15, res: 7, maxHp: 30 }, classes: ['warrior', 'cleric'], grants: ['block', 'shield_bash', 'iron_wall'] },
  // Infierno
  { id: 'obsidian_greatblade', name: 'Gran hoja de obsidiana', description: 'Forjada sobre lava. Ni Brand quiere tocarla dos veces.', icon: 'sword_dread', category: 'weapon', slot: 'mainHand', family: 'sword', rarity: 'legendary', value: 3200, levelReq: 78, stats: { atk: 52, crit: 9, def: 4 }, classes: [...W], attack: SLASH, grants: ['rending_slash', 'pommel_strike', 'dread_cut'], specials: ['obsidian_cleave', 'rending_slash'] },
  { id: 'brimstone_scepter', name: 'Cetro de azufre forjado', description: 'Huele a tormenta y a infierno.', icon: 'staff_fire', category: 'weapon', slot: 'mainHand', family: 'staff', rarity: 'legendary', value: 3200, levelReq: 78, stats: { mag: 52, maxMp: 36, crit: 8 }, classes: [...M], attack: BOLT, grants: ['fireball', 'ember_rain', 'dark_nova'], specials: ['brimstone_storm', 'fireball'] },
  { id: 'demonblood_plate', name: 'Coraza de sangre demoníaca', description: 'Templada en sangre de demonio. Todavía late.', icon: 'plate', category: 'armor', slot: 'armor', rarity: 'legendary', value: 3000, levelReq: 76, stats: { def: 30, maxHp: 95, res: 14, spd: -1 }, classes: ['warrior'] },
];

export interface Recipe {
  id: string;
  result: string;
  materials: { itemId: string; qty: number }[];
  gold: number;
  /** Rango mínimo de reputación con Maese Brand para que te enseñe la receta. */
  rank: number;
}

export const RECIPES: Recipe[] = [
  { id: 'r_tempered_sword', result: 'tempered_sword', materials: [{ itemId: 'iron_ore', qty: 6 }, { itemId: 'bone_dust', qty: 4 }], gold: 120, rank: 0 },
  { id: 'r_tempered_axe', result: 'tempered_axe', materials: [{ itemId: 'iron_ore', qty: 6 }, { itemId: 'copper_ore', qty: 4 }], gold: 130, rank: 0 },
  { id: 'r_cavern_staff', result: 'cavern_staff', materials: [{ itemId: 'bat_wing', qty: 6 }, { itemId: 'copper_ore', qty: 6 }], gold: 120, rank: 0 },
  { id: 'r_silver_sword', result: 'silver_forged_sword', materials: [{ itemId: 'silver_ore', qty: 8 }, { itemId: 'blessed_silver', qty: 2 }, { itemId: 'ancient_bone', qty: 4 }], gold: 600, rank: 2 },
  { id: 'r_ecto_staff', result: 'ecto_staff', materials: [{ itemId: 'ectoplasm', qty: 8 }, { itemId: 'silver_ore', qty: 4 }], gold: 600, rank: 2 },
  { id: 'r_bone_bulwark', result: 'bone_bulwark', materials: [{ itemId: 'ancient_bone', qty: 10 }, { itemId: 'silver_ore', qty: 4 }], gold: 550, rank: 2 },
  { id: 'r_obsidian_blade', result: 'obsidian_greatblade', materials: [{ itemId: 'obsidian_shard', qty: 10 }, { itemId: 'demon_blood', qty: 3 }], gold: 2200, rank: 3 },
  { id: 'r_brimstone_scepter', result: 'brimstone_scepter', materials: [{ itemId: 'sulfur', qty: 12 }, { itemId: 'demon_blood', qty: 3 }], gold: 2200, rank: 3 },
  { id: 'r_demonblood_plate', result: 'demonblood_plate', materials: [{ itemId: 'demon_blood', qty: 6 }, { itemId: 'obsidian_shard', qty: 6 }], gold: 2400, rank: 4 },
];

/** Calidades de forja: bonificación a todas las estadísticas. Salen del yunque: todos los golpes bien, magistral;
 *  uno mal, buena; más, tosca. La forja rápida (tras la primera vez) da siempre tosca. */
export const QUALITIES = [
  { name: 'Tosca', bonus: 0 },
  { name: 'Buena', bonus: 0.1 },
  { name: 'Magistral', bonus: 0.2 },
];
