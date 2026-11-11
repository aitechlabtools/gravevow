import { describe, expect, it } from 'vitest';
import { createCombat, performAction, runAITurn, currentActor, canUseSkill, getCombatant, opponents, distinctNames, MAX_PER_SIDE, type CombatState, type CombatAction, type Combatant } from '../src/core/combat';
import { getSkill } from '../src/core/data/skills';
import { enemyCombatant, playerCombatant, rivalCombatant } from '../src/core/combatants';
import { createProfile } from '../src/core/profile';
import type { ClassId } from '../src/core/types';

// Fase 2: combate 1 contra 2 y 2 contra 2 (máximo dos por bando).

const hero = (cls: ClassId, level = 3) => {
  const p = createProfile('Sim', cls, { cloak: 0, skin: 0 });
  return playerCombatant({ ...p.character, level }, p.equipment, 999, 999);
};

/** Jugador razonable contra dos enemigos: remata al más débil, se cura y usa su mejor ataque. */
function playOut(s: CombatState, potions: number, seed: number, fleeAt = 0): CombatState {
  let left = potions;
  for (let guard = 0; !s.outcome && guard < 400; guard++) {
    const a = currentActor(s)!;
    if (a.control !== 'player') { s = runAITurn(s); continue; }
    const me = getCombatant(s, 'player');
    const foes = opponents(s, me).sort((x, y) => x.hp - y.hp);
    if (fleeAt && me.hp / me.stats.maxHp < fleeAt) { s = performAction(s, { type: 'flee' }); continue; }
    if (me.hp / me.stats.maxHp < 0.4 && left > 0) { left--; s = performAction(s, { type: 'item', itemId: 'health_potion' }); continue; }
    const off = me.skills.map(getSkill).filter((k) => k.target === 'enemy' && canUseSkill(me, k.id)).sort((x, y) => Number(!!y.aoe) - Number(!!x.aoe) || (y.power ?? 0) - (x.power ?? 0));
    let action: CombatAction = { type: 'attack', targetId: foes[0].id };
    if (me.skills.includes('mana_shield') && canUseSkill(me, 'mana_shield') && !me.shield) action = { type: 'skill', skillId: 'mana_shield' };
    else if (me.skills.includes('block') && canUseSkill(me, 'block') && seed % 3 === 0 && !me.statuses.some((x) => x.id === 'block')) action = { type: 'skill', skillId: 'block' };
    else if (off.length) action = { type: 'skill', skillId: off[0].id, targetId: foes[0].id };
    s = performAction(s, action);
  }
  return s;
}

const pair = (a: string, b: string, level: number) => distinctNames([enemyCombatant(a, 'e1', 'B', level), enemyCombatant(b, 'e2', 'B', level)]);

describe('Límite de dos por bando', () => {
  it('createCombat rechaza un tercer combatiente en un bando', () => {
    expect(MAX_PER_SIDE).toBe(2);
    const three = [hero('warrior'), rivalCombatant('kael', 100, 'A', 1), rivalCombatant('osric', 100, 'A', 1), enemyCombatant('bandit', 'e', 'B')];
    expect(() => createCombat(three, 1)).toThrow(/máximo 2/);
    expect(() => createCombat([hero('warrior'), ...pair('bandit', 'bandit', 1), enemyCombatant('bandit', 'e3', 'B')], 1)).toThrow();
  });
  it('dos enemigos iguales se distinguen por el nombre', () => {
    const [a, b] = pair('bandit', 'bandit', 1);
    expect(a.name).not.toBe(b.name);
    expect(a.name.endsWith(' I')).toBe(true);
    expect(b.name.endsWith(' II')).toBe(true);
    const [c, d] = pair('bandit', 'starving_wolf', 1);
    expect(c.name).toBe(enemyCombatant('bandit', 'x').name);
    expect(d.name).toBe(enemyCombatant('starving_wolf', 'y').name);
  });
});

describe('Objetivos con dos enemigos', () => {
  it('el ataque va al objetivo elegido y, si ya ha muerto, a otro vivo', () => {
    const pl = { ...hero('warrior', 30), stats: { ...hero('warrior', 30).stats, spd: 99 } };
    let s = createCombat([pl, ...pair('carrion_crow', 'carrion_crow', 1)], 5);
    s = performAction(s, { type: 'attack', targetId: 'e2' });
    expect(s.events.find((e) => e.type === 'action')).toMatchObject({ targetId: 'e2' });
    // Matamos a e2 a mano y apuntamos a él: el golpe va a e1
    s = structuredClone(s);
    getCombatant(s, 'e2').hp = 0;
    while (currentActor(s)?.control !== 'player') s = runAITurn(s);
    s = performAction(s, { type: 'attack', targetId: 'e2' });
    expect(s.events.find((e) => e.type === 'action')).toMatchObject({ targetId: 'e1' });
  });
  it('la victoria llega solo cuando caen los dos', () => {
    let s = createCombat([hero('warrior', 30), ...pair('carrion_crow', 'carrion_crow', 1)], 9);
    s = structuredClone(s);
    getCombatant(s, 'e1').hp = 0;
    while (currentActor(s)?.control !== 'player') s = runAITurn(s);
    expect(s.outcome).toBeNull();
    s = playOut(s, 0, 1);
    expect(s.outcome).toBe('victory');
  });
});

describe('Defensa que cubre hasta tu próximo turno', () => {
  it('el bloqueo frena el primer golpe y deja en guardia frente al segundo atacante', () => {
    const w = hero('warrior', 5);
    const me: Combatant = { ...w, stats: { ...w.stats, spd: 99, eva: 0 }, skills: [...new Set([...w.skills, 'block'])] };
    const foes = pair('bandit', 'bandit', 5).map((f) => ({ ...f, skills: [], stats: { ...f.stats, eva: 0, crit: 0 } }));
    let s = createCombat([me, ...foes], 3);
    s = performAction(s, { type: 'skill', skillId: 'block' });
    // Primer bandido golpea: se gasta el bloqueo y queda en guardia
    s = runAITurn(s);
    const after1 = getCombatant(s, 'player');
    expect(after1.statuses.some((x) => x.id === 'block')).toBe(false);
    expect(after1.defending).toBe(true);
    // Segundo bandido: sigue en guardia hasta que vuelva su turno
    s = runAITurn(s);
    expect(currentActor(s)?.id).toBe('player');
    expect(getCombatant(s, 'player').defending).toBe(false); // se retira al empezar su propio turno
    const hits = s.events.filter((e) => e.type === 'damage');
    expect(hits.length).toBeGreaterThan(0);
  });
});

describe('Guardado del combate', () => {
  it('un combate de dos contra dos sobrevive a JSON y continúa igual', () => {
    const start = createCombat([hero('mage', 5), rivalCombatant('kael', 120, 'A', 1, 5), ...pair('bandit', 'starving_wolf', 5)], 77);
    let a = start;
    for (let i = 0; i < 4 && !a.outcome; i++) a = currentActor(a)!.control === 'player' ? performAction(a, { type: 'attack', targetId: 'e1' }) : runAITurn(a);
    const b = JSON.parse(JSON.stringify(a)) as CombatState;
    expect(b).toEqual(a);
    const ra = playOut(a, 2, 4), rb = playOut(b, 2, 4);
    expect(rb.outcome).toBe(ra.outcome);
    expect(rb.log).toEqual(ra.log);
  });
});

describe('1 contra 2: ambas clases pueden ganar y huir', () => {
  const runs = 200;
  for (const cls of ['warrior', 'mage'] as const) {
    it(`${cls}: gana contra dos enemigos de Afueras y puede escapar`, () => {
      let wins = 0, fled = 0;
      for (let seed = 1; seed <= runs; seed++) {
        const [a, b] = seed % 2 ? ['bandit', 'starving_wolf'] : ['carrion_crow', 'renegade_archer'];
        const s = createCombat([hero(cls, 4), ...pair(a, b, 3)], seed * 7919, { canFlee: true });
        if (playOut(s, 2, seed).outcome === 'victory') wins++;
        const f = createCombat([hero(cls, 4), ...pair(a, b, 3)], seed * 104729, { canFlee: true });
        if (playOut(f, 0, seed, 0.99).outcome === 'fled') fled++;
      }
      console.log(`${cls} 1 contra 2: ${(wins / runs * 100).toFixed(0)}% victorias · ${(fled / runs * 100).toFixed(0)}% huidas`);
      expect(wins / runs).toBeGreaterThanOrEqual(0.6);
      expect(fled / runs).toBeGreaterThanOrEqual(0.5);
    });
  }
});
