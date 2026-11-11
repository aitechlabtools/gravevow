// Misiones de los vendedores. Completar una da oro, experiencia y reputación con quien la encarga.
// Las repetibles vuelven a estar disponibles al cobrarlas. Todo es editable.
import type { VendorId } from './vendors';

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  vendor: VendorId;
  /** kill: derrotar criaturas · kill_boss: un jefe · extract: extraer con vida · extract_value: extraer botín por valor ·
   *  extract_zone: extraer desde una zona · deliver: entregar objetos (se gastan al cobrar) · open_chest: abrir cofres de un tipo */
  type: 'kill' | 'extract' | 'extract_value' | 'kill_boss' | 'extract_zone' | 'deliver' | 'open_chest' | 'mine';
  target?: string;
  count: number;
  reward: { gold: number; xp: number; rep: number };
  /** Nivel mínimo para que te la ofrezcan. */
  minLevel?: number;
  repeatable?: boolean;
}

export const QUESTS: QuestDef[] = [
  // ── Nira (antes, encargos de Orvel) ──
  { id: 'q_first_escape', vendor: 'nira', name: 'Volver para contarlo', description: 'Extrae con vida de una expedición.', type: 'extract', count: 1, reward: { gold: 3, xp: 30, rep: 40 } },
  { id: 'q_treasure', vendor: 'nira', name: 'Ojos de urraca', description: 'Extrae botín por valor de 25 monedas o más en una expedición.', type: 'extract_value', count: 25, reward: { gold: 6, xp: 50, rep: 60 } },
  { id: 'q_orvel_iron', vendor: 'nira', name: 'Cerraduras oxidadas', description: 'Abre 2 cofres de hierro en la Mazmorra.', type: 'open_chest', target: 'rich', count: 2, reward: { gold: 8, xp: 80, rep: 70 } },
  { id: 'q_orvel_coins', vendor: 'nira', name: 'Numismático', description: 'Entrega 10 monedas antiguas.', type: 'deliver', target: 'old_coin', count: 10, reward: { gold: 12, xp: 40, rep: 40 }, repeatable: true },
  { id: 'q_orvel_crypt', vendor: 'nira', name: 'Comercio sepulcral', description: 'Extrae botín por valor de 150 monedas en una expedición.', type: 'extract_value', count: 150, reward: { gold: 30, xp: 600, rep: 120 }, minLevel: 30 },
  { id: 'q_orvel_hell', vendor: 'nira', name: 'Mercancía caliente', description: 'Extrae con vida desde el Infierno.', type: 'extract_zone', target: 'infierno', count: 1, reward: { gold: 60, xp: 2000, rep: 200 }, minLevel: 60 },
  // ── Hermana Vesper ──
  { id: 'q_bones', vendor: 'vesper', name: 'Polvo eres', description: 'Derrota a 3 esqueletos guerreros.', type: 'kill', target: 'skeleton', count: 3, reward: { gold: 4, xp: 40, rep: 50 } },
  { id: 'q_lord', vendor: 'vesper', name: 'El trono vacío', description: 'Derrota al Señor del Osario.', type: 'kill_boss', target: 'ossuary_lord', count: 1, reward: { gold: 12, xp: 100, rep: 150 } },
  { id: 'q_vesper_wraiths', vendor: 'vesper', name: 'Silenciar el lamento', description: 'Derrota a 5 espectros lamentadores.', type: 'kill', target: 'wraith', count: 5, reward: { gold: 22, xp: 700, rep: 120 }, minLevel: 30 },
  { id: 'q_vesper_ecto', vendor: 'vesper', name: 'Relicario vacío', description: 'Entrega 5 de ectoplasma.', type: 'deliver', target: 'ectoplasm', count: 5, reward: { gold: 15, xp: 300, rep: 60 }, minLevel: 30, repeatable: true },
  { id: 'q_vesper_queen', vendor: 'vesper', name: 'Levantar el velo', description: 'Derrota a la Reina Velada.', type: 'kill_boss', target: 'veiled_queen', count: 1, reward: { gold: 50, xp: 1500, rep: 250 }, minLevel: 30 },
  { id: 'q_vesper_belzar', vendor: 'vesper', name: 'Romper las cadenas', description: 'Derrota a Belzar, Señor de las Cadenas.', type: 'kill_boss', target: 'belzar', count: 1, reward: { gold: 120, xp: 5000, rep: 400 }, minLevel: 60 },
  // ── Garth, cocinero y cazador (antes, encargos de Garra Roja) ──
  { id: 'q_garra_bandits', vendor: 'garth', name: 'Competencia desleal', description: 'Derrota a 5 bandidos saqueadores.', type: 'kill', target: 'bandit', count: 5, reward: { gold: 7, xp: 90, rep: 60 } },
  { id: 'q_garra_rats', vendor: 'garth', name: 'Plaga', description: 'Derrota a 6 ratas de osario.', type: 'kill', target: 'ossuary_rat', count: 6, reward: { gold: 5, xp: 60, rep: 35 }, repeatable: true },
  { id: 'q_garra_captain', vendor: 'garth', name: 'Descabezar la banda', description: 'Derrota al Capitán de bandidos.', type: 'kill', target: 'bandit_captain', count: 1, reward: { gold: 15, xp: 200, rep: 120 } },
  { id: 'q_garra_ghouls', vendor: 'garth', name: 'Limpieza de nichos', description: 'Derrota a 6 necrófagos.', type: 'kill', target: 'ghoul', count: 6, reward: { gold: 24, xp: 800, rep: 120 }, minLevel: 30 },
  { id: 'q_garra_knight', vendor: 'garth', name: 'Duelo con un muerto', description: 'Derrota al Caballero del sepulcro.', type: 'kill', target: 'tomb_knight', count: 1, reward: { gold: 30, xp: 900, rep: 160 }, minLevel: 30 },
  { id: 'q_garra_hounds', vendor: 'garth', name: 'Perrera del abismo', description: 'Derrota a 6 canes del abismo.', type: 'kill', target: 'abyss_hound', count: 6, reward: { gold: 50, xp: 2200, rep: 180 }, minLevel: 60 },
  { id: 'q_garra_warden', vendor: 'garth', name: 'El carcelero', description: 'Derrota al Carcelero de cadenas.', type: 'kill', target: 'chain_warden', count: 1, reward: { gold: 60, xp: 2500, rep: 220 }, minLevel: 60 },
  // ── Maese Brand ──
  { id: 'q_brand_mine', vendor: 'brand', name: 'Manos a la roca', description: 'Pica 4 vetas de mineral (necesitas un pico).', type: 'mine', count: 4, reward: { gold: 7, xp: 60, rep: 60 }, repeatable: true },
  { id: 'q_brand_bone', vendor: 'brand', name: 'Polvo para el temple', description: 'Entrega 10 de polvo de hueso.', type: 'deliver', target: 'bone_dust', count: 10, reward: { gold: 6, xp: 50, rep: 40 }, repeatable: true },
  { id: 'q_brand_wings', vendor: 'brand', name: 'Fuelles nuevos', description: 'Entrega 6 alas de murciélago.', type: 'deliver', target: 'bat_wing', count: 6, reward: { gold: 5, xp: 50, rep: 45 } },
  { id: 'q_brand_crypt', vendor: 'brand', name: 'Bajar a buscar metal', description: 'Extrae con vida desde la Cripta.', type: 'extract_zone', target: 'cripta', count: 1, reward: { gold: 25, xp: 700, rep: 120 }, minLevel: 30 },
  { id: 'q_brand_silver', vendor: 'brand', name: 'Plata para la orden', description: 'Entrega 6 de plata bendita.', type: 'deliver', target: 'blessed_silver', count: 6, reward: { gold: 30, xp: 600, rep: 100 }, minLevel: 30, repeatable: true },
  { id: 'q_brand_obsidian', vendor: 'brand', name: 'Filo de obsidiana', description: 'Entrega 6 esquirlas de obsidiana.', type: 'deliver', target: 'obsidian_shard', count: 6, reward: { gold: 70, xp: 2000, rep: 160 }, minLevel: 60, repeatable: true },
];

/** Cuántas misiones puedes llevar aceptadas a la vez (entre todos los mercaderes). */
export const MAX_ACTIVE_QUESTS = 5;
/** Una misión pasa a «Encargos antiguos» cuando tu nivel supera en esto el de su zona (Mazmorra 1, Cripta 30, Infierno 60). */
export const OLD_QUEST_GAP = 39;
