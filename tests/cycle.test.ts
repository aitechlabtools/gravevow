// Fase 10: prueba completa en S1 (sección 33 del plan maestro) con Guerrero y Mago, en partida nueva y en partida migrada.
// Preparar, entrar, combatir, recibir una lesión, tratarla, recoger un objeto espacial, desgastar, extraer, guardar,
// cargar, salir otra vez y morir. Cada paso usa la lógica real del núcleo; el navegador lo repite en scripts/ciclo-check.cjs.
import { describe, expect, it } from 'vitest';
import { createProfile, grantRecruitKit, needsRecruitKit } from '../src/core/profile';
import { startExpedition, endExpedition } from '../src/core/expedition';
import { addToGrid, countItem, LAYOUTS } from '../src/core/inventory';
import { makeUid } from '../src/core/rng';
import { createCombat, currentActor, getCombatant, opponents, performAction, runAITurn, type CombatState } from '../src/core/combat';
import { enemyCombatant, playerCombatant } from '../src/core/combatants';
import { addBleed, applyTreatment, bleedTick, damageRegion, toWounds, fromWounds } from '../src/core/anatomy';
import { durability, maxDurability, wearEquipment } from '../src/core/durability';
import { repair } from '../src/core/repair';
import { generateDungeon, validateDungeon } from '../src/core/dungeonGen';
import { checkExploration } from '../src/core/exploration';
import { getSubzone } from '../src/core/data/subzones';
import { addCharacter, applyProfile, composeProfile, emptySave, migrateProfileToSave, sanitizeSave } from '../src/core/save';
import { intentResponse } from './intentPlayer';
import { withGold } from './helpers';
import type { ClassId, Profile } from '../src/core/types';

const json = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** Guarda y vuelve a cargar como lo hace el juego (partida formato 4 en JSON). */
function saveLoad(p: Profile): Profile {
  const s0 = addCharacter(emptySave(0), p, 0, 0)!;
  const s = sanitizeSave(json(applyProfile(s0.save, p, s0.id, 1)))!;
  return composeProfile(s, s0.id)!;
}

/** Perfil antiguo (versión 2): sin necesidades, heridas, refugio, durabilidad ni oro físico. */
function oldProfile(cls: ClassId): unknown {
  const p = createProfile('Veterano', cls, { cloak: 0, skin: 0 }) as unknown as Record<string, unknown>;
  for (const k of ['goldPhysical', 'needs', 'wounds', 'refuge', 'prep', 'reception', 'workshop', 'crafted', 'cooked', 'cooking']) delete p[k];
  p.gold = 300;
  p.stash = Array.from({ length: 72 }, () => null);
  p.tutorialDone = true;
  p.tutorialSeen = { lobby: true, dungeon: true };
  return json(p);
}

/** Combate contra una criatura de S1 con el jugador simulado que lee los anuncios. */
function fight(p: Profile, enemyId: string, seed: number): CombatState {
  let s = createCombat([playerCombatant(p.character, p.equipment, 999, 999), enemyCombatant(enemyId, 'e', 'B', p.character.level)], seed, { canFlee: false });
  for (let g = 0; g < 300 && !s.outcome; g++) {
    if (currentActor(s)!.control !== 'player') { s = runAITurn(s); continue; }
    const me = getCombatant(s, 'player');
    s = performAction(s, intentResponse(s, me) ?? { type: 'attack', targetId: opponents(s, me)[0].id });
  }
  return s;
}

function cycle(start: Profile, cls: ClassId) {
  let p = withGold(start, 200);
  expect(p.character.classId).toBe(cls);

  // Preparar: el mapa de S1 tiene salida con varias semillas
  for (const seed of [11, 222, 3333]) {
    const d = generateDungeon(seed, { subzone: 'afueras' });
    expect(validateDungeon(d).problems).toEqual([]);
    expect(checkExploration(d)).toEqual([]);
  }
  expect(getSubzone('afueras').index).toBe(1);

  // Entrar
  const go = startExpedition(p, 0);
  p = go.profile;
  const e = go.expedition;
  expect(p.activeExpedition).toBeTruthy();

  // Combatir contra las criaturas de S1: se gana casi siempre con el equipo inicial
  let wins = 0;
  for (let i = 1; i <= 40; i++) if (fight(p, i % 2 ? 'bandit' : 'starving_wolf', i * 7919).outcome === 'victory') wins++;
  expect(wins / 40, `${cls} gana en S1`).toBeGreaterThanOrEqual(0.8);

  // Lesión y tratamiento: una pierna herida que sangra; la venda corta el sangrado
  let body = damageRegion(e.body!, 'legL', 5).body;
  body = addBleed(body, 'legL', 1);
  expect(bleedTick(body).bleeding).toEqual(['legL']);
  body = applyTreatment(body, 'bandage', 'legL').body;
  expect(bleedTick(body).bleeding).toEqual([]);
  e.body = body;

  // Objeto espacial: una espada de 3×1 entra en la mochila de la expedición
  const sword = { uid: makeUid(), itemId: 'iron_sword', qty: 1 };
  const put = addToGrid(e.backpack, sword, LAYOUTS.backpack);
  expect(put.leftover).toBeNull();
  e.backpack = put.grid;

  // Desgaste del arma y de una protección
  const worn = wearEquipment(e.equipment, 30, 30).equipment;
  const weapon = worn.mainHand!;
  expect(durability(weapon)).toBeLessThan(maxDurability(weapon));
  e.equipment = worn;

  // Extraer: se conserva lo transportado, la herida queda estabilizada y el desgaste sigue
  const out = endExpedition(p, e, 'extracted', 60_000);
  p = out.profile;
  expect(p.activeExpedition).toBeNull();
  expect(countItem(p.backpack, 'iron_sword')).toBe(1);
  expect(fromWounds(p.wounds, 100).parts.legL.bleed).toBe(0);
  expect(durability(p.equipment.mainHand!)).toBeLessThan(maxDurability(p.equipment.mainHand!));

  // Guardar y cargar no cambia nada
  const loaded = saveLoad(p);
  for (const k of ['backpack', 'stash', 'pocket', 'equipment', 'wounds', 'needs', 'character', 'stats', 'gold'] as const) expect(json(loaded[k]), k).toEqual(json(p[k]));
  expect(json(saveLoad(loaded))).toEqual(json(loaded));
  p = loaded;

  // Reparación básica en la base
  const r = repair(p);
  expect(r.ok, r.ok ? '' : r.error).toBe(true);
  if (r.ok) p = r.profile;
  expect(durability(p.equipment.mainHand!)).toBe(maxDurability(p.equipment.mainHand!));

  // Salir otra vez y morir: se pierde lo transportado, el bolsillo se queda y el intendente da el kit de recluta
  const pocketItem = { uid: makeUid(), itemId: 'health_potion', qty: 1 };
  p = { ...p, pocket: addToGrid(p.pocket, pocketItem, LAYOUTS.pocket).grid, stash: p.stash.map((x) => (x && x.itemId === 'iron_sword' ? null : x)) };
  const go2 = startExpedition(p, 100_000);
  const dead = endExpedition(go2.profile, go2.expedition, 'died', 200_000);
  p = dead.profile;
  expect(countItem(p.backpack, 'iron_sword')).toBe(0);
  expect(p.equipment.mainHand).toBeFalsy();
  expect(countItem(p.pocket, 'health_potion')).toBe(1);
  expect(dead.summary.lost.length).toBeGreaterThan(0);
  expect(needsRecruitKit(p)).toBe(true);
  p = grantRecruitKit(p);
  expect(p.equipment.mainHand).toBeTruthy();
  expect(p.stats.extractions).toBe(start.stats.extractions + 1);
  expect(p.stats.deaths).toBe(start.stats.deaths + 1);

  // Y puede volver a bajar
  const go3 = startExpedition(saveLoad(p), 300_000);
  expect(go3.expedition.body).toBeTruthy();
  expect(toWounds(go3.expedition.body!)).not.toBeUndefined();
}

describe('Fase 10: ciclo completo en S1', () => {
  for (const cls of ['warrior', 'mage'] as ClassId[]) {
    it(`${cls}: partida nueva`, () => cycle(createProfile('Nuevo', cls, { cloak: 0, skin: 0 }), cls));
    it(`${cls}: partida migrada desde la versión 2`, () => {
      const s = migrateProfileToSave(oldProfile(cls))!;
      expect(s).toBeTruthy();
      const p = composeProfile(s, s.characters[0].id)!;
      expect(p.needs ?? null).toBeDefined();
      cycle(p, cls);
    });
  }
});
