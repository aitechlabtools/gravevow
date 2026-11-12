// Marcadores pixel art de las estaciones del Refugio y de la entrada del Bastión (20 × 26 px, como los retratos de los
// mercaderes). Provisionales: las imágenes definitivas las diseña el usuario (docs/ASSETS.md). Se dibujan por código y se
// guardan en caché; siempre se muestran a escala entera y sin suavizado (clase `pixelated`).
import type { ModuleId } from '../../core/data/refuge';

export type StationArtId = ModuleId | 'refuge';
export const STATION_ART_W = 20;
export const STATION_ART_H = 26;

type Rect = [number, number, number, number, string];
const W = '#5a3a1e', W2 = '#7a5230', ST = '#5d5a66', ST2 = '#8a8794', FI = '#f2a23a', FI2 = '#ffe08a', DK = '#3a2a18';
const ART: Record<StationArtId, Rect[]> = {
  refuge: [[2, 12, 16, 12, W], [3, 13, 14, 10, W2], [1, 10, 18, 3, DK], [4, 7, 12, 3, DK], [7, 4, 6, 3, DK], [8, 17, 4, 7, '#2a1a0e'], [13, 15, 3, 3, FI], [14, 16, 1, 1, FI2], [15, 1, 2, 6, ST], [15, 0, 2, 1, '#8c8693']],
  cot: [[1, 18, 18, 2, W], [1, 20, 2, 4, W], [17, 20, 2, 4, W], [2, 14, 16, 4, '#c9b27a'], [2, 13, 5, 3, '#e9e1cc'], [8, 14, 10, 3, '#6b4a8a']],
  kitchen: [[3, 18, 14, 6, ST], [4, 19, 12, 4, ST2], [6, 15, 8, 4, '#2a2830'], [5, 14, 10, 2, '#3a3741'], [7, 19, 6, 3, FI], [8, 20, 4, 1, FI2], [8, 10, 1, 3, '#cfcfd8'], [11, 8, 1, 4, '#cfcfd8']],
  bench: [[1, 14, 18, 3, W2], [2, 17, 2, 7, W], [16, 17, 2, 7, W], [4, 11, 4, 3, ST2], [10, 12, 7, 2, '#b8b8c4'], [14, 9, 2, 3, W]],
  infirmary: [[4, 10, 12, 14, '#e9e1cc'], [5, 11, 10, 12, '#d8cfb6'], [9, 13, 2, 8, '#b02a2a'], [6, 16, 8, 2, '#b02a2a'], [6, 7, 8, 3, W]],
  forge: [[4, 16, 12, 3, ST], [7, 19, 6, 5, ST], [3, 15, 14, 1, ST2], [6, 11, 8, 2, '#3a3741'], [13, 6, 2, 6, W], [11, 5, 6, 2, ST2], [2, 21, 3, 3, FI]],
  alchemy: [[1, 18, 18, 2, W2], [2, 20, 2, 4, W], [16, 20, 2, 4, W], [4, 11, 4, 7, '#5ab08a'], [5, 9, 2, 2, '#cceeee'], [10, 13, 4, 5, '#b58cff'], [11, 11, 2, 2, '#cceeee'], [15, 14, 2, 4, '#e8b33a']],
  runic: [[9, 12, 2, 12, W], [5, 22, 10, 2, W], [4, 8, 12, 5, W2], [5, 9, 10, 3, '#e9e1cc'], [7, 10, 1, 1, '#b58cff'], [10, 10, 1, 1, '#b58cff'], [12, 10, 1, 1, '#b58cff']],
};

const cache = new Map<StationArtId, string>();
/** Imagen (data URL) a tamaño real; se escala con CSS a múltiplos enteros. */
export function stationArtUrl(id: StationArtId): string {
  const hit = cache.get(id);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = STATION_ART_W; c.height = STATION_ART_H;
  const g = c.getContext('2d');
  if (!g) return '';
  for (const [x, y, w, h, col] of ART[id]) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  const url = c.toDataURL();
  cache.set(id, url);
  return url;
}
