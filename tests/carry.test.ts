// Fase 6: inventario espacial (tamaños por objeto, giro, colocación automática) y peso.
import { describe, expect, it } from 'vitest';
import { addToGrid, canRotate, emptyEquipment, emptyGrid, footprint, isCover, LAYOUTS, rotateAt, sortGrid, stackSize, transfer, type Containers } from '../src/core/inventory';
import { carryBlock, carriedWeight, loadOf, stackWeight } from '../src/core/carry';
import { consumptionMult } from '../src/core/needs';
import { fullBody, mobilityMult } from '../src/core/anatomy';
import { createProfile, sanitizeProfile } from '../src/core/profile';
import { equipBag } from '../src/core/bag';
import type { Grid, ItemStack } from '../src/core/types';

const st = (itemId: string, uid = itemId, extra: Partial<ItemStack> = {}): ItemStack => ({ uid, itemId, qty: 1, ...extra });
const cont = (p: Partial<Containers>): Containers => ({ backpack: emptyGrid(24), stash: emptyGrid(120), shared: emptyGrid(0), loot: emptyGrid(12), pocket: emptyGrid(3), equipment: emptyEquipment(), ...p });
const ctx = { classId: 'warrior' as const, level: 50 };
const items = (g: Grid) => g.filter((x): x is ItemStack => !!x && !isCover(x));

describe('Tamaños por objeto', () => {
  it('siguen las propuestas del plan: daga 2×1, espada 3×1, bastón 4×1, escudo 2×2, armadura ligera 2×2 y pesada 2×3', () => {
    expect(footprint('health_potion')).toEqual({ w: 1, h: 1 });
    expect(footprint('iron_sword')).toEqual({ w: 3, h: 1 });
    expect(footprint('wooden_shield')).toEqual({ w: 2, h: 2 });
    expect(footprint('padded_tunic')).toEqual({ w: 2, h: 2 });
    expect(footprint('chainmail')).toEqual({ w: 2, h: 3 });
    expect(footprint('gold_sack')).toEqual({ w: 2, h: 2 });
    expect(canRotate('iron_sword')).toBe(true);
    expect(canRotate('wooden_shield')).toBe(false);
  });

  it('la colocación automática gira el objeto si solo cabe girado', () => {
    // Columna de la derecha libre (1 casilla de ancho, 4 de alto): una espada solo cabe de pie
    let g = emptyGrid(24);
    for (let i = 0; i < 24; i++) if (i % 6 !== 5) g[i] = st('health_potion', 'p' + i);
    const r = addToGrid(g, st('iron_sword', 'sw'), LAYOUTS.backpack);
    expect(r.leftover).toBeNull();
    g = r.grid;
    const sw = g.find((x) => x?.uid === 'sw')!;
    expect(sw.rot).toBe(true);
    expect(stackSize(sw)).toEqual({ w: 1, h: 3 });
  });
});

describe('Girar (A17)', () => {
  it('gira en su sitio y vuelve a girar', () => {
    const g = addToGrid(emptyGrid(24), st('iron_sword', 'sw'), LAYOUTS.backpack).grid;
    const r = rotateAt(cont({ backpack: g }), { kind: 'grid', container: 'backpack', index: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.containers.backpack[0]?.rot).toBe(true);
    expect(isCover(r.containers.backpack[6])).toBe(true);
    expect(isCover(r.containers.backpack[12])).toBe(true);
    expect(r.containers.backpack[1]).toBeNull();
  });

  it('si choca con un borde u otro objeto, no cambia nada', () => {
    let g = addToGrid(emptyGrid(24), st('iron_sword', 'sw'), LAYOUTS.backpack).grid;
    g[6] = st('health_potion', 'p');
    const c = cont({ backpack: g });
    const r = rotateAt(c, { kind: 'grid', container: 'backpack', index: 0 });
    expect(r.ok).toBe(false);
    expect(c.backpack[0]?.uid).toBe('sw');
    expect(c.backpack[0]?.rot).toBeUndefined();
    // Borde de abajo: una espada en la última fila no cabe de pie
    g = emptyGrid(24); g = addToGrid(g, st('iron_sword', 'b'), LAYOUTS.backpack).grid;
    const moved = transfer(cont({ backpack: g }), { kind: 'grid', container: 'backpack', index: 0 }, { kind: 'grid', container: 'backpack', index: 18 }, ctx);
    expect(moved.ok).toBe(true);
    if (moved.ok) expect(rotateAt(moved.containers, { kind: 'grid', container: 'backpack', index: 18 }).ok).toBe(false);
  });
});

describe('Mover y equipar objetos grandes (nada se pierde al reorganizar)', () => {
  it('soltar donde no cabe deja todo como estaba', () => {
    let g = addToGrid(emptyGrid(24), st('iron_sword', 'sw'), LAYOUTS.backpack).grid;
    g[10] = st('health_potion', 'p');
    const c = cont({ backpack: g });
    const r = transfer(c, { kind: 'grid', container: 'backpack', index: 0 }, { kind: 'grid', container: 'backpack', index: 8 }, ctx);
    expect(r.ok).toBe(false);
    expect(items(c.backpack).map((x) => x.uid).sort()).toEqual(['p', 'sw']);
  });

  it('equipar una espada de la mochila cambia la que llevabas: la vieja va a su hueco', () => {
    const g = addToGrid(emptyGrid(24), st('iron_sword', 'new'), LAYOUTS.backpack).grid;
    const eq = { ...emptyEquipment(), mainHand: st('iron_sword', 'old') };
    const r = transfer(cont({ backpack: g, equipment: eq }), { kind: 'grid', container: 'backpack', index: 2 }, { kind: 'equip', slot: 'mainHand' }, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.containers.equipment.mainHand?.uid).toBe('new');
    expect(r.containers.backpack[0]?.uid).toBe('old');
    expect(isCover(r.containers.backpack[1])).toBe(true);
  });

  it('quitar una pieza grande la pone en la casilla elegida si cabe', () => {
    const eq = { ...emptyEquipment(), offHand: st('wooden_shield', 'sh') };
    const r = transfer(cont({ equipment: eq }), { kind: 'equip', slot: 'offHand' }, { kind: 'grid', container: 'backpack', index: 4 }, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.containers.equipment.offHand).toBeNull();
    expect(r.containers.backpack[4]?.uid).toBe('sh');
    expect([5, 10, 11].every((k) => isCover(r.containers.backpack[k]))).toBe(true);
    // En la última columna no cabe un 2×2: no se quita
    const bad = transfer(cont({ equipment: eq }), { kind: 'equip', slot: 'offHand' }, { kind: 'grid', container: 'backpack', index: 5 }, ctx);
    expect(bad.ok).toBe(false);
  });

  it('ordenar conserva todos los objetos; si los grandes no caben de otra forma, lo deja igual', () => {
    let g = emptyGrid(24);
    for (const id of ['iron_sword', 'wooden_shield', 'padded_tunic', 'iron_sword']) g = addToGrid(g, st(id, id + Math.random()), LAYOUTS.backpack).grid;
    g = addToGrid(g, { uid: 'pp', itemId: 'health_potion', qty: 3 }, LAYOUTS.backpack).grid;
    const out = sortGrid(g, LAYOUTS.backpack);
    expect(items(out).map((x) => x.uid).sort()).toEqual(items(g).map((x) => x.uid).sort());
  });
});

describe('Peso (A21)', () => {
  it('cuenta equipo, mochila, bolsillo, monedas dentro de los sacos y la mochila puesta', () => {
    const eq = { ...emptyEquipment(), mainHand: st('iron_sword'), armor: st('chainmail') };
    const backpack = emptyGrid(24); backpack[0] = { uid: 's', itemId: 'gold_sack', qty: 1, gold: 200 };
    const w = carriedWeight({ backpack, pocket: emptyGrid(3), equipment: eq, bag: st('backpack_basic') });
    expect(w).toBeCloseTo(3 + 12 + 0.5 + 2 + 1.5, 5);
    expect(stackWeight({ uid: 'c', itemId: 'gold_coins', qty: 10 })).toBeCloseTo(0.1, 5);
  });

  it('tramos: hasta 100 % nada; 100–120 % y 120–150 % restan paso y gastan más Descanso', () => {
    const heavy = (n: number) => { const g = emptyGrid(36); for (let i = 0; i < n; i++) g[i] = st('chainmail', 'c' + i); return g; };
    const l1 = loadOf({ backpack: heavy(3), pocket: [], equipment: emptyEquipment() }, 'warrior'); // 36 / 40
    expect(l1.tier).toBe(0);
    const l2 = loadOf({ backpack: heavy(4), pocket: [], equipment: emptyEquipment() }, 'warrior'); // 48 / 40 = 120 %
    expect(l2.tier).toBe(1); expect(l2.mobilityLoss).toBe(0.1); expect(l2.restExtra).toBe(0.1);
    const l3 = loadOf({ backpack: heavy(5), pocket: [], equipment: emptyEquipment() }, 'warrior'); // 150 %
    expect(l3.tier).toBe(2); expect(l3.mobilityLoss).toBe(0.2); expect(l3.restExtra).toBe(0.25);
  });

  it('una recogida que lleva del 149 % al 170 % se bloquea; soltar o consumir siempre se puede', () => {
    expect(carryBlock(59.6, 68, 40)).toMatch(/Demasiado peso/);
    expect(carryBlock(59.6, 60, 40)).toBeNull();
    expect(carryBlock(70, 65, 40)).toBeNull();
  });

  it('el peso suma al tope del paso (nunca por debajo del 40 %) y al consumo de Descanso', () => {
    const b = fullBody(100);
    expect(mobilityMult(b, 0.2)).toBeCloseTo(0.8, 5);
    expect(mobilityMult(b, 0.9)).toBeCloseTo(0.4, 5);
    expect(consumptionMult('rest', b, 0.25)).toBeCloseTo(1.25, 5);
    expect(consumptionMult('sat', b, 0.25)).toBe(1);
  });
});

describe('Partidas de antes de los tamaños', () => {
  it('lo que ya no cabe en la mochila pasa al almacén; no se pierde nada', () => {
    const p = createProfile('Aldric', 'warrior', { cloak: 0, skin: 0 });
    p.backpack = emptyGrid(24).map((_, i) => (i < 12 ? st('iron_sword', 'w' + i) : null));
    const out = sanitizeProfile(JSON.parse(JSON.stringify(p)))!;
    const all = [...items(out.backpack), ...items(out.stash)].filter((x) => x.itemId === 'iron_sword');
    expect(all).toHaveLength(12);
    expect(new Set(all.map((x) => x.uid)).size).toBe(12);
    expect(out.stash.length % 120).toBe(0);
  });

  it('cambiar a una mochila menor donde no cabe todo se rechaza antes de mover nada (A20)', () => {
    const p = createProfile('Aldric', 'warrior', { cloak: 0, skin: 0 });
    p.bag = st('backpack_36', 'bag36');
    p.backpack = emptyGrid(36); p.backpack[30] = st('health_potion', 'last');
    p.stash = emptyGrid(120); p.stash[0] = st('backpack_basic', 'small');
    const r = equipBag(p, 'stash', 0);
    expect(r.ok).toBe(false);
    expect(p.backpack[30]?.uid).toBe('last');
  });
});

describe('Fase 6: dividir y fusionar (A19)', () => {
  it('dividir conserva la cantidad y fusionar la junta otra vez', async () => {
    const { splitStack, transfer, emptyGrid, emptyEquipment } = await import('../src/core/inventory');
    const g = emptyGrid(24); g[0] = { uid: 'p', itemId: 'health_potion', qty: 4 };
    const r = splitStack(g, 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const total = r.grid.reduce((n, x) => n + (x?.itemId === 'health_potion' ? x.qty : 0), 0);
    expect(total).toBe(4);
    expect(r.grid[1]?.qty).toBe(2);
    const c = { backpack: r.grid, stash: emptyGrid(120), shared: emptyGrid(120), loot: emptyGrid(0), pocket: emptyGrid(3), equipment: emptyEquipment() };
    const m = transfer(c, { kind: 'grid', container: 'backpack', index: 1 }, { kind: 'grid', container: 'backpack', index: 0 }, { classId: 'warrior', level: 1 });
    expect(m.ok && m.containers.backpack[0]?.qty).toBe(4);
    expect(m.ok && m.containers.backpack[1]).toBe(null);
  });
  it('no divide una pila de una unidad ni sin hueco', async () => {
    const { splitStack, emptyGrid } = await import('../src/core/inventory');
    const g = emptyGrid(2); g[0] = { uid: 'p', itemId: 'health_potion', qty: 1 };
    expect(splitStack(g, 0).ok).toBe(false);
    g[0] = { uid: 'p', itemId: 'health_potion', qty: 3 }; g[1] = { uid: 'q', itemId: 'ration', qty: 1 };
    expect(splitStack(g, 0).ok).toBe(false);
  });
});
