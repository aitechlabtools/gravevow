// ════════════════════════════════════════════════════════════════════
// Mazmorra: datos puros. La demo usa una mazmorra diseñada a mano
// a base de salas rectangulares y pasillos. El mismo formato (salas + conexiones)
// es el que usará el generador procedural en una fase posterior.
// ════════════════════════════════════════════════════════════════════

export type TileType = 'void' | 'wall' | 'floor';

export interface Rect { x: number; y: number; w: number; h: number }
export interface RoomDef extends Rect { id: string; name: string }

export type EntityDef =
  | { kind: 'spawn'; x: number; y: number }
  | { kind: 'enemy'; id: string; enemyId: string; x: number; y: number; /** Niveles de más por lo honda que está su sala. */ lvl?: number }
  | { kind: 'chest'; id: string; table: string; x: number; y: number }
  | { kind: 'door'; id: string; x: number; y: number; /** Fase 7: acceso especial (sin valor: puerta normal). */ lock?: DoorLock }
  /** Fase 7: altar con un pacto (beneficio y precio a la vista). */
  | { kind: 'altar'; id: string; pact: string; x: number; y: number }
  | { kind: 'trap'; id: string; x: number; y: number }
  | { kind: 'torch'; x: number; y: number; face: 'south' | 'east' }
  | { kind: 'pillar'; x: number; y: number }
  | { kind: 'portal'; x: number; y: number }
  | { kind: 'rival'; x: number; y: number }
  | { kind: 'captive'; mercId: string; x: number; y: number }
  | { kind: 'vein'; id: string; vein: import('./mining').VeinId; x: number; y: number }
  | { kind: 'decor'; sprite: DecorSprite; x: number; y: number };

/**
 * Accesos especiales (Fase 7). Todos son opcionales: nada obligatorio queda detrás de uno.
 *  · secret: muro con marcas; se abre examinándolo, sin llave ni herramienta.
 *  · key: puerta cerrada; la abre una llave de la zona, que se gasta al abrir.
 *  · gate: rastrillo de un atajo; solo se levanta desde el lado `side` (dirección desde la casilla del rastrillo).
 */
export type DoorLock = { type: 'secret' } | { type: 'key'; key: string } | { type: 'gate'; side: [number, number] };

/** Piezas de decorado (cada subzona usa las suyas: data/subzones.ts → decor). */
export const DECOR_SPRITES = ['bones', 'skull', 'barrel', 'rubble', 'grass', 'stake', 'puddle', 'crate', 'banner', 'cage', 'chain', 'urn', 'candles', 'roots', 'statue', 'coffin', 'lava', 'crystal', 'brazier', 'spikes'] as const;
export type DecorSprite = (typeof DECOR_SPRITES)[number];

export interface DungeonDef {
  id: string;
  name: string;
  width: number;
  height: number;
  rooms: RoomDef[];
  corridors: Rect[];
  entities: EntityDef[];
  /** Semilla con la que se generó (solo mazmorras procedurales). */
  seed?: number;
  /** Zona a la que pertenece (por defecto, la Mazmorra). */
  zone?: import('./data/zones/types').ZoneId;
  /** Subzona (afueras, castillo…). Las mazmorras antiguas no la tienen: se usa la primera de su zona. */
  subzone?: import('./data/subzones').SubzoneId;
}

export const CRYPTS_OF_UMBRAVEL: DungeonDef = {
  id: 'umbravel',
  name: 'Las Criptas de Umbravel',
  width: 32,
  height: 28,
  rooms: [
    { id: 'threshold', name: 'Sala del Umbral', x: 1, y: 1, w: 6, h: 6 },
    { id: 'roost', name: 'El Nido', x: 12, y: 1, w: 8, h: 7 },
    { id: 'barracks', name: 'Cuartel de los Caídos', x: 11, y: 12, w: 10, h: 7 },
    { id: 'pillars', name: 'Sala de los Pilares', x: 1, y: 13, w: 8, h: 8 },
    { id: 'throne', name: 'Trono del Osario', x: 24, y: 11, w: 7, h: 9 },
    { id: 'gate', name: 'Puerta de Ceniza', x: 2, y: 24, w: 7, h: 3 },
  ],
  corridors: [
    { x: 7, y: 3, w: 5, h: 1 },
    { x: 15, y: 8, w: 1, h: 4 },
    { x: 3, y: 7, w: 1, h: 6 },
    { x: 9, y: 16, w: 2, h: 1 },
    { x: 21, y: 15, w: 3, h: 1 },
    { x: 4, y: 21, w: 1, h: 3 },
  ],
  entities: [
    { kind: 'spawn', x: 3, y: 3 },
    // Antorchas: solo en muros norte (cara sur visible) y oeste (cara este visible)
    { kind: 'torch', x: 2, y: 0, face: 'south' }, { kind: 'torch', x: 5, y: 0, face: 'south' },
    { kind: 'torch', x: 14, y: 0, face: 'south' }, { kind: 'torch', x: 18, y: 0, face: 'south' },
    { kind: 'torch', x: 13, y: 11, face: 'south' }, { kind: 'torch', x: 18, y: 11, face: 'south' },
    { kind: 'torch', x: 0, y: 15, face: 'east' }, { kind: 'torch', x: 0, y: 19, face: 'east' },
    { kind: 'torch', x: 26, y: 10, face: 'south' }, { kind: 'torch', x: 29, y: 10, face: 'south' }, { kind: 'torch', x: 23, y: 13, face: 'east' },
    { kind: 'torch', x: 1, y: 25, face: 'east' }, { kind: 'torch', x: 7, y: 23, face: 'south' },
    // Puertas
    { kind: 'door', id: 'door_roost', x: 15, y: 10 },
    { kind: 'door', id: 'door_throne', x: 22, y: 15 },
    // Cofres
    { kind: 'chest', id: 'chest_roost', table: 'common', x: 18, y: 2 },
    { kind: 'chest', id: 'chest_barracks', table: 'common', x: 19, y: 17 },
    { kind: 'chest', id: 'chest_pillars', table: 'rich', x: 2, y: 19 },
    { kind: 'chest', id: 'chest_throne', table: 'boss', x: 29, y: 12 },
    // Enemigos
    { kind: 'enemy', id: 'e_bat1', enemyId: 'bat', x: 15, y: 4 },
    { kind: 'enemy', id: 'e_bat2', enemyId: 'bat', x: 18, y: 6 },
    { kind: 'enemy', id: 'e_skel1', enemyId: 'skeleton', x: 13, y: 14 },
    { kind: 'enemy', id: 'e_skel2', enemyId: 'skeleton', x: 18, y: 15 },
    { kind: 'enemy', id: 'e_skel3', enemyId: 'skeleton', x: 6, y: 20 },
    { kind: 'enemy', id: 'e_boss', enemyId: 'ossuary_lord', x: 27, y: 15 },
    // Trampas
    { kind: 'trap', id: 'trap1', x: 15, y: 9 },
    { kind: 'trap', id: 'trap2', x: 16, y: 16 },
    { kind: 'trap', id: 'trap3', x: 5, y: 3 },
    // Pilares
    { kind: 'pillar', x: 3, y: 15 }, { kind: 'pillar', x: 6, y: 14 }, { kind: 'pillar', x: 3, y: 18 }, { kind: 'pillar', x: 7, y: 18 },
    { kind: 'pillar', x: 25, y: 12 }, { kind: 'pillar', x: 25, y: 18 }, { kind: 'pillar', x: 29, y: 18 },
    // Rival y portal
    { kind: 'rival', x: 5, y: 16 },
    { kind: 'portal', x: 5, y: 25 },
    // Decoración
    { kind: 'decor', sprite: 'bones', x: 2, y: 5 }, { kind: 'decor', sprite: 'skull', x: 13, y: 6 },
    { kind: 'decor', sprite: 'barrel', x: 12, y: 1 }, { kind: 'decor', sprite: 'rubble', x: 20, y: 12 },
    { kind: 'decor', sprite: 'bones', x: 28, y: 17 }, { kind: 'decor', sprite: 'skull', x: 30, y: 14 },
    { kind: 'decor', sprite: 'bones', x: 7, y: 25 }, { kind: 'decor', sprite: 'barrel', x: 1, y: 13 },
  ],
};

export interface BuiltDungeon {
  def: DungeonDef;
  tiles: TileType[][]; // [y][x]
}

export function buildDungeon(def: DungeonDef): BuiltDungeon {
  const tiles: TileType[][] = Array.from({ length: def.height }, () => Array.from({ length: def.width }, () => 'void' as TileType));
  const carve = (r: Rect) => {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) tiles[y][x] = 'floor';
  };
  def.rooms.forEach(carve);
  def.corridors.forEach(carve);
  // Muros: todo vacío adyacente (8 direcciones) a un suelo.
  for (let y = 0; y < def.height; y++) {
    for (let x = 0; x < def.width; x++) {
      if (tiles[y][x] !== 'void') continue;
      outer: for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const t = tiles[y + dy]?.[x + dx];
          if (t === 'floor') { tiles[y][x] = 'wall'; break outer; }
        }
      }
    }
  }
  return { def, tiles };
}

export function roomAt(def: DungeonDef, x: number, y: number): RoomDef | null {
  return def.rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) ?? null;
}

export type Blocker = (x: number, y: number) => boolean;

/** Búsqueda en anchura sobre casillas (4 direcciones). Devuelve el camino sin incluir el origen. */
export function findPath(width: number, height: number, blocked: Blocker, from: [number, number], to: [number, number], maxNodes = 4000): [number, number][] | null {
  const key = (x: number, y: number) => y * width + x;
  if (blocked(to[0], to[1])) return null;
  const prev = new Map<number, number>();
  const q: [number, number][] = [from];
  prev.set(key(...from), -1);
  let n = 0;
  while (q.length && n++ < maxNodes) {
    const [x, y] = q.shift()!;
    if (x === to[0] && y === to[1]) {
      const path: [number, number][] = [];
      let k = key(x, y);
      while (k !== key(...from)) {
        path.unshift([k % width, Math.floor(k / width)]);
        k = prev.get(k)!;
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const k = key(nx, ny);
      if (prev.has(k) || blocked(nx, ny)) continue;
      prev.set(k, key(x, y));
      q.push([nx, ny]);
    }
  }
  return null;
}
