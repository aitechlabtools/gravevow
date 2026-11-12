// ════════════════════════════════════════════════════════════════════
// Tutorial de la primera expedición: un camino lineal hecho a mano en las Afueras del Bastión.
// Enseña, en orden: moverse, un combate fácil, abrir un baúl (que da la llave), abrir un cofre con llave, equiparse lo
// encontrado, beber una poción, hablar y aliarse con un mercenario errante (Osric), combatir juntos, sobrevivir a su
// traición y extraer. No se puede perder: si caes, vuelves al último punto seguro sin perder nada.
// Todo editable: textos, posiciones y recompensas.
// ════════════════════════════════════════════════════════════════════
import type { DungeonDef } from '../dungeon';

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
    // 2 · Una rata débil
    { kind: 'enemy', id: 't_rat', enemyId: 'ossuary_rat', x: rx(1) + 3, y: Y + 2, lvl: 0 },
    // 3 · Baúl con la llave y cofre de hierro con equipo
    { kind: 'chest', id: 't_box', table: 'tut:box', x: rx(2) + 1, y: Y + 1 },
    { kind: 'chest', id: 't_rich', table: 'tut:rich', x: rx(2) + 4, y: Y + 3 },
    // 4 · Una fila de pinchos de pared a pared al entrar en la hoguera: no se puede esquivar (para practicar con la poción)
    ...Array.from({ length: ROOM_H }, (_, k) => ({ kind: 'trap' as const, id: `t_trap${k}`, x: rx(3) + 1, y: Y + k })),
    // 5 · Osric junto a la puerta rota
    { kind: 'rival', x: rx(4) + 3, y: Y + 2 },
    // 6 · Dos bandidos
    { kind: 'enemy', id: 't_band1', enemyId: 'bandit', x: rx(5) + 2, y: Y + 1, lvl: 0 },
    { kind: 'enemy', id: 't_band2', enemyId: 'bandit', x: rx(5) + 4, y: Y + 3, lvl: 0 },
    // 8 · Portal
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

/** Texto del paso de la poción ANTES de pisar los pinchos (el paso se activa al herirte). */
export const TUTORIAL_POTION_BEFORE = {
  desktop: 'Sigue hacia la hoguera. Mira bien dónde pisas…',
  touch: 'Sigue hacia la hoguera. Mira bien dónde pisas…',
};

export type TutorialTarget = { tile: [number, number] } | { ui: string } | null;

export interface TutorialStep {
  id: string;
  /** Texto en ordenador (teclado y ratón) y en pantallas táctiles. */
  desktop: string;
  touch: string;
  target: TutorialTarget;
  /** Punto seguro: si caes a partir de este paso, vuelves aquí. */
  checkpoint: number;
  /** El personaje no se puede mover hasta cumplir el paso (pasos de inventario y de curarse). */
  freeze?: boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'move', checkpoint: 0, target: { tile: tutorialRoomCenter(1) }, desktop: 'Muévete con WASD o las flechas, o haz clic en el suelo donde quieras ir.', touch: 'Usa el joystick o toca el suelo donde quieras ir.' },
  { id: 'fight', checkpoint: 1, target: { tile: [rx(1) + 3, Y + 2] }, desktop: 'Una rata te corta el paso. En el combate, pulsa Atacar (o la tecla 1) hasta vencerla.', touch: 'Una rata te corta el paso. En el combate, toca Atacar hasta vencerla.' },
  { id: 'gold', checkpoint: 2, target: { ui: 'btn-take-gold' }, desktop: 'La rata ha soltado un saco. Coge las monedas: el oro ocupa sitio en tu mochila y, si mueres, lo pierdes.', touch: 'La rata ha soltado un saco. Toca «Coger el oro»: el oro ocupa sitio en tu mochila y, si mueres, lo pierdes.' },
  { id: 'box', checkpoint: 2, target: { tile: [rx(2) + 1, Y + 1] }, desktop: 'Ese baúl no tiene cerradura. Acércate y ábrelo con E. Coge lo que haya dentro.', touch: 'Ese baúl no tiene cerradura. Acércate y toca Usar para abrirlo. Coge lo que haya dentro.' },
  { id: 'rich', checkpoint: 2, target: { tile: [rx(2) + 4, Y + 3] }, desktop: 'Ya tienes la llave de hierro. Abre el cofre de hierro con E.', touch: 'Ya tienes la llave de hierro. Toca Usar junto al cofre de hierro para abrirlo.' },
  { id: 'equip', checkpoint: 2, freeze: true, target: { ui: 'btn-inventory' }, desktop: 'Has encontrado una capucha. Abre el inventario (I) y haz doble clic en ella para ponértela. Cada pieza protege su parte del cuerpo: los golpes que encaja casi nunca hacen sangrar ni rompen huesos.', touch: 'Has encontrado una capucha. Abre el inventario, toca la capucha y luego Equipar. Cada pieza protege su parte del cuerpo: los golpes que encaja casi nunca hacen sangrar ni rompen huesos.' },
  { id: 'pocket', checkpoint: 2, freeze: true, target: { ui: 'btn-inventory' }, desktop: 'El cofre traía un saquito de oro. Abre el inventario y arrastra tus monedas dentro del saco (o pulsa «Agrupar oro»). Luego arrastra el saco al bolsillo seguro (o elígelo y pulsa «Al bolsillo seguro»): lo que guardes ahí no se pierde al morir.', touch: 'El cofre traía un saquito de oro. Abre el inventario y arrastra tus monedas dentro del saco (o toca «Agrupar oro»). Luego arrastra el saco al bolsillo seguro (o tócalo y elige «Al bolsillo seguro»): lo que guardes ahí no se pierde al morir.' },
  { id: 'potion', checkpoint: 3, freeze: true, target: { ui: 'btn-potion' }, desktop: 'La trampa te ha herido. Bebe una poción con Q o con el botón Poción. Si una parte sangra o se rompe, toca la silueta, elige esa parte y usa una venda o una férula.', touch: 'La trampa te ha herido. Toca el botón de poción para curarte. Si una parte sangra o se rompe, toca la silueta, elige esa parte y usa una venda o una férula.' },
  { id: 'talk', checkpoint: 3, target: { tile: [rx(4) + 3, Y + 2] }, desktop: 'Un mercenario errante. El triángulo de su cabeza indica cuánto puedes fiarte de él. Acércate y habla con él (E).', touch: 'Un mercenario errante. El triángulo de su cabeza indica cuánto puedes fiarte de él. Acércate y toca Usar para hablar.' },
  { id: 'ally', checkpoint: 4, target: { ui: 'rival-ally' }, desktop: 'Alíate con Osric: luchará a tu lado a cambio de su parte del botín.', touch: 'Alíate con Osric: luchará a tu lado a cambio de su parte del botín.' },
  { id: 'together', checkpoint: 4, target: { tile: [rx(5) + 3, Y + 2] }, desktop: 'Dos bandidos en el patio. Osric lucha solo; tú sigue atacando.', touch: 'Dos bandidos en el patio. Osric lucha solo; tú sigue atacando.' },
  { id: 'betrayal', checkpoint: 5, target: { tile: tutorialRoomCenter(6) }, desktop: 'Sigue hacia la brecha de la muralla. Y vigila a tu aliado…', touch: 'Sigue hacia la brecha de la muralla. Y vigila a tu aliado…' },
  { id: 'extract', checkpoint: 6, target: { tile: [rx(7) + 3, Y + 2] }, desktop: 'Así acaban muchas alianzas aquí abajo. Llega al portal, actívalo con E y no te muevas: saldrás con todo lo que llevas, también el oro.', touch: 'Así acaban muchas alianzas aquí abajo. Llega al portal, toca Usar y no te muevas: saldrás con todo lo que llevas, también el oro.' },
];

/** Lo que se lleva el jugador al terminar el tutorial, además de lo que encontró. */
export const TUTORIAL_REWARD = { gold: 10, items: [{ itemId: 'health_potion', qty: 3 }, { itemId: 'leather_gloves', qty: 1 }] };
