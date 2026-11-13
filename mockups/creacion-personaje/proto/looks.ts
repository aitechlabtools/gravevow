// PROTOTIPO (maqueta): opciones de aspecto. Al implementar pasará a src/core/data/appearance.ts.
// Todo por datos: para añadir un color basta una entrada; para un peinado, una entrada y su dibujo.
import type { ClassId } from '../../../src/core/types';

export interface LookOption { id: string; name: string; color?: string }

export const HAIR_COLORS: LookOption[] = [
  { id: 'black', name: 'Negro', color: '#211a1c' },
  { id: 'dark', name: 'Castaño oscuro', color: '#4a2f1d' },
  { id: 'light', name: 'Castaño claro', color: '#7a5232' },
  { id: 'blond', name: 'Rubio ceniza', color: '#a8894a' },
  { id: 'red', name: 'Pelirrojo', color: '#8a3a1c' },
  { id: 'grey', name: 'Canoso', color: '#a49c86' },
];

export type HairStyle = 'short' | 'long' | 'tied' | 'shaved';
export const HAIR_STYLES: { id: HairStyle; name: string }[] = [
  { id: 'short', name: 'Corto' },
  { id: 'long', name: 'Largo' },
  { id: 'tied', name: 'Recogido' },
  { id: 'shaved', name: 'Rapado' },
];

export type Beard = 'none' | 'short' | 'long';
export const BEARDS: { id: Beard; name: string }[] = [
  { id: 'none', name: 'Ninguna' },
  { id: 'short', name: 'Corta' },
  { id: 'long', name: 'Larga' },
];

/** Valores por defecto de cada clase (y los que reciben los personajes ya creados al migrar). */
export const CLASS_LOOK_DEFAULT: Record<ClassId, { hair: number; style: number; beard: number }> = {
  warrior: { hair: 1, style: 0, beard: 0 },
  mage: { hair: 5, style: 0, beard: 0 },
  rogue: { hair: 0, style: 0, beard: 0 },
  cleric: { hair: 3, style: 0, beard: 0 },
};

/** Nombres al azar: prefijo + sufijo (y a veces un sobrenombre). Editable. */
export const SEXES = [{ id: 'm', name: 'Hombre' }, { id: 'f', name: 'Mujer' }] as const;
/** Nombre de clase con concordancia: [masculino, femenino]. */
export const CLASS_NAME_G: Record<ClassId, [string, string]> = { warrior: ['Guerrero', 'Guerrera'], mage: ['Mago', 'Maga'], rogue: ['Pícaro', 'Pícara'], cleric: ['Clérigo', 'Clériga'] };
export const NAME_PARTS = {
  endF: ['wen', 'ra', 'ine', 'ys', 'ora', 'hild', 'eth', 'ia', 'elle', 'yn', 'is', 'a'],
  start: ['Al', 'Bran', 'Cor', 'Dra', 'Ed', 'Gar', 'Hal', 'Is', 'Mor', 'Os', 'Ren', 'Sev', 'Tor', 'Ul', 'Var', 'Wyn', 'Yr', 'Ael', 'Bel', 'Cael', 'Ves', 'Ser', 'Mal', 'Ith'],
  endM: ['dric', 'mund', 'ric', 'gar', 'ion', 'vor', 'an', 'ath', 'red', 'en', 'ald', 'ek', 'orn', 'ulf'],
};
