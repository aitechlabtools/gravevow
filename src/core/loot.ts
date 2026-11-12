import { scaleLoot } from './wallet';
import type { ClassId, ItemStack } from './types';
import { CLASSES } from './data/classes';
import type { Rng } from './rng';
import { makeUid } from './rng';
import { ITEMS } from './data/items';
import { itemsOfSubzone } from './data/subzoneItems';
import { CHEST_BY_POSITION, GEAR_LEVEL_WEIGHT } from '../config/subzones';
import { CRIPTA_CHESTS } from './data/zones/cripta';
import { INFIERNO_CHESTS } from './data/zones/infierno';

export interface LootEntry { itemId: string | 'nothing'; weight: number; min?: number; max?: number }
export interface LootTable { rolls: number; gold: [number, number]; entries: LootEntry[]; /** Objetos que siempre salen (por ejemplo, la llave de reliquia del jefe). */ always?: { itemId: string; qty?: number }[] }

export interface LootResult { items: ItemStack[]; gold: number }

export function rollLoot(table: LootTable, rng: Rng): LootResult {
  const items: ItemStack[] = [];
  const total = table.entries.reduce((s, e) => s + e.weight, 0);
  for (let r = 0; r < table.rolls; r++) {
    let roll = rng.next() * total;
    for (const e of table.entries) {
      roll -= e.weight;
      if (roll < 0) {
        if (e.itemId !== 'nothing') {
          const qty = rng.int(e.min ?? 1, e.max ?? 1);
          const existing = items.find((i) => i.itemId === e.itemId);
          if (existing) existing.qty += qty;
          else items.push({ uid: makeUid(), itemId: e.itemId, qty });
        }
        break;
      }
    }
  }
  for (const a of table.always ?? []) items.push({ uid: makeUid(), itemId: a.itemId, qty: a.qty ?? 1 });
  // Oro en la escala de monedas (÷10, con un redondeo al azar que conserva la media)
  const gold = scaleLoot(rng.int(table.gold[0], table.gold[1]), () => rng.next());
  return { items, gold };
}

/** Pociones de recurso: cada clase encuentra la que le sirve (tónico de concentración para el Ímpetu, poción de maná para el Maná). */
const RESOURCE_POTION = { impetus: 'focus_tonic', mana: 'mana_potion' } as const;
export function adaptDrops(items: ItemStack[], classId: ClassId): ItemStack[] {
  const want = RESOURCE_POTION[CLASSES[classId].resource];
  return items.map((i) => (i.itemId === 'mana_potion' || i.itemId === 'focus_tonic') && i.itemId !== want ? { ...i, itemId: want } : i);
}

// Tablas de los cofres de la mazmorra.
export const CHEST_TABLES: Record<string, LootTable> = {
  // Niveles 1-3
  common: { rolls: 2, gold: [8, 25], entries: [
    { itemId: 'health_potion', weight: 25 }, { itemId: 'mana_potion', weight: 15 }, { itemId: 'old_coin', weight: 20, min: 1, max: 3 }, { itemId: 'antidote', weight: 8 }, { itemId: 'iron_key', weight: 6 },
    { itemId: 'leather_gloves', weight: 6 }, { itemId: 'worn_boots', weight: 6 }, { itemId: 'leather_hood', weight: 6 }, { itemId: 'copper_ring', weight: 6 },
    { itemId: 'iron_sword', weight: 4 }, { itemId: 'battle_axe', weight: 3 }, { itemId: 'ember_staff', weight: 4 }, { itemId: 'iron_shield', weight: 3 },
    { itemId: 'iron_helm', weight: 3 }, { itemId: 'wizard_hat', weight: 3 }, { itemId: 'chainmail', weight: 2 }, { itemId: 'gauntlets', weight: 3 }, { itemId: 'bone_amulet', weight: 2 },
  ] },
  // Niveles 3-5
  rich: { rolls: 3, gold: [20, 45], entries: [
    { itemId: 'golden_chalice', weight: 14 }, { itemId: 'health_potion', weight: 20 }, { itemId: 'mana_potion', weight: 8 },
    { itemId: 'iron_helm', weight: 6 }, { itemId: 'wizard_hat', weight: 6 }, { itemId: 'chainmail', weight: 6 }, { itemId: 'gauntlets', weight: 5 }, { itemId: 'arcane_tome', weight: 5 },
    { itemId: 'bone_amulet', weight: 6 }, { itemId: 'iron_shield', weight: 5 }, { itemId: 'battle_axe', weight: 4 },
    { itemId: 'knight_sword', weight: 4 }, { itemId: 'executioner_axe', weight: 3 }, { itemId: 'frost_staff', weight: 4 }, { itemId: 'bastion_shield', weight: 3 },
    { itemId: 'knight_helm', weight: 3 }, { itemId: 'shadow_robe', weight: 3 }, { itemId: 'swift_boots', weight: 3 }, { itemId: 'ring_of_embers', weight: 3 },
  ] },
  // Niveles 5-8
  boss: { rolls: 3, gold: [60, 120], entries: [
    { itemId: 'blood_gem', weight: 18 }, { itemId: 'golden_chalice', weight: 18 },
    { itemId: 'knight_sword', weight: 6 }, { itemId: 'executioner_axe', weight: 6 }, { itemId: 'frost_staff', weight: 6 }, { itemId: 'bastion_shield', weight: 6 },
    { itemId: 'knight_helm', weight: 5 }, { itemId: 'shadow_robe', weight: 5 }, { itemId: 'swift_boots', weight: 5 }, { itemId: 'ring_of_embers', weight: 5 },
    { itemId: 'dread_blade', weight: 3 }, { itemId: 'bonereaver', weight: 3 }, { itemId: 'runic_staff', weight: 3 }, { itemId: 'eclipse_grimoire', weight: 3 },
    { itemId: 'bastion_plate', weight: 3 }, { itemId: 'archmage_robe', weight: 3 }, { itemId: 'heart_of_umbravel', weight: 2 },
  ] },
};

Object.assign(CHEST_TABLES, CRIPTA_CHESTS, INFIERNO_CHESTS);
// Tutorial: contenido fijo (la llave en el baúl; monedas sueltas y un saquito vacío en el cofre de hierro)
CHEST_TABLES['tut:box'] = { rolls: 0, gold: [0, 0], entries: [{ itemId: 'nothing', weight: 1 }], always: [{ itemId: 'iron_key' }] };
CHEST_TABLES['tut:rich'] = { rolls: 0, gold: [12, 12], entries: [{ itemId: 'nothing', weight: 1 }], always: [{ itemId: 'gold_pouch' }] };

/**
 * Tabla de un cofre ajustada a la subzona: más oro y tiradas en las subzonas hondas de cada zona, y el equipo de su nivel
 * sale más que el de niveles muy bajos o muy altos (config/subzones.ts).
 */
/** Peso en los cofres de cada objeto nuevo de la subzona (las legendarias, muy raras). */
export const SUBZONE_ITEM_WEIGHT = { normal: 5, legendary: 0.5 };

export function subzoneChestTable(table: LootTable, levels: [number, number], position: number, sub?: string): LootTable {
  const pos = CHEST_BY_POSITION[Math.min(CHEST_BY_POSITION.length - 1, Math.max(0, position))];
  const w = GEAR_LEVEL_WEIGHT;
  const entries = table.entries.map((e) => {
    const req = e.itemId === 'nothing' ? undefined : ITEMS[e.itemId]?.levelReq;
    if (!req || !ITEMS[e.itemId]?.slot) return e;
    const k = req > levels[1] + w.nearAbove ? w.above : req < levels[0] - w.nearBelow ? w.below : w.near;
    return { ...e, weight: e.weight * k };
  });
  // Lo nuevo de la subzona: solo en los cofres con equipo (no en baúles de llaves o sacos de oro)
  if (sub && entries.some((e) => e.itemId !== 'nothing' && ITEMS[e.itemId]?.slot)) {
    for (const it of itemsOfSubzone(sub)) entries.push({ itemId: it.id, weight: it.rarity === 'legendary' ? SUBZONE_ITEM_WEIGHT.legendary : SUBZONE_ITEM_WEIGHT.normal });
  }
  return { ...table, rolls: table.rolls + pos.extraRolls, gold: [Math.round(table.gold[0] * pos.gold), Math.round(table.gold[1] * pos.gold)], entries };
}
