// ════════════════════════════════════════════════════════════════════
// Refugio (Fase 9): módulos con niveles que se mejoran con materiales extraídos y oro, al momento (sin esperas).
// Recetas de la cocina: ingredientes, resultado y los pasos del fogón. Todo editable.
// ════════════════════════════════════════════════════════════════════
import type { VendorId } from './vendors';
import type { Need } from '../../config/needs';

export type ModuleId = 'cot' | 'kitchen' | 'bench' | 'infirmary' | 'alchemy';

export interface ModuleLevel {
  name: string;
  /** Qué hace este nivel (se lee antes de pagar). */
  effect: string;
  /** Coste para llegar a este nivel (el nivel 0 no cuesta). */
  cost?: { items: { itemId: string; qty: number }[]; gold: number; by: VendorId };
}

export interface ModuleDef { id: ModuleId; name: string; blurb: string; levels: ModuleLevel[] }

export const MODULES: Record<ModuleId, ModuleDef> = {
  cot: {
    id: 'cot', name: 'Catre', blurb: 'Donde se duerme sin soñar con el fondo.',
    levels: [
      { name: 'Catre de paja', effect: 'Dormir recupera todo el Descanso, gratis.' },
      { name: 'Catre con jergón', effect: 'Dormir, además, te deja preparado: en la siguiente incursión gastas un 10 % menos de Descanso.', cost: { items: [{ itemId: 'scrap_metal', qty: 4 }, { itemId: 'leather_scrap', qty: 6 }], gold: 60, by: 'orik' } },
    ],
  },
  kitchen: {
    id: 'kitchen', name: 'Cocina', blurb: 'Un fogón propio, lejos de las ollas comunes.',
    levels: [
      { name: 'Sin fogón', effect: 'Solo el rancho comunitario.' },
      { name: 'Fogón', effect: 'Garth te enseña el Guiso del Bastión.', cost: { items: [{ itemId: 'copper_ore', qty: 2 }], gold: 40, by: 'garth' } },
      { name: 'Despensa de especias', effect: 'Garth te enseña el Caldo especiado.', cost: { items: [{ itemId: 'scrap_metal', qty: 6 }, { itemId: 'leather_scrap', qty: 4 }], gold: 100, by: 'orik' } },
    ],
  },
  bench: {
    id: 'bench', name: 'Banco de trabajo', blurb: 'Tornillo, lima y un mazo de madera.',
    levels: [
      { name: 'Sin banco', effect: 'Desguazas en el taller de Orik con su rendimiento normal.' },
      { name: 'Banco de trabajo', effect: 'Desguazar rinde un 25 % más de materiales.', cost: { items: [{ itemId: 'scrap_metal', qty: 8 }], gold: 50, by: 'orik' } },
    ],
  },
  infirmary: {
    id: 'infirmary', name: 'Rincón de cura', blurb: 'Hilo hervido, tablillas y un cubo que nadie quiere vaciar.',
    levels: [
      { name: 'Sin rincón', effect: 'Las vendas y férulas se compran a Vesper.' },
      { name: 'Rincón de cura', effect: 'Vesper te enseña a preparar vendas, torniquetes y férulas con retales y chatarra.', cost: { items: [{ itemId: 'leather_scrap', qty: 6 }, { itemId: 'water', qty: 2 }], gold: 60, by: 'vesper' } },
    ],
  },
  alchemy: {
    id: 'alchemy', name: 'Mesa de alquimia', blurb: 'Redomas que no casan y un quemador que tose.',
    levels: [
      { name: 'Sin mesa', effect: 'Las pociones se compran a Eldrin.' },
      { name: 'Mesa de alquimia', effect: 'Eldrin te enseña a destilar antídotos y tónicos con esquirlas arcanas.', cost: { items: [{ itemId: 'arcane_shard', qty: 4 }, { itemId: 'scrap_metal', qty: 4 }], gold: 120, by: 'eldrin' } },
    ],
  },
};
export const MODULE_ORDER: ModuleId[] = ['cot', 'kitchen', 'bench', 'infirmary', 'alchemy'];

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
