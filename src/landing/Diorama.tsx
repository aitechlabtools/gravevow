import { useEffect, useRef } from 'react';
import * as Art from '../shared/art';
import { SHOWCASE_GEAR } from '../shared/gearLook';

// Diorama isométrico animado para la cabecera de la web, dibujado con el mismo
// generador de pixel art que usa el juego.
const W = 11;
const H = 9;
type Thing = { gx: number; gy: number; draw: (ctx: CanvasRenderingContext2D, sx: number, sy: number, f: number) => void };

/** `fill`: color del fondo del lienzo; `ax`/`ay`: dónde cae el centro de la sala (fracción del ancho y del alto).
 *  Por defecto, como en la landing. El menú del juego lo usa centrado y con el fondo negro de la página. */
export function Diorama({ className = '', fill = '#07060a', ax, ay = 0.4 }: { className?: string; fill?: string; ax?: number; ay?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const floors = [0, 1, 2, 3].map(Art.drawFloor);
    const walls = [Art.drawWall(0), Art.drawWall(1)];
    const pillar = Art.drawPillar();
    const torches = [0, 1, 2].map(Art.drawTorch);
    const portal = [0, 1, 2, 3, 4, 5].map(Art.drawPortal);
    const heroF = [0, 1, 2, 3].map((f) => Art.drawHumanoid(Art.heroSpec('warrior', { cloak: 0, skin: 0 }, SHOWCASE_GEAR.warrior), f));
    const rival = Art.drawHumanoid(Art.MONSTER_SPECS.rival, 0);
    const mage = Art.drawHumanoid(Art.heroSpec('mage', { cloak: 3, skin: 1 }, SHOWCASE_GEAR.mage), 0);
    const skel = Art.drawHumanoid(Art.MONSTER_SPECS.skeleton, 0);
    const chest = Art.drawChest('boss', true);
    const shadow = Art.drawShadow();
    const bones = Art.drawDecor('bones');
    const skull = Art.drawDecor('skull');
    const bat = [0, 1, 2].map((f) => Art.drawBat(f));

    // Escena (lógica del mismo sistema de coordenadas que el juego)
    const isWall = (x: number, y: number) => x === 0 || y === 0;
    const iso = (gx: number, gy: number) => ({ x: (gx - gy) * 16, y: (gx + gy) * 8 });
    const mirror = (c: HTMLCanvasElement) => {
      const m = document.createElement('canvas');
      m.width = c.width; m.height = c.height;
      const g = m.getContext('2d')!;
      g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0);
      return m;
    };
    const rivalL = mirror(rival);
    const torchSpots = [{ x: 3, y: 0, face: 'south' as const }, { x: 8, y: 0, face: 'south' as const }, { x: 0, y: 4, face: 'east' as const }];

    const things: Thing[] = [
      { gx: 2.5, gy: 6.5, draw: (c, sx, sy) => c.drawImage(pillar, sx - 16, sy - 37) },
      { gx: 8.5, gy: 2.5, draw: (c, sx, sy) => c.drawImage(pillar, sx - 16, sy - 37) },
      { gx: 3.6, gy: 2.2, draw: (c, sx, sy) => c.drawImage(chest, sx - 10, sy - 15) },
      { gx: 8.2, gy: 6.2, draw: (c, sx, sy, f) => c.drawImage(portal[Math.floor(f / 2) % 6], sx - 14, sy - 36 + Math.round(Math.sin(f / 6) * 1.5)) },
      { gx: 5.4, gy: 4.6, draw: (c, sx, sy, f) => { c.drawImage(shadow, sx - 7, sy - 3); c.drawImage(heroF[Math.floor(f / 4) % 2 === 0 ? 0 : 2], sx - 10, sy - 24); } },
      { gx: 6.6, gy: 3.8, draw: (c, sx, sy) => { c.drawImage(shadow, sx - 7, sy - 3); c.drawImage(rivalL, sx - 10, sy - 24); } },
      { gx: 4.3, gy: 5.8, draw: (c, sx, sy) => { c.drawImage(shadow, sx - 7, sy - 3); c.drawImage(mage, sx - 10, sy - 24); } },
      { gx: 1.6, gy: 3.4, draw: (c, sx, sy) => { c.drawImage(shadow, sx - 7, sy - 3); c.drawImage(skel, sx - 10, sy - 24); } },
      { gx: 6.5, gy: 1.6, draw: (c, sx, sy, f) => c.drawImage(bat[f % 3], sx - 11, sy - 34 + Math.round(Math.sin(f / 3) * 3)) },
    ];

    let scale = 3;
    let ox = 0, oy = 0;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      scale = Math.max(2, Math.min(5, Math.floor(Math.min(r.width / 300, r.height / 190))));
      cv.width = Math.floor(r.width / scale);
      cv.height = Math.floor(r.height / scale);
      const centre = iso(W / 2, H / 2);
      ox = Math.round(cv.width * (ax ?? (cv.width > cv.height * 1.2 ? 0.66 : 0.5)) - centre.x);
      oy = Math.round(cv.height * ay - centre.y);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener('resize', resize);

    const light = document.createElement('canvas');
    const lctx = light.getContext('2d')!;

    let frame = 0;
    let raf = 0;
    let last = 0;
    const render = (t: number) => {
      raf = requestAnimationFrame(render);
      if (t - last < 83) return;
      last = t;
      frame++;
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.save();
      ctx.translate(ox, oy);
      // Suelo
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!isWall(x, y)) {
        const p = iso(x + 0.5, y + 0.5);
        ctx.drawImage(floors[(x * 7 + y * 13) % 4], p.x - 16, p.y - 8);
      }
      ctx.drawImage(bones, iso(6.5, 7).x - 8, iso(6.5, 7).y - 10);
      ctx.drawImage(skull, iso(2, 7.8).x - 8, iso(2, 7.8).y - 10);
      // Muros y objetos ordenados por profundidad
      const drawables: { d: number; fn: () => void }[] = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isWall(x, y)) {
        const b = iso(x + 1, y + 1);
        const img = walls[(x * 3 + y) % 5 === 0 ? 1 : 0];
        drawables.push({ d: x + y + 1, fn: () => ctx.drawImage(img, b.x - 16, b.y - img.height) });
      }
      for (const tr of torchSpots) {
        const p = tr.face === 'south' ? iso(tr.x + 0.5, tr.y + 1) : iso(tr.x + 1, tr.y + 0.5);
        drawables.push({ d: tr.x + tr.y + 1.01, fn: () => ctx.drawImage(torches[(frame + tr.x) % 3], p.x - 4, p.y - 22) });
      }
      for (const th of things) {
        const p = iso(th.gx, th.gy);
        drawables.push({ d: th.gx + th.gy, fn: () => th.draw(ctx, p.x, p.y, frame) });
      }
      drawables.sort((a, b) => a.d - b.d).forEach((d) => d.fn());
      ctx.restore();

      // Luz: oscuridad con huecos alrededor de antorchas, portal y héroe
      light.width = cv.width;
      light.height = cv.height;
      lctx.fillStyle = 'rgba(4,3,8,0.86)';
      lctx.fillRect(0, 0, light.width, light.height);
      lctx.globalCompositeOperation = 'destination-out';
      const hole = (gx: number, gy: number, r: number, a: number) => {
        const p = iso(gx, gy);
        const x = p.x + ox, y = p.y + oy;
        const g = lctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        lctx.fillStyle = g;
        lctx.beginPath(); lctx.arc(x, y, r, 0, Math.PI * 2); lctx.fill();
      };
      const fl = (k: number) => (reduce ? 1 : 0.92 + Math.sin(frame / 2.3 + k) * 0.05 + Math.sin(frame / 0.9 + k * 2) * 0.03);
      hole(3.5, 1.4, 70 * fl(1), 0.95);
      hole(8.5, 1.4, 70 * fl(2), 0.95);
      hole(1.4, 4.5, 60 * fl(3), 0.9);
      hole(5.6, 4.5, 64, 0.85);
      hole(8.2, 6.2, 56, 0.9);
      lctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(light, 0, 0);
      // Tintes de color
      ctx.globalCompositeOperation = 'lighter';
      const tint = (gx: number, gy: number, r: number, col: string) => {
        const p = iso(gx, gy);
        const x = p.x + ox, y = p.y + oy;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      };
      tint(3.5, 1.2, 40 * fl(1), 'rgba(120,60,10,0.35)');
      tint(8.5, 1.2, 40 * fl(2), 'rgba(120,60,10,0.35)');
      tint(1.2, 4.5, 36 * fl(3), 'rgba(120,60,10,0.3)');
      tint(8.2, 5.6, 46, 'rgba(90,40,150,0.45)');
      ctx.globalCompositeOperation = 'source-over';
      if (reduce) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [fill, ax, ay]);

  return <canvas ref={ref} className={`pixelated w-full h-full ${className}`} aria-label="Un guerrero y un aventurero encapuchado se miran en una cripta iluminada por antorchas, junto a un portal violeta y un cofre abierto." role="img" />;
}
