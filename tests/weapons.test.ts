import { describe, expect, it } from 'vitest';
import { combatLoadout } from '../src/core/loadout';
import { createProfile, grantRecruitKit, needsRecruitKit, recruitGaps } from '../src/core/profile';
import { emptyEquipment, emptyGrid, addToGrid, canEquip, countItem } from '../src/core/inventory';
import { createCombat, performAction, rollDamage, getCombatant, currentActor, runAITurn } from '../src/core/combat';
import { enemyCombatant, playerCombatant, levelScale } from '../src/core/combatants';
import { makeRng } from '../src/core/rng';
import { ITEMS } from '../src/core/data/items';
import { SKILLS } from '../src/core/data/skills';
import { CLASSES } from '../src/core/data/classes';
import { CHEST_TABLES } from '../src/core/loot';
import { MERCHANT_STOCK } from '../src/core/data/merchant';
import type { Equipment } from '../src/core/types';

const eq = (items: Partial<Record<keyof Equipment, string>>): Equipment => {
  const e = emptyEquipment();
  for (const [k, v] of Object.entries(items)) e[k as keyof Equipment] = { uid: k, itemId: v!, qty: 1 };
  return e;
};

describe('Habilidades según clase y equipo', () => {
  it('sin nada en las manos: puñetazo, dos golpes sin arma, dos acciones de mano libre y la habilidad de clase', () => {
    const k = combatLoadout('warrior', emptyEquipment());
    expect(k.basicAttack.name).toBe('Puñetazo');
    expect(k.right.skills).toEqual(['low_blow', 'wild_swing']);
    expect(k.left.skills).toEqual(['brace', 'shove']);
    expect(k.skills).toEqual(['war_cry', 'low_blow', 'wild_swing', 'brace', 'shove']);
  });
  it('la espada da sus ataques; sin escudo no hay bloqueo', () => {
    const k = combatLoadout('warrior', eq({ mainHand: 'rusty_sword' }));
    expect(k.basicAttack.name).toBe('Tajo');
    expect(k.skills).toContain('rending_slash');
    expect(k.skills).not.toContain('block');
  });
  it('con escudo se habilitan las defensivas', () => {
    const k = combatLoadout('warrior', eq({ mainHand: 'rusty_sword', offHand: 'bastion_shield' }));
    // El Escudo del Bastión tenía 3: se quedan la primera (Bloqueo) y la propia (Muro de hierro)
    expect(k.left.skills).toEqual(['block', 'iron_wall']);
    expect(k.right.skills).toEqual(['rending_slash', 'thrust']);
  });
  it('la habilidad de clase está siempre, lleve lo que lleve', () => {
    for (const cls of ['warrior', 'mage'] as const) {
      expect(combatLoadout(cls, emptyEquipment()).skills).toContain(CLASSES[cls].classSkill);
      expect(combatLoadout(cls, eq({ mainHand: cls === 'warrior' ? 'dread_blade' : 'runic_staff' })).skills).toContain(CLASSES[cls].classSkill);
    }
  });
  it('cada báculo cambia los hechizos del mago', () => {
    expect(combatLoadout('mage', eq({ mainHand: 'apprentice_staff' })).skills).not.toContain('fireball');
    expect(combatLoadout('mage', eq({ mainHand: 'ember_staff' })).skills).toContain('fireball');
  });
  it('cada arma tiene ataque básico y 2 especiales (4 si es a dos manos), y todos existen', async () => {
    const { basicAttackOf, itemSpecials, isTwoHanded } = await import('../src/core/data/weapons');
    for (const it of Object.values(ITEMS)) {
      if (it.slot !== 'mainHand' && it.slot !== 'offHand') continue;
      if (it.slot === 'mainHand') expect(basicAttackOf(it).name, it.id).toBeTruthy();
      const sp = itemSpecials(it);
      expect(sp.length, it.id).toBe(it.grants?.length === 1 ? 1 : isTwoHanded(it) ? 4 : 2);
      for (const g of sp) expect(SKILLS[g], `${it.id} → ${g}`).toBeDefined();
    }
  });

  it('las armas son exclusivas de su clase', () => {
    expect(canEquip('rusty_sword', 'mainHand', { classId: 'mage', level: 10 })).not.toBeNull();
    expect(canEquip('apprentice_staff', 'mainHand', { classId: 'warrior', level: 10 })).not.toBeNull();
  });
});

describe('Requisitos de nivel', () => {
  it('todos los objetos equipables tienen nivel mínimo', () => {
    for (const it of Object.values(ITEMS)) if (it.slot) expect(it.levelReq, it.id).toBeGreaterThanOrEqual(1);
  });
  it('un arma de nivel 24 se puede guardar pero no equipar a nivel 14', () => {
    expect(canEquip('dread_blade', 'mainHand', { classId: 'warrior', level: 14 })).toMatch(/nivel 24/);
    expect(canEquip('dread_blade', 'mainHand', { classId: 'warrior', level: 24 })).toBeNull();
    const g = addToGrid(emptyGrid(4), { uid: 'x', itemId: 'dread_blade', qty: 1 }).grid;
    expect(countItem(g, 'dread_blade')).toBe(1);
  });
  it('el mercader solo vende objetos de nivel 7 o menos', () => {
    for (const id of MERCHANT_STOCK) expect(ITEMS[id].levelReq ?? 1, id).toBeLessThanOrEqual(7);
  });
  it('los cofres del jefe dan objetos de nivel 5 a 8', () => {
    const gear = CHEST_TABLES.boss.entries.map((e) => ITEMS[e.itemId]).filter((d) => d?.slot);
    expect(gear.every((d) => (d.levelReq ?? 1) >= 5)).toBe(true);
  });
  it('las criaturas se endurecen con el nivel del aventurero', () => {
    expect(enemyCombatant('skeleton', 'a', 'B', 5).stats.maxHp).toBeGreaterThan(enemyCombatant('skeleton', 'b', 'B', 1).stats.maxHp);
    expect(levelScale(1)).toBe(1);
  });
});

describe('Nuevos efectos de combate', () => {
  const p = createProfile('T', 'warrior', { cloak: 0, skin: 0 });
  const pl = () => playerCombatant(p.character, p.equipment, 999, 999);
  it('el bloqueo reduce el siguiente golpe y se gasta', () => {
    let s = createCombat([pl(), enemyCombatant('skeleton', 'e')], 3);
    s = performAction(s, { type: 'skill', skillId: 'block' });
    expect(getCombatant(s, 'player').statuses.some((x) => x.id === 'block')).toBe(true);
    let guard = 0;
    while (getCombatant(s, 'player').statuses.some((x) => x.id === 'block') && !s.outcome && guard++ < 10) {
      s = currentActor(s)!.control === 'player' ? performAction(s, { type: 'defend' }) : runAITurn(s);
    }
    expect(getCombatant(s, 'player').statuses.some((x) => x.id === 'block')).toBe(false);
  });
  it('la furia aumenta el daño causado', () => {
    const a = pl();
    const d = enemyCombatant('skeleton', 'e');
    const normal = rollDamage(a, d, 'physical', 1, makeRng(4), { ignoresEvasion: true }).amount;
    const furious = rollDamage({ ...a, statuses: [{ id: 'empower', turns: 2 }] }, d, 'physical', 1, makeRng(4), { ignoresEvasion: true }).amount;
    expect(furious).toBeGreaterThan(normal);
  });
  it('perforar armadura aumenta el daño', () => {
    const a = pl();
    const d = enemyCombatant('ossuary_lord', 'e');
    expect(rollDamage(a, d, 'physical', 1, makeRng(4), { ignoresEvasion: true, armorPierce: 0.5 }).amount).toBeGreaterThan(rollDamage(a, d, 'physical', 1, makeRng(4), { ignoresEvasion: true }).amount);
  });
  it('el escudo de maná absorbe daño antes que la vida', () => {
    const m = createProfile('M', 'mage', { cloak: 0, skin: 0 });
    let s = createCombat([playerCombatant(m.character, m.equipment, 999, 999), enemyCombatant('skeleton', 'e')], 2);
    if (currentActor(s)!.control !== 'player') s = runAITurn(s);
    s = performAction(s, { type: 'skill', skillId: 'mana_shield' });
    const p = getCombatant(s, 'player');
    expect(p.shield).toBe(Math.round(p.stats.maxHp * SKILLS.mana_shield.shieldPct!));
  });

});

describe('Kit de recluta', () => {
  it('rellena solo las ranuras vacías, con vendas, pan y agua sin acumular', () => {
    const p = { ...createProfile('K', 'warrior', { cloak: 0, skin: 0 }), backpack: emptyGrid(24), stash: emptyGrid(24), equipment: emptyEquipment() };
    expect(needsRecruitKit(p)).toBe(true);
    expect(recruitGaps(p)).toBe(true);
    const k = grantRecruitKit(p);
    expect(k.equipment.mainHand?.itemId).toBe('recruit_sword');
    expect(k.equipment.offHand?.itemId).toBe('plank_shield');
    expect(k.equipment.armor?.itemId).toBe('recruit_doublet');
    expect(countItem(k.backpack, 'bandage')).toBe(2);
    expect(countItem(k.backpack, 'stale_bread')).toBe(1);
    expect(recruitGaps(k)).toBe(false);
    // Otra vez sin armadura: solo vuelve la armadura y las vendas no se acumulan
    const again = grantRecruitKit({ ...k, equipment: { ...k.equipment, armor: null } });
    expect(again.equipment.mainHand?.uid).toBe(k.equipment.mainHand?.uid);
    expect(again.equipment.armor?.itemId).toBe('recruit_doublet');
    expect(countItem(again.backpack, 'bandage')).toBe(2);
    // Si la pieza de recluta está en el almacén, se usa esa (no se crea otra)
    const st = emptyGrid(24); st[3] = { uid: 'r1', itemId: 'recruit_doublet', qty: 1 };
    const fromStash = grantRecruitKit({ ...k, stash: st, equipment: { ...k.equipment, armor: null } });
    expect(fromStash.equipment.armor?.uid).toBe('r1');
    expect(fromStash.stash[3]).toBeNull();
  });

  it('no se vende, no se desguaza y no se pierde al morir', async () => {
    const { sell } = await import('../src/core/economy');
    const { scrapYield } = await import('../src/core/refuge');
    const p = grantRecruitKit({ ...createProfile('K', 'mage', { cloak: 0, skin: 0 }), backpack: emptyGrid(24), equipment: emptyEquipment() });
    expect(p.equipment.mainHand?.itemId).toBe('recruit_staff');
    const bp = [...p.backpack]; bp[10] = { uid: 'g', itemId: 'worn_grimoire', qty: 1 };
    const r = sell({ ...p, backpack: bp }, 'backpack', 10);
    expect(r.ok).toBe(false);
    expect(scrapYield(bp[10]!)).toBeNull();
    const { startExpedition, endExpedition } = await import('../src/core/expedition');
    const { profile: p2, expedition: e } = startExpedition({ ...p, backpack: bp }, 1);
    const out = endExpedition(p2, e, 'died', 2);
    expect(out.profile.equipment.mainHand?.itemId).toBe('recruit_staff');
    expect(out.profile.equipment.armor?.itemId).toBe('recruit_robe');
    expect(countItem(out.profile.backpack, 'worn_grimoire')).toBe(1);
    expect(countItem(out.profile.backpack, 'bandage')).toBe(0);
    expect(out.summary.lost.some((x) => x.itemId === 'recruit_staff')).toBe(false);
  });
});

describe('Combate nuevo (C1): recargas, recursos, rarezas', () => {
  it('cada especial de arma o secundaria tiene recarga', () => {
    for (const it of Object.values(ITEMS)) {
      if (it.slot !== 'mainHand' && it.slot !== 'offHand') continue;
      for (const g of combatLoadout('warrior', eq({ [it.slot]: it.id })).groups.flatMap((x) => x.skills)) {
        expect(SKILLS[g].cooldown, `${it.id} → ${g}`).toBeGreaterThan(0);
      }
    }
  });
  it('usar un especial lo deja en recarga y se recupera turno a turno', () => {
    const p = createProfile('Ana', 'warrior', { cloak: 0, skin: 0 });
    let s = createCombat([playerCombatant(p.character, eq({ mainHand: 'rusty_sword' }), 999, 999), { ...enemyCombatant('ossuary_lord', 'e'), hp: 99999, stats: { ...enemyCombatant('ossuary_lord', 'e').stats, maxHp: 99999, atk: 1, mag: 1, spd: 0 } }], 7);
    while (currentActor(s)?.id !== 'player') s = runAITurn(s);
    s = performAction(s, { type: 'skill', skillId: 'rending_slash', targetId: 'e' });
    const cd = SKILLS.rending_slash.cooldown!;
    expect(getCombatant(s, 'player').cooldowns?.rending_slash).toBe(cd);
    for (let t = cd; t > 0; t--) {
      while (currentActor(s)?.id !== 'player') s = runAITurn(s);
      expect(() => performAction(s, { type: 'skill', skillId: 'rending_slash', targetId: 'e' })).toThrow();
      s = performAction(s, { type: 'attack', targetId: 'e' });
    }
    while (currentActor(s)?.id !== 'player') s = runAITurn(s);
    expect(getCombatant(s, 'player').cooldowns?.rending_slash ?? 0).toBe(0);
  });
  it('las recargas pendientes pasan al combate siguiente', () => {
    const p = createProfile('Ana', 'warrior', { cloak: 0, skin: 0 });
    const c = playerCombatant(p.character, eq({ mainHand: 'rusty_sword' }), 999, 999, { rending_slash: 2 });
    expect(c.cooldowns).toEqual({ rending_slash: 2 });
  });
  it('el Guerrero usa Ímpetu y el Mago Maná; cada uno encuentra su poción', async () => {
    const { adaptDrops } = await import('../src/core/loot');
    expect(CLASSES.warrior.resourceName).toBe('Ímpetu');
    expect(CLASSES.mage.resourceName).toBe('Maná');
    expect(adaptDrops([{ uid: 'a', itemId: 'mana_potion', qty: 2 }], 'warrior')[0].itemId).toBe('focus_tonic');
    expect(adaptDrops([{ uid: 'a', itemId: 'focus_tonic', qty: 2 }], 'mage')[0].itemId).toBe('mana_potion');
  });
  it('la rareza de cada ejemplar cambia sus estadísticas y los atributos suman', async () => {
    const { stackStats, stackName } = await import('../src/core/data/rarity');
    const def = ITEMS.iron_sword; // poco común, +7 de ataque
    expect(stackStats({ uid: 'a', itemId: 'iron_sword', qty: 1 }, def).atk).toBe(7);
    expect(stackStats({ uid: 'a', itemId: 'iron_sword', qty: 1, rarity: 'epic' }, def).atk).toBe(Math.round(7 * 1.4 / 1.12));
    expect(stackStats({ uid: 'a', itemId: 'iron_sword', qty: 1, affixes: ['swift'] }, def).spd).toBe(2);
    expect(stackName({ uid: 'a', itemId: 'iron_sword', qty: 1, affixes: ['frost', 'vampire'] }, def)).toBe('Espada de hierro de escarcha del vampiro');
  });
});

describe('Habilidades de clase (C3)', () => {
  it('cada clase jugable tiene 5 y empieza con la primera equipada', async () => {
    for (const c of ['warrior', 'mage'] as const) {
      expect(CLASSES[c].classSkills).toHaveLength(5);
      for (const id of CLASSES[c].classSkills) expect(SKILLS[id]?.cooldown, id).toBeGreaterThan(0);
      const p = createProfile('A', c, { cloak: 0, skin: 0 });
      expect(p.classSkills).toEqual({ unlocked: [CLASSES[c].classSkills[0]], equipped: CLASSES[c].classSkills[0] });
    }
  });
  it('a los niveles 20/40/60/80 se elige cuál desbloquear, en cualquier orden', async () => {
    const { pendingUnlocks, unlockClassSkill, equipClassSkill } = await import('../src/core/classSkills');
    let p = createProfile('A', 'warrior', { cloak: 0, skin: 0 });
    expect(pendingUnlocks(p)).toBe(0);
    expect(unlockClassSkill(p, 'last_bastion')).toBeNull();
    p = { ...p, character: { ...p.character, level: 40 } };
    expect(pendingUnlocks(p)).toBe(2);
    p = unlockClassSkill(p, 'last_bastion')!; // la de «nivel 80» la primera: se puede
    expect(pendingUnlocks(p)).toBe(1);
    expect(equipClassSkill(p, 'hold_line')).toBeNull();
    p = equipClassSkill(p, 'last_bastion')!;
    expect(playerCombatant(p.character, p.equipment, 999, 999, {}, p.classSkills.equipped).skills).toContain('last_bastion');
  });
  it('torbellino golpea a todos, aguante deja a 1 de vida y el pacto reinicia recargas', () => {
    const p = createProfile('A', 'warrior', { cloak: 0, skin: 0 });
    const me = playerCombatant({ ...p.character, level: 60 }, p.equipment, 999, 999, {}, 'steel_whirl');
    const e1 = { ...enemyCombatant('skeleton', 'a'), stats: { ...enemyCombatant('skeleton', 'a').stats, spd: 0, eva: 0 } };
    const e2 = { ...enemyCombatant('skeleton', 'b'), stats: { ...enemyCombatant('skeleton', 'b').stats, spd: 0, eva: 0 } };
    let s = createCombat([{ ...me, stats: { ...me.stats, spd: 99 } }, e1, e2], 3);
    s = performAction(s, { type: 'skill', skillId: 'steel_whirl', targetId: 'a' });
    expect(getCombatant(s, 'a').hp).toBeLessThan(e1.hp);
    expect(getCombatant(s, 'b').hp).toBeLessThan(e2.hp);
    const m = createProfile('M', 'mage', { cloak: 0, skin: 0 });
    let t = createCombat([{ ...playerCombatant(m.character, m.equipment, 999, 999, { spark: 3 }, 'blood_pact'), stats: { ...playerCombatant(m.character, m.equipment, 999, 999).stats, spd: 99 } }, enemyCombatant('skeleton', 'e')], 4);
    t = performAction(t, { type: 'skill', skillId: 'blood_pact' });
    expect(getCombatant(t, 'player').cooldowns).toEqual({ blood_pact: SKILLS.blood_pact.cooldown });
  });
});

describe('Armas y equipo por subzona (C4)', () => {
  it('cada subzona trae entre 2 y 7 objetos nuevos, con iconos y nivel dentro de su rango', async () => {
    const { itemsOfSubzone } = await import('../src/core/data/subzoneItems');
    const { SUBZONES, SUBZONE_ORDER } = await import('../src/core/data/subzones');
    for (const id of SUBZONE_ORDER) {
      const items = itemsOfSubzone(id);
      expect(items.length, id).toBeGreaterThanOrEqual(2);
      for (const it of items) {
        expect(it.levelReq!, it.id).toBeGreaterThanOrEqual(SUBZONES[id].levels[0] - 1);
        expect(it.levelReq!, it.id).toBeLessThanOrEqual(SUBZONES[id].levels[1]);
      }
    }
  });
  it('bajar de subzona da mejor arma', async () => {
    const { itemsOfSubzone } = await import('../src/core/data/subzoneItems');
    const best = (sub: string) => Math.max(...itemsOfSubzone(sub).filter((i) => i.slot === 'mainHand' && i.classes?.includes('warrior')).map((i) => i.stats?.atk ?? 0));
    expect(best('osario')).toBeGreaterThan(best('afueras'));
    expect(best('trono')).toBeGreaterThan(best('puertas') - 1);
  });
  it('un arma a dos manos manda lo de la mano izquierda a la mochila', async () => {
    const { transfer } = await import('../src/core/inventory');
    const c = { backpack: emptyGrid(24), stash: emptyGrid(24), shared: [], loot: emptyGrid(12), pocket: emptyGrid(4), equipment: eq({ mainHand: 'rusty_sword', offHand: 'wooden_shield' }) };
    c.backpack[0] = { uid: 'gs', itemId: 'jailer_greatsword', qty: 1 };
    const r = transfer(c, { kind: 'grid', container: 'backpack', index: 0 }, { kind: 'equip', slot: 'mainHand' }, { classId: 'warrior', level: 30 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.containers.equipment.offHand).toBeNull();
      expect(r.containers.backpack.some((x) => x?.itemId === 'wooden_shield')).toBe(true);
      expect(combatLoadout('warrior', r.containers.equipment).right.skills).toHaveLength(4);
    }
  });
  it('los cofres de una subzona pueden dar sus objetos nuevos', async () => {
    const { subzoneChestTable, CHEST_TABLES } = await import('../src/core/loot');
    const t = subzoneChestTable(CHEST_TABLES.common, [1, 10], 0, 'afueras');
    expect(t.entries.some((e) => e.itemId === 'guard_spear')).toBe(true);
  });
});

describe('Rarezas por tirada y atributos (C5)', () => {
  it('las subzonas hondas y los cofres con llave dan rarezas más altas', async () => {
    const { rollRarity, RARITY_ORDER } = await import('../src/core/data/rarity');
    const avg = (depth: number, bonus: number) => {
      const rng = makeRng(11); let sum = 0;
      for (let i = 0; i < 2000; i++) sum += RARITY_ORDER.indexOf(rollRarity(ITEMS.iron_sword, { depth, bonus }, () => rng.next()));
      return sum / 2000;
    };
    expect(avg(9, 0)).toBeGreaterThan(avg(0, 0));
    expect(avg(0, 2)).toBeGreaterThan(avg(0, 0));
    expect(rollRarity(ITEMS.queens_veil, { depth: 0, bonus: 0 }, Math.random)).toBe('legendary');
  });
  it('los atributos salen según la rareza y encajan con el objeto', async () => {
    const { rollAffixes, AFFIXES } = await import('../src/core/data/rarity');
    const rng = makeRng(3);
    expect(rollAffixes(ITEMS.iron_sword, 'common', () => rng.next())).toHaveLength(0);
    expect(rollAffixes(ITEMS.iron_sword, 'epic', () => rng.next())).toHaveLength(2);
    for (let i = 0; i < 50; i++) for (const a of rollAffixes(ITEMS.iron_helm, 'epic', () => rng.next())) expect(AFFIXES[a].on).not.toBe('weapon');
  });
  it('un arma rara recarga su primer especial 1 turno antes y una épica además pega más', () => {
    const p = createProfile('A', 'warrior', { cloak: 0, skin: 0 });
    const rare = playerCombatant(p.character, eq({ mainHand: 'iron_sword' }), 999, 999);
    expect(rare.skillMods ?? {}).toEqual({});
    const e2 = { ...eq({}), mainHand: { uid: 'x', itemId: 'iron_sword', qty: 1, rarity: 'epic' as const } };
    const epic = playerCombatant(p.character, e2, 999, 999);
    expect(epic.skillMods?.rending_slash).toEqual({ cooldown: -1, power: 0.15 });
    expect(epic.skillMods?.thrust).toEqual({ cooldown: 0, power: 0.15 });
  });
  it('del vampiro cura al golpear; de sangrado hace sangrar con el básico', () => {
    const p = createProfile('A', 'warrior', { cloak: 0, skin: 0 });
    const e2 = { ...eq({}), mainHand: { uid: 'x', itemId: 'iron_sword', qty: 1, affixes: ['vampire', 'bleeding'] } };
    const me = playerCombatant(p.character, e2, 50, 999);
    expect(me.affixes).toEqual(['vampire', 'bleeding']);
    let healed = false; let bled = false;
    for (let seed = 1; seed < 40 && !(healed && bled); seed++) {
      const foe = enemyCombatant('ossuary_lord', 'e');
      let s = createCombat([{ ...me, stats: { ...me.stats, spd: 99 } }, { ...foe, stats: { ...foe.stats, eva: 0 } }], seed);
      s = performAction(s, { type: 'attack', targetId: 'e' });
      if (getCombatant(s, 'player').hp > 50) healed = true;
      if (getCombatant(s, 'e').statuses.some((x) => x.id === 'bleed')) bled = true;
    }
    expect(healed).toBe(true);
    expect(bled).toBe(true);
  });
});
