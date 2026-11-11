// NECESIDADES (Fase 5 de la expansión): Saciedad, Hidratación y Descanso. Valores de prueba del plan maestro (apartado 10).

export type Need = 'sat' | 'hyd' | 'rest';
export const NEEDS: Need[] = ['sat', 'hyd', 'rest'];

export const NEED_NAME: Record<Need, string> = { sat: 'Saciedad', hyd: 'Hidratación', rest: 'Descanso' };
/** Nombre del estado cuando ya penaliza. */
export const NEED_LOW: Record<Need, string> = { sat: 'Hambre', hyd: 'Sed', rest: 'Agotamiento' };
export const NEED_COLOR: Record<Need, string> = { sat: '#c9873a', hyd: '#4f8fc9', rest: '#8a6fc0' };

export const NEED_CFG = {
  /** Desgaste por pulso (6 s de exploración o una ronda de combate). En 20 min: 24, 36 y 18 puntos. */
  rate: { sat: 0.12, hyd: 0.18, rest: 0.09 } as Record<Need, number>,
  /** Por encima no hay penalización; por debajo, el máximo de Ímpetu o Maná baja un 10 %. */
  warnAt: 30,
  /** Con esto o menos, baja un 20 %. Se usa el peor estado de las tres barras. */
  criticalAt: 10,
  resourceLossLow: 0.1,
  resourceLossCritical: 0.2,
  /** A cero de Hidratación, desgaste al tórax cada 5 pulsos; a cero de Saciedad, cada 10 (una sola vez si coinciden). */
  hydDamageEvery: 5,
  satDamageEvery: 10,
  /** Daño de cada aplicación: parte de la vida máxima normal, con restos decimales. */
  starveDamage: 0.01,
  /** Descanso a cero: la iniciativa baja un 20 % (dentro del tope global de la anatomía). */
  exhaustedInitiative: 0.2,
  /** El abdomen inutilizado hace gastar más Saciedad e Hidratación. */
  abdomenExtra: 0.25,
  /** Topes de los modificadores de consumo sumados. */
  maxReduction: 0.3,
  maxIncrease: 0.75,
  /** Suministro comunitario del Bastión: Saciedad e Hidratación vuelven al menos a esto al regresar. */
  baseSupply: 60,
};
