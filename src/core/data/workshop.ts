// ════════════════════════════════════════════════════════════════════
// Taller (Fase 9): el yunque de Maese Brand, la mesa de alquimia de Eldrin y el rincón de cura de Vesper.
// Forja y alquimia comparten mecánica: cada paso enseña una lectura (temperatura o densidad) y una franja; se aviva,
// se mantiene o se rebaja. Nada de reflejos: se decide leyendo. Todo editable.
// ════════════════════════════════════════════════════════════════════

export type Station = 'forge' | 'alchemy';
export type Move = 'up' | 'hold' | 'down';

export interface StationDef {
  /** Qué se lee en cada paso y su unidad. */
  reading: string;
  unit: string;
  /** Rótulo de cada decisión. */
  moves: Record<Move, string>;
  /** Cuánto se aleja la lectura de la franja (como máximo) en cada paso. */
  spread: number;
  /** Las lecturas se redondean a este paso para que se lean bien. */
  round: number;
}

export const STATIONS: Record<Station, StationDef> = {
  forge: { reading: 'El metal marca', unit: '°', moves: { up: 'Avivar el fuelle', hold: 'Golpear', down: 'Dejar que respire' }, spread: 160, round: 10 },
  alchemy: { reading: 'La mezcla marca', unit: ' de densidad', moves: { up: 'Añadir reactivo', hold: 'Remover', down: 'Diluir con agua' }, spread: 30, round: 1 },
};

/** Franjas de la forja: las armas y las piezas de protección se trabajan a temperaturas distintas. */
export const FORGE_BANDS = { weapon: [820, 900], armor: [760, 840] } as const;
/** Golpes (pasos) del yunque: un arma pide tres; una pieza de protección, cuatro. */
export const FORGE_STEPS = { weapon: 3, armor: 4 } as const;

export interface AlchemyRecipe {
  id: string;
  name: string;
  result: string;
  qty: number;
  /** Nivel de la mesa de alquimia del Refugio que la enseña. */
  level: number;
  ingredients: { itemId: string; qty: number }[];
  /** Franja de densidad buena. */
  band: [number, number];
  steps: number;
}

export const ALCHEMY: AlchemyRecipe[] = [
  { id: 'a_antidote', name: 'Antídoto destilado', result: 'antidote', qty: 1, level: 1, ingredients: [{ itemId: 'cave_mushroom', qty: 2 }, { itemId: 'arcane_shard', qty: 1 }], band: [40, 50], steps: 3 },
  { id: 'a_mana', name: 'Poción de maná', result: 'mana_potion', qty: 1, level: 1, ingredients: [{ itemId: 'arcane_shard', qty: 2 }, { itemId: 'water', qty: 1 }], band: [55, 65], steps: 3 },
  { id: 'a_focus', name: 'Tónico de concentración', result: 'focus_tonic', qty: 1, level: 1, ingredients: [{ itemId: 'arcane_shard', qty: 1 }, { itemId: 'cave_mushroom', qty: 1 }, { itemId: 'water', qty: 1 }], band: [62, 70], steps: 2 },
];

/** Rincón de cura: preparación sencilla, sin minijuego, por lotes. */
export interface CareRecipe { id: string; result: string; qty: number; ingredients: { itemId: string; qty: number }[]; gold: number }
export const CARE: CareRecipe[] = [
  { id: 'c_bandage', result: 'bandage', qty: 2, ingredients: [{ itemId: 'leather_scrap', qty: 2 }, { itemId: 'water', qty: 1 }], gold: 1 },
  { id: 'c_tourniquet', result: 'tourniquet', qty: 1, ingredients: [{ itemId: 'leather_scrap', qty: 3 }], gold: 1 },
  { id: 'c_splint', result: 'splint', qty: 1, ingredients: [{ itemId: 'scrap_metal', qty: 2 }, { itemId: 'leather_scrap', qty: 2 }], gold: 1 },
];

export function getAlchemy(id: string): AlchemyRecipe {
  const r = ALCHEMY.find((x) => x.id === id);
  if (!r) throw new Error(`Receta de alquimia desconocida: ${id}`);
  return r;
}
export function getCare(id: string): CareRecipe {
  const r = CARE.find((x) => x.id === id);
  if (!r) throw new Error(`Preparación desconocida: ${id}`);
  return r;
}
