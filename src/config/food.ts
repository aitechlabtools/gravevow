// COMIDA Y BEBIDA (Bloque 1, fase 7). Todo alimento es positivo: ninguno resta ni da náusea.
// Lo cocinado rinde más que lo crudo. La cocina del bloque 2 leerá estos mismos valores.
// `sat`, `hyd` y `rest`: puntos que recupera de cada barra (0–100). `dish`: plato del Refugio (solo en el Bastión).

export interface FoodDef { sat?: number; hyd?: number; rest?: number; dish?: boolean; drink?: boolean }

export const FOOD: Record<string, FoodDef> = {
  // Crudo o de viaje (Garth)
  stale_bread: { sat: 20 },
  wrinkled_apple: { sat: 10, hyd: 10 },
  ration: { sat: 30 },
  jerky: { sat: 35 },
  aged_cheese: { sat: 25, rest: 3 },
  // Bebidas
  water: { hyd: 30, drink: true },
  watered_wine: { hyd: 20, rest: 5, drink: true },
  bitter_tea: { hyd: 25, rest: 3, drink: true },
  // Cocinado en el Refugio: rinde más
  hearty_stew: { sat: 40, hyd: 10, dish: true },
  spiced_broth: { sat: 10, hyd: 30, dish: true, drink: true },
};

/** Uso del objeto a partir de los datos de comida. */
export function foodUse(id: string) {
  const f = FOOD[id];
  return { kind: 'need' as const, sat: f.sat, hyd: f.hyd, rest: f.rest, ...(f.dish ? { dish: true } : {}) };
}
