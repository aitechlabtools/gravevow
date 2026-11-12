// Tipos de daño y zonas del cuerpo (bloque 1): de qué tipo es un golpe, a qué zona va y qué heridas puede abrir.
// Lógica pura: el azar llega siempre por `rng`.
import { DAMAGE_BY_FX, DAMAGE_INJURY, HUGE_BITE_FRACTURE, PROFILE_LIMBS, VITAL_CHANCE, VITAL_SPLIT, type DamageType, type ZoneProfile } from '../config/damage';
import { ANATOMY, type Region } from '../config/anatomy';
import { DEFAULT_PROFILE, ENEMY_PROFILE, SKILL_DAMAGE, type EnemyProfile } from './data/enemyProfiles';
import { ENEMIES } from './data/enemies';
import type { Rng } from './rng';

/** Quién golpea, lo justo para decidir la zona y las heridas. */
export interface Attacker { ref?: string; boss?: boolean }

export function profileOf(ref: string | undefined): EnemyProfile {
  return (ref && ENEMY_PROFILE[ref]) || DEFAULT_PROFILE;
}

/** Tipo de daño de un ataque: el de la habilidad, el del golpe básico de la criatura o el de su efecto visual. */
export function damageTypeOf(kind: string | undefined, fx: string | undefined, by?: Attacker, skillId?: string): DamageType {
  if (kind === 'magical') return 'magic';
  if (skillId && SKILL_DAMAGE[skillId]) return SKILL_DAMAGE[skillId];
  if (!skillId && by?.ref) { const b = profileOf(by.ref).basic; if (b) return b; }
  return DAMAGE_BY_FX[fx ?? ''] ?? 'cut';
}

/** Multiplicadores de sangrado y fractura de un tipo de daño (los mordiscos enormes también rompen). */
export function injuryModsFor(type: DamageType, by?: Attacker): { bleed: number; fracture: number; heavy?: number } {
  const m = DAMAGE_INJURY[type];
  if (type === 'bite' && profileOf(by?.ref).huge) return { ...m, fracture: HUGE_BITE_FRACTURE };
  return m;
}

function isElite(ref: string | undefined): boolean {
  return !!(ref && ENEMIES[ref]?.elite);
}

/** Probabilidad de que el golpe vaya a una zona vital (cabeza, tórax o abdomen). `depth`: subzona, 0 = S1. */
export function vitalChance(by: Attacker | undefined, depth: number): number {
  const p = profileOf(by?.ref);
  const common = depth >= VITAL_CHANCE.commonFromDepth
    ? Math.min(VITAL_CHANCE.commonMax, VITAL_CHANCE.commonBase + VITAL_CHANCE.commonPerDepth * (depth - VITAL_CHANCE.commonFromDepth)) : 0;
  let c = common;
  if (p.profile === 'large') c = Math.max(c, VITAL_CHANCE.large);
  if (p.strong) c = Math.max(c, VITAL_CHANCE.strong);
  if (isElite(by?.ref)) c = Math.max(c, VITAL_CHANCE.elite);
  if (by?.boss) c = Math.max(c, VITAL_CHANCE.boss);
  return c;
}

/** ¿Puede ir a la cabeza? Desde la subzona de `ANATOMY.headFromDepth`, o si la criatura es fuerte. */
function headAllowed(by: Attacker | undefined, depth: number): boolean {
  const p = profileOf(by?.ref);
  return depth >= ANATOMY.headFromDepth || !!p.strong || p.profile === 'large' || !!by?.boss || isElite(by?.ref);
}

function pickWeighted<T extends string>(rng: Rng, list: [T, number][]): T {
  const sum = list.reduce((n, [, w]) => n + w, 0);
  let x = rng.next() * sum;
  for (const [k, w] of list) { x -= w; if (x < 0) return k; }
  return list[list.length - 1][0];
}

/** Zona de un golpe según quién golpea y la subzona. */
export function rollHitRegion(rng: Rng, by: Attacker | undefined, depth: number): Region {
  if (rng.chance(vitalChance(by, depth))) {
    const opts: [Region, number][] = [['thorax', VITAL_SPLIT.thorax], ['abdomen', VITAL_SPLIT.abdomen]];
    if (headAllowed(by, depth)) opts.unshift(['head', VITAL_SPLIT.head]);
    return pickWeighted(rng, opts);
  }
  const l = PROFILE_LIMBS[profileOf(by?.ref).profile as ZoneProfile];
  return pickWeighted<Region>(rng, [['armR', l.arms / 2], ['armL', l.arms / 2], ['legR', l.legs / 2], ['legL', l.legs / 2]]);
}

/** Texto para la ficha y el bestiario: «Muerde las piernas. Puede causar sangrado.» */
export function zonesText(ref: string): string {
  const p = profileOf(ref);
  const l = PROFILE_LIMBS[p.profile];
  const zones = l.arms === 0 ? 'las piernas' : l.legs === 0 ? 'los brazos' : l.arms > l.legs ? 'sobre todo los brazos' : l.legs > l.arms ? 'sobre todo las piernas' : 'brazos y piernas';
  return p.profile === 'large' ? 'Golpea cualquier zona, más el tórax y la cabeza' : `Ataca ${zones}`;
}

/** Versión corta para pantallas bajas: «Piernas», «Brazos y piernas», «Todo el cuerpo». */
export function zonesShort(ref: string): string {
  const p = profileOf(ref);
  const l = PROFILE_LIMBS[p.profile];
  if (p.profile === 'large') return 'Todo el cuerpo';
  return l.arms === 0 ? 'Piernas' : l.legs === 0 ? 'Brazos' : 'Brazos y piernas';
}

/** ¿Alcanza zonas vitales en esta subzona? (icono de la ficha). */
export function hitsVitals(ref: string, boss: boolean, depth: number): boolean {
  return vitalChance({ ref, boss }, depth) > 0;
}
