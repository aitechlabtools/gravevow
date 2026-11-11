// ════════════════════════════════════════════════════════════════════
// Generador procedural de mazmorras.
// Produce el mismo formato que las mazmorras hechas a mano (salas + pasillos + entidades),
// así que el motor y la lógica no distinguen entre una y otra.
// Es determinista: la misma semilla genera siempre el mismo mapa.
// ════════════════════════════════════════════════════════════════════
import { makeRng, type Rng } from './rng';
import { areaDef, type ZoneDef, type ZoneId, type SubzoneId } from './data/zones';
import { getSubzone } from './data/subzones';
import { pickVein } from './mining';
import { LEVEL_BONUS, depthBonus } from '../config/subzones';
import { addSpecials, checkExploration } from './exploration';
import { buildDungeon, findPath, type DecorSprite, type DungeonDef, type EntityDef, type Rect, type RoomDef, type BuiltDungeon } from './dungeon';

export interface GenOptions {
  width?: number;
  height?: number;
  rooms?: [number, number];
  /** Zona: decide criaturas, élite, jefe, cofres y nombres. Por defecto, la Mazmorra. */
  zone?: ZoneId;
  /** Subzona: decide criaturas, élite, jefe, nombres y botín. Manda sobre `zone`. */
  subzone?: SubzoneId;
  /** Mercenario prisionero que aparece encadenado en una sala profunda (o ninguno). */
  captive?: string | null;
  /** Hay un mercenario errante en esta expedición (se coloca en la sala de media profundidad). */
  wanderer?: boolean;
}

const ROOM_NAMES = [
  'Osario', 'Capilla Hundida', 'Galería de los Ecos', 'Cripta del Silencio', 'Sala de las Cadenas', 'Refectorio Podrido',
  'Biblioteca Ahogada', 'Pozo de Ceniza', 'Cámara de los Votos', 'Nave de los Caídos', 'Celda del Penitente', 'Altar Roto',
  'Sala de los Nichos', 'Cisterna Negra', 'Archivo de Huesos', 'Lavatorio Seco',
];
const DUNGEON_NAMES = [
  'Las Criptas sin Nombre', 'El Osario de Velmor', 'Las Catacumbas Hundidas', 'La Necrópolis de Ceniza',
  'Las Bóvedas del Penitente', 'El Laberinto de los Votos',
];

const center = (r: Rect) => ({ x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) });
const overlaps = (a: Rect, b: Rect, pad: number) =>
  a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
const inRoom = (r: Rect, x: number, y: number) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

interface Draft {
  rooms: RoomDef[];
  corridors: Rect[];
  edges: [number, number][];
}

/** Forma de los mapas de cada subzona (exterior abierto, salones, túneles…). Ver data/subzones.ts → map. */
export interface MapStyle { roomW: [number, number]; roomH: [number, number]; corridor: 1 | 2; rooms: [number, number]; size: [number, number] }
export const DEFAULT_MAP: MapStyle = { roomW: [5, 9], roomH: [5, 8], corridor: 1, rooms: [7, 9], size: [42, 36] };
let style: MapStyle = DEFAULT_MAP;
let withWanderer = true;

function placeRooms(rng: Rng, W: number, H: number, count: number): RoomDef[] {
  const rooms: RoomDef[] = [];
  for (let attempt = 0; attempt < 400 && rooms.length < count; attempt++) {
    const w = rng.int(style.roomW[0], style.roomW[1]);
    const h = rng.int(style.roomH[0], style.roomH[1]);
    const x = rng.int(1, W - w - 2);
    const y = rng.int(1, H - h - 2);
    const r: RoomDef = { id: `r${rooms.length}`, name: '', x, y, w, h };
    if (rooms.some((o) => overlaps(o, r, 3))) continue;
    rooms.push(r);
  }
  return rooms;
}

/** Árbol de expansión mínima (Prim) + algún ciclo extra para que no todo sea lineal. */
function connect(rng: Rng, rooms: RoomDef[]): [number, number][] {
  const dist = (a: number, b: number) => {
    const ca = center(rooms[a]), cb = center(rooms[b]);
    return Math.abs(ca.x - cb.x) + Math.abs(ca.y - cb.y);
  };
  const inTree = new Set([0]);
  const edges: [number, number][] = [];
  while (inTree.size < rooms.length) {
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (const a of inTree) for (let b = 0; b < rooms.length; b++) {
      if (inTree.has(b)) continue;
      const d = dist(a, b);
      if (d < bestD) { bestD = d; best = [a, b]; }
    }
    edges.push(best!);
    inTree.add(best![1]);
  }
  // 1 o 2 conexiones extra entre salas cercanas
  const extra = rng.int(1, 2);
  for (let i = 0; i < extra; i++) {
    const a = rng.int(0, rooms.length - 1);
    const candidates = rooms.map((_, b) => b).filter((b) => b !== a && !edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a)));
    if (!candidates.length) continue;
    candidates.sort((p, q) => dist(a, p) - dist(a, q));
    edges.push([a, candidates[0]]);
  }
  return edges;
}

function corridorBetween(rng: Rng, a: RoomDef, b: RoomDef): Rect[] {
  const ca = center(a), cb = center(b);
  const out: Rect[] = [];
  const t = style.corridor;
  const hRect = (x1: number, x2: number, y: number): Rect => ({ x: Math.min(x1, x2), y, w: Math.abs(x2 - x1) + t, h: t });
  const vRect = (y1: number, y2: number, x: number): Rect => ({ x, y: Math.min(y1, y2), w: t, h: Math.abs(y2 - y1) + t });
  if (rng.chance(0.5)) {
    out.push(hRect(ca.x, cb.x, ca.y), vRect(ca.y, cb.y, cb.x));
  } else {
    out.push(vRect(ca.y, cb.y, ca.x), hRect(ca.x, cb.x, cb.y));
  }
  return out;
}

function roomGraphDistances(n: number, edges: [number, number][], from: number): number[] {
  const d = Array(n).fill(Infinity);
  d[from] = 0;
  const q = [from];
  while (q.length) {
    const a = q.shift()!;
    for (const [x, y] of edges) {
      const b = x === a ? y : y === a ? x : -1;
      if (b >= 0 && d[b] === Infinity) { d[b] = d[a] + 1; q.push(b); }
    }
  }
  return d;
}

function draft(rng: Rng, W: number, H: number, count: number): Draft | null {
  const rooms = placeRooms(rng, W, H, count);
  if (rooms.length < 6) return null;
  const edges = connect(rng, rooms);
  const corridors = edges.flatMap(([a, b]) => corridorBetween(rng, rooms[a], rooms[b]));
  return { rooms, corridors, edges };
}

export function generateDungeon(seed: number, opts: GenOptions = {}): DungeonDef {
  style = opts.subzone ? { ...DEFAULT_MAP, ...getSubzone(opts.subzone).map } : DEFAULT_MAP;
  withWanderer = opts.wanderer ?? true;
  const W = opts.width ?? style.size[0];
  const H = opts.height ?? style.size[1];
  const [minR, maxR] = opts.rooms ?? style.rooms;
  for (let attempt = 0; attempt < 60; attempt++) {
    const rng = makeRng((seed + attempt * 7919) >>> 0);
    const d = draft(rng, W, H, rng.int(minR, maxR));
    if (!d) continue;
    const zone = areaDef(opts.subzone, opts.zone);
    const def = populate(rng, seed, d, W, H, zone, opts.captive ?? null);
    if (!def || !validateDungeon(def).ok) continue;
    // Fase 7: salas secretas, salas con llave, atajos y altares según la subzona. Si no pasan la comprobación, el mapa va sin ellos.
    let out = def;
    if (opts.subzone) {
      const withSpecials = addSpecials(def, seed, zone, getSubzone(opts.subzone).index);
      if (validateDungeon(withSpecials).ok && checkExploration(withSpecials).length === 0) out = withSpecials;
    }
    return opts.subzone ? { ...out, subzone: getSubzone(opts.subzone).id } : out;
  }
  throw new Error(`No se pudo generar una mazmorra válida con la semilla ${seed}`);
}

function populate(rng: Rng, seed: number, d: Draft, W: number, H: number, zone: ZoneDef, captive: string | null): DungeonDef | null {
  const { rooms, corridors, edges } = d;
  const n = rooms.length;
  // Inicio: la sala más cercana a una esquina aleatoria
  const corner = rng.pick([[0, 0], [W, 0], [0, H], [W, H]] as const);
  const start = rooms.map((r, i) => ({ i, d: Math.hypot(center(r).x - corner[0], center(r).y - corner[1]) })).sort((a, b) => a.d - b.d)[0].i;
  const depth = roomGraphDistances(n, edges, start);
  const degree = (i: number) => edges.filter(([a, b]) => a === i || b === i).length;
  // Jefe: la hoja (una sola conexión) más profunda; así el portal nunca queda detrás del jefe.
  const leaves = rooms.map((_, i) => i).filter((i) => i !== start && degree(i) === 1);
  if (!leaves.length) return null;
  const boss = leaves.sort((a, b) => depth[b] - depth[a] || rooms[b].w * rooms[b].h - rooms[a].w * rooms[a].h)[0];
  const others = rooms.map((_, i) => i).filter((i) => i !== start && i !== boss);
  const portal = [...others].sort((a, b) => depth[b] - depth[a])[0];
  const middle = others.filter((i) => i !== portal);
  const rivalRoom = [...middle].sort((a, b) => Math.abs(depth[a] - 1.5) - Math.abs(depth[b] - 1.5))[0] ?? portal;

  // Nombres
  const names = [...(zone.roomNames.length ? zone.roomNames : ROOM_NAMES)];
  for (let i = names.length - 1; i > 0; i--) { const j = rng.int(0, i); [names[i], names[j]] = [names[j], names[i]]; }
  rooms.forEach((r, i) => {
    r.id = i === start ? 'start' : i === boss ? 'boss' : i === portal ? 'portal' : `room${i}`;
    r.name = i === start ? 'Sala del Umbral' : i === boss ? zone.bossRoom : i === portal ? 'Puerta de Ceniza' : names.pop()!;
  });

  const built = buildDungeon({ id: 'tmp', name: '', width: W, height: H, rooms, corridors, entities: [] });
  const t = built.tiles;
  const isFloor = (x: number, y: number) => t[y]?.[x] === 'floor';
  const isWall = (x: number, y: number) => t[y]?.[x] === 'wall';
  const roomOf = (x: number, y: number) => rooms.findIndex((r) => inRoom(r, x, y));
  const used = new Set<string>();
  const take = (x: number, y: number) => used.add(`${x},${y}`);
  const free = (x: number, y: number) => isFloor(x, y) && !used.has(`${x},${y}`);
  const entities: EntityDef[] = [];

  /** Casilla libre en el interior de la sala, lejos de las paredes si se puede. */
  const spot = (r: RoomDef, margin = 1): [number, number] | null => {
    for (let k = 0; k < 40; k++) {
      const x = rng.int(r.x + margin, r.x + r.w - 1 - margin);
      const y = rng.int(r.y + margin, r.y + r.h - 1 - margin);
      if (free(x, y)) return [x, y];
    }
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (free(x, y)) return [x, y];
    return null;
  };

  // Inicio
  const sc = center(rooms[start]);
  entities.push({ kind: 'spawn', x: sc.x, y: sc.y });
  take(sc.x, sc.y);
  // Reservar alrededor del inicio para no aparecer encima de nada
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) take(sc.x + dx, sc.y + dy);

  // Portal
  const pc = center(rooms[portal]);
  entities.push({ kind: 'portal', x: pc.x, y: pc.y });
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) take(pc.x + dx, pc.y + dy);

  // Pilares en salas grandes (nunca en el borde, para no bloquear entradas)
  rooms.forEach((r, i) => {
    if (i === start || r.w < 7 || r.h < 6) return;
    const count = rng.int(1, 3);
    for (let k = 0; k < count; k++) {
      const p = spot(r, 2);
      if (!p) continue;
      entities.push({ kind: 'pillar', x: p[0], y: p[1] });
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) take(p[0] + dx, p[1] + dy);
    }
  });

  // Jefe y su cofre
  const bc = spot(rooms[boss], 1) ?? [center(rooms[boss]).x, center(rooms[boss]).y];
  entities.push({ kind: 'enemy', id: 'e_boss', enemyId: zone.boss, x: bc[0], y: bc[1], lvl: LEVEL_BONUS.boss });
  take(bc[0], bc[1]);
  const bchest = spot(rooms[boss], 1);
  if (bchest) { entities.push({ kind: 'chest', id: 'chest_boss', table: zone.chests.boss, x: bchest[0], y: bchest[1] }); take(...bchest); }

  // Rival
  const rv = spot(rooms[rivalRoom], 1);
  if (!rv) return null;
  if (withWanderer) entities.push({ kind: 'rival', x: rv[0], y: rv[1] });
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) take(rv[0] + dx, rv[1] + dy);

  // Enemigos: más y más duros cuanto más lejos del inicio
  let enemyN = 0;
  for (const i of others) {
    const dep = depth[i];
    const count = i === portal ? rng.int(0, 1) : i === rivalRoom ? rng.int(0, 1) : Math.min(3, rng.int(1, 1 + Math.floor(dep / 2) + (rooms[i].w * rooms[i].h > 45 ? 1 : 0)));
    for (let k = 0; k < count; k++) {
      const p = spot(rooms[i], 1);
      if (!p) continue;
      const enemyId = pickEnemy(rng, zone, dep);
      entities.push({ kind: 'enemy', id: `e${enemyN++}`, enemyId, x: p[0], y: p[1], lvl: depthBonus(dep) });
      take(p[0], p[1]);
    }
  }

  // Élite: uno por mapa, en una de las salas más profundas (no la del jefe)
  const eliteRoom = [...others].filter((i) => i !== portal && i !== rivalRoom).sort((a, b) => depth[b] - depth[a])[0];
  if (eliteRoom !== undefined) {
    const p = spot(rooms[eliteRoom], 1);
    if (p) { entities.push({ kind: 'enemy', id: 'e_elite', enemyId: zone.elite, x: p[0], y: p[1], lvl: LEVEL_BONUS.elite }); take(p[0], p[1]); }
  }

  // Prisionero: encadenado en una sala profunda, distinta de la del élite y la de Kael
  if (captive) {
    const room = [...others].filter((i) => i !== portal && i !== rivalRoom && i !== eliteRoom).sort((a, b) => depth[b] - depth[a])[0] ?? eliteRoom;
    const p = room !== undefined ? spot(rooms[room], 1) : null;
    if (p) { entities.push({ kind: 'captive', mercId: captive, x: p[0], y: p[1] }); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) take(p[0] + dx, p[1] + dy); }
  }

  // Vetas de mineral: pegadas a las paredes norte u oeste (las que se ven), en salas que no sean el inicio
  let veinN = 0;
  const veinSpots: [number, number][] = [];
  rooms.forEach((r, i) => {
    if (i === start) return;
    for (let x = r.x + 1; x < r.x + r.w - 1; x++) if (isWall(x, r.y - 1) && free(x, r.y) && free(x, r.y + 1)) veinSpots.push([x, r.y]);
    for (let y = r.y + 1; y < r.y + r.h - 1; y++) if (isWall(r.x - 1, y) && free(r.x, y) && free(r.x + 1, y)) veinSpots.push([r.x, y]);
  });
  for (let i = veinSpots.length - 1; i > 0; i--) { const j = rng.int(0, i); [veinSpots[i], veinSpots[j]] = [veinSpots[j], veinSpots[i]]; }
  const wantVeins = rng.int(3, 5);
  for (const [x, y] of veinSpots) {
    if (veinN >= wantVeins) break;
    if (!free(x, y) || entities.some((e) => e.kind === 'vein' && Math.abs(e.x - x) + Math.abs(e.y - y) < 4)) continue;
    entities.push({ kind: 'vein', id: `vein${veinN++}`, vein: pickVein(rng, zone.id), x, y });
    take(x, y);
  }

  // Cofres: uno rico en una sala profunda y 2-3 comunes
  const chestRooms = others.filter((i) => i !== portal).sort((a, b) => depth[b] - depth[a]);
  let chestN = 0;
  if (chestRooms[0] !== undefined) {
    const p = spot(rooms[chestRooms[0]], 1);
    if (p) { entities.push({ kind: 'chest', id: `chest${chestN++}`, table: zone.chests.rich, x: p[0], y: p[1] }); take(...p); }
  }
  const commons = chestRooms.slice(1);
  for (let i = commons.length - 1; i > 0; i--) { const j = rng.int(0, i); [commons[i], commons[j]] = [commons[j], commons[i]]; }
  for (const i of commons.slice(0, rng.int(2, 3))) {
    const p = spot(rooms[i], 1);
    if (p) { entities.push({ kind: 'chest', id: `chest${chestN++}`, table: zone.chests.common, x: p[0], y: p[1] }); take(...p); }
  }

  // Puertas: en la entrada a la sala del jefe y en algún pasillo más
  const corridorTiles: [number, number][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isFloor(x, y) && roomOf(x, y) < 0) corridorTiles.push([x, y]);
  const doorable = (x: number, y: number) => free(x, y) && ((isWall(x - 1, y) && isWall(x + 1, y) && isFloor(x, y - 1) && isFloor(x, y + 1)) || (isWall(x, y - 1) && isWall(x, y + 1) && isFloor(x - 1, y) && isFloor(x + 1, y)));
  const near = (r: RoomDef, x: number, y: number) => x >= r.x - 1 && x <= r.x + r.w && y >= r.y - 1 && y <= r.y + r.h;
  let doorN = 0;
  const bossDoors = corridorTiles.filter(([x, y]) => near(rooms[boss], x, y) && doorable(x, y));
  for (const [x, y] of bossDoors) { entities.push({ kind: 'door', id: `door${doorN++}`, x, y }); take(x, y); }
  const otherDoors = corridorTiles.filter(([x, y]) => doorable(x, y) && rooms.some((r, i) => i !== boss && i !== start && near(r, x, y)));
  for (let k = 0; k < Math.min(2, otherDoors.length); k++) {
    const [x, y] = rng.pick(otherDoors);
    if (!free(x, y)) continue;
    entities.push({ kind: 'door', id: `door${doorN++}`, x, y });
    take(x, y);
  }

  // Trampas en pasillos estrechos
  const narrow = corridorTiles.filter(([x, y]) => free(x, y) && ((isWall(x - 1, y) && isWall(x + 1, y)) || (isWall(x, y - 1) && isWall(x, y + 1))));
  for (let k = 0; k < Math.min(3, narrow.length); k++) {
    const [x, y] = rng.pick(narrow);
    if (!free(x, y)) continue;
    entities.push({ kind: 'trap', id: `trap${k}`, x, y });
    take(x, y);
  }

  // Antorchas: solo en muros norte y oeste de cada sala (caras visibles en isométrico)
  rooms.forEach((r) => {
    const candidates: EntityDef[] = [];
    for (let x = r.x + 1; x < r.x + r.w - 1; x += 3) if (isWall(x, r.y - 1) && isFloor(x, r.y)) candidates.push({ kind: 'torch', x, y: r.y - 1, face: 'south' });
    for (let y = r.y + 1; y < r.y + r.h - 1; y += 3) if (isWall(r.x - 1, y) && isFloor(r.x, y)) candidates.push({ kind: 'torch', x: r.x - 1, y, face: 'east' });
    for (let i = candidates.length - 1; i > 0; i--) { const j = rng.int(0, i); [candidates[i], candidates[j]] = [candidates[j], candidates[i]]; }
    entities.push(...candidates.slice(0, r.id === 'boss' || r.id === 'portal' ? 3 : 2));
  });

  // Decoración (la de su subzona)
  const decor = (zone as ZoneDef & { decor?: DecorSprite[] }).decor ?? (['bones', 'skull', 'barrel', 'rubble'] as DecorSprite[]);
  rooms.forEach((r) => {
    for (let k = 0; k < rng.int(0, 2) + (decor.length > 4 ? 1 : 0); k++) {
      const p = spot(r, 0);
      if (!p) continue;
      entities.push({ kind: 'decor', sprite: rng.pick(decor), x: p[0], y: p[1] });
      take(...p);
    }
  });

  const pool = zone.dungeonNames.length ? zone.dungeonNames : DUNGEON_NAMES;
  const name = pool[seed % pool.length];
  return { id: `gen-${seed}`, name, width: W, height: H, rooms, corridors, entities, seed, zone: zone.id };
}

/** Criatura normal de la zona según su peso; las más duras solo a partir de cierta profundidad. */
function pickEnemy(rng: Rng, zone: ZoneDef, depth: number): string {
  const pool = zone.enemies.filter((e) => (e.minDepth ?? 0) <= depth);
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = rng.next() * total;
  for (const e of pool) { r -= e.weight; if (r < 0) return e.id; }
  return pool[0].id;
}

/** Comprueba que todo lo importante está en el suelo y es alcanzable desde el inicio. */
export function validateDungeon(def: DungeonDef): { ok: boolean; problems: string[]; built: BuiltDungeon } {
  const built = buildDungeon(def);
  const problems: string[] = [];
  const pillars = new Set(def.entities.filter((e) => e.kind === 'pillar').map((e) => `${e.x},${e.y}`));
  const blocked = (x: number, y: number) => built.tiles[y]?.[x] !== 'floor' || pillars.has(`${x},${y}`);
  const spawn = def.entities.find((e) => e.kind === 'spawn');
  if (!spawn) problems.push('sin inicio');
  if (!def.entities.some((e) => e.kind === 'portal')) problems.push('sin portal');
  const seen = new Set<string>();
  for (const e of def.entities) {
    if (e.kind === 'torch') {
      if (built.tiles[e.y]?.[e.x] !== 'wall') problems.push(`antorcha fuera de muro ${e.x},${e.y}`);
      continue;
    }
    if (built.tiles[e.y]?.[e.x] !== 'floor') problems.push(`${e.kind} fuera del suelo ${e.x},${e.y}`);
    if (e.kind !== 'decor') {
      const k = `${e.x},${e.y}`;
      if (seen.has(k) && e.kind !== 'trap') problems.push(`solapamiento en ${k}`);
      seen.add(k);
    }
    if (spawn && ['portal', 'chest', 'enemy', 'rival', 'door', 'captive', 'vein', 'altar'].includes(e.kind)) {
      if (!findPath(def.width, def.height, blocked, [spawn.x, spawn.y], [e.x, e.y], 20000)) problems.push(`${e.kind} inalcanzable en ${e.x},${e.y}`);
    }
  }
  return { ok: problems.length === 0, problems, built };
}
