// Escenarios del simulador: cambian valores SOLO en memoria, para comparar antes de tocar el juego.
// «actual» mide el juego tal cual. Para probar un ajuste, añade aquí un escenario que cambie TUNE o los datos
// (por ejemplo ANATOMY o ENEMY_DAMAGE) y ejecútalo: node scripts/simular.mjs 300 <nombre>.
import { TUNE } from './sim';
import { ENEMY_DAMAGE } from '../../src/config/subzones';

export function applyScenario(name: string): string {
  switch (name) {
    case 'actual': return 'Valores actuales del juego.';
    case 'ejemplo': {
      // Ejemplo: criaturas de S10 un 10 % más flojas y una poción más en S1
      ENEMY_DAMAGE.trono = 0.83; TUNE.s1Potions = 4;
      return 'Ejemplo de ajuste: S10 −17 % de daño y 4 pociones en S1.';
    }
    default: throw new Error('Escenario desconocido: ' + name);
  }
}
