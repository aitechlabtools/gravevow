// ════════════════════════════════════════════════════════════════════
// Concordancia de género en los textos. En cualquier texto de datos se escribe la variante masculina y la
// femenina entre llaves, separadas por «|»:  «Has vuelto cansad{o|a}», «{El|La} {guerrero|guerrera} cae».
// `g(texto, sexo)` elige la que toca. Un texto sin llaves sale tal cual. Sin sexo conocido, la masculina
// (los personajes antiguos son Hombre). tests/gender.test.ts comprueba que las llaves estén bien cerradas.
// ════════════════════════════════════════════════════════════════════
import type { ClassId, Sex } from './types';
import { CLASSES } from './data/classes';

const MARK = /\{([^{}|]*)\|([^{}|]*)\}/g;

/** Género del personaje que se está jugando. Lo fija el estado al cargar o cambiar de personaje (setTextSex),
 *  para que los textos que salen por avisos, registro, diálogos y tutoriales concuerden sin pasarlo a mano. */
let current: Sex = 'm';
export function setTextSex(sex: Sex | undefined) { current = sex ?? 'm'; }
export function textSex(): Sex { return current; }

/** Resuelve las marcas {masculino|femenino}. Sin sexo, usa el del personaje en juego. */
export function g(text: string, sex: Sex | undefined = current): string {
  return text.includes('{') ? text.replace(MARK, (_m, a: string, b: string) => (sex === 'f' ? b : a)) : text;
}

/** Nombre de la clase con concordancia: Guerrero/Guerrera, Mago/Maga… */
export function className(classId: ClassId, sex: Sex | undefined): string {
  const c = CLASSES[classId];
  return sex === 'f' ? c.nameF : c.name;
}

/** Marcas mal escritas en un texto (para las pruebas): una «|» con llaves a medias. Otras llaves ({n}) no cuentan. */
export function badMarks(text: string): string[] {
  const rest = text.replace(MARK, '');
  return /\{[^{}]*\|/.test(rest) || /\|[^{}]*\}/.test(rest) ? [text] : [];
}
