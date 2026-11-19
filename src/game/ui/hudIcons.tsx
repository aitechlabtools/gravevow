// Iconos provisionales de la barra táctil (12×12 en rejilla de píxeles, escalados a entero).
// Se sustituirán por los gráficos definitivos del usuario (ver la lista de gráficos del plan).
const PATHS: Record<'bag' | 'menu' | 'sat' | 'hyd' | 'rest' | 'loot' | 'weight', string> = {
  // Mochila: asa, cuerpo y solapa
  bag: 'M4 1h4v1H4zM3 2h1v2H3zM8 2h1v2H8zM2 4h8v1H2zM1 5h1v6H1zM10 5h1v6h-1zM2 11h8v1H2zM4 6h4v2H4z',
  // Menú: tres barras
  menu: 'M1 2h10v2H1zM1 5h10v2H1zM1 8h10v2H1z',
  // Saciedad: muslo
  sat: 'M6 1h4v1H6zM5 2h6v4H5zM4 3h1v4H4zM5 6h4v1H5zM3 7h2v1H3zM2 8h2v1H2zM1 9h2v2H1zM3 9h1v1H3z',
  // Hidratación: gota
  hyd: 'M5 1h2v2H5zM4 3h4v2H4zM3 5h6v4H3zM4 9h4v1H4zM5 10h2v1H5z',
  // Descanso: luna
  rest: 'M4 1h4v1H4zM3 2h3v1H3zM2 3h3v6H2zM3 9h3v1H3zM4 10h4v1H4zM6 9h3v1H6zM8 8h2v1H8z',
  // Peso: pesa con asa
  weight: 'M4 1h4v1H4zM3 2h1v2H3zM8 2h1v2H8zM2 4h8v1H2zM1 5h10v6H1z',
  // Botín: saco atado
  loot: 'M5 1h2v1H5zM4 2h4v1H4zM5 3h2v1H5zM3 4h6v1H3zM2 5h8v5H2zM3 10h6v1H3z',
};

export function HudIcon({ name, px = 24 }: { name: keyof typeof PATHS; px?: number }) {
  return (
    <svg viewBox="0 0 12 12" width={px} height={px} className="shrink-0" fill="currentColor" shapeRendering="crispEdges" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
