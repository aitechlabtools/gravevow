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

/** Pestañas del interior de un mercader (fase 2, 19/11). Mismo estilo: 12×12, un color. */
export const VENDOR_TAB_ICONS: Record<string, string[]> = {
  // Seguro: escudo con una marca (24/11)
  insure: ['..XXXXXXXX..', '.XXXXXXXXXX.', 'XXXXXXXXXXXX', 'XXXXXXXX.XXX', 'XXXXXXX..XXX', 'XX.XXXX.XXXX', 'XX..XX..XXXX', 'XXX....XXXXX', '.XXX..XXXXX.', '..XXXXXXXX..', '...XXXXXX...', '....XXXX....'],
  // Tienda: bolsa con cordón
  shop: ['....XXXX....', '.....XX.....', '....XXXX....', '...XX..XX...', '..XXXXXXXX..', '.XXXXXXXXXX.', 'XXXXX..XXXXX', 'XXXX.XX.XXXX', 'XXXXX..XXXXX', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '..XXXXXXXX..'],
  // Vender: monedas apiladas
  sell: ['....XXXXXX..', '...XXXXXXXX.', '....XXXXXX..', '...XXXXXXXX.', '............', '..XXXXXX....', '.XXXXXXXX...', '..XXXXXX....', '.XXXXXXXX...', '..XXXXXX....', '.XXXXXXXX...', '............'],
  // Misiones: nota clavada
  quests: TAB_ICONS.quests,
  // Contratos: pergamino enrollado
  contracts: ['.XXXXXXXXX..', 'XX.......XX.', '.XXXXXXXXXX.', '..X......X..', '..X.XXXX.X..', '..X......X..', '..X.XXXX.X..', '..X......X..', '..X.XXX..X..', '.XXXXXXXXXX.', 'XX.......XX.', '.XXXXXXXXX..'],
  // Reparar: martillo
  repair: ['.XXXXXXX....', 'XXXXXXXXX...', 'XXXXXXXXX...', '.XXXXXXX....', '....XX......', '.....XX.....', '......XX....', '.......XX...', '........XX..', '.........XX.', '..........XX', '...........X'],
  // Enfermería: cruz
  infirmary: ['....XXXX....', '....XXXX....', '....XXXX....', '....XXXX....', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', '....XXXX....', '....XXXX....', '....XXXX....', '....XXXX....'],
  // Desguace: engranaje
  scrap: ['.....XX.....', '..X.XXXX.X..', '.XXXXXXXXXX.', '..XXX..XXX..', '.XXX....XXX.', 'XXX......XXX', 'XXX......XXX', '.XXX....XXX.', '..XXX..XXX..', '.XXXXXXXXXX.', '..X.XXXX.X..', '.....XX.....'],
  // Estación: yunque
  station: ['............', 'XXXXXXXXXXX.', '.XXXXXXXXXXX', '..XXXXXXXXX.', '....XXXXX...', '.....XXX....', '.....XXX....', '....XXXXX...', '...XXXXXXX..', '..XXXXXXXXX.', '..XXXXXXXXX.', '............'],
};

/** Silueta del Bastión para la tarjeta «Volver al Bastión» (32×16, fase 2). */
export const BASTION_SKYLINE: string[] = [
  '..............X.X...............',
  '..............XXX...............',
  '...X.X.X......XXX......X.X.X....',
  '...XXXXX.....XXXXX.....XXXXX....',
  '...XX.XX.....XX.XX.....XX.XX....',
  '...XXXXX.....XXXXX.....XXXXX....',
  '...XXXXXX.X.XXXXXXX.X.XXXXXX....',
  'X.X.XXXXXXXXXXXXXXXXXXXXXXXX.X.X',
  'XXXXXXXXXXXXXX.X.XXXXXXXXXXXXXXX',
  'XXXX.XXXXXXXXX...XXXXXXXXX.XXXXX',
  'XXXXXXXXXXXXX.....XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXX.....XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXX.....XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXX.....XXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
];
