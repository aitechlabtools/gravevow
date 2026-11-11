import { describe, expect, it } from 'vitest';
import { SUBZONES, SUBZONE_ORDER, subzonesOf } from '../src/core/data/subzones';
import { areaDef, defaultSubzone, subzoneLock, zoneEnemyLevel, ZONES, ZONE_ORDER } from '../src/core/data/zones';
import { ENEMIES } from '../src/core/data/enemies';
import { generateDungeon, validateDungeon } from '../src/core/dungeonGen';
import { createProfile, sanitizeProfile } from '../src/core/profile';

describe('Subzonas', () => {
  it('hay 10, en orden, de 10 niveles y sin huecos', () => {
    expect(SUBZONE_ORDER).toHaveLength(10);
    SUBZONE_ORDER.forEach((id, i) => {
      const s = SUBZONES[id];
      expect(s.index).toBe(i + 1);
      expect(s.levels[1] - s.levels[0]).toBe(i === 0 ? 9 : 10);
      if (i > 0) expect(s.levels[0]).toBe(SUBZONES[SUBZONE_ORDER[i - 1]].levels[1]);
    });
    expect(subzonesOf('mazmorra')).toHaveLength(3);
    expect(subzonesOf('cripta')).toHaveLength(3);
    expect(subzonesOf('infierno')).toHaveLength(4);
  });
  it('cada subzona tiene criaturas, élite y jefe que existen, y el rango cabe en su zona', () => {
    for (const s of Object.values(SUBZONES)) {
      for (const e of s.enemies) expect(ENEMIES[e.id], `${s.id}: ${e.id}`).toBeTruthy();
      expect(ENEMIES[s.elite]?.elite).toBe(true);
      expect(ENEMIES[s.boss]?.boss).toBe(true);
      const z = ZONES[s.zone];
      expect(s.levels[0]).toBeGreaterThanOrEqual(z.levels[0]);
      expect(s.levels[1]).toBeLessThanOrEqual(z.levels[1]);
    }
    // La última subzona de cada zona tiene el jefe que abre la zona siguiente
    for (const z of ZONE_ORDER) expect(subzonesOf(z).at(-1)!.boss).toBe(ZONES[z].boss);
  });
  it('genera mapas válidos en todas las subzonas', () => {
    for (const id of SUBZONE_ORDER) for (const seed of [1, 77, 4242]) {
      const d = generateDungeon(seed, { subzone: id });
      expect(d.subzone).toBe(id);
      expect(d.zone).toBe(SUBZONES[id].zone);
      expect(validateDungeon(d).ok).toBe(true);
      const ids = d.entities.filter((e) => e.kind === 'enemy').map((e) => (e as { enemyId: string }).enemyId);
      const allowed = new Set([...SUBZONES[id].enemies.map((e) => e.id), SUBZONES[id].elite, SUBZONES[id].boss]);
      for (const e of ids) expect(allowed.has(e), `${id}: ${e}`).toBe(true);
    }
  });
  it('el nivel de las criaturas se queda dentro de la subzona', () => {
    expect(zoneEnemyLevel(areaDef('castillo'), 5)).toBe(10);
    expect(zoneEnemyLevel(areaDef('castillo'), 15)).toBe(15);
    expect(zoneEnemyLevel(areaDef('afueras'), 40)).toBe(10);
    expect(zoneEnemyLevel(areaDef(undefined, 'cripta'), 45)).toBe(45);
  });
  it('acceso: dentro de una zona basta el nivel; entre zonas, también el jefe de la anterior', () => {
    expect(subzoneLock(SUBZONES.afueras, 1, [])).toBeNull();
    expect(subzoneLock(SUBZONES.castillo, 9, [])).toMatch(/nivel 10/);
    expect(subzoneLock(SUBZONES.calabozos, 25, [])).toBeNull();
    expect(subzoneLock(SUBZONES.osario, 35, [])).toMatch(/jefe/);
    expect(subzoneLock(SUBZONES.osario, 35, ['ossuary_lord'])).toBeNull();
    expect(subzoneLock(SUBZONES.panteon, 45, ['ossuary_lord'])).toMatch(/nivel 50/);
    expect(defaultSubzone('mazmorra', 14, []).id).toBe('castillo');
    expect(defaultSubzone('mazmorra', 60, []).id).toBe('calabozos');
  });
  it('partidas antiguas cargan: tutorial hecho si ya bajaron, contador de Kael a cero', () => {
    const old = { ...createProfile('Viejo', 'warrior', { cloak: 0, skin: 0 }), stats: { expeditions: 7, extractions: 5, deaths: 2, kills: 40 } } as Record<string, unknown>;
    delete old.tutorialDone; delete old.kael; delete old.lastSubzone;
    const p = sanitizeProfile(JSON.parse(JSON.stringify(old)))!;
    expect(p.tutorialDone).toBe(true);
    expect(p.kael).toEqual({ missStreak: 0, met: 0, grudge: 0 });
    expect(p.lastSubzone).toBeNull();
    const fresh = sanitizeProfile(JSON.parse(JSON.stringify({ ...createProfile('Nuevo', 'mage', { cloak: 0, skin: 0 }), lastSubzone: 'no_existe' })))!;
    expect(fresh.tutorialDone).toBe(false);
    expect(fresh.lastSubzone).toBeNull();
  });
});

import { enemyCombatant } from '../src/core/combatants';
import { subzoneChestTable, CHEST_TABLES } from '../src/core/loot';
describe('Curva de niveles', () => {
  it('no hay salto al cambiar de zona: la común media de la Cripta a nivel 30 no supera en +25 % a la de la Mazmorra', () => {
    const avg = (ids: string[], lv: number) => ids.reduce((s, id) => s + enemyCombatant(id, 'x', 'B', lv).stats.maxHp, 0) / ids.length;
    const maz = avg(ZONES.mazmorra.enemies.map((e) => e.id), 30);
    const cri = avg(ZONES.cripta.enemies.map((e) => e.id), 30);
    const inf = avg(ZONES.infierno.enemies.map((e) => e.id), 60);
    const cri60 = avg(ZONES.cripta.enemies.map((e) => e.id), 60);
    expect(cri / maz).toBeLessThan(1.25);
    expect(inf / cri60).toBeLessThan(1.25);
  });
  it('los mapas guardan el nivel extra de las salas hondas, el élite y el jefe', () => {
    const d = generateDungeon(99, { subzone: 'castillo' });
    const en = d.entities.filter((e) => e.kind === 'enemy') as { id: string; lvl?: number }[];
    expect(en.find((e) => e.id === 'e_boss')?.lvl).toBe(3);
    expect(en.every((e) => typeof e.lvl === 'number' && e.lvl >= 0 && e.lvl <= 3)).toBe(true);
  });
  it('los cofres de las subzonas hondas dan más oro y tiradas', () => {
    const a = subzoneChestTable(CHEST_TABLES.rich, [1, 10], 0);
    const c = subzoneChestTable(CHEST_TABLES.rich, [20, 30], 2);
    expect(c.gold[1]).toBeGreaterThan(a.gold[1]);
    expect(c.rolls).toBe(a.rolls + 1);
  });
});

import { MONSTER_SPECS, BEAST_SPECS, FLYER_SPECS, TILESETS } from '../src/shared/art';
import { SKILLS } from '../src/core/data/skills';
import { BESTIARY_LORE } from '../src/core/data/bestiaryLore';
describe('Criaturas y escenarios de las subzonas', () => {
  it('cada subzona tiene 4 comunes propias, élite y jefe distintos, baldosas, decorado y estilo de mapa', () => {
    const seen = new Set<string>();
    for (const s of Object.values(SUBZONES)) {
      expect(s.enemies).toHaveLength(4);
      for (const e of s.enemies) { expect(seen.has(e.id), `${e.id} repetido`).toBe(false); seen.add(e.id); }
      expect(TILESETS[s.id]).toBeTruthy();
      expect(s.decor?.length).toBeGreaterThan(3);
      expect(s.map).toBeTruthy();
    }
    const elites = Object.values(SUBZONES).map((s) => s.elite);
    const bosses = Object.values(SUBZONES).map((s) => s.boss);
    expect(new Set(elites).size).toBe(10);
    expect(new Set(bosses).size).toBe(10);
  });
  it('todas las criaturas tienen dibujo, habilidades que existen y texto del Bestiario; los jefes tienen 2.ª fase', () => {
    for (const e of Object.values(ENEMIES)) {
      expect(MONSTER_SPECS[e.sprite] || BEAST_SPECS[e.sprite] || FLYER_SPECS[e.sprite], e.id).toBeTruthy();
      for (const sk of [...e.skills, ...(e.phase2?.skills ?? [])]) expect(SKILLS[sk], `${e.id}: ${sk}`).toBeTruthy();
      expect(BESTIARY_LORE[e.id], e.id).toBeTruthy();
      // Fase 8: los jefes regionales cambian por fases (`phases`); el resto conserva su segunda fase
      if (e.boss) expect(e.phase2 ?? e.phases, e.id).toBeTruthy();
    }
  });
});
