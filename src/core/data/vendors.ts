// ════════════════════════════════════════════════════════════════════
// Los ocho mercaderes del Bastión (plan maestro, sección 13). Cada uno tiene su lugar, su mercancía (con el rango de
// reputación que pide), sus misiones (data/quests.ts → vendor) y su propia reputación. Los que no están desde el
// principio llegan cuando abres su subzona (core/vendors.ts → vendorUnlocked). Todo es editable.
// ════════════════════════════════════════════════════════════════════
import type { SubzoneId } from './subzones';

export type VendorId = 'vesper' | 'garth' | 'nira' | 'orik' | 'grizk' | 'brand' | 'valerius' | 'eldrin';
export type PlaceId = 'enfermeria' | 'cocina' | 'mercado' | 'taller' | 'lonja' | 'forja' | 'laboratorio';

export interface VendorDef {
  id: VendorId;
  name: string;
  role: string;
  blurb: string;
  /** Sprite del retrato (art.ts → MONSTER_SPECS). */
  sprite: string;
  color: string;
  /** Lugar del Bastión donde se le encuentra. */
  place: PlaceId;
  /** Subzona que hay que tener abierta para que llegue (sin valor: desde el principio). */
  unlockAt?: SubzoneId;
  /** Lo que vende: objeto y rango mínimo de reputación (0 = desde el principio). */
  stock: { itemId: string; rank: number }[];
  /** Puede comprar lo que le vendas. */
  buysItems: boolean;
}

export const PLACES: Record<PlaceId, { name: string; blurb: string }> = {
  enfermeria: { name: 'La enfermería', blurb: 'Huele a vinagre y a sangre vieja.' },
  cocina: { name: 'La cocina', blurb: 'El único fuego del Bastión que no quema a nadie.' },
  mercado: { name: 'El mercado', blurb: 'Tenderetes bajo la muralla rota.' },
  taller: { name: 'El taller', blurb: 'Chatarra ordenada por alguien que sabe lo que vale.' },
  lonja: { name: 'La lonja', blurb: 'Aquí se pesa el oro y se alquilan espadas.' },
  forja: { name: 'La forja', blurb: 'Yunques que no descansan.' },
  laboratorio: { name: 'El laboratorio', blurb: 'Redomas, azufre y humo de colores.' },
};

export const VENDORS: Record<VendorId, VendorDef> = {
  vesper: {
    id: 'vesper', name: 'Hermana Vesper', role: 'Sanadora de la orden', sprite: 'vendor_vesper', color: '#bfe0ff', place: 'enfermeria', buysItems: false,
    blurb: 'La orden guarda las llaves de lo que no debe abrirse y cose a los que vuelven del fondo. Demuéstrame que puedo confiarte una.',
    stock: [
      { itemId: 'health_potion', rank: 0 }, { itemId: 'mana_potion', rank: 0 }, { itemId: 'focus_tonic', rank: 0 }, { itemId: 'antidote', rank: 0 },
      { itemId: 'bandage', rank: 0 }, { itemId: 'tourniquet', rank: 0 }, { itemId: 'splint', rank: 0 }, { itemId: 'bone_amulet', rank: 0 }, { itemId: 'iron_key', rank: 0 },
      { itemId: 'hemostatic', rank: 1 }, { itemId: 'painkiller', rank: 1 }, { itemId: 'surgery_kit', rank: 1 }, { itemId: 'ring_of_embers', rank: 1 },
      { itemId: 'bone_key', rank: 2 }, { itemId: 'reliquary_amulet', rank: 2 },
      { itemId: 'sulfur_key', rank: 3 }, { itemId: 'relic_key', rank: 3 },
      { itemId: 'heart_of_umbravel', rank: 4 },
    ],
  },
  garth: {
    id: 'garth', name: 'Garth', role: 'Cocinero y cazador', sprite: 'vendor_garth', color: '#d9a066', place: 'cocina', buysItems: false,
    blurb: 'Abajo nadie te da de comer. Tráeme pieles y colmillos de lo que cazas y no volverás con el estómago vacío.',
    stock: [{ itemId: 'ration', rank: 0 }, { itemId: 'water', rank: 0 }],
  },
  nira: {
    id: 'nira', name: 'Nira', role: 'Curtidora y tendera', sprite: 'vendor_nira', color: '#e8b33a', place: 'mercado', buysItems: true,
    blurb: 'Cuero, capas y lo que dejan en consignación los que ya no bajan. Te compro lo que traigas: todo tiene un precio.',
    stock: [
      // Depósito en consignación: equipo común de guerrero y mago
      { itemId: 'rusty_sword', rank: 0 }, { itemId: 'iron_sword', rank: 0 }, { itemId: 'battle_axe', rank: 0 }, { itemId: 'wooden_shield', rank: 0 }, { itemId: 'iron_shield', rank: 0 },
      { itemId: 'iron_helm', rank: 0 }, { itemId: 'chainmail', rank: 0 }, { itemId: 'gauntlets', rank: 0 },
      { itemId: 'apprentice_staff', rank: 0 }, { itemId: 'ember_staff', rank: 0 }, { itemId: 'arcane_tome', rank: 0 }, { itemId: 'wizard_hat', rank: 0 }, { itemId: 'linen_robe', rank: 0 },
      // Lo suyo: cuero y equipo ligero
      { itemId: 'leather_hood', rank: 0 }, { itemId: 'padded_tunic', rank: 0 }, { itemId: 'leather_gloves', rank: 0 }, { itemId: 'worn_boots', rank: 0 }, { itemId: 'copper_ring', rank: 0 },
      // Para el oro y el campo (hasta que llegan Grizk y Orik)
      { itemId: 'gold_pouch', rank: 0 }, { itemId: 'gold_sack', rank: 0 }, { itemId: 'miner_pick', rank: 0 }, { itemId: 'repair_kit', rank: 0 },
      { itemId: 'shadow_robe', rank: 1 }, { itemId: 'swift_boots', rank: 1 },
      { itemId: 'mourner_hood', rank: 2 }, { itemId: 'silver_gauntlets', rank: 2 },
      { itemId: 'ash_cowl', rank: 3 },
      { itemId: 'veiled_ring', rank: 4 },
    ],
  },
  orik: {
    id: 'orik', name: 'Orik', role: 'Chatarrero del taller', sprite: 'vendor_orik', color: '#9fb4c8', place: 'taller', unlockAt: 'castillo', buysItems: false,
    blurb: 'Lo que tú llamas basura, yo lo llamo piezas. Algún día este Bastión tendrá muros de verdad.',
    stock: [
      { itemId: 'miner_pick', rank: 0 }, { itemId: 'repair_kit', rank: 0 }, { itemId: 'bone_dust', rank: 0 },
      { itemId: 'ancient_bone', rank: 1 }, { itemId: 'steel_pick', rank: 2 },
    ],
  },
  grizk: {
    id: 'grizk', name: 'Grizk', role: 'Prestamista y corredor de espadas', sprite: 'vendor_collector', color: '#7fd65a', place: 'lonja', unlockAt: 'calabozos', buysItems: true,
    blurb: '¿Brilla? Entonces lo quiero. ¿Necesitas espadas? Se alquilan, no se regalan. Y llévate un saco: el oro pesa.',
    stock: [
      { itemId: 'gold_pouch', rank: 0 }, { itemId: 'gold_sack', rank: 0 }, { itemId: 'backpack_30', rank: 0 }, { itemId: 'backpack_36', rank: 0 },
    ],
  },
  brand: {
    id: 'brand', name: 'Maese Brand', role: 'Herrero de armas', sprite: 'vendor_brand', color: '#ff8a3a', place: 'forja', unlockAt: 'osario', buysItems: false,
    blurb: 'Tráeme metal del fondo y te haré algo que no se rompa. Cuanto más confíe en ti, mejores planos te enseño.',
    stock: [
      { itemId: 'repair_kit', rank: 0 }, { itemId: 'bone_dust', rank: 0 },
      { itemId: 'knight_sword', rank: 1 }, { itemId: 'executioner_axe', rank: 1 }, { itemId: 'frost_staff', rank: 1 }, { itemId: 'ancient_bone', rank: 1 },
      { itemId: 'sepulchral_sword', rank: 2 }, { itemId: 'headsman_axe', rank: 2 }, { itemId: 'ossuary_staff', rank: 2 }, { itemId: 'blessed_silver', rank: 2 },
      { itemId: 'obsidian_sword', rank: 3 }, { itemId: 'sulfur_staff', rank: 3 }, { itemId: 'obsidian_shard', rank: 3 }, { itemId: 'sulfur', rank: 3 },
    ],
  },
  valerius: {
    id: 'valerius', name: 'Valerius', role: 'Armero de placas', sprite: 'vendor_valerius', color: '#c8ccd8', place: 'forja', unlockAt: 'catacumbas', buysItems: false,
    blurb: 'Una espada mata una vez. Un buen escudo te salva cien. Elige bien lo que llevas encima.',
    stock: [
      { itemId: 'iron_shield', rank: 0 }, { itemId: 'gauntlets', rank: 0 },
      { itemId: 'bastion_shield', rank: 1 }, { itemId: 'knight_helm', rank: 1 },
      { itemId: 'headstone_shield', rank: 2 }, { itemId: 'silver_helm', rank: 2 }, { itemId: 'grave_boots', rank: 2 },
      { itemId: 'demonscale_shield', rank: 3 }, { itemId: 'demon_gauntlets', rank: 3 }, { itemId: 'cinder_boots', rank: 3 },
      { itemId: 'hellsteel_helm', rank: 4 },
    ],
  },
  eldrin: {
    id: 'eldrin', name: 'Eldrin', role: 'Alquimista', sprite: 'vendor_eldrin', color: '#b58cff', place: 'laboratorio', unlockAt: 'carmesi', buysItems: false,
    blurb: 'El fuego de abajo no se apaga con agua. Con azufre, paciencia y la mezcla justa, quizá.',
    stock: [
      { itemId: 'mana_potion', rank: 0 }, { itemId: 'focus_tonic', rank: 0 }, { itemId: 'antidote', rank: 0 }, { itemId: 'painkiller', rank: 0 },
      { itemId: 'sulfur', rank: 1 }, { itemId: 'ember_ring', rank: 2 },
    ],
  },
};
export const VENDOR_ORDER: VendorId[] = ['vesper', 'garth', 'nira', 'orik', 'grizk', 'brand', 'valerius', 'eldrin'];
export const isVendorId = (v: unknown): v is VendorId => typeof v === 'string' && v in VENDORS;
