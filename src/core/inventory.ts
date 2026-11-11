import { POCKETABLE } from './data/chests';
import type { ClassId, EquipSlot, Equipment, Grid, ItemStack } from './types';
import { EQUIP_SLOTS } from './types';
import { isTwoHanded } from './data/weapons';
import { getItem, maxStack, RARITY_INFO } from './data/items';
import { makeUid } from './rng';
import { COIN_ID, CONTAINER_CAPACITY, GOLD_SCALE } from '../config/gold';
import { CATEGORY_SIZE, FAMILY_SIZE, HEAVY_ARMOR_SIZE, type Size } from '../config/carry';
import { isHeavyArmor } from './carry';

export const BACKPACK_SIZE = 24; // 6 x 4
export const STASH_SIZE = 120; // una página del almacén (8 × 15); ver config/stash.ts

export function emptyGrid(size: number): Grid {
  return Array.from({ length: size }, () => null);
}

export function emptyEquipment(): Equipment {
  return Object.fromEntries(EQUIP_SLOTS.map((s) => [s, null])) as Equipment;
}

export function cloneGrid(g: Grid): Grid {
  return g.map((s) => (s ? { ...s } : null));
}

// ── Objetos de varias casillas (Fase 6: armas, escudos, armaduras, herramientas, mochilas y el saco de oro) ──
// El objeto vive en su casilla de arriba a la izquierda (el «ancla»); las demás casillas que tapa guardan una marca
// `cover` (uid «cover:<uid del ancla>»). Así, todo lo que busca casillas libres las ve ocupadas sin saber nada más.
// Solo los contenedores con forma fija (columnas iguales en todos los formatos) admiten objetos grandes.
export interface GridLayout { cols: number; /** Filas por página (el almacén): un objeto no puede quedar entre dos páginas. */ blockRows?: number }
export const LAYOUTS: Partial<Record<ContainerId, GridLayout>> & Record<"backpack" | "stash" | "shared" | "pocket", GridLayout> = { backpack: { cols: 6 }, stash: { cols: 8, blockRows: 15 }, shared: { cols: 8, blockRows: 15 }, pocket: { cols: 3 } };
export const COVER_ID = 'cover';
const COVER_PREFIX = 'cover:';
export const isCover = (s: ItemStack | null | undefined): boolean => !!s && s.itemId === COVER_ID;
/** Tamaño del objeto sin girar: el suyo propio, o por familia (armas) o categoría (config/carry.ts). */
export function footprint(itemId: string): Size {
  const d = getItem(itemId);
  if (d.size) return d.size;
  if (isHeavyArmor(d)) return HEAVY_ARMOR_SIZE;
  if (d.family) return FAMILY_SIZE[d.family];
  return CATEGORY_SIZE[d.category] ?? { w: 1, h: 1 };
}
/** Tamaño de este ejemplar tal y como está colocado (girado 90°: ancho y alto cambiados). */
export function stackSize(s: ItemStack): Size {
  const f = footprint(s.itemId);
  return s.rot ? { w: f.h, h: f.w } : f;
}
/** Solo se giran los objetos que no son cuadrados. */
export function canRotate(itemId: string): boolean {
  const f = footprint(itemId);
  return f.w !== f.h;
}
const turned = (s: ItemStack): ItemStack => { const n = { ...s }; if (s.rot) delete n.rot; else n.rot = true; return n; };
export function isMulti(s: ItemStack | null | undefined): boolean {
  if (!s || isCover(s)) return false;
  const f = footprint(s.itemId);
  return f.w * f.h > 1;
}
/** Casilla del objeto que ocupa la casilla `i` (ella misma, o el ancla si está tapada). -1 si la marca no tiene dueño. */
export function anchorIndex(grid: Grid, i: number): number {
  const s = grid[i];
  if (!isCover(s)) return i;
  const uid = s!.uid.slice(COVER_PREFIX.length);
  return grid.findIndex((x) => !!x && !isCover(x) && x.uid === uid);
}
/** Casillas que ocuparía un objeto de w×h con el ancla en `i`, o null si se sale (de la rejilla, de la fila o de la página). */
function cellsAt(len: number, L: GridLayout, i: number, w: number, h: number): number[] | null {
  const col = i % L.cols, row = Math.floor(i / L.cols);
  if (col + w > L.cols || (row + h) * L.cols > len) return null;
  if (L.blockRows && Math.floor(row / L.blockRows) !== Math.floor((row + h - 1) / L.blockRows)) return null;
  const out: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.push(i + y * L.cols + x);
  return out;
}
/** ¿Cabe un objeto de w×h con el ancla en `i`? Las casillas del propio objeto (`selfUid`) cuentan como libres. */
export function canPlace(grid: Grid, L: GridLayout, i: number, w: number, h: number, selfUid?: string): boolean {
  const cells = cellsAt(grid.length, L, i, w, h);
  return !!cells && cells.every((k) => { const x = grid[k]; return !x || (!!selfUid && (x.uid === selfUid || x.uid === COVER_PREFIX + selfUid)); });
}
/** Coloca (sin comprobar) un objeto con su ancla en `i` y marca las casillas que tapa. Modifica `g`. */
function placeAt(g: Grid, L: GridLayout | undefined, i: number, s: ItemStack) {
  g[i] = s;
  if (!L || !isMulti(s)) return;
  const f = stackSize(s);
  for (const k of cellsAt(g.length, L, i, f.w, f.h) ?? []) if (k !== i) g[k] = { uid: COVER_PREFIX + s.uid, itemId: COVER_ID, qty: 1 };
}
/** Quita el objeto que ocupa la casilla `i` (con sus casillas tapadas). Modifica `g`. Devuelve dónde estaba y qué era. */
export function removeAt(g: Grid, i: number): { index: number; stack: ItemStack | null } {
  const a = anchorIndex(g, i);
  if (a < 0) { g[i] = null; return { index: i, stack: null }; }
  const s = g[a];
  if (!s) return { index: a, stack: null };
  if (isMulti(s)) { for (let k = 0; k < g.length; k++) if (g[k] && (g[k]!.uid === s.uid || g[k]!.uid === COVER_PREFIX + s.uid)) g[k] = null; }
  else g[a] = null;
  return { index: a, stack: s };
}
/** Primera casilla donde cabe un objeto grande, o -1. */
export function findPlace(grid: Grid, L: GridLayout, w: number, h: number): number {
  for (let i = 0; i < grid.length; i++) if (canPlace(grid, L, i, w, h)) return i;
  return -1;
}
/** Hueco para un objeto: primero tal como está y, si no cabe, girado. Devuelve la casilla y cómo queda el objeto. */
export function findPlaceFor(grid: Grid, L: GridLayout, s: ItemStack): { index: number; stack: ItemStack } | null {
  for (const t of canRotate(s.itemId) ? [s, turned(s)] : [s]) {
    const f = stackSize(t);
    const k = findPlace(grid, L, f.w, f.h);
    if (k >= 0) return { index: k, stack: t };
  }
  return null;
}
/** Coloca un objeto con su ancla en `i` si cabe ahí (tal como está o girado). Modifica `g`. */
function placeHere(g: Grid, L: GridLayout, i: number, s: ItemStack, selfUid?: string): boolean {
  for (const t of canRotate(s.itemId) ? [s, turned(s)] : [s]) {
    const f = stackSize(t);
    if (canPlace(g, L, i, f.w, f.h, selfUid)) { placeAt(g, L, i, t); return true; }
  }
  return false;
}
/**
 * Repara una rejilla cargada: quita marcas sin dueño y vuelve a marcar (o recoloca, girando si hace falta) los objetos grandes.
 * Lo que ya no cabe (partidas de antes de los tamaños) sale en `overflow`: quien llama le busca sitio; nunca se borra.
 */
export function repairGridEx(grid: Grid, L?: GridLayout): { grid: Grid; overflow: ItemStack[] } {
  const g: Grid = grid.map((x) => (x && !isCover(x) && !isMulti(x) ? x : null));
  const overflow: ItemStack[] = [];
  const big = grid.map((x, i) => [x, i] as const).filter(([x]) => isMulti(x));
  for (const [x, i] of big) {
    if (!L) { if (!g[i]) g[i] = x; else overflow.push(x!); continue; }
    if (placeHere(g, L, i, x!)) continue;
    const p = findPlaceFor(g, L, x!);
    if (p) placeAt(g, L, p.index, p.stack); else overflow.push(x!);
  }
  return { grid: g, overflow };
}
export function repairGrid(grid: Grid, L?: GridLayout): Grid {
  const r = repairGridEx(grid, L);
  // Sin sitio: a la primera casilla libre (sin marcas), o al final, para no perderlo; profile.ts usa repairGridEx y lo lleva al almacén
  for (const x of r.overflow) { const free = r.grid.indexOf(null); if (free >= 0) r.grid[free] = x; else r.grid.push(x); }
  return r.grid;
}

/**
 * Añade una pila al inventario: primero rellena pilas compatibles, luego casillas libres.
 * Con `layout`, los objetos grandes buscan un hueco de su tamaño; sin él (botín del suelo), ocupan una sola casilla.
 */
export function addToGrid(grid: Grid, stack: ItemStack, layout?: GridLayout): { grid: Grid; leftover: ItemStack | null } {
  if (isMulti(stack) && layout) {
    const p = findPlaceFor(grid, layout, stack);
    if (!p) return { grid, leftover: stack };
    const g = cloneGrid(grid);
    placeAt(g, layout, p.index, { ...p.stack });
    return { grid: g, leftover: null };
  }
  const g = cloneGrid(grid);
  let qty = stack.qty;
  const max = maxStack(stack.itemId);
  if (max > 1) {
    for (const s of g) {
      if (qty <= 0) break;
      if (s && s.itemId === stack.itemId && s.qty < max) {
        const add = Math.min(max - s.qty, qty);
        s.qty += add;
        qty -= add;
      }
    }
  }
  for (let i = 0; i < g.length && qty > 0; i++) {
    if (!g[i]) {
      const add = Math.min(max, qty);
      g[i] = { ...stack, uid: qty === stack.qty ? stack.uid : makeUid(), qty: add };
      qty -= add;
    }
  }
  return { grid: g, leftover: qty > 0 ? { ...stack, qty } : null };
}

export function addManyToGrid(grid: Grid, stacks: ItemStack[], layout?: GridLayout): { grid: Grid; leftovers: ItemStack[] } {
  let g = grid;
  const leftovers: ItemStack[] = [];
  for (const s of stacks) {
    const r = addToGrid(g, s, layout);
    g = r.grid;
    if (r.leftover) leftovers.push(r.leftover);
  }
  return { grid: g, leftovers };
}

/** Divide una pila de 1×1: separa `n` unidades (por defecto la mitad) a la casilla libre más cercana. La cantidad total se conserva. */
export function splitStack(g0: Grid, at: number, n?: number): { ok: true; grid: Grid } | { ok: false; error: string } {
  const s = g0[at];
  if (!s || isCover(s) || isMulti(s) || s.qty < 2) return { ok: false, error: 'Esta pila no se puede dividir.' };
  const take = n ?? Math.floor(s.qty / 2);
  if (take <= 0 || take >= s.qty) return { ok: false, error: 'No se puede dividir así.' };
  let free = -1;
  for (let k = 1; k < g0.length && free < 0; k++) { const a = at + k, b = at - k; if (a < g0.length && !g0[a]) free = a; else if (b >= 0 && !g0[b]) free = b; }
  if (free < 0) return { ok: false, error: 'No hay una casilla libre para separar la pila.' };
  const g = cloneGrid(g0);
  g[at] = { ...s, qty: s.qty - take };
  g[free] = { ...s, uid: makeUid(), qty: take };
  return { ok: true, grid: g };
}

export function countItem(grid: Grid, itemId: string): number {
  return grid.reduce((n, s) => n + (s && s.itemId === itemId ? s.qty : 0), 0);
}

/** Quita `qty` unidades de un objeto (de las pilas que haga falta). */
export function removeItem(grid: Grid, itemId: string, qty = 1): Grid | null {
  if (countItem(grid, itemId) < qty) return null;
  const g = cloneGrid(grid);
  let left = qty;
  for (let i = g.length - 1; i >= 0 && left > 0; i--) {
    const s = g[i];
    if (s && s.itemId === itemId) {
      const take = Math.min(s.qty, left);
      s.qty -= take;
      left -= take;
      if (s.qty <= 0) g[i] = null;
    }
  }
  return g;
}

export function gridValue(grid: Grid): number {
  return Math.round(grid.reduce((n, s) => n + stackGoldValue(s), 0));
}

export function freeSlots(grid: Grid): number {
  return grid.filter((s) => !s).length;
}

const CATEGORY_ORDER = ['container', 'gold', 'weapon', 'shield', 'helmet', 'armor', 'gloves', 'boots', 'ring', 'amulet', 'jewel', 'relic', 'potion', 'tool', 'key', 'coin', 'material', 'quest'];

/** Ordena: fusiona pilas y ordena por categoría, rareza y nombre. Si los objetos grandes no caben de otra forma, lo deja como estaba. */
export function sortGrid(grid: Grid, layout?: GridLayout): Grid {
  let merged: Grid = emptyGrid(grid.length);
  for (const s of grid) if (s && !isCover(s)) merged = addToGrid(merged, s).grid;
  const items = merged.filter((s): s is ItemStack => !!s);
  items.sort((a, b) => {
    const da = getItem(a.itemId);
    const db = getItem(b.itemId);
    const ca = CATEGORY_ORDER.indexOf(da.category === 'jewel' && da.slot ? da.slot : da.category);
    const cb = CATEGORY_ORDER.indexOf(db.category === 'jewel' && db.slot ? db.slot : db.category);
    if (ca !== cb) return ca - cb;
    const ra = RARITY_INFO[da.rarity].order;
    const rb = RARITY_INFO[db.rarity].order;
    if (ra !== rb) return rb - ra;
    return da.name.localeCompare(db.name);
  });
  const out = emptyGrid(grid.length);
  // Los objetos grandes, primero (arriba a la izquierda); luego los demás por orden en los huecos que quedan
  // (de mayor a menor superficie, para que encajen mejor)
  const small: ItemStack[] = [];
  const bigs = layout ? items.filter(isMulti).sort((a, b) => { const fa = footprint(a.itemId), fb = footprint(b.itemId); return fb.w * fb.h - fa.w * fa.h; }) : [];
  for (const it of bigs) {
    const p = findPlaceFor(out, layout!, it);
    if (!p) return grid;
    placeAt(out, layout, p.index, p.stack);
  }
  for (const it of items) if (!bigs.includes(it)) small.push(it);
  let k = 0;
  for (const it of small) { while (k < out.length && out[k]) k++; if (k >= out.length) return grid; out[k++] = it; }
  return out;
}

// ── Transferencias entre contenedores (mochila, almacén, equipo) ──

export type ContainerId = 'backpack' | 'stash' | 'shared' | 'loot' | 'pocket';
export type Loc = { kind: 'grid'; container: ContainerId; index: number } | { kind: 'equip'; slot: EquipSlot };

export interface Containers {
  backpack: Grid;
  stash: Grid;
  /** Página «Compartido» del almacén (vacía si no se tiene o en la mazmorra). */
  shared: Grid;
  loot: Grid;
  /** Bolsillo seguro: no se pierde al morir. Solo objetos pequeños. */
  pocket: Grid;
  equipment: Equipment;
}

export const POCKET_ERROR = 'En el bolsillo seguro solo caben objetos pequeños: llaves, joyas, monedas, saquitos de oro, pociones y materiales.';
export function canPocket(itemId: string): boolean {
  const d = getItem(itemId);
  // Oro: monedas sueltas y saquitos (1 casilla) sí; el saco grande no
  if (d.category === 'gold') return true;
  if (d.category === 'container') return !d.size || d.size.w * d.size.h === 1;
  return POCKETABLE.includes(d.category);
}

export interface EquipContext {
  classId: ClassId;
  level: number;
}

export function canEquip(itemId: string, slot: EquipSlot, ctx: EquipContext): string | null {
  const def = getItem(itemId);
  if (def.slot !== slot) return 'Este objeto no va en esa ranura.';
  if (def.classes && !def.classes.includes(ctx.classId)) return 'Tu clase no puede usar este objeto.';
  if (def.levelReq && ctx.level < def.levelReq) return `Necesitas nivel ${def.levelReq}.`;
  return null;
}

function getAt(c: Containers, loc: Loc): ItemStack | null {
  return loc.kind === 'equip' ? c.equipment[loc.slot] : c[loc.container][loc.index] ?? null;
}

function setAt(c: Containers, loc: Loc, s: ItemStack | null) {
  if (loc.kind === 'equip') c.equipment[loc.slot] = s;
  else c[loc.container][loc.index] = s;
}

function cloneContainers(c: Containers): Containers {
  return { backpack: cloneGrid(c.backpack), stash: cloneGrid(c.stash), shared: cloneGrid(c.shared), loot: cloneGrid(c.loot), pocket: cloneGrid(c.pocket), equipment: { ...c.equipment } };
}

export type TransferResult = { ok: true; containers: Containers } | { ok: false; error: string };

/**
 * Mueve un objeto de una ubicación a otra. Si el destino tiene el mismo objeto apilable, fusiona;
 * si tiene otro objeto, intercambia (validando que el intercambio sea legal en ambas direcciones).
 */
/** Casilla tapada → la del objeto que la tapa (para coger o soltar sobre un objeto grande por cualquier parte). */
function toAnchor(c: Containers, loc: Loc): Loc {
  if (loc.kind !== 'grid') return loc;
  const a = anchorIndex(c[loc.container], loc.index);
  return a >= 0 ? { ...loc, index: a } : loc;
}

export const MULTI_NO_ROOM = 'No cabe ahí: no hay casillas libres para su tamaño. Gíralo o busca otro hueco.';
export const MULTI_BLOCKED = 'Ahí ya hay un objeto grande: suelta este en un hueco libre.';
export const NO_ROOM_FOR_OLD = 'No hay sitio para lo que llevabas puesto: haz hueco antes.';

/** Vuelve a meter un objeto en un contenedor: en la casilla `i` si cabe (o girado), si no donde quepa. Modifica `n`. */
function putBack(n: Containers, container: ContainerId, i: number, s: ItemStack): boolean {
  const g = n[container];
  const L = LAYOUTS[container];
  if (L) {
    if (placeHere(g, L, i, s)) return true;
    const p = findPlaceFor(g, L, s);
    if (!p) return false;
    placeAt(g, L, p.index, p.stack);
    return true;
  }
  if (!g[i]) { g[i] = s; return true; }
  const free = g.indexOf(null);
  if (free < 0) return false;
  g[free] = s;
  return true;
}

/** Gira 90° el objeto de una casilla sin moverlo de sitio. Si choca con un borde u otro objeto, todo se queda igual. */
export function rotateAt(c: Containers, loc: Loc): TransferResult {
  if (loc.kind !== 'grid') return { ok: false, error: 'Solo se giran los objetos de la mochila o el almacén.' };
  const L = LAYOUTS[loc.container];
  const g0 = c[loc.container];
  const a = anchorIndex(g0, loc.index);
  const s = a >= 0 ? g0[a] : null;
  if (!s || isCover(s)) return { ok: false, error: 'No hay nada que girar.' };
  if (!L || !canRotate(s.itemId)) return { ok: false, error: 'Este objeto no se puede girar.' };
  const t = turned(s);
  const f = stackSize(t);
  if (!canPlace(g0, L, a, f.w, f.h, s.uid)) return { ok: false, error: 'No hay sitio para girarlo ahí.' };
  const n = cloneContainers(c);
  removeAt(n[loc.container], a);
  placeAt(n[loc.container], L, a, t);
  return { ok: true, containers: n };
}

export function transfer(c: Containers, from0: Loc, to0: Loc, ctx: EquipContext): TransferResult {
  const from = toAnchor(c, from0);
  // Soltar sobre una casilla tapada por el propio objeto es moverlo (desplazarlo), no soltarlo sobre sí mismo
  const to1 = toAnchor(c, to0);
  const self = to1.kind === 'grid' && from.kind === 'grid' && to1.container === from.container && to1.index === from.index && JSON.stringify(to0) !== JSON.stringify(to1);
  const to = self ? to0 : to1;
  if (JSON.stringify(from) === JSON.stringify(to)) return { ok: true, containers: c };
  const src = getAt(c, from);
  if (!src || isCover(src)) return { ok: false, error: 'No hay nada que mover.' };
  const dst = getAt(c, to);
  // Monedas sobre un saquito o un saco: entran las que quepan; el resto se queda donde estaba
  if (src.itemId === COIN_ID && dst && CONTAINER_CAPACITY[dst.itemId] && to.kind === 'grid' && from.kind === 'grid') {
    const room = CONTAINER_CAPACITY[dst.itemId] - (dst.gold ?? 0);
    if (room <= 0) return { ok: false, error: 'Ese saco ya está lleno.' };
    const n = cloneContainers(c);
    const moved = Math.min(room, src.qty);
    n[to.container][to.index] = { ...dst, gold: (dst.gold ?? 0) + moved };
    n[from.container][from.index] = src.qty - moved > 0 ? { ...src, qty: src.qty - moved } : null;
    return { ok: true, containers: n };
  }
  // Objetos grandes: se mueven a un hueco de su tamaño (sin intercambios entre casillas); sobre un objeto grande no se suelta nada.
  // Equipar o quitar uno sí intercambia: lo que llevabas puesto vuelve a su hueco o a donde quepa.
  if (isMulti(src) || (isMulti(dst) && dst!.uid !== src.uid)) {
    if (to.kind === 'equip') {
      if (from.kind !== 'grid') return { ok: false, error: 'Este objeto no va en esa ranura.' };
      const err = canEquip(src.itemId, to.slot, ctx);
      if (err) return { ok: false, error: err };
      const n = cloneContainers(c);
      removeAt(n[from.container], from.index);
      const old = n.equipment[to.slot];
      n.equipment[to.slot] = { ...src };
      if (old && !putBack(n, from.container, from.index, { ...old })) return { ok: false, error: NO_ROOM_FOR_OLD };
      return to.slot === 'mainHand' || to.slot === 'offHand' ? fixHands(n, to.slot) : { ok: true, containers: n };
    }
    if (to.container === 'pocket') return { ok: false, error: POCKET_ERROR };
    if (from.kind === 'equip') {
      const n = cloneContainers(c);
      n.equipment[from.slot] = null;
      if (dst) {
        // Soltar lo puesto sobre otro objeto: si ese objeto va en la misma ranura, se cambian
        const err = canEquip(dst.itemId, from.slot, ctx);
        if (err) return { ok: false, error: MULTI_BLOCKED };
        const at = removeAt(n[to.container], to.index).index;
        n.equipment[from.slot] = { ...dst };
        if (!putBack(n, to.container, at, { ...src })) return { ok: false, error: MULTI_NO_ROOM };
        return { ok: true, containers: n };
      }
      const L = LAYOUTS[to.container];
      if (L ? !placeHere(n[to.container], L, to.index, { ...src }) : !!n[to.container][to.index]) return { ok: false, error: MULTI_NO_ROOM };
      if (!L) n[to.container][to.index] = { ...src };
      return { ok: true, containers: n };
    }
    if (isMulti(dst) && dst!.uid !== src.uid) return { ok: false, error: MULTI_BLOCKED };
    const n = cloneContainers(c);
    removeAt(n[from.container], from.index);
    const L = LAYOUTS[to.container];
    if (L) {
      const f = stackSize(src);
      if (!canPlace(n[to.container], L, to.index, f.w, f.h)) return { ok: false, error: MULTI_NO_ROOM };
      placeAt(n[to.container], L, to.index, { ...src });
    } else {
      if (n[to.container][to.index]) return { ok: false, error: MULTI_NO_ROOM };
      n[to.container][to.index] = { ...src };
    }
    return { ok: true, containers: n };
  }

  if (to.kind === 'grid' && to.container === 'pocket' && !canPocket(src.itemId)) return { ok: false, error: POCKET_ERROR };
  if (from.kind === 'grid' && from.container === 'pocket' && dst && !canPocket(dst.itemId)) return { ok: false, error: POCKET_ERROR };
  if (to.kind === 'equip') {
    const err = canEquip(src.itemId, to.slot, ctx);
    if (err) return { ok: false, error: err };
  }
  if (from.kind === 'equip' && dst) {
    const err = canEquip(dst.itemId, from.slot, ctx);
    if (err) return { ok: false, error: 'No se puede intercambiar: ' + err.toLowerCase() };
  }

  const n = cloneContainers(c);
  if (dst && dst.itemId === src.itemId && maxStack(src.itemId) > 1 && to.kind === 'grid') {
    const max = maxStack(src.itemId);
    const move = Math.min(max - dst.qty, src.qty);
    if (move <= 0) {
      setAt(n, to, { ...src });
      setAt(n, from, { ...dst });
    } else {
      setAt(n, to, { ...dst, qty: dst.qty + move });
      setAt(n, from, src.qty - move > 0 ? { ...src, qty: src.qty - move } : null);
    }
    return { ok: true, containers: n };
  }
  setAt(n, to, { ...src });
  setAt(n, from, dst ? { ...dst } : null);
  if (to.kind === 'equip' && (to.slot === 'mainHand' || to.slot === 'offHand')) return fixHands(n, to.slot);
  return { ok: true, containers: n };
}

/** Un arma a dos manos no deja llevar nada en la izquierda: lo que sobre va a la mochila (o al almacén si no cabe). */
function fixHands(n: Containers, placed: 'mainHand' | 'offHand'): TransferResult {
  const main = n.equipment.mainHand;
  if (!main || !n.equipment.offHand || !isTwoHanded(getItem(main.itemId))) return { ok: true, containers: n };
  const freeSlot = placed === 'mainHand' ? 'offHand' : 'mainHand';
  const out = n.equipment[freeSlot]!;
  for (const g of ['backpack', 'stash'] as const) {
    const r = addToGrid(n[g], out, LAYOUTS[g]);
    if (!r.leftover) {
      n[g] = r.grid;
      n.equipment[freeSlot] = null;
      return { ok: true, containers: n };
    }
  }
  return { ok: false, error: 'Es un arma a dos manos: haz sitio en la mochila para lo que llevas en la otra mano.' };
}

/** Equipa desde una casilla del inventario a su ranura natural. */
export function quickEquip(c: Containers, from: Loc, ctx: EquipContext): TransferResult {
  const src = getAt(c, from);
  if (!src) return { ok: false, error: 'No hay nada que equipar.' };
  const def = getItem(src.itemId);
  if (!def.slot) return { ok: false, error: 'Este objeto no se puede equipar.' };
  return transfer(c, from, { kind: 'equip', slot: def.slot }, ctx);
}

/** Mueve a la primera casilla libre (o pila compatible) de otro contenedor. */
export function quickMove(c: Containers, from0: Loc, target: ContainerId): TransferResult {
  const from = toAnchor(c, from0);
  const src = getAt(c, from);
  if (!src || isCover(src)) return { ok: false, error: 'No hay nada que mover.' };
  if (target === 'pocket' && !canPocket(src.itemId)) return { ok: false, error: POCKET_ERROR };
  if (isMulti(src)) {
    const n = cloneContainers(c);
    if (from.kind === 'grid') removeAt(n[from.container], from.index); else setAt(n, from, null);
    const r = addToGrid(n[target], src, LAYOUTS[target]);
    if (r.leftover) { const f = footprint(src.itemId); return { ok: false, error: `No hay espacio: necesita ${f.w}×${f.h} casillas libres.` }; }
    n[target] = r.grid;
    return { ok: true, containers: n };
  }
  const r = addToGrid(c[target], src);
  if (r.leftover && r.leftover.qty === src.qty) return { ok: false, error: 'No hay espacio.' };
  const n = cloneContainers(c);
  n[target] = r.grid;
  setAt(n, from, r.leftover);
  return { ok: true, containers: n };
}

export function stackAt(c: Containers, loc: Loc): ItemStack | null {
  const s = getAt(c, toAnchor(c, loc));
  return isCover(s) ? null : s;
}

export function clearAt(c: Containers, loc: Loc): Containers {
  const n = cloneContainers(c);
  if (loc.kind === 'grid') removeAt(n[loc.container], loc.index);
  else setAt(n, loc, null);
  return n;
}

export function equippedValue(eq: Equipment): number {
  return Math.round(Object.values(eq).reduce((n, s) => n + stackGoldValue(s), 0));
}

/** Valor en monedas de una casilla (botín extraído, oro en riesgo). Igual que en wallet.ts, aquí para no crear un ciclo. */
function stackGoldValue(s: ItemStack | null): number {
  if (!s || s.itemId === 'cover') return 0;
  if (s.itemId === COIN_ID) return s.qty;
  return (s.gold ?? 0) + getItem(s.itemId).value * GOLD_SCALE * s.qty;
}
