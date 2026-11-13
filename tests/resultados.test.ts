// Resumen al salir (13/11): solo el botín nuevo, el oro conseguido y lo que salva el bolsillo.
import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { startExpedition, endExpedition, gainedItems, visitedSubzones } from '../src/core/expedition';
import { addToGrid, LAYOUTS, removeAt } from '../src/core/inventory';
import type { ItemStack } from '../src/core/types';

const coins = (qty: number): ItemStack => ({ uid: 'c' + qty, itemId: 'gold_coins', qty });

describe('Botín conseguido', () => {
  it('no enseña lo que ya llevabas y cuenta solo el oro de más', () => {
    let p = createProfile('Aldric', 'warrior', { cloak: 0, skin: 0 });
    p = { ...p, backpack: addToGrid(p.backpack, coins(5), LAYOUTS.backpack).grid };
    const { expedition } = startExpedition(p, 0);
    let bp = expedition.backpack;
    bp = addToGrid(bp, { uid: 'n1', itemId: 'iron_ore', qty: 3 }, LAYOUTS.backpack).grid;
    bp = addToGrid(bp, { uid: 'n2', itemId: 'dread_blade', qty: 1, rarity: 'legendary' }, LAYOUTS.backpack).grid;
    bp = addToGrid(bp, coins(12), LAYOUTS.backpack).grid;
    const { summary } = endExpedition(p, { ...expedition, backpack: bp }, 'extracted', 1000);
    expect(summary.gained!.map((s) => s.itemId)).toEqual(['dread_blade', 'iron_ore']);
    expect(summary.gained!.find((s) => s.itemId === 'iron_ore')!.qty).toBe(3);
    expect(summary.goldGained).toBe(12);
    expect(summary.lootValue).toBeGreaterThan(12);
    expect(summary.gained!.some((s) => s.itemId === 'gold_coins')).toBe(false);
  });
  it('sin nada nuevo, lista vacía (aunque gastes o cambies de sitio lo tuyo)', () => {
    const p = createProfile('Aldric', 'mage', { cloak: 0, skin: 0 });
    const { expedition } = startExpedition(p, 0);
    const bp = expedition.backpack.slice();
    const i = bp.findIndex((s) => !!s && s.itemId !== 'cover');
    if (i >= 0) removeAt(bp, i); // gastas algo tuyo: no sale nada
    const { summary } = endExpedition(p, { ...expedition, backpack: bp }, 'extracted', 1000);
    expect(summary.gained).toEqual([]);
    expect(summary.goldGained).toBe(0);
  });
  it('ordena por rareza', () => {
    const g = gainedItems({}, { 'iron_ore|': 2, 'dread_blade|legendary': 1, 'bandage|': 1 });
    expect(g[0].itemId).toBe('dread_blade');
  });
  it('al morir, el bolsillo queda a salvo', () => {
    const p = createProfile('Aldric', 'warrior', { cloak: 0, skin: 0 });
    const { expedition } = startExpedition(p, 0);
    const pocket = addToGrid(expedition.pocket, { uid: 'k', itemId: 'iron_ore', qty: 1 }, LAYOUTS.pocket).grid;
    const { summary } = endExpedition(p, { ...expedition, pocket }, 'died', 1000);
    expect(summary.saved!.map((s) => s.itemId)).toContain('iron_ore');
    expect(summary.gained).toEqual([]);
  });
});

describe('Subzonas visitadas', () => {
  it('las partidas antiguas cuentan hasta la última a la que bajaste', () => {
    expect(visitedSubzones({ lastSubzone: 'calabozos' })).toEqual(['afueras', 'castillo', 'calabozos']);
    expect(visitedSubzones({ lastSubzone: null })).toEqual([]);
    expect(visitedSubzones({ lastSubzone: 'calabozos', visitedSubzones: ['afueras'] })).toEqual(['afueras']);
  });
});
