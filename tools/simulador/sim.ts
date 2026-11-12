// Simulador de combate de Gravevow (Fase 10, reequilibrio). Usa el combate real del núcleo con los mismos datos del juego.
// Lo distinto de tests/balance.test.ts: aquí los combates van SEGUIDOS, como en una incursión: la vida, las heridas,
// el sangrado, las pociones y el recurso pasan de un combate al siguiente, y entre combates se explora unos pulsos.
// Uso: node scripts/simular.mjs [partidas]   →   escribe docs/equilibrio/simulador-<escenario>.md
import { createCombat, currentActor, getCombatant, opponents, performAction, runAITurn, canUseSkill, type CombatState, type CombatAction, type Combatant } from '../../src/core/combat';
import { enemyCombatant, playerCombatant, rivalCombatant } from '../../src/core/combatants';
import { createProfile } from '../../src/core/profile';
import { emptyEquipment } from '../../src/core/inventory';
import { bleedTick, fromWounds, summaryHp, applyTreatment, healBody, type Body } from '../../src/core/anatomy';
import { potionAmount } from '../../src/config/progression';
import { computeStats } from '../../src/core/stats';
import { getSkill } from '../../src/core/data/skills';
import { getEnemy } from '../../src/core/data/enemies';
import { SUBZONES, SUBZONE_ORDER } from '../../src/core/data/subzones';
import { zoneEnemyLevel } from '../../src/core/data/zones';
import { getWanderer } from '../../src/core/data/wanderers';
import { REGIONS } from '../../src/config/anatomy';
import { readIntents, intentDamage } from '../../src/core/combat';
import type { ClassId, Equipment } from '../../src/core/types';

export type Cls = 'warrior' | 'mage';

/** Ajustes de un escenario que no son valores de datos (los de datos se cambian en memoria en escenarios.ts). */
import { RECOVER_AFTER_WIN } from '../../src/config/subzones';
export const TUNE = {
  /** Pociones de S1 con equipo inicial (las del kit inicial). */
  s1Potions: 3,
  /** Vida que se recobra al ganar un combate (en el juego lo hace combatActions; aquí se imita). */
  recoverAfterWin: RECOVER_AFTER_WIN,
  /** Protección EXTRA estimada de la armadura (0 = solo la del juego, que ya está en combat.ts desde la Fase 10). */
  armorGuard: 0,
  /** Daño de las criaturas comunes de cada subzona (multiplicador del ataque y la magia). */
  enemyDamage: {} as Record<string, number>,
  /** Multiplicador del sangrado de las habilidades enemigas (además de la armadura). */
  skillBleed: 1,
};
/** Protección efectiva de la armadura de esta incursión (0..1), para el sangrado que ponen las habilidades enemigas. */
let skillBleedKeep = 1;
import { ANATOMY } from '../../src/config/anatomy';
const BASE_INJ = { b: ANATOMY.bleedChance, bc: ANATOMY.bleedChanceCrit, f: ANATOMY.fractureChance, fc: ANATOMY.fractureChanceCrit };
export function setBaseInjuries(b: number, bc: number, f: number, fc: number) { Object.assign(BASE_INJ, { b, bc, f, fc }); }
/** Qué regiones cubre cada pieza (para estimar la protección de la armadura). */
const COVER: Record<string, string[]> = { helmet: ['head'], armor: ['thorax', 'abdomen'], gloves: ['armL', 'armR'], boots: ['legL', 'legR'] };
function applyGuard(gear: Equipment) {
  const w = ANATOMY.hitWeight as Record<string, number>;
  const tot = Object.values(w).reduce((a, b) => a + b, 0);
  let covered = 0;
  for (const [slot, regs] of Object.entries(COVER)) if (gear[slot as keyof Equipment]) for (const r of regs) covered += w[r];
  const k = 1 - (covered / tot) * TUNE.armorGuard;
  ANATOMY.bleedChance = BASE_INJ.b * k; ANATOMY.bleedChanceCrit = BASE_INJ.bc * k;
  ANATOMY.fractureChance = BASE_INJ.f * k; ANATOMY.fractureChanceCrit = BASE_INJ.fc * k;
  skillBleedKeep = TUNE.skillBleed * k;
}
function tuneEnemy(c: Combatant, sub: string): Combatant {
  const m = TUNE.enemyDamage[sub];
  if (!m || c.boss || getEnemy(c.ref!).elite) return c;
  return { ...c, stats: { ...c.stats, atk: Math.round(c.stats.atk * m), mag: Math.round(c.stats.mag * m) } };
}
const kit = (items: Partial<Record<keyof Equipment, string>>): Equipment => {
  const e = emptyEquipment();
  for (const [k, v] of Object.entries(items)) e[k as keyof Equipment] = { uid: k, itemId: v!, qty: 1 };
  return e;
};

/** Equipo típico por zona (el mismo de tests/balance.test.ts); en S1, el equipo inicial de la clase. */
export const GEAR: Record<string, Record<Cls, Equipment>> = {
  mazmorra: {
    warrior: kit({ mainHand: 'knight_sword', offHand: 'iron_shield', helmet: 'iron_helm', armor: 'chainmail', gloves: 'gauntlets', boots: 'worn_boots' }),
    mage: kit({ mainHand: 'frost_staff', offHand: 'arcane_tome', helmet: 'wizard_hat', armor: 'shadow_robe', boots: 'worn_boots' }),
  },
  cripta: {
    warrior: kit({ mainHand: 'gravewarden_blade', offHand: 'headstone_shield', helmet: 'silver_helm', armor: 'bastion_plate', gloves: 'silver_gauntlets', boots: 'grave_boots', amulet: 'reliquary_amulet' }),
    mage: kit({ mainHand: 'requiem_staff', offHand: 'funeral_grimoire', helmet: 'mourner_hood', armor: 'shroud_robe', boots: 'grave_boots', amulet: 'reliquary_amulet' }),
  },
  infierno: {
    warrior: kit({ mainHand: 'hellforged_blade', offHand: 'demonscale_shield', helmet: 'hellsteel_helm', armor: 'hellsteel_plate', gloves: 'demon_gauntlets', boots: 'cinder_boots', ring: 'ember_ring', amulet: 'reliquary_amulet' }),
    mage: kit({ mainHand: 'abyss_scepter', offHand: 'burning_tome', helmet: 'ash_cowl', armor: 'ash_robe', boots: 'cinder_boots', ring: 'ember_ring', amulet: 'reliquary_amulet' }),
  },
};
const starter = (cls: Cls) => createProfile('Sim', cls, { cloak: 0, skin: 0 }).equipment;

/** Estados que perjudican (los que pone el enemigo). */
const BAD = new Set(['veneno', 'quemadura', 'aturdimiento', 'congelación', 'debilidad', 'armadura rota']);

export interface Tally { hits: number; bleedLight: number; bleedHeavy: number; fracture: number; other: Record<string, number> }
const tally = (): Tally => ({ hits: 0, bleedLight: 0, bleedHeavy: 0, fracture: 0, other: {} });

/** Cuenta, en el registro de un combate, los golpes recibidos por el jugador y lo que le provocaron. */
function readLog(log: string[], from: number, me: string, t: Tally) {
  for (const l of log.slice(from)) {
    if (l.startsWith(`El golpe alcanza a ${me} `)) t.hits++;
    else if (/: sangrado leve\.$/.test(l)) t.bleedLight++;
    else if (/: sangrado grave\.$/.test(l)) t.bleedHeavy++;
    else if (/: ¡fractura!$/.test(l)) t.fracture++;
    else if (l.startsWith(`${me} sangra (leve)`)) t.bleedLight++;
    else if (l.startsWith(`${me} sangra (grave)`)) t.bleedHeavy++;
    else { const m = l.match(new RegExp(`^${me} sufre (.+)\\.$`)); if (m && BAD.has(m[1])) t.other[m[1]] = (t.other[m[1]] ?? 0) + 1; }
  }
}

/** El jugador «razonable» de las pruebas: lee los anuncios, se cura por debajo del 35 % y usa sus habilidades. */
function playerTurn(s: CombatState, me: Combatant, potions: { n: number }, seed: number, novice = false): CombatAction {
  if (me.hp / me.stats.maxHp < 0.35 && potions.n > 0) { potions.n--; return { type: 'item', itemId: 'health_potion' }; }
  if (novice) return { type: 'attack', targetId: opponents(s, me)[0].id };
  const r = readIntents(s, me);
  if (r.breakable) return { type: 'attack', targetId: r.breakable.id };
  if (r.threat && intentDamage(r.threat, me) >= me.stats.maxHp * 0.15) return { type: 'defend' };
  const foes = opponents(s, me).sort((x, y) => x.hp - y.hp);
  const tgt = (r.exposed ?? foes[0]).id;
  const offensive = me.skills.map(getSkill).filter((k) => k.target === 'enemy' && k.power && canUseSkill(me, k.id)).sort((x, y) => (y.power ?? 0) - (x.power ?? 0));
  if (me.skills.includes('mana_shield') && canUseSkill(me, 'mana_shield') && !me.shield) return { type: 'skill', skillId: 'mana_shield' };
  if (offensive.length && (seed % 2 === 0 || me.mp >= me.stats.maxMp - 4)) return { type: 'skill', skillId: offensive[0].id, targetId: tgt };
  return { type: 'attack', targetId: tgt };
}

export interface ChainOpts {
  cls: Cls; level: number; gear: Equipment; enemies: string[]; enemyLevel: number; potions: number;
  /** Probabilidad de que un segundo enemigo se sume (Fase 2). */
  pairChance: number; fights: number; headHits: boolean;
  /** Pulsos de exploración entre combates (el sangrado sigue corriendo). */
  pulsesBetween: number; bandages: number; noInjuries?: boolean; novice?: boolean; sub?: string;
}
export interface ChainResult { survived: number; hpAfter: number[]; died: boolean; tally: Tally; potionsUsed: number }

export function runChain(o: ChainOpts, seed: number): ChainResult {
  let rs = seed;
  const rnd = () => ((rs = (rs * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const ch = { name: 'Sim', classId: o.cls as ClassId, appearance: { cloak: 0, skin: 0 }, level: o.level, xp: 0 };
  applyGuard(o.gear);
  const stats = computeStats(o.cls, o.level, o.gear);
  let body: Body = fromWounds(null, stats.maxHp);
  let mp = stats.maxMp;
  const potions = { n: o.potions };
  let bandages = o.bandages;
  const t = tally();
  const hpAfter: number[] = [];
  let cooldowns: Record<string, number> = {};
  for (let f = 0; f < o.fights; f++) {
    const pl = playerCombatant(ch, o.gear, summaryHp(body), mp, cooldowns, undefined, { body, headHits: o.headHits, noInjuries: o.noInjuries });
    const pick = () => o.enemies[Math.floor(rnd() * o.enemies.length)];
    const foe = (id: string) => tuneEnemy(enemyCombatant(pick(), id, 'B', o.enemyLevel), o.sub ?? '');
    const list = [pl, foe('e1')];
    if (rnd() < o.pairChance) list.push(foe('e2'));
    let s = createCombat(list, seed * 31 + f * 7919, { canFlee: false });
    for (let g = 0; g < 400 && !s.outcome; g++) {
      const a = currentActor(s)!;
      if (a.control !== 'player') {
        const n = s.log.length;
        const before = REGIONS.map((r) => getCombatant(s, 'player').body!.parts[r].bleed);
        s = runAITurn(s);
        // Sangrado de una habilidad enemiga: se mantiene con probabilidad skillBleedKeep (armadura y propuesta)
        const fresh = s.log.slice(n);
        if (skillBleedKeep < 1 && fresh.some((l) => l.startsWith('Sim sangra (')) && !fresh.some((l) => /: sangrado (leve|grave)\.$/.test(l)) && rnd() > skillBleedKeep) {
          const me = getCombatant(s, 'player');
          const body = structuredClone(me.body!);
          REGIONS.forEach((r, i) => { if (body.parts[r].bleed > before[i]) body.parts[r].bleed = before[i] as 0 | 1 | 2; });
          me.body = body;
          s.log = [...s.log.slice(0, n), ...fresh.filter((l) => !l.startsWith('Sim sangra ('))];
        }
        readLog(s.log, n, 'Sim', t);
        continue;
      }
      const me = getCombatant(s, 'player');
      const n = s.log.length;
      s = performAction(s, playerTurn(s, me, potions, seed + g, o.novice));
      readLog(s.log, n, 'Sim', t);
    }
    const me = getCombatant(s, 'player');
    if (s.outcome !== 'victory') return { survived: f, hpAfter, died: true, tally: t, potionsUsed: o.potions - potions.n };
    body = me.body!; mp = me.mp; cooldowns = me.cooldowns ?? {};
    if (TUNE.recoverAfterWin) body = healBody(body, Math.round(body.total * TUNE.recoverAfterWin)).body;
    // Entre combates: vendas a lo que sangra, poción si se va muy justo, y el sangrado corre mientras se explora
    for (const r of REGIONS) if (body.parts[r].bleed && bandages > 0) { body = applyTreatment(body, 'bandage', r).body; bandages--; }
    for (let k = 0; k < o.pulsesBetween; k++) { const b = bleedTick(body); body = b.body; if (b.dead) return { survived: f + 1, hpAfter, died: true, tally: t, potionsUsed: o.potions - potions.n }; }
    if (summaryHp(body) / body.total < 0.4 && potions.n > 0) {
      potions.n--;
      body = healBody(body, potionAmount(45, body.total)).body;
    }
    hpAfter.push(summaryHp(body) / body.total);
  }
  return { survived: o.fights, hpAfter, died: false, tally: t, potionsUsed: o.potions - potions.n };
}

export interface Row { label: string; cls: Cls; level: number; win: number[]; hp: number[]; tally: Tally; runs: number; potions: number }

export function scenario(label: string, base: Omit<ChainOpts, 'fights'>, runs: number): Row {
  const fights = 4;
  const alive = [0, 0, 0, 0];
  const hpSum = [0, 0, 0, 0];
  const t = tally();
  let pots = 0;
  for (let i = 1; i <= runs; i++) {
    const r = runChain({ ...base, fights }, i * 7717 + base.level);
    for (let k = 0; k < fights; k++) if (r.survived > k) { alive[k]++; hpSum[k] += r.hpAfter[k] ?? 0; }
    t.hits += r.tally.hits; t.bleedLight += r.tally.bleedLight; t.bleedHeavy += r.tally.bleedHeavy; t.fracture += r.tally.fracture;
    for (const [k, v] of Object.entries(r.tally.other)) t.other[k] = (t.other[k] ?? 0) + v;
    pots += r.potionsUsed;
  }
  return { label, cls: base.cls, level: base.level, win: alive.map((a) => a / runs), hp: hpSum.map((h, k) => (alive[k] ? h / alive[k] : 0)), tally: t, runs, potions: pots / runs };
}

/** Todos los escenarios: S1 con equipo inicial (nivel 1 y 5) y cada subzona a mitad de rango con el equipo de su zona. */
export function allRows(runs: number): Row[] {
  const rows: Row[] = [];
  for (const cls of ['warrior', 'mage'] as Cls[]) {
    const s1 = SUBZONES.afueras;
    for (const lv of [1, 5]) rows.push(scenario(`S1 · nv ${lv} · inicial`, { cls, sub: 'afueras', level: lv, gear: starter(cls), enemies: s1.enemies.map((e) => e.id), enemyLevel: zoneEnemyLevel(s1, lv), potions: TUNE.s1Potions, pairChance: 0.25, headHits: false, pulsesBetween: 8, bandages: 0 }, runs));
    SUBZONE_ORDER.forEach((id, i) => {
      const sz = SUBZONES[id];
      const lv = Math.round((sz.levels[0] + sz.levels[1]) / 2);
      rows.push(scenario(`S${i + 1} · nv ${lv} · su zona`, { cls, sub: id, level: lv, gear: GEAR[sz.zone][cls], enemies: sz.enemies.map((e) => e.id), enemyLevel: zoneEnemyLevel(sz, lv), potions: 3, pairChance: 0.25, headHits: i >= 2, pulsesBetween: 8, bandages: 2 }, runs));
    });
  }
  return rows;
}

/** Élites y jefes, un combate con el cuerpo entero y 3 pociones. */
export function bossRows(runs: number) {
  const out: { id: string; cls: Cls; level: number; elite: number; boss: number }[] = [];
  for (const cls of ['warrior', 'mage'] as Cls[]) SUBZONE_ORDER.forEach((id) => {
    const sz = SUBZONES[id];
    const lv = Math.round((sz.levels[0] + sz.levels[1]) / 2);
    const one = (en: string, l: number) => { let w = 0; for (let i = 1; i <= runs; i++) if (runChain({ cls, level: lv, gear: GEAR[sz.zone][cls], enemies: [en], enemyLevel: l, potions: 3, pairChance: 0, headHits: true, pulsesBetween: 0, bandages: 0, fights: 1 }, i * 131).survived === 1) w++; return w / runs; };
    out.push({ id, cls, level: lv, elite: one(sz.elite, lv + 2), boss: one(sz.boss, Math.min(sz.levels[1] + 3, lv + 3)) });
  });
  return out;
}

/** Tutorial: rata, dos bandidos con Osric al lado y Osric traidor; sin heridas (como en el juego), con 2 pociones y la trampa. */
export function tutorialDeaths(runs: number, novice = false) {
  const res: Record<string, Record<string, number>> = {};
  for (const cls of ['warrior', 'mage'] as Cls[]) {
    const ch = { name: 'Sim', classId: cls as ClassId, appearance: { cloak: 0, skin: 0 }, level: 1, xp: 0 };
    const gear = starter(cls);
    const d: Record<string, number> = { rata: 0, bandidos: 0, osric: 0, total: 0 };
    for (let i = 1; i <= runs; i++) {
      const stats = computeStats(cls, 1, gear);
      let hp = stats.maxHp, mp = stats.maxMp;
      const potions = { n: 2 };
      let osricHp = getWanderer('osric').stats.maxHp;
      const fight = (foes: Combatant[], ally: boolean, key: string): boolean => {
        const pl = playerCombatant(ch, gear, hp, mp, {}, undefined, { noInjuries: true });
        const list = [pl, ...(ally ? [rivalCombatant('osric', osricHp, 'A', 1, 1)] : []), ...foes];
        let s = createCombat(list, i * 977 + key.length * 13, { canFlee: false });
        for (let g = 0; g < 400 && !s.outcome; g++) {
          if (currentActor(s)!.control !== 'player') { s = runAITurn(s); continue; }
          s = performAction(s, playerTurn(s, getCombatant(s, 'player'), potions, i + g, novice));
        }
        const me = getCombatant(s, 'player');
        if (s.outcome !== 'victory') { d[key]++; return false; }
        hp = me.hp; mp = me.mp;
        if (ally) osricHp = Math.max(1, s.combatants.find((c) => c.id === 'rival')?.hp ?? osricHp);
        return true;
      };
      let ok = fight([enemyCombatant('ossuary_rat', 'r', 'B', 1)], false, 'rata');
      hp = Math.max(1, hp - 10); // la trampa del tutorial (y el paso de la poción)
      if (ok && hp / stats.maxHp < 0.6 && potions.n > 0) { potions.n--; hp = Math.min(stats.maxHp, hp + potionAmount(45, stats.maxHp)); }
      ok = ok && fight([enemyCombatant('bandit', 'b1', 'B', 1)], true, 'bandidos') && fight([enemyCombatant('bandit', 'b2', 'B', 1)], true, 'bandidos');
      ok = ok && fight([rivalCombatant('osric', getWanderer('osric').stats.maxHp, 'B', 1, 1)], false, 'osric');
      if (!ok) d.total++;
    }
    for (const k of Object.keys(d)) d[k] /= runs;
    res[cls] = d;
  }
  return res;
}

export { getEnemy };

/** S1 con equipo inicial y un jugador que solo ataca (el caso del jugador nuevo). */
export function noviceRows(runs: number): Row[] {
  const s1 = SUBZONES.afueras;
  return (['warrior', 'mage'] as Cls[]).flatMap((cls) => [1, 5].map((lv) => scenario(`S1 · nv ${lv} · novato`, { cls, sub: 'afueras', level: lv, gear: starter(cls), enemies: s1.enemies.map((e) => e.id), enemyLevel: zoneEnemyLevel(s1, lv), potions: TUNE.s1Potions, pairChance: 0.25, headHits: false, pulsesBetween: 8, bandages: 0, novice: true }, runs)));
}
