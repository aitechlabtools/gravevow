import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { addToGrid, LAYOUTS, countItem } from '../src/core/inventory';
import { makeUid } from '../src/core/rng';
import { applyRune, runeBlock, runeSlots, stackAffixes } from '../src/core/runes';
import { RUNE_RECIPES, RUNES } from '../src/core/data/runes';
import { AFFIXES, rollAffixes, stackStats } from '../src/core/data/rarity';
import { getItem } from '../src/core/data/items';
import { sellPrice } from '../src/core/economy';
import { CRAFT_RECIPES } from '../src/core/crafting';
import type { ItemStack, Profile, Rarity } from '../src/core/types';

// Bloque 2, parte 2.1: runas del Atril rúnico.
const base = (lab = 3): Profile => ({ ...createProfile('R', 'warrior', { cloak: 0, skin: 0 }), refuge: { cot: 1, kitchen: 0, bench: 0, infirmary: 0, forge: 0, alchemy: lab, tannery: 0, armory: 0, v: 3 } });
function give(p: Profile, st: Omit<ItemStack, 'uid'>): Profile {
  const r = addToGrid(p.stash, { uid: makeUid(), ...st }, LAYOUTS.stash);
  return { ...p, stash: r.grid };
}
const sword = (rarity: Rarity, extra: Partial<ItemStack> = {}) => ({ itemId: 'iron_sword', qty: 1, rarity, ...extra });
const idx = (p: Profile, id: string) => p.stash.findIndex((x) => x?.itemId === id);

const rollAffixesNever = () => Object.keys(AFFIXES).filter((a) => a.startsWith('rune_')).every((a) => Array.from({ length: 200 }, (_, i) => rollAffixes(getItem('iron_sword'), 'epic', mulberry(i))).flat().indexOf(a) < 0);
function mulberry(seed: number) { let t = seed + 0x6d2b79f5; return () => { t = (t + 0x6d2b79f5) | 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }

describe('Runas', () => {
  it('huecos por rareza; lo legendario no se encanta', () => {
    expect(runeSlots({ uid: 'a', ...sword('common') })).toBe(1);
    expect(runeSlots({ uid: 'a', ...sword('uncommon') })).toBe(1);
    expect(runeSlots({ uid: 'a', ...sword('rare') })).toBe(2);
    expect(runeSlots({ uid: 'a', ...sword('epic') })).toBe(2);
    expect(runeSlots({ uid: 'a', ...sword('legendary') })).toBe(0);
  });

  it('grabar gasta la runa, suma el atributo y sustituye la del hueco', () => {
    let p = give(give(base(), sword('common')), { itemId: 'rune_stone', qty: 1 });
    p = give(p, { itemId: 'rune_hermit', qty: 1 });
    const loc = { kind: 'grid', container: 'stash', index: idx(p, 'iron_sword') } as const;
    const r = applyRune(p, loc, 0, 'rune_stone');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const st = r.profile.stash.find((x) => x?.itemId === 'iron_sword')!;
    expect(stackAffixes(st)).toContain('rune_stone');
    expect((stackStats(st, getItem('iron_sword')).def ?? 0) - (stackStats({ ...st, runes: [] }, getItem('iron_sword')).def ?? 0)).toBe(2);
    expect(countItem(r.profile.stash, 'rune_stone')).toBe(0);
    const r2 = applyRune(r.profile, { kind: 'grid', container: 'stash', index: idx(r.profile, 'iron_sword') }, 0, 'rune_hermit');
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    const st2 = r2.profile.stash.find((x) => x?.itemId === 'iron_sword')!;
    expect(st2.runes).toEqual(['rune_hermit']);
    expect(r2.note).toMatch(/sustituye/);
  });

  it('pide el atril a nivel 3, no repite atributo y la del vampiro solo en armas', () => {
    const st: ItemStack = { uid: 'x', ...sword('rare', { runes: ['rune_stone', null] }) };
    const p = give(give(base(), { itemId: 'rune_stone', qty: 1 }), { itemId: 'rune_vampire', qty: 1 });
    expect(runeBlock(base(2), st, 0, 'rune_stone')).toMatch(/nivel 3/);
    expect(runeBlock(p, st, 1, 'rune_stone')).toMatch(/ya tiene/);
    expect(runeBlock(p, st, 0, 'rune_stone')).toBeNull();
    expect(runeBlock(p, st, 1, 'rune_vampire')).toBeNull();
    expect(rollAffixesNever()).toBe(true);
    expect(runeBlock(p, { uid: 'y', itemId: 'chainmail', qty: 1 }, 0, 'rune_vampire')).toMatch(/armas/);
  });

  it('las runas no suben el precio de venta ni se hacen gratis', () => {
    const plain: ItemStack = { uid: 'a', ...sword('common') };
    expect(sellPrice('iron_sword', { ...plain, runes: ['rune_stone'] } as ItemStack)).toBe(sellPrice('iron_sword', plain));
    for (const r of RUNE_RECIPES) {
      expect(RUNES[r.result]).toBeTruthy();
      expect(r.station).toBe('alchemy');
      expect(r.level).toBe(3);
      expect(CRAFT_RECIPES).toContain(r);
    }
  });

  it('Laboratorio de Eldrin: la Mesa de alquimia y el Atril rúnico unidos; cada objeto tiene una sola receta', () => {
    const seen = new Set<string>();
    for (const r of CRAFT_RECIPES) { expect(seen.has(r.result)).toBe(false); seen.add(r.result); }
    const magic = CRAFT_RECIPES.filter((r) => ['staff', 'wand', 'tome', 'orb'].includes(getItem(r.result).family ?? ''));
    expect(magic.length).toBeGreaterThan(0);
    for (const r of magic) expect(r.station).toBe('alchemy');
    for (const r of CRAFT_RECIPES) expect(['kitchen', 'bench', 'infirmary', 'forge', 'alchemy', 'tannery', 'armory']).toContain(r.station);
  });
});
