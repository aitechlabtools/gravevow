// ════════════════════════════════════════════════════════════════════
// Generador de pixel art procedural de Gravevow.
// Todo el arte de la demo se dibuja por código: es original, no depende de
// archivos externos y se comparte entre el juego (Phaser), la interfaz y la web.
// Son placeholders coherentes: ver docs/ASSETS.md para su sustitución.
// ════════════════════════════════════════════════════════════════════
import { PAL, shade, CLOAK_COLORS, SKIN_COLORS } from './palette';
import type { Appearance, ClassId, Equipment } from '../core/types';
import { EQUIP_SLOTS } from '../core/types';
import { lookOf, lookSignature, starterEquipment } from './gearLook';
import { SKINS, anchorFor, LAYER_ORDER, type View } from '../core/data/skins';

export type Canvas = HTMLCanvasElement;

function canvas(w: number, h: number): [Canvas, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/** Hash determinista para ruido de texturas. */
function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

class Pix {
  c: Canvas;
  ctx: CanvasRenderingContext2D;
  constructor(public w: number, public h: number) {
    [this.c, this.ctx] = canvas(w, h);
  }
  px(x: number, y: number, col: string) {
    this.ctx.fillStyle = col;
    this.ctx.fillRect(x, y, 1, 1);
  }
  rect(x: number, y: number, w: number, h: number, col: string) {
    this.ctx.fillStyle = col;
    this.ctx.fillRect(x, y, w, h);
  }
  /** Contorno oscuro de 1px alrededor de los píxeles opacos. */
  outline(col = PAL.outline) {
    const img = this.ctx.getImageData(0, 0, this.w, this.h);
    const d = img.data;
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < this.w && y < this.h && d[(y * this.w + x) * 4 + 3] > 0;
    const out: [number, number][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) out.push([x, y]);
    for (const [x, y] of out) this.px(x, y, col);
    return this;
  }
  mirror(): Canvas {
    const [c, ctx] = canvas(this.w, this.h);
    ctx.translate(this.w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(this.c, 0, 0);
    return c;
  }
}

// ── Personajes ────────────────────────────────────────────────────────

export interface HumanoidSpec {
  skin: string;
  hair?: string;
  torso: string;
  trim: string;
  legs: string;
  boots: string;
  cape?: string;
  head: 'helmet' | 'hood' | 'wizard' | 'hair' | 'skull' | 'crown' | 'hoodskull';
  headColor?: string;
  /** Cinta del sombrero. */
  hatTrim?: string;
  weapon: 'sword' | 'axe' | 'staff' | 'dagger' | 'mace' | 'greatsword' | 'none';
  /** Color de la hoja (espadas, hachas, dagas) o del asta (báculos). */
  weaponColor?: string;
  orb?: string;
  offhand?: 'shield' | 'dagger' | 'tome' | 'none';
  shieldColor?: string;
  shieldRim?: string;
  shieldEmblem?: string;
  tomeColor?: string;
  /** Estilo del torso: túnica/jubón, cota de malla o túnica larga que tapa las piernas. */
  torsoStyle?: 'tunic' | 'mail' | 'robe' | 'shirt';
  /** Color de las manos si lleva guantes. */
  hands?: string;
  /** Colgante visible en el pecho. */
  amulet?: string;
  ribs?: boolean;
  eye?: string;
  /** Atuendo con sprites ya cargados: el cuerpo sale de su hoja (ver loadSkinSheets) en vez de dibujarse por código. */
  sheet?: string;
}

// ── Atuendos con sprites del usuario ──────────────────────────────────
// Hoja de 140×26: 7 fotogramas de 20×26 (frente: 4 de paso y ataque; espaldas: reposo y ataque). La piel de la cara va en
// #FF00FF (luz) y #B000B0 (sombra) y se cambia por el tono del jugador. Anclajes: hoja aparte con un píxel #FF0000 en la
// mano derecha y #0000FF en la izquierda de cada fotograma. Mientras no existan, el atuendo usa su marcador provisional.
const SHEETS = new Map<string, { img: CanvasImageSource }>();
const SHEET_FRAME: Record<View, (frame: number, pose: 'idle' | 'attack' | 'hurt') => number> = {
  front: (f, pose) => (pose === 'attack' ? 4 : f % 4),
  back: (_f, pose) => (pose === 'attack' ? 6 : 5),
};
/** Pinta el cuerpo desde la hoja de sprites del atuendo, cambiando la piel clave por la del jugador. */
function drawSheetBody(p: Pix, s: HumanoidSpec, id: string, frame: number, pose: 'idle' | 'attack' | 'hurt', view: View) {
  const sh = SHEETS.get(id);
  if (!sh) return;
  const i = SHEET_FRAME[view](frame, pose);
  p.ctx.drawImage(sh.img, i * HUM_W, 0, HUM_W, HUM_H, 0, 0, HUM_W, HUM_H);
  const img = p.ctx.getImageData(0, 0, HUM_W, HUM_H);
  const light = hexRgb(s.skin), dark = hexRgb(shade(s.skin, -0.25));
  for (let k = 0; k < img.data.length; k += 4) {
    const [r, g, b] = [img.data[k], img.data[k + 1], img.data[k + 2]];
    const to = r === 255 && g === 0 && b === 255 ? light : r === 176 && g === 0 && b === 176 ? dark : null;
    if (to) [img.data[k], img.data[k + 1], img.data[k + 2]] = to;
  }
  p.ctx.putImageData(img, 0, 0);
}
function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Carga las hojas de los atuendos que tengan sprites (y sus anclajes). Sin sprites no hace nada. */
export async function loadSkinSheets(base = './skins/'): Promise<void> {
  if (typeof Image === 'undefined') return;
  const load = (src: string) => new Promise<HTMLImageElement>((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ko; im.src = src; });
  await Promise.all(Object.values(SKINS).filter((d) => d.sprites).map(async (d) => {
    try {
      const img = await load(base + d.sprites!.sheet);
      SHEETS.set(d.id, { img });
      if (d.sprites!.anchors) readSkinAnchors(d.id, await load(base + d.sprites!.anchors));
    } catch { /* sin hoja: se queda el marcador provisional */ }
  }));
}
/** Anclaje propio del atuendo para este fotograma (si su hoja de anclajes lo marca); si no, el de por defecto. */
function sheetAnchor(s: HumanoidSpec, view: View, frame: number, pose: 'idle' | 'attack' | 'hurt') {
  const a = s.sheet ? SKIN_ANCHORS.get(s.sheet)?.[SHEET_FRAME[view](frame, pose)] : undefined;
  if (!a) return null;
  const def = anchorFor(view, frame, pose);
  return { right: a.right ?? def.right, left: a.left ?? def.left };
}
/** Anclajes leídos de la hoja de anclajes del atuendo (fotograma → mano derecha/izquierda). */
export const SKIN_ANCHORS = new Map<string, ({ right?: { x: number; y: number }; left?: { x: number; y: number } })[]>();
function readSkinAnchors(id: string, img: HTMLImageElement) {
  const [c, ctx] = canvas(HUM_W * 7, HUM_H);
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, HUM_W * 7, HUM_H).data;
  const out: ({ right?: { x: number; y: number }; left?: { x: number; y: number } })[] = Array.from({ length: 7 }, () => ({}));
  for (let y = 0; y < HUM_H; y++) for (let x = 0; x < HUM_W * 7; x++) {
    const k = (y * HUM_W * 7 + x) * 4;
    if (d[k + 3] < 200) continue;
    const f = Math.floor(x / HUM_W), lx = x % HUM_W;
    if (d[k] === 255 && d[k + 1] === 0 && d[k + 2] === 0) out[f].right = { x: lx, y };
    if (d[k] === 0 && d[k + 1] === 0 && d[k + 2] === 255) out[f].left = { x: lx, y };
  }
  void c;
  SKIN_ANCHORS.set(id, out);
}

export const HUM_W = 20;
export const HUM_H = 26;

/** Dibuja un humanoide frontal. frame 0 = reposo, 1/3 = paso, 2 = reposo alterno. */
export function drawHumanoid(s: HumanoidSpec, frame = 0, pose: 'idle' | 'attack' | 'hurt' = 'idle'): Canvas {
  const p = new Pix(HUM_W, HUM_H);
  const bob = frame === 1 || frame === 3 ? -1 : 0;
  const lLeg = frame === 1 ? -1 : 0;
  const rLeg = frame === 3 ? -1 : 0;
  const armSwing = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const y0 = bob;
  const skinShade = shade(s.skin, -0.25);
  const anchor = sheetAnchor(s, 'front', frame, pose) ?? anchorFor('front', frame, pose);
  const ar = anchor.right, al = anchor.left;
  const layers: Record<'body' | 'offhand' | 'weapon', () => void> = {
    body: () => {

  // Capa (detrás)
  if (s.cape) {
    p.rect(6, 11 + y0, 8, 10, s.cape);
    p.rect(6, 20 + y0, 8, 1, shade(s.cape, -0.3));
    p.rect(13, 11 + y0, 1, 10, shade(s.cape, -0.25));
  }
  // Piernas
  const legCol = s.ribs ? s.skin : s.legs;
  const legW = s.ribs ? 1 : 2;
  p.rect(7 + (s.ribs ? 1 : 0), 18 + y0 + lLeg, legW, 5 - lLeg - y0, legCol);
  p.rect(11, 18 + y0 + rLeg, legW, 5 - rLeg - y0, legCol);
  p.rect(7, 22 + lLeg, 2, 2, s.boots);
  p.rect(11, 22 + rLeg, 2, 2, s.boots);
  // Torso
  if (s.torsoStyle === 'robe' && !s.ribs) {
    p.rect(6, 17 + y0, 8, 5 - y0, s.torso);
    p.rect(13, 17 + y0, 1, 5 - y0, shade(s.torso, -0.3));
    p.rect(6, 21, 8, 1, shade(s.torso, -0.2));
    p.rect(9, 17 + y0, 1, 5 - y0, s.trim);
  }
  if (s.ribs) {
    p.rect(9, 11 + y0, 2, 8, s.skin); // columna
    for (let r = 0; r < 3; r++) p.rect(7, 12 + r * 2 + y0, 6, 1, s.skin);
    p.rect(7, 18 + y0, 6, 1, skinShade); // pelvis
    if (s.torso !== s.skin) {
      p.rect(6, 11 + y0, 8, 2, s.torso); // hombreras / harapos
      p.rect(6, 16 + y0, 8, 2, s.torso);
    }
  } else {
    p.rect(6, 11 + y0, 8, 8, s.torso);
    p.rect(6, 11 + y0, 1, 8, shade(s.torso, 0.15));
    p.rect(13, 11 + y0, 1, 8, shade(s.torso, -0.3));
    p.rect(7, 11 + y0, 6, 1, s.trim);
    p.rect(6, 17 + y0, 8, 1, s.trim);
    p.px(10, 17 + y0, PAL.gold2);
    if (s.torsoStyle === 'mail') {
      // Anillas: punteado claro sobre el metal
      for (let yy = 12; yy < 17; yy++) for (let xx = 7; xx < 13; xx++) if ((xx + yy) % 2 === 0) p.px(xx, yy + y0, shade(s.torso, 0.3));
    } else if (s.torsoStyle === 'robe') {
      p.rect(9, 12 + y0, 1, 5, s.trim);
    } else if (s.torsoStyle === 'shirt') {
      p.rect(9, 11 + y0, 2, 2, shade(s.torso, -0.25)); // cuello abierto
    }
    if (s.amulet) {
      p.px(8, 12 + y0, PAL.gold1);
      p.px(11, 12 + y0, PAL.gold1);
      p.rect(9, 13 + y0, 2, 2, s.amulet);
      p.px(9, 13 + y0, shade(s.amulet, 0.45));
    }
  }
  // Brazos
  const sleeve = s.ribs ? s.skin : shade(s.torso, -0.1);
  const attackLift = pose === 'attack' ? -3 : 0;
  p.rect(5, 12 + y0 - armSwing, 1, 5, sleeve);
  p.rect(14, 12 + y0 + armSwing + attackLift, 1, 5, sleeve);
  const hand = s.hands ?? s.skin;
  p.px(5, 17 + y0 - armSwing, hand);
  p.px(14, 17 + y0 + armSwing + attackLift, hand);
  if (s.hands) {
    p.px(5, 16 + y0 - armSwing, shade(s.hands, -0.2));
    p.px(14, 16 + y0 + armSwing + attackLift, shade(s.hands, -0.2));
  }
  // Cabeza
  const hy = 5 + y0;
  p.rect(7, hy, 6, 6, s.skin);
  p.rect(12, hy, 1, 6, skinShade);
  const eye = s.eye ?? PAL.outline;
  if (s.head === 'skull' || s.head === 'crown' || s.head === 'hoodskull') {
    p.rect(8, hy + 2, 2, 2, PAL.outline);
    p.rect(11, hy + 2, 1, 2, PAL.outline);
    p.px(8, hy + 3, eye);
    p.px(11, hy + 3, eye);
    p.rect(8, hy + 5, 4, 1, skinShade);
    p.px(9, hy + 5, PAL.outline);
    p.px(11, hy + 5, PAL.outline);
  } else {
    p.px(8, hy + 3, eye);
    p.px(11, hy + 3, eye);
    p.px(10, hy + 4, skinShade);
  }
  const hc = s.headColor ?? s.hair ?? PAL.earth1;
  switch (s.head) {
    case 'hair':
      p.rect(7, hy - 1, 6, 2, hc);
      p.px(7, hy + 1, hc);
      p.px(12, hy + 1, hc);
      p.rect(6, hy, 1, 4, hc);
      break;
    case 'helmet':
      p.rect(6, hy - 2, 8, 4, hc);
      p.rect(6, hy + 2, 1, 4, hc);
      p.rect(13, hy + 2, 1, 4, shade(hc, -0.3));
      p.rect(7, hy - 2, 2, 1, shade(hc, 0.4));
      p.rect(8, hy + 2, 4, 1, PAL.outline);
      p.rect(10, hy + 2, 1, 3, hc);
      p.rect(13, hy - 2, 1, 4, shade(hc, -0.3));
      p.px(10, hy - 3, PAL.threat2);
      break;
    case 'hood':
    case 'hoodskull':
      p.rect(6, hy - 2, 8, 3, hc);
      p.rect(6, hy + 1, 1, 5, hc);
      p.rect(13, hy + 1, 1, 5, shade(hc, -0.3));
      p.rect(7, hy + 1, 6, 1, shade(s.skin, -0.5));
      p.px(9, hy - 3, hc);
      p.px(10, hy - 3, hc);
      break;
    case 'wizard':
      p.rect(5, hy, 10, 1, hc);
      p.rect(7, hy - 2, 6, 2, hc);
      p.rect(8, hy - 4, 4, 2, hc);
      p.rect(9, hy - 5, 2, 1, hc);
      p.px(11, hy - 6, hc);
      p.rect(7, hy - 1, 6, 1, s.hatTrim ?? s.trim);
      p.px(9, hy - 3, PAL.gold3);
      p.rect(12, hy - 2, 1, 2, shade(hc, -0.3));
      break;
    case 'crown':
      p.rect(7, hy - 2, 6, 2, PAL.gold2);
      p.px(7, hy - 3, PAL.gold2);
      p.px(9, hy - 3, PAL.gold2);
      p.px(12, hy - 3, PAL.gold2);
      p.px(10, hy - 2, PAL.threat2);
      p.rect(12, hy - 2, 1, 2, PAL.gold1);
      break;
    case 'skull':
      break;
  }
    },
    weapon: () => {
  // Arma (mano derecha, x≈15)
  const wy = ar.y - 5; // la empuñadura queda en la mano derecha (ancla)
  switch (s.weapon) {
    case 'sword': {
      const blade = s.weaponColor ?? PAL.steel2;
      p.rect(ar.x + 1, wy - 7, 1, 10, blade);
      p.px(ar.x + 1, wy - 8, shade(blade, 0.4));
      p.rect(ar.x, wy + 3, 3, 1, PAL.gold1);
      p.rect(ar.x + 1, wy + 4, 1, 2, PAL.earth1);
      break;
    }
    case 'axe': {
      const head = s.weaponColor ?? PAL.steel2;
      p.rect(ar.x + 1, wy - 6, 1, 12, PAL.earth1);
      p.rect(ar.x + 2, wy - 6, 2, 4, head);
      p.rect(ar.x + 2, wy - 7, 1, 1, head);
      p.rect(ar.x + 2, wy - 2, 1, 1, head);
      p.px(ar.x + 3, wy - 5, shade(head, 0.4));
      break;
    }
    case 'greatsword':
      p.rect(ar.x + 1, wy - 10, 2, 13, PAL.bone1);
      p.rect(ar.x + 1, wy - 10, 1, 13, PAL.bone2);
      p.rect(ar.x - 1, wy + 3, 6, 1, PAL.magic1);
      p.rect(ar.x + 1, wy + 4, 2, 2, PAL.earth0);
      break;
    case 'staff':
      p.rect(ar.x + 1, wy - 9, 1, 19, s.weaponColor ?? PAL.earth2);
      p.rect(ar.x, wy - 12, 3, 3, s.orb ?? PAL.magic2);
      p.px(ar.x, wy - 12, PAL.bone3);
      break;
    case 'dagger':
      p.rect(ar.x + 1, wy - 2, 1, 4, s.weaponColor ?? PAL.steel2);
      p.px(ar.x + 1, wy - 3, shade(s.weaponColor ?? PAL.steel2, 0.4));
      p.rect(ar.x, wy + 2, 3, 1, PAL.earth1);
      break;
    case 'mace':
      p.rect(ar.x + 1, wy - 3, 1, 8, PAL.earth2);
      p.rect(ar.x, wy - 6, 3, 3, PAL.gold2);
      p.px(ar.x, wy - 6, PAL.gold3);
      break;
  }
    },
    offhand: () => {
  // Mano izquierda
  if (s.offhand === 'shield') {
    const sc = s.shieldColor ?? PAL.earth2;
    p.rect(al.x - 3, (al.y - 5), 4, 6, sc);
    p.rect(al.x - 3, (al.y - 5), 4, 1, s.shieldRim ?? PAL.steel1);
    p.rect(al.x - 2, (al.y), 2, 1, sc);
    p.px(al.x - 2, (al.y - 3), s.shieldEmblem ?? PAL.gold2);
    p.px(al.x - 1, (al.y - 3), s.shieldEmblem ?? PAL.gold2);
    p.rect(al.x - 3, (al.y - 4), 1, 4, shade(sc, 0.2));
    if (s.shieldRim) p.rect(al.x, (al.y - 4), 1, 4, s.shieldRim);
  } else if (s.offhand === 'tome') {
    const tc = s.tomeColor ?? PAL.magic1;
    p.rect(al.x - 3, (al.y - 3), 4, 4, tc);
    p.rect(al.x - 2, (al.y - 3), 3, 1, PAL.bone3);
    p.px(al.x - 2, (al.y - 1), PAL.gold2);
  } else if (s.offhand === 'dagger') {
    p.rect(al.x - 1, (al.y - 2), 1, 4, PAL.steel2);
  }
    },
  };
  // Cuerpo (armadura o atuendo) y, encima o debajo según la vista, la secundaria y el arma en sus anclajes
  if (s.sheet) drawSheetBody(p, s, s.sheet, frame, pose, 'front');
  for (const l of LAYER_ORDER.front) if (l !== 'body' || !s.sheet) layers[l]();
  if (pose === 'hurt') {
    const img = p.ctx.getImageData(0, 0, p.w, p.h);
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i + 3] === 0) continue;
      img.data[i] = Math.min(255, img.data[i] * 0.6 + 120);
      img.data[i + 1] *= 0.55;
      img.data[i + 2] *= 0.55;
    }
    p.ctx.putImageData(img, 0, 0);
  }
  p.outline();
  return p.c;
}

/** El mismo personaje visto de espaldas (para el combate en primer plano): sin cara, con la capa y el pelo/casco por detrás. */
export function drawHumanoidBack(s: HumanoidSpec, pose: 'idle' | 'attack' | 'hurt' = 'idle'): Canvas {
  const p = new Pix(HUM_W, HUM_H);
  const attackLift = pose === 'attack' ? -3 : 0;
  const anchor = sheetAnchor(s, 'back', 0, pose) ?? anchorFor('back', 0, pose);
  const ar = anchor.right, al = anchor.left;
  const layers: Record<'body' | 'offhand' | 'weapon', () => void> = {
    weapon: () => {
  // Arma (sujeta en la mano derecha, que de espaldas queda a la derecha de la pantalla)
  const wy = ar.y - 5;
  const blade = s.weaponColor ?? PAL.steel2;
  switch (s.weapon) {
    case 'sword': p.rect(ar.x + 1, wy - 7, 1, 10, blade); p.px(ar.x + 1, wy - 8, shade(blade, 0.4)); p.rect(ar.x, wy + 3, 3, 1, PAL.gold1); break;
    case 'axe': p.rect(ar.x + 1, wy - 6, 1, 12, PAL.earth1); p.rect(ar.x + 2, wy - 6, 2, 4, shade(blade, -0.15)); break;
    case 'greatsword': p.rect(ar.x + 1, wy - 10, 2, 13, PAL.bone2); p.rect(ar.x - 1, wy + 3, 6, 1, PAL.magic1); break;
    case 'staff': p.rect(ar.x + 1, wy - 9, 1, 19, s.weaponColor ?? PAL.earth2); p.rect(ar.x, wy - 12, 3, 3, s.orb ?? PAL.magic2); break;
    case 'dagger': p.rect(ar.x + 1, wy - 2, 1, 4, blade); break;
    case 'mace': p.rect(ar.x + 1, wy - 3, 1, 8, PAL.earth2); p.rect(ar.x, wy - 6, 3, 3, PAL.gold2); break;
  }
    },
    body: () => {
  // Piernas y botas
  const legCol = s.ribs ? s.skin : s.legs;
  p.rect(7, 18, 2, 5, legCol); p.rect(11, 18, 2, 5, legCol);
  p.rect(7, 22, 2, 2, shade(s.boots, -0.1)); p.rect(11, 22, 2, 2, shade(s.boots, -0.1));
  // Espalda
  p.rect(6, 11, 8, 8, shade(s.torso, -0.08));
  p.rect(6, 11, 1, 8, shade(s.torso, 0.1)); p.rect(13, 11, 1, 8, shade(s.torso, -0.3));
  if (s.torsoStyle === 'mail') for (let yy = 12; yy < 18; yy++) for (let xx = 7; xx < 13; xx++) if ((xx + yy) % 2 === 0) p.px(xx, yy, shade(s.torso, 0.22));
  if (s.torsoStyle === 'robe') { p.rect(6, 17, 8, 5, shade(s.torso, -0.08)); p.rect(13, 17, 1, 5, shade(s.torso, -0.3)); }
  p.rect(6, 17, 8, 1, s.trim);
  // Brazos
  const sleeve = shade(s.torso, -0.15);
  p.rect(5, 12, 1, 5, sleeve); p.rect(14, 12 + attackLift, 1, 5, sleeve);
  const hand = s.hands ?? s.skin;
  p.px(5, 17, hand); p.px(14, 17 + attackLift, hand);
  // Capa: de espaldas es lo que más se ve
  if (s.cape) {
    p.rect(7, 12, 6, 9, s.cape);
    p.rect(6, 14, 1, 7, s.cape); p.rect(13, 14, 1, 7, s.cape);
    p.rect(7, 12, 6, 1, shade(s.cape, 0.2));
    p.rect(9, 12, 1, 8, shade(s.cape, -0.18)); p.rect(12, 12, 1, 8, shade(s.cape, -0.18));
    p.rect(6, 20, 8, 1, shade(s.cape, -0.3));
    p.rect(13, 14, 1, 7, shade(s.cape, -0.28));
  }
  // Cabeza por detrás: nuca, pelo, casco, capucha o sombrero
  const hy = 5;
  const hc = s.headColor ?? s.hair ?? PAL.earth1;
  p.rect(7, hy, 6, 6, shade(s.skin, -0.2)); // nuca
  switch (s.head) {
    case 'helmet':
      p.rect(6, hy - 2, 8, 8, hc); p.rect(13, hy - 2, 1, 8, shade(hc, -0.3)); p.rect(7, hy - 2, 2, 1, shade(hc, 0.4));
      p.rect(9, hy - 1, 2, 6, shade(hc, -0.15)); p.px(10, hy - 3, PAL.threat2); p.px(10, hy - 4, PAL.threat2);
      break;
    case 'hood': case 'hoodskull':
      p.rect(6, hy - 2, 8, 8, hc); p.rect(13, hy - 1, 1, 7, shade(hc, -0.3)); p.rect(8, hy + 5, 4, 2, hc); p.px(9, hy - 3, hc); p.px(10, hy - 3, hc);
      break;
    case 'wizard':
      p.rect(7, hy + 1, 6, 4, s.hair ?? PAL.bone1);
      p.rect(5, hy, 10, 1, hc); p.rect(7, hy - 2, 6, 2, hc); p.rect(8, hy - 4, 4, 2, hc); p.rect(9, hy - 5, 2, 1, hc); p.px(8, hy - 6, hc);
      p.rect(7, hy - 1, 6, 1, s.hatTrim ?? s.trim); p.rect(12, hy - 2, 1, 2, shade(hc, -0.3));
      break;
    case 'crown':
      p.rect(7, hy, 6, 5, s.skin); p.rect(7, hy - 2, 6, 2, PAL.gold2); p.px(7, hy - 3, PAL.gold2); p.px(12, hy - 3, PAL.gold2);
      break;
    default: // pelo
      p.rect(6, hy - 1, 8, 6, hc); p.rect(7, hy - 1, 5, 1, shade(hc, 0.25)); p.rect(13, hy, 1, 5, shade(hc, -0.3)); p.rect(8, hy + 5, 4, 1, hc);
  }
    },
    offhand: () => {
  // Escudo o tomo por detrás (en la mano izquierda)
  if (s.offhand === 'shield') {
    const sc = shade(s.shieldColor ?? PAL.earth2, -0.25);
    p.rect(al.x - 3, al.y - 5, 4, 6, sc); p.rect(al.x - 3, al.y - 5, 4, 1, s.shieldRim ?? PAL.steel1); p.rect(al.x - 2, al.y, 2, 1, sc);
    p.rect(al.x - 2, al.y - 4, 2, 1, PAL.earth0); p.rect(al.x - 2, al.y - 2, 2, 1, PAL.earth0); // correas
  } else if (s.offhand === 'tome') {
    p.rect(al.x - 3, al.y - 3, 4, 4, shade(s.tomeColor ?? PAL.magic1, -0.2)); p.rect(al.x - 3, al.y - 3, 1, 4, PAL.gold1);
  } else if (s.offhand === 'dagger') {
    p.rect(al.x - 1, al.y - 2, 1, 4, PAL.steel2);
  }
    },
  };
  if (s.sheet) drawSheetBody(p, s, s.sheet, 0, pose, 'back');
  for (const l of LAYER_ORDER.back) if (l !== 'body' || !s.sheet) layers[l]();
  if (pose === 'hurt') {
    const img = p.ctx.getImageData(0, 0, p.w, p.h);
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i + 3] === 0) continue;
      img.data[i] = Math.min(255, img.data[i] * 0.6 + 120); img.data[i + 1] *= 0.55; img.data[i + 2] *= 0.55;
    }
    p.ctx.putImageData(img, 0, 0);
  }
  p.outline();
  return p.c;
}

const CLASS_HAIR: Record<ClassId, string> = { warrior: PAL.earth1, mage: PAL.bone1, rogue: PAL.earth0, cleric: PAL.gold1 };

/**
 * Aspecto del héroe a partir de lo que lleva equipado.
 * Sin equipo: camisa, pantalón, pelo al aire, manos vacías y sandalias.
 * Si no se indica equipo, se usa el equipo inicial de la clase.
 */
export function heroSpec(classId: ClassId, ap: Appearance, equipment?: Equipment, outfit?: string | null): HumanoidSpec {
  const eq = equipment ?? starterEquipment(classId);
  const cloak = CLOAK_COLORS[ap.cloak % CLOAK_COLORS.length];
  const skin = SKIN_COLORS[ap.skin % SKIN_COLORS.length];
  const spec: HumanoidSpec = {
    skin, hair: CLASS_HAIR[classId], torso: '#8a7d68', trim: '#5c5244', legs: PAL.earth1, boots: '#3a2a1e',
    cape: cloak, head: 'hair', headColor: CLASS_HAIR[classId], weapon: 'none', offhand: 'none', torsoStyle: 'shirt',
  };
  for (const slot of EQUIP_SLOTS) {
    const it = eq[slot];
    const look = it ? lookOf(it.itemId) : null;
    if (!look) continue;
    switch (look.slot) {
      case 'mainHand':
        spec.weapon = look.shape;
        spec.weaponColor = look.color;
        spec.orb = look.orb;
        break;
      case 'offHand':
        if (look.shape === 'shield') Object.assign(spec, { offhand: 'shield', shieldColor: look.color, shieldRim: look.rim, shieldEmblem: look.emblem });
        else Object.assign(spec, { offhand: 'tome', tomeColor: look.color });
        break;
      case 'helmet':
        spec.head = look.shape;
        spec.headColor = look.color;
        spec.hatTrim = look.trim;
        break;
      case 'armor':
        spec.torsoStyle = look.style;
        spec.torso = look.color;
        spec.trim = look.trim;
        if (look.style === 'robe') spec.legs = shade(look.color, -0.3);
        break;
      case 'gloves':
        spec.hands = look.color;
        break;
      case 'boots':
        spec.boots = look.color;
        break;
      case 'amulet':
        spec.amulet = look.color;
        break;
    }
  }
  // Atuendo: sustituye TODO el cuerpo (cabeza, torso, manos, piernas, pies y capa). Se quedan la piel del jugador,
  // el arma y la secundaria, que se dibujan encima en sus anclajes.
  const sk = outfit ? SKINS[outfit] : null;
  if (sk) {
    const b = sk.body;
    Object.assign(spec, { torso: b.torso, trim: b.trim, legs: b.legs, boots: b.boots, cape: b.cape, head: b.head, headColor: b.headColor, hatTrim: b.hatTrim, torsoStyle: b.torsoStyle, hands: b.hands, amulet: b.amulet, eye: b.eye });
    if (SHEETS.has(sk.id)) spec.sheet = sk.id;
  }
  return spec;
}

export const MONSTER_SPECS: Record<string, HumanoidSpec> = {
  skeleton: { skin: PAL.bone2, torso: PAL.earth1, trim: PAL.earth1, legs: PAL.bone2, boots: PAL.bone1, head: 'skull', weapon: 'sword', offhand: 'shield', shieldColor: PAL.earth1, ribs: true, eye: PAL.threat3 },
  boss: { skin: PAL.bone2, torso: PAL.magic0, trim: PAL.magic1, legs: PAL.bone2, boots: PAL.bone1, cape: PAL.threat0, head: 'crown', weapon: 'greatsword', ribs: true, eye: PAL.magic3 },
  rival: { skin: SKIN_COLORS[1], torso: PAL.earth1, trim: PAL.earth3, legs: PAL.stone1, boots: PAL.earth0, cape: PAL.moss0, head: 'hood', headColor: PAL.moss1, weapon: 'dagger', offhand: 'dagger', eye: PAL.gold3 },
  // ── Vendedores del refugio ──
  vendor_orvel: { skin: SKIN_COLORS[0], torso: PAL.earth2, trim: PAL.gold1, legs: PAL.earth1, boots: PAL.earth0, cape: PAL.earth1, head: 'hair', headColor: PAL.bone1, weapon: 'none', torsoStyle: 'tunic', amulet: PAL.gold2 },
  vendor_vesper: { skin: SKIN_COLORS[0], torso: PAL.night1, trim: PAL.bone2, legs: PAL.night1, boots: PAL.night0, cape: PAL.bone1, head: 'hood', headColor: PAL.bone2, weapon: 'staff', weaponColor: PAL.bone1, orb: PAL.ice, torsoStyle: 'robe', eye: PAL.ice },
  vendor_garra: { skin: SKIN_COLORS[1], torso: PAL.steel1, trim: PAL.threat2, legs: PAL.stone2, boots: PAL.earth0, cape: PAL.threat1, head: 'hair', headColor: PAL.threat1, weapon: 'sword', weaponColor: PAL.steel3, offhand: 'shield', shieldColor: PAL.threat1, shieldRim: PAL.steel2, torsoStyle: 'mail' },
  // Marcador de Grizk (duende; antes, el Coleccionista): piel verde y túnica morada. Sprite definitivo pendiente (lo diseña el usuario).
  vendor_collector: { skin: '#5d8f3c', torso: '#6a3aa8', trim: PAL.gold1, legs: PAL.earth1, boots: PAL.earth0, head: 'hair', headColor: '#3f6b2a', weapon: 'none', torsoStyle: 'tunic', amulet: PAL.gold2 },
  vendor_brand: { skin: SKIN_COLORS[2], torso: PAL.earth1, trim: PAL.fire1, legs: PAL.stone1, boots: PAL.earth0, head: 'hair', headColor: PAL.outline, weapon: 'mace', torsoStyle: 'tunic', hands: PAL.steel1 },
  // Mercaderes de la Fase 5b (marcadores provisionales hasta el arte definitivo)
  vendor_garth: { skin: SKIN_COLORS[2], torso: PAL.bone1, trim: PAL.earth2, legs: PAL.earth1, boots: PAL.earth0, head: 'hair', headColor: PAL.earth0, weapon: 'dagger', weaponColor: PAL.steel2, torsoStyle: 'shirt', hands: PAL.bone2 },
  vendor_nira: { skin: SKIN_COLORS[0], torso: PAL.earth2, trim: PAL.gold1, legs: PAL.earth1, boots: PAL.earth0, cape: PAL.moss0, head: 'hood', headColor: PAL.earth2, weapon: 'none', torsoStyle: 'tunic', amulet: PAL.gold2, eye: PAL.gold3 },
  vendor_orik: { skin: SKIN_COLORS[1], torso: PAL.stone2, trim: PAL.steel2, legs: PAL.stone1, boots: PAL.earth0, head: 'hair', headColor: PAL.bone1, weapon: 'mace', weaponColor: PAL.steel1, torsoStyle: 'shirt', hands: PAL.earth2 },
  vendor_valerius: { skin: SKIN_COLORS[0], torso: PAL.steel2, trim: PAL.gold1, legs: PAL.steel1, boots: PAL.stone1, cape: PAL.night1, head: 'helmet', headColor: PAL.steel2, weapon: 'none', offhand: 'shield', shieldColor: PAL.steel1, shieldRim: PAL.gold1, torsoStyle: 'mail' },
  vendor_eldrin: { skin: SKIN_COLORS[0], torso: PAL.magic0, trim: PAL.magic2, legs: PAL.night1, boots: PAL.night0, head: 'wizard', headColor: PAL.magic1, hatTrim: PAL.gold1, weapon: 'staff', weaponColor: PAL.earth2, orb: PAL.fire2, torsoStyle: 'robe' },
  // ── Mercenarios de Garra Roja ──
  merc_bram: { skin: SKIN_COLORS[1], torso: PAL.moss1, trim: PAL.earth1, legs: PAL.earth1, boots: PAL.earth0, head: 'hair', headColor: PAL.earth3, weapon: 'axe', weaponColor: PAL.steel2, torsoStyle: 'shirt', hands: PAL.earth2 },
  merc_lysa: { skin: SKIN_COLORS[0], torso: PAL.earth2, trim: PAL.moss2, legs: PAL.stone2, boots: PAL.earth0, cape: PAL.moss0, head: 'hood', headColor: PAL.moss1, weapon: 'dagger', weaponColor: PAL.steel3, offhand: 'dagger', torsoStyle: 'tunic', eye: PAL.gold3 },
  merc_tobias: { skin: SKIN_COLORS[0], torso: PAL.earth1, trim: PAL.fire1, legs: PAL.earth1, boots: PAL.earth0, head: 'wizard', headColor: PAL.earth2, hatTrim: PAL.fire1, weapon: 'staff', weaponColor: PAL.earth2, orb: PAL.fire2, torsoStyle: 'robe' },
  merc_ysolde: { skin: SKIN_COLORS[0], torso: '#cfd8e3', trim: PAL.ice, legs: PAL.steel1, boots: PAL.steel0, cape: PAL.night1, head: 'helmet', headColor: '#dfe5ec', weapon: 'sword', weaponColor: '#e8ecf2', offhand: 'shield', shieldColor: '#cfd8e3', shieldRim: PAL.gold2, shieldEmblem: PAL.ice, torsoStyle: 'mail' },
  merc_corvin: { skin: SKIN_COLORS[2], torso: '#2f3542', trim: PAL.bone2, legs: '#2a3240', boots: PAL.night0, cape: '#3d4a5c', head: 'hood', headColor: '#3d4a5c', weapon: 'axe', weaponColor: '#b9c7d6', torsoStyle: 'tunic', eye: PAL.ice },
  merc_mirra: { skin: SKIN_COLORS[1], torso: '#e8ecf2', trim: PAL.gold2, legs: '#e8ecf2', boots: PAL.earth0, head: 'hood', headColor: '#e8ecf2', weapon: 'mace', weaponColor: PAL.gold2, offhand: 'tome', tomeColor: PAL.gold1, torsoStyle: 'robe', amulet: PAL.gold3 },
  merc_draven: { skin: SKIN_COLORS[1], torso: '#4a1a1a', trim: PAL.fire1, legs: PAL.stone1, boots: '#2a1010', cape: '#3a0a0a', head: 'hair', headColor: PAL.outline, weapon: 'greatsword', weaponColor: '#3a2a3a', torsoStyle: 'mail', eye: PAL.fire2 },
  merc_nyx: { skin: SKIN_COLORS[0], torso: '#3a1418', trim: PAL.fire2, legs: '#2a1010', boots: PAL.night0, cape: PAL.fire0, head: 'hair', headColor: PAL.fire1, weapon: 'staff', weaponColor: PAL.earth0, orb: PAL.fire2, offhand: 'tome', tomeColor: PAL.fire0, torsoStyle: 'robe', eye: PAL.fire2 },
  merc_ulric: { skin: SKIN_COLORS[2], torso: PAL.stone2, trim: '#6b6672', legs: PAL.stone1, boots: PAL.earth0, head: 'hair', headColor: PAL.stone1, weapon: 'mace', weaponColor: '#6b6672', torsoStyle: 'shirt', hands: '#6b6672' },
  // ── Mazmorra ──
  bandit: { skin: SKIN_COLORS[0], torso: PAL.earth2, trim: PAL.earth0, legs: PAL.stone2, boots: PAL.earth0, head: 'hood', headColor: PAL.threat1, weapon: 'dagger', offhand: 'none', torsoStyle: 'tunic', eye: PAL.outline },
  archer: { skin: SKIN_COLORS[1], torso: PAL.moss1, trim: PAL.earth1, legs: PAL.earth1, boots: PAL.earth0, cape: PAL.moss0, head: 'hood', headColor: PAL.moss2, weapon: 'staff', weaponColor: PAL.earth2, orb: PAL.earth1, torsoStyle: 'tunic' },
  captain: { skin: SKIN_COLORS[0], torso: PAL.steel1, trim: PAL.threat1, legs: PAL.stone2, boots: PAL.earth0, cape: PAL.threat1, head: 'hair', headColor: PAL.earth0, weapon: 'sword', weaponColor: PAL.steel3, offhand: 'shield', shieldColor: PAL.threat1, shieldRim: PAL.gold1, torsoStyle: 'mail' },
  // ── Cripta ──
  wraith: { skin: '#b9c7d6', torso: '#5c6b80', trim: '#8fa8c8', legs: '#3d4a5c', boots: '#2a3240', cape: '#3d4a5c', head: 'hoodskull', headColor: '#6f7f96', weapon: 'none', torsoStyle: 'robe', eye: PAL.ice },
  ghoul: { skin: '#7d8f6a', torso: PAL.stone2, trim: PAL.stone1, legs: '#7d8f6a', boots: PAL.stone1, head: 'skull', weapon: 'none', ribs: true, eye: PAL.threat3, hands: '#5a6b48' },
  tomb_guardian: { skin: PAL.bone1, torso: PAL.steel0, trim: PAL.gold0, legs: PAL.steel0, boots: PAL.stone1, head: 'helmet', headColor: PAL.steel1, weapon: 'axe', weaponColor: PAL.steel2, offhand: 'shield', shieldColor: PAL.stone3, shieldRim: PAL.steel2, shieldEmblem: PAL.bone2, torsoStyle: 'mail', eye: PAL.ice },
  necro_priest: { skin: PAL.bone2, torso: PAL.night1, trim: PAL.magic2, legs: PAL.night0, boots: PAL.night0, head: 'hoodskull', headColor: PAL.night0, weapon: 'staff', weaponColor: PAL.bone1, orb: PAL.moss2, torsoStyle: 'robe', eye: '#7cff9a' },
  bone_archer: { skin: PAL.bone1, torso: PAL.earth0, trim: PAL.earth1, legs: PAL.bone1, boots: PAL.bone0, head: 'skull', weapon: 'staff', weaponColor: PAL.bone0, orb: PAL.bone1, ribs: true, eye: PAL.ice },
  tomb_knight: { skin: PAL.bone2, torso: PAL.steel1, trim: PAL.ice, legs: PAL.bone2, boots: PAL.steel0, cape: PAL.night1, head: 'helmet', headColor: PAL.steel2, weapon: 'greatsword', ribs: true, eye: PAL.ice },
  veiled_queen: { skin: '#cfd8e3', torso: '#e8ecf2', trim: PAL.ice, legs: '#cfd8e3', boots: '#9fb0c4', cape: '#6f7f96', head: 'crown', weapon: 'staff', weaponColor: '#9fb0c4', orb: PAL.ice, torsoStyle: 'robe', eye: PAL.ice },
  // ── Infierno ──
  imp: { skin: PAL.threat2, torso: PAL.threat1, trim: PAL.fire1, legs: PAL.threat1, boots: PAL.threat0, head: 'skull', weapon: 'dagger', weaponColor: PAL.fire2, eye: PAL.fire3, hands: PAL.threat0 },
  temptress: { skin: '#c9786a', torso: PAL.threat0, trim: PAL.gold2, legs: '#c9786a', boots: PAL.threat0, cape: PAL.threat1, head: 'hair', headColor: '#1a0e14', weapon: 'dagger', weaponColor: PAL.threat2, torsoStyle: 'robe', eye: PAL.fire2 },
  hell_knight: { skin: PAL.threat1, torso: '#2a1414', trim: PAL.fire1, legs: '#2a1414', boots: PAL.outline, cape: PAL.threat0, head: 'helmet', headColor: '#3a1a1a', weapon: 'sword', weaponColor: PAL.fire1, offhand: 'shield', shieldColor: '#3a1a1a', shieldRim: PAL.fire1, shieldEmblem: PAL.fire2, torsoStyle: 'mail', eye: PAL.fire2 },
  sulfur_caller: { skin: '#d9c06a', torso: '#4a3a10', trim: '#e8d24a', legs: '#2a2008', boots: '#1a1404', head: 'hood', headColor: '#6b5a14', weapon: 'staff', weaponColor: PAL.earth0, orb: '#e8d24a', torsoStyle: 'robe', eye: '#ffef6a' },
  chain_warden: { skin: PAL.stone3, torso: PAL.steel0, trim: PAL.fire1, legs: PAL.stone2, boots: PAL.outline, head: 'helmet', headColor: PAL.stone2, weapon: 'mace', offhand: 'shield', shieldColor: PAL.stone2, shieldRim: PAL.steel1, torsoStyle: 'mail', eye: PAL.fire2 },
  // ── Mercenarios errantes ──
  wand_brann: { skin: SKIN_COLORS[1], torso: PAL.earth1, trim: PAL.gold1, legs: PAL.stone2, boots: PAL.earth0, cape: PAL.earth2, head: 'hair', headColor: PAL.earth3, weapon: 'staff', weaponColor: PAL.earth2, orb: PAL.steel2, torsoStyle: 'tunic', eye: PAL.outline },
  wand_sela: { skin: SKIN_COLORS[0], torso: PAL.night1, trim: PAL.threat2, legs: PAL.night0, boots: PAL.outline, cape: PAL.night0, head: 'hood', headColor: PAL.night1, weapon: 'dagger', weaponColor: PAL.steel3, offhand: 'dagger', torsoStyle: 'tunic', eye: PAL.outline },
  wand_odo: { skin: SKIN_COLORS[0], torso: '#d8d0b8', trim: PAL.gold1, legs: '#d8d0b8', boots: PAL.earth0, head: 'hood', headColor: '#c8c0a8', weapon: 'staff', weaponColor: PAL.earth2, orb: PAL.gold3, torsoStyle: 'robe', eye: PAL.outline },
  wand_varga: { skin: SKIN_COLORS[2], torso: PAL.earth1, trim: PAL.steel1, legs: PAL.stone2, boots: PAL.earth0, head: 'hair', headColor: PAL.threat1, weapon: 'mace', weaponColor: PAL.steel1, torsoStyle: 'shirt', hands: PAL.earth1, eye: PAL.outline },
  wand_malek: { skin: SKIN_COLORS[1], torso: '#2a2228', trim: PAL.fire1, legs: '#2a2228', boots: PAL.outline, cape: PAL.threat0, head: 'hair', headColor: PAL.stone3, weapon: 'sword', weaponColor: '#3a2a3a', offhand: 'shield', shieldColor: '#2a2228', shieldRim: PAL.fire1, torsoStyle: 'mail', hands: PAL.steel0, eye: PAL.fire3 },
  wand_iskra: { skin: SKIN_COLORS[0], torso: PAL.fire0, trim: PAL.fire2, legs: '#3a1410', boots: PAL.outline, cape: PAL.fire1, head: 'hair', headColor: PAL.fire2, weapon: 'staff', weaponColor: PAL.earth0, orb: PAL.fire3, torsoStyle: 'robe', eye: PAL.outline },
  wand_osric: { skin: SKIN_COLORS[0], torso: PAL.earth2, trim: PAL.earth0, legs: PAL.stone1, boots: PAL.earth0, head: 'hair', headColor: PAL.earth0, weapon: 'dagger', weaponColor: PAL.steel2, torsoStyle: 'shirt', eye: PAL.outline },
  // ── Subzonas (criaturas nuevas; marcadores hasta el arte definitivo) ──
  mordrek: { skin: SKIN_COLORS[1], torso: PAL.steel0, trim: PAL.threat1, legs: PAL.stone2, boots: PAL.earth0, cape: PAL.threat0, head: 'hair', headColor: PAL.outline, weapon: 'sword', weaponColor: PAL.steel2, offhand: 'shield', shieldColor: PAL.threat0, shieldRim: PAL.steel1, torsoStyle: 'mail', eye: PAL.threat3 },
  hollow_armor: { skin: PAL.outline, torso: PAL.steel1, trim: PAL.steel2, legs: PAL.steel0, boots: PAL.steel0, head: 'helmet', headColor: PAL.steel1, weapon: 'sword', weaponColor: PAL.steel2, offhand: 'shield', shieldColor: PAL.steel0, shieldRim: PAL.steel2, torsoStyle: 'mail', eye: PAL.ice, hands: PAL.steel1 },
  hanged_servant: { skin: '#8a9478', torso: PAL.bone1, trim: PAL.stone2, legs: PAL.stone2, boots: PAL.stone1, head: 'hair', headColor: PAL.stone1, weapon: 'none', torsoStyle: 'shirt', eye: PAL.threat3, hands: '#6b745c' },
  fallen_guard_knight: { skin: PAL.bone1, torso: PAL.steel1, trim: PAL.gold1, legs: PAL.steel0, boots: PAL.steel0, cape: PAL.threat0, head: 'helmet', headColor: PAL.steel2, weapon: 'greatsword', weaponColor: PAL.steel3, torsoStyle: 'mail', ribs: true, eye: PAL.ice },
  burned_seneschal: { skin: PAL.fire0, torso: PAL.outline, trim: PAL.fire1, legs: PAL.stone1, boots: PAL.outline, cape: PAL.fire0, head: 'crown', weapon: 'mace', weaponColor: PAL.fire2, torsoStyle: 'robe', eye: PAL.fire3, hands: PAL.fire0 },
  torturer: { skin: SKIN_COLORS[0], torso: PAL.earth0, trim: PAL.earth1, legs: PAL.stone1, boots: PAL.earth0, head: 'hood', headColor: PAL.outline, weapon: 'mace', weaponColor: PAL.steel1, torsoStyle: 'shirt', eye: PAL.threat3, hands: PAL.earth1 },
  mad_prisoner: { skin: SKIN_COLORS[0], torso: PAL.bone0, trim: PAL.earth1, legs: PAL.bone0, boots: SKIN_COLORS[0], head: 'hair', headColor: PAL.bone1, weapon: 'none', torsoStyle: 'shirt', eye: PAL.threat3 },
  executioner: { skin: SKIN_COLORS[1], torso: PAL.outline, trim: PAL.threat1, legs: PAL.stone1, boots: PAL.outline, head: 'hood', headColor: PAL.outline, weapon: 'axe', weaponColor: PAL.steel2, torsoStyle: 'shirt', eye: PAL.threat3, hands: PAL.earth0 },
  bone_colossus: { skin: PAL.bone2, torso: PAL.bone1, trim: PAL.bone0, legs: PAL.bone2, boots: PAL.bone1, head: 'skull', weapon: 'mace', weaponColor: PAL.bone2, ribs: true, eye: PAL.magic3, hands: PAL.bone1 },
  ossuary_monk: { skin: PAL.bone2, torso: PAL.earth1, trim: PAL.bone1, legs: PAL.earth0, boots: PAL.earth0, head: 'hoodskull', headColor: PAL.earth1, weapon: 'staff', weaponColor: PAL.bone1, orb: PAL.magic2, torsoStyle: 'robe', eye: PAL.magic3 },
  bone_abbot: { skin: PAL.bone3, torso: PAL.bone1, trim: PAL.gold1, legs: PAL.bone1, boots: PAL.bone0, cape: PAL.earth1, head: 'crown', weapon: 'staff', weaponColor: PAL.bone2, orb: PAL.magic2, torsoStyle: 'robe', ribs: true, eye: PAL.magic3 },
  drowned: { skin: '#6f8f88', torso: '#2f4a4a', trim: '#4a6b66', legs: '#2f4a4a', boots: '#1f3434', head: 'hair', headColor: '#1a2a2a', weapon: 'none', torsoStyle: 'shirt', eye: PAL.ice, hands: '#5a7a74' },
  mourner: { skin: '#cfd8e3', torso: PAL.outline, trim: PAL.stone2, legs: PAL.outline, boots: PAL.outline, head: 'hood', headColor: PAL.stone0, weapon: 'none', torsoStyle: 'robe', eye: PAL.ice },
  water_lady: { skin: '#a8d0d8', torso: '#1f4a5a', trim: PAL.ice, legs: '#1f4a5a', boots: '#13303a', cape: '#2a6070', head: 'hair', headColor: '#3a8a9a', weapon: 'staff', weaponColor: '#5aa0b0', orb: PAL.ice, torsoStyle: 'robe', eye: PAL.ice },
  black_ferryman: { skin: PAL.bone2, torso: '#13303a', trim: PAL.ice, legs: '#0e2028', boots: PAL.outline, cape: '#0e2028', head: 'hoodskull', headColor: '#13303a', weapon: 'greatsword', weaponColor: PAL.bone1, torsoStyle: 'robe', eye: PAL.ice },
  embalmed_noble: { skin: PAL.bone2, torso: PAL.bone2, trim: PAL.gold2, legs: PAL.bone1, boots: PAL.gold0, cape: PAL.magic0, head: 'crown', weapon: 'sword', weaponColor: PAL.gold2, torsoStyle: 'tunic', eye: PAL.gold3, hands: PAL.bone1 },
  marble_gargoyle: { skin: '#d8d4cc', torso: '#bfbab0', trim: '#e8e4dc', legs: '#a8a398', boots: '#8a857a', head: 'helmet', headColor: '#d8d4cc', weapon: 'none', torsoStyle: 'mail', eye: PAL.gold2, hands: '#bfbab0' },
  spectral_duelist: { skin: '#b9c7d6', torso: '#3d4a5c', trim: '#8fa8c8', legs: '#2a3240', boots: '#1f2630', cape: '#5c6b80', head: 'hair', headColor: '#6f7f96', weapon: 'sword', weaponColor: '#dfe8f2', offhand: 'dagger', torsoStyle: 'tunic', eye: PAL.ice },
  flame_cultist: { skin: SKIN_COLORS[0], torso: PAL.threat1, trim: PAL.fire1, legs: PAL.threat0, boots: PAL.outline, head: 'hood', headColor: PAL.threat0, weapon: 'dagger', weaponColor: PAL.fire2, torsoStyle: 'robe', eye: PAL.fire3 },
  bleeding_ghoul: { skin: '#8f4a44', torso: PAL.threat0, trim: PAL.threat1, legs: '#8f4a44', boots: PAL.threat0, head: 'skull', weapon: 'none', ribs: true, eye: PAL.fire3, hands: '#6b3430' },
  flayed_penitent: { skin: '#b0544a', torso: '#b0544a', trim: PAL.threat0, legs: PAL.earth0, boots: PAL.outline, head: 'hood', headColor: PAL.earth0, weapon: 'dagger', weaponColor: PAL.steel1, torsoStyle: 'shirt', eye: PAL.threat3 },
  umbral_priest: { skin: PAL.bone2, torso: PAL.threat0, trim: PAL.gold2, legs: PAL.threat0, boots: PAL.outline, cape: PAL.threat1, head: 'hoodskull', headColor: PAL.threat0, weapon: 'staff', weaponColor: PAL.gold1, orb: PAL.threat3, torsoStyle: 'robe', eye: PAL.fire3 },
  vharok: { skin: PAL.threat1, torso: PAL.outline, trim: PAL.threat2, legs: PAL.outline, boots: PAL.outline, cape: PAL.threat0, head: 'helmet', headColor: PAL.threat0, weapon: 'greatsword', weaponColor: PAL.threat3, torsoStyle: 'mail', eye: PAL.fire3, hands: PAL.outline },
  magma_elemental: { skin: PAL.fire1, torso: '#3a1a10', trim: PAL.fire2, legs: '#3a1a10', boots: PAL.fire0, head: 'skull', weapon: 'none', torsoStyle: 'mail', eye: PAL.fire3, hands: PAL.fire1 },
  obsidian_gargoyle: { skin: '#2a2230', torso: '#1a1420', trim: PAL.magic1, legs: '#1a1420', boots: PAL.outline, head: 'helmet', headColor: '#2a2230', weapon: 'none', torsoStyle: 'mail', eye: PAL.fire2, hands: '#2a2230' },
  hound_master: { skin: SKIN_COLORS[2], torso: '#3a1a10', trim: PAL.fire1, legs: PAL.stone1, boots: PAL.outline, cape: PAL.threat0, head: 'hair', headColor: PAL.outline, weapon: 'mace', weaponColor: PAL.steel1, torsoStyle: 'mail', eye: PAL.fire3, hands: PAL.earth0 },
  ignaroth: { skin: PAL.fire0, torso: '#2a1408', trim: PAL.fire2, legs: '#2a1408', boots: PAL.outline, cape: PAL.fire0, head: 'hair', headColor: PAL.fire1, weapon: 'mace', weaponColor: PAL.steel1, torsoStyle: 'mail', eye: PAL.fire3, hands: PAL.steel0 },
  flayer: { skin: '#c9786a', torso: PAL.threat0, trim: PAL.bone1, legs: PAL.earth0, boots: PAL.outline, head: 'hair', headColor: PAL.outline, weapon: 'axe', weaponColor: PAL.bone2, torsoStyle: 'shirt', eye: PAL.fire3, hands: PAL.threat1 },
  burning_soul: { skin: PAL.fire2, torso: PAL.fire1, trim: PAL.fire3, legs: PAL.fire0, boots: PAL.fire0, cape: PAL.fire0, head: 'hoodskull', headColor: PAL.fire1, weapon: 'none', torsoStyle: 'robe', eye: PAL.fire3 },
  pit_lord: { skin: PAL.threat1, torso: PAL.outline, trim: PAL.fire1, legs: '#2a1414', boots: PAL.outline, head: 'crown', weapon: 'axe', weaponColor: PAL.fire1, torsoStyle: 'mail', eye: PAL.fire3, hands: PAL.threat0 },
  chained_herald: { skin: PAL.stone3, torso: PAL.stone1, trim: PAL.steel1, legs: PAL.stone1, boots: PAL.outline, head: 'hood', headColor: PAL.stone1, weapon: 'mace', weaponColor: PAL.steel1, torsoStyle: 'shirt', eye: PAL.fire2, hands: PAL.steel0 },
  soul_devourer: { skin: PAL.magic2, torso: PAL.magic0, trim: PAL.magic2, legs: PAL.magic0, boots: PAL.outline, cape: PAL.magic1, head: 'hoodskull', headColor: PAL.magic0, weapon: 'none', torsoStyle: 'robe', eye: PAL.magic3 },
  belzar_herald: { skin: PAL.threat1, torso: '#1a0a0a', trim: PAL.gold1, legs: '#2a1010', boots: PAL.outline, cape: PAL.gold0, head: 'helmet', headColor: '#2a1010', weapon: 'sword', weaponColor: PAL.fire2, offhand: 'shield', shieldColor: '#2a1010', shieldRim: PAL.gold1, torsoStyle: 'mail', eye: PAL.fire3, hands: PAL.outline },
  belzar: { skin: PAL.threat1, torso: '#1a0a0a', trim: PAL.gold2, legs: '#2a1010', boots: PAL.outline, cape: PAL.threat0, head: 'crown', weapon: 'greatsword', torsoStyle: 'mail', eye: PAL.fire3, hands: PAL.outline },
};

/** Criaturas de cuatro patas (rata, can del abismo): 4 fotogramas de trote. */
export const BEAST_SPECS: Record<string, { body: string; belly: string; eye: string; big: boolean }> = {
  rat: { body: '#5a4a44', belly: '#8a7a6c', eye: PAL.threat3, big: false },
  hound: { body: '#3a1414', belly: PAL.fire1, eye: PAL.fire3, big: true },
  starving_wolf: { body: '#5c5a5e', belly: '#8a8690', eye: PAL.gold3, big: false },
  pit_worm: { body: '#b8a08a', belly: '#d8c4ae', eye: PAL.threat3, big: false },
  crypt_leech: { body: '#4a1a24', belly: '#7a3040', eye: PAL.ice, big: false },
  abyss_spawn: { body: PAL.magic0, belly: PAL.magic2, eye: PAL.fire3, big: true },
  sulfur_beast: { body: '#6b5a14', belly: '#e8d24a', eye: PAL.fire3, big: true },
};

/** Criaturas voladoras (murciélago, cuervo): mismo dibujo con otra paleta. */
export const FLYER_SPECS: Record<string, { body: string; wing: string; wingLight: string; eye: string; beak?: string }> = {
  bat: { body: '#3b2a3a', wing: '#2a1d2c', wingLight: '#4e3a50', eye: PAL.threat3 },
  carrion_crow: { body: '#3a3741', wing: '#2a2830', wingLight: '#625d69', eye: PAL.gold3, beak: PAL.bone1 },
};
export function drawBeast(kind: string, frame: number, hurt = false): Canvas {
  const b = BEAST_SPECS[kind] ?? BEAST_SPECS.rat;
  const p = new Pix(24, 18);
  const body = hurt ? PAL.threat2 : b.body, belly = hurt ? PAL.threat3 : b.belly;
  const h = b.big ? 7 : 5, w = b.big ? 14 : 11, x0 = 5, y0 = 17 - 3 - h;
  const step = frame % 2 === 0 ? 0 : 1;
  // patas
  for (const [lx, ph] of [[x0 + 1, step], [x0 + 3, 1 - step], [x0 + w - 4, 1 - step], [x0 + w - 2, step]] as const) p.rect(lx, 17 - 3 + ph, 1, 3 - ph, shade(body, -0.25));
  // cuerpo y vientre
  p.rect(x0, y0, w, h, body);
  p.rect(x0 + 1, y0 + h - 1, w - 2, 1, belly);
  p.rect(x0, y0, w, 1, shade(body, 0.2));
  // cabeza
  const hx = x0 + w - 1, hy = y0 - (b.big ? 3 : 1);
  p.rect(hx, hy, b.big ? 5 : 4, b.big ? 5 : 4, body);
  p.rect(hx + (b.big ? 4 : 3), hy + 2, 2, 2, shade(body, 0.1));
  p.px(hx + (b.big ? 3 : 2), hy + 1, b.eye);
  p.px(hx + 1, hy - 1, shade(body, -0.2));
  if (b.big) { p.px(hx + 3, hy - 1, shade(body, -0.2)); p.px(hx + 5, hy + 4, PAL.bone3); }
  // cola
  p.rect(x0 - 3, y0 + 1 + step, 3, 1, b.big ? belly : '#c49a8a');
  p.outline();
  return p.c;
}

/** Murciélago: 3 fotogramas de aleteo. */
export function drawBat(frame: number, hurt = false, kind = 'bat'): Canvas {
  const f = FLYER_SPECS[kind] ?? FLYER_SPECS.bat;
  const p = new Pix(22, 16);
  const body = hurt ? PAL.threat2 : f.body;
  const wing = hurt ? PAL.threat1 : f.wing;
  const wingL = f.wingLight;
  p.rect(9, 6, 4, 5, body);
  p.rect(9, 5, 1, 1, body);
  p.rect(12, 5, 1, 1, body);
  p.px(10, 7, f.eye);
  p.px(11, 7, f.eye);
  if (f.beak) { p.px(10, 9, f.beak); p.px(11, 9, f.beak); p.px(11, 10, f.beak); } else p.px(10, 9, PAL.bone3);
  const up = frame === 0, mid = frame === 1;
  for (let i = 0; i < 8; i++) {
    const yy = up ? 6 - Math.floor(i / 2) : mid ? 7 : 7 + Math.floor(i / 3);
    const hgt = up ? 2 + (i % 3 === 0 ? 1 : 0) : mid ? 2 : 2 + (i % 2);
    p.rect(8 - i, yy, 1, hgt, i % 3 === 0 ? wingL : wing);
    p.rect(13 + i, yy, 1, hgt, i % 3 === 0 ? wingL : wing);
  }
  p.outline();
  return p.c;
}

// ── Escenario isométrico ─────────────────────────────────────────────

export const TILE_W = 32;
export const TILE_H = 16;
export const WALL_H = 22;

function inDiamond(x: number, y: number, w = TILE_W, h = TILE_H): boolean {
  const dx = Math.abs(x + 0.5 - w / 2) / (w / 2);
  const dy = Math.abs(y + 0.5 - h / 2) / (h / 2);
  return dx + dy <= 1;
}

function stoneColor(n: number): string {
  if (n < 0.15) return PAL.stone1;
  if (n < 0.7) return PAL.stone2;
  if (n < 0.93) return PAL.stone3;
  return PAL.stone4;
}

export function drawFloor(variant: number): Canvas {
  const p = new Pix(TILE_W, TILE_H);
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inDiamond(x, y)) continue;
      const a = (x / 16 + y / 8) / 2;
      const b = (x / 16 - y / 8) / 2 + 0.5;
      const seam = Math.abs(a - 0.5) < 0.035 || Math.abs(b - 0.5) < 0.035;
      const edge = a < 0.06 || b < 0.06 || a > 0.96 || b > 0.96;
      const stone = (a > 0.5 ? 1 : 0) + (b > 0.5 ? 2 : 0);
      const n = hash(x, y, variant * 7 + stone);
      let col = stoneColor(n * 0.6 + hash(stone, variant, 3) * 0.4);
      if (seam || edge) col = PAL.stone1;
      if (!seam && variant === 2 && stone === 1 && n > 0.55) col = n > 0.8 ? PAL.moss2 : PAL.moss1;
      if (!seam && variant === 3 && Math.abs(a - b + 0.1) < 0.03 && stone === 3) col = PAL.stone0;
      p.px(x, y, col);
    }
  }
  return p.c;
}

interface BlockOpts {
  height: number;
  top: (x: number, y: number) => string;
  left: (u: number, v: number) => string;
  right: (u: number, v: number) => string;
}

function drawBlock(o: BlockOpts): Canvas {
  const H = o.height;
  const p = new Pix(TILE_W, TILE_H + H);
  for (let x = 0; x < TILE_W; x++) {
    const topEdge = x < 16 ? 8 + x * 0.5 : 16 - (x - 16) * 0.5;
    for (let y = 0; y < TILE_H + H; y++) {
      if (inDiamond(x, y)) {
        p.px(x, y, o.top(x, y));
      } else if (y >= Math.floor(topEdge) && y < topEdge + H) {
        const v = y - Math.floor(topEdge);
        if (x < 16) p.px(x, y, o.left(x, v));
        else p.px(x, y, o.right(x - 16, v));
      }
    }
  }
  return p.c;
}

function brick(u: number, v: number, light: string, mid: string, dark: string, mortar: string, seed: number) {
  const row = Math.floor(v / 5);
  if (v % 5 === 4) return mortar;
  if ((u + (row % 2) * 4) % 8 === 0) return mortar;
  const n = hash(Math.floor((u + (row % 2) * 4) / 8), row, seed);
  return n < 0.25 ? dark : n > 0.85 ? light : mid;
}

export function drawWall(variant: number): Canvas {
  return drawBlock({
    height: WALL_H,
    top: (x, y) => {
      const n = hash(x, y, 91 + variant);
      return n > 0.85 ? PAL.stone5 : n < 0.2 ? PAL.stone3 : PAL.stone4;
    },
    left: (u, v) => {
      const c = brick(u, v, PAL.stone4, PAL.stone3, PAL.stone2, PAL.stone1, variant * 13);
      if (variant === 1 && v > WALL_H - 6 && hash(u, v, 5) > 0.6) return PAL.moss1;
      return v === WALL_H - 1 ? PAL.stone1 : c;
    },
    right: (u, v) => {
      const c = brick(u, v, PAL.stone3, PAL.stone2, PAL.stone1, PAL.stone0, variant * 17 + 1);
      return v === WALL_H - 1 ? PAL.stone0 : c;
    },
  });
}

export function drawDoor(): Canvas {
  const wood = (u: number, v: number, base: string) => {
    if (v === 3 || v === 14) return PAL.steel1;
    if (u % 4 === 0) return PAL.earth0;
    return hash(u, v, 77) > 0.85 ? shade(base, 0.15) : base;
  };
  return drawBlock({
    height: WALL_H - 2,
    top: () => PAL.earth2,
    left: (u, v) => (u === 8 && v === 9 ? PAL.gold2 : wood(u, v, PAL.earth2)),
    right: (u, v) => wood(u, v, PAL.earth1),
  });
}

export function drawPillar(): Canvas {
  const H = 34;
  const p = new Pix(TILE_W, TILE_H + H);
  const cx = 16;
  // base
  for (let y = 0; y < TILE_H; y++) for (let x = 6; x < 26; x++) if (inDiamond(x - 6, y + 2, 20, 12)) p.px(x, y + H - 2, PAL.stone2);
  for (let y = 4; y < H + 8; y++) {
    for (let x = cx - 6; x <= cx + 6; x++) {
      const t = (x - (cx - 6)) / 12;
      const ring = y % 9 === 0;
      let col = t < 0.25 ? PAL.stone4 : t < 0.6 ? PAL.stone3 : t < 0.85 ? PAL.stone2 : PAL.stone1;
      if (ring) col = PAL.stone1;
      if (hash(x, y, 4) > 0.94) col = PAL.stone1;
      p.px(x, y, col);
    }
  }
  for (let x = cx - 7; x <= cx + 7; x++) {
    p.px(x, 3, PAL.stone5);
    p.px(x, 4, PAL.stone4);
  }
  p.outline(PAL.stone0);
  return p.c;
}

export function drawTrap(armed: boolean): Canvas {
  const p = new Pix(TILE_W, TILE_H);
  for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) if (inDiamond(x, y)) {
    const inner = Math.abs(x + 0.5 - 16) / 12 + Math.abs(y + 0.5 - 8) / 6 <= 1;
    if (inner) p.px(x, y, hash(x, y, 9) > 0.5 ? PAL.stone1 : PAL.stone0);
  }
  const spikes: [number, number][] = [[12, 6], [19, 6], [12, 10], [19, 10], [16, 5], [16, 11], [9, 8], [22, 8]];
  for (const [x, y] of spikes) {
    if (armed) {
      p.px(x, y - 2, PAL.steel3);
      p.px(x, y - 1, PAL.steel2);
      p.px(x, y, PAL.steel1);
    } else {
      p.px(x, y, PAL.steel0);
    }
  }
  return p.c;
}

// ── Fase 7: accesos especiales, altar y trampa desarmada ──

/** Puerta cerrada con llave: madera con flejes de hierro y un cerrojo dorado bien visible. */
export function drawLockedDoor(): Canvas {
  const face = (u: number, v: number, base: string) => {
    if (v === 3 || v === 9 || v === 15) return PAL.steel1;
    if (u % 4 === 0) return PAL.earth0;
    return hash(u, v, 71) > 0.85 ? shade(base, 0.15) : base;
  };
  return drawBlock({
    height: WALL_H - 2,
    top: () => PAL.earth1,
    left: (u, v) => ((u >= 7 && u <= 9 && v >= 10 && v <= 13) ? (v === 10 || u === 8 && v === 12 ? PAL.gold3 : PAL.gold1) : face(u, v, PAL.earth2)),
    right: (u, v) => face(u, v, PAL.earth1),
  });
}

/** Rastrillo de un atajo: barrotes de hierro sobre la oscuridad. */
export function drawGate(): Canvas {
  const bars = (u: number, v: number, lit: boolean) => {
    if (v === 2 || v === 12) return lit ? PAL.steel2 : PAL.steel1;
    if (u % 3 === 1) return v === WALL_H - 3 ? PAL.steel3 : lit ? PAL.steel2 : PAL.steel1;
    return PAL.void;
  };
  return drawBlock({ height: WALL_H - 2, top: () => PAL.steel0, left: (u, v) => bars(u, v, true), right: (u, v) => bars(u, v, false) });
}

/** Marcas de un muro con secreto (se dibujan encima del muro normal): arañazos claros y una corriente de aire. */
export function drawSecretMarks(): Canvas {
  const p = new Pix(TILE_W, TILE_H + WALL_H);
  const marks: [number, number][] = [[6, 14], [7, 15], [8, 16], [6, 18], [7, 19], [8, 20], [10, 15], [10, 16], [10, 17], [10, 18], [4, 22], [5, 23], [6, 24]];
  for (const [x, y] of marks) p.px(x, y, PAL.bone2);
  for (const [x, y] of [[20, 18], [22, 17], [24, 18], [21, 21], [23, 20]] as [number, number][]) p.px(x, y, PAL.ice);
  return p.c;
}

/** Altar de piedra con dos velas y una mancha de sangre: el pacto se ve de lejos. */
export function drawAltar(used: boolean): Canvas {
  const p = new Pix(TILE_W, TILE_H + 16);
  for (let y = 0; y < TILE_H; y++) for (let x = 4; x < 28; x++) if (inDiamond(x - 4, y + 2, 24, 14)) p.px(x, y + 14, PAL.stone2);
  for (let y = 6; y < 20; y++) for (let x = 8; x < 24; x++) p.px(x, y, y === 6 ? PAL.stone5 : x < 16 ? PAL.stone4 : PAL.stone3);
  for (let x = 11; x < 21; x++) p.px(x, 7, used ? PAL.stone2 : PAL.threat1);
  if (!used) { p.px(14, 8, PAL.threat2); p.px(17, 8, PAL.threat2); }
  for (const cx of [9, 22]) {
    p.rect(cx, 2, 1, 4, PAL.bone2);
    if (!used) { p.px(cx, 1, PAL.fire2); p.px(cx, 0, PAL.fire3); }
  }
  return p.c;
}

/** Trampa desarmada o ya disparada: las púas dobladas y una marca en el suelo. */
export function drawTrapSpent(): Canvas {
  const p = new Pix(TILE_W, TILE_H);
  for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) if (inDiamond(x, y)) {
    const inner = Math.abs(x + 0.5 - 16) / 12 + Math.abs(y + 0.5 - 8) / 6 <= 1;
    if (inner) p.px(x, y, hash(x, y, 9) > 0.5 ? PAL.stone2 : PAL.stone1);
  }
  for (const [x, y] of [[12, 7], [13, 8], [19, 7], [18, 8], [16, 10]] as [number, number][]) p.px(x, y, PAL.steel0);
  return p.c;
}

/** Afloramiento de roca con vetas de mineral, apoyado en la pared. Agotada: solo roca. */
export function drawVein(color: string, glint: string, depleted: boolean): Canvas {
  const p = new Pix(18, 16);
  const rock = [PAL.stone2, PAL.stone3, PAL.stone4];
  // Silueta irregular de la roca
  const rows: [number, number][] = [[7, 11], [5, 13], [4, 14], [3, 15], [2, 15], [2, 16], [1, 16], [1, 17], [1, 17], [1, 17], [2, 16], [2, 16]];
  rows.forEach(([a, b], i) => { for (let x = a; x < b; x++) p.px(x, 3 + i, rock[(x * 3 + i * 5) % 3]); });
  for (let x = 2; x < 16; x++) p.px(x, 14, PAL.stone1);
  if (!depleted) {
    for (const [x, y] of [[6, 6], [7, 7], [10, 5], [11, 6], [12, 9], [4, 10], [5, 11], [9, 11], [13, 12], [8, 9]] as const) p.px(x, y, color);
    for (const [x, y] of [[7, 6], [11, 5], [5, 10], [13, 11]] as const) p.px(x, y, glint);
  } else {
    for (const [x, y] of [[6, 7], [10, 9], [5, 11]] as const) p.px(x, y, PAL.stone1);
  }
  p.outline();
  return p.c;
}

export function drawChest(kind: 'common' | 'rich' | 'boss', open: boolean): Canvas {
  const p = new Pix(20, 18);
  const wood = kind === 'boss' ? PAL.magic1 : kind === 'rich' ? PAL.threat1 : PAL.earth2;
  const woodD = shade(wood, -0.35);
  const band = kind === 'common' ? PAL.steel1 : PAL.gold2;
  // cuerpo
  p.rect(3, 9, 14, 7, wood);
  p.rect(3, 15, 14, 1, woodD);
  p.rect(15, 9, 2, 7, woodD);
  p.rect(5, 9, 1, 7, band);
  p.rect(14, 9, 1, 7, band);
  if (open) {
    p.rect(3, 4, 14, 4, woodD);
    p.rect(4, 5, 12, 2, shade(wood, -0.55));
    p.rect(4, 8, 12, 1, PAL.gold3);
    p.px(7, 7, PAL.gold3);
    p.px(11, 7, PAL.gold2);
    p.px(9, 6, PAL.gold3);
    p.rect(3, 8, 14, 1, PAL.gold2);
  } else {
    p.rect(3, 5, 14, 4, shade(wood, 0.1));
    p.rect(4, 4, 12, 1, shade(wood, 0.1));
    p.rect(3, 8, 14, 1, band);
    p.rect(5, 4, 1, 5, band);
    p.rect(14, 4, 1, 5, band);
    p.rect(9, 8, 2, 3, PAL.gold2);
    p.px(9, 10, PAL.outline);
  }
  p.outline();
  return p.c;
}

export function drawTorch(frame: number): Canvas {
  const p = new Pix(8, 16);
  p.rect(3, 9, 2, 6, PAL.earth2);
  p.rect(2, 9, 4, 1, PAL.steel1);
  const flick = [0, 1, -1][frame % 3];
  p.rect(2, 5, 4, 4, PAL.fire1);
  p.rect(3 + (flick > 0 ? 1 : 0), 3, 2, 3, PAL.fire2);
  p.px(3 + flick, 2, PAL.fire2);
  p.rect(3, 6, 2, 3, PAL.fire3);
  p.outline(PAL.fire0);
  return p.c;
}

/** Decorado alto (de pie): se ordena en profundidad con los personajes. */
export const TALL_DECOR = new Set(['barrel', 'stake', 'crate', 'banner', 'cage', 'statue', 'coffin', 'brazier', 'crystal', 'urn', 'candles']);

export function drawDecor(kind: string): Canvas {
  if (!['bones', 'skull', 'barrel', 'rubble'].includes(kind)) return drawDecorExtra(kind);
  const p = new Pix(16, 14);
  if (kind === 'bones') {
    p.rect(3, 10, 8, 1, PAL.bone2);
    p.px(2, 9, PAL.bone2); p.px(2, 11, PAL.bone2); p.px(11, 9, PAL.bone2); p.px(11, 11, PAL.bone2);
    p.rect(6, 8, 1, 5, PAL.bone1);
    p.rect(9, 12, 4, 1, PAL.bone1);
  } else if (kind === 'skull') {
    p.rect(5, 7, 6, 5, PAL.bone2);
    p.rect(6, 12, 4, 1, PAL.bone1);
    p.px(6, 9, PAL.outline); p.px(9, 9, PAL.outline);
    p.rect(10, 7, 1, 5, PAL.bone1);
  } else if (kind === 'barrel') {
    p.rect(4, 2, 8, 11, PAL.earth2);
    p.rect(4, 2, 8, 1, PAL.earth3);
    p.rect(4, 4, 8, 1, PAL.steel1);
    p.rect(4, 10, 8, 1, PAL.steel1);
    p.rect(10, 2, 2, 11, PAL.earth1);
  } else {
    p.rect(3, 10, 4, 3, PAL.stone3);
    p.rect(8, 9, 3, 4, PAL.stone2);
    p.rect(11, 11, 3, 2, PAL.stone4);
  }
  p.outline();
  return p.c;
}

export function drawPortal(frame: number): Canvas {
  const W = 28, H = 40;
  const p = new Pix(W, H);
  const cx = W / 2, cy = H / 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - cx) / (W / 2 - 1);
      const dy = (y + 0.5 - cy) / (H / 2 - 1);
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r > 1) continue;
      const ang = Math.atan2(dy, dx);
      const swirl = Math.sin(ang * 3 + r * 9 - frame * (Math.PI / 3));
      let col: string;
      if (r > 0.86) col = PAL.magic2;
      else if (r > 0.78) col = PAL.magic3;
      else if (swirl > 0.55) col = PAL.magic3;
      else if (swirl > -0.1) col = PAL.magic2;
      else if (r < 0.3) col = '#f3e6ff';
      else col = PAL.magic1;
      p.px(x, y, col);
    }
  }
  p.outline(PAL.magic0);
  return p.c;
}

export function drawShadow(w = 14, h = 6): Canvas {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function drawGlow(size: number, color: string): Canvas {
  const [c, ctx] = canvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

export function drawBag(): Canvas {
  const p = new Pix(12, 12);
  p.rect(3, 4, 6, 7, PAL.earth2);
  p.rect(2, 6, 8, 4, PAL.earth2);
  p.rect(8, 5, 2, 6, PAL.earth1);
  p.rect(4, 2, 4, 2, PAL.earth3);
  p.rect(4, 4, 4, 1, PAL.gold1);
  p.px(4, 6, PAL.earth3);
  p.outline();
  return p.c;
}

/** Cadenas y grilletes en el suelo, para los prisioneros. */
export function drawChains(): Canvas {
  const p = new Pix(28, 10);
  // Argolla clavada al suelo y dos tramos de cadena
  p.rect(12, 6, 4, 3, PAL.stone2);
  p.rect(13, 7, 2, 1, PAL.stone4);
  for (let i = 0; i < 5; i++) { p.rect(2 + i * 2, 4 + (i % 2), 2, 1, i % 2 ? PAL.steel1 : PAL.steel2); p.rect(16 + i * 2, 4 + ((i + 1) % 2), 2, 1, i % 2 ? PAL.steel1 : PAL.steel2); }
  p.rect(0, 2, 3, 3, PAL.steel2); p.px(1, 3, PAL.outline);
  p.rect(25, 2, 3, 3, PAL.steel2); p.px(26, 3, PAL.outline);
  p.outline();
  return p.c;
}

export function drawMarker(color: string): Canvas {
  const p = new Pix(7, 6);
  p.rect(1, 0, 5, 2, color);
  p.rect(2, 2, 3, 1, color);
  p.px(3, 3, color);
  p.outline();
  return p.c;
}

// ── Iconos de objetos (12x12, con contorno automático) ───────────────

const ICON_SHAPES: Record<string, string[]> = {
  sword: ['............', '..........w.', '.........wa.', '........wa..', '.......wa...', '......wa....', '..g..wa.....', '...gwa......', '...Bg.......', '..B..g......', '.B..........', '............'],
  axe: ['............', '......aaa...', '.....aaaaa..', '....bBwaaaa.', '....bB.waaa.', '....bB..aa..', '....bB......', '....bB......', '....bB......', '....bB......', '....gg......', '............'],
  staff: ['............', '......ha....', '.....haaa...', '.....aaaA...', '......AA....', '......bB....', '.....bB.....', '.....bB.....', '....bB......', '....bB......', '...bB.......', '............'],
  dagger: ['............', '............', '........w...', '.......wa...', '......wa....', '.....wa.....', '...g.a......', '....g.......', '...B.g......', '..B.........', '............', '............'],
  shield: ['............', '..gggggggg..', '..gaaaaaAg..', '..gaaaaaAg..', '..gaaggaAg..', '..gaaggaAg..', '..gaaaaaAg..', '...gaaaAg...', '....gaAg....', '.....gg.....', '............', '............'],
  tome: ['............', '...AAAAAAA..', '..Aaaaaaaw..', '..Aaagaaaw..', '..Aaggga.w..', '..Aaagaaaw..', '..Aaaaaaaw..', '..Aaaaaaaw..', '..AAAAAAAw..', '...wwwwwww..', '............', '............'],
  hood: ['............', '....aaaa....', '...aaaaaa...', '..aaAkkAaa..', '..aaAkkkAa..', '..aAkkkkAa..', '..aAkkkkAa..', '..aaAkkAaa..', '..aaaaaaaa..', '...aaaaaa...', '............', '............'],
  helm: ['............', '....aaaa....', '...awaaaa...', '..awaaaaaA..', '..aaaaaaaA..', '..aakkkkaA..', '..aaaakaaA..', '..aa.ak.aA..', '..aA.aA.aA..', '............', '............', '............'],
  hat: ['............', '........a...', '.......aa...', '......aaA...', '.....aaaA...', '.....aaaA...', '....aaaaaA..', '....ggggg...', '..aaaaaaaaA.', '...AAAAAAA..', '............', '............'],
  tunic: ['............', '...aa..aa...', '..aaawwaaa..', '.aaaaaaaaaA.', '.aa.aaaa.aA.', '....aaaaA...', '....aaaaA...', '....ggggg...', '....aaaaA...', '....aaaaA...', '............', '............'],
  robe: ['............', '....a..a....', '...aaaaaa...', '..aaagaaaA..', '..a.agaa.A..', '....agaaA...', '...aagaaaA..', '...aagaaaA..', '..aaagaaaaA.', '..aaaaaaaaA.', '............', '............'],
  gloves: ['............', '............', '...a.a.a....', '...a.a.a.a..', '...aaaaaaa..', '...aaaaaaA..', '..aaaaaaaA..', '..aaaaaaA...', '...AaaaaA...', '....gggg....', '....aaaa....', '............'],
  boots: ['............', '....aaaA....', '....aaaA....', '....aaaA....', '....aaaA....', '....aaaaA...', '....aaaaaaA.', '...gggggggg.', '...AAAAAAAA.', '............', '............', '............'],
  ring: ['............', '............', '.....aa.....', '....ahaa....', '....gaag....', '...g....g...', '...g....g...', '...g....g...', '....g..g....', '.....gg.....', '............', '............'],
  amulet: ['............', '..g......g..', '...g....g...', '....g..g....', '.....gg.....', '....gaag....', '...gahaag...', '...gaaaag...', '....gaag....', '.....gg.....', '............', '............'],
  potion: ['............', '.....bb.....', '.....ww.....', '.....ww.....', '....waaw....', '...wahaaw...', '...waaaaw...', '...waaaaw...', '...wAaaAw...', '....wwww....', '............', '............'],
  dust: ['............', '............', '............', '............', '............', '.....e......', '....eeE.....', '...eewEE....', '..eeeeeEE...', '.EEEEEEEEE..', '............', '............'],
  wing: ['............', '..a.........', '..aa........', '..aAa.......', '..aAaa......', '..aAAaa.....', '..aAaAaa....', '..aaAaAaa...', '...a.a.aaa..', '............', '............', '............'],
  coin: ['............', '............', '....gggg....', '...gyyyyG...', '..gyygGyyG..', '..gygGgyyG..', '..gyygGyyG..', '..gyyyyyyG..', '...gGGGGG...', '............', '............', '............'],
  sack: ['....bbbb....', '.....ee.....', '...aaaaaa...', '..aaaaaaaa..', '.aahhaaaaaA.', '.aahaagggaA.', '.aaaaagyyaA.', '.aaaaaggGaA.', '.aaaaaaaaaA.', '..AaaaaaaA..', '...AAAAAA...', '............'],
  coins1: ['............', '............', '............', '............', '............', '............', '....gggg....', '...gyyyyG...', '..gyyGyyyG..', '...gGGGGG...', '............', '............'],
  coins2: ['............', '............', '............', '.....gggg...', '....gyyyyG..', '..ggggGGGG..', '.gyyyyGgggg.', '..gGGGGyyyyG', '...gggggGGG.', '..gyyyyyyyG.', '...gGGGGGG..', '............'],
  coins3: ['............', '.....gggg...', '....gyyyyG..', '...ggGGGGg..', '..gyyyyGyyG.', '.ggGGGGgGG..', 'gyyyyGgyyyG.', '.gGGGGyyyyyG', 'ggggggGGGGG.', 'gyyyyyyyyyG.', '.gGGGGGGGG..', '............'],
  bag1: ['............', '....bbbb....', '...b....b...', '..aaaaaaaa..', '..ahhaaaaA..', '..aaaaaaaA..', '..agggggaA..', '..aaaaaaaA..', '..aaaaaaaA..', '..AAAAAAAA..', '............', '............'],
  pouch: ['............', '....bbbb....', '.....ee.....', '....aaaa....', '...aaaaaa...', '..aahaaaaA..', '..ahaaggaA..', '..aaaagyaA..', '..aaaaaaaA..', '...AaaaaA...', '....AAAA....', '............'],
  chalice: ['............', '..gggggggg..', '..gyrrrryG..', '..gyyyyyyG..', '...gyyyyG...', '....gyyG....', '.....gG.....', '.....gG.....', '....gyyG....', '...gggggG...', '............', '............'],
  gem: ['............', '............', '....aaaa....', '...ahhaaA...', '..ahaaaaAA..', '..aaaaaaAA..', '...aaaaAA...', '....aaAA....', '.....AA.....', '............', '............', '............'],
  mace: ['............', '.......aaa..', '......ahaaA.', '......aaaaA.', '.......aAA..', '......bB....', '.....bB.....', '.....bB.....', '....bB......', '....bB......', '...gg.......', '............'],
  ore: ['............', '............', '............', '....AAA.....', '...AahAA....', '..AaaahaA...', '..AaghaaaA..', '.AaaaagaaA..', '.AaaaaaaaA..', '..AAAAAAA...', '............', '............'],
  bread: ['............', '............', '............', '....aaaa....', '..aahhhhaa..', '.ahhaaaaaaA.', '.aaaaAaaAaA.', '.aAAaaAAaaA.', '..AAAAAAAA..', '...gggggg...', '............', '............'],
  skin: ['............', '.....kk.....', '.....ee.....', '....aaaa....', '...aahhaa...', '..aahhaaaA..', '..ahaaaaaA..', '..aaaaaaaA..', '..aaaaaaAA..', '...aaaAAA...', '....AAAA....', '............'],
  bandage: ['............', '............', '...aaaaaa...', '..aaaaaaaa..', '..ahaaaaaA..', '..ahaggaaA..', '..ahaggaaA..', '..ahaaaaaA..', '..aaaaaaaa.a', '...AAAAAAaa.', '............', '............'],
  splint: ['............', '..bb....bb..', '..bB....bB..', '..bBaaaabB..', '..bBaaaabB..', '..bB....bB..', '..bB....bB..', '..bBaaaabB..', '..bBaaaabB..', '..bB....bB..', '..BB....BB..', '............'],
  strap: ['............', '...aaaaaa...', '..aA....Aa..', '.aA......Aa.', '.a........a.', '.a...gg...a.', '.aA..gg..Aa.', '..aAaggaAa..', '...aaggaa...', '.....aa.....', '.....aa.....', '............'],
  medkit: ['............', '....aaaa....', '....a..a....', '.bbbbbbbbbb.', '.bBBBggBBBb.', '.bBBBggBBBb.', '.bBggggggBb.', '.bBBBggBBBb.', '.bBBBggBBBb.', '.bbbbbbbbbb.', '............', '............'],
  kit: ['............', '....aaaa....', '....a..a....', '.bbbbbbbbbb.', '.bBBBBBBBBb.', '.bBgBBBBgBb.', '.bBBBBBBBBb.', '.bBBBBBBBBb.', '.bbbbbbbbbb.', '............', '............', '............'],
  pick: ['............', '..aaaa......', '.a....aa....', '......bAa...', '.....bB..a..', '....bB....a.', '...bB......', '..bB........', '.bB.........', 'bB..........', '............', '............'],
  // ── Formas nuevas (C4, provisionales hasta que estén los iconos definitivos) ──
  spear: ['...........h', '..........ha', '.........aaA', '........bA..', '.......bB...', '......bB....', '.....bB.....', '....bB......', '...bB.......', '..bB........', '.bB.........', '............'],
  wand: ['............', '............', '.........h..', '........hah.', '.........h..', '.......bB...', '......bB....', '.....bB.....', '....bB......', '...gg.......', '............', '............'],
  orb: ['............', '............', '....AAAA....', '...AhaaaA...', '..AhhaaaaA..', '..AhaaaaaA..', '..AaaaaaAA..', '...AaaaAA...', '....AAAA....', '...gggggG...', '..gGGGGGGG..', '............'],
  torch: ['............', '.....h......', '....hah.....', '....aAa.....', '.....A......', '....bbB.....', '.....bB.....', '.....bB.....', '.....bB.....', '.....bB.....', '.....bB.....', '............'],
  lantern: ['............', '.....gg.....', '....g..g....', '....gggg....', '...gAAAAg...', '...gAhaAg...', '...gAaaAg...', '...gAAAAg...', '....gggg....', '............', '............', '............'],
  greatsword: ['...........w', '..........wa', '.........wa.', '........wa..', '.......wa...', '......wa....', '.....wa.....', '..g.wa......', '...gaG......', '...Bg.g.....', '..B.........', '.B..........'],
  crown: ['............', '............', '............', '..g..g..g...', '..gg.gg.gg..', '..gaggagg...', '..ggggggg...', '..gyyyyyG...', '..GGGGGGG...', '............', '............', '............'],
  chain: ['............', '.aa.........', 'a..a........', '.aa.aa......', '....a..a....', '.....aa.aa..', '........a..a', '.........aa.', '............', '............', '............', '............'],
  hammer: ['............', '.....aaaaa..', '.....ahaaA..', '.....aaaaA..', '......AAA...', '.......bB...', '......bB....', '.....bB.....', '....bB......', '...bB.......', '..gg........', '............'],
  // ── Fase 9: desguace y cocina ──
  scrap: ['............', '............', '..aa........', '..aAa...hh..', '...aA..haA..', '.......aA...', '....aaa.....', '...ahaAa..a.', '...aaAA..aA.', '.aA.....aA..', '.aA.........', '............'],
  meat: ['............', '............', '....aaaa....', '...ahhaaa...', '..aahaaaaA..', '..aaaaaaaA..', '..AaaaaaAA..', '...AAAAAA.e.', '.........eEe', '..........e.', '............', '............'],
  shroom: ['............', '...aaaa.....', '..ahhaaa....', '.aaaaaaaA...', '.AAAAAAAA...', '....ee..aaa.', '....eE.ahaaA', '....eE.AAAA.', '....eE...eE.', '...eeEE..eE.', '..........E.', '............'],
  bowl: ['............', '....h..h....', '.....h..h...', '....h..h....', '..gggggggg..', '.gaaaaaaaaG.', '.gaahaaaaaG.', '..gaaaaaaG..', '...gggggG...', '....GGGG....', '............', '............'],
  key: ['............', '............', '..ggg.......', '.g...g......', '.g...gggggg.', '.g...g..g.g.', '..ggg...g.g.', '............', '............', '............', '............', '............'],
};

interface IconVariant { shape: string; a: string; A?: string; h?: string; g?: string }

const ICONS: Record<string, IconVariant> = {
  sword: { shape: 'sword', a: PAL.steel2 },
  axe: { shape: 'axe', a: PAL.steel2, g: PAL.gold2 },
  axe_exec: { shape: 'axe', a: PAL.steel3, A: PAL.steel1, g: PAL.threat2 },
  axe_bone: { shape: 'axe', a: PAL.bone2, A: PAL.bone0, g: PAL.magic2 },
  sword_knight: { shape: 'sword', a: PAL.steel3, g: PAL.gold3 },
  sword_dread: { shape: 'sword', a: PAL.threat2, A: PAL.threat0, g: PAL.magic2 },
  staff_frost: { shape: 'staff', a: PAL.ice, h: '#ffffff', A: '#3d7be0' },
  mace: { shape: 'mace', a: PAL.gold2, A: PAL.gold1, h: PAL.gold3 },
  shield_steel: { shape: 'shield', a: PAL.steel2, A: PAL.steel1, g: PAL.steel0 },
  tome_dark: { shape: 'tome', a: PAL.outline, A: PAL.magic0, g: PAL.magic2 },
  helm_knight: { shape: 'helm', a: PAL.steel3, A: PAL.gold1 },
  plate: { shape: 'tunic', a: PAL.steel3, A: PAL.steel1, g: PAL.gold2 },
  robe_gold: { shape: 'robe', a: PAL.night1, A: PAL.night0, g: PAL.gold2 },
  staff: { shape: 'staff', a: PAL.ice, h: PAL.bone3 },
  staff_fire: { shape: 'staff', a: PAL.fire1, h: PAL.fire3, A: PAL.fire0 },
  staff_rune: { shape: 'staff', a: PAL.magic2, h: PAL.magic3, A: PAL.magic1 },
  dagger: { shape: 'dagger', a: PAL.bone2, g: PAL.bone1 },
  shield: { shape: 'shield', a: PAL.earth2, A: PAL.earth1, g: PAL.steel1 },
  shield_iron: { shape: 'shield', a: PAL.steel1, A: PAL.steel0, g: PAL.gold2 },
  tome: { shape: 'tome', a: PAL.magic1, A: PAL.magic0, g: PAL.gold2 },
  hood: { shape: 'hood', a: PAL.earth2, A: PAL.earth1 },
  helm: { shape: 'helm', a: PAL.steel2, A: PAL.steel1 },
  hat: { shape: 'hat', a: PAL.night2, A: PAL.night1, g: PAL.gold2 },
  tunic: { shape: 'tunic', a: PAL.earth3, A: PAL.earth2, g: PAL.earth1 },
  chainmail: { shape: 'tunic', a: PAL.steel2, A: PAL.steel1, g: PAL.steel0 },
  robe: { shape: 'robe', a: PAL.bone1, A: PAL.bone0, g: PAL.night2 },
  robe_dark: { shape: 'robe', a: PAL.magic1, A: PAL.magic0, g: PAL.magic3 },
  gloves: { shape: 'gloves', a: PAL.earth3, A: PAL.earth2, g: PAL.earth1 },
  gauntlets: { shape: 'gloves', a: PAL.steel2, A: PAL.steel1, g: PAL.gold1 },
  boots: { shape: 'boots', a: PAL.earth2, A: PAL.earth1, g: PAL.earth0 },
  boots_swift: { shape: 'boots', a: PAL.night2, A: PAL.night1, g: PAL.ice },
  ring: { shape: 'ring', a: PAL.moss2, h: PAL.bone3, g: '#b8763a' },
  ring_red: { shape: 'ring', a: PAL.threat2, h: PAL.threat3, g: PAL.gold2 },
  amulet: { shape: 'amulet', a: PAL.bone2, h: PAL.bone3, g: PAL.bone1 },
  amulet_heart: { shape: 'amulet', a: PAL.threat2, h: PAL.threat3, g: PAL.gold2 },
  potion_red: { shape: 'potion', a: PAL.threat2, A: PAL.threat1, h: PAL.threat3 },
  potion_blue: { shape: 'potion', a: '#3d7be0', A: '#1f3f80', h: PAL.ice },
  potion_orange: { shape: 'potion', a: '#e08a3d', A: '#80461f', h: '#ffd29a' },
  potion_green: { shape: 'potion', a: PAL.moss2, A: PAL.moss1, h: '#c8f0a0' },
  dust: { shape: 'dust', a: PAL.bone2 },
  wing: { shape: 'wing', a: '#4e3a50', A: '#2a1d2c' },
  coin: { shape: 'coin', a: PAL.gold2 },
  chalice: { shape: 'chalice', a: PAL.gold2 },
  sack: { shape: 'sack', a: '#8a5a2b', A: '#5e3b1a', h: '#a87240' },
  coins1: { shape: 'coins1', a: PAL.gold2 },
  coins2: { shape: 'coins2', a: PAL.gold2 },
  coins3: { shape: 'coins3', a: PAL.gold2 },
  bag1: { shape: 'bag1', a: '#8a5a2b', A: '#5e3b1a', h: '#a87240' },
  bag2: { shape: 'bag1', a: '#6b6f7a', A: '#3c3f47', h: '#a8b4c0' },
  bag3: { shape: 'bag1', a: '#3f6b2a', A: '#25401a', h: '#7fbf5a', g: PAL.gold2 },
  pouch: { shape: 'pouch', a: '#8a5a2b', A: '#5e3b1a', h: '#a87240' },
  gem_red: { shape: 'gem', a: PAL.threat2, A: PAL.threat1, h: '#ff9aa8' },
  key: { shape: 'key', a: PAL.steel2, g: PAL.steel2 },
  ore_copper: { shape: 'ore', a: PAL.stone3, A: PAL.stone1, h: '#e08a4a', g: '#5fbf8a' },
  ore_iron: { shape: 'ore', a: PAL.stone2, A: PAL.stone0, h: '#a8b4c0', g: '#6a4a3a' },
  ore_silver: { shape: 'ore', a: PAL.stone3, A: PAL.stone1, h: '#f2f6fa', g: '#cfd8e3' },
  // ── Armas y equipo de las subzonas (C4): marcadores provisionales ──
  spear: { shape: 'spear', a: PAL.steel2, h: PAL.steel3 },
  spear_bone: { shape: 'spear', a: PAL.bone2, h: PAL.bone3 },
  spear_sea: { shape: 'spear', a: '#5fb3a8', h: '#bff0e8' },
  wand: { shape: 'wand', a: PAL.ice, h: '#ffffff' },
  wand_bone: { shape: 'wand', a: '#7cff9a', h: PAL.bone3 },
  wand_fire: { shape: 'wand', a: PAL.fire1, h: PAL.fire3 },
  torch: { shape: 'torch', a: PAL.fire1, A: PAL.fire0, h: PAL.fire3 },
  torch_hell: { shape: 'torch', a: PAL.threat2, A: PAL.threat0, h: '#ffef6a' },
  lantern: { shape: 'lantern', a: '#7cff9a', A: '#2a5a3a', h: '#d8ffe0', g: PAL.steel1 },
  orb: { shape: 'orb', a: '#6f7f96', A: '#2f3542', h: '#cfd8e3' },
  orb_bone: { shape: 'orb', a: PAL.bone2, A: PAL.bone0, h: PAL.bone3 },
  orb_veil: { shape: 'orb', a: PAL.ice, A: '#3d7be0', h: '#ffffff', g: PAL.gold2 },
  orb_fire: { shape: 'orb', a: PAL.fire1, A: PAL.fire0, h: PAL.fire3 },
  orb_eye: { shape: 'orb', a: PAL.threat2, A: PAL.threat0, h: '#ffef6a', g: PAL.outline },
  mace_iron: { shape: 'mace', a: PAL.steel2, A: PAL.steel1, h: PAL.steel3 },
  mace_blood: { shape: 'mace', a: PAL.threat2, A: PAL.threat0, h: PAL.bone3 },
  hammer_fire: { shape: 'hammer', a: '#3a2a3a', A: PAL.outline, h: PAL.fire2 },
  chain: { shape: 'chain', a: PAL.steel1, A: PAL.steel0 },
  dagger_steel: { shape: 'dagger', a: PAL.steel3, g: PAL.gold2 },
  dagger_blood: { shape: 'dagger', a: PAL.threat2, g: PAL.bone2 },
  greatsword: { shape: 'greatsword', a: PAL.steel2, g: PAL.steel1 },
  greatsword_dark: { shape: 'greatsword', a: '#3a2a3a', A: PAL.outline, g: PAL.fire2 },
  greataxe: { shape: 'axe', a: '#e8d24a', A: '#8a6a1a', g: PAL.earth1 },
  greatstaff: { shape: 'staff', a: PAL.steel2, h: PAL.ice, A: PAL.steel0 },
  greatstaff_dark: { shape: 'staff', a: PAL.outline, h: PAL.fire2, A: PAL.threat0 },
  sword_noble: { shape: 'sword', a: '#e8ecf2', g: PAL.gold3 },
  shield_chain: { shape: 'shield', a: PAL.steel1, A: PAL.outline, g: PAL.fire1 },
  hood_dark: { shape: 'hood', a: '#2a2830', A: PAL.outline },
  hood_blood: { shape: 'hood', a: PAL.threat1, A: PAL.threat0 },
  helm_bone: { shape: 'helm', a: PAL.bone2, A: PAL.bone0 },
  helm_obsidian: { shape: 'helm', a: '#3a2a3a', A: PAL.outline },
  crown: { shape: 'crown', a: '#cfd8e3', g: '#cfd8e3' },
  crown_dark: { shape: 'crown', a: PAL.threat2, g: '#3a2a3a' },
  robe_sea: { shape: 'robe', a: '#3d6a6a', A: '#1f3a3a', g: '#7cd0c0' },
  plate_blood: { shape: 'tunic', a: PAL.threat1, A: PAL.threat0, g: PAL.bone2 },
  plate_chain: { shape: 'tunic', a: PAL.steel1, A: PAL.outline, g: PAL.fire2 },
  gloves_silk: { shape: 'gloves', a: '#e8ecf2', A: '#9aa4b0', g: PAL.night1 },
  gauntlets_fire: { shape: 'gloves', a: '#3a2a3a', A: PAL.outline, g: PAL.fire2 },
  boots_ash: { shape: 'boots', a: '#5a5458', A: '#2a2628', g: PAL.fire1 },
  ring_sea: { shape: 'ring', a: '#2a2830', h: '#7cd0c0', g: '#5fb3a8' },
  ring_dark: { shape: 'ring', a: PAL.outline, h: PAL.threat3, g: PAL.steel1 },
  amulet_sulfur: { shape: 'amulet', a: '#e8d24a', h: '#fff4a0', g: PAL.earth1 },
  pick: { shape: 'pick', a: PAL.steel2, A: PAL.steel1 },
  pick_steel: { shape: 'pick', a: PAL.steel3, A: PAL.ice },
  repair_kit: { shape: 'kit', a: PAL.steel2 },
  ration: { shape: 'bread', a: '#c9873a', A: '#7a4a1a', h: '#e8b86a', g: '#a8492a' },
  water: { shape: 'skin', a: '#7a5a3a', A: '#3a2a1a', h: '#4f8fc9' },
  bandage: { shape: 'bandage', a: '#e9e1cc', A: '#a89f88', h: '#ffffff', g: PAL.threat2 },
  painkiller: { shape: 'potion', a: '#b48ad8', A: '#5a3a78', h: '#ecd8ff' },
  hemostatic: { shape: 'potion', a: '#7a1a24', A: '#3e0d12', h: '#e0a0a0' },
  tourniquet: { shape: 'strap', a: '#6a4a32', A: '#3a281a', g: PAL.steel2 },
  splint: { shape: 'splint', a: '#e9e1cc' },
  scrap_metal: { shape: 'scrap', a: PAL.steel2, A: PAL.steel0, h: PAL.steel3 },
  leather_scrap: { shape: 'strap', a: '#8a5a32', A: '#4a2e1a', g: '#b07a4a' },
  arcane_shard: { shape: 'gem', a: PAL.magic2, A: PAL.magic0, h: '#e8d8ff' },
  salted_meat: { shape: 'meat', a: '#a8492a', A: '#5a2014', h: '#e08a6a' },
  cave_mushroom: { shape: 'shroom', a: '#6a5a8a', A: '#3a2e50', h: '#b8a8d8' },
  stew: { shape: 'bowl', a: '#8a4a1a', h: '#e8d8c0', g: '#6a4a32', A: '#4a2e1a' },
  broth: { shape: 'bowl', a: '#c9a03a', h: '#e8d8c0', g: '#6a4a32', A: '#4a2e1a' },
  stale_bread: { shape: 'bread', a: '#9a7a4a', A: '#5a4428', h: '#c8a878', g: '#7a5a3a' },
  wrinkled_apple: { shape: 'orb', a: '#a8402a', A: '#5a1e14', h: '#e0906a' },
  jerky: { shape: 'meat', a: '#6a2e1a', A: '#3a160c', h: '#a85a3a' },
  aged_cheese: { shape: 'bread', a: '#e0b84a', A: '#8a6a1a', h: '#f8e08a', g: '#c8982a' },
  watered_wine: { shape: 'skin', a: '#6a3a4a', A: '#3a1a24', h: '#a84a6a' },
  bitter_tea: { shape: 'chalice', a: '#7a8a4a', A: '#3a4424', h: '#b8c88a' },
  surgery_kit: { shape: 'medkit', a: PAL.steel2, g: PAL.threat2 },
};

export function drawIcon(key: string): Canvas {
  const v = ICONS[key] ?? ICONS.coin;
  const shape = ICON_SHAPES[v.shape];
  const pal: Record<string, string> = {
    a: v.a, A: v.A ?? shade(v.a, -0.35), h: v.h ?? shade(v.a, 0.45), g: v.g ?? PAL.gold2, G: PAL.gold1, y: PAL.gold3,
    w: PAL.steel3, b: PAL.earth2, B: PAL.earth1, k: PAL.outline, r: PAL.threat1, e: PAL.bone2, E: PAL.bone1,
  };
  if (v.shape === 'potion') pal.w = '#c9d6e3';
  const p = new Pix(12, 12);
  shape.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && p.px(x, y, pal[ch] ?? v.a)));
  p.outline();
  return p.c;
}

// ── Caché de imágenes para la interfaz (React) ───────────────────────

const urlCache = new Map<string, string>();

export function scaled(c: Canvas, scale: number): Canvas {
  const [o, ctx] = canvas(c.width * scale, c.height * scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, 0, 0, o.width, o.height);
  return o;
}

export function cachedUrl(key: string, make: () => Canvas, scale = 1): string {
  const k = `${key}@${scale}`;
  let u = urlCache.get(k);
  if (!u) {
    u = scaled(make(), scale).toDataURL();
    urlCache.set(k, u);
  }
  return u;
}

export function iconUrl(icon: string, scale = 3): string {
  return cachedUrl(`icon:${icon}`, () => drawIcon(icon), scale);
}

export function heroUrl(classId: ClassId, ap: Appearance, scale = 4, frame = 0, pose: 'idle' | 'attack' | 'hurt' = 'idle', equipment?: Equipment, skin?: string | null): string {
  const eq = equipment ?? starterEquipment(classId);
  return cachedUrl(`hero:${classId}:${ap.cloak}:${ap.skin}:${lookSignature(eq)}:${skin ?? ''}:${SHEETS.size}:${frame}:${pose}`, () => drawHumanoid(heroSpec(classId, ap, eq, skin), frame, pose), scale);
}

/** Héroe de espaldas (combate). */
export function heroBackUrl(classId: ClassId, ap: Appearance, scale = 4, pose: 'idle' | 'attack' | 'hurt' = 'idle', equipment?: Equipment, skin?: string | null): string {
  const eq = equipment ?? starterEquipment(classId);
  return cachedUrl(`heroback:${classId}:${ap.cloak}:${ap.skin}:${lookSignature(eq)}:${skin ?? ''}:${SHEETS.size}:${pose}`, () => drawHumanoidBack(heroSpec(classId, ap, eq, skin), pose), scale);
}

/** Kael de espaldas, cuando lucha a tu lado. */
export function rivalBackUrl(scale = 4, pose: 'idle' | 'attack' | 'hurt' = 'idle'): string {
  return cachedUrl(`rivalback:${pose}`, () => drawHumanoidBack(MONSTER_SPECS.rival, pose), scale);
}

/** Cualquier compañero humanoide (Kael, mercenarios) de espaldas. */
export function allyBackUrl(sprite: string, scale = 4, pose: 'idle' | 'attack' | 'hurt' = 'idle'): string {
  const spec = MONSTER_SPECS[sprite];
  if (!spec) return monsterUrl(sprite, scale, pose);
  return cachedUrl(`allyback:${sprite}:${pose}`, () => drawHumanoidBack(spec, pose), scale);
}

export function monsterUrl(sprite: string, scale = 4, pose: 'idle' | 'attack' | 'hurt' = 'idle'): string {
  if (FLYER_SPECS[sprite]) return cachedUrl(`fly:${sprite}:${pose}`, () => drawBat(pose === 'attack' ? 0 : 1, pose === 'hurt', sprite), scale);
  if (BEAST_SPECS[sprite]) return cachedUrl(`beast:${sprite}:${pose}`, () => drawBeast(sprite, pose === 'attack' ? 1 : 0, pose === 'hurt'), scale);
  const spec = MONSTER_SPECS[sprite] ?? MONSTER_SPECS.skeleton;
  return cachedUrl(`mon:${sprite}:${pose}`, () => drawHumanoid(spec, 0, pose), scale);
}

// ── Baldosas por subzona ───────────────────────────────────────────────
// Marcadores hechos por código hasta que existan las baldosas definitivas (32×16 suelos, 32×38 muros).
// Cada subzona elige un estilo de suelo y de muro y su paleta.
export interface Tileset {
  floor: 'flag' | 'mud' | 'rug' | 'wet' | 'bone' | 'marble' | 'blood' | 'lava';
  wall: 'brick' | 'palisade' | 'bone' | 'marble' | 'rock';
  /** Suelo: junta, base oscura, base, base clara, acento. */
  f: [string, string, string, string, string];
  /** Muro: luz, medio, sombra, junta, acento. */
  w: [string, string, string, string, string];
}

export const TILESETS: Record<string, Tileset> = {
  afueras: { floor: 'mud', wall: 'palisade', f: ['#241a12', '#3a2a1c', '#4a3524', '#5c4430', '#3c5130'], w: ['#7a5a3a', '#5c4128', '#3e2a18', '#24170c', '#9a7a4a'] },
  castillo: { floor: 'rug', wall: 'brick', f: ['#2a2622', '#4a443e', '#5a534b', '#6e665c', '#7a1c22'], w: ['#7a7268', '#5e574f', '#46403a', '#2a2622', '#9a6b1a'] },
  calabozos: { floor: 'wet', wall: 'brick', f: [PAL.stone1, '#2e332e', '#3a403a', '#4a524a', '#2a4a4a'], w: ['#55605a', '#414a44', '#2e3530', '#1c211e', PAL.moss1] },
  osario: { floor: 'bone', wall: 'bone', f: ['#26241f', '#3e3a33', '#4d483f', '#5e584d', PAL.bone2], w: [PAL.bone2, PAL.bone1, PAL.bone0, '#3a362e', PAL.outline] },
  catacumbas: { floor: 'wet', wall: 'brick', f: ['#162024', '#22323a', '#2a3e48', '#355060', '#2f7f8f'], w: ['#3f5a66', '#2f4650', '#20333b', '#121e24', PAL.moss1] },
  panteon: { floor: 'marble', wall: 'marble', f: ['#8a857a', '#bfbab0', '#d0cbc1', '#e2ded6', PAL.gold1], w: ['#e8e4dc', '#c9c4ba', '#a49f95', '#6e6a62', PAL.gold2] },
  carmesi: { floor: 'blood', wall: 'brick', f: ['#1e0e10', '#3a1a1c', '#4a2224', '#5c2c2c', PAL.threat1], w: ['#6b3434', '#522628', '#3a1a1c', '#200c0e', PAL.fire1] },
  puertas: { floor: 'lava', wall: 'rock', f: ['#120c0c', '#241818', '#2e1f1e', '#3a2826', PAL.fire1], w: ['#3e302e', '#2e2220', '#1e1614', '#0e0a0a', PAL.fire1] },
  rios: { floor: 'lava', wall: 'rock', f: ['#140a08', '#2a1610', '#341c14', '#40241a', PAL.fire2], w: ['#4a2e22', '#36201a', '#241410', '#120a08', PAL.fire2] },
  trono: { floor: 'lava', wall: 'rock', f: ['#0e0a10', '#1e1620', '#281e2a', '#342636', PAL.threat2], w: ['#3a2e3e', '#2a2030', '#1a1420', '#0c0810', PAL.threat2] },
};

export function drawFloorTs(variant: number, ts: Tileset): Canvas {
  const p = new Pix(TILE_W, TILE_H);
  const [seamC, d, m, l, acc] = ts.f;
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inDiamond(x, y)) continue;
      const a = (x / 16 + y / 8) / 2;
      const b = (x / 16 - y / 8) / 2 + 0.5;
      const n = hash(x, y, variant * 7 + 3);
      const stone = (a > 0.5 ? 1 : 0) + (b > 0.5 ? 2 : 0);
      const flagged = ts.floor !== 'mud' && ts.floor !== 'lava';
      const seam = flagged && (Math.abs(a - 0.5) < 0.035 || Math.abs(b - 0.5) < 0.035);
      const edge = a < 0.05 || b < 0.05 || a > 0.97 || b > 0.97;
      const t = n * 0.6 + hash(stone, variant, 3) * 0.4;
      let col = t < 0.2 ? d : t < 0.75 ? m : l;
      if (seam || (edge && flagged)) col = seamC;
      switch (ts.floor) {
        case 'mud':
          if (hash(Math.floor(x / 3), Math.floor(y / 2), variant + 11) > 0.72) col = n > 0.5 ? acc : shade(acc, -0.25);
          if (variant === 3 && Math.abs(a - b) < 0.06) col = shade(m, 0.12);
          break;
        case 'rug':
          if (variant >= 2 && Math.abs(b - 0.5) < 0.22 && !seam) col = Math.abs(b - 0.5) > 0.18 ? PAL.gold1 : n > 0.85 ? shade(acc, 0.15) : acc;
          break;
        case 'wet':
          if (variant === 1 && Math.hypot(a - 0.45, b - 0.55) < 0.22) col = n > 0.8 ? shade(acc, 0.35) : acc;
          if (variant === 2 && stone === 1 && n > 0.6) col = PAL.moss1;
          break;
        case 'bone':
          if (!seam && hash(x, y, variant + 41) > 0.9) col = n > 0.5 ? acc : shade(acc, -0.3);
          break;
        case 'marble':
          if (!seam && Math.abs(Math.sin((x + y * 2 + variant * 5) * 0.35)) < 0.08) col = shade(m, -0.25);
          if (variant === 3 && Math.abs(a - 0.5) < 0.06 && Math.abs(b - 0.5) < 0.06) col = acc;
          break;
        case 'blood':
          if (!seam && hash(Math.floor(x / 2), Math.floor(y / 2), variant + 17) > 0.8) col = acc;
          break;
        case 'lava': {
          const crack = Math.abs(Math.sin(x * 0.4 + variant) * 3 + y - 8) < 0.6 && variant === 1;
          if (crack) col = n > 0.5 ? acc : shade(acc, 0.3);
          else if (variant === 3 && Math.hypot(a - 0.5, b - 0.5) < 0.2) col = n > 0.4 ? acc : shade(acc, 0.4);
          break;
        }
        default:
          break;
      }
      p.px(x, y, col);
    }
  }
  return p.c;
}

export function drawWallTs(variant: number, ts: Tileset): Canvas {
  const [l, m, d, mortar, acc] = ts.w;
  const face = (u: number, v: number, right: boolean): string => {
    const dk = (c: string) => (right ? shade(c, -0.22) : c);
    if (v === WALL_H - 1) return mortar;
    switch (ts.wall) {
      case 'palisade': {
        if (u % 4 === 0) return mortar;
        const top = v < 3 && (u % 4 === 2) ? mortar : null;
        if (top) return top;
        const n = hash(Math.floor(u / 4), v, variant + 3);
        return dk(n > 0.85 ? l : n < 0.2 ? d : m);
      }
      case 'bone': {
        const c = brick(u, v, l, m, d, mortar, variant * 13 + (right ? 1 : 0));
        if (c !== mortar && hash(Math.floor(u / 4), Math.floor(v / 5), variant + 7) > 0.7 && (u % 4 === 1 || u % 4 === 2) && v % 5 === 2) return acc;
        return dk(c);
      }
      case 'marble': {
        const row = Math.floor(v / 7);
        if (v % 7 === 6 || (u + (row % 2) * 8) % 16 === 0) return mortar;
        if (v < 2) return dk(acc);
        return dk(Math.abs(Math.sin((u + v * 2) * 0.4)) < 0.1 ? d : m);
      }
      case 'rock': {
        const n = hash(Math.floor(u / 3), Math.floor(v / 3), variant + 29);
        if (v > WALL_H - 4 && hash(u, v, 61) > 0.55) return acc;
        return dk(n > 0.8 ? l : n < 0.3 ? d : m);
      }
      default: {
        const c = brick(u, v, l, m, d, mortar, variant * 13 + (right ? 1 : 0));
        if (variant === 1 && v > WALL_H - 6 && hash(u, v, 5) > 0.6) return acc;
        return dk(c);
      }
    }
  };
  return drawBlock({
    height: WALL_H,
    top: (x, y) => {
      const n = hash(x, y, 91 + variant);
      return ts.wall === 'palisade' ? (n > 0.6 ? l : m) : n > 0.85 ? l : n < 0.2 ? d : m;
    },
    left: (u, v) => face(u, v, false),
    right: (u, v) => face(u, v, true),
  });
}

/** Decorado de las subzonas (marcadores hasta el arte definitivo; 16×22 px como máximo). */
function drawDecorExtra(kind: string): Canvas {
  const p = new Pix(16, 22);
  const b = 21; // línea del suelo
  switch (kind) {
    case 'grass':
      for (const [x, h] of [[3, 3], [5, 5], [7, 4], [9, 6], [11, 3], [12, 4]]) p.rect(x, b - h, 1, h, h > 4 ? PAL.moss2 : PAL.moss1);
      break;
    case 'stake':
      p.rect(6, 6, 4, 15, PAL.earth2); p.rect(9, 6, 1, 15, PAL.earth1); p.rect(7, 4, 2, 2, PAL.earth3); p.px(7, 3, PAL.earth3);
      p.rect(5, 12, 6, 1, PAL.earth0);
      break;
    case 'puddle':
      p.rect(2, b - 2, 12, 2, '#2a4a5a'); p.rect(4, b - 3, 8, 1, '#2a4a5a'); p.rect(5, b - 2, 3, 1, '#4a7a8a');
      break;
    case 'crate':
      p.rect(3, 11, 10, 10, PAL.earth2); p.rect(3, 11, 10, 1, PAL.earth3); p.rect(11, 11, 2, 10, PAL.earth1);
      for (let i = 0; i < 8; i++) p.px(4 + i, 12 + i, PAL.earth1);
      break;
    case 'banner':
      p.rect(7, 1, 1, 20, PAL.earth1); p.rect(4, 2, 7, 1, PAL.gold1);
      p.rect(4, 3, 7, 10, PAL.threat1); p.rect(4, 13, 3, 2, PAL.threat1); p.rect(8, 13, 3, 2, PAL.threat1); p.rect(6, 6, 3, 3, PAL.gold2);
      break;
    case 'cage':
      for (const x of [3, 6, 9, 12]) p.rect(x, 6, 1, 15, PAL.steel1);
      p.rect(3, 5, 10, 1, PAL.steel2); p.rect(3, 13, 10, 1, PAL.steel0); p.rect(7, 2, 1, 3, PAL.steel0);
      p.rect(6, 17, 4, 3, PAL.bone2);
      break;
    case 'chain':
      for (let y = 4; y < 20; y += 3) { p.rect(7, y, 2, 2, PAL.steel1); p.px(8, y + 2, PAL.steel0); }
      p.rect(5, 19, 6, 2, PAL.steel0);
      break;
    case 'urn':
      p.rect(5, 13, 6, 8, PAL.earth2); p.rect(4, 15, 8, 4, PAL.earth2); p.rect(6, 11, 4, 2, PAL.earth1); p.rect(10, 14, 2, 6, PAL.earth1); p.px(6, 16, PAL.gold1);
      break;
    case 'candles':
      for (const [x, h] of [[4, 5], [7, 8], [10, 6]]) { p.rect(x, b - h, 2, h, PAL.bone2); p.px(x, b - h - 1, PAL.fire2); p.px(x + 1, b - h - 2, PAL.fire3); }
      p.rect(3, b - 1, 10, 1, PAL.bone1);
      break;
    case 'roots':
      for (let i = 0; i < 12; i++) p.px(2 + i, b - 1 - Math.round(Math.abs(Math.sin(i * 0.9)) * 3), PAL.earth1);
      p.rect(2, b - 1, 12, 1, PAL.earth0); p.px(6, b - 4, PAL.moss1);
      break;
    case 'statue':
      p.rect(4, 17, 8, 4, PAL.stone3); p.rect(5, 8, 6, 9, '#bfbab0'); p.rect(6, 4, 4, 4, '#d8d4cc'); p.rect(10, 8, 1, 9, '#8a857a'); p.px(7, 5, PAL.stone1); p.px(8, 5, PAL.stone1);
      break;
    case 'coffin':
      p.rect(3, 13, 10, 7, PAL.earth1); p.rect(4, 12, 8, 1, PAL.earth2); p.rect(3, 13, 10, 1, PAL.earth2); p.rect(7, 14, 2, 5, PAL.gold1); p.rect(6, 15, 4, 1, PAL.gold1);
      break;
    case 'lava':
      p.rect(2, b - 2, 12, 2, PAL.fire1); p.rect(4, b - 3, 7, 1, PAL.fire1); p.rect(5, b - 2, 4, 1, PAL.fire2); p.px(7, b - 3, PAL.fire3);
      break;
    case 'crystal':
      p.rect(6, 9, 3, 12, PAL.magic1); p.rect(7, 6, 1, 3, PAL.magic2); p.rect(9, 13, 3, 8, PAL.magic0); p.rect(4, 15, 2, 6, PAL.magic2); p.px(7, 10, PAL.magic3);
      break;
    case 'brazier':
      p.rect(7, 12, 2, 9, PAL.steel0); p.rect(4, 19, 8, 2, PAL.steel0); p.rect(4, 9, 8, 3, PAL.steel1);
      p.rect(5, 6, 6, 3, PAL.fire1); p.rect(6, 4, 4, 2, PAL.fire2); p.px(7, 3, PAL.fire3);
      break;
    case 'spikes':
      for (const x of [3, 6, 9, 12]) { p.rect(x, b - 3, 1, 3, PAL.steel1); p.px(x, b - 4, PAL.steel2); }
      p.rect(2, b - 1, 12, 1, PAL.stone2);
      break;
    default:
      p.rect(3, b - 3, 10, 3, PAL.stone3);
  }
  p.outline();
  return p.c;
}

/** Triángulo de riesgo sobre la cabeza de un errante (9×8 px de dibujo). El símbolo va dentro para distinguirlo sin color. */
export function drawRiskMarker(color: string, symbol: 'check' | 'one' | 'two' | 'skull' | 'swords'): Canvas {
  const p = new Pix(11, 10);
  for (let y = 0; y < 9; y++) { const half = Math.floor(y / 2); p.rect(5 - half, y, half * 2 + 1, 1, color); }
  const k = PAL.outline;
  if (symbol === 'check') { p.px(3, 6, k); p.px(4, 7, k); p.px(5, 6, k); p.px(6, 5, k); p.px(7, 4, k); }
  if (symbol === 'one') { p.rect(5, 3, 1, 3, k); p.px(5, 7, k); }
  if (symbol === 'two') { p.rect(4, 3, 1, 3, k); p.px(4, 7, k); p.rect(6, 3, 1, 3, k); p.px(6, 7, k); }
  if (symbol === 'skull') { p.rect(4, 3, 3, 3, k); p.px(4, 6, k); p.px(6, 6, k); p.px(4, 4, color); p.px(6, 4, color); }
  if (symbol === 'swords') { p.px(3, 3, k); p.px(4, 4, k); p.px(5, 5, k); p.px(6, 6, k); p.px(7, 7, k); p.px(7, 3, k); p.px(6, 4, k); p.px(4, 6, k); p.px(3, 7, k); }
  p.outline();
  return p.c;
}

/** Flecha dorada del tutorial (12×12 px), apunta hacia abajo. */
export function drawTutorialArrow(): Canvas {
  const p = new Pix(12, 12);
  p.rect(4, 0, 4, 6, PAL.gold2);
  for (let y = 0; y < 5; y++) p.rect(1 + y, 6 + y, 10 - y * 2, 1, y ? PAL.gold2 : PAL.gold3);
  p.rect(5, 0, 1, 6, PAL.gold3);
  p.outline();
  return p.c;
}
