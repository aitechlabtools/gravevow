import { describe, expect, it } from 'vitest';
import {
  applyTreatment, bleedTick, bodyHp, damageRegion, damageSpread, fromWounds, fullBody, healBody, initiativeMult, isDead,
  offenseMult, regionMaxes, REGIONS, rollRegion, tickPain, stabilize, summaryHp, toWounds, treatError, urgencies, bestTreatment, vesperPrice, type Body,
} from '../src/core/anatomy';
import { createCombat, performAction, runAITurn, currentActor, canUseSkill, getCombatant, opponents, distinctNames, type CombatState, type CombatAction } from '../src/core/combat';
import { getSkill } from '../src/core/data/skills';
import { enemyCombatant, playerCombatant } from '../src/core/combatants';
import { createProfile } from '../src/core/profile';
import { startExpedition, endExpedition } from '../src/core/expedition';
import { makeRng } from '../src/core/rng';
import type { ClassId } from '../src/core/types';

// Fase 4: anatomía de siete regiones, sangrado, fracturas y tratamientos (plan maestro, apartados 08 y 09).

const clone = (b: Body): Body => structuredClone(b);

describe('Reparto de la vida', () => {
  it('las siete regiones suman exactamente la vida máxima, sin crear ni perder por redondeo', () => {
    for (const total of [1, 7, 97, 100, 123, 451, 1999]) {
      const m = regionMaxes(total);
      expect(REGIONS.reduce((n, r) => n + m[r], 0)).toBe(total);
    }
    expect(regionMaxes(100)).toEqual({ head: 10, thorax: 25, abdomen: 15, armL: 10, armR: 10, legL: 15, legR: 15 });
  });
});

describe('Muerte y exceso de daño', () => {
  it('A07: la cabeza o el tórax a cero es la muerte, aunque quede vida en el resto', () => {
    const b = damageRegion(fullBody(200), 'thorax', 999).body;
    expect(isDead(b)).toBe(true);
    expect(summaryHp(b)).toBe(0);
    expect(isDead(damageRegion(fullBody(200), 'head', 20).body)).toBe(true);
  });
  it('un brazo a cero no mata: queda inutilizado y el resto se reparte', () => {
    const r = damageRegion(fullBody(100), 'armL', 14);
    expect(r.dead).toBe(false);
    expect(r.body.parts.armL.hp).toBe(0);
    expect(r.disabled).toEqual(['armL']);
    expect(r.dealt).toBe(14);
    expect(bodyHp(r.body)).toBe(86);
  });
  it('A08: golpear un brazo inutilizado reparte el daño entero entre lo que funciona', () => {
    const b = damageRegion(fullBody(100), 'armL', 10).body;
    const r = damageRegion(b, 'armL', 23);
    expect(r.dealt).toBe(23);
    expect(bodyHp(r.body)).toBe(90 - 23);
    expect(r.body.parts.armL.hp).toBe(0);
  });
  it('el daño de área reparte un presupuesto (no lo multiplica por siete)', () => {
    const r = damageSpread(fullBody(100), 20);
    expect(r.dealt).toBe(20);
    expect(bodyHp(r.body)).toBe(80);
  });
  it('pagar vida con una habilidad nunca mata', () => {
    const b = damageRegion(fullBody(100), 'thorax', 24).body;
    const r = damageSpread(b, 500, { lethal: false });
    expect(r.dead).toBe(false);
    expect(r.body.parts.thorax.hp).toBe(1);
    expect(r.body.parts.head.hp).toBe(1);
  });
  it('S1 y S2: los golpes normales no van a la cabeza', () => {
    const rng = makeRng(42);
    for (let i = 0; i < 2000; i++) expect(rollRegion(rng, false)).not.toBe('head');
    const rng2 = makeRng(7);
    expect(Array.from({ length: 2000 }, () => rollRegion(rng2, true))).toContain('head');
  });
});

describe('Sangrado', () => {
  it('leve 0,5 % y grave 1 % por pulso, con decimales guardados por región', () => {
    let b = fullBody(100);
    b.parts.armL.bleed = 1;
    const hp0 = bodyHp(b);
    for (let i = 0; i < 4; i++) b = bleedTick(b).body;
    expect(hp0 - bodyHp(b)).toBe(2);
    b = fullBody(100); b.parts.legR.bleed = 2;
    for (let i = 0; i < 5; i++) b = bleedTick(b).body;
    expect(100 - bodyHp(b)).toBe(5);
  });
  it('A09: siete hemorragias graves no pasan del techo del 3 % por pulso, repartido en proporción', () => {
    let b = fullBody(1000);
    for (const r of REGIONS) b.parts[r].bleed = 2;
    const t = bleedTick(b);
    expect(1000 - bodyHp(t.body)).toBeLessThanOrEqual(30);
    b = t.body;
    for (let i = 0; i < 9; i++) b = bleedTick(b).body;
    // 10 pulsos al techo (30): los restos decimales se guardan por región, no se redondean al alza
    expect(1000 - bodyHp(b)).toBeLessThanOrEqual(300);
    expect(1000 - bodyHp(b)).toBeGreaterThanOrEqual(293);
  });
  it('un sangrado puede matar si nadie lo detiene', () => {
    let b = fullBody(100);
    b.parts.thorax.bleed = 2;
    let pulses = 0;
    while (!isDead(b) && pulses < 500) { b = bleedTick(b).body; pulses++; }
    expect(isDead(b)).toBe(true);
  });
});

describe('Tratamientos', () => {
  it('A11: el torniquete en el abdomen se rechaza con explicación', () => {
    const b = fullBody(100); b.parts.abdomen.bleed = 2;
    expect(treatError(b, 'tourniquet', 'abdomen')).toMatch(/brazos y piernas/);
  });
  it('la venda no basta para un sangrado grave; el hemostático sí, y avisa si era leve', () => {
    const b = fullBody(100); b.parts.thorax.bleed = 2; b.parts.armR.bleed = 1;
    expect(treatError(b, 'bandage', 'thorax')).toMatch(/grave/);
    expect(treatError(b, 'hemostatic', 'thorax')).toBeNull();
    expect(applyTreatment(b, 'hemostatic', 'armR').text).toMatch(/venda habría bastado/);
  });
  it('detener una hemorragia no devuelve la vida perdida; la férula quita la fractura y no cura', () => {
    let b = damageRegion(fullBody(100), 'legL', 9).body;
    b.parts.legL.bleed = 1; b.parts.legL.fracture = true;
    const before = bodyHp(b);
    b = applyTreatment(b, 'bandage', 'legL').body;
    b = applyTreatment(b, 'splint', 'legL').body;
    expect(b.parts.legL.bleed).toBe(0);
    expect(b.parts.legL.fracture).toBe(false);
    expect(bodyHp(b)).toBe(before);
  });
  it('la cirugía levanta una región inutilizada al 20 %, limita su máximo al 60 % y solo una vez', () => {
    let b = damageRegion(fullBody(100), 'armL', 10).body;
    expect(treatError(b, 'surgery', 'head')).toMatch(/cabeza/);
    expect(treatError(b, 'surgery', 'armL')).toBeNull();
    b = applyTreatment(b, 'surgery', 'armL').body;
    expect(b.parts.armL.hp).toBe(2);
    b = healBody(b, 500).body;
    expect(b.parts.armL.hp).toBe(6);
    b = damageRegion(b, 'armL', 6).body;
    expect(treatError(b, 'surgery', 'armL')).toMatch(/Ya operaste/);
  });
  it('la poción no cura regiones inutilizadas ni quita lesiones', () => {
    let b = damageRegion(fullBody(100), 'armR', 10).body;
    b = damageRegion(b, 'thorax', 10).body;
    b.parts.legL.bleed = 1;
    const h = healBody(b, 50);
    expect(h.body.parts.armR.hp).toBe(0);
    expect(h.body.parts.thorax.hp).toBe(25);
    expect(h.body.parts.legL.bleed).toBe(1);
    expect(healBody(damageRegion(fullBody(100), 'head', 10).body, 50).healed).toBe(0);
  });
  it('el tratamiento rápido propone primero el sangrado grave y el remedio más barato que sirve', () => {
    const b = fullBody(100); b.parts.armL.bleed = 1; b.parts.legR.bleed = 2; b.parts.armR.fracture = true;
    const u = urgencies(b);
    expect(u[0]).toEqual({ region: 'legR', need: 'bleed2' });
    expect(bestTreatment(b, u[0], () => true)).toBe('tourniquet');
    expect(bestTreatment(b, u[1], () => true)).toBe('bandage');
    expect(bestTreatment(b, u[0], (t) => t === 'bandage')).toBeNull();
  });
});

describe('Penalizaciones con tope', () => {
  it('brazos: el ataque nunca baja más de un 40 %; piernas: la iniciativa nunca baja del 50 %', () => {
    let b = fullBody(100);
    expect(offenseMult(b)).toBe(1);
    b.parts.armL.fracture = true;
    expect(offenseMult(b)).toBeCloseTo(0.85); // fractura y dolor
    b = damageRegion(damageRegion(b, 'armL', 99).body, 'armR', 99).body;
    expect(offenseMult(b)).toBeCloseTo(0.6);
    b = damageRegion(damageRegion(b, 'legL', 99).body, 'legR', 99).body;
    expect(initiativeMult(b)).toBe(0.5);
  });
});

describe('Bastión: estabilización y Vesper', () => {
  it('al volver: sin sangrados, cada región al 50 % como mínimo y las fracturas siguen', () => {
    let b = damageRegion(fullBody(100), 'armL', 10).body;
    b = damageRegion(b, 'thorax', 20).body;
    b.parts.legL.fracture = true; b.parts.thorax.bleed = 2;
    const s = stabilize(b);
    expect(s.parts.armL.hp).toBe(5);
    expect(s.parts.thorax.hp).toBe(13);
    expect(s.parts.thorax.bleed).toBe(0);
    expect(s.parts.legL.fracture).toBe(true);
    // Repetirla no sube más
    expect(stabilize(s)).toEqual(s);
  });
  it('las heridas viajan al perfil y vuelven a la siguiente incursión; sin heridas no se guarda nada', () => {
    expect(toWounds(fullBody(100))).toBeNull();
    const b = clone(fullBody(100)); b.parts.legR.hp = 9; b.parts.armL.fracture = true;
    const back = fromWounds(toWounds(b), 100);
    expect(back.parts.legR.hp).toBe(9);
    expect(back.parts.armL.fracture).toBe(true);
    expect(vesperPrice(back)).toBeGreaterThan(0);
    expect(vesperPrice(fullBody(100))).toBe(0);
  });
  it('morir o extraer guarda heridas estabilizadas; una partida antigua (sin heridas) entra entera', () => {
    const p = createProfile('Sim', 'warrior', { cloak: 0, skin: 0 });
    const { profile, expedition } = startExpedition(p, 1000);
    expect(expedition.hp).toBe(bodyHp(expedition.body));
    const hurt = { ...expedition, body: damageRegion(expedition.body, 'head', 999).body };
    const dead = endExpedition(profile, hurt, 'died', 2000).profile;
    const next = startExpedition(dead, 3000).expedition;
    expect(isDead(next.body)).toBe(false);
    expect(next.body.parts.head.hp).toBeGreaterThanOrEqual(Math.ceil(regionMaxes(next.body.total).head * 0.5));
  });
});

// ── Combate con anatomía ──

const hero = (cls: ClassId, level: number, anatomy: boolean) => {
  const p = createProfile('Sim', cls, { cloak: 0, skin: 0 });
  const ch = { ...p.character, level };
  const base = playerCombatant(ch, p.equipment, 999, 999);
  return anatomy ? playerCombatant(ch, p.equipment, 999, 999, {}, undefined, { body: fullBody(base.stats.maxHp) }) : base;
};

function playOut(s: CombatState, potions: number): CombatState {
  let left = potions;
  for (let guard = 0; !s.outcome && guard < 400; guard++) {
    const a = currentActor(s)!;
    if (a.control !== 'player') { s = runAITurn(s); continue; }
    const me = getCombatant(s, 'player');
    const foes = opponents(s, me).sort((x, y) => x.hp - y.hp);
    // Con anatomía, un jugador sensato mira el tórax y la cabeza, no solo la barra total
    const vital = me.body ? Math.min(me.body.parts.thorax.hp / regionMaxes(me.body.total).thorax, me.body.parts.head.hp / regionMaxes(me.body.total).head) : 1;
    if ((me.hp / me.stats.maxHp < 0.4 || vital < 0.4) && left > 0) { left--; s = performAction(s, { type: 'item', itemId: 'health_potion' }); continue; }
    const off = me.skills.map(getSkill).filter((k) => k.target === 'enemy' && canUseSkill(me, k.id)).sort((x, y) => Number(!!y.aoe) - Number(!!x.aoe) || (y.power ?? 0) - (x.power ?? 0));
    let action: CombatAction = { type: 'attack', targetId: foes[0].id };
    if (me.skills.includes('mana_shield') && canUseSkill(me, 'mana_shield') && !me.shield) action = { type: 'skill', skillId: 'mana_shield' };
    else if (off.length) action = { type: 'skill', skillId: off[0].id, targetId: foes[0].id };
    s = performAction(s, action);
  }
  return s;
}

describe('Combate con anatomía', () => {
  it('el golpe queda en una región, la vida es la suma y el combate sobrevive a JSON', () => {
    let s = createCombat([hero('warrior', 4, true), enemyCombatant('bandit', 'e1', 'B', 3)], 77);
    s = playOut(s, 2);
    const me = getCombatant(s, 'player');
    expect(me.hp).toBe(summaryHp(me.body!));
    expect(s.events.length + s.log.length).toBeGreaterThan(0);
    const again = JSON.parse(JSON.stringify(createCombat([hero('mage', 4, true), enemyCombatant('bandit', 'e1', 'B', 3)], 5))) as CombatState;
    expect(playOut(again, 1).outcome).not.toBeNull();
  });
  it('la venda en combate gasta el turno y detiene el sangrado; un remedio inútil no se gasta', () => {
    const pl = hero('warrior', 4, true);
    pl.stats = { ...pl.stats, spd: 99 };
    pl.body!.parts.armL.bleed = 1;
    let s = createCombat([pl, enemyCombatant('bandit', 'e1', 'B', 1)], 3);
    expect(() => performAction(s, { type: 'item', itemId: 'tourniquet', region: 'abdomen' })).toThrow(/brazos y piernas/);
    s = performAction(s, { type: 'item', itemId: 'bandage', region: 'armL' });
    expect(s.events.some((e) => e.type === 'itemUsed' && e.itemId === 'bandage')).toBe(true);
    expect(getCombatant(s, 'player').body!.parts.armL.bleed).toBe(0);
    expect(() => performAction({ ...s, turnIndex: s.order.indexOf('player') }, { type: 'item', itemId: 'surgery_kit', region: 'armL' })).toThrow(/aún funciona/);
  });
  it('S1: ambas clases siguen ganando 1 contra 1 y 1 contra 2 con anatomía', () => {
    const runs = 200;
    for (const cls of ['warrior', 'mage'] as const) {
      const rate: Record<string, number> = {};
      for (const anatomy of [false, true]) {
        let w1 = 0, w2 = 0;
        for (let seed = 1; seed <= runs; seed++) {
          const [a, b] = seed % 2 ? ['bandit', 'starving_wolf'] : ['carrion_crow', 'renegade_archer'];
          if (playOut(createCombat([hero(cls, 4, anatomy), enemyCombatant(a, 'e1', 'B', 3)], seed * 31), 2).outcome === 'victory') w1++;
          if (playOut(createCombat([hero(cls, 4, anatomy), ...distinctNames([enemyCombatant(a, 'e1', 'B', 3), enemyCombatant(b, 'e2', 'B', 3)])], seed * 7919), 2).outcome === 'victory') w2++;
        }
        rate[`${anatomy ? 'anat' : 'barra'}1`] = w1 / runs; rate[`${anatomy ? 'anat' : 'barra'}2`] = w2 / runs;
      }
      console.log(`${cls}: 1c1 ${(rate.barra1 * 100).toFixed(0)}% → ${(rate.anat1 * 100).toFixed(0)}% · 1c2 ${(rate.barra2 * 100).toFixed(0)}% → ${(rate.anat2 * 100).toFixed(0)}% (barra única → anatomía)`);
      expect(rate.anat1).toBeGreaterThanOrEqual(0.9);
      expect(rate.anat2).toBeGreaterThanOrEqual(0.8);
    }
  });
});

describe('Dolor y analgésico', () => {
  it('cada fractura o región inutilizada duele: resta algo más, siempre dentro de los topes', () => {
    const b = fullBody(100); b.parts.armL.fracture = true;
    expect(offenseMult(b)).toBeCloseTo(1 - 0.1 - 0.05);
    expect(initiativeMult(b)).toBeCloseTo(0.95);
    const all = fullBody(100);
    for (const r of REGIONS) all.parts[r].fracture = true;
    expect(offenseMult(all)).toBeCloseTo(0.6);
    expect(initiativeMult(all)).toBe(0.5);
  });
  it('el analgésico quita el dolor unos pulsos, no cura, y no se gasta sin dolor', () => {
    let b = fullBody(100);
    expect(treatError(b, 'painkiller', 'thorax')).toMatch(/No te duele/);
    b.parts.legL.fracture = true;
    b = applyTreatment(b, 'painkiller', 'thorax').body;
    expect(b.parts.legL.fracture).toBe(true);
    expect(initiativeMult(b)).toBeCloseTo(1 - 0.12);
    expect(treatError(b, 'painkiller', 'thorax')).toMatch(/aún hace efecto/);
    for (let i = 0; i < 10; i++) b = tickPain(b);
    expect(b.painFree).toBeUndefined();
    expect(initiativeMult(b)).toBeCloseTo(1 - 0.12 - 0.05);
  });
});

describe('Cirugía en combate (dos turnos)', () => {
  const setup = (seed: number) => {
    const pl = hero('warrior', 4, true);
    pl.stats = { ...pl.stats, spd: 99 };
    pl.body = damageRegion(pl.body!, 'armL', regionMaxes(pl.body!.total).armL).body;
    const foe = enemyCombatant('bandit', 'e1', 'B', 1);
    return createCombat([pl, foe], seed);
  };
  it('gasta el equipo al empezar y, si nada te golpea, levanta la región en el segundo turno', () => {
    let s = setup(1);
    // El enemigo no puede golpear: aturdido toda la prueba
    s = structuredClone(s); getCombatant(s, 'e1').statuses.push({ id: 'stun', turns: 5 });
    s = performAction(s, { type: 'item', itemId: 'surgery_kit', region: 'armL' });
    expect(s.events.some((e) => e.type === 'itemUsed' && e.itemId === 'surgery_kit')).toBe(true);
    while (currentActor(s)?.control !== 'player') s = runAITurn(s);
    expect(getCombatant(s, 'player').surgery?.region).toBe('armL');
    s = performAction(s, { type: 'surgery' });
    const me = getCombatant(s, 'player');
    expect(me.surgery).toBeUndefined();
    expect(me.body!.parts.armL.hp).toBeGreaterThan(0);
    expect(me.body!.parts.armL.operated).toBe(true);
  });
  it('A12: un golpe entre los dos turnos la interrumpe; el equipo no vuelve y la región sigue a cero', () => {
    let s = setup(2);
    s = structuredClone(s);
    const e = getCombatant(s, 'e1'); e.stats = { ...e.stats, atk: 30, crit: 0 };
    const p0 = getCombatant(s, 'player'); p0.stats = { ...p0.stats, eva: 0 };
    s = performAction(s, { type: 'item', itemId: 'surgery_kit', region: 'armL' });
    while (currentActor(s)?.control !== 'player' && !s.outcome) s = runAITurn(s);
    const me = getCombatant(s, 'player');
    expect(me.surgery).toBeUndefined();
    expect(me.body!.parts.armL.hp).toBe(0);
    expect(s.log.some((l) => l.includes('interrumpe la cirugía'))).toBe(true);
    expect(() => performAction(s, { type: 'surgery' })).toThrow(/No estás operando/);
  });
  it('hacer otra cosa a medias abandona la cirugía', () => {
    let s = setup(3);
    s = structuredClone(s); getCombatant(s, 'e1').statuses.push({ id: 'stun', turns: 5 });
    s = performAction(s, { type: 'item', itemId: 'surgery_kit', region: 'armL' });
    while (currentActor(s)?.control !== 'player') s = runAITurn(s);
    s = performAction(s, { type: 'defend' });
    expect(getCombatant(s, 'player').surgery).toBeUndefined();
    expect(getCombatant(s, 'player').body!.parts.armL.hp).toBe(0);
  });
});
