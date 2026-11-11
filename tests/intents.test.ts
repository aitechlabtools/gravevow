// Fase 8: ataques anunciados, exposición, interrupción, fases de jefe y retirada con recuerdo.
import { describe, expect, it } from 'vitest';
import { bossMemory, chooseAIAction, createCombat, currentActor, getCombatant, performAction, readIntents, restoreBoss, rollDamage, runAITurn, distinctNames, type CombatState, type Combatant, type CombatAction } from '../src/core/combat';
import { enemyCombatant, playerCombatant } from '../src/core/combatants';
import { createProfile } from '../src/core/profile';
import { makeRng } from '../src/core/rng';
import { fullBody } from '../src/core/anatomy';
import { ENEMIES } from '../src/core/data/enemies';
import { ENEMY_PATTERNS, MOVES, REGIONAL_BOSSES, getMove } from '../src/core/data/intents';
import { SUBZONES } from '../src/core/data/subzones';
import { DRAIN_PCT, EXPOSED_MULT } from '../src/config/intents';
import { getSkill } from '../src/core/data/skills';
import { canUseSkill } from '../src/core/combat';
import { intentResponse } from './intentPlayer';

const hero = (cls: 'warrior' | 'mage', level = 6, anatomy = false) => {
  const p = createProfile('Aldric', cls, { cloak: 0, skin: 0 });
  const base = playerCombatant({ ...p.character, level }, p.equipment, 999, 999);
  return anatomy ? playerCombatant({ ...p.character, level }, p.equipment, 999, 999, {}, undefined, { body: fullBody(base.stats.maxHp) }) : base;
};
/** Enemigo con un patrón forzado, sin esquiva y con vida de sobra para que el combate dure. */
const foe = (id: string, moves: string[], every = 1, hpMult = 4): Combatant => {
  const c = enemyCombatant(id, 'e', 'B', 4);
  return { ...c, stats: { ...c.stats, eva: 0, maxHp: c.stats.maxHp * hpMult }, hp: c.stats.maxHp * hpMult, skillChance: 0, pattern: { every, moves } };
};
/** Juega turnos de la IA hasta que sea el turno del jugador. */
const toPlayer = (s: CombatState) => { for (let g = 0; g < 20 && !s.outcome && currentActor(s)!.control !== 'player'; g++) s = runAITurn(s); return s; };

describe('Fase 8: ataques anunciados', () => {
  it('tras sus acciones normales anuncia el golpe (objetivo y ataque) y en su siguiente turno lo descarga', () => {
    let s = toPlayer(createCombat([hero('warrior'), foe('bandit', ['heavy_blow'])], 11));
    for (let g = 0; g < 6 && !getCombatant(s, 'e').intent; g++) s = toPlayer(performAction(s, { type: 'attack', targetId: 'e' }));
    const e = getCombatant(s, 'e');
    expect(e.intent?.move).toBe('heavy_blow');
    expect(e.intent?.targetId).toBe('player');
    expect(s.log.some((l) => l.startsWith('⚠') && l.includes('golpe pesado'))).toBe(true);
    expect(readIntents(s, getCombatant(s, 'player')).threat?.id).toBe('e');
    // Turno del jugador; después la IA descarga
    s = performAction(s, { type: 'defend' });
    expect(currentActor(s)!.id).toBe('e');
    expect(chooseAIAction(s)).toEqual({ type: 'unleash' });
    s = runAITurn(s);
    expect(getCombatant(s, 'e').intent).toBeUndefined();
    expect(s.log.some((l) => l.includes('Golpe pesado') && l.includes('en guardia'))).toBe(true);
  });

  it('la guardia reduce el golpe anunciado a una cuarta parte (de media) y evita la lesión de la embestida', () => {
    let guarded = 0, open = 0, injuriesGuarded = 0;
    for (let seed = 1; seed <= 60; seed++) {
      for (const guard of [true, false]) {
        const pl = hero('warrior', 10, true);
        let s = toPlayer(createCombat([{ ...pl, stats: { ...pl.stats, eva: 0 } }, foe('torturer', ['charge'])], seed * 97));
        for (let g = 0; g < 6 && !getCombatant(s, 'e').intent; g++) s = toPlayer(performAction(s, { type: 'defend' }));
        const region = getCombatant(s, 'e').intent!.region;
        expect(['thorax', 'legL', 'legR']).toContain(region);
        s = performAction(s, guard ? { type: 'defend' } : { type: 'item', itemId: 'health_potion' });
        const from = s.log.length;
        s = runAITurn(s);
        const hit = s.events.find((ev) => ev.type === 'damage' && ev.targetId === 'player');
        if (!hit || hit.type !== 'damage') continue;
        expect(hit.region).toBe(region);
        if (guard) { guarded += hit.amount; if (s.log.slice(from).some((l) => /sangrado|fractura/.test(l))) injuriesGuarded++; } else open += hit.amount;
      }
    }
    expect(guarded / open).toBeLessThan(0.35);
    expect(injuriesGuarded).toBe(0);
  });

  it('tras descargar queda expuesto: recibe un 50 % más hasta que actúa otra vez', () => {
    const pl = hero('warrior');
    const e = enemyCombatant('skeleton', 'e', 'B', 4);
    const a = rollDamage(pl, { ...e, exposed: 0 }, 'physical', 1, makeRng(5), { ignoresEvasion: true });
    const b = rollDamage(pl, { ...e, exposed: 1 }, 'physical', 1, makeRng(5), { ignoresEvasion: true });
    expect(b.amount / a.amount).toBeCloseTo(EXPOSED_MULT, 1);
    let s = toPlayer(createCombat([hero('warrior'), foe('bandit', ['heavy_blow'])], 21));
    for (let g = 0; g < 6 && !getCombatant(s, 'e').intent; g++) s = toPlayer(performAction(s, { type: 'defend' }));
    s = runAITurn(performAction(s, { type: 'defend' }));
    expect(getCombatant(s, 'e').exposed).toBe(1);
    expect(readIntents(s, getCombatant(s, 'player')).exposed?.id).toBe('e');
    s = toPlayer(runAITurn(performAction(s, { type: 'defend' })));
    expect(getCombatant(s, 'e').exposed ?? 0).toBe(0);
  });

  it('la absorción se corta con un golpe; si no, roba Ímpetu o Maná', () => {
    // Cortada
    let s = toPlayer(createCombat([hero('mage', 8), foe('mourner', ['soul_drain'])], 31));
    for (let g = 0; g < 6 && !getCombatant(s, 'e').intent; g++) s = toPlayer(performAction(s, { type: 'defend' }));
    expect(readIntents(s, getCombatant(s, 'player')).breakable?.id).toBe('e');
    s = performAction(s, { type: 'attack', targetId: 'e' });
    expect(getCombatant(s, 'e').intent).toBeUndefined();
    expect(s.log.some((l) => l.startsWith('¡Interrumpido!'))).toBe(true);
    // Sin cortar
    s = toPlayer(createCombat([hero('mage', 8), foe('mourner', ['soul_drain'])], 31));
    for (let g = 0; g < 6 && !getCombatant(s, 'e').intent; g++) s = toPlayer(performAction(s, { type: 'defend' }));
    const mp0 = getCombatant(s, 'player').mp;
    s = runAITurn(performAction(s, { type: 'defend' }));
    const p = getCombatant(s, 'player');
    expect(mp0 - p.mp).toBeGreaterThan(0);
    expect(mp0 - p.mp).toBeLessThanOrEqual(Math.round(p.stats.maxMp * DRAIN_PCT) + 2);
  });

  it('una sola amenaza anunciada a la vez por bando (1 contra 2)', () => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = createCombat([hero('warrior', 12), ...distinctNames([foe('skeleton', ['heavy_blow']), { ...foe('skeleton', ['heavy_blow']), id: 'e2' }])], seed * 13);
      for (let g = 0; g < 80 && !s.outcome; g++) {
        const both = s.combatants.filter((c) => c.side === 'B' && c.intent).length;
        expect(both).toBeLessThanOrEqual(1);
        s = currentActor(s)!.control === 'player' ? performAction(s, intentResponse(s, getCombatant(s, 'player')) ?? { type: 'attack', targetId: s.combatants.find((c) => c.side === 'B' && c.hp > 0)!.id }) : runAITurn(s);
      }
    }
  });

  it('S1 (aprendizaje): sus patrones solo se anuncian cuando la criatura lucha sola', () => {
    for (const e of SUBZONES.afueras.enemies) {
      const pt = ENEMIES[e.id].pattern;
      if (pt) { expect(pt.solo).toBe(true); expect(pt.moves.every((m) => m === 'heavy_blow' || m === 'dive')).toBe(true); }
    }
  });

  it('el combate con una intención a medias sobrevive a JSON (guardado)', () => {
    let s = toPlayer(createCombat([hero('warrior'), foe('bandit', ['heavy_blow'])], 41));
    for (let g = 0; g < 6 && !getCombatant(s, 'e').intent; g++) s = toPlayer(performAction(s, { type: 'defend' }));
    const back = JSON.parse(JSON.stringify(s)) as CombatState;
    const a: CombatAction = { type: 'defend' };
    expect(JSON.stringify(runAITurn(performAction(back, a)))).toBe(JSON.stringify(runAITurn(performAction(s, a))));
  });
});

describe('Fase 8: jefes regionales', () => {
  const hitTo = (s: CombatState, id: string, pct: number) => {
    // Deja al jefe justo por encima del umbral y lo golpea con el jugador
    const b = getCombatant(s, id);
    b.hp = Math.floor(b.stats.maxHp * pct) + 1;
    b.shield = 0; b.statuses = [];
    const pl = getCombatant(s, 'player');
    // Un golpe flojo: basta 1 punto para cruzar el umbral sin matarlo
    pl.stats = { ...pl.stats, atk: 1, crit: 0 };
    b.stats = { ...b.stats, eva: 0 };
    return performAction(s, { type: 'attack', targetId: id });
  };

  it('cada fase entra una vez al cruzar su umbral, sin curar; el auxiliar entra una sola vez y nunca hay más de dos por bando', () => {
    let s = toPlayer(createCombat([hero('warrior', 25), enemyCombatant('ossuary_lord', 'boss', 'B', 25)], 7));
    const before = getCombatant(s, 'boss').hp;
    s = hitTo(s, 'boss', 0.66);
    let b = getCombatant(s, 'boss');
    expect(b.phase).toBe(1);
    expect(b.hp).toBeLessThan(before);
    expect(s.combatants.filter((c) => c.side === 'B').length).toBe(2);
    expect(s.combatants.find((c) => c.id === 'boss_aux')?.summoned).toBe(true);
    const def1 = b.stats.def;
    s = toPlayer(s);
    s = hitTo(s, 'boss', 0.33);
    b = getCombatant(s, 'boss');
    expect(b.phase).toBe(2);
    expect(b.stats.def).toBeLessThan(def1);
    expect(s.combatants.filter((c) => c.side === 'B').length).toBe(2);
    expect(s.log.filter((l) => l.includes('se une al combate')).length).toBe(1);
  });

  it('al retirarse, el jefe recuerda vida, fase y auxiliar gastado (y no vuelve a anunciar la fase)', () => {
    let s = toPlayer(createCombat([hero('warrior', 25), enemyCombatant('ossuary_lord', 'boss', 'B', 25)], 9));
    s = hitTo(s, 'boss', 0.66);
    const b = getCombatant(s, 'boss');
    const mem = bossMemory(b);
    expect(mem).toEqual({ hp: b.hp, phase: 1, summoned: true });
    const again = restoreBoss(enemyCombatant('ossuary_lord', 'boss', 'B', 25), mem);
    expect(again.hp).toBe(b.hp);
    expect(again.phase).toBe(1);
    expect(again.reserve).toBeUndefined();
    expect(again.pattern).toEqual(REGIONAL_BOSSES.ossuary_lord.phases[0].pattern);
    expect(again.stats.def).toBe(b.stats.def);
    const s2 = createCombat([hero('warrior', 25), again], 3);
    expect(s2.log.some((l) => l.includes('golpea el suelo'))).toBe(false);
  });

  it('los tres jefes regionales tienen tres fases con umbrales y no tienen la antigua segunda fase', () => {
    for (const id of ['ossuary_lord', 'veiled_queen', 'belzar']) {
      expect(ENEMIES[id].phases?.length).toBe(2);
      expect(ENEMIES[id].phase2).toBeUndefined();
    }
  });
});

describe('Fase 8: catálogo', () => {
  it('cada patrón usa criaturas y movimientos que existen; los golpes normales no apuntan a la cabeza', () => {
    for (const [id, pt] of Object.entries(ENEMY_PATTERNS)) {
      expect(ENEMIES[id], id).toBeTruthy();
      for (const m of pt.moves) expect(MOVES[m], `${id}: ${m}`).toBeTruthy();
      if (!ENEMIES[id].boss) for (const m of pt.moves) expect(getMove(m).regions ?? []).not.toContain('head');
    }
    for (const b of Object.values(REGIONAL_BOSSES)) for (const ph of b.phases) for (const m of ph.pattern?.moves ?? []) expect(MOVES[m]).toBeTruthy();
  });

  it('cada élite y cada jefe de subzona anuncia algo', () => {
    for (const sz of Object.values(SUBZONES)) {
      expect(ENEMIES[sz.elite].pattern, sz.elite).toBeTruthy();
      expect(ENEMIES[sz.boss].pattern, sz.boss).toBeTruthy();
    }
  });

  it('leer las intenciones da ventaja real (élite de S1, ambas clases)', () => {
    const rate = (cls: 'warrior' | 'mage', read: boolean) => {
      let wins = 0;
      for (let seed = 1; seed <= 120; seed++) {
        let s = createCombat([hero(cls, 8), enemyCombatant('bandit_captain', 'e', 'B', 5)], seed * 7919, { canFlee: false });
        let left = 2;
        for (let g = 0; g < 300 && !s.outcome; g++) {
          if (currentActor(s)!.control !== 'player') { s = runAITurn(s); continue; }
          const me = getCombatant(s, 'player');
          if (me.hp / me.stats.maxHp < 0.35 && left > 0) { left--; s = performAction(s, { type: 'item', itemId: 'health_potion' }); continue; }
          const r = read ? intentResponse(s, me) : null;
          if (r) { s = performAction(s, r); continue; }
          const off = me.skills.map(getSkill).filter((k) => k.target === 'enemy' && canUseSkill(me, k.id)).sort((x, y) => (y.power ?? 0) - (x.power ?? 0));
          s = performAction(s, off.length && seed % 2 ? { type: 'skill', skillId: off[0].id, targetId: 'e' } : { type: 'attack', targetId: 'e' });
        }
        if (s.outcome === 'victory') wins++;
      }
      return wins / 120;
    };
    for (const cls of ['warrior', 'mage'] as const) {
      const yes = rate(cls, true), no = rate(cls, false);
      console.log(`${cls} contra el capitán (nv 5): leyendo ${(yes * 100).toFixed(0)} % · sin leer ${(no * 100).toFixed(0)} %`);
      expect(yes).toBeGreaterThan(no);
      expect(yes).toBeGreaterThanOrEqual(0.3);
    }
  });
});
