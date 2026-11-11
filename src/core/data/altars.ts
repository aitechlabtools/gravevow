// Pactos de los altares (Fase 7). Beneficio y precio a la vista antes de aceptar; uno activo como máximo; dura el resto de la incursión.
// Valores de prueba (plan maestro, sección 28): el precio es como mucho un 10 % del máximo de Ímpetu o Maná.
export interface PactDef {
  id: string;
  name: string;
  /** Lo que da, en una línea. */
  boon: string;
  /** Lo que cuesta, en una línea. */
  price: string;
  /** Multiplicadores de atributos mientras dura. */
  mult: Partial<Record<'atk' | 'mag' | 'def' | 'res', number>>;
  /** Parte del máximo de Ímpetu o Maná que se pierde (se suma al recorte de las necesidades, con techo). */
  mpLoss: number;
}

export const PACTS: Record<string, PactDef> = {
  iron: { id: 'iron', name: 'Pacto del hierro', boon: '+20 % de defensa y resistencia mágica', price: '−10 % del máximo de Ímpetu o Maná', mult: { def: 1.2, res: 1.2 }, mpLoss: 0.1 },
  blood: { id: 'blood', name: 'Pacto de la sangre', boon: '+15 % de ataque y poder mágico', price: '−10 % del máximo de Ímpetu o Maná', mult: { atk: 1.15, mag: 1.15 }, mpLoss: 0.1 },
};
export const PACT_IDS = Object.keys(PACTS);
/** El precio con el nombre del recurso de la clase («Ímpetu» o «Maná») en vez de los dos. */
export const pactPrice = (pact: PactDef, resourceName: string): string => pact.price.replace('Ímpetu o Maná', resourceName);
export const getPact = (id: string | null | undefined): PactDef | null => (id && PACTS[id]) || null;
