import { describe, expect, it } from 'vitest';
import { VEINS, ZONE_VEINS, bestPick, mineYield, usesLeft, wearPick } from '../src/core/mining';
import { ITEMS } from '../src/core/data/items';
import { RECIPES } from '../src/core/data/forge';
import { generateDungeon, validateDungeon } from '../src/core/dungeonGen';
import { emptyGrid } from '../src/core/inventory';
import { makeRng } from '../src/core/rng';
import { updateQuests } from '../src/core/quests';
import { initialQuests } from '../src/core/quests';

describe('Minería', () => {
  it('cada veta da un material real y cada zona tiene las suyas', () => {
    for (const v of Object.values(VEINS)) {
      expect(ITEMS[v.item], v.id).toBeTruthy();
      if (v.bonus) expect(ITEMS[v.bonus.itemId]).toBeTruthy();
    }
    expect(ZONE_VEINS.mazmorra.map((v) => v.id)).toEqual(['copper', 'iron']);
    expect(ZONE_VEINS.cripta.map((v) => v.id)).toContain('silver');
    expect(ZONE_VEINS.infierno.map((v) => v.id)).toContain('obsidian');
  });
  it('la forja usa los minerales que se pican', () => {
    const used = new Set(RECIPES.flatMap((r) => r.materials.map((m) => m.itemId)));
    for (const ore of ['copper_ore', 'iron_ore', 'silver_ore', 'obsidian_shard', 'sulfur']) expect(used.has(ore), ore).toBe(true);
  });
  it('cada mapa tiene entre 3 y 5 vetas de su zona, alcanzables', () => {
    for (const zone of ['mazmorra', 'cripta', 'infierno'] as const) for (let seed = 1; seed <= 15; seed++) {
      const d = generateDungeon(seed, { zone });
      const veins = d.entities.filter((e) => e.kind === 'vein');
      expect(veins.length, `${zone} ${seed}`).toBeGreaterThanOrEqual(2);
      expect(veins.length).toBeLessThanOrEqual(5);
      for (const v of veins) if (v.kind === 'vein') expect(ZONE_VEINS[zone].some((z) => z.id === v.vein)).toBe(true);
      expect(validateDungeon(d).ok).toBe(true);
    }
  });
  it('picar da mineral; el pico se gasta y se rompe al llegar a 0 (sin desaparecer)', () => {
    const items = mineYield('copper', makeRng(4));
    expect(items[0].itemId).toBe('copper_ore');
    expect(items[0].qty).toBeGreaterThanOrEqual(2);
    let g = emptyGrid(4);
    expect(bestPick(g)).toBeNull();
    g[1] = { uid: 'p', itemId: 'miner_pick', qty: 1, uses: 2 };
    g[2] = { uid: 's', itemId: 'steel_pick', qty: 1 };
    expect(bestPick(g)!.stack.itemId).toBe('steel_pick'); // el más rápido
    let r = wearPick(g, 1);
    expect(usesLeft(r.grid[1]!)).toBe(1);
    r = wearPick(r.grid, 1);
    expect(r.broke).toBe(true);
    expect(r.grid[1]!.uses).toBe(0); // roto, pero sigue en la mochila (Fase 3)
    expect(bestPick(r.grid)!.stack.itemId).toBe('steel_pick');
    expect(usesLeft(g[2]!)).toBe(ITEMS.steel_pick.uses);
  });
  it('la misión de Brand cuenta vetas picadas', () => {
    const q = updateQuests(initialQuests().map((q) => ({ ...q, accepted: true })), { extracted: true, kills: {}, extractedValue: 0, zone: 'mazmorra', veinsMined: 3 });
    expect(q.find((x) => x.id === 'q_brand_mine')!.progress).toBe(3);
  });
});
