// ════════════════════════════════════════════════════════════════════
// Tutorial de la primera expedición: un camino lineal hecho a mano en las Afueras del Bastión.
// Enseña, en 8 pasos: moverse; combatir (ataque, ataque especial y curar la herida que deja la rata con una venda);
// abrir un cofre con su llave; equiparse un arma mejor; comer; aliarse con Osric y luchar juntos; sobrevivir a su
// traición; y extraer. No se puede perder: si caes, vuelves al último punto seguro sin perder nada.
// Guion y reglas: docs/plan-tutoriales.md (apartado 3). Todo editable: textos, posiciones y recompensas.
// ════════════════════════════════════════════════════════════════════
import type { DungeonDef } from '../dungeon';
import type { ClassId } from '../types';

/** Tramos del camino (8 claros unidos por pasos en la muralla), de izquierda a derecha. */
const ROOM_W = 6, ROOM_H = 5, GAP = 3, Y = 2;
const rx = (i: number) => 1 + i * (ROOM_W + GAP);
const ROOMS = ['Camino Embarrado', 'Empalizada', 'Cobertizo', 'Hoguera', 'Puerta Rota', 'Patio', 'Brecha de la Muralla', 'Salida'];

export const TUTORIAL_MAP: DungeonDef = {
  id: 'tutorial',
  name: 'Las Afueras del Bastión',
  width: rx(ROOMS.length) + 1,
  height: Y + ROOM_H + 2,
  zone: 'mazmorra',
  subzone: 'afueras',
  rooms: ROOMS.map((name, i) => ({ id: `t${i}`, name, x: rx(i), y: Y, w: ROOM_W, h: ROOM_H })),
  corridors: ROOMS.slice(1).map((_, i) => ({ x: rx(i) + ROOM_W, y: Y + 1, w: GAP, h: 3 })),
  entities: [
    { kind: 'spawn', x: rx(0) + 1, y: Y + 2 },
    ...ROOMS.flatMap((_, i) => [{ kind: 'torch' as const, x: rx(i) + 1, y: Y - 1, face: 'south' as const }, { kind: 'torch' as const, x: rx(i) + 4, y: Y - 1, face: 'south' as const }]),
    // 2 · Una rata débil (no cae hasta que uses el ataque especial; al acabar te deja la pierna sangrando)
    { kind: 'enemy', id: 't_rat', enemyId: 'ossuary_rat', x: rx(1) + 3, y: Y + 2, lvl: 0 },
    // 3 · Baúl con la llave y cofre de hierro (monedas y un saquito vacío)
    { kind: 'chest', id: 't_box', table: 'tut:box', x: rx(2) + 1, y: Y + 1 },
    { kind: 'chest', id: 't_rich', table: 'tut:rich', x: rx(2) + 4, y: Y + 3 },
    // 4 · El arma en el suelo de la hoguera es un saco (ver TUTORIAL_WEAPON_TILE)
    // 6 · Osric junto a la puerta rota
    { kind: 'rival', x: rx(4) + 3, y: Y + 2 },
    // 6 · Dos bandidos
    { kind: 'enemy', id: 't_band1', enemyId: 'bandit', x: rx(5) + 2, y: Y + 1, lvl: 0 },
    { kind: 'enemy', id: 't_band2', enemyId: 'bandit', x: rx(5) + 4, y: Y + 3, lvl: 0 },
    // 8 · Portal (apagado hasta el paso 8)
    { kind: 'portal', x: rx(7) + 3, y: Y + 2 },
    // Decorado
    { kind: 'decor', sprite: 'grass', x: rx(0) + 4, y: Y + 4 }, { kind: 'decor', sprite: 'stake', x: rx(1) + 5, y: Y },
    { kind: 'decor', sprite: 'crate', x: rx(2) + 5, y: Y }, { kind: 'decor', sprite: 'barrel', x: rx(3) + 5, y: Y + 4 },
    { kind: 'decor', sprite: 'brazier', x: rx(4) + 1, y: Y + 1 }, { kind: 'decor', sprite: 'grass', x: rx(5) + 1, y: Y + 4 },
    { kind: 'decor', sprite: 'rubble', x: rx(6) + 4, y: Y + 4 }, { kind: 'decor', sprite: 'stake', x: rx(7) + 5, y: Y },
  ],
};

/** Centro de un tramo (para las flechas y para volver al último punto seguro). */
export function tutorialRoomCenter(i: number): [number, number] {
  return [rx(i) + 2, Y + 2];
}
export function tutorialRoomOf(x: number): number {
  return Math.max(0, Math.min(ROOMS.length - 1, Math.floor((x - 1) / (ROOM_W + GAP))));
}

/** Casilla del saco con el arma, en la hoguera. */
export const TUTORIAL_WEAPON_TILE: [number, number] = [rx(3) + 3, Y + 1];
/** Arma de la hoguera, según la clase: un poco mejor que la del equipo inicial. */
export const TUTORIAL_WEAPON: Record<ClassId, string> = { warrior: 'short_sword', mage: 'ash_staff', rogue: 'keen_dagger', cleric: 'iron_mace' };
/** Lo que llevas de más en la mochila al bajar: el pan del paso 5 y la venda del paso 2. */
export const TUTORIAL_SUPPLIES = [{ itemId: 'stale_bread', qty: 1 }, { itemId: 'bandage', qty: 1 }];
/** Saciedad al empezar: baja para que se vea subir al comer. En el tutorial las necesidades no bajan. */
export const TUTORIAL_START_SAT = 45;
/** Pierna que muerde la rata y vida con la que la deja (proporción de su máximo). */
export const TUTORIAL_WOUND = { region: 'legL', pct: 0.5 } as const;
/** Segundos de juego entre el aviso de Osric y su traición. */
export const TUTORIAL_BETRAYAL_DELAY_MS = 1600;
/** Número de pasos que ve el jugador («Paso N de 8»). */
export const TUTORIAL_PARTS = 8;

/** Avisos de los bloqueos fijos del tutorial. */
export const TUTORIAL_BLOCK = {
  item: 'Aún no: puede que lo necesites más adelante.',
  portal: 'El portal todavía no responde. Termina lo que te queda.',
  flee: 'Aquí no hay a dónde huir.',
  osric: 'Lo necesitas vivo. Por ahora.',
};

export type TutorialTarget = { tile: [number, number] } | { ui: string } | null;

export interface TutorialStep {
  id: string;
  /** Paso que ve el jugador (1 a 8); varios pasos internos pueden compartir número. */
  part: number;
  /** Texto en ordenador (teclado y ratón) y en pantallas táctiles. Admite **negrita**. */
  desktop: string;
  touch: string;
  target: TutorialTarget;
  /**
   * Selectores CSS de lo que se resalta, por orden de preferencia: se resalta el primero que esté en pantalla
   * (`{weapon}` = el arma de la hoguera de tu clase). Si falta, el `target` de interfaz.
   */
  highlight?: string[];
  /** Punto seguro: si caes a partir de este paso, vuelves aquí. */
  checkpoint: number;
  /** El personaje no se puede mover hasta cumplir el paso. */
  freeze?: boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'move', part: 1, checkpoint: 0, target: { tile: tutorialRoomCenter(1) },
    desktop: 'Muévete con **WASD** o las flechas, o **haz clic en el suelo**. Ve hacia la luz.',
    touch: 'Arrastra el pulgar en la **zona del joystick** o **toca el suelo**. Ve hacia la luz.' },
  { id: 'attack', part: 2, checkpoint: 1, target: { tile: [rx(1) + 3, Y + 2] }, highlight: ['[data-testid="act-attack"]'],
    desktop: 'Una rata te corta el paso. Pulsa **Atacar** (tecla **1**).',
    touch: 'Una rata te corta el paso. Toca **Atacar**.' },
  { id: 'special', part: 2, checkpoint: 1, target: null, highlight: ['[data-testid="special-menu"] [data-testid^="skill-"]:not([disabled])', '[data-testid="act-special"]'],
    desktop: 'Bien. Ahora usa tu **ataque especial** (tecla **2**): pega más fuerte, pero gasta energía y tarda en volver.',
    touch: 'Bien. Ahora toca tu **ataque especial**: pega más fuerte, pero gasta energía y tarda en volver. Mantén pulsado para leerlo.' },
  { id: 'wound', part: 2, checkpoint: 1, freeze: true, target: { ui: 'hud-body' }, highlight: ['[data-testid="treat-bandage-legL"]', '[data-testid="body-row-legL"]', '[data-testid="hud-body"]'],
    desktop: 'La rata te ha mordido la **pierna** y sangra. Haz clic en la **silueta**, elige la pierna y usa la **venda**. Cada parte se cura por separado.',
    touch: 'La rata te ha mordido la **pierna** y sangra. Toca la **silueta**, luego la pierna y la **venda**. Cada parte se cura por separado.' },
  { id: 'box', part: 3, checkpoint: 2, target: { tile: [rx(2) + 1, Y + 1] }, highlight: ['[data-testid="btn-take-all"]'],
    desktop: 'Ese baúl no tiene cerradura. Acércate y ábrelo con **E**. Dentro hay una llave.',
    touch: 'Ese baúl no tiene cerradura. Acércate y toca **Usar**. Dentro hay una llave.' },
  { id: 'rich', part: 3, checkpoint: 2, target: { tile: [rx(2) + 4, Y + 3] }, highlight: ['[data-testid="btn-unlock"]', '[data-testid="btn-take-all"]'],
    desktop: 'Abre el **cofre de hierro** con la llave (**E**) y llévate lo que haya.',
    touch: 'Abre el **cofre de hierro** con la llave (toca **Usar**) y llévate lo que haya.' },
  { id: 'weapon', part: 4, checkpoint: 3, target: { tile: TUTORIAL_WEAPON_TILE }, highlight: ['[data-testid="btn-take-all"]'],
    desktop: 'Alguien dejó un arma junto a la hoguera. Recógela (**E**).',
    touch: 'Alguien dejó un arma junto a la hoguera. Acércate y toca **Usar** para recogerla.' },
  { id: 'equip', part: 4, checkpoint: 3, freeze: true, target: { ui: 'btn-inventory' }, highlight: ['[data-testid^="slot-backpack"][data-item="{weapon}"]', '[data-testid="btn-inventory"]'],
    desktop: 'Es mejor que la tuya. Abre la mochila (**I**) y **arrástrala a tu mano**. Mira cómo cambian tus ataques.',
    touch: 'Es mejor que la tuya. Abre la mochila, **tócala y elige Equipar** (o arrástrala a tu mano). Mira cómo cambian tus ataques.' },
  { id: 'eat', part: 5, checkpoint: 3, freeze: true, target: { ui: 'hud-body' }, highlight: ['[data-testid="eat-stale_bread"]', '[data-testid="need-open-sat"]', '[data-testid="hud-body"]'],
    desktop: 'El camino cansa. Llevas **pan**: haz clic en la **silueta** y, en Saciedad, elige el pan. Arriba verás subir el hambre.',
    touch: 'El camino cansa. Llevas **pan**: toca la **silueta** y, en Saciedad, toca el pan. Arriba verás subir el hambre.' },
  { id: 'ally', part: 6, checkpoint: 4, target: { tile: [rx(4) + 3, Y + 2] }, highlight: ['[data-testid="rival-ally"]'],
    desktop: 'Osric ofrece su espada a cambio de parte del botín. Habla con él (**E**) y **alíate**. El **triángulo** sobre su cabeza dice cuánto puedes fiarte.',
    touch: 'Osric ofrece su espada a cambio de parte del botín. Acércate, toca **Usar** y luego **Aliarse**. El **triángulo** sobre su cabeza dice cuánto puedes fiarte.' },
  { id: 'together', part: 6, checkpoint: 4, target: { tile: [rx(5) + 3, Y + 2] }, highlight: ['[data-testid="act-attack"]'],
    desktop: 'Dos bandidos en el patio. Osric lucha a tu lado: tú sigue atacando.',
    touch: 'Dos bandidos en el patio. Osric lucha a tu lado: tú sigue atacando.' },
  { id: 'betrayal', part: 7, checkpoint: 5, target: { tile: tutorialRoomCenter(6) },
    desktop: 'Sigue hacia la brecha de la muralla. Y vigila a tu aliado…',
    touch: 'Sigue hacia la brecha de la muralla. Y vigila a tu aliado…' },
  { id: 'extract', part: 8, checkpoint: 6, target: { tile: [rx(7) + 3, Y + 2] },
    desktop: 'Así acaban muchas alianzas aquí abajo. Llega al **portal**, actívalo con **E** y no te muevas hasta que se llene.',
    touch: 'Así acaban muchas alianzas aquí abajo. Llega al **portal**, toca **Usar** y no te muevas hasta que se llene.' },
];

export function tutorialStepIndex(id: string): number {
  return TUTORIAL_STEPS.findIndex((s) => s.id === id);
}

/** Lo que se lleva el jugador al terminar el tutorial, además de lo que encontró. */
export const TUTORIAL_REWARD = { gold: 10, items: [{ itemId: 'health_potion', qty: 3 }, { itemId: 'leather_gloves', qty: 1 }] };
