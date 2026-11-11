// EXPLORACIÓN (Fase 7 de la expansión). Valores de prueba del plan maestro (apartados 27 y 28).
import type { ZoneId } from '../core/data/zones/types';

/** Desde qué subzona (índice 1–10) aparece cada cosa. S1 enseña el secreto y las trampas; S2 añade el atajo y la sala con llave; S3, los altares. */
export const EXPLORE_FROM = { secret: 1, vault: 2, shortcut: 2, altar: 3 };

/** Segundos quieto para cada tarea (se cancela al moverse). Equivalen a los pulsos del plan: desarmar a mano, 3; abrir, 1–2. */
export const EXPLORE_SECONDS = { disarm: 3, secret: 1.5, gate: 2 };

/** Daño de una trampa al saltar (igual que antes). Una trampa salta una sola vez y no se rearma. */
export const TRAP_DAMAGE = 10;

/** Llave de cada zona para su sala cerrada (se gasta al abrir). */
export const VAULT_KEY: Record<ZoneId, string> = { mazmorra: 'iron_key', cripta: 'bone_key', infierno: 'sulfur_key' };

/** Nombres de las salas especiales por zona (propuestas del plan maestro, sección 27). */
export const SPECIAL_ROOMS: Record<ZoneId, { secret: string; vault: string }> = {
  mazmorra: { secret: 'Alijo del contrabandista', vault: 'Armería del portero' },
  cripta: { secret: 'Osario del cartógrafo', vault: 'Cámara del juramento roto' },
  infierno: { secret: 'Archivo de las cenizas', vault: 'Depósito de vidrio negro' },
};

/** Pactos y recursos: el recorte por necesidades y el del pacto se suman con este techo. */
export const RESOURCE_LOSS_CAP = 0.3;
