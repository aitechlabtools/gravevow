// Ataques anunciados, patrones y fases de jefe (Fase 8). Se reutilizan las criaturas que ya existen (plan maestro, apartado 24):
// cada una recibe una intención legible y una respuesta posible para el Guerrero y para el Mago con las acciones básicas
// (atacar o ponerse en guardia). Cifras de prueba en config/intents.ts.
import type { Region } from '../anatomy';
import { BOSS_PHASE_AT } from '../../config/intents';

export type MoveKind = 'strike' | 'drain';

export interface MoveDef {
  id: string;
  /** Nombre del ataque (registro y chip de intención). */
  name: string;
  kind: MoveKind;
  damage?: 'physical' | 'magical';
  /** Potencia de cada impacto (el ataque básico es 1). */
  power?: number;
  /** Impactos seguidos: una sola guardia los cubre todos. */
  hits?: number;
  /** Golpea a todo el bando contrario. */
  aoe?: boolean;
  /** Regiones posibles: la elegida se anuncia y el golpe cae ahí. Con guardia, no hay lesión. */
  regions?: Region[];
  /** Turnos propios de preparación (1: descarga en su próximo turno; el anuncio va al final de una acción normal). */
  prep?: number;
  /** Golpes que cortan la preparación (como mucho uno por ronda). Sin valor: no se interrumpe. */
  breakAt?: number;
  /** Turnos propios que pierde tambaleándose al descargar (expuesto mientras). */
  stagger?: number;
  /** Turnos propios que sigue expuesto (actuando) después. */
  exposed?: number;
  /** Frase del anuncio: {n} es quien lo prepara y {t} su objetivo. */
  tell: string;
  /** Qué conviene hacer (chip de intención). */
  hint: string;
}

const m = (d: MoveDef) => d;
export const MOVES: Record<string, MoveDef> = {
  heavy_blow: m({ id: 'heavy_blow', name: 'Golpe pesado', kind: 'strike', damage: 'physical', power: 1.8, exposed: 1, tell: '{n} alza el arma con las dos manos: golpe pesado contra {t}.', hint: 'Guardia' }),
  dive: m({ id: 'dive', name: 'Picado', kind: 'strike', damage: 'physical', power: 1.8, stagger: 1, tell: '{n} se eleva y busca a {t} para lanzarse en picado.', hint: 'Guardia' }),
  charge: m({ id: 'charge', name: 'Embestida', kind: 'strike', damage: 'physical', power: 2, regions: ['thorax', 'legL', 'legR'], exposed: 1, tell: '{n} raspa el suelo: embestida contra {r} de {t}.', hint: 'Guardia' }),
  double_cut: m({ id: 'double_cut', name: 'Doble tajo', kind: 'strike', damage: 'physical', power: 1.3, hits: 2, stagger: 1, exposed: 1, tell: '{n} cruza las armas: dos tajos seguidos contra {t}.', hint: 'Guardia' }),
  soul_drain: m({ id: 'soul_drain', name: 'Absorción', kind: 'drain', prep: 1, breakAt: 1, tell: '{n} tiende un hilo oscuro hacia {t}: va a beberse su Ímpetu o Maná.', hint: 'Atacar' }),
  // Jefes regionales
  chain_blow: m({ id: 'chain_blow', name: 'Golpe de cadena', kind: 'strike', damage: 'physical', power: 2.3, exposed: 1, tell: '{n} hace girar la cadena sobre la cabeza: golpe de cadena contra {t}.', hint: 'Guardia' }),
  chain_fury: m({ id: 'chain_fury', name: 'Furia de cadenas', kind: 'strike', damage: 'physical', power: 1.4, hits: 2, stagger: 1, exposed: 1, tell: '{n} suelta las cuatro cadenas: dos golpes brutales contra {t}.', hint: 'Guardia' }),
  short_chant: m({ id: 'short_chant', name: 'Canto breve', kind: 'drain', prep: 1, breakAt: 1, tell: '{n} entona un canto breve hacia {t}: le arrancará Ímpetu o Maná.', hint: 'Atacar' }),
  great_lament: m({ id: 'great_lament', name: 'Gran lamento', kind: 'strike', damage: 'magical', power: 1.8, aoe: true, prep: 2, breakAt: 2, exposed: 1, tell: '{n} toma aire para el gran lamento: dos golpes lo rompen; si no, guardia.', hint: 'Atacar o guardia' }),
  marked_strike: m({ id: 'marked_strike', name: 'Golpe marcado', kind: 'strike', damage: 'physical', power: 2.1, regions: ['head', 'thorax', 'armL', 'armR', 'legL', 'legR'], exposed: 1, tell: '{n} señala {r} de {t} con la garra antes de golpear.', hint: 'Guardia' }),
  abyss_furnace: m({ id: 'abyss_furnace', name: 'Horno abisal', kind: 'strike', damage: 'magical', power: 2.4, aoe: true, prep: 2, stagger: 1, tell: '{n} abre el horno abisal: en dos turnos descargará sobre todos.', hint: 'Guardia o curarte' }),
};

/** Tras `every` acciones normales, prepara el siguiente ataque de la lista (en orden, en bucle). */
export interface PatternDef {
  every: number;
  moves: string[];
  /** Solo anuncia si no tiene compañero vivo (S1: el 1 contra 2 no suma un patrón a la desventaja). */
  solo?: boolean;
}

/** Fase de un jefe: se entra al bajar de `at` (parte de la vida máxima), una sola vez y sin curarse. */
export interface BossPhaseDef {
  at: number;
  line: string;
  pattern?: PatternDef;
  /** Defensa y resistencia mágica multiplicadas (la tercera fase rompe su protección). */
  guard?: number;
  /** Auxiliar que entra una sola vez si hay sitio en su bando (máximo dos por bando). */
  summon?: string;
}

/** Patrones de las criaturas existentes. S1 enseña solo dos sencillos (golpe pesado y picado). */
export const ENEMY_PATTERNS: Record<string, PatternDef> = {
  // Mazmorra
  // S1 enseña (encuentros de aprendizaje): más espaciado y solo cuando lucha sin compañero
  bandit: { every: 3, moves: ['heavy_blow'], solo: true },
  carrion_crow: { every: 3, moves: ['dive'], solo: true },
  bandit_captain: { every: 3, moves: ['heavy_blow'] },
  skeleton: { every: 2, moves: ['heavy_blow'] },
  bat: { every: 2, moves: ['dive'] },
  hollow_armor: { every: 2, moves: ['heavy_blow'] },
  fallen_guard_knight: { every: 3, moves: ['double_cut'] },
  torturer: { every: 2, moves: ['charge'] },
  pit_worm: { every: 3, moves: ['charge'] },
  executioner: { every: 3, moves: ['charge', 'heavy_blow'] },
  // Cripta
  ghoul: { every: 2, moves: ['charge'] },
  bone_colossus: { every: 2, moves: ['heavy_blow'] },
  ossuary_monk: { every: 3, moves: ['soul_drain'] },
  tomb_knight: { every: 3, moves: ['double_cut'] },
  drowned: { every: 3, moves: ['charge'] },
  mourner: { every: 3, moves: ['soul_drain'] },
  water_lady: { every: 3, moves: ['soul_drain', 'heavy_blow'] },
  marble_gargoyle: { every: 2, moves: ['heavy_blow'] },
  spectral_duelist: { every: 3, moves: ['double_cut'] },
  // Infierno
  abyss_hound: { every: 2, moves: ['dive'] },
  magma_elemental: { every: 2, moves: ['heavy_blow'] },
  umbral_priest: { every: 3, moves: ['soul_drain', 'heavy_blow'] },
  hound_master: { every: 3, moves: ['charge'] },
  hell_knight: { every: 2, moves: ['double_cut'] },
  chain_warden: { every: 3, moves: ['double_cut'] },
  soul_devourer: { every: 3, moves: ['soul_drain'] },
  pit_lord: { every: 2, moves: ['heavy_blow'] },
  belzar_herald: { every: 3, moves: ['double_cut', 'heavy_blow'] },
  // Jefes que no son regionales: un golpe pesado anunciado además de su segunda fase
  mordrek: { every: 3, moves: ['heavy_blow'] },
  burned_seneschal: { every: 3, moves: ['heavy_blow'] },
  bone_abbot: { every: 3, moves: ['heavy_blow'] },
  black_ferryman: { every: 3, moves: ['heavy_blow'] },
  vharok: { every: 3, moves: ['heavy_blow'] },
  ignaroth: { every: 3, moves: ['heavy_blow'] },
  sulfur_beast: { every: 3, moves: ['heavy_blow'] },
};

/** Jefes regionales (S3, S6 y S10): tres fases con umbrales visibles. Sustituyen a su antigua segunda fase. */
/** `hp`: vida respecto a su ficha, para compensar el auxiliar y las fases (calibrado con tests/balance.test.ts). */
export const REGIONAL_BOSSES: Record<string, { pattern: PatternDef; phases: BossPhaseDef[]; hp?: number }> = {
  ossuary_lord: {
    hp: 0.75,
    pattern: { every: 2, moves: ['chain_blow'] },
    phases: [
      { at: BOSS_PHASE_AT[0], line: 'El Señor del Osario golpea el suelo con la cadena: «¡Carcelero, a mí!»', summon: 'skeleton', pattern: { every: 3, moves: ['chain_blow'] } },
      { at: BOSS_PHASE_AT[1], line: 'El Señor del Osario se arranca la corona y suelta las cuatro cadenas. Su guardia se abre.', guard: 0.75, pattern: { every: 3, moves: ['chain_fury', 'chain_blow'] } },
    ],
  },
  veiled_queen: {
    hp: 0.9,
    pattern: { every: 2, moves: ['short_chant'] },
    phases: [
      { at: BOSS_PHASE_AT[0], line: 'La Reina Velada toma aire para el gran lamento.', pattern: { every: 2, moves: ['great_lament', 'short_chant'] } },
      { at: BOSS_PHASE_AT[1], line: 'La Reina Velada se levanta el velo. Entre lamento y lamento, calla y queda expuesta.', guard: 0.75, pattern: { every: 3, moves: ['great_lament'] } },
    ],
  },
  belzar: {
    hp: 1.5,
    pattern: { every: 2, moves: ['marked_strike'] },
    phases: [
      { at: BOSS_PHASE_AT[0], line: 'Belzar abre el horno abisal: «Arde despacio.»', pattern: { every: 2, moves: ['abyss_furnace', 'marked_strike'] } },
      { at: BOSS_PHASE_AT[1], line: 'Belzar rompe sus propias cadenas: «Ahora sí. Ahora ardes.» Su coraza se agrieta.', guard: 0.7, pattern: { every: 1, moves: ['marked_strike', 'chain_fury'] } },
    ],
  },
};

export const getMove = (id: string): MoveDef => {
  const mv = MOVES[id];
  if (!mv) throw new Error(`Movimiento desconocido: ${id}`);
  return mv;
};
