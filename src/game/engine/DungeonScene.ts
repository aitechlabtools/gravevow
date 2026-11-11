import { FLYER_SPECS, TALL_DECOR } from '../../shared/art';
import { getWanderer } from '../../core/data/wanderers';
import { TUTORIAL_STEPS } from '../../core/data/tutorial';
import { getMerc } from '../../core/data/mercenaries';
import { wornSkin } from '../../core/skins';
import { bestPick, VEINS, type VeinId } from '../../core/mining';
import { areaDef } from '../../core/data/zones';
import { chestType } from '../../core/data/chests';
import { getItem } from '../../core/data/items';
import { touchStick } from './touchInput';
import { TOUCH_CFG } from '../../config/touch';
import Phaser from 'phaser';
import { buildDungeon, CRYPTS_OF_UMBRAVEL, findPath, roomAt, type BuiltDungeon, type DungeonDef, type EntityDef } from '../../core/dungeon';
import { getEnemy } from '../../core/data/enemies';
import { mobilityMult } from '../../core/anatomy';
import { registerTextures, registerHeroTextures } from './textures';
import { lookSignature } from '../../shared/gearLook';
import { actions, getState, subscribe, tutorialFrozen } from '../state/store';
import { bus } from '../state/bus';
import { sfx } from '../audio';

// ════════════════════════════════════════════════════════════════════
// Escena de exploración isométrica.
// Coordenadas de rejilla (gx, gy) continuas: la casilla (x, y) ocupa [x, x+1) × [y, y+1).
// Proyección: pantalla = ((gx - gy) * 16, (gx + gy) * 8).
// ════════════════════════════════════════════════════════════════════

const HALF_W = 16;
const HALF_H = 8;
const PLAYER_SPEED = 72; // píxeles de pantalla (sin zoom) por segundo
const PLAYER_RADIUS = 0.26;
const LIGHT_PLAYER = 5.2;
const LIGHT_TORCH = 4.6;
const SIGHT = 11;

export const iso = (gx: number, gy: number) => ({ x: (gx - gy) * HALF_W, y: (gx + gy) * HALF_H });
export const fromIso = (sx: number, sy: number) => ({ x: (sx / HALF_W + sy / HALF_H) / 2, y: (sy / HALF_H - sx / HALF_W) / 2 });
const depthAt = (gx: number, gy: number) => (gx + gy) * 10;

interface Mob {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  marker?: Phaser.GameObjects.Image;
  x: number;
  y: number;
  tex: string;
  frames: number;
  animT: number;
  moving: boolean;
  scale: number;
  lift: number;
}

interface EnemyEnt extends Mob {
  id: string;
  enemyId: string;
  homeX: number;
  homeY: number;
  target: [number, number] | null;
  wait: number;
  speed: number;
  aggro: number;
  dead: boolean;
  boss: boolean;
}

interface TileVis {
  x: number;
  y: number;
  imgs: Phaser.GameObjects.Image[];
  explored: boolean;
  bright: number;
  wall: boolean;
  tall: Set<Phaser.GameObjects.Image>;
}

export interface Interactable { label: string; run: () => void }

export let activeScene: DungeonScene | null = null;

export class DungeonScene extends Phaser.Scene {
  dungeon!: BuiltDungeon;
  player!: Mob;
  enemies: EnemyEnt[] = [];
  rival: (Mob & { gone: boolean; leaving: boolean }) | null = null;
  /** Mercenario que te sigue (contratado o rescatado). */
  merc: (Mob & { gone: boolean }) | null = null;
  /** Prisionero encadenado esperando a que lo liberes. */
  captive: (Mob & { mercId: string; chains: Phaser.GameObjects.Image }) | null = null;
  veins: { id: string; vein: VeinId; x: number; y: number; img: Phaser.GameObjects.Image; spent: boolean }[] = [];
  /** Lo que se está canalizando ahora: null = el portal. */
  job: { label: string; seconds: number; done: () => void } | null = null;
  tiles: TileVis[] = [];
  tileIndex = new Map<string, TileVis>();
  doors = new Map<string, { id: string; x: number; y: number; img: Phaser.GameObjects.Image; open: boolean }>();
  chests: { id: string; x: number; y: number; table: string; img: Phaser.GameObjects.Image; opened: boolean }[] = [];
  traps: { id: string; x: number; y: number; img: Phaser.GameObjects.Image; cooldown: number }[] = [];
  torches: { x: number; y: number; lx: number; ly: number; img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; phase: number; light: Map<string, number> }[] = [];
  pillars = new Set<string>();
  portal!: { x: number; y: number; img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image };
  bagSprites = new Map<string, Phaser.GameObjects.Image>();
  decor: { x: number; y: number; img: Phaser.GameObjects.Image }[] = [];
  keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;
  path: [number, number][] = [];
  channel = -1;
  grace = 0;
  lightTimer = 0;
  betrayTimer = 0;
  stepTimer = 0;
  frameTimer = 0;
  portalFrame = 0;
  lastTile = '';
  unsub: (() => void)[] = [];
  pendingChoices: Interactable[] = [];
  heroVersion = 0;
  heroLook = '';
  def!: DungeonDef;

  constructor() {
    super('dungeon');
  }

  create() {
    activeScene = this;
    const st = getState();
    const ch = st.profile!.character;
    registerTextures(this, st.dungeon?.subzone);
    this.heroVersion = 0;
    this.heroLook = lookSignature(st.expedition!.equipment) + '|' + (wornSkin(st.profile) ?? '');
    const heroTex = registerHeroTextures(this, 0, { classId: ch.classId, appearance: ch.appearance, equipment: st.expedition!.equipment, skin: wornSkin(st.profile) });
    this.def = st.dungeon ?? CRYPTS_OF_UMBRAVEL;
    this.dungeon = buildDungeon(this.def);
    this.zoneTint = areaDef(this.def.subzone, this.def.zone).tint;
    this.enemies = [];
    this.merc = null;
    this.captive = null;
    this.veins = [];
    this.job = null;
    this.tiles = [];
    this.tileIndex.clear();
    this.doors.clear();
    this.chests = [];
    this.traps = [];
    this.torches = [];
    this.pillars.clear();
    this.bagSprites.clear();
    this.decor = [];

    this.buildTiles();
    for (const e of this.def.entities) this.spawnEntity(e);
    this.precomputeTorchLight();

    const spawn = this.def.entities.find((e) => e.kind === 'spawn')!;
    this.player = this.makeMob(heroTex, 4, spawn.x + 0.5, spawn.y + 0.5);
    this.refreshMerc();

    // Partículas de polvo alrededor del jugador
    this.add.particles(0, 0, 'mote', {
      follow: this.player.sprite,
      x: { min: -90, max: 90 },
      y: { min: -60, max: 40 },
      lifespan: 4000,
      speedY: { min: -6, max: -2 },
      speedX: { min: -3, max: 3 },
      alpha: { start: 0.5, end: 0 },
      scale: { min: 0.4, max: 0.9 },
      frequency: 220,
      blendMode: 'ADD',
    }).setDepth(99999);

    const cam = this.cameras.main;
    cam.setBackgroundColor('#07060a');
    cam.setZoom(this.pickZoom());
    cam.startFollow(this.player.sprite, true, 0.15, 0.15, 0, 10);
    cam.setRoundPixels(true);
    this.scale.on('resize', () => cam.setZoom(this.pickZoom()));

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({ W: 'W', A: 'A', S: 'S', D: 'D', UP: 'UP', DOWN: 'DOWN', LEFT: 'LEFT', RIGHT: 'RIGHT' }) as DungeonScene['keys'];
    kb.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.paused()) return;
      const g = fromIso(p.worldX, p.worldY);
      const tx = Math.floor(g.x), ty = Math.floor(g.y);
      const from: [number, number] = [Math.floor(this.player.x), Math.floor(this.player.y)];
      const path = findPath(this.dungeon.def.width, this.dungeon.def.height, (x, y) => !this.walkableTile(x, y), from, [tx, ty]);
      if (path) {
        this.path = path;
        this.cancelChannel();
      }
    });

    // Si cambia el equipo durante la expedición, el personaje cambia de aspecto al momento
    this.unsub.push(subscribe(() => this.refreshHeroLook()));
    this.unsub.push(
      bus.on('combat-ended', (p) => this.onCombatEnded(p)),
      bus.on('rival-changed', () => this.refreshRival()),
      bus.on('tutorial-revive', (t) => { this.debugTeleport(t.x, t.y); this.grace = 1.5; }),
      bus.on('rival-warn', () => { const mk = this.rival?.marker; if (mk) this.tweens.add({ targets: mk, angle: { from: -18, to: 18 }, duration: 90, yoyo: true, repeat: 7, onComplete: () => mk.setAngle(0) }); }),
      bus.on('merc-changed', () => this.refreshMerc()),
      bus.on('bags-changed', () => this.refreshBags()),
      bus.on('cancel-channel', () => this.cancelChannel()),
    );
    this.events.once('shutdown', () => this.cleanup());
    this.events.once('destroy', () => this.cleanup());
    this.updateLighting(0);
    this.refreshRival();
  }

  cleanup() {
    this.unsub.forEach((u) => u());
    this.unsub = [];
    if (activeScene === this) activeScene = null;
  }

  pickZoom() {
    return Phaser.Math.Clamp(Math.floor(this.scale.height / 300), 2, 4);
  }

  // ── Construcción ──

  buildTiles() {
    const { tiles, def } = this.dungeon;
    for (let y = 0; y < def.height; y++) {
      for (let x = 0; x < def.width; x++) {
        const t = tiles[y][x];
        if (t === 'void') continue;
        const vis: TileVis = { x, y, imgs: [], explored: false, bright: 0, wall: t === 'wall', tall: new Set() };
        const c = iso(x + 0.5, y + 0.5);
        if (t === 'floor') {
          const v = (x * 7 + y * 13 + ((x * y) % 5)) % 4;
          vis.imgs.push(this.add.image(c.x, c.y, `floor${v}`).setDepth(-10));
        } else {
          const b = iso(x + 1, y + 1);
          const w = this.add.image(b.x, b.y, (x * 3 + y) % 5 === 0 ? 'wall1' : 'wall0').setOrigin(0.5, 1).setDepth(depthAt(x + 0.5, y + 0.5));
          vis.imgs.push(w);
          vis.tall.add(w);
        }
        vis.imgs.forEach((i) => i.setAlpha(0));
        this.tiles.push(vis);
        this.tileIndex.set(`${x},${y}`, vis);
      }
    }
  }

  makeMob(tex: string, frames: number, x: number, y: number, scale = 1): Mob {
    const p = iso(x, y);
    const shadow = this.add.image(p.x, p.y, scale > 1 ? 'shadow_big' : 'shadow').setDepth(-5);
    const sprite = this.add.image(p.x, p.y, `${tex}0`).setOrigin(0.5, 0.92).setScale(scale);
    return { sprite, shadow, x, y, tex, frames, animT: Math.random(), moving: false, scale, lift: 0 };
  }

  spawnEntity(e: EntityDef) {
    const cx = e.x + 0.5, cy = e.y + 0.5;
    const c = iso(cx, cy);
    const vis = this.tileIndex.get(`${e.x},${e.y}`);
    switch (e.kind) {
      case 'door': {
        const b = iso(e.x + 1, e.y + 1);
        const img = this.add.image(b.x, b.y, 'door').setOrigin(0.5, 1).setDepth(depthAt(cx, cy));
        this.doors.set(`${e.x},${e.y}`, { id: e.id, x: e.x, y: e.y, img, open: false });
        vis?.imgs.push(img);
        vis?.tall.add(img);
        break;
      }
      case 'pillar': {
        const img = this.add.image(c.x, c.y, 'pillar').setOrigin(0.5, 0.74).setDepth(depthAt(cx, cy));
        this.pillars.add(`${e.x},${e.y}`);
        vis?.imgs.push(img);
        vis?.tall.add(img);
        break;
      }
      case 'trap': {
        const img = this.add.image(c.x, c.y, 'trap_off').setDepth(-9);
        this.traps.push({ id: e.id, x: e.x, y: e.y, img, cooldown: 0 });
        vis?.imgs.push(img);
        break;
      }
      case 'chest': {
        const img = this.add.image(c.x, c.y + 2, `chest_${chestType(e.table).look}`).setOrigin(0.5, 0.85).setDepth(depthAt(cx, cy) + 1);
        this.chests.push({ id: e.id, x: e.x, y: e.y, table: e.table, img, opened: false });
        vis?.imgs.push(img);
        break;
      }
      case 'torch': {
        // Se coloca sobre la cara visible del muro
        const face = e.face === 'south' ? iso(e.x + 0.5, e.y + 1) : iso(e.x + 1, e.y + 0.5);
        const img = this.add.image(face.x, face.y - 14, 'torch0').setDepth(depthAt(e.x + 0.5, e.y + 0.5) + 1);
        const glow = this.add.image(face.x, face.y - 14, 'glow_warm').setBlendMode(Phaser.BlendModes.ADD).setDepth(99990).setAlpha(0);
        const [lx, ly] = e.face === 'south' ? [e.x + 0.5, e.y + 1.4] : [e.x + 1.4, e.y + 0.5];
        this.torches.push({ x: e.x, y: e.y, lx, ly, img, glow, phase: Math.random() * 10, light: new Map() });
        vis?.imgs.push(img);
        break;
      }
      case 'portal': {
        const img = this.add.image(c.x, c.y, 'portal0').setOrigin(0.5, 0.9).setDepth(depthAt(cx, cy) + 1);
        const glow = this.add.image(c.x, c.y - 14, 'glow_violet').setBlendMode(Phaser.BlendModes.ADD).setDepth(99991).setAlpha(0);
        this.portal = { x: e.x, y: e.y, img, glow };
        vis?.imgs.push(img);
        this.tweens.add({ targets: img, y: c.y - 2, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        break;
      }
      case 'decor': {
        const standing = TALL_DECOR.has(e.sprite);
        const img = this.add.image(c.x + ((e.x * 5) % 7) - 3, c.y + 2, `decor_${e.sprite}`).setOrigin(0.5, 0.85).setDepth(standing ? depthAt(cx, cy) : -8);
        vis?.imgs.push(img);
        break;
      }
      case 'enemy': {
        const def = getEnemy(e.enemyId);
        const isBat = def.sprite in FLYER_SPECS;
        const mob = this.makeMob(def.sprite, isBat ? 3 : 4, cx, cy, def.boss ? 1.6 : def.elite ? 1.25 : def.sprite === 'imp' ? 0.85 : 1);
        if (isBat) mob.lift = 10;
        this.enemies.push({ ...mob, id: e.id, enemyId: e.enemyId, homeX: cx, homeY: cy, target: null, wait: Math.random() * 2, speed: def.wander.speed, aggro: def.wander.aggroRange, dead: false, boss: !!def.boss });
        break;
      }
      case 'vein': {
        // Pegada a la pared: un poco desplazada hacia ella
        const off = this.dungeon.tiles[e.y - 1]?.[e.x] === 'wall' ? iso(cx, cy - 0.3) : iso(cx - 0.3, cy);
        const img = this.add.image(off.x, off.y + 3, `vein_${e.vein}`).setOrigin(0.5, 0.9).setDepth(depthAt(cx, cy));
        this.veins.push({ id: e.id, vein: e.vein, x: e.x, y: e.y, img, spent: false });
        vis?.imgs.push(img);
        break;
      }
      case 'captive': {
        const m = this.makeMob(getMerc(e.mercId).sprite, 4, cx, cy);
        m.marker = this.add.image(0, 0, 'marker_neutral').setDepth(99980);
        const chains = this.add.image(c.x, c.y + 1, 'chains').setDepth(depthAt(cx, cy) + 1.5);
        this.captive = { ...m, mercId: e.mercId, chains };
        break;
      }
      case 'rival': {
        // Mercenario errante: su dibujo y, sobre la cabeza, el triángulo de riesgo de traición
        const rs = getState().rival;
        if (!rs.who) break;
        const m = this.makeMob(getWanderer(rs.who).sprite, 4, cx, cy);
        m.marker = this.add.image(0, 0, `risk_${rs.risk}`).setDepth(99980);
        this.rival = { ...m, gone: false, leaving: false };
        // Kael lleva una linterna verde: se le distingue de lejos
        if (rs.who === 'kael') this.kaelGlow = this.add.image(c.x, c.y - 10, 'glow_kael').setBlendMode(Phaser.BlendModes.ADD).setDepth(99990).setAlpha(0.8);
        break;
      }
    }
  }

  // ── Luz y visibilidad ──

  losClear(x0: number, y0: number, x1: number, y1: number): boolean {
    let x = x0, y = y0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (!(x === x1 && y === y1)) {
      if (!(x === x0 && y === y0) && this.blocksSight(x, y)) return false;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return true;
  }

  blocksSight(x: number, y: number) {
    const t = this.dungeon.tiles[y]?.[x];
    if (t !== 'floor') return true;
    const d = this.doors.get(`${x},${y}`);
    return !!d && !d.open;
  }

  precomputeTorchLight() {
    for (const t of this.torches) {
      t.light.clear();
      const ox = Math.floor(t.lx), oy = Math.floor(t.ly);
      const r = Math.ceil(LIGHT_TORCH);
      for (let y = oy - r; y <= oy + r; y++) {
        for (let x = ox - r; x <= ox + r; x++) {
          const d = Math.hypot(x + 0.5 - t.lx, y + 0.5 - t.ly);
          if (d > LIGHT_TORCH || !this.tileIndex.has(`${x},${y}`)) continue;
          if (!this.losClear(ox, oy, x, y) && !(x === t.x && y === t.y)) continue;
          t.light.set(`${x},${y}`, Math.pow(1 - d / LIGHT_TORCH, 0.9));
        }
      }
    }
  }

  lightAt(x: number, y: number, flick: number[]): number {
    const key = `${x},${y}`;
    let b = 0;
    const dp = Math.hypot(x + 0.5 - this.player.x, y + 0.5 - this.player.y);
    if (dp < LIGHT_PLAYER) b += Math.pow(1 - dp / LIGHT_PLAYER, 0.75) * 0.95;
    this.torches.forEach((t, i) => {
      const l = t.light.get(key);
      if (l) b += l * 0.85 * flick[i];
    });
    const dpo = Math.hypot(x + 0.5 - (this.portal.x + 0.5), y + 0.5 - (this.portal.y + 0.5));
    if (dpo < 3.5) b += (1 - dpo / 3.5) * 0.5;
    return Math.min(1, b);
  }

  updateLighting(time: number) {
    const flick = this.torches.map((t) => 0.86 + Math.sin(time / 130 + t.phase) * 0.07 + Math.sin(time / 47 + t.phase * 3) * 0.05);
    const px = Math.floor(this.player.x), py = Math.floor(this.player.y);
    // Solo se dibuja lo que cae dentro de la cámara (con margen): menos trabajo para la tarjeta gráfica
    const view = this.cameras.main.worldView;
    const margin = 80;
    for (const tv of this.tiles) {
      const dist = Math.hypot(tv.x - px, tv.y - py);
      const seen = this.cineReveal > 0 || (dist <= SIGHT && this.losClear(px, py, tv.x, tv.y));
      const b = Math.max(this.cineReveal, this.lightAt(tv.x, tv.y, flick));
      if (seen && b > 0.08) tv.explored = true;
      tv.bright = seen ? b : 0;
      const c = iso(tv.x + 0.5, tv.y + 0.5);
      const onScreen = c.x > view.x - margin && c.x < view.right + margin && c.y > view.y - margin && c.y < view.bottom + margin + 40;
      if (!tv.explored || !onScreen) {
        for (const img of tv.imgs) img.setVisible(false);
        continue;
      }
      const v = Math.max(0.13, tv.bright);
      const pdx = tv.x + 0.5 - this.player.x, pdy = tv.y + 0.5 - this.player.y;
      const violet = Math.max(0, 1 - Math.hypot(tv.x - this.portal.x, tv.y - this.portal.y) / 3.5) * 0.4;
      const warm = Math.min(1, Math.max(0, tv.bright - Math.max(0, 1 - Math.hypot(pdx, pdy) / LIGHT_PLAYER)));
      const [zr, zg, zb] = this.zoneTint;
      const r = Math.min(255, Math.round((255 * v + 30 * violet) * zr));
      const g = Math.min(255, Math.round((236 - warm * 30) * v * zg));
      const bl = Math.min(255, Math.round(((215 - warm * 70) * v + 90 * violet) * zb));
      const tint = (r << 16) | (g << 8) | bl;
      for (const img of tv.imgs) {
        img.setTint(tint);
        let a = 1;
        // Muros delante del jugador se vuelven translúcidos para no taparlo
        if (tv.tall.has(img) && img.depth > this.player.sprite.depth) {
          const sx = img.x - this.player.sprite.x, sy = img.y - this.player.sprite.y;
          if (Math.abs(sx) < 30 && sy > 0 && sy < 44) a = 0.35;
        }
        img.setAlpha(a).setVisible(true);
      }
    }
    this.torches.forEach((t, i) => {
      const tv = this.tileIndex.get(`${t.x},${t.y}`);
      t.glow.setAlpha(tv?.explored ? 0.55 * flick[i] : 0);
      t.glow.setScale(0.9 + flick[i] * 0.2);
    });
    const ptv = this.tileIndex.get(`${this.portal.x},${this.portal.y}`);
    this.portal.glow.setAlpha(ptv?.explored ? 0.65 : 0);
    // Entidades móviles: visibles solo en casillas vistas e iluminadas
    const mobVis = (m: Mob) => {
      const tv = this.tileIndex.get(`${Math.floor(m.x)},${Math.floor(m.y)}`);
      const visible = !!tv && tv.bright > 0.18;
      const v = Math.max(0.35, tv?.bright ?? 0);
      const c = Math.round(255 * v);
      m.sprite.setVisible(visible).setTint((c << 16) | (c << 8) | c);
      m.shadow.setVisible(visible);
      m.marker?.setVisible(visible);
    };
    this.enemies.filter((e) => !e.dead).forEach(mobVis);
    if (this.rival && !this.rival.gone) {
      mobVis(this.rival);
      // El triángulo se ve aunque el errante esté en penumbra, si está cerca (aviso justo)
      const near = Math.hypot(this.rival.x - this.player.x, this.rival.y - this.player.y) < 9;
      this.rival.marker?.setVisible(this.rival.sprite.visible || near);
      if (this.kaelGlow) { const q = iso(this.rival.x, this.rival.y); this.kaelGlow.setPosition(q.x, q.y - 10).setVisible(this.rival.sprite.visible || near); }
    }
    if (this.merc && !this.merc.gone) mobVis(this.merc);
    if (this.captive) { mobVis(this.captive); this.captive.chains.setVisible(this.captive.sprite.visible); }
    for (const [, img] of this.bagSprites) {
      const g = fromIso(img.x, img.y);
      const tv = this.tileIndex.get(`${Math.floor(g.x)},${Math.floor(g.y)}`);
      img.setVisible(!!tv?.explored);
    }
  }

  // ── Movimiento y colisiones ──

  walkableTile(x: number, y: number): boolean {
    if (this.dungeon.tiles[y]?.[x] !== 'floor') return false;
    if (this.pillars.has(`${x},${y}`)) return false;
    const d = this.doors.get(`${x},${y}`);
    return !d || d.open;
  }

  canStand(x: number, y: number, r: number) {
    return (
      this.walkableTile(Math.floor(x - r), Math.floor(y - r)) &&
      this.walkableTile(Math.floor(x + r), Math.floor(y - r)) &&
      this.walkableTile(Math.floor(x - r), Math.floor(y + r)) &&
      this.walkableTile(Math.floor(x + r), Math.floor(y + r))
    );
  }

  moveMob(m: Mob, dx: number, dy: number, r = PLAYER_RADIUS) {
    let moved = false;
    if (dx && this.canStand(m.x + dx, m.y, r)) { m.x += dx; moved = true; }
    if (dy && this.canStand(m.x, m.y + dy, r)) { m.y += dy; moved = true; }
    m.moving = moved;
    return moved;
  }

  placeMob(m: Mob, dt: number) {
    const p = iso(m.x, m.y);
    m.sprite.setPosition(p.x, p.y - m.lift);
    m.shadow.setPosition(p.x, p.y);
    m.sprite.setDepth(depthAt(m.x, m.y) + 2);
    m.shadow.setDepth(depthAt(m.x, m.y) + 1);
    m.marker?.setPosition(p.x, p.y - 26 * m.scale - m.lift).setDepth(99980);
    const flyer = m.tex in FLYER_SPECS;
    if (m.moving || flyer) m.animT += dt * (flyer ? 9 : 7);
    else m.animT = 0;
    const f = Math.floor(m.animT) % m.frames;
    m.sprite.setTexture(`${m.tex}${flyer ? f : m.moving ? f : 0}`);
  }

  paused() {
    const s = getState();
    return !!s.combat || !!s.modal || s.suspended || s.screen !== 'dungeon' || (!s.profile?.tutorialSeen.dungeon && !s.tutorial);
  }

  update(time: number, deltaMs: number) {
    const dt = Math.min(0.1, deltaMs / 1000);
    const paused = this.paused();

    if (!paused) {
      // Tutorial: quieto hasta cumplir el paso (inventario, curarse)
      if (tutorialFrozen()) { this.path = []; this.player.moving = false; } else this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.updateRival(dt);
      this.updateMerc(dt);
      this.updateTraps(dt);
      this.updateChannel(dt);
      this.updateInteractionPrompt();
      if (this.grace > 0) this.grace -= dt;
    }
    this.placeMob(this.player, dt);
    this.updateTutorialArrow(time);
    this.enemies.filter((e) => !e.dead).forEach((e) => this.placeMob(e, dt));
    if (this.rival && !this.rival.gone) this.placeMob(this.rival, dt);
    if (this.merc && !this.merc.gone) this.placeMob(this.merc, dt);
    if (this.captive) this.placeMob(this.captive, dt);

    this.frameTimer += dt;
    if (this.frameTimer > 0.12) {
      this.frameTimer = 0;
      this.portalFrame = (this.portalFrame + 1) % 6;
      this.portal.img.setTexture(`portal${this.portalFrame}`);
      this.torches.forEach((t, i) => t.img.setTexture(`torch${(this.portalFrame + i) % 3}`));
    }
    this.lightTimer += deltaMs;
    if (this.lightTimer > 90) {
      this.lightTimer = 0;
      this.updateLighting(time);
    }
  }

  updatePlayer(dt: number) {
    const k = this.keys;
    let sx = 0, sy = 0;
    if (k.W.isDown || k.UP.isDown) sy -= 1;
    if (k.S.isDown || k.DOWN.isDown) sy += 1;
    if (k.A.isDown || k.LEFT.isDown) sx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) sx += 1;
    // Joystick táctil: dirección analógica (empujar poco = andar más despacio)
    let mag = 1;
    if (!sx && !sy && touchStick.active && Math.hypot(touchStick.x, touchStick.y) > TOUCH_CFG.stickDeadZone) {
      sx = touchStick.x; sy = touchStick.y; mag = Math.min(1, Math.hypot(sx, sy));
    }
    const p = this.player;
    // Piernas rotas o inutilizadas: el paso se acorta (nunca por debajo del 40 %)
    const body = getState().expedition?.body;
    const SPEED = PLAYER_SPEED * (body ? mobilityMult(body) : 1);
    if (sx || sy) {
      this.path = [];
      this.cancelChannel();
      const len = Math.hypot(sx, sy);
      const vx = (sx / len) * mag * SPEED * dt, vy = (sy / len) * mag * SPEED * dt;
      const g = fromIso(vx, vy);
      this.moveMob(p, g.x, g.y);
      if (sx) p.sprite.setFlipX(sx < 0);
    } else if (this.path.length) {
      const [tx, ty] = this.path[0];
      const gx = tx + 0.5 - p.x, gy = ty + 0.5 - p.y;
      const d = Math.hypot(gx, gy);
      const step = (SPEED / 18) * dt;
      if (d < step + 0.02) {
        p.x = tx + 0.5; p.y = ty + 0.5;
        this.path.shift();
        p.moving = this.path.length > 0;
      } else {
        this.moveMob(p, (gx / d) * step, (gy / d) * step);
        p.moving = true;
        const screenDx = (gx - gy);
        if (Math.abs(screenDx) > 0.05) p.sprite.setFlipX(screenDx < 0);
      }
    } else {
      p.moving = false;
    }
    if (p.moving) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) { sfx('step'); this.stepTimer = 0.32; }
    }
    const tx = Math.floor(p.x), ty = Math.floor(p.y);
    const key = `${tx},${ty}`;
    if (key !== this.lastTile) {
      this.lastTile = key;
      const room = roomAt(this.dungeon.def, tx, ty);
      actions.setHud({ playerTile: [tx, ty], room: room?.name ?? 'Pasadizo' });
    }
  }

  updateEnemies(dt: number) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = p.x - e.x, dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);
      const tv = this.tileIndex.get(`${Math.floor(e.x)},${Math.floor(e.y)}`);
      const sees = dist < e.aggro && (tv?.bright ?? 0) > 0.1 && this.losClear(Math.floor(e.x), Math.floor(e.y), Math.floor(p.x), Math.floor(p.y));
      const fromHome = Math.hypot(e.x - e.homeX, e.y - e.homeY);
      if (sees && this.grace <= 0 && fromHome < 7) {
        const sp = e.speed * 1.25 * dt;
        this.moveMob(e, (dx / dist) * sp, (dy / dist) * sp, 0.22);
        if (Math.abs(dx - dy) > 0.05) e.sprite.setFlipX(dx - dy < 0);
        if (dist < 0.75) {
          this.path = [];
          const mate = this.joiningEnemy(e);
          actions.startCombat('pve', e.id, e.enemyId, mate ? { entityId: mate.id, enemyId: mate.enemyId } : undefined);
          return;
        }
      } else {
        // Deambular cerca de su posición inicial
        e.wait -= dt;
        if (!e.target && e.wait <= 0) {
          const ang = Math.random() * Math.PI * 2, r = Math.random() * (e.boss ? 1 : 2.2);
          e.target = [e.homeX + Math.cos(ang) * r, e.homeY + Math.sin(ang) * r];
          if (fromHome > 2.5) e.target = [e.homeX, e.homeY];
        }
        if (e.target) {
          const tx = e.target[0] - e.x, ty = e.target[1] - e.y;
          const d = Math.hypot(tx, ty);
          if (d < 0.1) {
            e.target = null;
            e.wait = 1 + Math.random() * 2.5;
            e.moving = false;
          } else {
            const sp = e.speed * 0.55 * dt;
            if (!this.moveMob(e, (tx / d) * sp, (ty / d) * sp, 0.22)) { e.target = null; e.wait = 0.8; }
            if (Math.abs(tx - ty) > 0.05) e.sprite.setFlipX(tx - ty < 0);
          }
        } else e.moving = false;
      }
    }
  }

  /** Radio (casillas) en el que un segundo perseguidor entra en el mismo combate. */
  static JOIN_RADIUS = 4;

  /**
   * Segundo enemigo de un combate: uno vivo que ya te persigue (te ve, está cerca de su guarida) dentro del radio.
   * Entre varios, el más cercano y, si empatan, el de id menor. Nunca un jefe ni un tercero: máximo dos por bando.
   */
  joiningEnemy(first: { id: string; boss?: boolean }) {
    if (first.boss) return null;
    const p = this.player;
    let best: (typeof this.enemies)[number] | null = null;
    let bestD = Infinity;
    for (const o of this.enemies) {
      if (o.dead || o.id === first.id || o.boss) continue;
      const d = Math.hypot(p.x - o.x, p.y - o.y);
      if (d > DungeonScene.JOIN_RADIUS || d > o.aggro) continue;
      if (Math.hypot(o.x - o.homeX, o.y - o.homeY) >= 7) continue;
      const tv = this.tileIndex.get(`${Math.floor(o.x)},${Math.floor(o.y)}`);
      if ((tv?.bright ?? 0) <= 0.1 || !this.losClear(Math.floor(o.x), Math.floor(o.y), Math.floor(p.x), Math.floor(p.y))) continue;
      if (d < bestD - 1e-6 || (Math.abs(d - bestD) <= 1e-6 && best && o.id < best.id)) { best = o; bestD = d; }
    }
    return best;
  }

  updateRival(dt: number) {
    const r = this.rival;
    if (!r || r.gone) return;
    const st = getState().rival;
    const p = this.player;
    const dx = p.x - r.x, dy = p.y - r.y;
    const dist = Math.hypot(dx, dy);
    const follow = (tx: number, ty: number, speed: number, stopAt: number) => {
      const gx = tx - r.x, gy = ty - r.y;
      const d = Math.hypot(gx, gy);
      if (d <= stopAt) { r.moving = false; return d; }
      const path = findPath(this.dungeon.def.width, this.dungeon.def.height, (x, y) => !this.walkableTile(x, y), [Math.floor(r.x), Math.floor(r.y)], [Math.floor(tx), Math.floor(ty)], 1500);
      let wx = tx, wy = ty;
      if (path && path.length > 1) { wx = path[0][0] + 0.5; wy = path[0][1] + 0.5; }
      const wdx = wx - r.x, wdy = wy - r.y;
      const wd = Math.hypot(wdx, wdy) || 1;
      this.moveMob(r, (wdx / wd) * speed * dt, (wdy / wd) * speed * dt, 0.22);
      if (Math.abs(wdx - wdy) > 0.05) r.sprite.setFlipX(wdx - wdy < 0);
      return d;
    };
    // Kael: aviso especial la primera vez que te acercas
    if (st.who === 'kael' && !this.kaelAnnounced && dist < 7 && st.disposition === 'neutral') {
      this.kaelAnnounced = true;
      actions.announceKael();
    }
    if (st.disposition === 'fleeing') {
      // Te ha robado y corre al portal: si lo alcanzas, combate; si llega, se lo lleva
      const d = follow(this.portal.x + 0.5, this.portal.y + 0.5, 3.1, 0.4);
      if (dist < 0.8) { this.path = []; actions.startCombat('betrayal-by-rival', null); return; }
      if (d <= 0.45 && !r.leaving) {
        r.leaving = true;
        actions.rivalEscaped();
        this.tweens.add({ targets: [r.sprite, r.shadow, r.marker, this.kaelGlow].filter(Boolean), alpha: 0, duration: 800, onComplete: () => this.removeRival() });
      }
      return;
    }
    if (st.disposition === 'allied') {
      follow(p.x, p.y, 3.4, 1.3);
      this.betrayTimer -= dt;
      if (this.betrayTimer <= 0) {
        this.betrayTimer = 1.5;
        const nearPortal = Math.hypot(p.x - this.portal.x - 0.5, p.y - this.portal.y - 0.5) < 5;
        actions.checkBetrayal(nearPortal);
      }
    } else if (st.disposition === 'hostile') {
      if (this.grace > 0) { r.moving = false; return; }
      // Un errante hostil desde el principio espera hasta verte
      if (!st.betrayed && dist > 6 && !this.rivalAggro) { r.moving = false; return; }
      this.rivalAggro = true;
      follow(p.x, p.y, 2.6, 0.7);
      if (dist < 0.8) {
        this.path = [];
        actions.startCombat('hostile', null);
      }
    } else if (st.disposition === 'departed') {
      const d = follow(this.portal.x + 0.5, this.portal.y + 0.5, 2.2, 0.4);
      if (d <= 0.45 && !r.leaving) {
        r.leaving = true;
        this.tweens.add({ targets: [r.sprite, r.shadow, r.marker, this.kaelGlow].filter(Boolean), alpha: 0, duration: 800, onComplete: () => this.removeRival() });
      }
    } else {
      r.moving = false;
      if (dist < 4 && Math.abs(dx - dy) > 0.05) r.sprite.setFlipX(dx - dy < 0);
    }
  }

  /** El mercenario te sigue un paso por detrás (sin pegarse a Kael). */
  updateMerc(dt: number) {
    const m = this.merc;
    if (!m || m.gone) return;
    const p = this.player;
    const d = Math.hypot(p.x - m.x, p.y - m.y);
    if (d > 12) { m.x = p.x; m.y = p.y; return; }
    if (d <= 1.1) { m.moving = false; return; }
    const path = findPath(this.dungeon.def.width, this.dungeon.def.height, (x, y) => !this.walkableTile(x, y), [Math.floor(m.x), Math.floor(m.y)], [Math.floor(p.x), Math.floor(p.y)], 1500);
    let wx = p.x, wy = p.y;
    if (path && path.length > 1) { wx = path[0][0] + 0.5; wy = path[0][1] + 0.5; }
    const wdx = wx - m.x, wdy = wy - m.y;
    const wd = Math.hypot(wdx, wdy) || 1;
    const speed = d > 3 ? 4.2 : 3.4;
    this.moveMob(m, (wdx / wd) * speed * dt, (wdy / wd) * speed * dt, 0.22);
    if (Math.abs(wdx - wdy) > 0.05) m.sprite.setFlipX(wdx - wdy < 0);
  }

  /** Sincroniza el mercenario con el estado: aparece al liberarlo y desaparece si cae. */
  refreshMerc() {
    const st = getState().merc;
    if (st?.alive && (!this.merc || this.merc.gone)) {
      if (this.captive && this.captive.mercId === st.id) {
        const c = this.captive;
        this.captive = null;
        this.tweens.add({ targets: c.chains, alpha: 0, duration: 500, onComplete: () => c.chains.destroy() });
        c.marker?.setTexture('marker_ally');
        this.merc = { ...c, gone: false };
        this.cameras.main.flash(180, 255, 230, 160);
      } else if (this.player) {
        const m = this.makeMob(getMerc(st.id).sprite, 4, this.player.x, this.player.y);
        m.marker = this.add.image(0, 0, 'marker_ally').setDepth(99980);
        this.merc = { ...m, gone: false };
      }
    } else if (!st?.alive && this.merc && !this.merc.gone) {
      const m = this.merc;
      m.gone = true;
      this.tweens.add({ targets: [m.sprite, m.shadow, m.marker], alpha: 0, angle: 90, duration: 600, onComplete: () => { m.sprite.destroy(); m.shadow.destroy(); m.marker?.destroy(); } });
    }
  }

  removeRival() {
    if (!this.rival) return;
    this.rival.gone = true;
    this.rival.sprite.destroy();
    this.rival.shadow.destroy();
    this.rival.marker?.destroy();
    this.kaelGlow?.destroy();
    this.kaelGlow = null;
  }

  refreshRival() {
    const r = this.rival;
    if (!r || r.gone) return;
    const d = getState().rival.disposition;
    if (d === 'dead') {
      this.tweens.add({ targets: [r.sprite, r.shadow, r.marker], alpha: 0, angle: 90, duration: 600, onComplete: () => this.removeRival() });
      r.gone = true;
      return;
    }
    const rs = getState().rival;
    r.marker?.setTexture(d === 'hostile' || d === 'fleeing' ? 'risk_hostile' : `risk_${rs.risk}`);
  }

  refreshBags() {
    const bags = getState().bags;
    for (const [id, img] of this.bagSprites) {
      if (!bags[id]) { img.destroy(); this.bagSprites.delete(id); }
    }
    for (const b of Object.values(bags)) {
      if (this.bagSprites.has(b.id)) continue;
      const c = iso(b.x + 0.5, b.y + 0.5);
      const img = this.add.image(c.x, c.y + 3, 'bag').setOrigin(0.5, 0.9).setDepth(depthAt(b.x + 0.5, b.y + 0.5));
      this.bagSprites.set(b.id, img);
    }
  }

  updateTraps(dt: number) {
    const p = this.player;
    for (const t of this.traps) {
      if (t.cooldown > 0) t.cooldown -= dt;
      if (Math.floor(p.x) === t.x && Math.floor(p.y) === t.y && t.cooldown <= 0) {
        t.cooldown = 2.5;
        t.img.setTexture('trap_on');
        this.time.delayedCall(700, () => t.img.setTexture('trap_off'));
        this.cameras.main.shake(140, 0.004);
        this.player.sprite.setTintFill(0xff4040);
        this.time.delayedCall(120, () => this.player.sprite.clearTint());
        actions.trapHit(10);
      }
    }
  }

  // ── Interacción ──

  /** Todo lo que se puede usar desde la posición actual, ordenado de más cerca a más lejos. */
  interactables(): Interactable[] {
    const p = this.player;
    const d = (x: number, y: number) => Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y);
    const st = getState();
    const out: (Interactable & { dist: number })[] = [];
    if (this.rival && !this.rival.gone && ['neutral', 'allied'].includes(st.rival.disposition)) {
      const dist = Math.hypot(this.rival.x - p.x, this.rival.y - p.y);
      if (dist < 1.6) out.push({ dist, label: st.rival.disposition === 'allied' ? `Hablar con tu aliado ${getWanderer(st.rival.who).name.split(' ')[0]}` : `Hablar con ${getWanderer(st.rival.who).name}`, run: () => actions.interactRival() });
    }
    if (this.captive && !st.merc?.alive) {
      const dist = Math.hypot(this.captive.x - p.x, this.captive.y - p.y);
      const id = this.captive.mercId;
      if (dist < 1.6) out.push({ dist, label: `Liberar al prisionero: ${getMerc(id).name}`, run: () => actions.interactCaptive(id) });
    }
    for (const v of this.veins) {
      if (st.mined[v.id] && !v.spent) { v.spent = true; v.img.setTexture('vein_spent'); }
      if (v.spent || d(v.x, v.y) >= 1.35) continue;
      const pick = st.expedition ? bestPick(st.expedition.backpack) : null;
      const name = VEINS[v.vein].name;
      out.push({
        dist: d(v.x, v.y),
        label: pick ? `Picar: ${name}` : `${name} (necesitas un pico)`,
        run: () => {
          if (!pick) return actions.mineVein(v.id, v.vein);
          const secs = getItem(pick.stack.itemId).mineTime ?? 2.5;
          this.startChannel({ label: `Picando la ${name.toLowerCase()}… no te muevas`, seconds: secs, done: () => { actions.mineVein(v.id, v.vein); this.cameras.main.shake(90, 0.003); } });
        },
      });
    }
    for (const b of Object.values(st.bags)) if (d(b.x, b.y) < 1.1) out.push({ dist: d(b.x, b.y), label: `Registrar: ${b.label}`, run: () => actions.openBag(b.id) });
    for (const c of this.chests) {
      const type = chestType(c.table);
      if (st.chests[c.id] && !c.opened) { c.opened = true; c.img.setTexture(`chest_${type.look}_open`); }
      if (d(c.x, c.y) < 1.35) {
        const keyName = type.key ? getItem(type.key).name.toLowerCase() : null;
        out.push({
          dist: d(c.x, c.y),
          label: c.opened ? `Revisar: ${type.name}` : keyName ? `Abrir: ${type.name} (${keyName})` : `Abrir: ${type.name}`,
          run: () => actions.openChest(c.id, c.table),
        });
      }
    }
    for (const door of this.doors.values()) if (!door.open && d(door.x, door.y) < 1.45) out.push({ dist: d(door.x, door.y), label: 'Abrir la puerta', run: () => this.openDoor(door) });
    if (this.channel < 0 && d(this.portal.x, this.portal.y) < 1.3) out.push({ dist: d(this.portal.x, this.portal.y), label: 'Activar el portal y extraer', run: () => this.startChannel() });
    return out.sort((a, b) => a.dist - b.dist).map(({ label, run }) => ({ label, run }));
  }

  updateInteractionPrompt() {
    const list = this.channel >= 0 ? [] : this.interactables();
    actions.setHud({ prompt: list.length === 0 ? null : list.length === 1 ? list[0].label : `Elegir acción (${list.length} opciones)` });
  }

  /** Llamado desde la interfaz al pulsar E: si hay varias opciones, abre un menú para elegir. */
  interact() {
    if (this.paused()) return;
    const list = this.interactables();
    if (list.length === 1) list[0].run();
    else if (list.length > 1) {
      this.pendingChoices = list;
      actions.openModal({ type: 'interact', options: list.map((i) => i.label) });
    }
  }

  /** El jugador ha elegido una opción del menú de interacción. */
  chooseInteraction(index: number) {
    const choice = this.pendingChoices[index];
    this.pendingChoices = [];
    actions.closeModal();
    choice?.run();
  }

  openDoor(door: { x: number; y: number; img: Phaser.GameObjects.Image; open: boolean }) {
    door.open = true;
    sfx('door');
    this.tweens.add({ targets: door.img, alpha: 0, scaleY: 0.2, duration: 350, onComplete: () => door.img.setVisible(false) });
    const vis = this.tileIndex.get(`${door.x},${door.y}`);
    if (vis) {
      vis.imgs = vis.imgs.filter((i) => i !== door.img);
      // Bajo la puerta hay suelo
      const c = iso(door.x + 0.5, door.y + 0.5);
      vis.imgs.unshift(this.add.image(c.x, c.y, 'floor1').setDepth(-10));
    }
    this.precomputeTorchLight();
  }

  startChannel(job: DungeonScene['job'] = null) {
    this.channel = 0;
    this.job = job;
    this.path = [];
    actions.setHud({ channelLabel: job?.label ?? 'Canalizando el portal… no te muevas' });
    sfx(job ? 'click' : 'portal');
  }

  cancelChannel() {
    if (this.channel >= 0) {
      this.channel = -1;
      this.job = null;
      actions.setHud({ channel: 0 });
    }
  }

  updateChannel(dt: number) {
    if (this.channel < 0) return;
    if (this.player.moving) return this.cancelChannel();
    this.channel += dt / (this.job?.seconds ?? 3);
    actions.setHud({ channel: Math.min(1, this.channel) });
    if (this.channel >= 1 && this.job) {
      const job = this.job;
      this.channel = -1;
      this.job = null;
      actions.setHud({ channel: 0 });
      job.done();
      return;
    }
    if (this.channel >= 1) {
      this.channel = -1;
      this.cameras.main.flash(400, 180, 110, 255);
      actions.requestExtract();
    }
  }

  onCombatEnded(p: { entityId: string | null; entityIds: string[]; killed: string[]; outcome: string; kind: string }) {
    for (const id of p.entityIds) {
      const e = this.enemies.find((x) => x.id === id);
      if (!e || e.dead) continue;
      if (p.outcome === 'victory' || p.killed.includes(id)) {
        e.dead = true;
        this.tweens.add({ targets: [e.sprite, e.shadow], alpha: 0, duration: 500, onComplete: () => { e.sprite.destroy(); e.shadow.destroy(); } });
      } else if (p.outcome === 'fled') {
        e.x = e.homeX; e.y = e.homeY; e.target = null;
      }
    }
    // Margen para recuperar el control antes de otro contacto (un tercer enemigo cercano sigue en el mapa)
    if (p.outcome === 'fled') this.grace = 2.5;
    else if (p.outcome === 'victory') this.grace = Math.max(this.grace, 2);
    this.refreshRival();
    this.refreshBags();
  }

  refreshHeroLook() {
    const st = getState();
    if (!st.expedition || !st.profile || !this.player) return;
    const sig = lookSignature(st.expedition.equipment) + '|' + (wornSkin(st.profile) ?? '');
    if (sig === this.heroLook) return;
    this.heroLook = sig;
    this.heroVersion += 1;
    const ch = st.profile.character;
    this.player.tex = registerHeroTextures(this, this.heroVersion, { classId: ch.classId, appearance: ch.appearance, equipment: st.expedition.equipment, skin: wornSkin(st.profile) });
    this.player.sprite.setTexture(`${this.player.tex}0`);
  }

  /** Tinte de la luz según la zona (Mazmorra neutra, Cripta fría, Infierno rojiza). */
  zoneTint: [number, number, number] = [1, 1, 1];
  kaelGlow: Phaser.GameObjects.Image | null = null;
  tutArrow: Phaser.GameObjects.Image | null = null;
  kaelAnnounced = false;
  rivalAggro = false;

  /** Solo para el tráiler: revela e ilumina todo el mapa (0 = desactivado). */
  cineReveal = 0;

  /** Solo para pruebas automáticas. */
  /** Tutorial: una flecha dorada flota sobre lo que hay que hacer ahora. */
  updateTutorialArrow(time: number) {
    const t = getState().tutorial;
    const target = t ? TUTORIAL_STEPS[t.step]?.target : null;
    if (!target || !('tile' in target)) { this.tutArrow?.setVisible(false); return; }
    if (!this.tutArrow) this.tutArrow = this.add.image(0, 0, 'tut_arrow').setDepth(99995);
    const [x, y] = target.tile;
    const q = iso(x + 0.5, y + 0.5);
    this.tutArrow.setVisible(true).setPosition(q.x, q.y - 34 + Math.sin(time / 220) * 3);
  }

  debugTeleport(x: number, y: number) {
    this.player.x = x + 0.5;
    this.player.y = y + 0.5;
    this.path = [];
  }
}
