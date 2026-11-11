// Acciones de la expedición: entrar, tutorial, reloj, trampas, vetas, cofres, botín y errantes.
import type { ItemStack, Profile } from '../../core/types';
import { RARITY_ORDER, rollStacks } from '../../core/data/rarity';
import { createProfile, grantRecruitKit, needsRecruitKit } from '../../core/profile';
import { startExpedition, endExpedition, timeLeft, type EndReason } from '../../core/expedition';
import { addManyToGrid, addToGrid, countItem, emptyGrid, removeItem, cloneGrid, removeAt, isCover, LAYOUTS } from '../../core/inventory';
import { coins as coinsStack, gridGold, isCoins } from '../../core/gold';
import { earnGoldSafe, stackGoldValue } from '../../core/wallet';
import { computeStats } from '../../core/stats';
import { chestType } from '../../core/data/chests';
import { defaultSubzone, subzoneLock, ZONES, type SubzoneId, type ZoneId } from '../../core/data/zones';
import { getSubzone, isSubzoneId, subzonesOf } from '../../core/data/subzones';
import { getItem } from '../../core/data/items';
import { rollLoot, adaptDrops, CHEST_TABLES, subzoneChestTable } from '../../core/loot';
import { makeRng, makeUid, randomSeed } from '../../core/rng';
import { noRival, initialRival, talk, greetLine, proposeAlliance, rejectRival, leaveAlliance, shareLoot, evaluateBetrayal, playerBetrays, playerAttacksNeutral, rollEncounter, goldShare, sharePct, demandLine, refusedLine, refuseShare } from '../../core/social';
import { lootValue, planPayment } from '../../core/share';
import { getWanderer } from '../../core/data/wanderers';
import { TUTORIAL_MAP, TUTORIAL_REWARD, TUTORIAL_STEPS, tutorialRoomCenter, tutorialRoomOf } from '../../core/data/tutorial';
import { ROB_ITEMS, SHARE_SINGLE_MIN_RARITY } from '../../config/wanderers';
const rarityRank = (r: string) => RARITY_ORDER.indexOf(r as (typeof RARITY_ORDER)[number]);
import { bus } from './bus';
import { bestPick, mineYield, wearPick, type VeinId } from '../../core/mining';
import { captiveCandidate, mercForExpedition, settleMerc } from '../../core/mercenaries';
import { CAPTIVE_CHANCE } from '../../config/contracts';
import { CRYPTS_OF_UMBRAVEL } from '../../core/dungeon';
import { generateDungeon } from '../../core/dungeonGen';
import { sfx } from '../audio';
import { getPact, pactPrice } from '../../core/data/altars';
import { CLASSES } from '../../core/data/classes';
import { effectiveMaxMp, needsOf } from '../../core/needs';
import { dev, invError, markTutorialDoneOnDevice, saveNow, set, state, subzoneDepth, toast } from './internals';
import type { Bag, DungeonHud, Modal } from './internals';
import { actions } from './store';
import { advanceClock, newClock } from '../../core/clock';
import { bodyAtPct, resizeBody } from '../../core/anatomy';
import { withBody } from './medicalActions';
import { receptionBlock } from '../../core/refuge';

export const expeditionActions = {

  // ── Expedición ──
  /** Bajar a una subzona concreta, o a una zona (entonces, a la subzona más honda abierta para tu nivel). */
  async enterDungeon(target: ZoneId | SubzoneId = 'mazmorra') {
    const p = state.profile;
    if (!p) return;
    const sub = isSubzoneId(target) ? getSubzone(target) : defaultSubzone(target in ZONES ? (target as ZoneId) : 'mazmorra', p.character.level, p.bossesDefeated);
    const zoneId = sub.zone;
    const lock = p.stats.expeditions === 0 ? null : subzoneLock(sub, p.character.level, p.bossesDefeated);
    if (lock) return invError(lock);
    const full = receptionBlock(p);
    if (full) return invError(full);
    // La primera expedición usa la cripta diseñada a mano (sirve de tutorial); después, mapas procedurales de la zona elegida.
    const seed = randomSeed();
    const captive = makeRng(seed ^ 0x51ed).chance(CAPTIVE_CHANCE) ? captiveCandidate(p, zoneId) : null;
    // Primera expedición de una partida nueva: el tutorial guiado (salvo si se saltó)
    if (p.stats.expeditions === 0 && !p.tutorialDone && !dev.skipTutorial) return actions.startTutorial(null);
    // Mercenario errante: Kael (solo en la Mazmorra, 1 de cada 3 con garantía) u otro de la zona
    const first = p.stats.expeditions === 0;
    const enc = first ? { who: 'kael', risk: 'kael' as const, hostile: false, kaelStreak: p.kael.missStreak } : rollEncounter(makeRng(seed ^ 0x7a31), sub, p.kael.missStreak);
    if (dev.forceKael && sub.zone === 'mazmorra') Object.assign(enc, { who: 'kael', risk: 'kael', hostile: false, kaelStreak: 0 });
    if (dev.forceWanderer) Object.assign(enc, { who: dev.forceWanderer, hostile: !!dev.forceHostile });
    const dungeon = first ? CRYPTS_OF_UMBRAVEL : generateDungeon(seed, { zone: zoneId, subzone: sub.id, captive, wanderer: !!enc.who });
    const started = startExpedition(p, Date.now());
    const kael = { ...p.kael, missStreak: first || sub.zone !== 'mazmorra' ? p.kael.missStreak : enc.kaelStreak };
    const profile = first ? started.profile : { ...started.profile, lastSubzone: sub.id, kael };
    const expedition = { ...started.expedition, zone: dungeon.zone ?? 'mazmorra', subzone: dungeon.subzone, chestsOpened: {}, veinsMined: 0 };
    set({
      profile, expedition, dungeon, screen: 'dungeon', summary: null, combat: null, modal: null,
      rival: enc.who ? initialRival(enc.who, enc.who === 'kael' && !enc.hostile && (p.kael.grudge ?? 0) > 0 ? 'mid' : enc.risk, enc.hostile) : noRival(), rivalLine: null, merc: mercForExpedition(p), chests: {}, mined: {}, bags: {},
      hud: { room: '', prompt: null, channel: 0, playerTile: [0, 0] }, clock: newClock(),
    });
    await saveNow();
  },

  /** Empieza el tutorial. `replay`: el perfil a devolver al acabar (se repite desde Ajustes sin tocar tu inventario). */
  async startTutorial(replay: Profile | null) {
    const p0 = state.profile;
    if (!p0) return;
    // Al repetirlo, bajas con el equipo inicial de tu clase; tu inventario de verdad se guarda aparte
    const p = replay ? { ...createProfile(p0.character.name, p0.character.classId, p0.character.appearance), character: p0.character } : p0;
    const started = startExpedition(p, Date.now());
    const expedition = { ...started.expedition, durationMs: 24 * 3600_000, zone: 'mazmorra', subzone: 'afueras', chestsOpened: {}, veinsMined: 0 };
    const rival = { ...initialRival('osric', 'low'), traitor: true };
    set({
      profile: replay ? { ...p0 } : started.profile, expedition, dungeon: TUTORIAL_MAP, screen: 'dungeon', summary: null, combat: null, modal: null,
      rival, rivalLine: null, merc: null, chests: {}, mined: {}, bags: {}, tutorial: { step: 0, replay },
      hud: { room: '', prompt: null, channel: 0, playerTile: [0, 0] }, clock: newClock(),
    });
    if (!replay) await saveNow();
  },

  /** En el tutorial no se pierde: si caes, vuelves al último punto seguro; al extraer, recompensas y fin. */
  async finishTutorial(reason: EndReason) {
    const s = state;
    const t = s.tutorial;
    if (!t || !s.profile || !s.expedition) return;
    if (reason !== 'extracted') {
      const max = computeStats(s.profile.character.classId, s.profile.character.level, s.expedition.equipment);
      const [x, y] = tutorialRoomCenter(TUTORIAL_STEPS[t.step]?.checkpoint ?? 0);
      set({ combat: null, modal: null, expedition: { ...s.expedition, hp: max.maxHp, mp: max.maxMp } });
      bus.emit('tutorial-revive', { x, y });
      toast('Caes… y despiertas en el último punto seguro. En el tutorial no pierdes nada.', 'info');
      return;
    }
    if (t.replay) {
      // Repetido desde Ajustes: tu personaje vuelve exactamente como estaba
      const { summary } = endExpedition(s.profile, s.expedition, 'extracted', Date.now());
      set({ profile: t.replay, tutorial: null, expedition: null, screen: 'summary', combat: null, modal: null, merc: null,
        summary: { ...summary, tutorialNote: 'Tutorial repetido. Tu personaje y tu inventario no han cambiado.' } });
      return;
    }
    let { profile, summary } = endExpedition(s.profile, s.expedition, 'extracted', Date.now());
    // Recompensa: oro y objetos para empezar (config en data/tutorial.ts)
    let stash = profile.backpack;
    for (const it of TUTORIAL_REWARD.items) stash = addToGrid(stash, { uid: makeUid(), itemId: it.itemId, qty: it.qty }, LAYOUTS.stash).grid;
    profile = { ...earnGoldSafe({ ...profile, backpack: stash }, TUTORIAL_REWARD.gold), wounds: null, tutorialDone: true, tutorialSeen: { lobby: true, dungeon: true } };
    summary = { ...summary, tutorialNote: `Has sobrevivido a tu primera bajada. El intendente te da ${TUTORIAL_REWARD.gold} monedas de oro (están en tu almacén), 3 pociones y unos guantes de cuero.` };
    markTutorialDoneOnDevice();
    set({ profile, summary, tutorial: null, expedition: null, screen: 'summary', combat: null, modal: null, merc: null });
    await saveNow();
  },

  /** Repetir el tutorial desde Ajustes (sin recompensas y sin tocar tu inventario). */
  replayTutorial() {
    const p = state.profile;
    if (!p) return;
    void actions.startTutorial(JSON.parse(JSON.stringify(p)));
  },

  /** Comprueba si el paso del tutorial está cumplido y pasa al siguiente (se llama con el reloj de la mazmorra). */
  tutorialCheck() {
    const s = state;
    const t = s.tutorial;
    if (!t || !s.expedition || s.screen !== 'dungeon') return;
    const step = TUTORIAL_STEPS[t.step];
    if (!step) return;
    const e = s.expedition;
    const room = tutorialRoomOf(s.hud.playerTile[0]);
    const potions = countItem(e.backpack, 'health_potion');
    let done = false;
    switch (step.id) {
      case 'move': done = room >= 1; break;
      case 'fight': done = (e.kills.ossuary_rat ?? 0) >= 1 && !s.combat; break;
      case 'gold': done = gridGold(e.backpack) > 0 && !s.modal; break;
      case 'pocket': done = e.pocket.some((x) => x?.itemId === 'gold_pouch' && (x.gold ?? 0) > 0) && !s.modal; break;
      case 'box': done = !!s.chests.t_box && !s.modal && (countItem(e.backpack, 'iron_key') > 0 || !!s.chests.t_rich); break;
      case 'rich': done = !!s.chests.t_rich && !s.modal; break;
      case 'equip': done = e.equipment.helmet?.itemId === 'leather_hood' && !s.modal; break;
      case 'potion': {
        // Al llegar a la hoguera, la trampa (o el camino) te deja herido para practicar con la poción
        if (t.potionsAt === undefined) {
          // El paso empieza cuando los pinchos te hieren (fila de pared a pared: no se pueden esquivar)
          if (!t.trapHit) return;
          const max = computeStats(s.profile!.character.classId, s.profile!.character.level, e.equipment).maxHp;
          if (e.hp > max * 0.7) set({ expedition: withBody(e, bodyAtPct(resizeBody(e.body, max), 0.55)) });
          set({ tutorial: { ...t, potionsAt: countItem(state.expedition!.backpack, 'health_potion') } });
          return;
        }
        done = potions < t.potionsAt;
        break;
      }
      case 'talk': done = s.rival.greeted; break;
      case 'ally': done = s.rival.disposition === 'allied' && !s.modal; break;
      case 'together': done = (e.kills.bandit ?? 0) >= 2 && !s.combat; break;
      case 'betrayal': {
        // Guion: al llegar a la brecha, Osric avisa y traiciona
        if (!t.betrayalStarted && room >= 6 && s.rival.disposition === 'allied' && !s.combat && !s.modal) {
          set({ tutorial: { ...t, betrayalStarted: true }, rival: { ...s.rival, warned: true } });
          toast(getWanderer('osric').lines.warn, 'danger');
          bus.emit('rival-warn');
          setTimeout(() => {
            const st = state;
            if (!st.tutorial || st.combat) return;
            set({ rival: { ...st.rival, disposition: 'hostile', betrayed: true, betrayedBy: 'rival' } });
            sfx('betray');
            toast(`${getWanderer('osric').lines.betray} ¡Osric te traiciona!`, 'danger');
            bus.emit('rival-changed');
            actions.startCombat('betrayal-by-rival', null);
          }, 1600);
        }
        done = s.rival.disposition === 'dead' && !s.combat;
        break;
      }
      default: break;
    }
    if (done && t.step < TUTORIAL_STEPS.length - 1) { set({ tutorial: { ...state.tutorial!, step: t.step + 1, potionsAt: undefined } }); sfx('click'); }
  },

  tick() {
    const s = state;
    const now = Date.now();
    if (s.tutorial) actions.tutorialCheck();
    if (s.screen === 'dungeon' && s.expedition && !s.tutorial && timeLeft(s.expedition, now) <= 0 && !s.summary) {
      void actions.finishExpedition('timeout');
      return;
    }
    // Reloj de juego: en pausa con un menú abierto, el juego suspendido, el resumen o la pestaña oculta
    const hidden = typeof document !== 'undefined' && document.hidden;
    const paused = s.screen !== 'dungeon' || !s.expedition || !!s.modal || s.suspended || !!s.summary || hidden;
    const { clock } = advanceClock(s.clock, now, paused);
    set(clock === s.clock ? { now } : { now, clock });
    // Sangrado y cirugía: un pulso médico cada 6 s de exploración activa (en combate cuenta cada ronda)
    if (!s.tutorial) actions.medicalPulse(clock.pulses);
  },

  setHud(patch: Partial<DungeonHud>) {
    const h = state.hud;
    const changed = (Object.keys(patch) as (keyof DungeonHud)[]).some((k) => JSON.stringify(patch[k]) !== JSON.stringify(h[k]));
    if (changed) set({ hud: { ...h, ...patch } });
  },

  async finishExpedition(reason: EndReason) {
    const s = state;
    if (!s.profile || !s.expedition) return;
    if (s.tutorial) return actions.finishTutorial(reason);
    // Su parte del oro ya se la has pagado (o no) en el portal: ver requestExtract y payRival
    let { profile, summary } = endExpedition(s.profile, s.expedition, reason, Date.now());
    if (reason === 'extracted' && s.rival.disposition === 'allied' && s.rival.hp > 0) {
      const w = getWanderer(s.rival.who);
      const share = s.rival.paid ?? 0;
      summary = { ...summary, wandererNote: `${w.lines.farewell}${share ? ` Le pagaste su parte en el portal: ${share} de oro.` : ''}` };
      // Kael recuerda que cumpliste: se le pasa el enfado
      if (s.rival.who === 'kael' && (profile.kael.grudge ?? 0) > 0) profile = { ...profile, kael: { ...profile.kael, grudge: (profile.kael.grudge ?? 0) - 1 } };
    }
    // Kael no olvida que le negaste su parte o le atacaste
    if (s.rival.who === 'kael' && s.rival.betrayedBy === 'player') profile = { ...profile, kael: { ...profile.kael, grudge: (profile.kael.grudge ?? 0) + 1 } };
    profile = { ...profile, playMs: (profile.playMs ?? 0) + s.clock.ms };
    const mo = settleMerc(profile, s.merc, reason === 'extracted');
    profile = mo.profile;
    if (mo.note) summary = { ...summary, mercNote: mo.note };
    // Kit de recluta automático: si al morir no te queda ningún arma, el intendente te equipa
    if (reason !== 'extracted' && needsRecruitKit(profile)) {
      profile = grantRecruitKit(profile);
      summary = { ...summary, recruitKit: true };
    }
    set({ profile, summary, expedition: null, screen: 'summary', combat: null, modal: null, merc: null });
    sfx(reason === 'extracted' ? 'victory' : 'defeat');
    await saveNow();
  },

  trapHit(damage: number) {
    const s = state;
    if (!s.expedition) return;
    sfx('trap');
    toast(`¡Una trampa de pinchos! -${damage} de vida en las piernas.`, 'danger');
    const dead = actions.hurtByTrap(damage);
    if (s.tutorial && !s.tutorial.trapHit) set({ tutorial: { ...s.tutorial, trapHit: true } });
    if (dead) void actions.finishExpedition('died');
  },

  // ── Exploración (Fase 7) ──
  /** Gasta una llave para abrir una sala cerrada. La llave se quita solo si la puerta se abre (lo confirma quien llama con el resultado). */
  useDoorKey(key: string): boolean {
    const e = state.expedition;
    if (!e) return false;
    const fromBp = removeItem(e.backpack, key, 1);
    const fromPocket = fromBp ? null : removeItem(e.pocket, key, 1);
    if (!fromBp && !fromPocket) { toast(`Cerrada: necesitas una ${getItem(key).name.toLowerCase()}.`, 'danger'); sfx('error'); return false; }
    set({ expedition: { ...e, ...(fromBp ? { backpack: fromBp } : { pocket: fromPocket! }) } });
    toast(`Gastas tu ${getItem(key).name.toLowerCase()}: la puerta cede.`);
    return true;
  },
  /** Acepta el pacto de un altar. Uno como máximo; el altar queda gastado. */
  acceptPact(pactId: string): boolean {
    const e = state.expedition;
    const pact = getPact(pactId);
    if (!e || !pact) return false;
    if (e.pact) { toast(`Ya tienes un pacto: ${getPact(e.pact)?.name ?? 'otro'}. Solo cabe uno por incursión.`, 'danger'); sfx('error'); return false; }
    const stats = computeStats(state.profile!.character.classId, state.profile!.character.level, e.equipment);
    const max = effectiveMaxMp(stats.maxMp, needsOf(e.needs), pact.mpLoss);
    set({ expedition: { ...e, pact: pactId, mp: Math.min(e.mp, max) } });
    sfx('portal');
    toast(`${pact.name}: ${pact.boon}. Precio: ${pactPrice(pact, CLASSES[state.profile!.character.classId].resourceName)}.`);
    return true;
  },

  // ── Minería ──
  /** Termina de picar una veta: mineral a la mochila (o en una bolsa si no cabe) y el pico pierde un uso. */
  mineVein(veinId: string, vein: VeinId) {
    const s = state;
    if (!s.expedition || s.mined[veinId]) return;
    const pick = bestPick(s.expedition.backpack);
    if (!pick) return invError(s.expedition.backpack.some((x) => x && getItem(x.itemId).mineTime) ? 'Tu pico está roto. Un kit de reparación o Maese Brand lo arreglan.' : 'Necesitas un pico en la mochila. Maese Brand los vende.');
    const items = mineYield(vein, makeRng(randomSeed()));
    const worn = wearPick(s.expedition.backpack, pick.index);
    const r = addManyToGrid(worn.grid, items);
    const exp = { ...state.expedition!, backpack: r.grid, found: [...s.expedition.found, ...items], veinsMined: (s.expedition.veinsMined ?? 0) + 1 };
    set({ expedition: exp, mined: { ...s.mined, [veinId]: true } });
    if (r.leftovers.length) {
      const [x, y] = s.hud.playerTile;
      const bag: Bag = { id: makeUid('bag'), x, y, grid: addManyToGrid(emptyGrid(12), r.leftovers).grid, label: 'Mineral que no cabía' };
      set((st) => ({ bags: { ...st.bags, [bag.id]: bag } }));
      bus.emit('bags-changed');
    }
    sfx('chest');
    for (const it of items) toast(`+${it.qty} ${getItem(it.itemId).name}`, 'loot', getItem(it.itemId).icon);
    if (worn.broke) toast(`Tu ${getItem(pick.stack.itemId).name.toLowerCase()} se ha roto. Brand o un kit de reparación lo arreglan.`, 'danger');
  },

  // ── Cofres y bolsas ──
  openChest(chestId: string, table: string, unlocked = false) {
    const s = state;
    if (!s.expedition) return;
    // Cofres con cerradura: sin la llave no se abren (se muestra la ficha con lo que necesitas)
    if (!s.chests[chestId] && chestType(table).key && !unlocked) {
      set({ modal: { type: 'chestLock', chestId, table } });
      return;
    }
    let grid = s.chests[chestId];
    let gold = 0;
    if (!grid) {
      const rng = makeRng(randomSeed());
      const sub = s.dungeon?.subzone ? getSubzone(s.dungeon.subzone) : null;
      const base = CHEST_TABLES[table];
      const loot = rollLoot(sub ? subzoneChestTable(base, sub.levels, subzonesOf(sub.zone).indexOf(sub), sub.id) : base, rng);
      const ct = chestType(table);
      const found = rollStacks(adaptDrops(loot.items, s.profile!.character.classId), getItem, { depth: subzoneDepth(), bonus: ct.look === 'boss' ? 2 : ct.key ? 1 : 0 }, () => rng.next());
      gold = loot.gold;
      // El oro del cofre son monedas dentro del cofre: hay que cogerlas
      grid = addManyToGrid(emptyGrid(12), [...found, ...(gold > 0 ? [coinsStack(gold)] : [])]).grid;
      const opened = { ...(s.expedition.chestsOpened ?? {}), [table]: (s.expedition.chestsOpened?.[table] ?? 0) + 1 };
      set({ expedition: { ...state.expedition!, chestsOpened: opened } });
      sfx('chest');
      if (gold) set({ expedition: { ...state.expedition!, goldFound: state.expedition!.goldFound + gold } });
    }
    const stacks = grid.filter((x): x is ItemStack => !!x && !isCover(x));
    const count = stacks.length;
    const title = chestType(table).name;
    // Reparto: cofres con 2 objetos o más, o con uno solo si es raro o mejor
    const single = count === 1;
    const worthy = count >= 2 || (single && rarityRank(stacks[0].rarity ?? getItem(stacks[0].itemId).rarity) >= rarityRank(SHARE_SINGLE_MIN_RARITY));
    const fresh = !s.chests[chestId];
    set((st) => ({ chests: { ...st.chests, [chestId]: grid }, modal: { type: 'loot', session: { id: chestId, source: 'chest', title, initialCount: count, given: [], shareAsked: st.rival.disposition === 'allied' && fresh && worthy, totalValue: lootValue(grid), givenValue: 0, givenGold: 0, single } } }));
  },

  /** Gasta la llave (primero de la mochila, si no del bolsillo seguro) y abre el cofre. */
  unlockChest(chestId: string, table: string) {
    const s = state;
    const key = chestType(table).key;
    if (!s.expedition || !key) return;
    let { backpack, pocket } = s.expedition;
    if (countItem(backpack, key) > 0) backpack = removeItem(backpack, key, 1) ?? backpack;
    else if (countItem(pocket, key) > 0) pocket = removeItem(pocket, key, 1) ?? pocket;
    else return invError(`Necesitas: ${getItem(key).name}.`);
    set({ expedition: { ...s.expedition, backpack, pocket }, modal: null });
    toast(`Usas: ${getItem(key).name}`, 'info', 'key');
    actions.openChest(chestId, table, true);
  },

  openBag(bagId: string) {
    const b = state.bags[bagId];
    if (!b) return;
    // Saco de un combate en el que luchó el errante: también espera su parte (una sola vez)
    const ask = !!b.allyShare && state.rival.disposition === 'allied';
    if (b.allyShare) set({ bags: { ...state.bags, [bagId]: { ...b, allyShare: false } } });
    set({ modal: { type: 'loot', session: { id: bagId, source: 'bag', title: b.label, initialCount: b.grid.filter((x) => x && !isCover(x)).length, given: [], shareAsked: ask, totalValue: lootValue(b.grid), givenValue: 0, givenGold: 0 } } });
  },

  /** Da un objeto del cofre a Kael como parte del reparto. */
  giveToRival(lootId: string, index: number) {
    const s = state;
    const m = s.modal;
    if (m?.type !== 'loot') return;
    const bag = s.bags[lootId];
    const grid = cloneGrid(s.chests[lootId] ?? bag?.grid ?? []);
    const { stack: it } = removeAt(grid, index);
    if (!it) return;
    sfx('pickup');
    const coinsGiven = isCoins(it) ? it.qty : 0;
    const ids = coinsGiven ? [] : Array.from({ length: it.qty }, () => it.itemId);
    const session = { ...m.session, given: [...m.session.given, ...ids], givenValue: (m.session.givenValue ?? 0) + stackGoldValue(it), givenGold: (m.session.givenGold ?? 0) + coinsGiven + (it.gold ?? 0) };
    if (bag) set({ bags: { ...s.bags, [lootId]: { ...bag, grid } }, modal: { type: 'loot', session } });
    else set({ chests: { ...s.chests, [lootId]: grid }, modal: { type: 'loot', session } });
  },

  closeLoot() {
    const s = state;
    const m = s.modal;
    if (m?.type === 'loot') {
      // Recogida de oro implícita en bolsas: nada. Reparto con aliado:
      if (m.session.shareAsked) {
        const ss = m.session;
        const r = shareLoot(s.rival, { givenValue: ss.givenValue ?? 0, totalValue: ss.totalValue ?? 0, givenIds: ss.given, givenGold: ss.givenGold ?? 0, single: ss.single }, makeRng(randomSeed()));
        set({ rival: r.rival });
        if (r.line) toast(r.line, r.verdict === 'fair' ? 'social' : 'danger');
        bus.emit('rival-changed');
      }
      // Abrir un cofre con llave o de jefe es un momento de debilidad: un errante traidor puede aprovecharlo
      if (m.session.source === 'chest' && s.rival.disposition === 'allied') {
        const ent = s.dungeon?.entities.find((e) => e.kind === 'chest' && e.id === m.session.id) as { table?: string } | undefined;
        if (ent?.table && chestType(ent.table).key) setTimeout(() => actions.checkBetrayal(false, true), 300);
      }
      // Bolsas vacías desaparecen
      if (m.session.source === 'bag') {
        const b = state.bags[m.session.id];
        if (b && !b.grid.some(Boolean)) {
          const bags = { ...state.bags };
          delete bags[m.session.id];
          set({ bags });
          bus.emit('bags-changed');
        }
      }
    }
    set({ modal: null });
  },

  openModal(modal: Modal) {
    set({ modal });
  },

  setSuspended(v: boolean) {
    if (state.suspended !== v) set({ suspended: v });
  },

  closeModal() {
    if (state.modal?.type === 'loot') return actions.closeLoot();
    set({ modal: null });
  },

  // ── Rival ──
  interactRival() {
    const s = state;
    if (s.rival.greeted || !s.profile) { set({ modal: { type: 'rival' }, rivalLine: null }); return; }
    // Primer encuentro: su presentación (Kael recuerda cuántas veces os habéis visto)
    const met = s.rival.who === 'kael' ? s.profile.kael.met ?? 0 : 0;
    set({ modal: { type: 'rival' }, rivalLine: greetLine(s.rival, met), rival: { ...s.rival, greeted: true } });
    if (s.rival.who === 'kael') set({ profile: { ...s.profile, kael: { ...s.profile.kael, met: met + 1 } } });
  },

  rivalTalk() {
    const r = talk(state.rival);
    set({ rival: r.rival, rivalLine: r.line });
  },

  rivalPropose() {
    const r = proposeAlliance(state.rival, makeRng(randomSeed()), Date.now(), gridGold(state.expedition?.backpack ?? []) + gridGold(state.expedition?.pocket ?? []));
    if (dev.forceBetrayal) r.rival.traitor = true;
    set({ rival: r.rival, rivalLine: r.line });
    if (r.accepted) {
      sfx('heal');
      toast(`${getWanderer(state.rival.who).name.split(' ')[0]} se une a ti. Os repartiréis el botín.`, 'social');
      bus.emit('rival-changed');
    }
  },

  rivalIgnore() {
    const r = rejectRival(state.rival);
    set({ rival: r.rival, rivalLine: null, modal: null });
    toast(r.line, 'social');
    bus.emit('rival-changed');
  },

  rivalLeave() {
    const r = leaveAlliance(state.rival);
    set({ rival: r.rival, rivalLine: null, modal: null });
    toast(r.line, 'social');
    bus.emit('rival-changed');
  },

  rivalAttack() {
    set({ rival: playerAttacksNeutral(state.rival), modal: null, rivalLine: null });
    bus.emit('rival-changed');
    actions.startCombat('hostile', null);
  },

  askBetray() {
    set({ modal: { type: 'confirmBetray' } });
  },

  /**
   * Fin de la canalización del portal. Con un errante aliado, antes de cruzar te pide su parte del oro
   * ganado desde que os aliasteis (menos si has repartido bien, más si has sido avaricioso).
   */
  requestExtract() {
    const s = state;
    if (!s.expedition || s.combat) return;
    const r = s.rival;
    if (!s.tutorial && r.disposition === 'allied' && r.hp > 0 && r.paid === undefined) {
      const pct = sharePct(r);
      const goldNow = gridGold(s.expedition.backpack) + gridGold(s.expedition.pocket);
      const amount = goldShare(r, goldNow, pct);
      if (amount > 0) {
        sfx('click');
        set({ modal: { type: 'rivalDemand', amount, pct, line: demandLine(r, amount) } });
        return;
      }
    }
    void actions.finishExpedition('extracted');
  },

  /** Pagas su parte (monedas de la mochila, luego del bolsillo y, si no llega, objetos) y cruzáis el portal. */
  payRival() {
    const s = state;
    const m = s.modal;
    if (m?.type !== 'rivalDemand' || !s.expedition) return;
    const pay = planPayment(s.expedition.backpack, s.expedition.pocket, m.amount);
    const r = { ...s.rival, paid: pay.gold + pay.itemsValue, gold: s.rival.gold + pay.gold, bagItemIds: [...s.rival.bagItemIds, ...pay.items.flatMap((x) => Array.from({ length: x.qty }, () => x.itemId))] };
    set({ expedition: { ...s.expedition, backpack: pay.backpack, pocket: pay.pocket }, rival: r, modal: null });
    sfx('coin');
    void actions.finishExpedition('extracted');
  },

  /** Te niegas a pagarle: se vuelve contra ti, sin huida posible. */
  refuseRival() {
    const s = state;
    if (s.modal?.type !== 'rivalDemand') return;
    set({ rival: refuseShare(s.rival), modal: null, rivalLine: null });
    sfx('betray');
    toast(refusedLine(s.rival), 'danger');
    bus.emit('rival-changed');
    actions.startCombat('betrayal-by-rival', null);
  },

  confirmBetray() {
    set({ rival: playerBetrays(state.rival), modal: null, rivalLine: null });
    sfx('betray');
    bus.emit('rival-changed');
    actions.startCombat('betrayal-by-player', null);
  },

  /**
   * Comprueba si el errante aliado traiciona: la escena lo llama cada poco (cerca del portal), y también tras ganar un
   * combate y al abrir un cofre con llave o de jefe. Solo actúa un traidor, y siempre avisa antes.
   */
  checkBetrayal(nearPortal: boolean, richChest = false) {
    const s = state;
    if (!s.expedition || !s.profile || s.combat || s.modal || !s.dungeon || s.tutorial) return;
    const stats = computeStats(s.profile.character.classId, s.profile.character.level, s.expedition.equipment);
    const rng = makeRng(randomSeed());
    const r = evaluateBetrayal(s.rival, { now: Date.now(), playerHpPct: s.expedition.hp / stats.maxHp, nearPortal, richChest, zone: s.dungeon.zone ?? 'mazmorra' }, rng);
    if (r.action === 'none') return;
    set({ rival: r.rival });
    if (r.action === 'warn') { toast(r.line!, 'danger'); bus.emit('rival-warn'); }
    if (r.action === 'betray') {
      sfx('betray');
      toast(r.line!, 'danger');
      bus.emit('rival-changed');
      actions.startCombat('betrayal-by-rival', null);
    }
    if (r.action === 'rob') {
      // Roba 1 o 2 objetos de tu mochila y huye hacia el portal: si lo alcanzas, combate y lo recuperas
      const backpack = [...s.expedition.backpack];
      const filled = backpack.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
      const n = Math.min(filled.length, rng.int(ROB_ITEMS[0], ROB_ITEMS[1]));
      const stolen: string[] = [];
      for (let k = 0; k < n; k++) {
        const idx = filled.splice(rng.int(0, filled.length - 1), 1)[0];
        const it = backpack[idx]!;
        for (let q = 0; q < it.qty; q++) stolen.push(it.itemId);
        backpack[idx] = null;
      }
      set({ expedition: { ...state.expedition!, backpack }, rival: { ...r.rival, bagItemIds: [...r.rival.bagItemIds, ...stolen] } });
      sfx('betray');
      toast(`${r.line} ¡Alcánzalo antes de que llegue al portal!`, 'danger');
      bus.emit('rival-changed');
    }
  },

  /** Kael aparece: un aviso especial (el encuentro es raro, 1 de cada 3 bajadas a la Mazmorra). */
  announceKael() {
    sfx('portal');
    toast('Una linterna verde brilla en la penumbra. Es Kael el Errante.', 'social');
  },

  /** El errante que huía con lo robado ha llegado al portal: se lo lleva. */
  rivalEscaped() {
    const s = state;
    if (s.rival.disposition !== 'fleeing') return;
    toast(`${getWanderer(s.rival.who).name} cruza el portal con lo que te robó.`, 'danger');
    set({ rival: { ...s.rival, disposition: 'departed', bagItemIds: [] } });
    bus.emit('rival-changed');
  },
};
