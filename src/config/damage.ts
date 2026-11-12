// TIPOS DE DAÑO Y ZONAS (bloque 1). Qué heridas causa cada tipo de golpe, a qué zonas del cuerpo apunta cada
// criatura y cómo resiste cada material de armadura. Valores comprobados con: node scripts/simular.mjs 300 actual.

/** Tipo de daño de un golpe: decide qué heridas puede abrir. */
export type DamageType = 'cut' | 'pierce' | 'blunt' | 'bite' | 'magic';

export const DAMAGE_NAME: Record<DamageType, string> = { cut: 'Cortante', pierce: 'Punzante', blunt: 'Contundente', bite: 'Mordisco', magic: 'Mágico' };

/**
 * Multiplicadores de las probabilidades base de `ANATOMY` (bleedChance, fractureChance…).
 * `heavy`: parte de los sangrados que salen graves sin crítico (los punzantes calan hondo).
 */
export const DAMAGE_INJURY: Record<DamageType, { bleed: number; fracture: number; heavy?: number }> = {
  cut: { bleed: 1, fracture: 0 },
  pierce: { bleed: 0.8, fracture: 0, heavy: 0.25 },
  blunt: { bleed: 0, fracture: 1.5 },
  bite: { bleed: 1, fracture: 0 },
  magic: { bleed: 0, fracture: 0 },
};

/** Mordiscos de criaturas enormes: también rompen huesos. */
export const HUGE_BITE_FRACTURE = 1;

/** Tipo por defecto según el efecto visual del golpe (si la criatura o la habilidad no dicen otro). */
export const DAMAGE_BY_FX: Record<string, DamageType> = { slash: 'cut', bite: 'bite', smash: 'blunt', poison: 'pierce' };

/** Perfil de una criatura: decide a qué zonas apunta. */
export type ZoneProfile = 'crawler' | 'flyer' | 'humanoid' | 'beast' | 'large';

export const PROFILE_NAME: Record<ZoneProfile, string> = { crawler: 'Rastrera', flyer: 'Voladora', humanoid: 'Humanoide', beast: 'Bestia', large: 'Grande' };

/** Reparto de los golpes que NO van a una zona vital: brazos y piernas (cada lado la mitad). */
export const PROFILE_LIMBS: Record<ZoneProfile, { arms: number; legs: number }> = {
  crawler: { arms: 0, legs: 1 },
  flyer: { arms: 0.7, legs: 0.3 },
  humanoid: { arms: 0.5, legs: 0.5 },
  beast: { arms: 0.4, legs: 0.6 },
  large: { arms: 0.5, legs: 0.5 },
};

/**
 * Probabilidad de que un golpe vaya a una zona vital (cabeza, tórax o abdomen).
 * Los comunes de S1 y S2 nunca; desde S3 (`commonFromDepth`, índice 0 = S1) un 5 % que sube 2 puntos por subzona.
 * Élites, jefes y criaturas grandes o fuertes siempre pueden.
 */
export const VITAL_CHANCE = { commonFromDepth: 2, commonBase: 0.05, commonPerDepth: 0.02, commonMax: 0.2, strong: 0.15, large: 0.3, elite: 0.12, boss: 0.18 };

/** Reparto entre las zonas vitales cuando el golpe va a una (la cabeza, solo desde `ANATOMY.headFromDepth` o si es fuerte). */
export const VITAL_SPLIT = { head: 1, thorax: 2, abdomen: 2 };

/** Las heridas en zonas vitales son más graves: más daño y, en la cabeza, un golpe contundente puede aturdir. */
export const VITAL_DAMAGE = { head: 1.2, thorax: 1.1, abdomen: 1.1 };
export const HEAD_STUN_BLUNT = 0.25;

/** Material de una pieza de armadura y cómo protege según el tipo de daño (multiplica su protección). */
export type ArmorMaterial = 'cloth' | 'leather' | 'mail' | 'plate';
export const MATERIAL_NAME: Record<ArmorMaterial, string> = { cloth: 'Tela', leather: 'Cuero', mail: 'Malla', plate: 'Placas' };
export const MATERIAL_RESIST: Record<ArmorMaterial, Partial<Record<DamageType, number>>> = {
  cloth: { cut: 0.8, pierce: 0.8, bite: 0.8 },
  leather: { cut: 0.8, pierce: 0.8, bite: 0.8 },
  mail: { cut: 1.2, pierce: 1.2, bite: 1.2, blunt: 0.7 },
  plate: {},
};
/** Frase de la ficha del objeto. */
export const MATERIAL_HINT: Record<ArmorMaterial, string> = {
  cloth: 'Tela: protege poco de cortes y mordiscos.',
  leather: 'Cuero: protege poco de cortes y mordiscos.',
  mail: 'Malla: buena contra cortes y mordiscos, floja contra golpes.',
  plate: 'Placas: protege igual de todo.',
};
/** Material de las piezas que no se deduce bien por su nombre. */
export const MATERIAL_OVERRIDE: Record<string, ArmorMaterial> = { padded_tunic: 'cloth', worn_boots: 'leather', gauntlets: 'plate' };
/** La protección de una pieza nunca pasa de esto, por buena que sea. */
export const GUARD_CAP = 0.95;
