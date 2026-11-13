import type { ReactElement } from 'react';

// Enlaces de comunidad (Ko-fi y Discord), comunes a la landing, las páginas legales y el juego.
// Son enlaces normales a webs externas: esta web no carga nada de Ko-fi ni de Discord.
// Siempre se abren en una pestaña nueva para no sacar al jugador de su partida.

export const SUPPORT_URL = 'https://ko-fi.com/gravevow';
export const DISCORD_URL = 'https://discord.gg/yw2R4nwJQa';

export const SUPPORT_HINT = 'Apoya el desarrollo en Ko-fi';
export const DISCORD_HINT = 'Únete a la comunidad en Discord';

/** Atributos comunes de los enlaces externos. */
export const EXTERNAL = { target: '_blank', rel: 'noopener noreferrer' } as const;

// Iconos provisionales en pixel art, dibujados con rectángulos (se escalan sin difuminar).
// El arte definitivo está en la lista de assets (docs/plan-subzonas.md, sección 9).
const HEART = [
  '.XX...XX.',
  'XXXX.XXXX',
  'XXXXXXXXX',
  'XXXXXXXXX',
  '.XXXXXXX.',
  '..XXXXX..',
  '...XXX...',
  '....X....',
];
const DISCORD = [
  '..XX....XX..',
  '.XXXXXXXXXX.',
  'XXXXXXXXXXXX',
  'XXX..XX..XXX',
  'XXX..XX..XXX',
  'XXXXXXXXXXXX',
  'XXXXXXXXXXXX',
  '.XXX....XXX.',
  '..X......X..',
];

function PixelIcon({ rows, size, color, label }: { rows: string[]; size: number; color: string; label?: string }) {
  const w = rows[0].length;
  const h = rows.length;
  const rects: ReactElement[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < w) {
      if (row[x] !== 'X') { x++; continue; }
      let e = x;
      while (e < w && row[e] === 'X') e++;
      rects.push(<rect key={`${y}-${x}`} x={x} y={y} width={e - x} height={1} />);
      x = e;
    }
  });
  return (
    <svg width={size} height={Math.round((size * h) / w)} viewBox={`0 0 ${w} ${h}`} fill={color} shapeRendering="crispEdges"
      aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label} style={{ display: 'block', flex: 'none' }}>
      {rects}
    </svg>
  );
}

export function HeartIcon({ size = 18, color = '#ff6a5a' }: { size?: number; color?: string }) {
  return <PixelIcon rows={HEART} size={size} color={color} />;
}

export function DiscordIcon({ size = 18, color = '#c9cdfb' }: { size?: number; color?: string }) {
  return <PixelIcon rows={DISCORD} size={size} color={color} />;
}
