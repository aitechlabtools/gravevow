import { healBody, summaryHp } from '../../core/anatomy';
import { RECOVER_AFTER_WIN } from '../../config/subzones';
// Acciones del combate: empezar, actuar, turno de la IA, resultado y cierre.
import { needsOf } from '../../core/needs';
import { prepMods } from '../../core/refuge';
import type { ItemStack } from '../../core/types';
import { rollStacks } from '../../core/data/rarity';
import { addManyToGrid, countItem, emptyGrid, removeItem, isCover } from '../../core/inventory';
import { coins as coinsStack } from '../../core/gold';
import { bossMemory, restoreBoss, createCombat, distinctNames, performAction, runAITurn, currentActor, getCombatant, type CombatAction, type CombatState } from '../../core/combat';
import { knowledge, noteKill, noteSeen } from '../../core/bestiary';
import { ZONES } from '../../core/data/zones';
import { getSubzone } from '../../core/data/subzones';
import { overlevelPenalty } from '../../config/subzones';
import { enemyCombatant, playerCombatant, rivalCombatant, enemyXp, rivalHpBack } from '../../core/combatants';
import { getEnemy } from '../../core/data/enemies';
import { getItem } from '../../core/data/items';
import { rollLoot, adaptDrops } from '../../core/loot';
import { enemyCraftDrops, subzoneTier } from '../../core/craftDrops';
import { makeRng, makeUid, randomSeed } from '../../core/rng';
import { getWanderer } from '../../core/data/wanderers';
import { bus } from './bus';
import { mercBaseStats, mercCombatant, mercHpBack, STANCE_NAME } from '../../core/mercenaries';
import { getMerc } from '../../core/data/mercenaries';
import { sfx } from '../audio';
import { noticeText, wearEquipment } from '../../core/durability';
import { TUTORIAL_BLOCK } from '../../core/data/tutorial';
import { combatLevel, enemyLevel, invError, loadNow, set, state, subzoneDepth, toast } from './internals';
import type { Bag, CombatKind } from './internals';
import { actions } from './store';
import { headHitsHere } from './medicalActions';

export const combatActions = {
  // ── Combate ──
  /** `partner`: segundo enemigo que ya te perseguía y entra en el mismo combate (1 contra 2 o 2 contra 2). */
  startCombat(kind: CombatKind, entityId: string | null, enemyId?: string, partner?: { entityId: string; enemyId: string }) {
    const s = state;
    if (!s.profile || !s.expedition || s.combat) return;
    const ch = s.profile.character;
    if (s.expedition.surgery) actions.interruptSurgery('Te atacan');
    const player = playerCombatant(ch, s.expedition.equipment, s.expedition.hp, s.expedition.mp, s.expedition.cooldowns, s.profile.classSkills.equipped, { body: state.expedition!.body, headHits: headHitsHere(), depth: subzoneDepth(), noInjuries: !!s.tutorial, unbreakable: !!s.tutorial, needs: s.tutorial ? undefined : needsOf(s.expedition.needs), restExtra: loadNow()?.restExtra ?? 0, prepMods: prepMods(s.expedition.prep), pact: s.expedition.pact ?? null });
    const list = [player];
    let title = '';
    let canFlee = true;
    if (kind === 'pve' && enemyId) {
      const e = getEnemy(enemyId);
      // Máximo dos por bando: con mercenario contratado, Kael no entra en este combate
      if (s.merc?.alive) list.push(mercCombatant(s.merc, 'A', combatLevel()));
      else if (s.rival.disposition === 'allied') list.push(rivalCombatant(s.rival.who, s.rival.hp, 'A', s.rival.potions, combatLevel()));
      { // Un jefe del que te retiraste vuelve con la vida, la fase y el auxiliar que tenía
        const foe = enemyCombatant(enemyId, entityId ?? 'enemy', 'B', enemyLevel(entityId));
        const mem = entityId ? s.expedition.bosses?.[entityId] : undefined;
        list.push(mem ? restoreBoss(foe, mem) : foe);
      }
      const second = partner && partner.entityId !== entityId && !e.boss ? partner : null;
      if (second) list.push(enemyCombatant(second.enemyId, second.entityId, 'B', enemyLevel(second.entityId)));
      let bestiary = s.profile.bestiary;
      for (const id of new Set([enemyId, ...(second ? [second.enemyId] : [])])) {
        if (knowledge(bestiary, id) === 0) toast(`Nueva entrada en el Bestiario: ${getEnemy(id).name}`, 'info');
        bestiary = noteSeen(bestiary, id);
      }
      set({ profile: { ...s.profile, bestiary } });
      const e2 = second ? getEnemy(second.enemyId) : null;
      title = e.boss ? `¡${e.name}!` : e2 ? (e2.id === e.id ? `Dos: ${e.name}` : `${e.name} y ${e2.name}`) : e.name;
      // Fase 8: también se puede uno retirar de un jefe (con la huida de siempre); conserva sus heridas en esta incursión
      canFlee = true;
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
    // Tutorial: nunca se huye
    if (s.tutorial) canFlee = false;
    const combat = createCombat(distinctNames(list), randomSeed(), { canFlee });
    const foesB = list.filter((c) => c.side === 'B');
    combat.log.unshift(kind === 'pve' ? (foesB.length > 1 ? `¡${getEnemy(foesB[0].ref!).name} te cierra el paso y ${getEnemy(foesB[1].ref!).name.toLowerCase()} se suma a la pelea!` : `¡${title.replace(/[¡!]/g, '')} te cierra el paso!`) : s.rival.disposition === 'hostile' && !s.rival.betrayed && getWanderer(s.rival.who).lines.hostile ? getWanderer(s.rival.who).lines.hostile! : 'Las armas salen de sus vainas.');
    if (kind === 'pve' && getEnemy(enemyId!).boss) combat.log.push(s.expedition.bosses?.[entityId ?? ''] ? `${getEnemy(enemyId!).name} aún lleva las heridas de vuestro último encuentro.` : 'Puedes retirarte con «Huir»: el jefe conservará sus heridas en esta incursión.');
    if (s.rival.disposition === 'allied' && kind === 'pve' && s.merc?.alive) combat.log.push(`${getWanderer(s.rival.who).name} se queda atrás: tu mercenario ocupa su sitio.`);
    else if (s.rival.disposition === 'allied' && kind === 'pve') combat.log.push(`${getWanderer(s.rival.who).name} combate a tu lado.`);
    if (s.merc?.alive) combat.log.push(`${getMerc(s.merc.id).name} combate a tu lado (${STANCE_NAME[s.merc.stance].toLowerCase()}).`);
    const entityIds = foesB.map((c) => c.id).filter((id) => id !== 'rival' && id !== 'enemy');
    set({ combat: { state: combat, kind, entityId, entityIds, title, rewards: null }, modal: null });
    bus.emit('cancel-channel');
  },

  combatAct(action: CombatAction) {
    const s = state;
    if (!s.combat || !s.expedition) return;
    const actor = currentActor(s.combat.state);
    if (!actor || actor.control !== 'player') return;
    if (action.type === 'item' && countItem(s.expedition.backpack, action.itemId) <= 0) return invError('No tienes ese objeto.');
    let cs = s.combat.state;
    const t = s.tutorial;
    if (t) {
      if (action.type === 'flee') return invError(TUTORIAL_BLOCK.flee);
      // La rata del tutorial no cae hasta que uses el ataque especial (así se practican los dos)
      const hold = !t.special && action.type !== 'skill';
      cs = { ...cs, combatants: cs.combatants.map((c) => (c.ref === 'ossuary_rat' ? { ...c, unbreakable: hold } : c)) };
    }
    let next: CombatState;
    try {
      next = performAction(cs, action);
    } catch (e) {
      return invError((e as Error).message);
    }
    if (t && state.tutorial && (action.type === 'attack' || action.type === 'skill')) {
      set({ tutorial: { ...state.tutorial, attacked: true, special: state.tutorial.special || action.type === 'skill' } });
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
    if (pl.body) exp.body = pl.body;
    if (pl.needs) exp.needs = pl.needs;
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
      // Jefes: si te retiras, recuerdan vida y fase; si caen, se olvidan
      for (const c of next.combatants.filter((x) => x.side === 'B' && x.boss && !x.summoned)) {
        const bosses = { ...(exp.bosses ?? {}) };
        if (next.outcome === 'fled' && c.hp > 0) bosses[c.id] = bossMemory(c); else delete bosses[c.id];
        exp.bosses = bosses;
      }
      // Desgaste del equipo: el arma por cada ataque y la armadura por cada golpe encajado (al morir da igual: se pierde)
      if (next.outcome !== 'defeat' && pl.wear) {
        const w = wearEquipment(exp.equipment, pl.wear.swings, pl.wear.hits, pl.wear.slots);
        exp.equipment = w.equipment;
        for (const n of w.notices) toast(noticeText(n), n.level === 'worn' ? 'info' : 'danger');
      }
      if (pl.surgery) toast('El combate termina con la cirugía a medias: el equipo se ha perdido.', 'danger');
      // Fase 10: al ganar se recobra el aliento (un poco de vida; no cierra heridas ni sangrados)
      if (next.outcome === 'victory' && exp.body && exp.hp > 0) {
        const h = healBody(exp.body, Math.round(exp.body.total * RECOVER_AFTER_WIN));
        if (h.healed > 0) { exp.body = h.body; exp.hp = summaryHp(h.body); toast(`Recobras el aliento: +${h.healed} de vida.`, 'info'); }
      }
      // Si huyes después de abatir a uno de los dos, su botín también cae al suelo
      const killedFoe = next.outcome === 'fled' && next.combatants.some((c) => c.side === 'B' && c.hp <= 0 && c.ref && c.ref !== 'rival');
      if (next.outcome === 'victory' || killedFoe) {
        const rng = makeRng(randomSeed());
        let xp = 0, gold = 0;
        const items: ItemStack[] = [];
        const kills = { ...exp.kills };
        for (const c of next.combatants.filter((x) => x.side === 'B' && (next.outcome === 'victory' || x.hp <= 0))) {
          // El auxiliar de un jefe no da premio propio: el premio es el del jefe
          if (c.ref && c.ref !== 'rival' && !c.summoned) {
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
            if (!s.tutorial) items.push(...enemyCraftDrops(e.id, subzoneTier(s.dungeon?.subzone), { elite: !!e.elite, boss: !!e.boss }, rng));
            kills[e.id] = (kills[e.id] ?? 0) + 1;
            { const pr = state.profile!; set({ profile: { ...pr, bestiary: noteKill(pr.bestiary, e.id) } }); }
          }
        }
        let rivalBag: Bag | null = null;
        if (rc && rc.side === 'B' && rc.hp <= 0) {
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
        // En el tutorial, la rata no suelta nada: tras su combate toca curarse la pierna (ver tutorialCheck)
        if (s.tutorial && kills.ossuary_rat && !exp.kills.ossuary_rat) { gold = 0; items.length = 0; }
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
          const foe = next.combatants.filter((c) => c.side === 'B' && c.ref && c.ref !== 'rival' && c.hp <= 0);
          const bag: Bag = { id: makeUid('bag'), x, y, grid: addManyToGrid(emptyGrid(Math.max(12, dropped.length)), dropped).grid, label: foe.length === 1 ? `Saco de ${getEnemy(foe[0].ref!).name}` : 'Saco del combate', allyShare: state.rival.disposition === 'allied' && next.combatants.some((c) => c.id === 'rival' && c.side === 'A' && c.hp > 0) };
          bagId = bag.id;
          set((st) => ({ bags: { ...st.bags, [bag.id]: bag } }));
          bus.emit('bags-changed');
        }
        rewards = { xp, gold, items, overflow: false, bagId };
        // Tu mercenario se venda las heridas tras cada victoria
        if (next.outcome === 'victory' && merc?.alive && mc && mc.hp > 0) { const max = mercBaseStats(getMerc(merc.id)).maxHp; merc = { ...merc, hp: Math.min(max, merc.hp + Math.round(max * 0.15)) }; }
        if (next.outcome === 'victory') sfx('victory');
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
    const lootBag = s.combat.rewards?.bagId ?? null;
    const killed = s.combat.state.combatants.filter((c) => c.side === 'B' && c.hp <= 0).map((c) => c.id);
    const entityIds = s.combat.entityIds ?? (entityId ? [entityId] : []);
    set({ combat: null });
    bus.emit('combat-ended', { entityId, entityIds, killed, outcome, kind });
    // El saco del botín se abre solo: coges lo que quieras y el resto se queda en el suelo
    if (lootBag && state.bags[lootBag]) actions.openBag(lootBag);
    bus.emit('rival-changed');
    bus.emit('merc-changed');
    // Tras ganar un combate con poca vida, un errante traidor puede aprovechar el momento
    if (kind === 'pve' && outcome === 'victory') setTimeout(() => actions.checkBetrayal(false), 400);
  },
};
