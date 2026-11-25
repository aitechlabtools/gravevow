// Mapa del descenso (pixel art provisional, dibujado por código; el definitivo puede sustituirlo un dibujo del usuario de
// 160 × 150 px): corte del Bastión a la Cripta y al Infierno, con un camino que baja por las 10 subzonas. Se dibuja una vez
// y se muestra a escala entera sin suavizado. MAP_NODES da la posición (en %) de cada subzona; MAP_BANDS, la de cada estrato.
export const MAP_W = 160;
export const MAP_H = 150;

/** Puntos del camino (px del dibujo), uno por subzona en orden 1–10. */
const NODES: [number, number][] = [
  [84, 22], [43, 35], [122, 44], // La Mazmorra
  [46, 63], [117, 74], [62, 89], // La Cripta
  [113, 108], [35, 121], [119, 132], [77, 143], // El Infierno
];
export const MAP_NODES: [number, number][] = NODES.map(([x, y]) => [(x / MAP_W) * 100, (y / MAP_H) * 100]);
const B1 = 52, B2 = 98; // fronteras entre estratos (px)
export const MAP_BANDS: [number, number][] = [[0, (B1 / MAP_H) * 100], [(B1 / MAP_H) * 100, (B2 / MAP_H) * 100], [(B2 / MAP_H) * 100, 100]];

// Generador pseudoaleatorio fijo: el dibujo sale siempre igual.
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

let cached = '';
export function mapArtUrl(): string {
  if (cached) return cached;
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = MAP_W; c.height = MAP_H;
  const g = c.getContext('2d');
  if (!g) return '';
  const r = rng(11);
  const px = (x: number, y: number, col: string, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const dith = (x: number, y: number, t: number) => ((x + y * 2) % 4) / 4 < t; // tramado ordenado 4×4 simple
  const wave = (base: number, amp: number, x: number) => base + Math.round(Math.sin(x / 8) * amp + Math.sin(x / 3.7) * (amp / 2));
  const e1 = (x: number) => wave(B1, 1.5, x), e2 = (x: number) => wave(B2, 2, x);
  const GROUND = 16; // suelo del Bastión

  // ── Cielo nocturno con degradado tramado, estrellas y luna
  for (let x = 0; x < MAP_W; x++) for (let y = 0; y < GROUND; y++) px(x, y, dith(x, y, y / GROUND) ? '#1f1d2c' : '#15131f');
  for (let i = 0; i < 22; i++) { const x = r() * MAP_W, y = r() * 9; px(x, y, r() > 0.75 ? '#e9e1cc' : '#6e6a79'); }
  px(140, 2, '#d9d3c1', 6, 6); px(139, 3, '#d9d3c1', 8, 4); px(141, 3, '#f2ecd8', 3, 2); px(144, 5, '#bdb6a3', 2, 1);

  // ── Roca de las mazmorras: textura con piedras (luz arriba, sombra abajo)
  for (let x = 0; x < MAP_W; x++) for (let y = GROUND; y < MAP_H; y++) {
    if (y < e1(x)) px(x, y, '#302d37');
    else if (y < e2(x)) px(x, y, '#231d31');
    else { const t = (y - e2(x)) / (MAP_H - e2(x)); px(x, y, dith(x, y, t) ? '#3f170f' : '#2a100b'); }
  }
  for (let i = 0; i < 70; i++) { // piedras sueltas en la roca gris
    const x = r() * MAP_W, y = GROUND + 2 + r() * (B1 - GROUND - 4), w = 3 + Math.floor(r() * 4);
    px(x, y, '#3b3843', w, 2); px(x, y, '#46434f', w, 1); px(x, y + 2, '#26242c', w, 1);
  }
  // Muro de ladrillo de la Cripta (hiladas alternas)
  for (let y = B1 + 2; y < B2 + 2; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < MAP_W; x += 8) {
    if (y >= e2(x) - 1 || y <= e1(x) + 1) continue;
    px(x, y, '#2b2440', 7, 3); px(x, y, '#342b4c', 7, 1); px(x + 7, y, '#1a1524', 1, 3);
  }
  // Fronteras: veta clara arriba, sombra abajo
  for (let x = 0; x < MAP_W; x++) {
    px(x, GROUND, '#55515f'); px(x, GROUND + 1, '#3b3843');
    px(x, e1(x), '#4a4552'); px(x, e1(x) + 1, '#120f18'); px(x, e1(x) + 2, '#120f18');
    px(x, e2(x), '#6a2a18'); px(x, e2(x) + 1, '#120705');
  }

  // ── El Bastión: muralla con almenas, torres con tejado, estandartes y puerta
  const wallTop = 9;
  for (let x = 10; x < 150; x++) {
    for (let y = wallTop; y < GROUND; y++) px(x, y, (x + y) % 5 === 0 ? '#34313d' : '#3e3b48');
    if (x % 4 < 2) px(x, wallTop - 2, '#3e3b48', 1, 2);
    px(x, wallTop, '#4f4b5a');
  }
  const towers: [number, number, number][] = [[12, 8, 12], [44, 7, 10], [74, 12, 16], [106, 7, 10], [138, 8, 12]];
  for (const [tx, tw, th] of towers) {
    const top = GROUND - th;
    for (let x = tx; x < tx + tw; x++) for (let y = top; y < GROUND; y++) px(x, y, x === tx ? '#4f4b5a' : x === tx + tw - 1 ? '#2c2a33' : '#433f4d');
    for (let k = 0; k <= tw / 2 + 1; k++) px(tx - 1 + k, top - 1 - Math.floor(k * 0.9), '#5a2a2a', tw + 2 - k * 2, 1); // tejado
    px(tx + Math.floor(tw / 2), top - Math.ceil(tw / 2) - 4, '#8a8178', 1, 4); // mástil
    px(tx + Math.floor(tw / 2) + 1, top - Math.ceil(tw / 2) - 4, '#b02a2a', 3, 2); // estandarte
    px(tx + Math.floor(tw / 2) - 1, top + 3, '#e8b33a', 2, 2); px(tx + Math.floor(tw / 2) - 1, top + 3, '#ffe08a', 1, 1); // ventana
  }
  px(78, GROUND - 6, '#0b0a0e', 4, 6); px(79, GROUND - 7, '#0b0a0e', 2, 1); // puerta
  px(75, GROUND - 5, '#f2a23a'); px(83, GROUND - 5, '#f2a23a'); // antorchas de la puerta

  // ── Mazmorras: túneles con antorchas, rejas, cadenas
  for (let i = 0; i < 6; i++) {
    const x = 6 + r() * 130, y = 24 + r() * 22, w = 12 + r() * 16;
    px(x, y, '#17151b', w, 4); px(x, y - 1, '#3b3843', w, 1); px(x, y + 4, '#46434f', w, 1);
    if (r() > 0.4) { const tx = x + w / 2; px(tx, y + 1, '#f2a23a'); px(tx, y, '#ffe08a'); px(tx - 1, y + 1, '#5a3a1e'); }
  }
  for (let i = 0; i < 4; i++) { const x = 8 + r() * 140, y = 22 + r() * 22; px(x - 1, y - 1, '#26242c', 8, 7); for (let k = 0; k < 4; k++) px(x + k * 2, y, '#6e6a79', 1, 5); px(x, y, '#6e6a79', 7, 1); }
  for (let i = 0; i < 5; i++) { const x = 4 + r() * 150, y = GROUND + 2; const n = 3 + Math.floor(r() * 4); for (let k = 0; k < n; k++) px(x, y + k, k % 2 ? '#8a8794' : '#55515f'); }

  // ── Cripta: arcos con nichos, ataúdes, velas encendidas, telarañas, calaveras
  for (let i = 0; i < 5; i++) {
    const x = 6 + i * 31 + r() * 8, y = B1 + 9 + r() * 20;
    px(x, y, '#120e18', 10, 8); px(x + 1, y - 1, '#120e18', 8, 1); px(x + 2, y - 2, '#120e18', 6, 1); // arco
    px(x - 1, y - 3, '#4e4466', 12, 1); px(x - 1, y - 2, '#4e4466', 1, 10); px(x + 10, y - 2, '#4e4466', 1, 10);
    px(x + 2, y + 5, '#cfc6b0', 3, 2); px(x + 3, y + 5, '#120e18'); px(x + 6, y + 6, '#cfc6b0', 2, 1); // calavera y hueso
  }
  for (let i = 0; i < 4; i++) { // ataúdes
    const x = 10 + r() * 135, y = B1 + 30 + r() * 10;
    px(x, y, '#4a2e1e', 9, 3); px(x + 1, y - 1, '#5a3a24', 7, 1); px(x, y + 3, '#2a1a12', 9, 1); px(x + 4, y, '#8a6a3a', 1, 3);
  }
  for (let i = 0; i < 9; i++) { // velas
    const x = 4 + r() * 152, y = B1 + 8 + r() * 34;
    px(x, y, '#e9e1cc', 1, 3); px(x, y - 1, '#ffb347'); px(x, y - 2, '#ffe08a');
    px(x - 1, y - 1, '#4a3a5a'); px(x + 1, y - 1, '#4a3a5a'); // halo tenue
  }
  for (const [x, y] of [[0, B1 + 3], [152, B1 + 3]] as const) for (let k = 0; k < 7; k++) { px(x + (x ? 7 - k : k), y + k, '#5d5470'); px(x + (x ? 7 - k : k), y + 6 - k + 1, '#3f3852'); }
  for (let i = 0; i < 10; i++) { const x = 4 + r() * 150, y = B1 + 4 + r() * 38; if (r() > 0.5) { px(x + 1, y, '#5d5470', 1, 6); px(x - 1, y + 2, '#5d5470', 5, 1); } }

  // ── Infierno: estalactitas, islas de roca, ríos de lava con núcleo brillante, llamas y brasas
  for (let x = 0; x < MAP_W; x += 5 + Math.floor(r() * 5)) { const h = 3 + Math.floor(r() * 6); for (let k = 0; k < h; k++) px(x, e2(x) + 2 + k, '#1a0b08', Math.max(1, 3 - Math.floor(k / 2)), 1); }
  for (let k = 0; k < 3; k++) {
    const base = 106 + k * 15;
    for (let x = 0; x < MAP_W; x++) {
      const p = (x + k * 9) % 28, y = base + Math.round((p < 14 ? p : 28 - p) / 3.5);
      px(x, y - 1, '#5a1a0c'); px(x, y, '#ff9a3c'); px(x, y + 1, '#c2501e'); px(x, y + 2, '#5a1a0c');
      if ((x + k * 5) % 9 === 0) px(x, y, '#ffe08a');
    }
  }
  for (let i = 0; i < 7; i++) { // llamas
    const x = 6 + r() * 148, y = B2 + 10 + r() * 38;
    px(x, y, '#c2361a', 3, 3); px(x + 1, y - 2, '#e8752b', 1, 3); px(x, y - 1, '#e8752b'); px(x + 2, y - 1, '#e8752b'); px(x + 1, y, '#ffe08a');
  }
  for (let i = 0; i < 40; i++) px(r() * MAP_W, B2 + 4 + r() * 46, r() > 0.6 ? '#ffb070' : '#a0301a');

  // ── Camino: puntos claros con sombra, entre subzonas
  for (let i = 0; i < NODES.length - 1; i++) {
    const [ax, ay] = NODES[i], [bx, by] = NODES[i + 1];
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 3);
    for (let k = 1; k < n; k++) { const t = k / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t; px(x, y + 1, '#0b0a0e'); px(x, y, '#e9dcb4'); }
  }
  cached = c.toDataURL();
  return cached;
}
