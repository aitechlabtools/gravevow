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
  /** De 2 a 4 pasos. */
  steps: TutStep[];
}

export const MINI_TUTORIALS: MiniTutorial[] = [
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
