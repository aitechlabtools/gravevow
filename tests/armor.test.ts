import { ENEMY_DAMAGE } from '../src/config/subzones';
// Fase 10 (reequilibrio): la armadura protege de lesiones, el golpe decide sangrado o fractura, desgaste por pieza,
// tutorial imposible de perder, daño de S1 y curación completa (1 moneda tras caer, gratis sin oro).
import { describe, expect, it } from 'vitest';
import { armorGuards, enemyThreats, injuryMods, pieceGuard } from '../src/core/armor';
import { ARMOR_GUARD } from '../src/config/armor';
import { ANATOMY } from '../src/config/anatomy';
import { createProfile } from '../src/core/profile';
import { emptyEquipment } from '../src/core/inventory';
import { withDurability, maxDurability, wearEquipment, durability } from '../src/core/durability';
import { createCombat, currentActor, getCombatant, performAction, runAITurn, opponents, type CombatState } from '../src/core/combat';
import { enemyCombatant, playerCombatant } from '../src/core/combatants';
import { fromWounds, cureCost, vesperPrice, damageRegion } from '../src/core/anatomy';
import { getEnemy } from '../src/core/data/enemies';
import { endExpedition, startExpedition } from '../src/core/expedition';
import type { Equipment } from '../src/core/types';

const kit = (items: Partial<Record<keyof Equipment, string>>): Equipment => {
  const e = emptyEquipment();
  for (const [k, v] of Object.entries(items)) e[k as keyof Equipment] = { uid: k, itemId: v!, qty: 1 };
  return e;
};
const FULL = kit({ mainHand: 'rusty_sword', helmet: 'iron_helm', armor: 'chainmail', gloves: 'gauntlets', boots: 'worn_boots' });
const NAKED = kit({ mainHand: 'rusty_sword' });

/** Lesiones que sufre el jugador en muchos combates contra una criatura que corta y muerde. */
function injuries(gear: Equipment, enemy = 'starving_wolf'): number {
  const ch = { name: 'Sim', classId: 'warrior' as const, appearance: { cloak: 0, skin: 0 }, level: 5, xp: 0 };
  let n = 0;
  for (let seed = 1; seed <= 150; seed++) {
    let s: CombatState = createCombat([playerCombatant(ch, gear, 999, 999, {}, undefined, { body: fromWounds(null, 200) }), enemyCombatant(enemy, 'e', 'B', 5)], seed * 7919, { canFlee: false });
    for (let g = 0; g < 200 && !s.outcome; g++) {
      if (currentActor(s)!.control !== 'player') { s = runAITurn(s); continue; }
      s = performAction(s, { type: 'attack', targetId: opponents(s, getCombatant(s, 'player'))[0].id });
    }
    n += s.log.filter((l) => /: sangrado|: ¡fractura!|^Sim sangra/.test(l)).length;
  }
  return n;
}

describe('Fase 10: armadura y lesiones', () => {
  it('la protección baja poco a poco con el desgaste y desaparece al romperse', () => {
    const st = { uid: 'c', itemId: 'chainmail', qty: 1 };
    const max = maxDurability(st);
    expect(pieceGuard(st)).toBe(ARMOR_GUARD.full);
    const half = withDurability(st, Math.floor(max * 0.5));
    expect(pieceGuard(half)).toBeCloseTo(ARMOR_GUARD.full * (Math.floor(max * 0.5) / max), 5);
    expect(pieceGuard(half)).toBeLessThan(pieceGuard(st));
    expect(pieceGuard(withDurability(st, 0))).toBe(0);
  });

  it('cada pieza cubre sus regiones; sin pieza, la región queda al descubierto', () => {
    const g = armorGuards(FULL);
    expect(g.head?.slot).toBe('helmet');
    expect(g.thorax?.slot).toBe('armor');
    expect(g.armL?.slot).toBe('gloves');
    expect(g.legR?.slot).toBe('boots');
    expect(armorGuards(NAKED)).toEqual({});
  });

  it('filos y mordiscos hacen sangrar; los golpes contundentes rompen huesos', () => {
    expect(injuryMods('bite').fracture).toBe(0);
    expect(injuryMods('smash').fracture).toBeGreaterThan(injuryMods('slash').fracture);
    expect(injuryMods('smash').bleed).toBeLessThan(injuryMods('slash').bleed);
    expect(ANATOMY.bleedChance).toBeLessThanOrEqual(0.08);
  });

  it('con armadura entera se sufren muchas menos lesiones', () => {
    const naked = injuries(NAKED), full = injuries(FULL);
    expect(naked).toBeGreaterThan(0);
    expect(full).toBeLessThan(naked * 0.5);
  });

  it('se desgasta la pieza que encaja el golpe', () => {
    const w = wearEquipment(FULL, 0, 5, { helmet: 5 });
    expect(durability(w.equipment.helmet!)).toBe(maxDurability(FULL.helmet!) - 5);
    expect(durability(w.equipment.armor!)).toBe(maxDurability(FULL.armor!));
  });

  it('la ficha dice lo que puede causar cada criatura', () => {
    expect(enemyThreats('starving_wolf')).toContain('Sangrado');
    expect(enemyThreats('starving_wolf')).not.toContain('Fractura');
    expect(enemyThreats('no_existe')).toEqual([]);
  });
});

describe('Fase 10: dificultad', () => {
  it('las criaturas comunes de S1 pegan menos; élites y jefes igual', () => {
    const b = enemyCombatant('bandit', 'b', 'B', 1);
    expect(b.stats.atk).toBe(Math.round(getEnemy('bandit').stats.atk * ENEMY_DAMAGE.afueras));
    expect(ENEMY_DAMAGE.afueras).toBeLessThan(1);
    const boss = enemyCombatant(getEnemy('bandit_captain').id, 'c', 'B', 1);
    expect(boss.stats.atk).toBe(getEnemy('bandit_captain').stats.atk);
  });

  it('el kit inicial trae 3 pociones', () => {
    for (const cls of ['warrior', 'mage'] as const) {
      const p = createProfile('X', cls, { cloak: 0, skin: 0 });
      expect(p.backpack.filter((x) => x?.itemId === 'health_potion').reduce((n, x) => n + x!.qty, 0)).toBe(3);
    }
  });

  it('tutorial: el jugador no puede caer (se levanta con vida)', () => {
    const ch = { name: 'Novato', classId: 'mage' as const, appearance: { cloak: 0, skin: 0 }, level: 1, xp: 0 };
    for (let seed = 1; seed <= 40; seed++) {
      const pl = playerCombatant(ch, NAKED, 999, 999, {}, undefined, { body: fromWounds(null, 60), noInjuries: true, unbreakable: true });
      let s: CombatState = createCombat([pl, enemyCombatant('bandit_captain', 'e', 'B', 10)], seed, { canFlee: false });
      for (let g = 0; g < 120 && !s.outcome; g++) {
        if (currentActor(s)!.control !== 'player') { s = runAITurn(s); continue; }
        s = performAction(s, { type: 'defend' });
      }
      expect(s.outcome).not.toBe('defeat');
    }
  });
});

describe('Fase 10: curación completa', () => {
  const hurt = () => damageRegion(fromWounds(null, 100), 'armR', 8).body;
  it('al volver de una extracción, el precio depende de lo herido y tiene tope', () => {
    expect(vesperPrice(fromWounds(null, 100))).toBe(0);
    const b = hurt();
    expect(vesperPrice(b)).toBeGreaterThanOrEqual(1);
    expect(vesperPrice(b)).toBeLessThanOrEqual(ANATOMY.cure.max);
  });
  it('tras caer cuesta 1 moneda, y es gratis si no te queda ninguna', () => {
    expect(cureCost(hurt(), true, 50)).toEqual({ price: 1, free: false });
    expect(cureCost(hurt(), true, 0)).toEqual({ price: 0, free: true });
    expect(cureCost(hurt(), false, 0).free).toBe(false);
  });
  it('morir marca la caída; extraer la quita', () => {
    const p = createProfile('X', 'warrior', { cloak: 0, skin: 0 });
    const a = startExpedition(p, 0);
    expect(endExpedition(a.profile, a.expedition, 'died', 1).profile.fallen).toBe(true);
    expect(endExpedition(a.profile, a.expedition, 'extracted', 1).profile.fallen).toBe(false);
  });
});
