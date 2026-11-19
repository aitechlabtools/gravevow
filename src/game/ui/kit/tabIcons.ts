// Iconos de las pestañas de la barra superior (fase 1 del plan de interfaz, 19/11).
// Siluetas de un solo color en 12×12, en la misma línea que Apoyar y Discord (shared/community.tsx). Se dibujan con PixelIcon
// a escala entera (24 px = ×2). Provisionales hasta que haya arte definitivo; para cambiar uno, cambia sus filas («X» = píxel).
export const TAB_ICONS: Record<string, string[]> = {
  // Jugar: puerta en arco con escalones que bajan
  play: ['...XXXXXX...', '..XXXXXXXX..', '.XXX....XXX.', '.XX......XX.', 'XX........XX', 'XX........XX', 'XX......XXXX', 'XX......XXXX', 'XX....XXXXXX', 'XX....XXXXXX', 'XX..XXXXXXXX', 'XXXXXXXXXXXX'],
  // Habilidades: rombo doble (el de la habilidad de clase)
  character: ['.....XX.....', '....XXXX....', '...XX..XX...', '..XX....XX..', '.XX..XX..XX.', 'XX..XXXX..XX', 'XX..XXXX..XX', '.XX..XX..XX.', '..XX....XX..', '...XX..XX...', '....XXXX....', '.....XX.....'],
  // Alijo: cofre
  stash: ['............', '..XXXXXXXX..', '.XX......XX.', 'XX........XX', 'XXXXXXXXXXXX', 'XXXXX..XXXXX', 'XXXXX..XXXXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XX........XX', '............'],
  // Bastión: torre almenada
  merchants: ['XX.XX..XX.XX', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '.XXXX..XXXX.', '.XXX....XXX.', '.XXXX..XXXX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XXXX..XXXX.', '.XXX....XXX.', '.XXX....XXX.', 'XXXXXXXXXXXX'],
  // Misiones: nota clavada
  quests: ['.....XX.....', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XX......XX.', '.XXXXXXXXXX.', '.XX.....XXX.', '.XXXXXXXXXX.', '.XX......XX.', '.XXXXXXXXXX.', '.XX....XXXX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.'],
  // Bestiario: calavera
  bestiary: ['...XXXXXX...', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XX..XX..XX.', '.XX..XX..XX.', '.XXXXXXXXXX.', '..XXX..XXX..', '...XXXXXX...', '...X.XX.X...', '...XXXXXX...', '............'],
  // Tienda (atuendos): túnica
  shop: ['...XX..XX...', '..XXXXXXXX..', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XX.XXXXXX.XX', '...XXXXXX...', '...XXXXXX...', '...XXXXXX...', '..XXXXXXXX..', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XXXXXXXXXX.'],
};
