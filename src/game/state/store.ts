// ════════════════════════════════════════════════════════════════════
// Estado global del juego y acciones. Orquesta el núcleo (lógica pura),
// la persistencia y la comunicación con la escena de Phaser.
// ════════════════════════════════════════════════════════════════════
import { feed, needsOf, sleep, toSaved } from '../../core/needs';
import type { Appearance, ClassId, ItemStack, Profile } from '../../core/types';
import { createProfile, grantRecruitKit, needsRecruitKit, recruitGaps } from '../../core/profile';
import { clearUndo, loadSave, loadUndo, saveSave, saveUndo } from '../persistence/db';
import { backupFileName, backupToCode, backupToJson, buildBackup, totalExpeditions } from '../../core/backup';
import { STASH_PAGE_SIZE } from '../../config/stash';
import { addCharacter, applyProfile, composeProfile, currentCharacterId, emptySave, MAX_CHARACTERS, removeCharacter, type SaveData } from '../../core/save';
import { abandonInterruptedExpedition } from '../../core/expedition';
import { carryBlock } from '../../core/carry';
import { addManyToGrid, addToGrid, anchorIndex, rotateAt, splitStack, countItem, emptyGrid, isMulti, LAYOUTS, removeItem, sortGrid, transfer, isCover, quickEquip, quickMove, type ContainerId, type Loc, stackAt, clearAt } from '../../core/inventory';
import { buy, sell } from '../../core/economy';
import { addToPage, buySharedPage, buyStashPage, joinPages, pageCount, pageSlice as pageSliceOf, sortPage, splitPages, type StashPage } from '../../core/stashPages';
import { equipBag } from '../../core/bag';
import { coins as coinsStack, gridGold, groupGold, splitCoins, withdrawCoins } from '../../core/gold';
import { spendGold } from '../../core/wallet';
import { earnGoldSafe, NO_ROOM_FOR_GOLD, putCoinsPartial, setGoldExactly } from '../../core/wallet';
import { COIN_ID } from '../../config/gold';
import { computeStats } from '../../core/stats';
import { repair, type RepairRef } from '../../core/repair';
import { fieldRepair } from '../../core/durability';
import { VENDORS, type VendorId } from '../../core/data/vendors';
import { REP_RANKS, rankOf } from '../../config/reputation';
import { getItem } from '../../core/data/items';
import { CLASSES } from '../../core/data/classes';
import { equipClassSkill, unlockClassSkill } from '../../core/classSkills';
import { getSkill } from '../../core/data/skills';
import { questDef, isComplete, acceptQuest as acceptQuestCore, abandonQuest as abandonQuestCore, togglePin as togglePinCore, afterClaim } from '../../core/quests';
import { applyXp } from '../../core/stats';
import { potionAmount, resourcePotionAmount } from '../../config/progression';
import { makeUid, randomSeed } from '../../core/rng';
import { vendorUnlocked } from '../../core/vendors';
import { STATION_FX } from '../../config/stations';
import { craft as craftItems, getRecipe, learnBlueprints, settlePendingJobs, storeCrafted } from '../../core/crafting';
import { applyRune, type RuneLoc } from '../../core/runes';
import { canSleepForPrep, cotPrepCut, giveItems, refugeOf, receptionDiscard, receptionSell, receptionWithdraw, RECEPTION_NOTE, upgradeModule } from '../../core/refuge';
import { receptionSalvage, salvage, type SalvageRef } from '../../core/salvage';
import type { ModuleId } from '../../core/data/refuge';
import type { CraftStation } from '../../core/data/crafting';
import { TUTORIAL_BLOCK } from '../../core/data/tutorial';
import { currentMini, enqueueTrigger, markSeen, type TutorialsSave } from '../../core/tutorials';
import { getMini, STATION_FIRST_RECIPE, WELCOME_ID } from '../../core/data/tutorials';
import { bus } from './bus';
import { buySkin, equipSkin } from '../../core/skins';
import { getSkin } from '../../core/data/skins';
import { dismiss, hire, rescuedMerc, setStance, STANCE_NAME } from '../../core/mercenaries';
import { getMerc } from '../../core/data/mercenaries';
import type { MercStance } from '../../core/types';
import { sfx, setAudio } from '../audio';
import { expeditionActions } from './expeditionActions';
import { combatActions } from './combatActions';
import { medicalActions, expBody, withBody } from './medicalActions';
import { healBody } from '../../core/anatomy';
import { applyContainers, loadNow, containersFor, dev, equipCtx, getSave, getState, initial, invError, kept, recordFound, refreshRoster, requestPersist, saveNow, set, ss, state, toast } from './internals';
import type { Bag, GameState, Screen } from './internals';

export type { Screen, RosterEntry, Toast, CombatKind, CombatSession, LootSession, Modal, Bag, DungeonHud, TutorialRun, GameState } from './internals';
export { getState, subscribe, useGame, getSave, getActiveCharacterId, toast, containersFor, tutorialFrozen, dev, tutorialDoneOnDevice } from './internals';

/** Carga un personaje. Un fogón, yunque o mezcla que quedó a medias (minijuegos retirados) se entrega ya terminado. */
function compose(save: SaveData, id: string): Profile | null {
  const c = composeProfile(save, id);
  // Planos que quedaron sin aprender en la mochila o el almacén (partidas de antes de la fase 4)
  const p = c ? learnBlueprints(c).profile : c;
  if (!p || (!p.cooking && !p.workshop)) return p;
  const r = settlePendingJobs(p);
  if (!r.ok) return p;
  if (r.note) toast(r.note, 'good');
  return r.profile;
}

/** Guarda en la cuenta lo visto de los mini tutoriales. */
function saveTutorials(tutorials: TutorialsSave) {
  if (!ss.save) return;
  ss.save = { ...ss.save, account: { ...ss.save.account, tutorials } };
  void saveSave(ss.save);
}

export const actions = {
  async boot() {
    ss.save = await loadSave();
    void requestPersist();
    void loadUndo().then((u) => set({ undoAt: u?.at ?? null }));
    ss.activeId = ss.save ? currentCharacterId(ss.save) : null;
    const p = ss.save && ss.activeId ? compose(ss.save, ss.activeId) : null;
    if (ss.save) setAudio(ss.save.account.settings);
    // Avisos de una sola vez (p. ej., el oro devuelto al pasar el almacén a páginas)
    const notes = ss.save?.account.notes ?? [];
    if (ss.save && notes.length) {
      ss.save = { ...ss.save, account: { ...ss.save.account, notes: [] } };
      await saveSave(ss.save);
      set({ notice: notes.join(' '), noticeTitle: 'El almacén tiene páginas' });
    }
    if (p) {
      if (p.activeExpedition) {
        const fixed = abandonInterruptedExpedition(p);
        refreshRoster();
        set({ profile: fixed, screen: 'title', notice: 'Tu última expedición se interrumpió (la página se cerró o recargó). Se ha anulado sin pérdidas: conservas el equipo con el que entraste, pero no el botín que encontraste.' });
        await saveNow();
        return;
      }
    }
    set({ profile: p && needsRecruitKit(p) ? grantRecruitKit(p) : p, screen: 'title' });
    refreshRoster();
  },

  goto(screen: Screen) {
    set({ screen, modal: null });
  },

  dismissNotice() {
    set({ notice: null, noticeTitle: null });
  },

  // ── Copia de seguridad ──
  /** Pantalla «Copia de seguridad». Con 'load' (desde «Tengo una copia»), destaca el bloque de cargar. */
  async openBackup(focus: 'load' | null = null) {
    await saveNow();
    refreshRoster();
    set({ screen: 'backup', modal: null, backupFocus: focus });
  },

  /** Prepara la copia (archivo y código) y apunta la fecha como última copia. */
  async exportBackup(): Promise<{ json: string; code: string; fileName: string } | null> {
    await saveNow();
    if (!ss.save || !ss.save.characters.length) { toast('Aún no hay ninguna partida que guardar.', 'danger'); return null; }
    const now = Date.now();
    const b = buildBackup(ss.save, now);
    ss.save = { ...ss.save, account: { ...ss.save.account, backup: { ...ss.save.account.backup, lastAt: now, expeditionsAt: totalExpeditions(ss.save) } } };
    await saveSave(ss.save);
    refreshRoster();
    return { json: backupToJson(b), code: backupToCode(b), fileName: backupFileName(now) };
  },

  /** Sustituye la partida entera por la de una copia. Antes guarda la actual para poder deshacerlo. */
  async importSave(next: SaveData) {
    await saveNow();
    if (ss.save && ss.save.characters.length) { await saveUndo(ss.save); set({ undoAt: Date.now() }); }
    ss.save = next;
    ss.activeId = currentCharacterId(ss.save);
    let p = ss.activeId ? compose(ss.save, ss.activeId) : null;
    if (p?.activeExpedition) p = abandonInterruptedExpedition(p);
    await saveSave(ss.save);
    set({ ...initial, ...kept(), profile: p, screen: 'backup', undoAt: state.undoAt, persisted: state.persisted, toasts: state.toasts });
    refreshRoster();
    if (p) setAudio(p.settings);
    toast('Partida cargada.', 'good');
  },

  /** Vuelve a la partida que había antes de la última importación. */
  async undoImport() {
    const u = await loadUndo();
    if (!u) return;
    ss.save = u.save;
    ss.activeId = currentCharacterId(ss.save);
    const p = ss.activeId ? compose(ss.save, ss.activeId) : null;
    await saveSave(ss.save);
    await clearUndo();
    set({ ...initial, ...kept(), profile: p, screen: 'backup', undoAt: null, persisted: state.persisted, toasts: state.toasts });
    refreshRoster();
    toast('Se ha recuperado la partida de antes de cargar la copia.', 'good');
  },

  /** Crea un personaje en el hueco indicado (o en el primero libre) y entra con él al refugio. */
  async createCharacter(name: string, classId: ClassId, appearance: Appearance, skipTutorial = false, slot?: number) {
    await saveNow();
    const base = ss.save ?? emptySave();
    const p0 = createProfile(name, classId, appearance);
    // Los atuendos comprados y los ajustes son de la cuenta: el personaje nuevo también los tiene
    const p1 = { ...p0, skins: { owned: [...base.account.skinsOwned], equipped: null }, settings: { ...base.account.settings }, shared: base.account.shared.owned ? [...base.account.shared.grid] : null };
    // Saltar el tutorial de expedición: la bienvenida del intendente en el Bastión sí sale (tiene su propio «Saltar»)
    const p = skipTutorial ? { ...p1, tutorialDone: true, tutorialSeen: { lobby: false, dungeon: true } } : p1;
    const r = addCharacter(base, p, slot ?? state.createSlot ?? undefined);
    if (!r) { toast('Ya tienes 4 personajes: borra uno para crear otro.', 'danger'); return; }
    ss.save = r.save; ss.activeId = r.id;
    set({ ...initial, ...kept(), profile: p, screen: 'lobby', createSlot: null });
    refreshRoster();
    await saveNow();
  },

  /** Abre la creación de personaje para un hueco concreto de la selección. */
  newCharacter(slot?: number) {
    if (ss.save && ss.save.characters.length >= MAX_CHARACTERS) { toast('Ya tienes 4 personajes: borra uno para crear otro.', 'danger'); return; }
    set({ screen: 'create', createSlot: slot ?? null });
  },

  /** Pantalla «Elige quién baja». */
  async openSelect() {
    await saveNow();
    refreshRoster();
    set({ screen: 'select', modal: null });
  },

  /** Entra al refugio con otro personaje (guarda antes el actual). */
  async selectCharacter(id: string) {
    if (!ss.save || !ss.save.characters.some((c) => c.id === id)) return;
    await saveNow();
    let p = compose(ss.save, id);
    if (!p) return;
    if (p.activeExpedition) p = abandonInterruptedExpedition(p);
    if (needsRecruitKit(p)) p = grantRecruitKit(p);
    ss.activeId = id;
    ss.save = applyProfile(ss.save, p, id); // pasa a ser el último usado
    set({ ...initial, ...kept(), profile: p, screen: 'lobby', roster: state.roster, toasts: state.toasts });
    refreshRoster();
    if (p.settings) setAudio(p.settings);
    await saveNow();
  },

  /** Borra un personaje y todo lo suyo. Los demás, los atuendos y la página «Compartido» se quedan. */
  async deleteCharacterById(id: string) {
    if (!ss.save) return;
    await saveNow();
    ss.save = removeCharacter(ss.save, id);
    const wasActive = ss.activeId === id;
    if (wasActive) ss.activeId = currentCharacterId(ss.save);
    await saveSave(ss.save);
    if (wasActive) {
      const p = ss.activeId ? compose(ss.save, ss.activeId) : null;
      set({ ...initial, ...kept(), profile: p, screen: state.screen === 'select' ? 'select' : 'title', toasts: state.toasts });
    }
    refreshRoster();
  },

  /** Borra el personaje activo (se mantiene por compatibilidad con las pruebas). */
  async deleteCharacter() {
    if (ss.activeId) await actions.deleteCharacterById(ss.activeId);
    set({ screen: 'title' });
  },

  setSettings(patch: Partial<Profile['settings']>) {
    const p = state.profile;
    setAudio(patch);
    if (!p) return;
    set({ profile: { ...p, settings: { ...p.settings, ...patch } } });
  },

  // ── Mini tutoriales (data/tutorials.ts) ──
  /** Algo ha pasado (abrir una pestaña, desbloquear algo…): pone en cola los mini tutoriales de ese disparador. */
  tutorialEvent(trigger: string) {
    if (dev.skipMinis || !ss.save) return;
    const q = enqueueTrigger(state.miniQueue, state.tutorials, trigger);
    if (q !== state.miniQueue) set({ miniQueue: q, miniStep: state.miniQueue.length ? state.miniStep : 0 });
  },
  /** Siguiente paso del mini tutorial que se ve; tras el último, queda visto. */
  miniNext() {
    const m = currentMini(state.miniQueue);
    if (!m) return;
    if (state.miniStep + 1 < m.steps.length) { set({ miniStep: state.miniStep + 1 }); return; }
    actions.miniDone(m.id);
  },
  /** Da por visto un mini tutorial (al terminarlo o al saltarlo) y pasa al siguiente de la cola. */
  miniDone(id: string) {
    const tutorials = markSeen(state.tutorials, id);
    set({ tutorials, miniQueue: state.miniQueue.filter((x) => x !== id), miniStep: 0 });
    // La bienvenida es del personaje: terminada o saltada, no vuelve a salir con él
    if (id === WELCOME_ID) actions.markTutorial('lobby');
    saveTutorials(tutorials);
  },
  /** Ajustes: vuelve a enseñar todos los mini tutoriales. */
  resetMinis() {
    const tutorials = { ...state.tutorials, seen: [] };
    set({ tutorials, miniQueue: [], miniStep: 0 });
    saveTutorials(tutorials);
  },
  /** Ajustes: desactivar (o volver a activar) los mini tutoriales. */
  setMinisDisabled(disabled: boolean) {
    const tutorials = { ...state.tutorials, disabled };
    const queue = disabled ? state.miniQueue.filter((id) => getMini(id)?.always) : state.miniQueue;
    set({ tutorials, miniQueue: queue, miniStep: queue[0] === state.miniQueue[0] ? state.miniStep : 0 });
    saveTutorials(tutorials);
  },

  markTutorial(which: 'lobby' | 'dungeon') {
    const p = state.profile;
    if (!p) return;
    set({ profile: { ...p, tutorialSeen: { ...p.tutorialSeen, [which]: true } } });
  },

  // ── Inventario ──
  transfer(from: Loc, to: Loc, lootId?: string) {
    const c = containersFor(state, lootId);
    if (!c) return;
    const moving = stackAt(c, from);
    const r = transfer(c, from, to, equipCtx());
    if (!r.ok) return invError(r.error);
    if (!applyContainers(r.containers, lootId)) return;
    sfx(to.kind === 'equip' || from.kind === 'equip' ? 'equip' : 'pickup');
    if (moving && from.kind === 'grid' && from.container === 'loot' && !(to.kind === 'grid' && to.container === 'loot')) recordFound([moving]);
  },

  quickEquip(from: Loc) {
    const c = containersFor(state);
    if (!c) return;
    const r = quickEquip(c, from, equipCtx());
    if (!r.ok) return invError(r.error);
    sfx('equip');
    applyContainers(r.containers);
  },

  /** Gira 90° el objeto de una casilla (sin moverlo). Si no cabe girado, no cambia nada. */
  rotate(loc: Loc, lootId?: string) {
    const c = containersFor(state, lootId);
    if (!c) return;
    const r = rotateAt(c, loc);
    if (!r.ok) return invError(r.error);
    if (!applyContainers(r.containers, lootId)) return;
    sfx('click');
  },

  unequip(slot: Loc) {
    const c = containersFor(state);
    if (!c) return;
    const r = quickMove(c, slot, 'backpack');
    if (!r.ok) return invError('No hay espacio en la mochila.');
    sfx('equip');
    applyContainers(r.containers);
  },

  quickMove(from: Loc, target: ContainerId, lootId?: string) {
    // «Al almacén» va a la página que se está viendo (o a «Compartido» si es la abierta); si no cabe, a cualquier otra propia
    if (target === 'stash' && !lootId && state.screen === 'lobby') {
      const pg = state.stashPage;
      const c0 = containersFor(state);
      const src0 = c0 && stackAt(c0, from);
      if (c0 && src0) {
        if (pg === 'shared' && state.profile?.shared) return actions.moveToPage(from, 'shared');
        if (typeof pg === 'number') {
          const r0 = addToPage(c0.stash, pg, src0);
          if (!r0.leftover) return actions.moveToPage(from, pg);
        }
      }
    }
    const c = containersFor(state, lootId);
    if (!c) return;
    const moving = stackAt(c, from);
    // Monedas a la mochila: primero a los saquitos y sacos con hueco
    if (moving?.itemId === COIN_ID && target === 'backpack' && from.kind === 'grid') {
      const pc = putCoinsPartial(c.backpack, moving.qty);
      if (pc.left === moving.qty) return invError('Tu mochila está llena: las monedas se quedan aquí.');
      const n = { ...c, backpack: pc.grid, [from.container]: [...c[from.container]] };
      n[from.container][from.index] = pc.left ? { ...moving, qty: pc.left } : null;
      sfx('coin');
      applyContainers(n, lootId);
      if (pc.left) invError(`Tu mochila está llena: ${pc.left} monedas se quedan aquí.`);
      return;
    }
    const r = quickMove(c, from, target);
    if (!r.ok) return invError(r.error);
    if (!applyContainers(r.containers, lootId)) return;
    sfx('pickup');
    if (moving && from.kind === 'grid' && from.container === 'loot' && target !== 'loot') recordFound([moving]);
  },

  /** «Coger el oro»: solo las monedas del saco o cofre (primero a tus saquitos y sacos). */
  takeGold(lootId: string) {
    const c = containersFor(state, lootId);
    if (!c) return;
    const n = c.loot.filter((x) => x?.itemId === COIN_ID).reduce((a, x) => a + x!.qty, 0);
    if (!n) return;
    const pc = putCoinsPartial(c.backpack, n);
    if (pc.left === n) return invError('Tu mochila está llena: las monedas se quedan aquí.');
    const loot = c.loot.map((x) => (x?.itemId === COIN_ID ? null : x));
    if (pc.left) { const i = loot.indexOf(null); if (i >= 0) loot[i] = coinsStack(pc.left); }
    sfx('coin');
    applyContainers({ ...c, backpack: pc.grid, loot }, lootId);
    if (pc.left) invError(`Tu mochila está llena: ${pc.left} monedas se quedan aquí.`);
  },

  takeAll(lootId: string) {
    const c = containersFor(state, lootId);
    if (!c) return;
    const stacks = c.loot.filter((s): s is ItemStack => !!s);
    // Las monedas, primero a los saquitos y sacos con hueco de la mochila; luego sueltas
    const coinsIn = stacks.filter((x) => x.itemId === COIN_ID).reduce((n, x) => n + x.qty, 0);
    const pc = putCoinsPartial(c.backpack, coinsIn);
    const r = addManyToGrid(pc.grid, stacks.filter((x) => x.itemId !== COIN_ID), LAYOUTS.backpack);
    if (pc.left) r.leftovers.push(coinsStack(pc.left));
    // Peso (Fase 6): si todo junto pasa del 150 %, se coge uno a uno hasta donde se pueda; el resto se queda en el saco
    const before = loadNow(), all = loadNow({ ...c, backpack: r.grid });
    let heavy = false;
    if (before && all && carryBlock(before.weight, all.weight, all.capacity)) {
      heavy = true;
      let g = c.backpack;
      r.leftovers = [];
      for (const st of stacks) {
        const t = st.itemId === COIN_ID ? { grid: putCoinsPartial(g, st.qty).grid, leftover: null as ItemStack | null } : addToGrid(g, st, LAYOUTS.backpack);
        const w = loadNow({ ...c, backpack: t.grid });
        if (t.leftover || (w && carryBlock(before.weight, w.weight, w.capacity)) || (st.itemId === COIN_ID && putCoinsPartial(g, st.qty).left)) r.leftovers.push(st);
        else g = t.grid;
      }
      r.grid = g;
    }
    const remaining = emptyGrid(c.loot.length);
    r.leftovers.forEach((s, i) => (remaining[i] = s));
    if (!applyContainers({ ...c, backpack: r.grid, loot: remaining }, lootId)) return;
    if (stacks.length > r.leftovers.length) sfx('pickup');
    if (heavy && r.leftovers.length) invError('Demasiado peso: parte del botín se queda aquí.');
    else if (r.leftovers.length) invError('Tu mochila está llena. Parte del botín se queda aquí.');
    recordFound(stacks.filter((x) => !r.leftovers.some((l) => l.uid === x.uid)));
  },

  /** Ordena la mochila, o la página del almacén que se está viendo (solo esa). */
  sortContainer(which: 'backpack' | 'stash') {
    const c = containersFor(state);
    if (!c) return;
    sfx('click');
    if (which === 'backpack') return applyContainers({ ...c, backpack: sortGrid(c.backpack, LAYOUTS.backpack) });
    const pg = state.stashPage;
    if (pg === 'shared') applyContainers({ ...c, shared: sortGrid(c.shared, LAYOUTS.shared) });
    else applyContainers({ ...c, stash: sortPage(c.stash, pg) });
  },

  // ── Oro físico ──
  /** Saca `n` monedas de un saquito o saco a su misma rejilla (de 10 en 10). */
  withdrawGold(loc: Loc, n: number) {
    const c = containersFor(state);
    if (!c || loc.kind !== 'grid') return;
    const r = withdrawCoins(c[loc.container], loc.index, n, LAYOUTS[loc.container]);
    if (!r.ok) return invError(r.error);
    sfx('coin');
    applyContainers({ ...c, [loc.container]: r.grid });
    if (r.moved < n) toast(`Solo había sitio para ${r.moved} monedas.`, 'info');
  },
  /** Separa `n` monedas de un montón a una casilla libre cercana. */
  splitGold(loc: Loc, n: number) {
    const c = containersFor(state);
    if (!c || loc.kind !== 'grid') return;
    const r = splitCoins(c[loc.container], loc.index, n);
    if (!r.ok) return invError(r.error);
    sfx('coin');
    applyContainers({ ...c, [loc.container]: r.grid });
  },
  /** Divide una pila (no de monedas) en dos mitades: la nueva va a la casilla libre más cercana. */
  splitStack(loc: Loc) {
    const c = containersFor(state);
    if (!c || loc.kind !== 'grid') return;
    const r = splitStack(c[loc.container], loc.index);
    if (!r.ok) return invError(r.error);
    sfx('click');
    applyContainers({ ...c, [loc.container]: r.grid });
  },
  /** «Agrupar oro»: monedas sueltas a los sacos con hueco y el resto en montones de 10. En el almacén, la página vista. */
  groupGold(which: 'backpack' | 'stash') {
    const c = containersFor(state);
    if (!c) return;
    if (which === 'backpack') {
      const r = groupGold(c.backpack);
      sfx('coin'); applyContainers({ ...c, backpack: r.grid });
      return;
    }
    const pg = state.stashPage;
    if (pg === 'shared') { const r = groupGold(c.shared); sfx('coin'); return applyContainers({ ...c, shared: r.grid }); }
    const page = pageSliceOf(c.stash, pg);
    const r = groupGold(page);
    const stash = [...c.stash];
    r.grid.forEach((x, i) => (stash[pg * STASH_PAGE_SIZE + i] = x));
    sfx('coin');
    applyContainers({ ...c, stash });
  },

  setActiveVendor(v: VendorId | null) { set({ activeVendor: v, buyback: [] }); },

  /** Se pone otra mochila (solo en el refugio). La que llevabas ocupa su sitio. */
  equipBag(loc: Loc) {
    const p = state.profile;
    if (!p || state.screen !== 'lobby' || loc.kind !== 'grid' || !['backpack', 'stash', 'shared'].includes(loc.container)) return;
    const r = equipBag(p, loc.container as 'backpack' | 'stash' | 'shared', loc.index);
    if (!r.ok) return invError(r.error);
    sfx('equip');
    set({ profile: r.profile });
    toast(`Te pones la ${getItem(r.profile.bag.itemId).name.toLowerCase()}: ${r.profile.backpack.length} casillas.`, 'good');
  },

  /** Cambia la página del almacén que se ve. */
  setStashPage(page: StashPage) {
    const p = state.profile;
    if (!p) return;
    if (page === 'shared' ? !p.shared : page < 0 || page >= pageCount(p.stash)) return;
    set({ stashPage: page });
  },

  /**
   * Lleva un objeto a una página del almacén (arrastrándolo a su pestaña, o tocándolo y luego la pestaña).
   * Se apila primero; si no cabe entero, lo que sobra se queda donde estaba.
   */
  moveToPage(from: Loc, page: StashPage) {
    const c = containersFor(state);
    if (!c) return;
    const src = stackAt(c, from);
    if (!src) return;
    if (page === 'shared') {
      if (!state.profile?.shared) return invError('Aún no tienes la página «Compartido».');
      const r = quickMove(c, from, 'shared');
      if (!r.ok) return invError('No hay espacio en la página «Compartido».');
      sfx('pickup');
      return applyContainers(r.containers);
    }
    // Si ya está en esa página, no hay nada que hacer
    const from1 = from.kind === 'grid' ? { ...from, index: anchorIndex(c[from.container], from.index) } : from;
    if (from1.kind === 'grid' && from1.container === 'stash' && Math.floor(from1.index / STASH_PAGE_SIZE) === page) return;
    // Se saca de donde está y se mete en la página; lo que no quepa vuelve a su sitio
    const n = clearAt(c, from1);
    const r = addToPage(n.stash, page, src);
    if (r.leftover && r.leftover.qty === src.qty) return invError(isMulti(src) ? `No hay hueco de 2×2 en la página ${page + 1}.` : `No hay espacio en la página ${page + 1}.`);
    n.stash = r.stash;
    if (r.leftover) {
      if (from1.kind === 'equip') n.equipment[from1.slot] = r.leftover;
      else n[from1.container][from1.index] = r.leftover;
    }
    sfx('pickup');
    applyContainers(n);
  },

  useItem(loc: Loc) {
    const s = state;
    const c = containersFor(s);
    if (!c || !s.profile) return;
    const st = stackAt(c, loc);
    if (!st) return;
    const def = getItem(st.itemId);
    if (!def.use) return invError('Este objeto no se puede usar.');
    if (def.use.kind === 'need') return actions.eat(loc);
    if (def.use.kind === 'bomb') return invError('Las bombas se lanzan en combate, desde la mochila.');
    if (!s.expedition && def.use.kind === 'heal' && loc.kind === 'grid' && loc.container === 'backpack') return actions.baseHeal(st.itemId);
    if (!s.expedition && def.use.kind === 'treat') return invError('En el Bastión, las heridas se tratan en Intendencia → Estado.');
    if (s.screen !== 'dungeon' || !s.expedition) return invError(def.use.kind === 'repair' ? 'El kit se usa en la mazmorra; en la base, Maese Brand repara mejor.' : 'Las pociones solo se usan durante una expedición.');
    const stats = computeStats(s.profile.character.classId, s.profile.character.level, s.expedition.equipment);
    const exp = { ...s.expedition };
    if (def.use.kind === 'heal') {
      // Anatomía: la poción reparte la vida entre las regiones que funcionan (no cierra heridas ni suelda huesos)
      const h = healBody(expBody(exp, s.profile), potionAmount(def.use.amount, stats.maxHp));
      if (h.healed <= 0) return invError('Ya tienes la vida al máximo (lo inutilizado solo se recupera con cirugía).');
      Object.assign(exp, withBody(exp, h.body));
    } else if (def.use.kind === 'mana') {
      const cls = CLASSES[s.profile.character.classId];
      if (def.resource && def.resource !== cls.resource) return invError(`Esto no te sirve: tú usas ${cls.resourceName.toLowerCase()}.`);
      if (exp.mp >= stats.maxMp) return invError(`Ya tienes el ${cls.resourceName.toLowerCase()} al máximo.`);
      exp.mp = Math.min(stats.maxMp, exp.mp + resourcePotionAmount(def.use.amount, stats.maxMp));
    } else if (def.use.kind === 'repair') {
      const r = fieldRepair(exp.equipment, exp.backpack);
      if (!r.repaired) return invError('No llevas nada dañado.');
      exp.equipment = r.equipment;
      exp.backpack = r.backpack;
    } else if (def.use.kind === 'treat') {
      // Vendas, férulas…: se eligen la herida y la región en el panel de heridas
      return actions.openModal({ type: 'body' });
    } else if (def.use.kind === 'cleanse') {
      // Veneno, quemadura y sangrado solo existen dentro del combate: fuera no gastes el antídoto
      return invError('El antídoto solo sirve en combate, contra veneno, quemadura o sangrado.');
    }
    const grid = removeItem(exp.backpack, st.itemId, 1);
    if (!grid) return;
    exp.backpack = grid;
    sfx(def.use.kind === 'repair' ? 'equip' : 'heal');
    set({ expedition: exp });
    toast(def.use.kind === 'repair' ? 'Remiendas tu equipo con el kit.' : `Usas ${def.name}.`, 'good', def.icon);
  },

  /** Comer o beber (Fase 5): en la mazmorra, en el Bastión antes de salir y en combate (gasta el turno). */
  eat(loc: Loc) {
    const s = state;
    const c = containersFor(s);
    if (!c || !s.profile) return;
    const st = stackAt(c, loc);
    if (!st) return;
    const def = getItem(st.itemId);
    if (def.use?.kind !== 'need') return;
    // En combate, comer o beber gasta el turno (bloque 1, fase 8)
    if (s.combat) return loc.kind === 'grid' && loc.container === 'backpack' ? actions.combatAct({ type: 'item', itemId: st.itemId }) : invError('En combate solo puedes usar lo que llevas en la mochila.');
    const inDungeon = s.screen === 'dungeon' && !!s.expedition;
    if (def.use.dish) {
      // Platos del Refugio: en el Bastión; preparan la siguiente incursión aunque la barra esté llena
      if (inDungeon || s.expedition) return invError('Este plato se come en el Bastión, antes de bajar.');
      if (loc.kind !== 'grid') return;
      const grid = [...c[loc.container]];
      grid[loc.index] = st.qty > 1 ? { ...st, qty: st.qty - 1 } : null;
      applyContainers({ ...c, [loc.container]: grid });
      const fed = feed(needsOf(s.profile.needs), { sat: def.use.sat, hyd: def.use.hyd, rest: def.use.rest }) ?? needsOf(s.profile.needs);
      set((s2) => ({ profile: s2.profile ? { ...s2.profile, needs: toSaved(fed), prep: { ...(s2.profile.prep ?? {}), dish: st.itemId, dishCut: STATION_FX.dishPrep[refugeOf(s2.profile).kitchen] } } : s2.profile }));
      sfx('heal');
      toast(`Comes: ${def.name.toLowerCase()}. Bajarás preparado.`, 'good', def.icon);
      return;
    }
    const cur = needsOf(inDungeon ? s.expedition!.needs : s.profile.needs);
    const next = feed(cur, { sat: def.use.sat, hyd: def.use.hyd, rest: def.use.rest });
    if (!next) return invError(def.use.hyd ? 'No tienes sed.' : 'No tienes hambre.');
    if (loc.kind !== 'grid') return;
    const grid = [...c[loc.container]];
    grid[loc.index] = st.qty > 1 ? { ...st, qty: st.qty - 1 } : null;
    applyContainers({ ...c, [loc.container]: grid });
    if (inDungeon) set((s2) => ({ expedition: s2.expedition ? { ...s2.expedition, needs: next } : s2.expedition }));
    else { set((s2) => ({ profile: s2.profile ? { ...s2.profile, needs: toSaved(next) } : s2.profile })); }
    sfx('heal');
    toast(`${def.use.hyd ? 'Bebes' : 'Comes'}: ${def.name.toLowerCase()}.`, 'good', def.icon);
  },

  /** Comer o beber el primero de la mochila (panel de necesidades). */
  eatItem(itemId: string) {
    const c = containersFor(state);
    const idx = c ? c.backpack.findIndex((x) => x?.itemId === itemId) : -1;
    if (idx < 0) return invError(`No llevas ${getItem(itemId).name.toLowerCase()}.`);
    actions.eat({ kind: 'grid', container: 'backpack', index: idx });
  },

  /** Catre del Bastión: Descanso a 100, gratis y al momento. */
  sleepCot() {
    const p = state.profile;
    if (!p || state.expedition) return;
    const n = needsOf(p.needs);
    const prep = canSleepForPrep(p);
    if (n.rest >= 100 && !prep) return invError('Ya estás descansado.');
    const cut = cotPrepCut(p);
    set({ profile: { ...p, needs: toSaved(sleep(n)), ...(prep ? { prep: { ...(p.prep ?? {}), cot: cut } } : {}) } });
    sfx('heal');
    toast(prep ? `Duermes en el catre del Refugio. Bajarás descansado: −${Math.round(cut * 100)} % de Descanso en la próxima incursión.` : 'Duermes en el catre del Bastión. Descanso recuperado.', 'good');
  },

  drinkPotion() {
    const s = state;
    if (!s.expedition) return;
    const idx = s.expedition.backpack.findIndex((x) => x?.itemId === 'health_potion');
    if (idx < 0) return invError('No te quedan pociones de vida.');
    actions.useItem({ kind: 'grid', container: 'backpack', index: idx });
  },

  /** Suelta un objeto en el suelo de la mazmorra (crea o amplía una bolsa). */
  dropItem(loc: Loc) {
    const s = state;
    const c = containersFor(s);
    if (!c || !s.expedition) return;
    if (s.tutorial) return invError(TUTORIAL_BLOCK.item);
    const st = stackAt(c, loc);
    if (!st) return;
    const [x, y] = s.hud.playerTile;
    const existing = Object.values(s.bags).find((b) => b.x === x && b.y === y);
    const bag: Bag = existing ?? { id: makeUid('bag'), x, y, grid: emptyGrid(12), label: 'Bolsa en el suelo' };
    const r = addToGrid(bag.grid, st);
    if (r.leftover) return invError('No cabe nada más en esa bolsa.');
    applyContainers(clearAt(c, loc));
    set((st2) => ({ bags: { ...st2.bags, [bag.id]: { ...bag, grid: r.grid } } }));
    bus.emit('bags-changed');
    sfx('pickup');
  },

  // ── Mercader ──
  buy(itemId: string, vendorId: VendorId = 'nira') {
    const p = state.profile;
    if (!p) return;
    const r = buy(p, itemId, vendorId);
    if (!r.ok) return invError(r.error);
    sfx('coin');
    // Un plano comprado en el Bastión se aprende al momento
    const bp = getItem(itemId).category === 'blueprint' ? learnBlueprints(r.profile) : null;
    set({ profile: bp ? bp.profile : r.profile });
    toast(bp?.learned.includes(itemId) ? `Plano aprendido: ${getItem(itemId).name.replace(/^Plano: /, '')}. Ya puedes fabricarlo.` : `Compras ${getItem(itemId).name}.`, 'good', getItem(itemId).icon);
  },

  /** Refugio (Fase 9): mejorar un módulo. */
  upgradeModule(id: ModuleId) {
    const p = state.profile;
    if (!p || state.expedition) return;
    const r = upgradeModule(p, id);
    if (!r.ok) return invError(r.error);
    sfx('equip');
    const lvl = refugeOf(r.profile)[id];
    // Al construir una estación de crafteo, su encargado regala los materiales de la primera receta (data/tutorials.ts)
    const first = lvl === 1 ? STATION_FIRST_RECIPE[id as CraftStation] : undefined;
    const gift = first ? giveItems(r.profile, getRecipe(first).ingredients) : r.profile;
    set({ profile: gift });
    toast(`${r.note ?? 'Hecho.'}${first ? ' Te deja el material justo para estrenarla.' : ''}`, 'good');
    // Subida a nivel 2 o 3: aviso de lo que da (sale aunque se desactiven los mini tutoriales)
    if (lvl >= 2) actions.tutorialEvent(`station-up:${id}:${lvl}`);
  },

  /** Desguace en el taller de Orik: uno o varios objetos a la vez. */
  scrap(refs: SalvageRef[]) {
    const p = state.profile;
    if (!p || state.expedition) return;
    if (!vendorUnlocked(p, 'orik')) return invError('Orik aún no ha llegado al Bastión.');
    const r = salvage(p, refs, randomSeed());
    if (!r.ok) return invError(r.error);
    sfx('equip');
    set({ profile: r.profile });
    toast(`Orik desguaza ${refs.length > 1 ? `${refs.length} objetos` : 'el objeto'}: ${r.note}.`, 'good');
  },

  /** Crafteo común (todas las estaciones): fabrica n y lo coloca en la mochila o el almacén. */
  craft(recipeId: string, n: number, fine: boolean, dest: 'backpack' | 'stash') {
    const p = state.profile;
    if (!p || state.expedition) return;
    const r = craftItems(p, recipeId, n, fine, randomSeed());
    if (!r.ok) return invError(r.error);
    const placed = storeCrafted(r.crafted.profile, r.crafted.made, dest);
    set({ profile: placed.profile });
    sfx('equip');
    const def = getItem(getRecipe(recipeId).result);
    toast(`${def.name} ×${r.crafted.made.reduce((a, m) => a + m.qty, 0)}${r.crafted.fineCount ? ` · ${r.crafted.fineCount} con acabado fino` : ''}.${placed.toReception ? RECEPTION_NOTE : ''}`, 'good', def.icon);
  },

  /** Atril rúnico: grabar una runa en un hueco de un objeto. */
  applyRune(loc: RuneLoc, slotIdx: number, runeId: string) {
    const p = state.profile;
    if (!p || state.expedition) return;
    const r = applyRune(p, loc, slotIdx, runeId);
    if (!r.ok) return invError(r.error);
    set({ profile: r.profile });
    sfx('equip');
    toast(r.note ?? 'Runa grabada.', 'good');
  },

  /** Recepción de excedentes: retirar, vender, desguazar o descartar. */
  reception(kind: 'withdraw' | 'sell' | 'scrap' | 'discard', index: number) {
    const p = state.profile;
    if (!p || state.expedition) return;
    if (kind === 'scrap' && !vendorUnlocked(p, 'orik')) return invError('Orik aún no ha llegado al Bastión.');
    const r = kind === 'scrap' ? receptionSalvage(p, index, randomSeed()) : { withdraw: receptionWithdraw, sell: receptionSell, discard: receptionDiscard }[kind](p, index);
    if (!r.ok) return invError(r.error);
    sfx(kind === 'sell' ? 'coin' : kind === 'discard' ? 'click' : 'equip');
    set({ profile: r.profile });
    toast({ withdraw: `Recoges el objeto: ${r.note}.`, sell: `Nira te paga ${r.note}.`, scrap: `Orik desguaza: ${r.note}`, discard: 'Lo dejas para la pila de desechos.' }[kind], 'good');
  },

  /** Maese Brand repara un objeto o, sin `ref`, todo lo dañado (cobra del almacén). */
  repair(ref?: RepairRef) {
    const p = state.profile;
    if (!p) return;
    const r = repair(p, ref);
    if (!r.ok) return invError(r.error);
    sfx('equip');
    set({ profile: r.profile });
    toast(r.count === 1 ? `Maese Brand lo deja como nuevo por ${r.cost} de oro.` : `Maese Brand repara ${r.count} objetos por ${r.cost} de oro.`, 'good');
  },

  /** Compra la siguiente página propia del almacén (la confirmación la pide el Alijo). */
  buyStashPage() {
    const p = state.profile;
    if (!p) return;
    const r = buyStashPage(p);
    if (!r.ok) return invError(r.error);
    sfx('coin');
    const page = pageCount(r.profile.stash) - 1;
    set({ profile: r.profile, stashPage: page });
    toast(`Página ${page + 1} del almacén comprada.`, 'good');
    actions.tutorialEvent('unlock:stash-page');
  },

  /** Compra la página «Compartido» (una vez, para todos los personajes). */
  buySharedPage() {
    const p = state.profile;
    if (!p) return;
    const r = buySharedPage(p);
    if (!r.ok) return invError(r.error);
    sfx('coin');
    set({ profile: r.profile, stashPage: 'shared' });
    void saveNow();
    toast('Página «Compartido» comprada: todos tus personajes pueden usarla.', 'good');
    actions.tutorialEvent('unlock:shared-page');
  },

  // ── Atuendos (Tienda) ──
  /** Compra un atuendo con oro (la confirmación la pide la Tienda antes de llamar aquí). */
  buySkin(id: string): boolean {
    const p = state.profile;
    if (!p) return false;
    const r = buySkin(p, id);
    if (!r.ok) { toast(r.error, 'danger'); return false; }
    sfx('coin');
    set({ profile: r.profile });
    toast(`Atuendo comprado: ${getSkin(id).name}. Es tuyo para siempre.`, 'loot');
    actions.tutorialEvent('bastion:skin');
    return true;
  },
  /** Ponerse un atuendo o quitárselo (null). Solo cambia el aspecto. */
  equipSkin(id: string | null) {
    const p = state.profile;
    if (!p) return;
    set({ profile: equipSkin(p, id) });
    sfx('equip');
  },

  // ── Habilidades de clase ──
  /** Elegir qué habilidad de clase desbloquear (si hay un desbloqueo pendiente). */
  unlockClassSkill(id: string) {
    const p = state.profile;
    if (!p) return false;
    const next = unlockClassSkill(p, id);
    if (!next) return false;
    set({ profile: next });
    sfx('magic');
    toast(`Nueva habilidad de clase: ${getSkill(id).name}`, 'good');
    actions.tutorialEvent('unlock:class-skill');
    return true;
  },
  /** Llevar equipada otra habilidad de clase (fuera de combate). */
  equipClassSkill(id: string) {
    const p = state.profile;
    if (!p || state.combat) return;
    const next = equipClassSkill(p, id);
    if (!next) return;
    set({ profile: next });
    sfx('equip');
  },

  // ── Mercenarios ──
  hireMerc(mercId: string, expeditions: number, stance: MercStance) {
    const p = state.profile;
    if (!p) return;
    const r = hire(p, mercId, expeditions, stance);
    if (!r.ok) return invError(r.error);
    sfx('coin');
    set({ profile: r.profile });
    toast(`${getMerc(mercId).name} se une a ti durante ${expeditions} ${expeditions > 1 ? 'expediciones' : 'expedición'}.`, 'good');
  },

  dismissMerc() {
    const p = state.profile;
    if (!p?.contract) return;
    const name = getMerc(p.contract.mercId).name;
    set({ profile: dismiss(p) });
    toast(`Has rescindido el contrato con ${name}.`, 'info');
  },

  setMercStance(stance: MercStance) {
    const s = state;
    if (!s.profile) return;
    const merc = s.merc ? { ...s.merc, stance } : null;
    const profile = s.merc && !s.merc.rescued ? setStance(s.profile, stance) : !s.merc ? setStance(s.profile, stance) : s.profile;
    set({ profile, merc });
    if (merc) toast(`${getMerc(merc.id).name}: actitud ${STANCE_NAME[stance].toLowerCase()}.`, 'info');
  },

  interactMerc() {
    if (state.merc?.alive) set({ modal: { type: 'merc' } });
  },

  interactCaptive(mercId: string) {
    set({ modal: { type: 'captive', mercId } });
  },

  freeCaptive(mercId: string) {
    const s = state;
    if (!s.expedition) return;
    if (s.merc?.alive) return invError('Ya te acompaña un mercenario.');
    const m = getMerc(mercId);
    set({ merc: rescuedMerc(mercId), modal: null });
    sfx('equip');
    toast(`${m.name} se une a ti. Extrae con vida para que llegue al refugio.`, 'good');
    bus.emit('merc-changed');
  },

  sell(container: 'backpack' | 'stash', index: number, all = false) {
    const p = state.profile;
    if (!p) return;
    const item = p[container][index];
    const vendor = state.activeVendor ?? 'nira';
    let r = sell(p, container, index, all, vendor);
    // Sin sitio para el oro: se prueba a agrupar las monedas sueltas de cada página en sus sacos y se vuelve a intentar
    if (!r.ok && r.error === NO_ROOM_FOR_GOLD) {
      const grouped = joinPages(splitPages(p.stash).map((pg) => groupGold(pg).grid));
      const r2 = sell({ ...p, stash: grouped }, container, index, all, vendor);
      if (r2.ok) { r = r2; toast('Se han agrupado tus monedas sueltas para hacer sitio.', 'info'); }
    }
    if (!r.ok) return invError(r.error);
    sfx('coin');
    set({ profile: r.profile });
    if (item) toast(`Vendes ${getItem(item.itemId).name} por ${r.profile.gold - p.gold} de oro.`, 'good', getItem(item.itemId).icon);
    actions.tutorialEvent('bastion:sale');
  },

  /** Vender de una vez todo lo marcado (casillas de la mochila y del almacén). Devuelve cuánto se ha ganado. */
  sellMany(locs: { container: 'backpack' | 'stash'; index: number }[]): number {
    const p0 = state.profile;
    if (!p0 || !locs.length) return 0;
    const vendor = state.activeVendor ?? 'nira';
    let p = p0; let sold = 0; const bought: { stack: ItemStack; price: number }[] = []; let fail: string | null = null;
    for (const l of locs) {
      const item = p[l.container][l.index];
      if (!item) continue;
      let r = sell(p, l.container, l.index, true, vendor);
      if (!r.ok && r.error === NO_ROOM_FOR_GOLD) {
        const grouped = joinPages(splitPages(p.stash).map((pg) => groupGold(pg).grid));
        r = sell({ ...p, stash: grouped }, l.container, l.index, true, vendor);
      }
      if (!r.ok) { fail = r.error; continue; }
      bought.push({ stack: item, price: r.profile.gold - p.gold });
      p = r.profile; sold++;
    }
    const gain = p.gold - p0.gold;
    if (sold) {
      sfx('coin');
      set({ profile: p, buyback: [...bought.reverse(), ...state.buyback].slice(0, 5) });
      toast(`Vendes ${sold === 1 ? '1 objeto' : `${sold} objetos`} por ${gain} de oro.`, 'good', 'coin');
      actions.tutorialEvent('bastion:sale');
    }
    if (fail) invError(sold ? `No se pudo vender todo: ${fail}` : fail);
    return gain;
  },

  /** Recomprar algo recién vendido al mismo precio (va a la mochila). */
  buyBack(i: number) {
    const p = state.profile;
    const b = state.buyback[i];
    if (!p || !b) return;
    const paid = spendGold(p, b.price);
    if (!paid.ok) return invError(`Te faltan monedas: cuesta ${b.price} de oro.`);
    const r = addToGrid(paid.profile.backpack, b.stack, LAYOUTS.backpack);
    if (r.leftover) return invError('No hay sitio en la mochila para recomprarlo.');
    sfx('pickup');
    set({ profile: { ...paid.profile, backpack: r.grid }, buyback: state.buyback.filter((_, k) => k !== i) });
    toast(`Recompras ${getItem(b.stack.itemId).name}.`, 'info', getItem(b.stack.itemId).icon);
  },

  /** Vaciar la mochila en el almacén (página abierta y luego las demás propias). Con `onlyMaterials`, solo minerales y materiales.
   *  No toca el equipo puesto ni el bolsillo seguro. Devuelve cuántos objetos no cupieron. */
  emptyBackpack(onlyMaterials = false): number {
    const p = state.profile;
    if (!p) return 0;
    let moved = 0;
    p.backpack.forEach((st, i) => {
      if (!st || isCover(st)) return;
      if (onlyMaterials && getItem(st.itemId).category !== 'material') return;
      const before = state.profile!.backpack[i];
      const hadErr = state.invError;
      actions.quickMove({ kind: 'grid', container: 'backpack', index: i }, 'stash');
      if (state.profile!.backpack[i] !== before) moved++;
      else if (!hadErr) set({ invError: null });
    });
    const left = state.profile!.backpack.filter((st, i) => st && !isCover(st) && (!onlyMaterials || getItem(st.itemId).category === 'material') && i >= 0).length;
    set({ invError: null });
    if (moved) toast(left ? `Guardas ${moved} ${moved === 1 ? 'objeto' : 'objetos'}. ${left} no caben: compra otra página del almacén.` : `Guardas ${moved} ${moved === 1 ? 'objeto' : 'objetos'} en el almacén.`, left ? 'info' : 'good');
    else if (left) invError('No cabe nada más en el almacén.');
    else toast(onlyMaterials ? 'No llevas materiales.' : 'La mochila ya está vacía.', 'info');
    return left;
  },

  /** El intendente da el equipo de recluta a mano: gratis, si falta arma o armadura, una vez por vuelta al Bastión. */
  claimRecruitKit() {
    const p = state.profile;
    if (!p) return;
    if (!recruitGaps(p)) return invError('Ya llevas arma y armadura.');
    if (p.recruitClaimed) return invError('El intendente ya te dio lo suyo. Vuelve de otra incursión.');
    set({ profile: { ...grantRecruitKit(p), recruitClaimed: true } });
    sfx('equip');
    toast('El intendente te presta un equipo de recluta.', 'info');
  },

  acceptQuest(id: string) {
    const p = state.profile;
    if (!p) return;
    const r = acceptQuestCore(p, id);
    if (!r.ok) return invError(r.error);
    set({ profile: r.profile });
    sfx('click');
    toast(`Misión aceptada: ${questDef(id).name}`, 'info');
    void saveNow();
  },

  abandonQuest(id: string) {
    const p = state.profile;
    if (!p) return;
    set({ profile: abandonQuestCore(p, id) });
    sfx('click');
    toast(`Dejas la misión: ${questDef(id).name}. Vuelve al tablón.`, 'info');
    void saveNow();
  },

  togglePinQuest(id: string) {
    const p = state.profile;
    if (!p) return;
    set({ profile: togglePinCore(p, id) });
    sfx('click');
    void saveNow();
  },

  claimQuest(id: string) {
    const p = state.profile;
    if (!p) return;
    const q = p.quests.find((x) => x.id === id);
    if (!q || q.claimed || !q.accepted || !isComplete(q, p)) return;
    const def = questDef(id);
    const xp = applyXp(p.character.level, p.character.xp, def.reward.xp);
    // Las entregas se gastan: primero de la mochila, luego del almacén
    let { backpack, stash } = p;
    if (def.type === 'deliver') {
      let left = def.count;
      const fromB = Math.min(left, countItem(backpack, def.target!));
      if (fromB) { backpack = removeItem(backpack, def.target!, fromB) ?? backpack; left -= fromB; }
      if (left) stash = removeItem(stash, def.target!, left) ?? stash;
    }
    const before = p.reputation[def.vendor] ?? 0;
    const after = before + def.reward.rep;
    set({
      profile: {
        ...earnGoldSafe({ ...p, backpack, stash }, def.reward.gold),
        character: { ...p.character, level: xp.level, xp: xp.xp },
        reputation: { ...p.reputation, [def.vendor]: after },
        // Las repetibles vuelven al tablón desde cero; las demás quedan cobradas
        quests: afterClaim(p, id).quests,
      },
    });
    sfx('victory');
    toast(`Misión completada: +${def.reward.gold} oro, +${def.reward.xp} XP, +${def.reward.rep} de reputación${xp.levelsGained ? ' · ¡Subes de nivel!' : ''}`, 'good');
    if (rankOf(after) > rankOf(before)) {
      toast(`${VENDORS[def.vendor].name} te considera ahora «${REP_RANKS[rankOf(after)].name}»: ${Math.round(REP_RANKS[rankOf(after)].discount * 100)}% de descuento y mercancía nueva.`, 'good');
      actions.tutorialEvent('bastion:rank-up');
    }
  },
  backToLobby() {
    set({ screen: 'lobby', summary: null });
  },
  ...expeditionActions,
  ...combatActions,
  ...medicalActions,
};

export function exposeDebug(extra: Record<string, unknown> = {}) {
  if (typeof window !== 'undefined' && /[?&]debug/.test(window.location.search)) {
    // En las pruebas, poner `profile.gold` a mano deja ese oro en monedas de verdad en el almacén (el oro es físico)
    const debugSet = (patch: Partial<GameState>) => {
      const pr = patch.profile;
      if (pr && pr.gold !== gridGold(pr.stash)) patch = { ...patch, profile: setGoldExactly(pr, pr.gold) };
      set(patch);
    };
    (window as unknown as Record<string, unknown>).__GRAVEVOW__ = { getState, getSave, actions, dev, setState: debugSet, ...extra };
  }
}
