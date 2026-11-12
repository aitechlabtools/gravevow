// Bloque 1: tipos de daño, zonas por criatura y armadura por material.
import { describe, expect, it } from 'vitest';
import { damageTypeOf, injuryModsFor, rollHitRegion, vitalChance } from '../src/core/damage';
import { guardVs, materialOf } from '../src/core/armor';
import { ENEMY_PROFILE } from '../src/core/data/enemyProfiles';
import { ENEMIES } from '../src/core/data/enemies';
import { SUBZONES } from '../src/core/data/subzones';
import { makeRng } from '../src/core/rng';

const count = (ref: string, depth: number, boss = false, n = 4000) => {
  const rng = makeRng(7); const out: Record<string, number> = {};
  for (let i = 0; i < n; i++) { const r = rollHitRegion(rng, { ref, boss }, depth); out[r] = (out[r] ?? 0) + 1; }
  return out;
};

describe('Bloque 1: tipos de daño', () => {
  it('cada criatura de cada subzona tiene perfil', () => {
    for (const sz of Object.values(SUBZONES)) for (const id of [...sz.enemies.map((e) => e.id), sz.elite, sz.boss]) expect(ENEMY_PROFILE[id], id).toBeTruthy();
    for (const id of Object.keys(ENEMY_PROFILE)) expect(ENEMIES[id], id).toBeTruthy();
  });
  it('las flechas son punzantes y los cortes no rompen huesos', () => {
    expect(damageTypeOf('physical', 'slash', { ref: 'renegade_archer' })).toBe('pierce');
    expect(damageTypeOf('physical', 'slash', { ref: 'bandit' })).toBe('cut');
    expect(injuryModsFor('cut').fracture).toBe(0);
    expect(injuryModsFor('pierce').fracture).toBe(0);
    expect(injuryModsFor('blunt').bleed).toBe(0);
    expect(damageTypeOf('magical', 'fire')).toBe('magic');
    expect(injuryModsFor('magic')).toMatchObject({ bleed: 0, fracture: 0 });
  });
  it('solo los mordiscos de criaturas enormes rompen huesos', () => {
    expect(injuryModsFor('bite', { ref: 'starving_wolf' }).fracture).toBe(0);
    expect(injuryModsFor('bite', { ref: 'sulfur_beast' }).fracture).toBeGreaterThan(0);
  });
});

describe('Bloque 1: zonas del cuerpo', () => {
  it('en S1 y S2 los comunes nunca golpean zonas vitales', () => {
    for (const id of ['bandit', 'starving_wolf', 'carrion_crow', 'skeleton', 'bat']) {
      expect(vitalChance({ ref: id }, 0)).toBe(0);
      const c = count(id, 1);
      expect(c.head ?? 0).toBe(0); expect(c.thorax ?? 0).toBe(0); expect(c.abdomen ?? 0).toBe(0);
    }
  });
  it('las rastreras solo muerden piernas y las voladoras van sobre todo a los brazos', () => {
    const rat = count('ossuary_rat', 0);
    expect(Object.keys(rat).sort()).toEqual(['legL', 'legR']);
    const crow = count('carrion_crow', 0);
    expect((crow.armL + crow.armR) / 4000).toBeGreaterThan(0.6);
  });
  it('desde S3 los comunes alcanzan zonas vitales, cada vez más; élites y jefes siempre', () => {
    expect(vitalChance({ ref: 'torturer' }, 2)).toBeGreaterThan(0);
    expect(vitalChance({ ref: 'flayer' }, 8)).toBeGreaterThan(vitalChance({ ref: 'torturer' }, 2));
    expect(vitalChance({ ref: 'bandit_captain' }, 0)).toBeGreaterThan(0);
    expect(vitalChance({ ref: 'mordrek', boss: true }, 0)).toBeGreaterThan(vitalChance({ ref: 'bandit_captain' }, 0));
  });
});

describe('Bloque 1: armadura por material', () => {
  it('la malla resiste cortes y flojea contra golpes', () => {
    expect(materialOf('chainmail')).toBe('mail');
    expect(materialOf('padded_tunic')).toBe('cloth');
    const g = { slot: 'armor' as const, guard: 0.6, material: 'mail' as const };
    expect(guardVs(g, 'cut')).toBeGreaterThan(guardVs(g, 'blunt'));
    expect(guardVs({ ...g, guard: 0.9 }, 'cut')).toBeLessThanOrEqual(0.95);
  });
});

import { enemyAttackLine, enemyDamageTypes, enemyThreats } from '../src/core/armor';
describe('ficha de zonas y tipo (fase 4)', () => {
  it('el lobo muerde las piernas y hace sangrar', () => {
    expect(enemyDamageTypes('starving_wolf')).toContain('bite');
    expect(enemyAttackLine('starving_wolf')).toMatch(/piernas.*Mordisco/);
    expect(enemyThreats('starving_wolf')).toContain('Sangrado');
  });
  it('la rata ataca solo las piernas', () => {
    expect(enemyAttackLine('ossuary_rat')).toMatch(/^Ataca las piernas/);
  });
});
