import { describe, expect, it } from 'vitest';
import { addToGrid, canPlace, clearAt, emptyGrid, isCover, LAYOUTS, quickMove, removeAt, repairGrid, sortGrid, stackAt, transfer, MULTI_BLOCKED, MULTI_NO_ROOM, type Containers } from '../src/core/inventory';
import { addToPage, pageSlice } from '../src/core/stashPages';
import { sell } from '../src/core/economy';
import { createProfile, sanitizeProfile } from '../src/core/profile';
import { emptyEquipment } from '../src/core/inventory';
import type { Grid } from '../src/core/types';

const sack = (uid = 'S') => ({ uid, itemId: 'gold_sack', qty: 1 });
const sword = (uid: string) => ({ uid, itemId: 'iron_sword', qty: 1 });
const ctx = { classId: 'warrior' as const, level: 50 };
const covers = (g: Grid) => g.map((x, i) => (isCover(x) ? i : -1)).filter((i) => i >= 0);
function cont(over: Partial<Containers> = {}): Containers {
  return { backpack: emptyGrid(24), stash: emptyGrid(120), shared: emptyGrid(0), loot: emptyGrid(12), pocket: emptyGrid(3), equipment: emptyEquipment(), ...over };
}

describe('Objetos de 2×2 (el saco de oro)', () => {
  it('se coloca en el primer hueco de 2×2 y tapa las otras tres casillas', () => {
    const g = emptyGrid(24); g[0] = sword('a');
    const r = addToGrid(g, sack(), LAYOUTS.backpack);
    expect(r.leftover).toBeNull();
    expect(r.grid[1]?.itemId).toBe('gold_sack');
    expect(covers(r.grid)).toEqual([2, 7, 8]); // 6 columnas: 1,2 / 7,8
    // lo siguiente ya no cae en las casillas tapadas
    const r2 = addToGrid(r.grid, sword('b'));
    expect(r2.grid.findIndex((x) => x?.uid === 'b')).toBe(3);
  });

  it('no cabe si no hay 2×2 libres seguidas (ni partido entre filas)', () => {
    const g = emptyGrid(24);
    for (let i = 0; i < 24; i += 2) g[i] = sword(`s${i}`); // libres en columnas alternas: ningún bloque
    expect(addToGrid(g, sack(), LAYOUTS.backpack).leftover).not.toBeNull();
    expect(canPlace(emptyGrid(24), LAYOUTS.backpack, 5, 2, 2)).toBe(false); // última columna
    expect(canPlace(emptyGrid(24), LAYOUTS.backpack, 18, 2, 2)).toBe(false); // última fila
  });

  it('en el almacén no puede quedar entre dos páginas', () => {
    const st = emptyGrid(240);
    expect(canPlace(st, LAYOUTS.stash!, 112, 2, 2)).toBe(false); // fila 15 de la página 1 + fila 1 de la 2
    expect(canPlace(st, LAYOUTS.stash!, 120, 2, 2)).toBe(true);
    const r = addToPage(st, 1, sack());
    expect(r.stash[120]?.itemId).toBe('gold_sack');
    expect(covers(pageSlice(r.stash, 1))).toEqual([1, 8, 9]);
  });

  it('se mueve arrastrándolo a un hueco libre; tocando una casilla tapada se coge el saco entero', () => {
    const bp = addToGrid(emptyGrid(24), sack(), LAYOUTS.backpack).grid;
    const r = transfer(cont({ backpack: bp }), { kind: 'grid', container: 'backpack', index: 7 }, { kind: 'grid', container: 'stash', index: 10 }, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.containers.backpack.every((x) => !x)).toBe(true);
    expect(r.containers.stash[10]?.itemId).toBe('gold_sack');
    expect(covers(r.containers.stash)).toEqual([11, 18, 19]);
  });

  it('dentro de la misma rejilla puede desplazarse una casilla (solapando su propio hueco)', () => {
    const bp = addToGrid(emptyGrid(24), sack(), LAYOUTS.backpack).grid;
    const r = transfer(cont({ backpack: bp }), { kind: 'grid', container: 'backpack', index: 0 }, { kind: 'grid', container: 'backpack', index: 1 }, ctx);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.containers.backpack[1]?.itemId).toBe('gold_sack'); expect(covers(r.containers.backpack)).toEqual([2, 7, 8]); }
  });

  it('no se suelta encima de otros objetos ni se sueltan objetos encima de él', () => {
    let bp = addToGrid(emptyGrid(24), sack(), LAYOUTS.backpack).grid;
    bp[3] = sword('x');
    const c = cont({ backpack: bp });
    expect(transfer(c, { kind: 'grid', container: 'backpack', index: 0 }, { kind: 'grid', container: 'backpack', index: 2 }, ctx)).toEqual({ ok: false, error: MULTI_NO_ROOM });
    expect(transfer(c, { kind: 'grid', container: 'backpack', index: 3 }, { kind: 'grid', container: 'backpack', index: 7 }, ctx)).toEqual({ ok: false, error: MULTI_BLOCKED });
  });

  it('no cabe en el bolsillo seguro ni se equipa', () => {
    const bp = addToGrid(emptyGrid(24), sack(), LAYOUTS.backpack).grid;
    const c = cont({ backpack: bp });
    expect(quickMove(c, { kind: 'grid', container: 'backpack', index: 0 }, 'pocket').ok).toBe(false);
    expect(transfer(c, { kind: 'grid', container: 'backpack', index: 0 }, { kind: 'equip', slot: 'mainHand' }, ctx).ok).toBe(false);
  });

  it('«Al almacén» lo lleva a un hueco de 2×2', () => {
    const bp = addToGrid(emptyGrid(24), sack(), LAYOUTS.backpack).grid;
    const st = emptyGrid(120); st[1] = sword('z');
    const r = quickMove(cont({ backpack: bp, stash: st }), { kind: 'grid', container: 'backpack', index: 7 }, 'stash');
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.containers.stash[2]?.itemId).toBe('gold_sack'); expect(r.containers.backpack.every((x) => !x)).toBe(true); }
  });

  it('quitarlo (vender, tirar) limpia sus casillas tapadas', () => {
    const g = addToGrid(emptyGrid(24), sack(), LAYOUTS.backpack).grid;
    const r = removeAt([...g], 7);
    expect(r.stack?.itemId).toBe('gold_sack');
    const c2 = clearAt(cont({ backpack: g }), { kind: 'grid', container: 'backpack', index: 6 });
    expect(c2.backpack.every((x) => !x)).toBe(true);
    let p = createProfile('A', 'warrior', { cloak: 0, skin: 0 });
    p = { ...p, backpack: g };
    const s = sell(p, 'backpack', 7);
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.profile.backpack.every((x) => !x)).toBe(true);
    expect(stackAt(cont({ backpack: g }), { kind: 'grid', container: 'backpack', index: 7 })?.itemId).toBe('gold_sack');
  });

  it('ordenar pone los sacos primero y no los rompe', () => {
    let g = emptyGrid(24); g[0] = sword('a'); g[1] = sword('b');
    g = addToGrid(g, sack('S1'), LAYOUTS.backpack).grid;
    g = addToGrid(g, sack('S2'), LAYOUTS.backpack).grid;
    const out = sortGrid(g, LAYOUTS.backpack);
    expect(out.filter((x) => x?.itemId === 'gold_sack')).toHaveLength(2);
    expect(covers(out)).toHaveLength(6 + 4); // 2 sacos de 2×2 (3 marcas cada uno) y 2 espadas de 3×1 (2 cada una)
    expect(out[0]?.itemId).toBe('gold_sack');
    expect(out.filter((x) => x?.itemId === 'iron_sword')).toHaveLength(2);
  });

  it('al cargar una partida se reparan las marcas (sin dueño, o que faltan)', () => {
    const g = emptyGrid(24);
    g[0] = sack(); g[10] = { uid: 'cover:nadie', itemId: 'cover', qty: 1 };
    const fixed = repairGrid(g, LAYOUTS.backpack);
    expect(fixed[10]).toBeNull();
    expect(covers(fixed)).toEqual([1, 6, 7]);
    const p = createProfile('A', 'warrior', { cloak: 0, skin: 0 });
    const raw = JSON.parse(JSON.stringify({ ...p, backpack: g }));
    expect(covers(sanitizeProfile(raw)!.backpack)).toEqual([1, 6, 7]);
  });
});
