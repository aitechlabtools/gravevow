import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { durability, fieldRepair, isBroken, maxDurability, wearEquipment, wearLevel, withDurability, repairCost } from '../src/core/durability';
import { repair, repairJobs } from '../src/core/repair';
import { computeStats } from '../src/core/stats';
import { combatLoadout } from '../src/core/loadout';
import { playerCombatant, enemyCombatant } from '../src/core/combatants';
import { createCombat, performAction, runAITurn, currentActor, getCombatant } from '../src/core/combat';
import { wearPick } from '../src/core/mining';
import { addToGrid, emptyGrid } from '../src/core/inventory';
import { earnGold } from '../src/core/wallet';
import { DURABILITY } from '../src/config/durability';
import type { Equipment, ItemStack } from '../src/core/types';

// Fase 3: durabilidad, avisos, roturas sin pérdida y reparación.

const warrior = () => createProfile('Sim', 'warrior', { cloak: 0, skin: 0 });
const broken = (st: ItemStack) => withDurability(st, 0);

describe('durabilidad', () => {
  it('las piezas nuevas están enteras y anillos y amuletos no se desgastan', () => {
    const p = warrior();
    const w = p.equipment.mainHand!;
    expect(maxDurability(w)).toBe(DURABILITY.byRarity[w.rarity ?? 'common'] ?? maxDurability(w));
    expect(durability(w)).toBe(maxDurability(w));
    expect(wearLevel(w)).toBe('ok');
    expect(maxDurability({ uid: 'r', itemId: 'health_potion', qty: 1 })).toBe(0);
  });

  it('avisa al 25 % y al 10 % y llega a rota sin bajar de 0', () => {
    const w = warrior().equipment.mainHand!;
    const max = maxDurability(w);
    let eq: Equipment = { ...warrior().equipment, mainHand: withDurability(w, Math.floor(max * 0.25) + 1) };
    let r = wearEquipment(eq, 1, 0);
    expect(r.notices.map((n) => n.level)).toEqual(['worn']);
    eq = { ...eq, mainHand: withDurability(w, Math.floor(max * 0.1) + 1) };
    r = wearEquipment(eq, 1, 0);
    expect(r.notices[0].level).toBe('critical');
    r = wearEquipment(r.equipment, 999, 0);
    expect(r.notices[0].level).toBe('broken');
    expect(durability(r.equipment.mainHand!)).toBe(0);
    // Roto no se destruye: sigue en su hueco
    expect(r.equipment.mainHand!.itemId).toBe(w.itemId);
    // Ya roto: no se repite el aviso
    expect(wearEquipment(r.equipment, 5, 0).notices).toEqual([]);
  });

  it('los golpes recibidos se reparten entre las piezas de armadura', () => {
    const p = warrior();
    const armor = (['offHand', 'helmet', 'armor', 'gloves', 'boots'] as const).filter((sl) => p.equipment[sl] && maxDurability(p.equipment[sl]!) > 0);
    const r = wearEquipment(p.equipment, 0, armor.length * 2);
    for (const sl of armor) expect(maxDurability(p.equipment[sl]!) - durability(r.equipment[sl]!)).toBe(2);
    expect(durability(r.equipment.mainHand!)).toBe(maxDurability(p.equipment.mainHand!));
  });

  it('lo roto no da estadísticas ni especiales, pero queda el ataque básico', () => {
    const p = warrior();
    const eq = { ...p.equipment, mainHand: broken(p.equipment.mainHand!) };
    const whole = computeStats('warrior', 5, p.equipment), br = computeStats('warrior', 5, eq);
    expect(br.atk).toBeLessThan(whole.atk);
    const lo = combatLoadout('warrior', eq);
    expect(lo.right.skills).toEqual([]);
    expect(lo.right.label).toContain('(rota)');
    expect(lo.basicAttack).toEqual(combatLoadout('warrior', p.equipment).basicAttack);
    expect(lo.skills.length).toBeGreaterThan(0); // la habilidad de clase sigue
    expect(isBroken(eq.mainHand)).toBe(true);
  });

  it('el combate cuenta ataques y golpes del jugador y sobrevive a JSON', () => {
    const p = warrior();
    const me = playerCombatant({ ...p.character, level: 5 }, p.equipment, 999, 999);
    let s = createCombat([me, enemyCombatant('bandit', 'e1', 'B', 1)], 7);
    for (let g = 0; !s.outcome && g < 200; g++) {
      s = currentActor(s)!.control === 'player' ? performAction(s, { type: 'attack', targetId: 'e1' }) : runAITurn(s);
      s = JSON.parse(JSON.stringify(s));
    }
    const pl = getCombatant(s, 'player');
    expect(pl.wear!.hits).toBeGreaterThan(0);
    expect(pl.wear!.swings).toBeGreaterThan(0);
    expect(enemyCombatant('bandit', 'x', 'B', 1).wear).toBeUndefined();
  });

  it('el pico gastado no desaparece: queda a 0 hasta repararlo', () => {
    const grid = addToGrid(emptyGrid(4), { uid: 'p', itemId: 'miner_pick', qty: 1, uses: 1 }).grid;
    const r = wearPick(grid, 0);
    expect(r.broke).toBe(true);
    expect(r.grid[0]?.itemId).toBe('miner_pick');
    expect(isBroken(r.grid[0])).toBe(true);
  });
});

describe('reparación', () => {
  it('el kit de campo repara parte de todo lo puesto y los picos', () => {
    const p = warrior();
    const eq = { ...p.equipment, mainHand: broken(p.equipment.mainHand!) };
    const bp = addToGrid(emptyGrid(4), { uid: 'p', itemId: 'miner_pick', qty: 1, uses: 0 }).grid;
    const r = fieldRepair(eq, bp);
    expect(r.repaired).toBe(2);
    expect(durability(r.equipment.mainHand!)).toBe(Math.ceil(maxDurability(eq.mainHand!) * DURABILITY.kitShare));
    expect(isBroken(r.equipment.mainHand)).toBe(false);
    expect(r.backpack[0]!.uses).toBeGreaterThan(0);
    expect(fieldRepair(p.equipment, emptyGrid(4)).repaired).toBe(0);
  });

  it('Brand cobra del almacén y deja todo como nuevo', () => {
    let p = warrior();
    p = { ...p, equipment: { ...p.equipment, mainHand: broken(p.equipment.mainHand!) } };
    const jobs = repairJobs(p);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].cost).toBe(repairCost(p.equipment.mainHand!));
    expect(jobs[0].cost).toBeGreaterThan(0);
    const poor = { ...p, gold: 0 };
    expect(repair(poor).ok).toBe(false);
    const rich = earnGold(p, 500);
    if (!rich.ok) throw new Error(rich.error);
    const before = rich.profile.gold;
    const r = repair(rich.profile);
    if (!r.ok) throw new Error(r.error);
    expect(r.profile.gold).toBe(before - jobs[0].cost);
    expect(isBroken(r.profile.equipment.mainHand)).toBe(false);
    expect(r.profile.equipment.mainHand!.dur).toBeUndefined();
    expect(repairJobs(r.profile)).toHaveLength(0);
  });
});
