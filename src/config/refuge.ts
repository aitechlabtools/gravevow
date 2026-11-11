// REFUGIO, DESGUACE Y COCINA (Fase 9 de la expansión). Valores de prueba del plan maestro (apartados 10, 15 y 16).

export const REFUGE_CFG = {
  /** Ventaja de preparación: menos consumo de una necesidad en la siguiente incursión (catre mejorado, platos). */
  prepCut: 0.1,
  /** Desguace: materiales por cada 10 de valor del objeto (antes de estado, rareza y banco). */
  scrapPerValue: 0.1,
  /** Un objeto roto aún rinde esto; uno entero, el 100 %. */
  scrapBrokenFloor: 0.35,
  /** Banco de trabajo del Refugio: +25 % de materiales al desguazar. */
  benchBonus: 0.25,
  /** Nunca se saca en materiales (a precio de venta) más del 80 % de lo que cuesta comprar el objeto. */
  scrapMaxOfBuy: 0.8,
  /** Cocina: un plato esmerado (todos los pasos bien) te devuelve el ingrediente común más barato (menos material, no más efecto). */
  perfectRefund: true,
  /** Lote máximo de la producción normal (sin minijuego). */
  maxBatch: 5,
};
