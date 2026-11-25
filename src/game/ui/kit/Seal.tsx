// Sello de pieza asegurada (seguro por bajada, 24/11).
const SEAL = ['..########..', '.#oooooooo#.', '#oooooooooo#', '#oooooookoo#', '#ooooookkoo#', '#okooookooo#', '#okkookkooo#', '#ookkkkoooo#', '.#ookkoooo#.', '..#oooooo#..', '...#oooo#...', '....####....'];
const SEAL_FILL: Record<string, string> = { '#': '#0b0a0f', o: '#e8b33a', k: '#1a1206' };

/** Sello de pieza asegurada: escudo dorado con una marca, 12×12 a escala entera. */
export function Seal({ scale = 2, title = 'Asegurada esta bajada' }: { scale?: number; title?: string }) {
  return (
    <svg width={12 * scale} height={12 * scale} viewBox="0 0 12 12" shapeRendering="crispEdges" role="img" aria-label={title} data-testid="seal">
      <title>{title}</title>
      {SEAL.flatMap((r, y) => [...r].map((ch, x) => (ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={SEAL_FILL[ch]} />)))}
    </svg>
  );
}

