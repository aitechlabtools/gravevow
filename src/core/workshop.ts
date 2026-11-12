// ════════════════════════════════════════════════════════════════════
// Taller: restos de los minijuegos (bloque 2, fase 3). El yunque, la mezcla y el fogón ya no existen: todo se fabrica
// con el menú de crafteo común (`core/crafting.ts`). Solo queda lo necesario para entregar un trabajo que una partida
// antigua dejó a medias (`settlePendingJobs`).
// ════════════════════════════════════════════════════════════════════
import type { Profile } from './types';
import { getAlchemy } from './data/workshop';
import { recipe as forgeRecipe } from './forge';

export type WorkshopJob = NonNullable<Profile['workshop']>;

/** Qué objeto entregaba un trabajo antiguo del yunque o de la mesa. */
export function jobResult(job: Pick<WorkshopJob, 'station' | 'recipe'>): string {
  return job.station === 'alchemy' ? getAlchemy(job.recipe).result : forgeRecipe(job.recipe).result;
}
