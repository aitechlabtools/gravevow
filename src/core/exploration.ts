// Exploración (Fase 7): salas secretas, salas cerradas con llave, atajos con rastrillo y altares.
// Se añaden a un mapa ya válido y siempre como desvíos: nada obligatorio (portal, jefe, enemigos, cofres normales) queda detrás.
// Lógica pura y determinista (misma semilla, mismo mapa).
import { buildDungeon, findPath, type DoorLock, type DungeonDef, type EntityDef, type Rect, type RoomDef } from './dungeon';
import { makeRng, type Rng } from './rng';
import type { ZoneDef } from './data/zones';
import { EXPLORE_FROM, SPECIAL_ROOMS, VAULT_KEY } from '../config/exploration';
import { PACT_IDS } from './data/altars';

/** Las salas opcionales llevan este prefijo en su id: lo que hay dentro no cuenta como obligatorio. */
export const OPTIONAL_PREFIX = 'opt_';
export const isOptionalRoom = (r: RoomDef) => r.id.startsWith(OPTIONAL_PREFIX);

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** ¿Se puede excavar todo `cells` sin tocar otro suelo? `allow`: casillas de suelo vecinas permitidas (la entrada). */
function carvable(tiles: string[][], W: number, H: number, cells: [number, number][], allow: Set<string>): boolean {
  const mine = new Set(cells.map(([x, y]) => `${x},${y}`));
  for (const [x, y] of cells) {
    if (x < 1 || y < 1 || x > W - 2 || y > H - 2) return false;
    if (tiles[y][x] === 'floor') return false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const k = `${x + dx},${y + dy}`;
      if (mine.has(k) || allow.has(k)) continue;
      if (tiles[y + dy]?.[x + dx] === 'floor') return false;
    }
  }
  return true;
}

const rectCells = (r: Rect): [number, number][] => { const o: [number, number][] = []; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) o.push([x, y]); return o; };

/**
 * Busca un hueco para una sala pequeña unida a `host` por un pasillo recto de 3 casillas.
 * Devuelve la sala, el pasillo y la casilla de la entrada (pegada a la sala anfitriona), o null.
 */
function sideRoom(rng: Rng, def: DungeonDef, tiles: string[][], host: RoomDef): { room: Rect; corridor: Rect; door: [number, number] } | null {
  const W = def.width, H = def.height, L = 3, S = 4;
  const opts: { room: Rect; corridor: Rect; door: [number, number]; allow: [number, number][] }[] = [];
  for (const [dx, dy] of DIRS) {
    const along = dx !== 0 ? host.h : host.w;
    for (let k = 1; k < along - 1; k++) {
      // Casilla del muro de la anfitriona por donde se sale
      const ex = dx > 0 ? host.x + host.w : dx < 0 ? host.x - 1 : host.x + k;
      const ey = dy > 0 ? host.y + host.h : dy < 0 ? host.y - 1 : host.y + k;
      const corridor: Rect = dx !== 0 ? { x: dx > 0 ? ex : ex - L + 1, y: ey, w: L, h: 1 } : { x: ex, y: dy > 0 ? ey : ey - L + 1, w: 1, h: L };
      const fx = ex + dx * L, fy = ey + dy * L; // primera casilla de la sala nueva
      const room: Rect = dx !== 0 ? { x: dx > 0 ? fx : fx - S + 1, y: fy - 1, w: S, h: S } : { x: fx - 1, y: dy > 0 ? fy : fy - S + 1, w: S, h: S };
      const inner: [number, number] = [ex - dx, ey - dy]; // suelo de la anfitriona junto a la entrada
      const allow: [number, number][] = [inner, [inner[0] + dy, inner[1] + dx], [inner[0] - dy, inner[1] - dx]];
      opts.push({ room, corridor, door: [ex, ey], allow });
    }
  }
  for (let i = opts.length - 1; i > 0; i--) { const j = rng.int(0, i); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  for (const o of opts) {
    const allow = new Set(o.allow.map(([x, y]) => `${x},${y}`));
    if (carvable(tiles, W, H, [...rectCells(o.corridor), ...rectCells(o.room)], allow)) return o;
  }
  return null;
}

/** Atajo: pasillo recto nuevo entre una sala profunda y una cercana al inicio. El rastrillo va junto a la profunda y solo se abre desde ella. */
function shortcut(def: DungeonDef, tiles: string[][], rooms: RoomDef[], depth: Map<string, number>): { corridor: Rect; gate: [number, number]; side: [number, number] } | null {
  const W = def.width, H = def.height;
  const deep = rooms.filter((r) => (depth.get(r.id) ?? 0) >= 3).sort((a, b) => (depth.get(b.id) ?? 0) - (depth.get(a.id) ?? 0));
  const near = rooms.filter((r) => (depth.get(r.id) ?? 9) <= 1);
  for (const a of deep) for (const b of near) {
    // Horizontal: filas comunes al interior de las dos
    for (const [lo, hi] of [[a, b], [b, a]] as const) {
      if (lo.x + lo.w >= hi.x) continue;
      const y0 = Math.max(lo.y + 1, hi.y + 1), y1 = Math.min(lo.y + lo.h - 2, hi.y + hi.h - 2);
      for (let y = y0; y <= y1; y++) {
        const x0 = lo.x + lo.w, x1 = hi.x - 1;
        if (x1 - x0 + 1 < 2) continue;
        const corridor: Rect = { x: x0, y, w: x1 - x0 + 1, h: 1 };
        const allow = new Set([`${x0 - 1},${y}`, `${x0 - 1},${y - 1}`, `${x0 - 1},${y + 1}`, `${x1 + 1},${y}`, `${x1 + 1},${y - 1}`, `${x1 + 1},${y + 1}`]);
        if (!carvable(tiles, W, H, rectCells(corridor), allow)) continue;
        const aLeft = lo === a;
        return { corridor, gate: aLeft ? [x0, y] : [x1, y], side: aLeft ? [-1, 0] : [1, 0] };
      }
    }
    // Vertical
    for (const [lo, hi] of [[a, b], [b, a]] as const) {
      if (lo.y + lo.h >= hi.y) continue;
      const x0 = Math.max(lo.x + 1, hi.x + 1), x1 = Math.min(lo.x + lo.w - 2, hi.x + hi.w - 2);
      for (let x = x0; x <= x1; x++) {
        const y0 = lo.y + lo.h, y1 = hi.y - 1;
        if (y1 - y0 + 1 < 2) continue;
        const corridor: Rect = { x, y: y0, w: 1, h: y1 - y0 + 1 };
        const allow = new Set([`${x},${y0 - 1}`, `${x - 1},${y0 - 1}`, `${x + 1},${y0 - 1}`, `${x},${y1 + 1}`, `${x - 1},${y1 + 1}`, `${x + 1},${y1 + 1}`]);
        if (!carvable(tiles, W, H, rectCells(corridor), allow)) continue;
        const aTop = lo === a;
        return { corridor, gate: aTop ? [x, y0] : [x, y1], side: aTop ? [0, -1] : [0, 1] };
      }
    }
  }
  return null;
}

/** Distancia en salas desde el inicio, por los pasillos ya excavados. */
function roomDepths(def: DungeonDef, tiles: string[][]): Map<string, number> {
  const start = def.rooms.find((r) => r.id === 'start') ?? def.rooms[0];
  const out = new Map<string, number>();
  const sc: [number, number] = [Math.floor(start.x + start.w / 2), Math.floor(start.y + start.h / 2)];
  for (const r of def.rooms) {
    const c: [number, number] = [Math.floor(r.x + r.w / 2), Math.floor(r.y + r.h / 2)];
    const path = findPath(def.width, def.height, (x, y) => tiles[y]?.[x] !== 'floor', sc, c, 20000);
    if (!path) continue;
    const seen = new Set<string>();
    for (const [x, y] of path) { const rr = def.rooms.find((q) => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h); if (rr) seen.add(rr.id); }
    seen.delete(start.id);
    out.set(r.id, seen.size);
  }
  out.set(start.id, 0);
  return out;
}

/**
 * Añade a un mapa ya válido los accesos especiales que tocan a su subzona.
 * Si algo no cabe, se queda fuera: todos son opcionales. No cambia nada de lo que ya había.
 */
export function addSpecials(def: DungeonDef, seed: number, zone: ZoneDef, subIndex: number): DungeonDef {
  const rng = makeRng((seed ^ 0x5ec7a1) >>> 0);
  const rooms = def.rooms.map((r) => ({ ...r }));
  const corridors = [...def.corridors];
  const entities: EntityDef[] = [...def.entities];
  let d: DungeonDef = { ...def, rooms, corridors, entities };
  const tilesNow = () => buildDungeon(d).tiles as string[][];
  const names = SPECIAL_ROOMS[zone.id];
  const hosts = rooms.filter((r) => !['start', 'boss', 'portal'].includes(r.id));
  const depth = roomDepths(d, tilesNow());

  const addRoom = (kind: 'secret' | 'vault', lock: DoorLock, table: string, pool: RoomDef[]) => {
    for (const host of pool) {
      const p = sideRoom(rng, d, tilesNow(), host);
      if (!p) continue;
      rooms.push({ id: OPTIONAL_PREFIX + kind, name: names[kind], ...p.room });
      corridors.push(p.corridor);
      entities.push({ kind: 'door', id: `door_${kind}`, x: p.door[0], y: p.door[1], lock });
      const cx = p.room.x + 1 + rng.int(0, 1), cy = p.room.y + 1 + rng.int(0, 1);
      entities.push({ kind: 'chest', id: `chest_${kind}`, table, x: cx, y: cy });
      d = { ...d, rooms, corridors, entities };
      return true;
    }
    return false;
  };

  // Sala secreta: cerca del inicio (enseña a observar); la cerrada con llave, en una sala más honda
  if (subIndex >= EXPLORE_FROM.secret) addRoom('secret', { type: 'secret' }, zone.chests.common, [...hosts].sort((a, b) => (depth.get(a.id) ?? 0) - (depth.get(b.id) ?? 0)));
  if (subIndex >= EXPLORE_FROM.vault) addRoom('vault', { type: 'key', key: VAULT_KEY[zone.id] }, zone.chests.rich, [...hosts].filter((r) => !isOptionalRoom(r)).sort((a, b) => (depth.get(b.id) ?? 0) - (depth.get(a.id) ?? 0)));

  // Atajo: rastrillo que se levanta desde la sala honda
  if (subIndex >= EXPLORE_FROM.shortcut) {
    const s = shortcut(d, tilesNow(), rooms.filter((r) => !isOptionalRoom(r)), depth);
    if (s) {
      corridors.push(s.corridor);
      entities.push({ kind: 'door', id: 'door_gate', x: s.gate[0], y: s.gate[1], lock: { type: 'gate', side: s.side } });
      d = { ...d, corridors, entities };
    }
  }

  // Altar: en una sala intermedia, en una casilla libre con aire alrededor
  if (subIndex >= EXPLORE_FROM.altar) {
    const t = tilesNow();
    const occupied = new Set(entities.filter((e) => e.kind !== 'torch').map((e) => `${e.x},${e.y}`));
    const roomsByDepth = hosts.filter((r) => !isOptionalRoom(r)).sort((a, b) => Math.abs((depth.get(a.id) ?? 0) - 2) - Math.abs((depth.get(b.id) ?? 0) - 2));
    outer: for (const r of roomsByDepth) {
      for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
        let ok = true;
        for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (t[y + dy]?.[x + dx] !== 'floor' || occupied.has(`${x + dx},${y + dy}`)) { ok = false; break; }
        if (!ok) continue;
        entities.push({ kind: 'altar', id: 'altar0', pact: PACT_IDS[rng.int(0, PACT_IDS.length - 1)], x, y });
        break outer;
      }
    }
  }
  // Las antorchas del muro que se ha abierto para un pasillo nuevo se quitan
  const final = { ...d, rooms, corridors, entities };
  const t = buildDungeon(final).tiles;
  return { ...final, entities: entities.filter((e) => e.kind !== 'torch' || t[e.y]?.[e.x] === 'wall') };
}

/**
 * Garantía de la Fase 7: con todos los accesos especiales cerrados, se llega desde el inicio al portal y a todo lo obligatorio
 * (lo que no está en una sala opcional). Y abriéndolos, a todo lo de dentro. Devuelve la lista de problemas (vacía si está bien).
 */
export function checkExploration(def: DungeonDef): string[] {
  const { tiles } = buildDungeon(def);
  const problems: string[] = [];
  const pillars = new Set(def.entities.filter((e) => e.kind === 'pillar').map((e) => `${e.x},${e.y}`));
  const locked = new Set(def.entities.filter((e) => e.kind === 'door' && e.lock).map((e) => `${e.x},${e.y}`));
  const spawn = def.entities.find((e) => e.kind === 'spawn');
  if (!spawn) return ['sin inicio'];
  const optional = def.rooms.filter(isOptionalRoom);
  const inOptional = (x: number, y: number) => optional.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  const closed = (x: number, y: number) => tiles[y]?.[x] !== 'floor' || pillars.has(`${x},${y}`) || locked.has(`${x},${y}`);
  const open = (x: number, y: number) => tiles[y]?.[x] !== 'floor' || pillars.has(`${x},${y}`);
  const reach = (blocked: (x: number, y: number) => boolean, x: number, y: number) => !!findPath(def.width, def.height, blocked, [spawn.x, spawn.y], [x, y], 40000);
  for (const e of def.entities) {
    if (!['portal', 'chest', 'enemy', 'rival', 'captive', 'vein', 'altar'].includes(e.kind)) continue;
    if (inOptional(e.x, e.y)) {
      if (!reach(open, e.x, e.y)) problems.push(`${e.kind} de sala opcional inalcanzable en ${e.x},${e.y}`);
    } else if (!reach(closed, e.x, e.y)) problems.push(`${e.kind} obligatorio detrás de un acceso especial en ${e.x},${e.y}`);
  }
  // Los accesos se pueden usar: su casilla se alcanza (desde el lado bueno, en el atajo)
  for (const e of def.entities) {
    if (e.kind !== 'door' || !e.lock) continue;
    if (e.lock.type === 'gate') {
      const [sx, sy] = e.lock.side;
      if (!reach(closed, e.x + sx, e.y + sy)) problems.push(`atajo sin lado accesible en ${e.x},${e.y}`);
    } else if (!DIRS.some(([dx, dy]) => !inOptional(e.x + dx, e.y + dy) && reach(closed, e.x + dx, e.y + dy))) problems.push(`acceso ${e.lock.type} inalcanzable en ${e.x},${e.y}`);
  }
  return problems;
}
