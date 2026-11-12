// ════════════════════════════════════════════════════════════════════
// Refugio: estaciones con 3 niveles (config/stations.ts), que construye su encargado al momento.
// Recetas de la cocina: ingredientes, resultado y los pasos del fogón. Todo editable.
// ════════════════════════════════════════════════════════════════════
import type { Need } from '../../config/needs';

import { STATIONS, STATION_ORDER, type StationId, type StationDef } from '../../config/stations';

/** Estaciones del Refugio (bloque 2, parte 2.1): los datos editables están en config/stations.ts. */
export type ModuleId = StationId;
export type ModuleDef = StationDef;
export const MODULES = STATIONS;
export const MODULE_ORDER: ModuleId[] = STATION_ORDER;

/** Fuego de cada paso de la cocina. */
export type Heat = 'low' | 'mid' | 'high';
export const HEAT_NAME: Record<Heat, string> = { low: 'Fuego bajo', mid: 'Fuego medio', high: 'Fuego vivo' };

/** Lo que puede pasar en el fogón en cada paso y el fuego que lo arregla (se lee en pantalla: nada oculto). */
export const COOK_EVENTS: { text: string; heat: Heat }[] = [
  { text: 'El fondo empieza a pegarse.', heat: 'low' },
  { text: 'El caldo apenas tiembla.', heat: 'high' },
  { text: 'Hierve a borbotones y salpica.', heat: 'low' },
  { text: 'La carne aún suelta sangre.', heat: 'high' },
  { text: 'Burbujea despacio, como debe.', heat: 'mid' },
  { text: 'El aroma sube, pero el centro sigue frío.', heat: 'mid' },
];

export interface DishRecipe {
  id: string;
  name: string;
  /** Nivel de cocina que la enseña. */
  kitchen: number;
  ingredients: { itemId: string; qty: number }[];
  result: string;
  /** Ventaja de preparación para la siguiente incursión. */
  prep: Need[];
  /** Pasos del fogón. */
  steps: number;
}

export const DISHES: DishRecipe[] = [
  { id: 'stew', name: 'Guiso del Bastión', kitchen: 1, ingredients: [{ itemId: 'salted_meat', qty: 1 }, { itemId: 'cave_mushroom', qty: 1 }, { itemId: 'water', qty: 1 }], result: 'hearty_stew', prep: ['rest'], steps: 3 },
  { id: 'broth', name: 'Caldo especiado', kitchen: 2, ingredients: [{ itemId: 'cave_mushroom', qty: 2 }, { itemId: 'water', qty: 1 }], result: 'spiced_broth', prep: ['sat', 'hyd'], steps: 2 },
];
export function getDish(id: string): DishRecipe {
  const d = DISHES.find((x) => x.id === id);
  if (!d) throw new Error(`Receta desconocida: ${id}`);
  return d;
}
export function dishOfItem(itemId: string): DishRecipe | undefined {
  return DISHES.find((d) => d.result === itemId);
}
