// ════════════════════════════════════════════════════════════════════
// Mini tutoriales contextuales: archivo de datos. Para enseñar una
// mecánica nueva basta con añadir aquí una entrada y lanzar su
// disparador desde la interfaz con `actions.tutorialEvent('<disparador>')`.
// Mapa completo y reglas: docs/plan-tutoriales.md (y docs/tutoriales.md
// cuando exista).
// ════════════════════════════════════════════════════════════════════
import type { VendorId } from './vendors';

/** Temas de la Guía (Ajustes › Partida). */
export type TutTopic = 'combate' | 'cuerpo' | 'objetos' | 'bastion' | 'mercaderes' | 'progresion' | 'cuenta';
export const TOPIC_NAME: Record<TutTopic, string> = {
  combate: 'Combate', cuerpo: 'Heridas y necesidades', objetos: 'Objetos y oro', bastion: 'Bastión y Refugio',
  mercaderes: 'Mercaderes', progresion: 'Progresión', cuenta: 'Cuenta y copia',
};

/** Quién lo cuenta: el intendente del Bastión o un mercader (con su retrato). */
export type Narrator = 'intendant' | VendorId;

export interface TutStep {
  /** Texto de escritorio. Admite **negrita**. Una o dos frases. */
  text: string;
  /** Texto para pantallas táctiles, si cambia («toca» en vez de «haz clic»). */
  touch?: string;
  /** `data-testid` del elemento que se resalta. Si no está en pantalla, el paso se muestra sin resaltar. */
  target?: string;
  /**
   * 'click': el paso termina cuando el jugador toca el elemento resaltado (acción real).
   * Sin valor: botón «Entendido».
   */
  action?: 'click';
}

export interface MiniTutorial {
  id: string;
  topic: TutTopic;
  /** Disparador, p. ej. 'tab:quests' (primera vez en la pestaña Misiones). */
  trigger: string;
  narrator?: Narrator;
  /** `data-testid` donde se pinta el «!» mientras esté pendiente (pestaña, mercader, estación…). */
  badge?: string;
  /** Es del propio combate: puede salir en mitad de uno. El resto espera a que termine. */
  inCombat?: boolean;
  /** De 2 a 4 pasos (la bienvenida, `long`, hasta 12). */
  steps: TutStep[];
  /** Recorrido largo por varias pestañas (solo la bienvenida al Bastión). */
  long?: boolean;
}

/** Bienvenida al Bastión: la cuenta el intendente al volver de la primera bajada (o al crear un personaje sin tutorial). */
export const WELCOME_ID = 'bienvenida';

export const MINI_TUTORIALS: MiniTutorial[] = [
  {
    id: WELCOME_ID, topic: 'bastion', trigger: 'lobby:welcome', narrator: 'intendant', long: true,
    steps: [
      { text: 'Bienvenido al **Bastión de Ceniza**. Soy el intendente: aquí arriba lo tienes todo, en estas pestañas.', target: 'lobby-nav' },
      { text: 'Empecemos por tu **Intendencia**: tu equipo, tu mochila y el almacén. Haz clic en la pestaña.', touch: 'Empecemos por tu **Intendencia**: tu equipo, tu mochila y el almacén. Toca la pestaña.', target: 'tab-stash', action: 'click' },
      { text: 'Lo que traes de abajo va en la **mochila**, y la mochila **se pierde si mueres**. El oro también **ocupa sitio**: las monedas sueltas llenan casillas.', target: 'alijo-backpack' },
      { text: 'Los **saquitos** y **sacos** que vende Nira guardan muchas monedas en una sola casilla. Pulsa **«Agrupar oro»**.', touch: 'Los **saquitos** y **sacos** que vende Nira guardan muchas monedas en una sola casilla. Toca **«Agrupar oro»**.', target: 'group-gold-backpack', action: 'click' },
      { text: 'Este es tu **bolsillo seguro**: lo que guardes ahí **no se pierde al morir**. Caben cosas pequeñas, como llaves o saquitos. Arrastra ahí lo más valioso antes de bajar.', touch: 'Este es tu **bolsillo seguro**: lo que guardes ahí **no se pierde al morir**. Caben llaves o saquitos: toca uno y luego una casilla del bolsillo.', target: 'alijo-pocket' },
      { text: 'Pulsa **«Vaciar mochila»**: todo lo que llevas pasa al almacén, donde está a salvo.', touch: 'Toca **«Vaciar mochila»**: todo lo que llevas pasa al almacén, donde está a salvo.', target: 'empty-backpack', action: 'click' },
      { text: 'Ahora, la pestaña **Bastión**. Haz clic en ella.', touch: 'Ahora, la pestaña **Bastión**. Tócala.', target: 'tab-merchants', action: 'click' },
      { text: 'Tiene dos puertas: los **Mercaderes** compran, venden y dan encargos; tu **Refugio** guarda las estaciones que te construyen sus encargados. Ya los irás conociendo.', target: 'bastion-merchants' },
      { text: 'Tu partida vive en este navegador. Haz una **copia de seguridad** de vez en cuando: está en **Ajustes › Partida** y en el menú principal.', target: 'btn-lobby-settings' },
      { text: 'Cuando quieras bajar, vuelve a **Jugar**. Haz clic en la pestaña.', touch: 'Cuando quieras bajar, vuelve a **Jugar**. Toca la pestaña.', target: 'tab-play', action: 'click' },
      { text: 'Elige la subzona (de momento, las Afueras) y pulsa **Descender**. Suerte ahí abajo. La necesitarás.', touch: 'Elige la subzona (de momento, las Afueras) y toca **Descender**. Suerte ahí abajo. La necesitarás.', target: 'btn-enter-dungeon' },
    ],
  },
  {
    id: 'tab.misiones', topic: 'mercaderes', trigger: 'tab:quests', badge: 'tab-quests',
    steps: [
      { text: 'Aquí tienes los **encargos** de todos los mercaderes, juntos. Lleva lo que piden en tu almacén y cobra la paga.', target: 'screen-quests' },
      { text: 'Cada encargo cumplido sube tu **reputación** con quien te lo dio.' },
    ],
  },
  {
    id: 'tab.bestiario', topic: 'progresion', trigger: 'tab:bestiary', badge: 'tab-bestiary',
    steps: [
      { text: 'Cada criatura que vences queda apuntada: **puntos débiles**, botín y dónde vive.', target: 'bestiary' },
      { text: 'Cuanto más vences a una, más sabes de ella.' },
    ],
  },
  {
    id: 'tab.tienda', topic: 'cuenta', trigger: 'tab:shop', badge: 'tab-shop',
    steps: [
      { text: 'Los **trajes** solo cambian tu aspecto. No dan ventaja.', target: 'shop' },
      { text: 'Lo que compras es de la **cuenta**: cualquiera de tus personajes lo puede llevar.' },
    ],
  },
];

export function getMini(id: string): MiniTutorial | undefined {
  return MINI_TUTORIALS.find((m) => m.id === id);
}
