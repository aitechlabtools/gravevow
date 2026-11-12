// Estado interno compartido por store.ts y sus acciones de expedición y combate.
// La interfaz importa siempre desde store.ts.
import { emptyTutorials, type TutorialsSave } from '../../core/tutorials';
import { newClock, type GameClock } from '../../core/clock';
import { resizeBody, summaryHp } from '../../core/anatomy';
import { useSyncExternalStore } from 'react';
import type { Appearance, ClassId, Grid, ItemStack, Profile, Rarity } from '../../core/types';
import { AFFIXES, RARITY_RULES } from '../../core/data/rarity';
import { saveSave } from '../persistence/db';
import { backupStatus, type BackupStatus } from '../../core/backup';
import { applyProfile, type SaveData } from '../../core/save';
import { type ExpeditionState, type ExpeditionSummary } from '../../core/expedition';
import { carryBlock, loadOf, type Load } from '../../core/carry';
import { addToGrid, emptyGrid, LAYOUTS, type Containers } from '../../core/inventory';
import { type StashPage } from '../../core/stashPages';
import { syncGold } from '../../core/wallet';
import { computeStats } from '../../core/stats';
import { type CombatState } from '../../core/combat';
import { type VendorId } from '../../core/data/vendors';
import { areaDef, zoneEnemyLevel, type SubzoneId } from '../../core/data/zones';
import { SUBZONE_ORDER } from '../../core/data/subzones';
import { getItem } from '../../core/data/items';
import { makeUid } from '../../core/rng';
import { noRival, type RivalState } from '../../core/social';
import { TUTORIAL_STEPS } from '../../core/data/tutorial';
import { type MercState } from '../../core/mercenaries';
import { type DungeonDef } from '../../core/dungeon';
import { sfx } from '../audio';

export type Screen = 'boot' | 'title' | 'select' | 'backup' | 'create' | 'lobby' | 'dungeon' | 'summary';

/** Un personaje en la pantalla de selección (lo justo para dibujarlo y describirlo). */
export interface RosterEntry {
  id: string; slot: number; name: string; classId: ClassId; level: number; gold: number; lastPlayedAt: number;
  appearance: Appearance; equipment: Profile['equipment']; skin: string | null;
}

export interface Toast { id: number; text: string; kind: 'loot' | 'info' | 'danger' | 'social' | 'good'; icon?: string }

export type CombatKind = 'pve' | 'hostile' | 'betrayal-by-player' | 'betrayal-by-rival';

export interface CombatSession {
  state: CombatState;
  kind: CombatKind;
  entityId: string | null;
  /** Enemigos del mapa que entraron en el combate (hasta dos). */
  entityIds?: string[];
  title: string;
  rewards: { xp: number; gold: number; items: ItemStack[]; overflow: boolean; /** Saco del suelo con el botín. */ bagId?: string | null } | null;
}

export interface LootSession {
  id: string; // id del cofre o bolsa
  source: 'chest' | 'bag';
  title: string;
  initialCount: number;
  given: string[];
  shareAsked: boolean;
  /** Valor del botín al abrirlo y lo que le has dado al errante (monedas incluidas). */
  totalValue?: number;
  givenValue?: number;
  givenGold?: number;
  /** Cofre de un solo objeto (quedártelo solo es tacaño). */
  single?: boolean;
}

export type Modal =
  | { type: 'loot'; session: LootSession }
  | { type: 'rival' }
  | { type: 'confirmBetray' }
  | { type: 'rivalDemand'; amount: number; pct: number; line: string }
  | { type: 'inventory' }
  | { type: 'pause' }
  | { type: 'chestLock'; chestId: string; table: string }
  | { type: 'interact'; options: string[] }
  | { type: 'captive'; mercId: string }
  | { type: 'merc' }
  /** Panel de heridas: silueta de siete regiones y tratamientos. */
  | { type: 'body' }
  | null;

export interface Bag { id: string; x: number; y: number; grid: Grid; label: string; /** Saco de un combate en el que luchó el errante aliado: espera su parte. */ allyShare?: boolean }

export interface DungeonHud {
  room: string;
  prompt: string | null;
  channel: number; // 0..1 canalizando el portal o picando
  /** Qué se está canalizando (portal o una veta). */
  channelLabel?: string;
  playerTile: [number, number];
}

/** Tutorial en curso (primera expedición, o repetido desde Ajustes). */
export interface TutorialRun {
  step: number;
  /** Repetido desde Ajustes: sin recompensas, y al acabar se devuelve el perfil tal como estaba. */
  replay: Profile | null;
  /** Pociones que llevabas al empezar el paso de la poción. */
  potionsAt?: number;
  /** Ya pisó los pinchos (el paso de la poción empieza entonces). */
  trapHit?: boolean;
  betrayalStarted?: boolean;
}

export interface GameState {
  screen: Screen;
  tutorial: TutorialRun | null;
  profile: Profile | null;
  expedition: ExpeditionState | null;
  /** Mazmorra de la expedición en curso. */
  dungeon: DungeonDef | null;
  summary: ExpeditionSummary | null;
  combat: CombatSession | null;
  modal: Modal;
  toasts: Toast[];
  rival: RivalState;
  rivalLine: string | null;
  /** Mercenario que te acompaña en esta expedición (contratado o rescatado). */
  merc: MercState | null;
  chests: Record<string, Grid>;
  /** Vetas ya picadas en esta expedición. */
  mined: Record<string, boolean>;
  bags: Record<string, Bag>;
  hud: DungeonHud;
  notice: string | null;
  now: number;
  /** Pantalla en vertical en un móvil: la escena se congela hasta que se gire (el reloj sigue, como en el menú de pausa). */
  suspended: boolean;
  /** Reloj de juego de la expedición: solo avanza jugando (no en menús ni con la pestaña oculta). */
  clock: GameClock;
  /** Mensaje de error de inventario (p.ej. «Tu clase no puede usar este objeto»). */
  invError: string | null;
  /** Personajes de la partida (hasta 4) y cuál está activo. */
  roster: RosterEntry[];
  activeId: string | null;
  /** El tutorial ya se jugó con algún personaje (los siguientes pueden saltarlo). */
  accountTutorialDone: boolean;
  /** Hueco elegido en la selección para el personaje que se está creando. */
  createSlot: number | null;
  /** Página del almacén que se está viendo (0 = la primera, 'shared' = «Compartido»). */
  stashPage: StashPage;
  /** Título del aviso de la pantalla de título (por defecto, «Expedición interrumpida»). */
  noticeTitle: string | null;
  /** Estado de las copias de seguridad (última copia, recordatorio). */
  backup: BackupStatus | null;
  /** Mercader con el que se está hablando (decide qué compra y a qué precio al vender). */
  activeVendor: VendorId | null;
  /** Últimos objetos vendidos al mercader abierto: se pueden recomprar al mismo precio hasta salir de él. */
  buyback: { stack: ItemStack; price: number }[];
  /** Bloque que se destaca al abrir la copia de seguridad («Tengo una copia» → cargar). */
  backupFocus: 'load' | null;
  /** Hay una partida guardada de antes de la última importación (para deshacerla): cuándo se importó. */
  undoAt: number | null;
  /** El navegador conserva los datos de forma persistente (true), no lo garantiza (false) o no se sabe (null). */
  persisted: boolean | null;
  /** Mini tutoriales de la cuenta (copia de `save.account.tutorials` para la interfaz). */
  tutorials: TutorialsSave;
  /** Cola de mini tutoriales por enseñar (uno a la vez) y paso del primero. */
  miniQueue: string[];
  miniStep: number;
}

export const initial: GameState = {
  screen: 'boot',
  profile: null,
  expedition: null,
  dungeon: null,
  summary: null,
  tutorial: null,
  combat: null,
  modal: null,
  suspended: false,
  clock: newClock(),
  toasts: [],
  rival: noRival(),
  rivalLine: null,
  merc: null,
  chests: {},
  mined: {},
  bags: {},
  hud: { room: '', prompt: null, channel: 0, playerTile: [0, 0] },
  notice: null,
  now: Date.now(),
  invError: null,
  roster: [],
  activeId: null,
  accountTutorialDone: false,
  createSlot: null,
  stashPage: 0,
  noticeTitle: null,
  backup: null,
  activeVendor: null,
  tutorials: emptyTutorials(),
  miniQueue: [],
  miniStep: 0,
  buyback: [],
  backupFocus: null,
  undoAt: null,
  persisted: null,
};

export let state: GameState = initial;
const listeners = new Set<() => void>();

export function getState(): GameState {
  return state;
}

export function set(patch: Partial<GameState> | ((s: GameState) => Partial<GameState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  const prevProfile = state.profile;
  state = { ...state, ...p };
  if (state.profile && state.profile !== prevProfile) state = { ...state, profile: syncGold(state.profile) };
  if (state.profile && state.profile !== prevProfile) scheduleSave();
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useGame<T>(sel: (s: GameState) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state));
}

// ── Guardado ──
// La partida (cuenta + hasta 4 personajes) vive aquí; el juego trabaja con `state.profile`, que es el personaje
// activo montado con los datos de la cuenta. Al guardar, el perfil se reparte de nuevo en la partida.
/** Partida y personaje activo: se cambian desde las acciones de cuenta (store.ts). */
export const ss: { save: SaveData | null; activeId: string | null } = { save: null, activeId: null };
export function getSave(): SaveData | null { return ss.save; }
export function getActiveCharacterId(): string | null { return ss.activeId; }

export function syncSave() {
  if (ss.save && ss.activeId && state.profile) ss.save = applyProfile(ss.save, state.profile, ss.activeId);
}
export function rosterOf(sv: SaveData | null): RosterEntry[] {
  if (!sv) return [];
  return sv.characters.map((c) => ({
    id: c.id, slot: c.slot, name: c.character.name, classId: c.character.classId, level: c.character.level, gold: c.gold,
    lastPlayedAt: c.lastPlayedAt, appearance: c.character.appearance, equipment: c.equipment,
    skin: c.skinEquipped && sv.account.skinsOwned.includes(c.skinEquipped) ? c.skinEquipped : null,
  }));
}
/** Pone al día la lista de personajes que ve la interfaz. */
export function refreshRoster() {
  set({ roster: rosterOf(ss.save), activeId: ss.activeId, accountTutorialDone: !!ss.save?.account.tutorialDone, tutorials: ss.save?.account.tutorials ?? emptyTutorials(), backup: ss.save && ss.save.characters.length ? backupStatus(ss.save) : null });
}

/** Lo que se conserva al cambiar de personaje o de partida (no depende del personaje). */
export function kept(): Partial<GameState> {
  return { undoAt: state.undoAt, persisted: state.persisted, toasts: state.toasts, tutorials: state.tutorials };
}

/** Pide al navegador que no borre los datos del juego por su cuenta (si lo permite). */
export async function requestPersist() {
  try {
    const st = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (!st?.persist) return;
    const already = st.persisted ? await st.persisted() : false;
    set({ persisted: already || (await st.persist()) });
  } catch { /* sin soporte: no pasa nada */ }
}
let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    syncSave();
    if (ss.save) void saveSave(ss.save);
    refreshRoster();
  }, 150);
}
export async function saveNow() {
  if (saveTimer) clearTimeout(saveTimer);
  syncSave();
  if (ss.save) await saveSave(ss.save);
}

// ── Notificaciones ──
let toastId = 0;
export function toast(text: string, kind: Toast['kind'] = 'info', icon?: string) {
  const id = ++toastId;
  set((s) => ({ toasts: [...s.toasts.slice(-4), { id, text, kind, icon }] }));
  setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
}

// ── Contenedores para el inventario ──
export function containersFor(s: GameState, lootId?: string): Containers | null {
  if (!s.profile) return null;
  const inDungeon = s.screen === 'dungeon' && s.expedition;
  const lootGrid = lootId ? (s.chests[lootId] ?? s.bags[lootId]?.grid ?? emptyGrid(0)) : emptyGrid(0);
  return {
    backpack: inDungeon ? s.expedition!.backpack : s.profile.backpack,
    equipment: inDungeon ? s.expedition!.equipment : s.profile.equipment,
    stash: inDungeon ? emptyGrid(0) : s.profile.stash,
    shared: inDungeon ? emptyGrid(0) : (s.profile.shared ?? emptyGrid(0)),
    pocket: inDungeon ? s.expedition!.pocket : s.profile.pocket,
    loot: lootGrid,
  };
}

/** Carga de lo que llevas encima: en la mazmorra, lo de la expedición; en el Bastión, lo del perfil. */
export function loadNow(c?: Pick<Containers, 'backpack' | 'pocket' | 'equipment'>): Load | null {
  const p = state.profile;
  if (!p) return null;
  const e = state.screen === 'dungeon' && state.expedition ? state.expedition : null;
  const src = c ?? (e ? { backpack: e.backpack, pocket: e.pocket, equipment: e.equipment } : { backpack: p.backpack, pocket: p.pocket, equipment: p.equipment });
  return loadOf({ ...src, bag: p.bag }, p.character.classId);
}

/** Aplica el nuevo reparto de objetos. Si sube el peso por encima del 150 %, no cambia nada, avisa y devuelve false. */
export function applyContainers(c: Containers, lootId?: string): boolean {
  const before = loadNow(), after = loadNow(c);
  const block = before && after ? carryBlock(before.weight, after.weight, after.capacity) : null;
  if (block) { invError(block); return false; }
  set((s) => {
    if (!s.profile) return {};
    const patch: Partial<GameState> = {};
    if (s.screen === 'dungeon' && s.expedition) {
      const stats = computeStats(s.profile.character.classId, s.profile.character.level, c.equipment);
      // La anatomía se ajusta a la nueva vida máxima conservando la parte de cada región
      const body = resizeBody(s.expedition.body, stats.maxHp);
      patch.expedition = { ...s.expedition, backpack: c.backpack, pocket: c.pocket, equipment: c.equipment, body, hp: summaryHp(body), mp: Math.min(s.expedition.mp, stats.maxMp) };
    } else {
      patch.profile = { ...s.profile, backpack: c.backpack, equipment: c.equipment, stash: c.stash, shared: s.profile.shared ? c.shared : null, pocket: c.pocket };
    }
    if (lootId) {
      if (s.chests[lootId]) patch.chests = { ...s.chests, [lootId]: c.loot };
      else if (s.bags[lootId]) patch.bags = { ...s.bags, [lootId]: { ...s.bags[lootId], grid: c.loot } };
    }
    patch.invError = null;
    return patch;
  });
  return true;
}

export function recordFound(stacks: ItemStack[]) {
  const e = state.expedition;
  if (!e || !stacks.length) return;
  set({ expedition: { ...e, found: [...e.found, ...stacks.map((x) => ({ ...x }))] } });
}

export function invError(msg: string) {
  sfx('error');
  set({ invError: msg });
  toast(msg, 'danger');
}

export function equipCtx() {
  const ch = state.profile!.character;
  return { classId: ch.classId, level: ch.level };
}

// ════════════════════════════════════════════════════════════════════
// Acciones
// ════════════════════════════════════════════════════════════════════
/** Nivel de las criaturas (y de Kael) en la expedición actual: el del jugador dentro del rango de la zona. */
/** Nivel de una criatura concreta: el de la subzona más lo que sume su sala (más honda, élite o jefe). */
export function enemyLevel(entityId: string | null): number {
  const s = state;
  const e = s.dungeon?.entities.find((x) => x.kind === 'enemy' && x.id === entityId) as { lvl?: number } | undefined;
  const area = areaDef(s.dungeon?.subzone, s.dungeon?.zone);
  return Math.min(area.levels[1] + 3, combatLevel() + (e?.lvl ?? 0));
}

export function combatLevel(): number {
  const s = state;
  return zoneEnemyLevel(areaDef(s.dungeon?.subzone, s.dungeon?.zone), s.profile?.character.level ?? 1);
}

/** Tutorial: el personaje no puede moverse hasta cumplir el paso (inventario, y curarse tras los pinchos). */
export function tutorialFrozen(s: GameState = state): boolean {
  const t = s.tutorial;
  const step = t ? TUTORIAL_STEPS[t.step] : null;
  if (!t || !step?.freeze) return false;
  if (step.id === 'potion') return t.potionsAt !== undefined;
  return true;
}

/** Profundidad de la subzona actual (0 Afueras … 9 Trono) para la tirada de rareza. */
export function subzoneDepth(): number {
  const sub = state.dungeon?.subzone;
  return sub ? Math.max(0, SUBZONE_ORDER.indexOf(sub as SubzoneId)) : 0;
}

export const dev: {
  forceKael: boolean; forceWanderer: string | null; forceHostile: boolean; forceBetrayal: boolean; skipTutorial: boolean; skipMinis: boolean;
  /** Te da cualquier objeto con la rareza y los atributos que quieras (a la mochila de la expedición o del perfil). */
  give: (itemId: string, rarity?: Rarity, affixes?: string[], qty?: number) => string;
  /** Pone a tu personaje en el nivel que digas (1–100). */
  setLevel: (level: number) => string;
  /** Deja todas tus acciones listas (también en el combate en curso). */
  resetCooldowns: () => string;
} = {
  forceKael: false, forceWanderer: null, forceHostile: false, forceBetrayal: false,
  give(itemId, rarity, affixes, qty = 1) {
    const def = getItem(itemId);
    if (rarity && !RARITY_RULES[rarity]) return `Rareza desconocida: ${rarity}`;
    for (const a of affixes ?? []) if (!AFFIXES[a]) return `Atributo desconocido: ${a}`;
    const stack: ItemStack = { uid: makeUid(), itemId, qty, ...(rarity ? { rarity } : {}), ...(affixes?.length ? { affixes } : {}) };
    if (state.expedition) {
      const r = addToGrid(state.expedition.backpack, stack, LAYOUTS.backpack);
      set({ expedition: { ...state.expedition, backpack: r.grid } });
    } else if (state.profile) {
      const r = addToGrid(state.profile.backpack, stack, LAYOUTS.backpack);
      set({ profile: { ...state.profile, backpack: r.grid } });
    } else return 'No hay personaje.';
    return `Añadido: ${def.name} (${rarity ?? def.rarity})`;
  },
  setLevel(level) {
    if (!state.profile) return 'No hay personaje.';
    const lv = Math.max(1, Math.min(100, Math.floor(level)));
    set({ profile: { ...state.profile, character: { ...state.profile.character, level: lv, xp: 0 } } });
    return `Nivel ${lv}`;
  },
  resetCooldowns() {
    if (state.expedition) set({ expedition: { ...state.expedition, cooldowns: {} } });
    if (state.combat) {
      const cs = structuredClone(state.combat.state);
      for (const c of cs.combatants) if (c.control === 'player') c.cooldowns = {};
      set({ combat: { ...state.combat, state: cs } });
    }
    return 'Recargas a cero';
  },
  // Con ?debug las pruebas automáticas se saltan el tutorial; con ?debug&tutorial se juega
  // Con ?debug los mini tutoriales no salen (las pruebas no tropiezan con ellos); con ?debug&minis, sí
  skipMinis: typeof window !== 'undefined' && /[?&]debug/.test(window.location.search) && !/[?&]minis/.test(window.location.search),
  skipTutorial: typeof window !== 'undefined' && /[?&]debug/.test(window.location.search) && !/[?&]tutorial/.test(window.location.search),
};

/** En este navegador ya se completó alguna vez el tutorial: los personajes nuevos pueden saltarlo. */
export const TUTORIAL_FLAG = 'gravevow.tutorialDone';
export function tutorialDoneOnDevice(): boolean {
  try { return localStorage.getItem(TUTORIAL_FLAG) === '1'; } catch { return false; }
}
export function markTutorialDoneOnDevice() {
  try { localStorage.setItem(TUTORIAL_FLAG, '1'); } catch { /* sin almacenamiento: no pasa nada */ }
}
