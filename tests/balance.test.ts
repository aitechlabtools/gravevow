import { describe, expect, it } from 'vitest';
import { intentResponse } from './intentPlayer';
import { opponents, createCombat, performAction, runAITurn, currentActor, canUseSkill, getCombatant, type CombatState, type CombatAction } from '../src/core/combat';
import { getSkill } from '../src/core/data/skills';
import { enemyCombatant, playerCombatant } from '../src/core/combatants';
import { createProfile } from '../src/core/profile';
import type { ClassId, Equipment } from '../src/core/types';
import { emptyEquipment } from '../src/core/inventory';

// Simulación de balance: un jugador "razonable" contra cada criatura.
function simulate(cls: ClassId, enemyId: string, runs = 300, potions = 2, level = 1, gear?: Equipment) {
  const base = createProfile('Sim', cls, { cloak: 0, skin: 0 });
  const p = { ...base, character: { ...base.character, level }, equipment: gear ?? base.equipment };
  let wins = 0;
  for (let seed = 1; seed <= runs; seed++) {
    let left = potions;
    const pl = playerCombatant(p.character, p.equipment, 999, 999);
    let s: CombatState = createCombat([pl, enemyCombatant(enemyId, 'e', 'B', level)], seed * 7919, { canFlee: false });
    let guard = 0;
    while (!s.outcome && guard++ < 300) {
      const a = currentActor(s)!;
      if (a.control !== 'player') { s = runAITurn(s); continue; }
      const me = getCombatant(s, 'player');
      if (me.hp / me.stats.maxHp < 0.35 && left > 0) { left--; s = performAction(s, { type: 'item', itemId: 'health_potion' }); continue; }
      // Jugador razonable: usa su habilidad de clase cuando conviene y el mejor ataque que pueda pagar
      const offensive = me.skills.map(getSkill).filter((k) => k.target === 'enemy' && canUseSkill(me, k.id)).sort((x, y) => (y.power ?? 0) - (x.power ?? 0));
      const cheapest = Math.min(...me.skills.map(getSkill).filter((k) => k.target === 'enemy').map((k) => k.cost));
      const read = intentResponse(s, me);
      if (read) { s = performAction(s, read); continue; }
      // Con un auxiliar del jefe en juego, primero el más débil
      const tgt = opponents(s, me).sort((x, y) => x.hp - y.hp)[0].id;
      let action: CombatAction = { type: 'attack', targetId: tgt };
      void cheapest;
      if (me.skills.includes('mana_shield') && canUseSkill(me, 'mana_shield') && !me.shield) action = { type: 'skill', skillId: 'mana_shield' };
      else if (me.skills.includes('war_cry') && canUseSkill(me, 'war_cry') && !me.statuses.some((x) => x.id === 'empower') && s.round <= 1) action = { type: 'skill', skillId: 'war_cry' };
      else if (offensive.length && (seed % 2 === 0 || me.mp >= me.stats.maxMp - 4)) action = { type: 'skill', skillId: offensive[0].id, targetId: tgt };
      s = performAction(s, action);
    }
    if (s.outcome === 'victory') wins++;
  }
  return wins / runs;
}

describe('Balance de la demo (nivel 1, equipo inicial)', () => {
  const table: [ClassId, string, number, number][] = [
    ['warrior', 'skeleton', 0.9, 1], ['warrior', 'bat', 0.9, 1], ['mage', 'skeleton', 0.85, 1], ['mage', 'bat', 0.85, 1],
    ['warrior', 'ossuary_lord', 0.15, 0.85], ['mage', 'ossuary_lord', 0.1, 0.85],
  ];
  for (const [cls, en, min, max] of table) {
    it(`${cls} vs ${en}`, () => {
      const r = simulate(cls, en, 200, en === 'ossuary_lord' ? 3 : 2);
      console.log(`${cls} vs ${en}: ${(r * 100).toFixed(0)}% victorias`);
      expect(r).toBeGreaterThanOrEqual(min);
      expect(r).toBeLessThanOrEqual(max);
    });
  }
});

const kit = (items: Partial<Record<keyof Equipment, string>>): Equipment => {
  const e = emptyEquipment();
  for (const [k, v] of Object.entries(items)) e[k as keyof Equipment] = { uid: k, itemId: v!, qty: 1 };
  return e;
};
const GEAR: Record<number, Record<'warrior' | 'mage', Equipment>> = {
  14: {
    warrior: kit({ mainHand: 'knight_sword', offHand: 'iron_shield', helmet: 'iron_helm', armor: 'chainmail', gloves: 'gauntlets', boots: 'worn_boots' }),
    mage: kit({ mainHand: 'frost_staff', offHand: 'arcane_tome', helmet: 'wizard_hat', armor: 'shadow_robe', boots: 'worn_boots' }),
  },
  24: {
    warrior: kit({ mainHand: 'dread_blade', offHand: 'bastion_shield', helmet: 'knight_helm', armor: 'bastion_plate', gloves: 'gauntlets', boots: 'swift_boots', ring: 'ring_of_embers' }),
    mage: kit({ mainHand: 'runic_staff', offHand: 'eclipse_grimoire', helmet: 'wizard_hat', armor: 'archmage_robe', boots: 'swift_boots', ring: 'ring_of_embers' }),
  },
};

describe('Balance con progresión (equipo acorde al nivel, criaturas escaladas)', () => {
  for (const level of [14, 24]) {
    for (const cls of ['warrior', 'mage'] as const) {
      it(`${cls} nivel ${level}`, () => {
        const sk = simulate(cls, 'skeleton', 150, 2, level, GEAR[level][cls]);
        const boss = simulate(cls, 'ossuary_lord', 150, 3, level, GEAR[level][cls]);
        console.log(`${cls} nv${level}: esqueleto ${(sk * 100).toFixed(0)}% · jefe ${(boss * 100).toFixed(0)}%`);
        expect(sk).toBeGreaterThanOrEqual(0.9);
        expect(boss).toBeGreaterThanOrEqual(0.2);
        expect(boss).toBeLessThanOrEqual(0.97);
      });
    }
  }
});

// ── Zonas profundas: equipo de la zona contra sus criaturas y su jefe ──
const ZONE_GEAR: Record<string, { level: number; warrior: Equipment; mage: Equipment; normals: string[]; boss: string }> = {
  mazmorra: {
    level: 18, normals: ['bandit', 'renegade_archer', 'ossuary_rat', 'skeleton'], boss: 'bandit_captain',
    warrior: kit({ mainHand: 'knight_sword', offHand: 'iron_shield', helmet: 'iron_helm', armor: 'chainmail', gloves: 'gauntlets', boots: 'worn_boots' }),
    mage: kit({ mainHand: 'frost_staff', offHand: 'arcane_tome', helmet: 'wizard_hat', armor: 'shadow_robe', boots: 'worn_boots' }),
  },
  cripta: {
    level: 45, normals: ['ghoul', 'wraith', 'bone_archer', 'tomb_guardian', 'necro_priest'], boss: 'veiled_queen',
    warrior: kit({ mainHand: 'gravewarden_blade', offHand: 'headstone_shield', helmet: 'silver_helm', armor: 'bastion_plate', gloves: 'silver_gauntlets', boots: 'grave_boots', amulet: 'reliquary_amulet' }),
    mage: kit({ mainHand: 'requiem_staff', offHand: 'funeral_grimoire', helmet: 'mourner_hood', armor: 'shroud_robe', boots: 'grave_boots', amulet: 'reliquary_amulet' }),
  },
  infierno: {
    level: 80, normals: ['ember_imp', 'abyss_hound', 'pit_temptress', 'hell_knight', 'sulfur_caller'], boss: 'belzar',
    warrior: kit({ mainHand: 'hellforged_blade', offHand: 'demonscale_shield', helmet: 'hellsteel_helm', armor: 'hellsteel_plate', gloves: 'demon_gauntlets', boots: 'cinder_boots', ring: 'ember_ring', amulet: 'reliquary_amulet' }),
    mage: kit({ mainHand: 'abyss_scepter', offHand: 'burning_tome', helmet: 'ash_cowl', armor: 'ash_robe', boots: 'cinder_boots', ring: 'ember_ring', amulet: 'reliquary_amulet' }),
  },
};

describe('Balance por zona (nivel medio de la zona, su equipo)', () => {
  for (const [zone, g] of Object.entries(ZONE_GEAR)) {
    for (const cls of ['warrior', 'mage'] as const) {
      it(`${zone} · ${cls} nivel ${g.level}`, () => {
        const normals = g.normals.map((e) => simulate(cls, e, 100, 2, g.level, g[cls]));
        const boss = simulate(cls, g.boss, 120, 3, g.level, g[cls]);
        console.log(`${zone} ${cls} nv${g.level}: ${g.normals.map((e, i) => `${e} ${(normals[i] * 100).toFixed(0)}%`).join(' · ')} · ${g.boss} ${(boss * 100).toFixed(0)}%`);
        for (const r of normals) expect(r).toBeGreaterThanOrEqual(0.8);
        expect(boss).toBeGreaterThanOrEqual(0.2);
        expect(boss).toBeLessThanOrEqual(0.97);
      });
    }
  }
});

// ── Subzonas: a la mitad de su rango, con el equipo de su zona ──
import { SUBZONES, SUBZONE_ORDER } from '../src/core/data/subzones';
describe('Balance por subzona', () => {
  for (const id of SUBZONE_ORDER) {
    const sz = SUBZONES[id];
    const g = ZONE_GEAR[sz.zone];
    const lv = Math.round((sz.levels[0] + sz.levels[1]) / 2);
    for (const cls of ['warrior', 'mage'] as const) {
      it(`${id} · ${cls} nivel ${lv}`, () => {
        const normals = sz.enemies.map((e) => simulate(cls, e.id, 60, 2, lv, g[cls]));
        const elite = simulate(cls, sz.elite, 80, 3, lv + 2, g[cls]);
        const boss = simulate(cls, sz.boss, 80, 3, Math.min(sz.levels[1] + 3, lv + 3), g[cls]);
        console.log(`${id} ${cls} nv${lv}: ${sz.enemies.map((e, i) => `${e.id} ${(normals[i] * 100).toFixed(0)}%`).join(' · ')} · élite ${(elite * 100).toFixed(0)}% · jefe ${(boss * 100).toFixed(0)}%`);
        for (const r of normals) expect(r).toBeGreaterThanOrEqual(0.75);
        expect(elite).toBeGreaterThanOrEqual(0.35);
        // Belzar es el jefe final: con el equipo de nivel 80 de la prueba solo se espera alguna victoria
        expect(boss).toBeGreaterThanOrEqual(id === 'trono' ? 0.05 : 0.15);
        expect(boss).toBeLessThanOrEqual(0.99);
      });
    }
  }
});
