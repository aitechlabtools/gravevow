import { migrateReputation } from './vendors';
import { BAG_SIZES, STARTING_BAG, STARTING_COINS } from '../config/gold';
import { coins } from './gold';
import { adaptDrops } from './loot';
import { initialClassSkills, sanitizeClassSkills } from './classSkills';
import { isSubzoneId } from './data/subzones';
import { MERCENARIES } from './data/mercenaries';
import { SKINS } from './data/skins';
import type { Appearance, ClassId, Profile } from './types';
import { CLASSES } from './data/classes';
import { addToGrid, BACKPACK_SIZE, emptyEquipment, emptyGrid, LAYOUTS, repairGrid, repairGridEx, STASH_SIZE } from './inventory';
import { STASH_PAGE_SIZE } from '../config/stash';
import { getItem } from './data/items';
import { initialQuests, migrateQuests } from './quests';
import { makeUid } from './rng';
import { POCKET_SIZE } from './data/chests';
import { legacyLevelToNew } from '../config/progression';
import { xpForNextLevel } from './stats';

export const STARTING_GOLD = STARTING_COINS;

export function createProfile(name: string, classId: ClassId, appearance: Appearance): Profile {
  const cls = CLASSES[classId];
  if (!cls.playable) throw new Error('Esa clase todavía no está disponible.');
  const equipment = emptyEquipment();
  let backpack = emptyGrid(BACKPACK_SIZE);
  for (const k of cls.starterKit) {
    const def = getItem(k.itemId);
    const stack = { uid: makeUid(), itemId: k.itemId, qty: k.qty };
    if (def.slot && !equipment[def.slot]) equipment[def.slot] = stack;
    else backpack = addToGrid(backpack, stack, LAYOUTS.backpack).grid;
  }
  return {
    version: 2,
    classSkills: initialClassSkills(classId),
    character: { name: name.trim().slice(0, 18) || 'Sin nombre', classId, appearance, level: 1, xp: 0 },
    gold: STARTING_GOLD,
    backpack,
    // El oro inicial son monedas de verdad en el almacén
    stash: [coins(STARTING_COINS), ...emptyGrid(STASH_SIZE - 1)],
    shared: null,
    goldPhysical: true,
    bag: { uid: makeUid(), itemId: STARTING_BAG, qty: 1 },
    equipment,
    quests: initialQuests(),
    stats: { expeditions: 0, extractions: 0, deaths: 0, kills: 0 },
    bossesDefeated: [],
    contract: null,
    skins: { owned: [], equipped: null },
    mercsRescued: [],
    mercDiscounts: [],
    bestiary: {},
    reputation: {},
    pocket: emptyGrid(POCKET_SIZE),
    activeExpedition: null,
    tutorialSeen: { lobby: false, dungeon: false },
    tutorialDone: false,
    kael: { missStreak: 0 },
    lastSubzone: null,
    settings: { volume: 0.6, music: true },
    createdAt: Date.now(),
  };
}

/** Lleva un perfil guardado con una versión antigua al formato actual sin que el jugador pierda nada. */
export function migrateProfile(p: Profile): Profile {
  const v = (p as { version?: number }).version;
  if (v === 1 && p.character) {
    // v1 → v2: niveles 1–10 pasan a la escala 1–100; se conserva la proporción de experiencia hacia el siguiente nivel
    const oldLevel = p.character.level;
    const oldNeed = Math.round(100 * Math.pow(oldLevel, 1.4));
    const frac = oldNeed > 0 ? Math.min(0.99, Math.max(0, p.character.xp / oldNeed)) : 0;
    const level = legacyLevelToNew(oldLevel);
    p.character = { ...p.character, level, xp: Math.floor(frac * xpForNextLevel(level)) };
    (p as { version: number }).version = 2;
  }
  return p;
}

/** Valida y repara un perfil cargado del almacenamiento (por si cambia el formato entre versiones). */
export function sanitizeProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = migrateProfile(raw as Profile);
  if (p.version !== 2 || !p.character || !Array.isArray(p.backpack) || !Array.isArray(p.stash)) return null;
  const known = (s: { itemId: string } | null) => {
    if (!s) return null;
    try { getItem(s.itemId); return s; } catch { return null; }
  };
  p.backpack = p.backpack.map(known) as Profile['backpack'];
  p.stash = p.stash.map(known) as Profile['stash'];
  p.shared = Array.isArray(p.shared) ? (p.shared.map(known) as Profile['stash']) : null;
  const eq = { ...emptyEquipment(), ...(p.equipment ?? {}) };
  for (const k of Object.keys(eq) as (keyof typeof eq)[]) eq[k] = known(eq[k]) as typeof eq[typeof k];
  p.equipment = eq;
  const oldQuests = migrateQuests(p.quests ?? []);
  p.quests = initialQuests().map((q) => oldQuests.find((x) => x.id === q.id) ?? q);
  p.tutorialSeen = p.tutorialSeen ?? { lobby: true, dungeon: true };
  // Subzonas, tutorial y Kael (4/11/2026): quien ya ha bajado alguna vez no repite el tutorial
  if (typeof p.tutorialDone !== 'boolean') p.tutorialDone = (p.stats?.expeditions ?? 0) > 0;
  const streak = Number((p.kael as { missStreak?: unknown } | undefined)?.missStreak);
  const met = Number((p.kael as { met?: unknown } | undefined)?.met);
  const grudge = Number((p.kael as { grudge?: unknown } | undefined)?.grudge);
  p.kael = { missStreak: Number.isFinite(streak) && streak > 0 ? Math.floor(streak) : 0, met: Number.isFinite(met) && met > 0 ? Math.floor(met) : 0, grudge: Number.isFinite(grudge) && grudge > 0 ? Math.min(3, Math.floor(grudge)) : 0 };
  p.classSkills = sanitizeClassSkills(p);
  p.lastSubzone = isSubzoneId(p.lastSubzone) ? p.lastSubzone : null;
  p.settings = Object.assign({ volume: 0.6, music: true }, p.settings ?? {});
  // Partidas de antes de las zonas: si ya cobraste «El trono vacío», el Señor del Osario cuenta como derrotado
  if (!Array.isArray(p.bossesDefeated)) p.bossesDefeated = p.quests.some((q) => q.id === 'q_lord' && q.progress >= 1) ? ['ossuary_lord'] : [];
  if (!p.contract || typeof p.contract !== 'object' || !MERCENARIES[p.contract.mercId] || !(p.contract.left > 0)) p.contract = null;
  // El antiguo Vestuario (aspectos por pieza) desaparece: sus datos se descartan sin más (nadie los compró).
  delete (p as { cosmetics?: unknown }).cosmetics;
  delete (p as { wardrobe?: unknown }).wardrobe;
  // Atuendos: solo los que existen; el puesto tiene que ser uno de los tuyos.
  const sk = (p.skins ?? {}) as Partial<Profile['skins']>;
  const owned = Array.isArray(sk.owned) ? [...new Set(sk.owned.filter((id) => typeof id === 'string' && SKINS[id]))] : [];
  p.skins = { owned, equipped: sk.equipped && owned.includes(sk.equipped) ? sk.equipped : null };
  if (!Array.isArray(p.mercsRescued)) p.mercsRescued = [];
  p.mercsRescued = p.mercsRescued.filter((id) => MERCENARIES[id]);
  if (!Array.isArray(p.mercDiscounts)) p.mercDiscounts = [];
  if (!p.reputation || typeof p.reputation !== 'object') p.reputation = {};
  p.reputation = migrateReputation(p.reputation);
  if (!p.bestiary || typeof p.bestiary !== 'object') p.bestiary = {};
  if (!Array.isArray(p.pocket)) p.pocket = emptyGrid(POCKET_SIZE);
  p.pocket = p.pocket.map(known) as Profile['pocket'];
  // Mochila puesta: la que corresponde a su tamaño (partidas de antes: la de cuero)
  if (!p.bag || !BAG_SIZES[p.bag.itemId]) p.bag = { uid: makeUid(), itemId: Object.keys(BAG_SIZES).find((k) => BAG_SIZES[k] === p.backpack.length) ?? STARTING_BAG, qty: 1 };
  p.stats = Object.assign({ expeditions: 0, extractions: 0, deaths: 0, kills: 0 }, p.stats ?? {});
  // Combate nuevo (C1): el Guerrero usa Ímpetu y el Mago Maná. Las pociones de recurso guardadas pasan a la que te sirve.
  const fix = (g: Profile['backpack']) => g.map((x) => (x ? adaptDrops([x], p.character.classId)[0] : x));
  p.backpack = fix(p.backpack); p.stash = fix(p.stash); p.pocket = fix(p.pocket);
  if (p.shared) p.shared = fix(p.shared);
  // Objetos de varias casillas (saco de oro): marcas de casillas tapadas al día
  // Fase 6 (tamaños por objeto): lo que ya no cabe en la mochila, en el bolsillo o en «Compartido» pasa al almacén;
  // si el almacén no da para todo, se añaden páginas gratis. Nunca se pierde nada.
  // (Un almacén antiguo sin páginas aún no se toca: save.ts lo pasa a páginas y vuelve a llamar aquí.)
  if (p.stash.length % STASH_PAGE_SIZE !== 0) { /* se repara en la segunda pasada */ }
  else {
  const bp = repairGridEx(p.backpack, LAYOUTS.backpack);
  const st = repairGridEx(p.stash, LAYOUTS.stash);
  const sh = p.shared ? repairGridEx(p.shared, LAYOUTS.shared) : null;
  p.backpack = bp.grid; p.stash = st.grid;
  if (sh) p.shared = sh.grid;
  for (const s of [...bp.overflow, ...st.overflow, ...(sh?.overflow ?? [])]) {
    let r = addToGrid(p.stash, s, LAYOUTS.stash);
    while (r.leftover) { p.stash = [...p.stash, ...emptyGrid(STASH_PAGE_SIZE)]; r = addToGrid(p.stash, s, LAYOUTS.stash); }
    p.stash = r.grid;
  }
  }
  p.pocket = repairGrid(p.pocket);
  return p;
}

/** Si el jugador no tiene arma en ningún sitio, el intendente le presta una de recluta. */
export function needsRecruitKit(p: Profile): boolean {
  const all = [...p.backpack, ...p.stash, ...Object.values(p.equipment)];
  return !all.some((s) => s && getItem(s.itemId).category === 'weapon');
}

export function grantRecruitKit(p: Profile): Profile {
  const cls = CLASSES[p.character.classId];
  const weapon = cls.starterKit.find((k) => getItem(k.itemId).category === 'weapon')!;
  const armor = cls.starterKit.find((k) => getItem(k.itemId).category === 'armor');
  let backpack = p.backpack;
  const equipment = { ...p.equipment };
  for (const k of [weapon, armor]) {
    if (!k) continue;
    const def = getItem(k.itemId);
    const stack = { uid: makeUid(), itemId: k.itemId, qty: 1 };
    if (def.slot && !equipment[def.slot]) equipment[def.slot] = stack;
    else backpack = addToGrid(backpack, stack, LAYOUTS.backpack).grid;
  }
  backpack = addToGrid(backpack, { uid: makeUid(), itemId: 'health_potion', qty: 1 }, LAYOUTS.backpack).grid;
  backpack = addToGrid(backpack, { uid: makeUid(), itemId: 'ration', qty: 1 }, LAYOUTS.backpack).grid;
  backpack = addToGrid(backpack, { uid: makeUid(), itemId: 'water', qty: 1 }, LAYOUTS.backpack).grid;
  return { ...p, backpack, equipment };
}
