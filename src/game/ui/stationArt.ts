// Marcadores pixel art de las estaciones del Bastión (en pie y en ruinas) y de la tarjeta Bastión de la entrada (20 × 26 px, como los retratos de los
// mercaderes). Provisionales: las imágenes definitivas las diseña el usuario (docs/ASSETS.md). Se dibujan por código y se
// guardan en caché; siempre se muestran a escala entera y sin suavizado (clase `pixelated`).
import type { ModuleId } from '../../core/data/refuge';

/** 'intendant': retrato provisional del intendente que cuenta los mini tutoriales y la bienvenida. 'refuge': el Bastión en ruinas (tarjeta de la entrada). */
export type StationArtId = ModuleId | 'refuge' | 'intendant';
export const STATION_ART_W = 20;
export const STATION_ART_H = 26;

type Rect = [number, number, number, number, string];
const W = '#5a3a1e', W2 = '#7a5230', ST = '#5d5a66', ST2 = '#8a8794', FI = '#f2a23a', FI2 = '#ffe08a';
const ART: Record<StationArtId, Rect[]> = {
  intendant: [[5, 2, 10, 9, '#3a3346'], [6, 4, 8, 7, '#d8b48a'], [7, 6, 2, 1, '#2a1a0e'], [11, 6, 2, 1, '#2a1a0e'], [8, 9, 4, 1, '#8a5a3a'], [4, 11, 12, 13, '#3a3346'], [5, 12, 10, 11, '#4a4258'], [9, 12, 2, 11, '#e8b33a'], [2, 15, 6, 6, '#7a5230'], [3, 16, 4, 4, '#e9e1cc'], [6, 24, 3, 2, '#2a2420'], [11, 24, 3, 2, '#2a2420']],
  // Castillo en ruinas de noche: luna, torre de tejado partido, almenas rotas, brecha con antorcha y andamio, piedras caídas
  refuge: [[0, 0, 20, 26, '#141327'], [14, 2, 3, 3, '#d9d3c1'], [15, 2, 2, 1, '#f2ecd8'], [3, 3, 1, 1, '#8c8693'], [9, 1, 1, 1, '#8c8693'], [18, 7, 1, 1, '#8c8693'],
    [1, 7, 5, 15, '#3e3b48'], [2, 8, 3, 13, '#55515f'], [1, 6, 1, 1, '#3e3b48'], [3, 6, 1, 1, '#3e3b48'], [5, 5, 1, 2, '#3e3b48'], [2, 11, 1, 2, '#0b0a0e'],
    [14, 10, 5, 12, '#3e3b48'], [15, 11, 3, 10, '#55515f'], [14, 9, 1, 1, '#3e3b48'], [16, 9, 1, 1, '#3e3b48'], [18, 9, 1, 1, '#3e3b48'], [16, 14, 1, 2, FI], [16, 14, 1, 1, FI2],
    [6, 14, 3, 8, '#3e3b48'], [6, 13, 1, 1, '#3e3b48'], [8, 13, 1, 1, '#3e3b48'], [11, 15, 3, 7, '#3e3b48'], [11, 14, 1, 1, '#3e3b48'], [13, 14, 1, 1, '#3e3b48'], [7, 15, 1, 6, '#55515f'], [12, 16, 1, 5, '#55515f'],
    [8, 17, 3, 5, '#0b0a0e'], [9, 16, 1, 1, '#0b0a0e'], [3, 15, 1, 2, '#24222a'], [4, 17, 1, 1, '#24222a'], [17, 17, 1, 2, '#24222a'],
    [10, 13, 1, 3, W], [10, 11, 1, 2, FI], [10, 11, 1, 1, FI2], [13, 12, 1, 10, W2], [12, 12, 3, 1, W2],
    [0, 22, 20, 4, '#1d1b22'], [0, 22, 20, 1, '#2a2830'], [5, 21, 2, 1, '#6e6a79'], [12, 22, 2, 1, '#6e6a79'], [2, 23, 1, 1, '#6e6a79'], [16, 23, 2, 1, '#55515f'], [9, 23, 1, 1, '#55515f']],
  cot: [[1, 18, 18, 2, W], [1, 20, 2, 4, W], [17, 20, 2, 4, W], [2, 14, 16, 4, '#c9b27a'], [2, 13, 5, 3, '#e9e1cc'], [8, 14, 10, 3, '#6b4a8a']],
  kitchen: [[3, 18, 14, 6, ST], [4, 19, 12, 4, ST2], [6, 15, 8, 4, '#2a2830'], [5, 14, 10, 2, '#3a3741'], [7, 19, 6, 3, FI], [8, 20, 4, 1, FI2], [8, 10, 1, 3, '#cfcfd8'], [11, 8, 1, 4, '#cfcfd8']],
  bench: [[1, 14, 18, 3, W2], [2, 17, 2, 7, W], [16, 17, 2, 7, W], [4, 11, 4, 3, ST2], [10, 12, 7, 2, '#b8b8c4'], [14, 9, 2, 3, W]],
  infirmary: [[4, 10, 12, 14, '#e9e1cc'], [5, 11, 10, 12, '#d8cfb6'], [9, 13, 2, 8, '#b02a2a'], [6, 16, 8, 2, '#b02a2a'], [6, 7, 8, 3, W]],
  forge: [[4, 16, 12, 3, ST], [7, 19, 6, 5, ST], [3, 15, 14, 1, ST2], [6, 11, 8, 2, '#3a3741'], [13, 6, 2, 6, W], [11, 5, 6, 2, ST2], [2, 21, 3, 3, FI]],
  alchemy: [[1, 18, 18, 2, W2], [2, 20, 2, 4, W], [16, 20, 2, 4, W], [4, 11, 4, 7, '#5ab08a'], [5, 9, 2, 2, '#cceeee'], [10, 13, 4, 5, '#b58cff'], [11, 11, 2, 2, '#cceeee'], [15, 14, 2, 4, '#e8b33a']],
  // Curtiduría de Nira: bastidor con una piel tendida y un rollo de tela
  tannery: [[2, 6, 2, 18, W], [16, 6, 2, 18, W], [2, 6, 16, 2, W2], [5, 9, 10, 9, '#a0703e'], [6, 10, 8, 7, '#b8834a'], [8, 12, 1, 1, '#7a5230'], [11, 14, 1, 1, '#7a5230'], [4, 21, 6, 3, '#8a7a9a'], [5, 20, 4, 1, '#a898b8']],
  // Forja de armaduras de Valerius: yunque con una coraza y un yelmo colgado
  armory: [[4, 18, 12, 3, ST], [7, 21, 6, 3, ST], [3, 17, 14, 1, ST2], [6, 9, 8, 8, ST2], [7, 10, 6, 6, '#b8b8c4'], [9, 11, 2, 4, '#e9e1cc'], [14, 3, 4, 4, ST2], [15, 5, 2, 1, '#0b0a0e'], [2, 21, 3, 3, FI]],
};

/** Estación en ruinas: su silueta en piedra apagada, una grieta y cascotes delante (marcador hasta el arte final). */
const RUBBLE: Rect[] = [[2, 5, 1, 4, '#0b0a0e'], [3, 9, 1, 3, '#0b0a0e'], [0, 21, 20, 5, '#1d1b22'], [1, 20, 4, 2, '#55515f'], [6, 21, 3, 2, '#6e6a79'],
  [12, 20, 3, 3, '#55515f'], [16, 21, 3, 2, '#6e6a79'], [10, 22, 2, 1, '#3e3b48'], [4, 19, 2, 1, '#3e3b48'], [14, 18, 1, 2, W]];

const cache = new Map<string, string>();
/** Imagen (data URL) a tamaño real; se escala con CSS a múltiplos enteros. `ruined`: versión en ruinas de una estación. */
export function stationArtUrl(id: StationArtId, ruined = false): string {
  const key = ruined ? `${id}:ruin` : id;
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = STATION_ART_W; c.height = STATION_ART_H;
  const g = c.getContext('2d');
  if (!g) return '';
  const rects: Rect[] = ruined ? [...ART[id].map(([x, y, w, h]): Rect => [x, y, w, h, '#3a3741']), ...RUBBLE] : ART[id];
  for (const [x, y, w, h, col] of rects) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
