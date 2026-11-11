import { describe, expect, it } from 'vitest';
import { NEED_CFG } from '../src/config/needs';
import { FULL_NEEDS, baseSupply, consumptionMult, effectiveMaxMp, feed, needsOf, pulsesToNext, resourceLoss, sleep, tickNeeds, toSaved, type Needs } from '../src/core/needs';
import { fullBody, summaryHp, damageRegion } from '../src/core/anatomy';
import { createCombat, getCombatant, speedOf } from '../src/core/combat';
import { enemyCombatant, playerCombatant } from '../src/core/combatants';
import { createProfile } from '../src/core/profile';
import { startExpedition, endExpedition } from '../src/core/expedition';

const run = (n: Needs, pulses: number, total = 300) => {
  let body = fullBody(total); let dealt = 0;
  for (let i = 0; i < pulses; i++) { const t = tickNeeds(n, body, total); n = t.needs; body = t.body; dealt += t.dealt; }
  return { n, body, dealt };
};

describe('Necesidades (Fase 5)', () => {
  it('N01 en 20 min (200 pulsos) se gastan 24, 36 y 18', () => {
    const { n } = run({ ...FULL_NEEDS }, 200);
    expect(100 - n.sat).toBeCloseTo(24, 5);
    expect(100 - n.hyd).toBeCloseTo(36, 5);
    expect(100 - n.rest).toBeCloseTo(18, 5);
  });
  it('N02 el recurso usa el peor estado sin sumar', () => {
    expect(resourceLoss({ sat: 31, hyd: 80, rest: 90 })).toBe(0);
    expect(resourceLoss({ sat: 30, hyd: 80, rest: 90 })).toBe(0.1);
    expect(resourceLoss({ sat: 5, hyd: 8, rest: 2 })).toBe(0.2);
    expect(effectiveMaxMp(100, { sat: 5, hyd: 100, rest: 100 })).toBe(80);
  });
  it('N03 sed a cero hiere el tórax cada 5 pulsos; hambre cada 10; si coinciden, una vez', () => {
    const hyd = run({ sat: 100, hyd: 0, rest: 100 }, 10);
    expect(hyd.dealt).toBe(6); // 1 % de 300 = 3, dos veces
    expect(hyd.body.parts.thorax.hp).toBeLessThan(fullBody(300).parts.thorax.hp);
    const both = run({ sat: 0, hyd: 0, rest: 100 }, 10);
    expect(both.dealt).toBe(6);
    const sat = run({ sat: 0, hyd: 100, rest: 100 }, 10);
    expect(sat.dealt).toBe(3);
  });
  it('N04 restos decimales y nunca muerte instantánea', () => {
    const r = run({ sat: 100, hyd: 0, rest: 100 }, 5, 150); // 1,5 por aplicación
    expect(r.dealt).toBe(1);
    expect(r.n.residue).toBeCloseTo(0.5, 5);
    const t = tickNeeds({ sat: 0.01, hyd: 0.01, rest: 0.01 }, fullBody(300), 300);
    expect(t.dealt).toBe(0);
  });
  it('N05 se puede morir de sed si el tórax ya estaba casi a cero', () => {
    let body = damageRegion(fullBody(300), 'thorax', fullBody(300).parts.thorax.hp - 1).body;
    let n: Needs = { sat: 100, hyd: 0, rest: 100, hydZero: 4 };
    const t = tickNeeds(n, body, 300);
    expect(t.dead).toBe(true);
    expect(summaryHp(t.body)).toBe(0);
  });
  it('N06 abdomen inutilizado: +25 % de saciedad e hidratación, no de descanso', () => {
    const b = damageRegion(fullBody(300), 'abdomen', 999, { lethal: false }).body;
    expect(consumptionMult('sat', b)).toBe(1.25);
    expect(consumptionMult('rest', b)).toBe(1);
  });
  it('N07 comer: sube sin pasar de 100 y no se gasta si no sirve (A14 parte)', () => {
    expect(feed({ sat: 90, hyd: 50, rest: 50 }, { sat: 25 })!.sat).toBe(100);
    expect(feed({ sat: 100, hyd: 50, rest: 50 }, { sat: 25 })).toBeNull();
    const f = feed({ sat: 0, hyd: 0, rest: 50, satZero: 7 }, { sat: 25 })!;
    expect(f.satZero).toBe(0);
  });
  it('N08 avisos antes del daño: cruzar 30, 10 y 0', () => {
    const t = tickNeeds({ sat: 30.05, hyd: 100, rest: 100 }, fullBody(300), 300);
    expect(t.crossed).toEqual([{ need: 'sat', level: 'low' }]);
    expect(pulsesToNext({ sat: 100, hyd: 100, rest: 100 }, 'hyd')).toBe(Math.ceil(70 / NEED_CFG.rate.hyd));
    expect(pulsesToNext({ sat: 100, hyd: 0, rest: 100, hydZero: 3 }, 'hyd')).toBe(2);
    expect(pulsesToNext({ sat: 100, hyd: 100, rest: 0 }, 'rest')).toBeNull();
  });
  it('N09 Bastión: suministro a 60, catre a 100; partidas antiguas llenas', () => {
    expect(baseSupply({ sat: 10, hyd: 75, rest: 3 })).toEqual({ sat: 60, hyd: 75, rest: 3 });
    expect(sleep({ sat: 10, hyd: 75, rest: 3 }).rest).toBe(100);
    expect(needsOf(undefined)).toEqual(FULL_NEEDS);
    expect(toSaved({ sat: 33.333, hyd: 1, rest: 2, hydZero: 4 })).toEqual({ sat: 33.3, hyd: 1, rest: 2 });
  });
  it('N10 la expedición lleva y devuelve las necesidades', () => {
    const p = { ...createProfile('Aldric', 'warrior', { cloak: 0, skin: 0 }), needs: { sat: 20, hyd: 70, rest: 40 } };
    const { profile, expedition } = startExpedition(p, 1000);
    expect(expedition.needs).toMatchObject({ sat: 20, hyd: 70, rest: 40 });
    const end = endExpedition(profile, { ...expedition, needs: { sat: 5, hyd: 90, rest: 10 } }, 'extracted', 2000);
    expect(end.profile.needs).toEqual({ sat: 60, hyd: 90, rest: 10 });
  });
  it('N11 en combate: una ronda es un pulso; el máximo del recurso baja y beber no rellena (A14)', () => {
    const p = createProfile('Aldric', 'mage', { cloak: 0, skin: 0 });
    const base = playerCombatant(p.character, p.equipment, 999, 999);
    const pl = playerCombatant(p.character, p.equipment, 999, 999, {}, undefined, { body: fullBody(base.stats.maxHp), needs: { sat: 100, hyd: 100, rest: 5 } });
    expect(pl.stats.maxMp).toBe(Math.round(base.stats.maxMp * 0.8));
    expect(pl.mp).toBe(pl.stats.maxMp);
    const tired = playerCombatant(p.character, p.equipment, 999, 999, {}, undefined, { body: fullBody(base.stats.maxHp), needs: { sat: 100, hyd: 100, rest: 0 } });
    expect(speedOf(tired)).toBeCloseTo(base.stats.spd * 0.8, 5);
    const s = createCombat([pl, enemyCombatant('bandit', 'e1', 'B', 1)], 3);
    expect(getCombatant(s, 'player').needs!.rest).toBe(5);
  });
});
