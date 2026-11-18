// Iconos pequeños de la interfaz en pixel art, hechos por código con la paleta del juego (provisionales, ver docs/ASSETS.md):
// XP, reputación, repetible, clavo, chincheta, candado, corona de jefe, calavera, libro y sombra en el suelo.
// Se escalan solo por enteros.
type Pal = Record<string, string>;
const cache = new Map<string, string>();

function draw(rows: string[], pal: Pal, scale: number): string {
  const key = rows.join('|') + JSON.stringify(pal) + scale;
  const hit = cache.get(key); if (hit) return hit;
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d')!;
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x * scale, y * scale, scale, scale); } }));
  const url = c.toDataURL(); cache.set(key, url); return url;
}

const O = '#07060a';
// XP: chispa arcana de cuatro puntas (morado del juego)
export const xpIcon = (s = 3) => draw([
  '....o....', '...oao...', '...oao...', '..oaAao..', 'ooaAhAaoo', '..oaAao..', '...oao...', '...oao...', '....o....',
], { o: O, a: '#7a3fb0', A: '#a35ae0', h: '#e6c8ff' }, s);
// Reputación: blasón con estrella (el color lo pone el mercader)
export const repIcon = (color: string, s = 3) => draw([
  'ooooooooo', 'oaaaaaaAo', 'oaaahaaAo', 'oaahhhaAo', 'oaaahaaAo', 'oaaaaaaAo', '.oaaaaAo.', '..oaaAo..', '...ooo...',
], { o: O, a: color, A: shade(color, -0.35), h: '#fff6dc' }, s);
// Repetible: dos flechas en circuito (arriba hacia la derecha, abajo hacia la izquierda), con contorno
export const loopIcon = (s = 3) => {
  const shape = [
    '........b...',
    '.bbbbbbbbb..',
    'bb......b...',
    'bb..........',
    'bb........bb',
    '..........bb',
    '...b......bb',
    '..bbbbbbbbb.',
    '...b........',
  ];
  const g = ['.'.repeat(14), ...shape.map((r) => '.' + r + '.'), '.'.repeat(14)].map((r) => [...r]);
  const out = g.map((r, y) => r.map((ch, x) => ch !== '.' ? ch : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx] === 'b') ? 'o' : '.').join(''));
  return draw(out, { o: O, b: '#c8bfa8' }, s);
};
// Clavo de hierro (sujeta las notas)
export const nailIcon = (s = 3) => draw(['.ooo.', 'oaAao', 'oAhAo', 'oaAao', '.ooo.'], { o: O, a: '#5e574f', A: '#8a8178', h: '#c9c2b6' }, s);
// Chincheta roja de la misión fijada
export const pinIcon = (s = 3) => draw([
  '..ooooo..', '.oaaaaao.', 'oaahaaaAo', 'oahhaaaAo', 'oaaaaaaAo', '.oaaaaAo.', '..ooooo..', '....o....', '....o....', '....o....',
], { o: O, a: '#c4283b', A: '#7a1c22', h: '#ff8f8f' }, s);
// Candado de la información bloqueada
export const lockIcon = (s = 3) => draw([
  '..ooo..', '.oaaao.', '.oo.oo.', '.oo.oo.', 'ooooooo', 'ogggggo', 'oggoggo', 'oggoggo', 'ogggggo', 'ooooooo',
], { o: O, a: '#8a8178', g: '#9a6b1a' }, s);
// Corona pequeña de los jefes (marco)
export const crownIcon = (s = 3) => draw([
  'o..o..o', 'oaoaoao', 'oaaaaao', 'oayaRao', 'oaaaaao', 'ooooooo',
], { o: O, a: '#e8b33a', y: '#fbe7a6', R: '#c4283b' }, s);
// Calavera (criaturas derrotadas, cabecera del Bestiario)
export const skullIcon = (s = 3) => draw([
  '..ooooo..', '.obbbbbo.', 'obbbbbbbo', 'obooboobo', 'obooboobo', 'obbbobbbo', '.obbbbbo.', '..obobo..', '..ooooo..',
], { o: O, b: '#d6cdb8' }, s);
// Libro (progreso del Bestiario)
export const bookIcon = (s = 3) => draw([
  'ooooooooo', 'oaaaaaawo', 'oaagaaawo', 'oaggga.wo', 'oaagaaawo', 'oaaaaaawo', 'oaaaaaawo', 'ooooooooo',
], { o: O, a: '#5e2a2a', g: '#e8b33a', w: '#d6cdb8', '.': '#d6cdb8' }, s);

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + k))));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
}

// Sombra en el suelo, en pixel art y de un color plano (#07060a, el contorno del juego)
export const floorShadow = (s = 3) => draw(['...oooooooooo...', '.oooooooooooooo.', '.oooooooooooooo.', '...oooooooooo...'], { o: '#07060a' }, s);
