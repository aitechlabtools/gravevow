// ATAQUES ANUNCIADOS (Fase 8 de la expansión). Valores de prueba del plan maestro (apartados 24 y 25).

/** Defenderse ante un ataque anunciado: además de la guardia normal (mitad de daño), este multiplicador. Total: 25 %. */
export const DEFEND_TELEGRAPHED = 0.5;

/** Daño que recibe un enemigo expuesto (tras descargar su ataque, mientras se recupera). */
export const EXPOSED_MULT = 1.5;

/** Recurso que roba una absorción anunciada (parte del máximo). Un golpe que impacta la corta. */
export const DRAIN_PCT = 0.35;

/** Umbrales de vida de las fases de los jefes regionales (fase 2 y fase 3). */
export const BOSS_PHASE_AT = [0.66, 0.33] as const;

/** Auxiliar que llama un jefe: vida y ataque respecto a la criatura normal de su nivel. */
export const AUX_SCALE = 0.35;
