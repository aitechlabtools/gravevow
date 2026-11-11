// Acciones del combate: empezar, actuar, turno de la IA, resultado y cierre.
import type { ItemStack } from '../../core/types';
import { rollStacks } from '../../core/data/rarity';
import { addManyToGrid, countItem, emptyGrid, removeItem, isCover } from '../../core/inventory';
import { coins as coinsStack } from '../../core/gold';
import { createCombat, performAction, runAITurn, currentActor, getCombatant, type CombatAction, type CombatState } from '../../core/combat';
import { knowledge, noteKill, noteSeen } from '../../core/bestiary';
import { ZONES } from '../../core/data/zones';
import { getSubzone } from '../../core/data/subzones';
import { overlevelPenalty } from '../../config/subzones';
import { enemyCombatant, playerCombatant, rivalCombatant, enemyXp, rivalHpBack } from '../../core/combatants';
import { getEnemy } from '../../core/data/enemies';
import { getItem } from '../../core/data/items';
import { rollLoot, adaptDrops } from '../../core/loot';
import { makeRng, makeUid, randomSeed } from '../../core/rng';
import { getWanderer } from '../../core/data/wanderers';
import { bus } from './bus';
import { mercBaseStats, mercCombatant, mercHpBack, STANCE_NAME } from '../../core/mercenaries';
import { getMerc } from '../../core/data/mercenaries';
import { sfx } from '../audio';
import { combatLevel, enemyLevel, invError, set, state, subzoneDepth, toast } from './internals';
import type { Bag, CombatKind } from './internals';
import { actions } from './store';

export const combatActions = {
  // ── Combate ──
  startCombat(kind: CombatKind, entityId: string | null, enemyId?: string) {
    const s = state;
    if (!s.profile || !s.expedition || s.combat) return;
    const ch = s.profile.character;
    const player = playerCombatant(ch, s.expedition.equipment, s.expedition.hp, s.expedition.mp, s.expedition.cooldowns, s.profile.classSkills.equipped);
    const list = [player];
    let title = '';
    let canFlee = true;
    if (kind === 'pve' && enemyId) {
      const e = getEnemy(enemyId);
      if (s.rival.disposition === 'allied') list.push(rivalCombatant(s.rival.who, s.rival.hp, 'A', s.rival.potions, combatLevel()));
      if (s.merc?.alive) list.push(mercCombatant(s.merc, 'A', combatLevel()));
      list.push(enemyCombatant(enemyId, entityId ?? 'enemy', 'B', enemyLevel(entityId)));
      const firstTime = knowledge(s.profile.bestiary, enemyId) === 0;
      set({ profile: { ...s.profile, bestiary: noteSeen(s.profile.bestiary, enemyId) } });
      if (firstTime) toast(`Nueva entrada en el Bestiario: ${e.name}`, 'info');
      title = e.boss ? `¡${e.name}!` : e.name;
      canFlee = !e.boss;
    } else {
      const rc = rivalCombatant(s.rival.who, s.rival.hp, 'B', s.rival.potions, combatLevel());
      const name = getWanderer(s.rival.who).name;
      if (kind === 'betrayal-by-player') rc.statuses.push({ id: 'stun', turns: 1 });
      // Si te traiciona atacando, empiezas sangrando; si te robó y lo alcanzas, no
      const refused = kind === 'betrayal-by-rival' && s.rival.betrayedBy === 'player';
      if (kind === 'betrayal-by-rival' && s.rival.disposition !== 'fleeing' && !refused) player.statuses.push({ id: 'bleed', turns: 2 });
      list.push(rc);
      // Tu mercenario de Garra Roja siempre te defiende
      if (s.merc?.alive) list.splice(1, 0, mercCombatant(s.merc, 'A', combatLevel()));
      title = kind === 'hostile' ? `Combate hostil: ${name}` : kind === 'betrayal-by-player' ? `Traición: atacas a ${name} por sorpresa` : s.rival.disposition === 'fleeing' ? `¡Alcanzas a ${name}!` : refused ? `¡${name} viene a por su parte!` : `¡${name} te traiciona!`;
      // Traiciones: no hay huida posible. Solo el combate hostil (atacar a un neutral o un errante hostil) permite escapar.
      canFlee = kind === 'hostile';
    }
    const combat = createCombat(list, randomSeed(), { canFlee });
    combat.log.unshift(kind === 'pve' ? `¡${title.replace(/[¡!]/g, '')} te cierra el paso!` : s.rival.disposition === 'hostile' && !s.rival.betrayed && getWanderer(s.rival.who).lines.hostile ? getWanderer(s.rival.who).lines.hostile! : 'Las armas salen de sus vainas.');
    if (s.rival.disposition === 'allied' && kind === 'pve') combat.log.push(`${getWanderer(s.rival.who).name} combate a tu lado.`);
    if (s.merc?.alive) combat.log.push(`${getMerc(s.merc.id).name} combate a tu lado (${STANCE_NAME[s.merc.stance].toLowerCase()}).`);
    set({ combat: { state: combat, kind, entityId, title, rewards: null }, modal: null });
    bus.emit('cancel-channel');
  },

  combatAct(action: CombatAction) {
    const s = state;
    if (!s.combat || !s.expedition) return;
    const actor = currentActor(s.combat.state);
    if (!actor || actor.control !== 'player') return;
    if (action.type === 'item' && countItem(s.expedition.backpack, action.itemId) <= 0) return invError('No tienes ese objeto.');
    let next: CombatState;
    try {
      next = performAction(s.combat.state, action);
    } catch (e) {
      return invError((e as Error).message);
    }
    actions.afterCombatStep(next);
  },

  combatAI() {
    const s = state;
    if (!s.combat) return;
    const actor = currentActor(s.combat.state);
    if (!actor || actor.control === 'player') return;
    actions.afterCombatStep(runAITurn(s.combat.state));
  },

  afterCombatStep(next: CombatState) {
    const s = state;
    if (!s.combat || !s.expedition || !s.profile) return;
    let exp = { ...s.expedition };
    for (const ev of next.events) {
      if (ev.type === 'itemUsed' && ev.actorId === 'player') exp.backpack = removeItem(exp.backpack, ev.itemId, 1) ?? exp.backpack;
    }
    const pl = getCombatant(next, 'player');
    exp.hp = pl.hp;
    exp.mp = pl.mp;
    exp.cooldowns = { ...(pl.cooldowns ?? {}) };
    let rival = s.rival;
    const rc = next.combatants.find((c) => c.id === 'rival');
    if (rc) rival = { ...rival, hp: rivalHpBack(rc.hp, combatLevel()), potions: rc.potions };
    let merc = s.merc;
    const mc = next.combatants.find((c) => c.id === 'merc');
    if (mc && merc) merc = { ...merc, hp: mercHpBack(mc.hp, combatLevel()), potions: mc.potions };
    let rewards = s.combat.rewards;

    if (next.outcome) {
      if (next.outcome === 'victory') {
        const rng = makeRng(randomSeed());
        let xp = 0, gold = 0;
        const items: ItemStack[] = [];
        const kills = { ...exp.kills };
        for (const c of next.combatants.filter((x) => x.side === 'B')) {
          if (c.ref && c.ref !== 'rival') {
            const e = getEnemy(c.ref);
            xp += enemyXp(e.xp, enemyLevel(c.id));
            if (e.boss && !state.profile!.bossesDefeated.includes(e.id)) {
              { const pr = state.profile!; set({ profile: { ...pr, bossesDefeated: [...pr.bossesDefeated, e.id] } }); }
              const next = Object.values(ZONES).find((z) => z.access.bossOf && ZONES[z.access.bossOf].boss === e.id);
              if (next) toast(`Has derrotado a ${e.name}. ${next.name} te espera más abajo (nivel ${next.access.level}).`, 'good');
            }
            const l = rollLoot(e.loot, rng);
            gold += l.gold;
            items.push(...rollStacks(adaptDrops(l.items, state.profile!.character.classId), getItem, { depth: subzoneDepth(), bonus: e.boss ? 2 : e.elite ? 1 : 0 }, () => rng.next()));
            kills[e.id] = (kills[e.id] ?? 0) + 1;
            { const pr = state.profile!; set({ profile: { ...pr, bestiary: noteKill(pr.bestiary, e.id) } }); }
          }
        }
        let rivalBag: Bag | null = null;
        if (rc && rc.side === 'B') {
          {
            xp += 60;
            const rivalCoins = rival.gold;
            rival = { ...rival, disposition: 'dead' };
            // El cuerpo del errante deja una bolsa con sus pertenencias (y lo que te robó o le diste)
            const bagGrid = addManyToGrid(emptyGrid(12), [...rival.bagItemIds.map((id) => ({ uid: makeUid(), itemId: id, qty: 1 })), ...(rivalCoins > 0 ? [coinsStack(rivalCoins)] : [])]).grid;
            const [x, y] = s.hud.playerTile;
            rivalBag = { id: makeUid('bag'), x, y, grid: bagGrid, label: `Pertenencias de ${getWanderer(rival.who).name.split(' ')[0]}` };
          }
        }
        // Subzonas muy por debajo de tu nivel: menos experiencia y oro (config/subzones.ts)
        if (s.dungeon?.subzone) {
          const pen = overlevelPenalty(getSubzone(s.dungeon.subzone).levels[1], s.profile.character.level);
          if (pen) { xp = Math.round(xp * pen.xp); gold = Math.round(gold * pen.gold); }
        }
        // En el tutorial, la rata siempre suelta algo de oro (para practicar con el saco del botín)
        if (s.tutorial && gold < 4 && !rivalBag) gold = 4;
        // Oro físico: el botín (objetos y monedas) cae en un saco en el suelo; tú decides qué te llevas
        const dropped = [...items, ...(gold > 0 ? [coinsStack(gold)] : [])];
        exp.goldFound += gold;
        exp.xpGained += xp;
        exp.kills = kills;
        let bagId: string | null = null;
        // Si el único enemigo era el errante, todo cae en UNA bolsa: la de sus pertenencias (antes salían dos sacos)
        const foeOnly = !next.combatants.some((c) => c.side === 'B' && c.ref && c.ref !== 'rival');
        if (rivalBag) {
          if (dropped.length && foeOnly) rivalBag = { ...rivalBag, grid: addManyToGrid(emptyGrid(Math.max(12, rivalBag.grid.length + dropped.length)), [...rivalBag.grid.filter((x): x is ItemStack => !!x && !isCover(x)), ...dropped]).grid };
          const rb = rivalBag;
          set((st) => ({ bags: { ...st.bags, [rb.id]: rb } }));
          bus.emit('bags-changed');
          if (foeOnly) bagId = rb.id;
        }
        if (dropped.length && !(rivalBag && foeOnly)) {
          const [x, y] = s.hud.playerTile;
          const foe = next.combatants.find((c) => c.side === 'B' && c.ref && c.ref !== 'rival');
          const bag: Bag = { id: makeUid('bag'), x, y, grid: addManyToGrid(emptyGrid(Math.max(12, dropped.length)), dropped).grid, label: foe ? `Saco de ${getEnemy(foe.ref!).name}` : 'Saco del combate', allyShare: state.rival.disposition === 'allied' && next.combatants.some((c) => c.id === 'rival' && c.side === 'A' && c.hp > 0) };
          bagId = bag.id;
          set((st) => ({ bags: { ...st.bags, [bag.id]: bag } }));
          bus.emit('bags-changed');
        }
        rewards = { xp, gold, items, overflow: false, bagId };
        // Tu mercenario se venda las heridas tras cada victoria
        if (merc?.alive && mc && mc.hp > 0) { const max = mercBaseStats(getMerc(merc.id)).maxHp; merc = { ...merc, hp: Math.min(max, merc.hp + Math.round(max * 0.15)) }; }
        sfx('victory');
      } else if (next.outcome === 'defeat') {
        sfx('defeat');
      }
      if (mc && merc && mc.hp <= 0 && merc.alive) {
        merc = { ...merc, alive: false };
        toast(`${getMerc(merc.id).name} ha caído en combate.${merc.rescued ? '' : ' El contrato se rompe.'}`, 'danger');
      }
      if (rc && rc.side === 'A' && rc.hp <= 0) {
        rival = { ...rival, disposition: 'dead' };
        toast(`${getWanderer(rival.who).name} ha caído en combate.`, 'danger');
      }
    }
    set({ combat: { ...s.combat, state: next, rewards }, expedition: exp, rival, merc });
  },

  closeCombat() {
    const s = state;
    if (!s.combat?.state.outcome) return;
    const { outcome } = s.combat.state;
    const kind = s.combat.kind;
    const entityId = s.combat.entityId;
    if (outcome === 'defeat') {
      set({ combat: null });
      void actions.finishExpedition('died');
      return;
    }
    const lootBag = outcome === 'victory' ? s.combat.rewards?.bagId : null;
    set({ combat: null });
    bus.emit('combat-ended', { entityId, outcome, kind });
    // El saco del botín se abre solo: coges lo que quieras y el resto se queda en el suelo
    if (lootBag && state.bags[lootBag]) actions.openBag(lootBag);
    bus.emit('rival-changed');
    bus.emit('merc-changed');
    // Tras ganar un combate con poca vida, un errante traidor puede aprovechar el momento
    if (kind === 'pve' && outcome === 'victory') setTimeout(() => actions.checkBetrayal(false), 400);
  },
};
