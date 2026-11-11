// Acciones de la anatomía (Fase 4): tratar heridas fuera de combate, cirugía de campo en dos pulsos,
// sangrado por pulso al explorar y el tratamiento completo de Hermana Vesper en el Bastión.
import { ANATOMY, REGION_NAME } from '../../config/anatomy';
import { healBody, toWounds, tickPain, applyTreatment, bleedTick, bestTreatment, damageRegion, fromWounds, isDead, resizeBody, rollInjury, summaryHp, treatError, urgencies, vesperPrice, type Body, type Region, type Treatment } from '../../core/anatomy';
import { needLog, regionWith } from '../../core/combat';
import { prepMods } from '../../core/refuge';
import { needsOf, tickNeeds } from '../../core/needs';
import { computeStats } from '../../core/stats';
import { potionAmount } from '../../config/progression';
import { countItem, removeItem } from '../../core/inventory';
import { getItem } from '../../core/data/items';
import { spendGold } from '../../core/wallet';
import { makeRng, randomSeed } from '../../core/rng';
import type { ExpeditionState } from '../../core/expedition';
import type { Profile } from '../../core/types';
import { sfx } from '../audio';
import { invError, loadNow, set, state, subzoneDepth, toast } from './internals';
import { actions } from './store';

/** Objeto de la mochila que hace este tratamiento. */
export const TREATMENT_ITEM: Record<Treatment, string> = { bandage: 'bandage', hemostatic: 'hemostatic', tourniquet: 'tourniquet', splint: 'splint', surgery: 'surgery_kit', painkiller: 'painkiller' };

/** Los golpes normales van a la cabeza solo a partir de la tercera subzona. */
export function headHitsHere(): boolean {
  return subzoneDepth() >= ANATOMY.headFromDepth;
}

/** Cuerpo de la expedición ajustado a la vida máxima actual (el equipo puede cambiarla). */
export function expBody(exp: ExpeditionState, p: Profile): Body {
  const max = computeStats(p.character.classId, p.character.level, exp.equipment).maxHp;
  return resizeBody(exp.body, max);
}

/** Cuerpo del perfil en el Bastión (heridas guardadas). */
export function baseBody(p: Profile): Body {
  return fromWounds(p.wounds, computeStats(p.character.classId, p.character.level, p.equipment).maxHp);
}

/** Expedición con un cuerpo nuevo (y la vida resumen al día). */
export function withBody(exp: ExpeditionState, body: Body): ExpeditionState {
  return { ...exp, body, hp: summaryHp(body) };
}

let pulseMark = 0;
let lastBleedWarn = -99;

export const medicalActions = {
  /** Aplica un tratamiento fuera de combate (en combate va por `combatAct` y gasta el turno). */
  treat(itemId: string, region: Region) {
    const s = state;
    if (!s.profile || !s.expedition || s.screen !== 'dungeon') return invError('Las heridas se tratan durante la incursión; en el Bastión, Hermana Vesper.');
    if (s.combat) return invError('En combate, los tratamientos se usan desde la mochila del combate.');
    const def = getItem(itemId);
    if (def.use?.kind !== 'treat') return invError('Esto no cura heridas.');
    if (countItem(s.expedition.backpack, itemId) <= 0) return invError(`No llevas ${def.name.toLowerCase()}.`);
    if (s.expedition.surgery) return invError('Ya estás operando: espera a terminar.');
    const body = expBody(s.expedition, s.profile);
    const err = treatError(body, def.use.treat, region);
    if (err) return invError(err);
    const backpack = removeItem(s.expedition.backpack, itemId, 1);
    if (!backpack) return;
    if (def.use.treat === 'surgery') {
      // La cirugía reserva el equipo al empezar y dura dos pulsos; si algo te interrumpe, se pierde
      set({ expedition: { ...withBody(s.expedition, body), backpack, surgery: { region, left: ANATOMY.surgeryPulses } } });
      sfx('equip');
      toast(`Empiezas a operar ${regionWith(region)}. Que nada te hiera ni te obligue a pelear durante ${ANATOMY.surgeryPulses * ANATOMY.pulseSeconds} s.`, 'info', def.icon);
      return;
    }
    const r = applyTreatment(body, def.use.treat, region);
    set({ expedition: { ...withBody(s.expedition, r.body), backpack } });
    sfx('heal');
    toast(r.text, 'good', def.icon);
  },

  /** Trata la lesión más urgente que tenga remedio en la mochila (enseña antes qué y dónde: ver `quickTreatment`). */
  treatUrgent() {
    const q = quickTreatment();
    if (!q) return invError('No tienes con qué tratar tus heridas.');
    actions.treat(TREATMENT_ITEM[q.treatment], q.region);
  },

  /** Interrumpe la cirugía en marcha (combate, golpe o movimiento): el equipo se pierde y la región sigue igual. */
  interruptSurgery(why: string) {
    const exp = state.expedition;
    if (!exp?.surgery) return;
    set({ expedition: { ...exp, surgery: null } });
    toast(`${why}: la cirugía se interrumpe y el equipo se echa a perder.`, 'danger');
  },

  /**
   * Pulso médico de exploración (cada 6 s de juego activo, fuera de combate): sangrado y cirugía.
   * Se llama desde `tick` con los pulsos del reloj; en combate, cada ronda ya es un pulso.
   */
  medicalPulse(clockPulses: number) {
    const s = state;
    if (!s.profile || !s.expedition || s.combat || s.screen !== 'dungeon') { pulseMark = clockPulses; return; }
    if (clockPulses < pulseMark) pulseMark = clockPulses;
    const n = Math.floor((clockPulses - pulseMark) / ANATOMY.pulseSeconds);
    if (n <= 0) return;
    pulseMark += n * ANATOMY.pulseSeconds;
    let exp = s.expedition;
    let body = expBody(exp, s.profile);
    for (let i = 0; i < n; i++) {
      // Primero lo que cura (la cirugía que termina), luego el sangrado del pulso
      if (exp.surgery) {
        const left = exp.surgery.left - 1;
        if (left <= 0) {
          const r = applyTreatment(body, 'surgery', exp.surgery.region);
          body = r.body;
          exp = { ...exp, surgery: null };
          sfx('heal');
          toast(r.text, 'good', 'surgery_kit');
        } else exp = { ...exp, surgery: { ...exp.surgery, left } };
      }
      const b = bleedTick(body);
      body = tickPain(b.body);
      if (b.dead) break;
      // Necesidades: el mismo pulso gasta Saciedad, Hidratación y Descanso
      const t = tickNeeds(needsOf(exp.needs), body, body.total, loadNow()?.restExtra ?? 0, prepMods(exp.prep));
      exp = { ...exp, needs: t.needs };
      body = t.body;
      for (const x of t.crossed) if (x.level !== 'ok') toast(needLog(x.need, x.level), x.level === 'low' ? 'info' : 'danger', x.need === 'hyd' ? 'water' : x.need === 'sat' ? 'ration' : undefined);
      if (t.dealt > 0) toast(`${t.needs.hyd <= 0 ? 'La sed' : 'El hambre'} te hiere: -${t.dealt} en el tórax.`, 'danger');
      if (t.dead) break;
    }
    exp = withBody(exp, body);
    set({ expedition: exp });
    if (isDead(body)) { toast(exp.needs && (exp.needs.hyd <= 0 || exp.needs.sat <= 0) && !Object.values(body.parts).some((x) => x.bleed) ? 'El hambre y la sed han podido contigo.' : 'Te has desangrado.', 'danger'); void actions.finishExpedition('died'); return; }
    // Aviso de hemorragia, sin repetirlo más de una vez cada 30 s
    const heavy = (Object.values(body.parts) as Body['parts'][Region][]).some((p) => p.bleed === 2);
    const any = (Object.values(body.parts) as Body['parts'][Region][]).some((p) => p.bleed > 0);
    if (any && clockPulses - lastBleedWarn >= 30) {
      lastBleedWarn = clockPulses;
      toast(heavy ? '¡Sangrado grave! Usa un hemostático o un torniquete.' : 'Sangras. Una venda lo detendría.', heavy ? 'danger' : 'info', heavy ? 'hemostatic' : 'bandage');
    }
  },

  /** Daño de trampa: los pinchos van a las piernas y pueden abrir sangrado o romper un hueso. */
  hurtByTrap(damage: number): boolean {
    const s = state;
    if (!s.profile || !s.expedition) return false;
    const rng = makeRng(randomSeed());
    const region: Region = rng.chance(0.5) ? 'legL' : 'legR';
    let body = expBody(s.expedition, s.profile);
    body = damageRegion(body, region, damage).body;
    const inj = s.tutorial ? { body, injury: null } : rollInjury(body, region, false, rng);
    body = inj.body;
    set({ expedition: withBody(s.expedition, body) });
    if (inj.injury?.fracture) toast(`${REGION_NAME[region]}: ¡fractura! Una férula la fija.`, 'danger', 'splint');
    else if (inj.injury?.bleed) toast(`${REGION_NAME[region]}: sangrado leve.`, 'danger', 'bandage');
    actions.interruptSurgery('Un golpe');
    return isDead(body);
  },

  /** En el Bastión (Intendencia → Estado): trata una herida con tus propios objetos de la mochila, sin pagar a
   *  Vesper. Aquí nadie te interrumpe, así que la cirugía termina al momento. */
  baseTreat(itemId: string, region: Region) {
    const p = state.profile;
    if (!p || state.expedition) return;
    const def = getItem(itemId);
    if (def.use?.kind !== 'treat') return invError('Esto no cura heridas.');
    if (def.use.treat === 'painkiller') return invError('En el Bastión no te hace falta: el dolor solo pesa al pelear.');
    if (countItem(p.backpack, itemId) <= 0) return invError(`No llevas ${def.name.toLowerCase()} en la mochila.`);
    const body = baseBody(p);
    const err = treatError(body, def.use.treat, region);
    if (err) return invError(err);
    const backpack = removeItem(p.backpack, itemId, 1);
    if (!backpack) return;
    const r = applyTreatment(body, def.use.treat, region);
    set({ profile: { ...p, backpack, wounds: toWounds(r.body) } });
    sfx('heal');
    toast(r.text, 'good', def.icon);
  },

  /** En el Bastión: una poción de vida de tu mochila reparte la vida entre las regiones que funcionan. */
  baseHeal(itemId: string) {
    const p = state.profile;
    if (!p || state.expedition) return;
    const def = getItem(itemId);
    if (def.use?.kind !== 'heal') return;
    const max = computeStats(p.character.classId, p.character.level, p.equipment).maxHp;
    const h = healBody(baseBody(p), potionAmount(def.use.amount, max));
    if (h.healed <= 0) return invError('Ya tienes la vida al máximo (lo inutilizado solo se recupera con cirugía).');
    const backpack = removeItem(p.backpack, itemId, 1);
    if (!backpack) return;
    set({ profile: { ...p, backpack, wounds: toWounds(h.body) } });
    sfx('heal');
    toast(`Usas ${def.name}: recuperas ${Math.round(h.healed)} de vida.`, 'good', def.icon);
  },

  /** Tratamiento completo de Hermana Vesper: toda la vida y sin fracturas. Cobra del oro del almacén. */
  vesperTreat() {
    const p = state.profile;
    if (!p) return;
    const price = vesperPrice(baseBody(p));
    if (!price) return invError('No tienes heridas que tratar.');
    const paid = spendGold(p, price);
    if (!paid.ok) return invError(paid.error);
    set({ profile: { ...paid.profile, wounds: null } });
    sfx('heal');
    toast(`Hermana Vesper cose y entablilla. Quedas entero por ${price} de oro.`, 'good');
  },
};

/** Tratamiento rápido: la lesión más urgente que puedes tratar con lo que llevas (para mostrarlo antes de gastar). */
export function quickTreatment(): { treatment: Treatment; region: Region } | null {
  const s = state;
  if (!s.profile || !s.expedition) return null;
  const body = expBody(s.expedition, s.profile);
  const have = (t: Treatment) => countItem(s.expedition!.backpack, TREATMENT_ITEM[t]) > 0;
  for (const u of urgencies(body)) {
    if (u.need === 'disabled') continue; // la cirugía se elige a mano: es cara y lenta
    const t = bestTreatment(body, u, have);
    if (t) return { treatment: t, region: u.region };
  }
  return null;
}

