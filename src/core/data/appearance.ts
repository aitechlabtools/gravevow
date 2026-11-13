// ════════════════════════════════════════════════════════════════════
// Aspecto del personaje: género, colores de pelo, peinados, barbas, valores por clase y nombres al azar.
// Todo por datos: un color nuevo es una entrada; un peinado nuevo, una entrada y su dibujo (src/shared/art.ts).
// Los índices se guardan en Appearance (src/core/types.ts). Los personajes antiguos no tienen estos campos:
// se leen con los valores por defecto de su clase y se ven igual que antes.
// ════════════════════════════════════════════════════════════════════
import type { Appearance, ClassId, Sex } from '../types';

export interface LookOption { id: string; name: string; color?: string }

export const SEXES: { id: Sex; name: string }[] = [
  { id: 'm', name: 'Hombre' },
  { id: 'f', name: 'Mujer' },
];

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

/** Valores por defecto de cada clase (índices). También los reciben los personajes ya creados. */
export const CLASS_LOOK_DEFAULT: Record<ClassId, { hair: number; style: number; beard: number }> = {
  warrior: { hair: 1, style: 0, beard: 0 },
  mage: { hair: 5, style: 0, beard: 0 },
  rogue: { hair: 0, style: 0, beard: 0 },
  cleric: { hair: 3, style: 0, beard: 0 },
};

/** Aspecto completo, con los valores por defecto donde falten (personajes antiguos). */
export function fullLook(classId: ClassId, ap: Appearance): Required<Appearance> {
  const d = CLASS_LOOK_DEFAULT[classId];
  return { cloak: ap.cloak, skin: ap.skin, sex: ap.sex ?? 'm', hair: ap.hair ?? d.hair, style: ap.style ?? d.style, beard: ap.beard ?? d.beard };
}

/** Nombres al azar: inicio + final según el género. Editable: añade sílabas a las listas. */
export const NAME_PARTS = {
  start: ['Al', 'Bran', 'Cor', 'Dra', 'Ed', 'Gar', 'Hal', 'Is', 'Mor', 'Os', 'Ren', 'Sev', 'Tor', 'Ul', 'Var', 'Wyn', 'Yr', 'Ael', 'Bel', 'Cael', 'Ves', 'Ser', 'Mal', 'Ith'],
  m: ['dric', 'mund', 'ric', 'gar', 'ion', 'vor', 'an', 'ath', 'red', 'en', 'ald', 'ek', 'orn', 'ulf'],
  f: ['wen', 'ra', 'ine', 'ys', 'ora', 'hild', 'eth', 'ia', 'elle', 'yn', 'is', 'a'],
};

/** Nombre al azar coherente con el género. `rand` devuelve [0, 1). */
export function randomName(sex: Sex, rand: () => number = Math.random): string {
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  return pick(NAME_PARTS.start) + pick(NAME_PARTS[sex]);
}
