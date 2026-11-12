import { describe, expect, it } from 'vitest';
import { createCombat, performAction, getCombatant, currentActor, bombDamage, bombPreview, distinctNames, type CombatState } from '../src/core/combat';
import { enemyCombatant, playerCombatant } from '../src/core/combatants';
import { createProfile } from '../src/core/profile';
import { makeRng } from '../src/core/rng';
import { getItem } from '../src/core/data/items';
import { recipeFor } from '../src/core/crafting';
import { BOMBS } from '../src/config/bombs';
import type { ClassId } from '../src/core/types';

// Bloque 2, fase 6: bombas y frascos en combate.

const hero = (cls: ClassId, level = 6) => {
  const p = createProfile('Sim', cls, { cloak: 0, skin: 0 });
  const c = playerCombatant({ ...p.character, level }, p.equipment, 999, 999);
  c.stats = { ...c.stats, spd: 99 };
  return c;
};
const duo = (cls: ClassId = 'warrior', a = 'bandit', b = 'bandit', seed = 3): CombatState =>
  createCombat([hero(cls), ...distinctNames([enemyCombatant(a, 'e1', 'B', 3), enemyCombatant(b, 'e2', 'B', 3)])], seed);
const hpOf = (s: CombatState, id: string) => getCombatant(s, id).hp;

describe('bombas y frascos', () => {
  it('existen, se fabrican en la Mesa de alquimia al nivel de la propuesta y se lanzan', () => {
    const lv: Record<string, number> = { nail_bomb: 1, pitch_flask: 1, silver_shrapnel: 2, sulfur_flask: 3 };
    for (const id of Object.keys(BOMBS)) {
      expect(getItem(id).use).toEqual({ kind: 'bomb', bomb: id });
      expect(recipeFor(id)?.station).toBe('alchemy');
      expect(recipeFor(id)?.level).toBe(lv[id]);
    }
  });

  it('la bomba de clavos daña solo al objetivo elegido y gasta el turno', () => {
    const s = duo();
    const n = performAction(s, { type: 'item', itemId: 'nail_bomb', targetId: 'e2' });
    expect(hpOf(n, 'e2')).toBeLessThan(hpOf(s, 'e2'));
    expect(hpOf(n, 'e1')).toBe(hpOf(s, 'e1'));
    expect(n.events.some((e) => e.type === 'itemUsed' && e.itemId === 'nail_bomb')).toBe(true);
    expect(currentActor(n)?.id).not.toBe('player');
  });

  it('el frasco de brea alcanza a los dos y los quema; no hay fuego amigo', () => {
    const s = duo();
    const n = performAction(s, { type: 'item', itemId: 'pitch_flask', targetId: 'e1' });
    for (const id of ['e1', 'e2']) {
      expect(hpOf(n, id)).toBeLessThan(hpOf(s, id));
      expect(n.events.some((e) => e.type === 'status' && e.targetId === id && e.status === 'burn' && e.applied)).toBe(true);
    }
    expect(n.events.filter((e) => e.type === 'damage' && e.targetId === 'player' && e.source === 'hit').length).toBe(0);
  });

  it('la bomba de clavos aturde a veces (35 %)', () => {
    let stun = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const n = performAction(duo('warrior', 'bandit', 'bandit', seed), { type: 'item', itemId: 'nail_bomb', targetId: 'e1' });
      if (n.events.some((e) => e.type === 'status' && e.status === 'stun' && e.applied)) stun++;
    }
    expect(stun).toBeGreaterThan(45);
    expect(stun).toBeLessThan(95);
  });

  it('la metralla de plata hace el doble a los no muertos', () => {
    const me = hero('warrior');
    const ske = enemyCombatant('skeleton', 'e1', 'B', 3);
    const plain = { ...ske, undead: false };
    expect(bombPreview(me, ske, BOMBS.silver_shrapnel)).toBeGreaterThanOrEqual(bombPreview(me, plain, BOMBS.silver_shrapnel) * 1.9);
    const rng = () => makeRng(9);
    expect(bombDamage(me, ske, BOMBS.silver_shrapnel, rng()).amount).toBeGreaterThan(bombDamage(me, plain, BOMBS.silver_shrapnel, rng()).amount * 1.8);
  });

  it('sirven igual a guerrero y mago (usan su mejor ataque) y no se esquivan', () => {
    for (const cls of ['warrior', 'mage'] as const) {
      const foe = enemyCombatant('bandit', 'e1', 'B', 3);
      foe.stats = { ...foe.stats, eva: 100 };
      const s = createCombat([hero(cls), foe], 5);
      const n = performAction(s, { type: 'item', itemId: 'nail_bomb', targetId: 'e1' });
      expect(hpOf(n, 'e1'), cls).toBeLessThan(hpOf(s, 'e1'));
    }
  });

  it('orden de fuerza (multiplicador): brea < clavos < azufre < metralla', () => {
    const p = (id: string) => BOMBS[id].power;
    expect(p('pitch_flask')).toBeLessThan(p('nail_bomb'));
    expect(p('nail_bomb')).toBeLessThan(p('sulfur_flask'));
    expect(p('sulfur_flask')).toBeLessThan(p('silver_shrapnel'));
  });
});
