// Subzonas: lo que se ajusta a mano. Los datos de cada subzona están en core/data/subzones.ts.

/**
 * Bajar a una subzona muy por debajo de tu nivel da menos experiencia y oro, para que compense jugar a tu nivel.
 * `over` = cuántos niveles pasas del máximo de la subzona. Se aplica el primer tramo que cumplas (de mayor a menor).
 */
export const OVERLEVEL_PENALTY: { over: number; xp: number; gold: number }[] = [
  { over: 10, xp: 0.1, gold: 0.5 },
  { over: 5, xp: 0.5, gold: 0.75 },
];

export function overlevelPenalty(subzoneMax: number, playerLevel: number): { xp: number; gold: number } | null {
  const over = playerLevel - subzoneMax;
  return OVERLEVEL_PENALTY.find((t) => over >= t.over) ?? null;
}

// ── Curva de niveles (plan, sección 3) ──

/** Niveles que se suman al de la criatura: salas hondas, élite y jefe. Nunca pasan del máximo de la subzona + este valor. */
export const LEVEL_BONUS = { depth: [0, 0, 1, 1, 2] as number[], elite: 2, boss: 3 };
export function depthBonus(depth: number): number {
  const d = LEVEL_BONUS.depth;
  return d[Math.min(d.length - 1, Math.max(0, depth))];
}

/**
 * Las criaturas de la Cripta y del Infierno tenían más vida y defensa de base que las de la Mazmorra, y al cambiar de
 * zona la dificultad pegaba un salto. Estos factores igualan las bases de las criaturas comunes de cada zona.
 */
export const ZONE_NORMALIZE: Record<string, { maxHp: number; def: number }> = {
  mazmorra: { maxHp: 1, def: 1 },
  cripta: { maxHp: 0.66, def: 0.65 },
  infierno: { maxHp: 0.63, def: 0.58 },
};

/** Crecimiento suave por nivel que acompaña a la mejora del equipo del jugador (+0,66 % por nivel). */
export const SUBZONE_GROWTH_PER_LEVEL = 0.0066;
export function subzoneGrowth(level: number): number {
  return 1 + SUBZONE_GROWTH_PER_LEVEL * (Math.max(1, level) - 1);
}

/** Cofres según la subzona: posición dentro de su zona (1.ª, 2.ª, 3.ª, 4.ª) → oro y tiradas extra. */
export const CHEST_BY_POSITION: { gold: number; extraRolls: number }[] = [
  { gold: 0.85, extraRolls: 0 },
  { gold: 1, extraRolls: 0 },
  { gold: 1.2, extraRolls: 1 },
  { gold: 1.35, extraRolls: 1 },
];
/** Peso del equipo según su nivel requerido respecto a la subzona: el de su nivel sale más; el de muy arriba, casi nunca. */
export const GEAR_LEVEL_WEIGHT = { near: 1.6, below: 0.7, above: 0.25, nearBelow: 10, nearAbove: 5 };

/**
 * Fase 10: daño (ataque y magia) de las criaturas COMUNES de cada subzona. Élites y jefes no cambian.
 * Comprobado con el simulador (docs/equilibrio/simulador-actual.md): en S1, superar 3 o 4 enemigos seguidos es lo normal.
 */
export const ENEMY_DAMAGE: Record<string, number> = { afueras: 0.8, castillo: 0.9, calabozos: 0.92, panteon: 0.92, rios: 0.95, trono: 0.92 };

/** Al ganar un combate se recobra el aliento: esta parte de la vida máxima (no cierra heridas ni sangrados). */
export const RECOVER_AFTER_WIN = 0.15;
