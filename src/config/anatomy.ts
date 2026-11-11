// ANATOMÍA (Fase 4 de la expansión). Valores de prueba del plan maestro (apartados 08 y 09), no de equilibrio comprobado.

export type Region = 'head' | 'thorax' | 'abdomen' | 'armL' | 'armR' | 'legL' | 'legR';

/** Orden fijo: decide el reparto de los restos al redondear y el orden en la interfaz. */
export const REGIONS: Region[] = ['head', 'thorax', 'abdomen', 'armL', 'armR', 'legL', 'legR'];

export const REGION_NAME: Record<Region, string> = {
  head: 'Cabeza', thorax: 'Tórax', abdomen: 'Abdomen',
  armL: 'Brazo izquierdo', armR: 'Brazo derecho', legL: 'Pierna izquierda', legR: 'Pierna derecha',
};
/** Nombre corto para la silueta en pantallas pequeñas. */
export const REGION_SHORT: Record<Region, string> = { head: 'Cab', thorax: 'Tór', abdomen: 'Abd', armL: 'B.iz', armR: 'B.de', legL: 'P.iz', legR: 'P.de' };

export const ANATOMY = {
  /** Parte de la vida máxima total de cada región (suman 1). */
  share: { head: 0.1, thorax: 0.25, abdomen: 0.15, armL: 0.1, armR: 0.1, legL: 0.15, legR: 0.15 } as Record<Region, number>,
  /** Probabilidad relativa de que un golpe normal caiga en cada región. La cabeza solo a partir de la tercera subzona. */
  hitWeight: { head: 4, thorax: 12, abdomen: 16, armL: 18, armR: 18, legL: 16, legR: 16 } as Record<Region, number>,
  /** Recalibrado del daño recibido con anatomía (morir por el tórax es más fácil que vaciar una barra única). */
  damageTaken: 0.85,
  /** Subzona (índice en SUBZONE_ORDER) a partir de la que los golpes normales pueden ir a la cabeza: S1 y S2 no. */
  headFromDepth: 2,
  /** Sangrado por pulso (o ronda): parte de la vida máxima total. Techo del conjunto de hemorragias. */
  bleedLight: 0.005,
  bleedHeavy: 0.01,
  bleedCap: 0.03,
  /** Un pulso de exploración son 6 s de juego activo (el reloj cuenta segundos). */
  pulseSeconds: 6,
  /** Lesiones por golpe físico (los mágicos no hacen sangrar ni rompen huesos). */
  bleedChance: 0.15,
  /** Con crítico, el sangrado es grave. */
  bleedChanceCrit: 0.35,
  fractureChance: 0.06,
  fractureChanceCrit: 0.16,
  /** Penalizaciones por miembro: fractura e inutilizado (a cero). */
  armFracture: 0.1,
  armDisabled: 0.2,
  legFracture: 0.12,
  legDisabled: 0.25,
  /** Dolor: cada fractura o región inutilizada resta además esto a ataque, iniciativa y paso (dentro de los mismos topes). */
  painPerRegion: 0.05,
  /** El analgésico alquímico quita el dolor durante estos pulsos (rondas en combate). */
  painkillerPulses: 10,
  /** Topes: el ataque no baja más del 40 %; la iniciativa no baja del 50 % y el paso no baja del 40 %. */
  maxOffenseLoss: 0.4,
  minInitiative: 0.5,
  minMobility: 0.4,
  /** Cirugía de campo: deja la región al 20 % y su máximo al 60 % hasta volver al Bastión. Dura 2 pulsos. */
  surgeryHp: 0.2,
  surgeryCap: 0.6,
  surgeryPulses: 2,
  /** Estabilización gratuita del Bastión: cada región queda al menos al 50 %. */
  stabilizeTo: 0.5,
  /** Tratamiento completo de Hermana Vesper: precio base, por punto de vida que falta y por fractura. */
  vesperBase: 5,
  vesperPerHp: 0.3,
  vesperPerFracture: 15,
};

/** Colores de la silueta (siempre acompañados de símbolo o texto). */
export const BODY_COLOR = { ok: '#6fae5a', hurt: '#e8b33a', bad: '#e8752b', critical: '#d23a3a', disabled: '#3a3236', outline: '#0d0b0c' } as const;
