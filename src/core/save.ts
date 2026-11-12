// Partida completa del jugador (formato 4): datos de la cuenta y hasta 4 personajes.
// El juego sigue trabajando con un `Profile` (el personaje activo con los datos de la cuenta encima):
// `composeProfile` lo monta y `applyProfile` lo vuelve a repartir antes de guardar.
// Preparado para un futuro guardado en la nube: la cuenta tiene un identificador propio y fechas de cambio.
import { emptyTutorials, sanitizeTutorials, type TutorialsSave } from './tutorials';
import { seenFromHistory } from './tutorialsMigration';
import type { Grid, Profile, Settings } from './types';
import { sanitizeProfile } from './profile';
import { makeUid } from './rng';
import { joinPages, migrateLegacyStash, splitPages } from './stashPages';
import { gridGold } from './gold';
import { goldAsStacks } from './wallet';
import { addToGrid, emptyGrid, LAYOUTS } from './inventory';
import { GOLD_SCALE } from '../config/gold';
import { STASH_PAGE_SIZE } from '../config/stash';

export const SAVE_FORMAT = 'gravevow-save';
/** Formato de partida con el nombre anterior del juego: se sigue aceptando. */
export const OLD_SAVE_FORMAT = 'cryptraiders-save';
/** 4 = expansión: tiempo de juego activo por personaje (`playMs`). Las partidas 3 se migran al cargarlas. */
export const SAVE_VERSION = 4;
export const MAX_CHARACTERS = 4;
const DEFAULT_SETTINGS: Settings = { volume: 0.6, music: true, musicVolume: 1, sfxVolume: 1 };

export interface AccountData {
  /** Identificador de la cuenta (para el futuro guardado en la nube). */
  id: string;
  createdAt: number;
  updatedAt: number;
  /** Atuendos comprados: sirven para todos los personajes. */
  skinsOwned: string[];
  /** El tutorial guiado ya se jugó (o se saltó) con algún personaje. */
  tutorialDone: boolean;
  settings: Settings;
  /** Página «Compartido» del almacén: la única forma de pasar objetos entre personajes. */
  shared: { owned: boolean; grid: Grid };
  /** Último personaje con el que se jugó («Continuar como…»). */
  lastCharacterId: string | null;
  /** Copias de seguridad: cuándo se hizo la última y cuántas expediciones van desde entonces. */
  backup: { lastAt: number | null; expeditionsSince: number; remindedAt: number | null; expeditionsAt?: number };
  /** Versión de la que se migró la partida (para avisos de una sola vez). */
  migratedFrom?: number;
  /** Mini tutoriales vistos y si están desactivados (son de la cuenta, no de cada personaje). */
  tutorials: TutorialsSave;
  /** Avisos pendientes de enseñar una vez (p. ej., el oro devuelto por las ampliaciones del almacén antiguo). */
  notes: string[];
}

/** Un personaje: todo lo del `Profile` que no es de la cuenta, con su almacén por páginas. */
export type CharacterSave = Omit<Profile, 'skins' | 'settings' | 'tutorialDone' | 'stash' | 'shared'> & {
  id: string;
  /** Hueco que ocupa en la pantalla de selección (0–3). */
  slot: number;
  lastPlayedAt: number;
  /** Atuendo que lleva puesto (de entre los de la cuenta). */
  skinEquipped: string | null;
  /** Páginas propias del almacén: la primera es la gratuita; las demás existen si se compraron. */
  stashPages: Grid[];
};

export interface SaveData {
  format: typeof SAVE_FORMAT;
  version: typeof SAVE_VERSION;
  account: AccountData;
  characters: CharacterSave[];
}

export function emptySave(now = Date.now()): SaveData {
  return {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    account: {
      id: makeUid('acc'), createdAt: now, updatedAt: now, skinsOwned: [], tutorialDone: false,
      settings: { ...DEFAULT_SETTINGS }, shared: { owned: false, grid: [] }, lastCharacterId: null,
      backup: { lastAt: null, expeditionsSince: 0, remindedAt: null }, notes: [], tutorials: emptyTutorials(),
    },
    characters: [],
  };
}

/** Separa un perfil en su parte de personaje (lo de la cuenta se ignora aquí). */
function toCharacter(p: Profile, id: string, slot: number, prev?: CharacterSave): CharacterSave {
  const { skins, settings: _settings, tutorialDone: _t, stash, shared: _shared, ...rest } = p;
  void prev;
  // El almacén antiguo (40–72 casillas) se guarda tal cual: sanitizeSave lo pasa a páginas y devuelve lo pagado
  const pages = stash.length % STASH_PAGE_SIZE === 0 ? splitPages(stash) : [stash];
  return { ...rest, id, slot, lastPlayedAt: prev?.lastPlayedAt ?? p.createdAt ?? Date.now(), skinEquipped: skins?.equipped ?? null, stashPages: pages };
}

/** Monta el perfil de juego de un personaje con los datos de la cuenta. */
export function composeProfile(save: SaveData, charId: string): Profile | null {
  const c = save.characters.find((x) => x.id === charId);
  if (!c) return null;
  const { id: _id, slot: _slot, lastPlayedAt: _l, skinEquipped, stashPages, ...rest } = c;
  const owned = save.account.skinsOwned;
  return {
    ...rest,
    stash: joinPages(stashPages),
    shared: save.account.shared.owned ? [...save.account.shared.grid] : null,
    skins: { owned: [...owned], equipped: skinEquipped && owned.includes(skinEquipped) ? skinEquipped : null },
    settings: { ...save.account.settings },
    tutorialDone: save.account.tutorialDone,
  } as Profile;
}

/** Devuelve la partida con el perfil activo repartido entre su personaje y la cuenta. */
export function applyProfile(save: SaveData, p: Profile, charId: string, now = Date.now()): SaveData {
  const i = save.characters.findIndex((x) => x.id === charId);
  const prev = i >= 0 ? save.characters[i] : undefined;
  const slot = prev?.slot ?? firstFreeSlot(save);
  const ch = { ...toCharacter(p, charId, slot, prev), lastPlayedAt: now };
  const characters = i >= 0 ? save.characters.map((x, k) => (k === i ? ch : x)) : [...save.characters, ch];
  const skinsOwned = [...new Set([...save.account.skinsOwned, ...(p.skins?.owned ?? [])])];
  return {
    ...save,
    characters: sortBySlot(characters),
    account: {
      ...save.account, updatedAt: now, skinsOwned, settings: { ...p.settings },
      shared: p.shared ? { owned: true, grid: [...p.shared] } : save.account.shared,
      tutorialDone: save.account.tutorialDone || p.tutorialDone, lastCharacterId: charId,
    },
  };
}

export function firstFreeSlot(save: SaveData): number {
  for (let s = 0; s < MAX_CHARACTERS; s++) if (!save.characters.some((c) => c.slot === s)) return s;
  return -1;
}

/** Añade un personaje nuevo en el primer hueco libre (o en el indicado). Devuelve null si no hay hueco. */
export function addCharacter(save: SaveData, p: Profile, slot = firstFreeSlot(save), now = Date.now()): { save: SaveData; id: string } | null {
  if (slot < 0 || slot >= MAX_CHARACTERS || save.characters.some((c) => c.slot === slot)) return null;
  const id = makeUid('pj');
  const ch = { ...toCharacter(p, id, slot), lastPlayedAt: now };
  const skinsOwned = [...new Set([...save.account.skinsOwned, ...(p.skins?.owned ?? [])])];
  return {
    id,
    save: {
      ...save, characters: sortBySlot([...save.characters, ch]),
      account: { ...save.account, updatedAt: now, skinsOwned, tutorialDone: save.account.tutorialDone || p.tutorialDone, lastCharacterId: id },
    },
  };
}

/** Borra un personaje y todo lo suyo. La página «Compartido» y los atuendos de la cuenta no se tocan. */
export function removeCharacter(save: SaveData, id: string, now = Date.now()): SaveData {
  const characters = save.characters.filter((c) => c.id !== id);
  const last = save.account.lastCharacterId === id ? (mostRecent(characters)?.id ?? null) : save.account.lastCharacterId;
  return { ...save, characters, account: { ...save.account, updatedAt: now, lastCharacterId: last } };
}

export function mostRecent(chars: CharacterSave[]): CharacterSave | undefined {
  return [...chars].sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)[0];
}

/** Personaje con el que se continúa: el último usado o, si ya no existe, el más reciente. */
export function currentCharacterId(save: SaveData): string | null {
  const last = save.account.lastCharacterId;
  if (last && save.characters.some((c) => c.id === last)) return last;
  return mostRecent(save.characters)?.id ?? null;
}

const sortBySlot = (cs: CharacterSave[]) => [...cs].sort((a, b) => a.slot - b.slot);

/** Convierte un perfil antiguo (formato 1 o 2, un solo personaje) en una partida: el personaje va al hueco 1. */
export function migrateProfileToSave(raw: unknown, now = Date.now()): SaveData | null {
  const fromVersion = (raw as { version?: number } | null)?.version ?? 2; // sanitizeProfile la cambia al migrar
  const p = sanitizeProfile(raw);
  if (!p) return null;
  const base = emptySave(now);
  const save: SaveData = {
    ...base,
    account: {
      ...base.account,
      createdAt: p.createdAt ?? now,
      skinsOwned: [...(p.skins?.owned ?? [])],
      tutorialDone: !!p.tutorialDone,
      settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
      migratedFrom: fromVersion,
    },
  };
  // Sin mini tutoriales guardados: sanitizeSave los migra desde lo que ya ha usado
  delete (save.account as Partial<AccountData>).tutorials;
  const id = makeUid('pj');
  const ch = { ...toCharacter(p, id, 0), lastPlayedAt: now };
  // Pasa por la misma reparación que una partida cargada (almacén antiguo → páginas, con el oro devuelto)
  return sanitizeSave({ ...save, characters: [ch], account: { ...save.account, lastCharacterId: id } }, now);
}

/**
 * Valida y repara una partida cargada (del navegador o de una copia). Acepta también un perfil suelto
 * de las versiones anteriores y lo migra. Devuelve null si no se reconoce.
 */
export function sanitizeSave(raw: unknown, now = Date.now()): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<SaveData> & { character?: unknown };
  if (r.format !== SAVE_FORMAT && r.format !== OLD_SAVE_FORMAT) return r.character ? migrateProfileToSave(raw, now) : null;
  if (typeof r.version !== 'number' || r.version > SAVE_VERSION) return null;
  const base = emptySave(now);
  const a = (r.account ?? {}) as Partial<AccountData>;
  const account: AccountData = {
    ...base.account,
    id: typeof a.id === 'string' && a.id ? a.id : base.account.id,
    createdAt: num(a.createdAt, now), updatedAt: num(a.updatedAt, now),
    skinsOwned: Array.isArray(a.skinsOwned) ? a.skinsOwned.filter((x) => typeof x === 'string') : [],
    tutorialDone: !!a.tutorialDone,
    settings: { ...DEFAULT_SETTINGS, ...(a.settings ?? {}) },
    shared: { owned: !!a.shared?.owned, grid: Array.isArray(a.shared?.grid) ? a.shared!.grid : [] },
    lastCharacterId: typeof a.lastCharacterId === 'string' ? a.lastCharacterId : null,
    backup: {
      lastAt: typeof a.backup?.lastAt === 'number' ? a.backup.lastAt : null,
      expeditionsSince: num(a.backup?.expeditionsSince, 0),
      remindedAt: typeof a.backup?.remindedAt === 'number' ? a.backup.remindedAt : null,
      expeditionsAt: num(a.backup?.expeditionsAt, 0),
    },
    notes: Array.isArray(a.notes) ? a.notes.filter((x) => typeof x === 'string') : [],
    tutorials: sanitizeTutorials(a.tutorials),
    ...(a.migratedFrom ? { migratedFrom: a.migratedFrom } : {}),
  };
  if (account.shared.owned) account.shared.grid = padTo(account.shared.grid, STASH_PAGE_SIZE);
  let save: SaveData = { ...base, account, characters: [] };
  const used = new Set<number>();
  const list = Array.isArray(r.characters) ? r.characters : [];
  for (const c of list.slice(0, MAX_CHARACTERS)) {
    if (!c || typeof c !== 'object') continue;
    const cs = c as CharacterSave;
    const id = typeof cs.id === 'string' && cs.id ? cs.id : makeUid('pj');
    let slot = Number.isInteger(cs.slot) && cs.slot >= 0 && cs.slot < MAX_CHARACTERS && !used.has(cs.slot) ? cs.slot : -1;
    if (slot < 0) for (let s = 0; s < MAX_CHARACTERS; s++) if (!used.has(s)) { slot = s; break; }
    const rawPages = Array.isArray(cs.stashPages) && cs.stashPages.length && cs.stashPages.every(Array.isArray) ? cs.stashPages : [[]];
    // Almacén antiguo (una sola página que no mide 120): a páginas, devolviendo el oro de «Ampliar (+8)»
    let stash = rawPages.flat().map((x) => x ?? null);
    let refund = 0;
    if (rawPages.length === 1 && rawPages[0].length !== STASH_PAGE_SIZE) ({ stash, refund } = migrateLegacyStash(rawPages[0].map((x) => x ?? null)));
    else stash = joinPages(rawPages);
    // Cada personaje pasa por la misma reparación que un perfil suelto (objetos que ya no existen, campos nuevos…)
    const asProfile = { ...cs, stash, shared: null, skins: { owned: account.skinsOwned, equipped: cs.skinEquipped ?? null }, settings: account.settings, tutorialDone: account.tutorialDone, version: cs.version ?? 2 };
    const p = sanitizeProfile(asProfile);
    if (!p) continue;
    if (refund) {
      if (cs.goldPhysical) p.stash = placeGoldGift(p.stash, Math.ceil(refund * GOLD_SCALE));
      else p.gold += refund;
      account.notes = [...account.notes, `El almacén ahora tiene páginas de ${STASH_PAGE_SIZE} casillas y todo lo de ${p.character.name} está en la primera. Te devolvemos lo que pagaste por ampliarlo.`];
    }
    // Oro físico: el oro de antes (un número, en la escala antigua) pasa a monedas ÷10, en sacos de regalo en el almacén
    if (!cs.goldPhysical) {
      const n = Math.ceil(Math.max(0, p.gold) * GOLD_SCALE);
      p.stash = placeGoldGift(p.stash, n);
      p.goldPhysical = true;
      if (n > 0) account.notes = [...account.notes, `El oro ahora pesa: las ${n} monedas de ${p.character.name} están en sacos en su almacén. Lo que lleves encima a la mazmorra lo arriesgas.`];
    }
    p.gold = gridGold(p.stash);
    // Formato 4: tiempo de juego activo (las partidas anteriores empiezan en 0)
    p.playMs = num(cs.playMs, 0);
    used.add(slot);
    const repaired = toCharacter(p, id, slot);
    repaired.lastPlayedAt = num(cs.lastPlayedAt, now);
    save = { ...save, characters: [...save.characters, repaired] };
  }
  save.characters = sortBySlot(save.characters);
  // Partida de antes de los mini tutoriales: se dan por vistos los de lo que ya ha usado (plan-tutoriales.md, fase 8)
  if (a.tutorials === undefined) {
    save.account.tutorials = {
      ...save.account.tutorials,
      seen: seenFromHistory(save.characters, {
        tutorialDone: account.tutorialDone, skinsOwned: account.skinsOwned, backupAt: account.backup.lastAt,
        settingsOpened: typeof account.settings.settingsTab === 'string', sharedOwned: account.shared.owned,
      }),
    };
  }
  if (save.account.lastCharacterId && !save.characters.some((c) => c.id === save.account.lastCharacterId)) save.account.lastCharacterId = currentCharacterId(save);
  return save;
}

/** Mete el oro de la migración en el almacén (sacos, saquitos y monedas); si no cabe, añade páginas gratis. */
function placeGoldGift(stash: Grid, amount: number): Grid {
  let g = stash;
  for (const s of goldAsStacks(amount)) {
    let r = addToGrid(g, s, LAYOUTS.stash);
    while (r.leftover) { g = [...g, ...emptyGrid(STASH_PAGE_SIZE)]; r = addToGrid(g, s, LAYOUTS.stash); }
    g = r.grid;
  }
  return g;
}

function padTo(g: Grid, n: number): Grid {
  const out = g.map((x) => x ?? null);
  while (out.length < n) out.push(null);
  return out.slice(0, Math.max(n, out.length));
}

function num(v: unknown, d: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : d;
}

/** Resumen corto (para la selección de personaje y para enseñar qué hay en una copia). */
export function saveSummary(save: SaveData) {
  return save.characters.map((c) => ({ id: c.id, slot: c.slot, name: c.character.name, classId: c.character.classId, level: c.character.level, gold: c.gold, lastPlayedAt: c.lastPlayedAt }));
}
