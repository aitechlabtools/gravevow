import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { addCharacter, emptySave, migrateProfileToSave, sanitizeSave } from '../src/core/save';
import { MINI_TUTORIALS } from '../src/core/data/tutorials';

const json = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** Perfil suelto de las versiones antiguas, con historia. */
function veteran() {
  const p = createProfile('Aldric', 'warrior', { cloak: 1, skin: 2 });
  p.tutorialDone = true;
  p.character.level = 40;
  p.stats = { expeditions: 20, extractions: 15, deaths: 5, kills: 200 };
  p.reputation = { nira: 150, vesper: 20 };
  p.refuge = { cot: 2, kitchen: 2, bench: 1, infirmary: 0, forge: 0, alchemy: 0, runic: 0, v: 2 };
  p.bossesDefeated = ['mordrek'];
  p.bestiary = { bandit_captain: { seen: 2, kills: 1 } };
  p.lastSubzone = 'calabozos';
  p.skins = { owned: ['skin_penitent'], equipped: null };
  p.classSkills = { unlocked: ['war_cry', 'bloodthirst'], equipped: p.classSkills.equipped };
  return p;
}

/** Partida del formato 4 de antes de que existiera `account.tutorials`. */
function oldSave(p = veteran()) {
  const s = json(addCharacter(emptySave(), p)!.save) as unknown as { account: Record<string, unknown> };
  delete s.account.tutorials;
  return s;
}

describe('Mini tutoriales: migración de partidas antiguas (opción a)', () => {
  it('marca como visto lo que el veterano ya ha usado', () => {
    const seen = sanitizeSave(oldSave())!.account.tutorials.seen;
    for (const id of ['bienvenida', 'tab.misiones', 'tab.refugio', 'exp.clock', 'bastion.first-death', 'vendor.nira', 'vendor.vesper',
      'bastion.first-sale', 'bastion.first-rep', 'station.kitchen', 'station.bench', 'station.cot.lv2', 'station.kitchen.lv2',
      'exp.boss', 'exp.elite', 'exp.subzone.castillo', 'exp.subzone.calabozos', 'bastion.first-skin', 'unlock.class-skill']) expect(seen).toContain(id);
  });

  it('deja pendiente lo que aún no ha tocado', () => {
    const seen = sanitizeSave(oldSave())!.account.tutorials.seen;
    for (const id of ['vendor.garth', 'station.forge', 'station.runes', 'station.bench.lv2', 'station.cot.lv3', 'exp.subzone.osario', 'exp.kael', 'screen.backup', 'combat.class-skill', 'unlock.stash-page', 'unlock.shared-page']) expect(seen).not.toContain(id);
    expect(sanitizeSave(oldSave())!.account.tutorials.disabled).toBe(false);
  });

  it('solo guarda ids que existen', () => {
    const ids = new Set(MINI_TUTORIALS.map((m) => m.id));
    expect(sanitizeSave(oldSave())!.account.tutorials.seen.every((id) => ids.has(id))).toBe(true);
  });

  it('el perfil suelto de las versiones 1 y 2 también se migra', () => {
    const seen = migrateProfileToSave(json(veteran()))!.account.tutorials.seen;
    expect(seen).toContain('vendor.nira');
    expect(seen).toContain('station.kitchen');
  });

  it('una partida sin expediciones no da nada por visto', () => {
    const p = createProfile('Nuevo', 'mage', { cloak: 0, skin: 0 });
    expect(sanitizeSave(oldSave(p))!.account.tutorials.seen).toEqual([]);
  });

  it('una partida que ya tiene mini tutoriales no se toca', () => {
    const s = oldSave() as { account: Record<string, unknown> };
    s.account.tutorials = { seen: ['tab.tienda'], disabled: true };
    expect(sanitizeSave(s)!.account.tutorials).toEqual({ seen: ['tab.tienda'], disabled: true });
  });
});
