// Venta por oficio: qué mercader compra cada objeto. Ver docs/plan-venta-oficio.md.
// Cada especialista compra lo suyo cuando su estación está en pie; mientras siga en ruinas, lo compra Nira.
import type { ItemDef, Profile } from './types';
import { getItem } from './data/items';
import type { VendorId } from './data/vendors';
import { CRAFT_RECIPES } from './data/crafting';
import { STATIONS } from '../config/stations';
import { refugeOf } from './refuge';

/** Estación de la que depende que cada mercader compre. Sin estación (Nira es el mercado, Grizk siempre compra): siempre. */
const NEEDS: Partial<Record<VendorId, string>> = { vesper: 'infirmary', garth: 'kitchen', orik: 'bench', brand: 'forge', valerius: 'armory', eldrin: 'alchemy' };

export const TRADE: Record<VendorId, string> = {
  nira: 'Pieles, cueros, tela, armaduras ligeras y mochilas',
  vesper: 'Hierbas, pociones, vendas y remedios',
  garth: 'Comida, carne e ingredientes',
  orik: 'Metal, madera, chatarra y herramientas',
  grizk: 'Joyas, anillos, amuletos, gemas, tesoros y llaves',
  brand: 'Armas',
  valerius: 'Armaduras pesadas y escudos',
  eldrin: 'Pergaminos, esencias, reactivos y objetos mágicos',
};
export const PLACE: Record<VendorId, string> = {
  nira: 'El Mercado', vesper: 'La Enfermería', garth: 'La Cocina', orik: 'El Taller',
  grizk: 'La Lonja', brand: 'La Forja', valerius: 'La Armería', eldrin: 'El Laboratorio',
};
/** Cómo se llama lo que es en el aviso «Las X las compra…». */
const KIND: Record<VendorId, string> = {
  nira: 'Los cueros, las telas y la armadura ligera', vesper: 'Las pociones y los remedios', garth: 'La comida',
  orik: 'El metal, la madera y las herramientas', grizk: 'Las joyas y los tesoros', brand: 'Las armas',
  valerius: 'La armadura pesada y los escudos', eldrin: 'Los reactivos y los objetos mágicos',
};

const MAT: Partial<Record<VendorId, string[]>> = {
  nira: ['leather_scrap', 'tanned_leather', 'fireproof_leather', 'ragged_cloth', 'woven_cloth', 'shroud_cloth', 'ash_silk', 'strap'],
  vesper: ['bitter_herb'],
  garth: ['salted_meat', 'cave_mushroom', 'flour', 'goat_milk', 'sour_wine'],
  orik: ['scrap_metal', 'copper_ore', 'iron_ore', 'silver_ore', 'blessed_silver', 'obsidian_shard', 'old_wood', 'scrap_bar', 'copper_ingot',
    'iron_ingot', 'silver_ingot', 'obsidian_ingot', 'hellsteel', 'grip', 'haft', 'ancient_bone'],
};

/** Pesada: escudo, marcada a mano, o que solo la puedan llevar guerreros y clérigos. */
export function isHeavy(d: ItemDef): boolean {
  return d.category === 'shield' || !!d.heavy || (!!d.classes?.length && d.classes.every((c) => c === 'warrior' || c === 'cleric'));
}

/** El especialista de un objeto (sin mirar si su estación está en pie). */
export function buyerOf(itemId: string): VendorId {
  const d = getItem(itemId); const c = d.category;
  if (c === 'weapon') return 'brand';
  if (c === 'shield' || c === 'helmet' || c === 'armor' || c === 'gloves' || c === 'boots') return isHeavy(d) ? 'valerius' : 'nira';
  if (c === 'ring' || c === 'amulet' || c === 'jewel' || c === 'key' || c === 'coin') return 'grizk';
  if (c === 'relic') return !d.slot ? 'grizk' : /dagger/.test(d.id) ? 'brand' : /torch/.test(d.id) ? 'orik' : 'eldrin';
  if (c === 'potion') return d.use?.kind === 'need' ? 'garth' : d.use?.kind === 'bomb' ? 'eldrin' : 'vesper';
  if (c === 'tool') return 'orik';
  if (c === 'bag') return 'nira';
  if (c === 'blueprint') {
    const st = CRAFT_RECIPES.find((r) => r.blueprint === itemId)?.station;
    return (st && (STATIONS as Record<string, { by: VendorId }>)[st]?.by) || 'nira';
  }
  if (c === 'material') { for (const [v, l] of Object.entries(MAT)) if (l!.includes(itemId)) return v as VendorId; return 'eldrin'; }
  return 'nira';
}

/** ¿Está en marcha para comprar? (su estación reconstruida, o no depende de ninguna). */
export function buyerOpen(p: Pick<Profile, 'refuge'>, v: VendorId): boolean {
  const st = NEEDS[v];
  return !st || ((refugeOf(p) as unknown as Record<string, number>)[st] ?? 0) >= 1;
}

/** Quién lo compra hoy: el especialista, o Nira si el especialista aún no tiene su estación. */
export function whoBuys(p: Pick<Profile, 'refuge'>, itemId: string): VendorId {
  const b = buyerOf(itemId);
  return buyerOpen(p, b) ? b : 'nira';
}

/** Aviso al intentar vender algo al mercader equivocado. */
export function wrongBuyerText(name: string, p: Pick<Profile, 'refuge'>, itemId: string): string {
  const w = whoBuys(p, itemId);
  return `${name} no compra eso. ${KIND[buyerOf(itemId)]}: ${w === 'nira' && buyerOf(itemId) !== 'nira' ? 'de momento, Nira en El Mercado' : `${NAME[w]} en ${PLACE[w]}`}.`;
}
const NAME: Record<VendorId, string> = { nira: 'Nira', vesper: 'Hermana Vesper', garth: 'Garth', orik: 'Orik', grizk: 'Grizk', brand: 'Maese Brand', valerius: 'Valerius', eldrin: 'Eldrin' };
export const BUYER_NAME = NAME;
/** Iniciales para la esquina de la casilla. */
export const BUYER_TAG: Record<VendorId, string> = { nira: 'Ni', vesper: 'Ve', garth: 'Ga', orik: 'Or', grizk: 'Gr', brand: 'Br', valerius: 'Va', eldrin: 'El' };
/** Plus del especialista sobre el precio de venta (Grizk sigue con su ×1,25). */
export const SPECIALIST_BONUS = 1.1;
/** ¿Se puede vender a alguien? (monedas y equipo de recluta, no). */
export function sellable(itemId: string): boolean {
  const d = getItem(itemId);
  return !d.recruit && d.category !== 'coin' && d.category !== 'gold' && d.category !== 'cover';
}
