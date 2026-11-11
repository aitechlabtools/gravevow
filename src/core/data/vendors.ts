// ════════════════════════════════════════════════════════════════════
// Vendedores del refugio. Cada uno tiene su mercancía (con el rango de reputación que pide),
// sus misiones (data/quests.ts → vendor) y su propia reputación. Todo es editable.
// ════════════════════════════════════════════════════════════════════

export type VendorId = 'orvel' | 'vesper' | 'garra' | 'brand' | 'coleccionista';

export interface VendorDef {
  id: VendorId;
  name: string;
  role: string;
  blurb: string;
  /** Sprite del retrato (art.ts → MONSTER_SPECS). */
  sprite: string;
  color: string;
  /** Lo que vende: objeto y rango mínimo de reputación (0 = desde el principio). */
  stock: { itemId: string; rank: number }[];
  /** Puede comprar lo que le vendas. */
  buysItems: boolean;
}

export const VENDORS: Record<VendorId, VendorDef> = {
  orvel: {
    id: 'orvel', name: 'Orvel el Quincallero', role: 'Comerciante', sprite: 'vendor_orvel', color: '#e8b33a', buysItems: true,
    blurb: 'Se compra, se vende, no se pregunta. Si sobrevives, vuelve: a los buenos clientes les hago precio.',
    stock: [
      { itemId: 'health_potion', rank: 0 }, { itemId: 'mana_potion', rank: 0 }, { itemId: 'focus_tonic', rank: 0 }, { itemId: 'antidote', rank: 0 }, { itemId: 'bandage', rank: 0 }, { itemId: 'ration', rank: 0 }, { itemId: 'water', rank: 0 }, { itemId: 'iron_key', rank: 0 },
      { itemId: 'rusty_sword', rank: 0 }, { itemId: 'iron_sword', rank: 0 }, { itemId: 'battle_axe', rank: 0 }, { itemId: 'wooden_shield', rank: 0 }, { itemId: 'iron_shield', rank: 0 },
      { itemId: 'iron_helm', rank: 0 }, { itemId: 'chainmail', rank: 0 }, { itemId: 'gauntlets', rank: 0 },
      { itemId: 'apprentice_staff', rank: 0 }, { itemId: 'ember_staff', rank: 0 }, { itemId: 'arcane_tome', rank: 0 }, { itemId: 'wizard_hat', rank: 0 }, { itemId: 'linen_robe', rank: 0 },
      { itemId: 'leather_hood', rank: 0 }, { itemId: 'padded_tunic', rank: 0 }, { itemId: 'leather_gloves', rank: 0 }, { itemId: 'worn_boots', rank: 0 }, { itemId: 'copper_ring', rank: 0 }, { itemId: 'bone_amulet', rank: 0 },
      // Conocido
      { itemId: 'knight_sword', rank: 1 }, { itemId: 'executioner_axe', rank: 1 }, { itemId: 'frost_staff', rank: 1 }, { itemId: 'shadow_robe', rank: 1 }, { itemId: 'swift_boots', rank: 1 },
      // De confianza
      { itemId: 'sepulchral_sword', rank: 2 }, { itemId: 'headsman_axe', rank: 2 }, { itemId: 'ossuary_staff', rank: 2 }, { itemId: 'mourner_hood', rank: 2 }, { itemId: 'silver_gauntlets', rank: 2 },
      // Aliado
      { itemId: 'obsidian_sword', rank: 3 }, { itemId: 'sulfur_staff', rank: 3 }, { itemId: 'ash_cowl', rank: 3 },
      // Leyenda
      { itemId: 'veiled_ring', rank: 4 },
    ],
  },
  vesper: {
    id: 'vesper', name: 'Hermana Vesper', role: 'Relicaria de la orden', sprite: 'vendor_vesper', color: '#bfe0ff', buysItems: false,
    blurb: 'La orden guarda las llaves de lo que no debe abrirse y cose a los que vuelven del fondo. Demuéstrame que puedo confiarte una.',
    stock: [
      { itemId: 'antidote', rank: 0 }, { itemId: 'bone_amulet', rank: 0 },
      { itemId: 'bandage', rank: 0 }, { itemId: 'tourniquet', rank: 0 }, { itemId: 'splint', rank: 0 }, { itemId: 'hemostatic', rank: 1 }, { itemId: 'painkiller', rank: 1 }, { itemId: 'surgery_kit', rank: 1 },
      { itemId: 'iron_key', rank: 1 }, { itemId: 'ring_of_embers', rank: 1 },
      { itemId: 'bone_key', rank: 2 }, { itemId: 'reliquary_amulet', rank: 2 },
      { itemId: 'sulfur_key', rank: 3 }, { itemId: 'relic_key', rank: 3 }, { itemId: 'ember_ring', rank: 3 },
      { itemId: 'heart_of_umbravel', rank: 4 },
    ],
  },
  garra: {
    id: 'garra', name: 'Garra Roja', role: 'Capitana de mercenarios', sprite: 'vendor_garra', color: '#ff6a5a', buysItems: false,
    blurb: 'Mis espadas se alquilan, no se regalan. Caza lo que te pido y hablaremos de contratos.',
    stock: [
      { itemId: 'health_potion', rank: 0 }, { itemId: 'leather_gloves', rank: 0 },
      { itemId: 'gauntlets', rank: 1 }, { itemId: 'grave_boots', rank: 2 }, { itemId: 'demon_gauntlets', rank: 3 }, { itemId: 'cinder_boots', rank: 3 },
    ],
  },
  brand: {
    id: 'brand', name: 'Maese Brand', role: 'Herrero de la forja', sprite: 'vendor_brand', color: '#ff8a3a', buysItems: false,
    blurb: 'Tráeme metal del fondo y te haré algo que no se rompa. Cuanto más confíe en ti, mejores planos te enseño.',
    stock: [
      { itemId: 'miner_pick', rank: 0 }, { itemId: 'repair_kit', rank: 0 }, { itemId: 'bone_dust', rank: 0 }, { itemId: 'iron_shield', rank: 0 },
      { itemId: 'ancient_bone', rank: 1 }, { itemId: 'bastion_shield', rank: 1 }, { itemId: 'knight_helm', rank: 1 },
      { itemId: 'steel_pick', rank: 2 }, { itemId: 'blessed_silver', rank: 2 }, { itemId: 'headstone_shield', rank: 2 }, { itemId: 'silver_helm', rank: 2 },
      { itemId: 'obsidian_shard', rank: 3 }, { itemId: 'sulfur', rank: 3 }, { itemId: 'demonscale_shield', rank: 3 },
      { itemId: 'hellsteel_helm', rank: 4 },
    ],
  },
  coleccionista: {
    id: 'coleccionista', name: 'El Coleccionista', role: 'Duende prestamista', sprite: 'vendor_collector', color: '#7fd65a', buysItems: true,
    blurb: '¿Brilla? Entonces lo quiero. ¿No brilla? Entonces véndeme algo que brille. Y llévate un saco: el oro pesa.',
    stock: [
      { itemId: 'gold_pouch', rank: 0 }, { itemId: 'gold_sack', rank: 0 }, { itemId: 'backpack_30', rank: 0 }, { itemId: 'backpack_36', rank: 0 },
    ],
  },
};
export const VENDOR_ORDER: VendorId[] = ['orvel', 'vesper', 'garra', 'brand', 'coleccionista'];
