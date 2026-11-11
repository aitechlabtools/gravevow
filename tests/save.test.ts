import { earnGold } from '../src/core/wallet';
import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { addCharacter, applyProfile, composeProfile, currentCharacterId, emptySave, MAX_CHARACTERS, migrateProfileToSave, removeCharacter, sanitizeSave } from '../src/core/save';
import type { Profile } from '../src/core/types';
import { legacyLevelToNew } from '../src/config/progression';

const json = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** Perfil de la versión 2 «de verdad»: almacén ampliado al máximo y lleno, atuendos, oro y progreso. */
function veteran(): Profile {
  const p = createProfile('Aldric', 'warrior', { cloak: 1, skin: 2 });
  p.gold = 12480;
  delete (p as { goldPhysical?: boolean }).goldPhysical; // perfil de antes del oro físico
  p.character.level = 34; p.character.xp = 120;
  p.stash = Array.from({ length: 72 }, (_, i) => ({ uid: `s${i}`, itemId: i % 2 ? 'health_potion' : 'iron_sword', qty: i % 2 ? 3 : 1 }));
  p.skins = { owned: ['skin_penitent', 'skin_ash_lord'], equipped: 'skin_ash_lord' };
  p.settings = { volume: 0.25, music: false };
  p.tutorialDone = true;
  p.stats = { expeditions: 41, extractions: 30, deaths: 11, kills: 507 };
  p.reputation = { orvel: 120 };
  p.bestiary = { skeleton: { seen: 30, kills: 28 } };
  return p;
}

describe('Partida (formato 3): migración desde un solo personaje', () => {
  it('un perfil de la versión 2 pasa al hueco 1 sin perder nada', () => {
    const old = veteran();
    const s = migrateProfileToSave(json(old))!;
    expect(s.version).toBe(4);
    expect(s.characters).toHaveLength(1);
    expect(s.characters[0].slot).toBe(0);
    expect(s.account.lastCharacterId).toBe(s.characters[0].id);
    expect(s.account.skinsOwned).toEqual(['skin_penitent', 'skin_ash_lord']);
    expect(s.account.settings).toEqual({ volume: 0.25, music: false });
    expect(s.account.tutorialDone).toBe(true);
    const p = composeProfile(s, s.characters[0].id)!;
    expect(p.gold).toBe(Math.ceil((12480 + 16000) / 10)); // + lo pagado por las ampliaciones, todo en monedas (÷10)
    expect(p.character).toEqual(old.character);
    expect(p.stash.slice(0, 72)).toEqual(old.stash); // todo lo que había, en la página 1 (120 casillas)
    expect(p.stash).toHaveLength(120);
    expect(p.backpack).toEqual(old.backpack);
    expect(p.equipment).toEqual(old.equipment);
    expect(p.skins).toEqual(old.skins);
    expect(p.stats).toEqual(old.stats);
    expect(p.reputation).toEqual({ nira: 120 }) // la de Orvel pasa a Nira (Fase 5b);
    expect(p.bestiary).toEqual(old.bestiary);
  });

  it('un perfil de la versión 1 también se migra (niveles a la escala nueva)', () => {
    const p1 = createProfile('Viejo', 'mage', { cloak: 0, skin: 0 });
    (p1 as unknown as { version: number }).version = 1; p1.character.level = 5;
    const s = migrateProfileToSave(json(p1))!;
    expect(s.account.migratedFrom).toBe(1);
    expect(composeProfile(s, s.characters[0].id)!.character.level).toBe(legacyLevelToNew(5));
  });

  it('sanitizeSave acepta un perfil suelto antiguo (copias de seguridad viejas)', () => {
    const s = sanitizeSave(json(veteran()))!;
    expect(s.format).toBe('gravevow-save');
    expect(s.characters[0].character.name).toBe('Aldric');
  });

  it('lo que no se reconoce no carga', () => {
    expect(sanitizeSave(null)).toBeNull();
    expect(sanitizeSave({ hola: 1 })).toBeNull();
    expect(sanitizeSave({ format: 'gravevow-save', version: 99 })).toBeNull();
  });
});

describe('Partida: guardar, cargar y varios personajes', () => {
  it('ida y vuelta: repartir y volver a montar da el mismo perfil', () => {
    const s0 = migrateProfileToSave(json(veteran()))!;
    const id = s0.characters[0].id;
    const p = composeProfile(s0, id)!;
    Object.assign(p, earnGold(p, 50).ok ? (earnGold(p, 50) as { profile: typeof p }).profile : {}); p.skins = { owned: [...p.skins.owned, 'skin_hollow_warden'], equipped: 'skin_hollow_warden' };
    const s1 = sanitizeSave(json(applyProfile(s0, p, id)))!;
    const back = composeProfile(s1, id)!;
    expect(back.gold).toBe(p.gold);
    expect(back.skins).toEqual(p.skins);
    expect(s1.account.skinsOwned).toContain('skin_hollow_warden');
    expect(back.stash).toEqual(p.stash);
  });

  it('hasta 4 personajes; el quinto no cabe', () => {
    let s = emptySave();
    for (let i = 0; i < MAX_CHARACTERS; i++) {
      const r = addCharacter(s, createProfile(`P${i}`, i % 2 ? 'mage' : 'warrior', { cloak: 0, skin: 0 }))!;
      expect(r).not.toBeNull();
      s = r.save;
    }
    expect(s.characters.map((c) => c.slot)).toEqual([0, 1, 2, 3]);
    expect(addCharacter(s, createProfile('Quinto', 'warrior', { cloak: 0, skin: 0 }))).toBeNull();
  });

  it('cada personaje tiene lo suyo; atuendos, ajustes y tutorial son de la cuenta', () => {
    const s0 = migrateProfileToSave(json(veteran()))!;
    const r = addCharacter(s0, createProfile('Mireva', 'mage', { cloak: 2, skin: 0 }))!;
    const mireva = composeProfile(r.save, r.id)!;
    expect(mireva.gold).not.toBe(12480);
    expect(mireva.stats.expeditions).toBe(0);
    expect(mireva.bestiary).toEqual({});
    expect(mireva.skins.owned).toEqual(['skin_penitent', 'skin_ash_lord']); // los compró Aldric, pero son de la cuenta
    expect(mireva.skins.equipped).toBeNull(); // cada uno lleva el suyo
    expect(mireva.tutorialDone).toBe(true);
    expect(mireva.settings.volume).toBe(0.25);
    expect(currentCharacterId(r.save)).toBe(r.id);
  });

  it('borrar un personaje no toca a los demás, ni la página compartida ni los atuendos', () => {
    let s = migrateProfileToSave(json(veteran()))!;
    const aldric = s.characters[0].id;
    s.account.shared = { owned: true, grid: [{ uid: 'x', itemId: 'iron_sword', qty: 1 }] };
    const r = addCharacter(s, createProfile('Mireva', 'mage', { cloak: 0, skin: 0 }))!;
    s = removeCharacter(r.save, r.id);
    expect(s.characters.map((c) => c.id)).toEqual([aldric]);
    expect(s.account.shared.grid).toHaveLength(1);
    expect(s.account.skinsOwned).toHaveLength(2);
    expect(currentCharacterId(s)).toBe(aldric);
    // El hueco que queda libre se puede volver a usar
    expect(addCharacter(s, createProfile('Kor', 'warrior', { cloak: 0, skin: 0 }))!.save.characters.map((c) => c.slot)).toEqual([0, 1]);
  });

  it('al cargar se reparan los objetos que ya no existen, también en las páginas extra', () => {
    const s = migrateProfileToSave(json(veteran()))!;
    const bad = json(s);
    bad.characters[0].stashPages = [[{ uid: 'a', itemId: 'no_existe', qty: 1 }, null], [{ uid: 'b', itemId: 'no_existe', qty: 1 }, { uid: 'c', itemId: 'iron_sword', qty: 1 }]];
    const fixed = sanitizeSave(bad)!;
    expect(fixed.characters[0].stashPages[0][0]).toBeNull();
    expect(fixed.characters[0].stashPages[1][0]).toBeNull();
    expect(fixed.characters[0].stashPages[1][1]?.itemId).toBe('iron_sword');
  });

  it('huecos repetidos o personajes de más se corrigen al cargar', () => {
    const s = migrateProfileToSave(json(veteran()))!;
    const c = s.characters[0];
    const raw = json({ ...s, characters: [c, { ...c, id: 'otro' }, { ...c, id: 'b' }, { ...c, id: 'c' }, { ...c, id: 'd' }] });
    const fixed = sanitizeSave(raw)!;
    expect(fixed.characters).toHaveLength(4);
    expect(new Set(fixed.characters.map((x) => x.slot)).size).toBe(4);
  });
});

describe('Partida (formato 4): migración desde el formato 3', () => {
  it('una partida 3 carga igual y añade el tiempo de juego a 0', () => {
    let s = emptySave(1000);
    s = addCharacter(s, createProfile('Aldric', 'warrior', { cloak: 1, skin: 2 }))!.save;
    s = addCharacter(s, createProfile('Ilsa', 'mage', { cloak: 0, skin: 1 }))!.save;
    const v3 = json(s) as unknown as Record<string, unknown> & { characters: Record<string, unknown>[] };
    v3.version = 3;
    for (const c of v3.characters) delete c.playMs;
    const m = sanitizeSave(v3)!;
    expect(m.version).toBe(4);
    expect(m.characters).toHaveLength(2);
    expect(m.characters.map((c) => c.character.name)).toEqual(['Aldric', 'Ilsa']);
    expect(m.characters.every((c) => c.playMs === 0)).toBe(true);
    expect(m.characters.map((c) => c.backpack)).toEqual(s.characters.map((c) => c.backpack));
    expect(m.characters.map((c) => c.stashPages)).toEqual(s.characters.map((c) => c.stashPages));
  });
  it('el tiempo de juego se conserva al guardar y cargar', () => {
    let s = emptySave(1000);
    const r = addCharacter(s, createProfile('Aldric', 'warrior', { cloak: 1, skin: 2 }))!;
    s = r.save;
    const p = composeProfile(s, r.id)!;
    s = applyProfile(s, { ...p, playMs: 90_000 }, r.id);
    expect(composeProfile(sanitizeSave(json(s))!, r.id)!.playMs).toBe(90_000);
  });
});
