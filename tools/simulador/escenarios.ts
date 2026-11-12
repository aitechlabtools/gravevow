// Escenarios del simulador: cambian valores SOLO en memoria, para comparar antes de tocar el juego.
// «actual» mide el juego tal cual. Para probar un ajuste, añade aquí un escenario que cambie TUNE o los datos
// (por ejemplo ANATOMY o ENEMY_DAMAGE) y ejecútalo: node scripts/simular.mjs 300 <nombre>.
import { TUNE, setBaseInjuries } from './sim';
import { ENEMY_DAMAGE } from '../../src/config/subzones';
import { ANATOMY } from '../../src/config/anatomy';
import { INJURY_BY_FX } from '../../src/config/armor';
import { SKILLS } from '../../src/core/data/skills';

export function applyScenario(name: string): string {
  switch (name) {
    case 'actual': return 'Valores actuales del juego.';
    case 'ejemplo': {
      // Ejemplo: criaturas de S10 un 10 % más flojas y una poción más en S1
      ENEMY_DAMAGE.trono = 0.83; TUNE.s1Potions = 4;
      return 'Ejemplo de ajuste: S10 −17 % de daño y 4 pociones en S1.';
    }
    case 'propuesta': {
      // Bloque 1 (aproximación sin tocar el juego): los cortes no rompen huesos, los golpes se concentran en brazos y
      // piernas (los comunes casi no alcanzan tórax ni abdomen) y los estados de habilidades enemigas salen un 40 % menos.
      INJURY_BY_FX.slash = { bleed: 1, fracture: 0 };
      INJURY_BY_FX.smash = { bleed: 0, fracture: 1.5 };
      Object.assign(ANATOMY.hitWeight, { head: 2, thorax: 6, abdomen: 8, armL: 20, armR: 20, legL: 22, legR: 22 });
      setBaseInjuries(0.04, 0.12, 0.03, 0.08); TUNE.skillBleed = 0.5; TUNE.recoverAfterWin = 0.25;
      Object.assign(ENEMY_DAMAGE, { afueras: 0.72, castillo: 0.85, calabozos: 0.87 });
      for (const sk of Object.values(SKILLS)) for (const a of sk.applies ?? []) if (!a.self && a.status !== 'empower') a.chance *= 0.6;
      return 'Propuesta del bloque 1 (aproximada): sin fracturas por corte, golpes sobre todo en brazos y piernas, sangrado 4 % (12 % con crítico), sangrado de habilidades a la mitad, recobrar el 25 % al ganar, daño de S1–S3 algo menor y estados de habilidades −40 %.';
    }
    default: throw new Error('Escenario desconocido: ' + name);
  }
}
