// Reloj de juego («pulso»): cuenta solo el tiempo de juego activo. No avanza en los menús, con la
// pestaña oculta ni con la ventana dormida. Lo usarán la saciedad, la hidratación, el descanso y el
// sangrado (fases siguientes de la expansión). Lógica pura: quien llama decide si está en pausa.

/** Duración de un pulso en milisegundos de juego activo. */
export const PULSE_MS = 1000;
/** Salto máximo entre dos lecturas: si pasa más (pestaña dormida, equipo en reposo), no se cuenta. */
export const MAX_STEP_MS = 1000;

export interface GameClock {
  /** Tiempo de juego activo acumulado (ms). */
  ms: number;
  /** Pulsos completos transcurridos. */
  pulses: number;
  /** Última lectura del reloj real; null tras una pausa (al reanudar no se cuenta el hueco). */
  last: number | null;
}

export function newClock(): GameClock {
  return { ms: 0, pulses: 0, last: null };
}

/** Avanza el reloj hasta `now`. Devuelve el reloj nuevo y cuántos pulsos nuevos han pasado. */
export function advanceClock(c: GameClock, now: number, paused: boolean): { clock: GameClock; pulses: number } {
  if (paused) return { clock: c.last === null ? c : { ...c, last: null }, pulses: 0 };
  if (c.last === null || now < c.last) return { clock: { ...c, last: now }, pulses: 0 };
  const step = Math.min(now - c.last, MAX_STEP_MS);
  const ms = c.ms + step;
  const total = Math.floor(ms / PULSE_MS);
  return { clock: { ms, pulses: total, last: now }, pulses: total - c.pulses };
}
