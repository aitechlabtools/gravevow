// Música y ambiente (13/11). Todo lo que suena se ajusta aquí: pistas, variación por subzona, volúmenes,
// pausas, transiciones, peligro y fanfarrias. Las pistas se generan por código (src/game/music);
// para sustituir una por un archivo, rellena su `file` (OGG + MP3 para Safari) y se cargará al necesitarla.

export type TrackId = 'menu' | 'bastion' | 'mazmorra' | 'cripta' | 'infierno' | 'combat';
export type AmbientId = 'viento' | 'hoguera' | 'antorchas' | 'goteo' | 'cadenas' | 'huesos' | 'agua' | 'eco' | 'latido' | 'vientoCaliente' | 'lava' | 'retumbos' | 'refugio';
export type FanfareId = 'extract' | 'death' | 'level' | 'legendary';

/** Instrumentos del sintetizador (src/game/music/instruments.ts). */
export type Voice = 'pluck' | 'pad' | 'choir' | 'bell' | 'bass' | 'flute' | 'drone' | 'drum' | 'timpani' | 'metal' | 'shaker';

export interface Layer {
  voice: Voice;
  /** Patrones posibles (uno por frase, al azar). Cada nota: [grado de la escala, octava relativa, pulso de inicio, duración en pulsos]. Grado null = golpe sin altura (percusión). */
  patterns: [number | null, number, number, number][][];
  gain: number;
  /** Intensidad mínima (0..1) para que entre la capa. */
  from?: number;
  /** Probabilidad de sonar en cada frase (las capas entran y salen). */
  chance?: number;
  /** Probabilidad de añadir una nota de adorno junto a cada nota. */
  grace?: number;
}

export interface TrackDef {
  name: string;
  /** Escala en semitonos desde la tónica, y tónica en Hz. */
  scale: number[];
  root: number;
  bpm: number;
  /** Pulsos por frase. */
  beats: number;
  layers: Layer[];
  /** Frases seguidas antes de una pausa de ambiente (min, max). null = sin pausas (combate, menú). */
  phrasesBeforePause: [number, number] | null;
  /** Corte del filtro general (Hz): más bajo, más oscuro. */
  cutoff: number;
  /** Envío a la reverberación (0..1). */
  reverb: number;
  /** Archivo que sustituye a la pista generada (opcional, carga diferida). */
  file?: { ogg: string; mp3: string; loop?: boolean };
}

// Grados de las escalas (semitonos)
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const LOCRIAN = [0, 1, 3, 5, 6, 8, 10];
const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const MIXO_MINOR = [0, 2, 4, 5, 7, 8, 10];

export const TRACKS: Record<TrackId, TrackDef> = {
  menu: {
    name: 'Gravevow (menú)', scale: AEOLIAN, root: 146.83, bpm: 60, beats: 16, cutoff: 5200, reverb: 0.55, phrasesBeforePause: null,
    layers: [
      // La firma: cuatro notas que bajan y suben (1-5-4-1)
      { voice: 'bell', gain: 0.5, patterns: [[[0, 1, 0, 3], [4, 0, 3, 3], [3, 0, 6, 2], [0, 0, 8, 6]], [[0, 1, 0, 3], [4, 0, 3, 3], [5, 0, 6, 2], [4, 0, 8, 6]]], grace: 0.1 },
      { voice: 'pad', gain: 0.32, patterns: [[[0, -1, 0, 8], [5, -2, 8, 8]], [[0, -1, 0, 8], [3, -1, 8, 8]]] },
      { voice: 'bass', gain: 0.4, patterns: [[[0, -2, 0, 8], [5, -3, 8, 8]], [[0, -2, 0, 8], [3, -2, 8, 8]]] },
      { voice: 'flute', gain: 0.22, from: 0.3, chance: 0.6, patterns: [[[4, 1, 10, 2], [3, 1, 12, 2], [2, 1, 14, 2]], [[2, 1, 10, 4], [0, 1, 14, 2]]] },
    ],
  },
  bastion: {
    name: 'El Bastión', scale: MIXO_MINOR, root: 174.61, bpm: 64, beats: 16, cutoff: 4200, reverb: 0.45, phrasesBeforePause: [2, 3],
    layers: [
      { voice: 'pluck', gain: 0.42, patterns: [
        [[0, 0, 0, 1], [2, 0, 1, 1], [4, 0, 2, 2], [2, 0, 4, 1], [0, 0, 6, 2], [5, -1, 8, 1], [0, 0, 9, 1], [2, 0, 10, 2], [4, 0, 12, 4]],
        [[0, 0, 0, 2], [4, 0, 2, 2], [5, 0, 4, 2], [4, 0, 6, 2], [3, 0, 8, 2], [2, 0, 10, 2], [0, 0, 12, 4]],
        [[4, 0, 0, 1], [3, 0, 1, 1], [2, 0, 2, 2], [0, 0, 4, 4], [5, -1, 8, 2], [6, -1, 10, 2], [0, 0, 12, 4]],
      ], grace: 0.12 },
      { voice: 'pad', gain: 0.24, patterns: [[[0, -1, 0, 8], [3, -1, 8, 8]], [[5, -2, 0, 8], [0, -1, 8, 8]]] },
      { voice: 'bass', gain: 0.32, patterns: [[[0, -2, 0, 4], [0, -2, 6, 2], [3, -2, 8, 4], [4, -2, 12, 4]]] },
      { voice: 'flute', gain: 0.18, chance: 0.5, patterns: [[[4, 1, 2, 4], [2, 1, 6, 2], [3, 1, 8, 6]], [[0, 2, 4, 4], [6, 1, 8, 4], [4, 1, 12, 4]]] },
    ],
  },
  mazmorra: {
    name: 'La Mazmorra', scale: DORIAN, root: 146.83, bpm: 70, beats: 16, cutoff: 3400, reverb: 0.5, phrasesBeforePause: [2, 4],
    layers: [
      { voice: 'bass', gain: 0.42, patterns: [[[0, -2, 0, 6], [0, -2, 8, 2], [6, -3, 12, 4]], [[0, -2, 0, 4], [3, -2, 4, 4], [4, -2, 8, 4], [0, -2, 12, 4]]] },
      { voice: 'pluck', gain: 0.36, patterns: [
        [[0, 0, 0, 1], [4, 0, 1, 1], [2, 0, 2, 1], [4, 0, 3, 1], [0, 0, 4, 1], [4, 0, 5, 1], [3, 0, 6, 2], [0, 0, 8, 1], [4, 0, 9, 1], [2, 0, 10, 1], [1, 0, 11, 1], [0, 0, 12, 4]],
        [[0, 0, 0, 2], [2, 0, 2, 2], [3, 0, 4, 4], [4, 0, 8, 2], [3, 0, 10, 2], [2, 0, 12, 4]],
        [[4, 0, 0, 1], [5, 0, 1, 1], [4, 0, 2, 2], [2, 0, 4, 4], [0, 0, 8, 2], [6, -1, 10, 2], [0, 0, 12, 4]],
      ], grace: 0.1 },
      { voice: 'pad', gain: 0.22, patterns: [[[0, -1, 0, 16]], [[0, -1, 0, 8], [6, -2, 8, 8]]] },
      { voice: 'drum', gain: 0.3, from: 0.35, chance: 0.6, patterns: [[[null, 0, 0, 1], [null, 0, 6, 1], [null, 0, 8, 1], [null, 0, 14, 1]]] },
    ],
  },
  cripta: {
    name: 'La Cripta', scale: PHRYGIAN, root: 196, bpm: 56, beats: 16, cutoff: 3000, reverb: 0.75, phrasesBeforePause: [2, 3],
    layers: [
      { voice: 'choir', gain: 0.32, patterns: [[[0, -1, 0, 8], [1, -1, 8, 8]], [[0, -1, 0, 6], [3, -1, 6, 4], [1, -1, 10, 6]], [[4, -1, 0, 8], [3, -1, 8, 8]]] },
      { voice: 'bell', gain: 0.26, chance: 0.7, patterns: [[[0, 1, 0, 4], [1, 1, 10, 6]], [[4, 0, 4, 6]], [[0, 1, 2, 3], [5, 0, 8, 8]]] },
      { voice: 'drone', gain: 0.3, patterns: [[[0, -2, 0, 16]]] },
      { voice: 'flute', gain: 0.14, from: 0.4, chance: 0.4, patterns: [[[1, 1, 6, 2], [0, 1, 8, 6]]] },
    ],
  },
  infierno: {
    name: 'El Infierno', scale: LOCRIAN, root: 130.81, bpm: 84, beats: 16, cutoff: 2600, reverb: 0.4, phrasesBeforePause: [2, 4],
    layers: [
      { voice: 'drone', gain: 0.42, patterns: [[[0, -2, 0, 16]], [[0, -2, 0, 8], [4, -3, 8, 8]]] },
      { voice: 'timpani', gain: 0.5, patterns: [[[null, 0, 0, 2], [null, 0, 3, 1], [null, 0, 8, 2], [null, 0, 11, 1], [null, 0, 12, 1]], [[null, 0, 0, 2], [null, 0, 8, 2], [null, 0, 14, 1], [null, 0, 15, 1]]] },
      { voice: 'metal', gain: 0.16, from: 0.3, chance: 0.6, patterns: [[[0, 0, 0, 2], [1, 0, 4, 2], [4, -1, 8, 4]], [[4, 0, 2, 2], [1, 0, 6, 4]]] },
      { voice: 'bass', gain: 0.38, patterns: [[[0, -2, 0, 3], [0, -2, 3, 1], [1, -2, 4, 4], [0, -2, 8, 3], [4, -3, 12, 4]]] },
    ],
  },
  combat: {
    name: 'Combate', scale: AEOLIAN, root: 146.83, bpm: 120, beats: 16, cutoff: 4600, reverb: 0.25, phrasesBeforePause: null,
    layers: [
      { voice: 'drum', gain: 0.5, patterns: [[[null, 0, 0, 1], [null, 0, 2, 1], [null, 0, 3, 1], [null, 0, 4, 1], [null, 0, 6, 1], [null, 0, 8, 1], [null, 0, 10, 1], [null, 0, 11, 1], [null, 0, 12, 1], [null, 0, 14, 1], [null, 0, 15, 1]]] },
      { voice: 'shaker', gain: 0.14, patterns: [[...Array.from({ length: 16 }, (_, i) => [null, 0, i + 0.5, 0.5] as [null, number, number, number])]] },
      { voice: 'bass', gain: 0.42, patterns: [
        [[0, -2, 0, 1], [0, -2, 1, 1], [0, -2, 2, 1], [5, -3, 3, 1], [0, -2, 4, 1], [0, -2, 5, 1], [6, -3, 6, 2], [0, -2, 8, 1], [0, -2, 9, 1], [0, -2, 10, 1], [3, -2, 11, 1], [4, -2, 12, 2], [3, -2, 14, 2]],
        [[0, -2, 0, 1], [0, -2, 1, 1], [3, -2, 2, 1], [0, -2, 3, 1], [5, -3, 4, 2], [6, -3, 6, 2], [0, -2, 8, 1], [0, -2, 9, 1], [4, -2, 10, 2], [3, -2, 12, 4]],
      ] },
      { voice: 'pluck', gain: 0.3, patterns: [[[0, 0, 0, 1], [2, 0, 1, 1], [4, 0, 2, 1], [2, 0, 3, 1], [0, 0, 4, 1], [2, 0, 5, 1], [4, 0, 6, 1], [5, 0, 7, 1], [4, 0, 8, 1], [2, 0, 9, 1], [3, 0, 10, 1], [2, 0, 11, 1], [1, 0, 12, 2], [6, -1, 14, 2]]] },
      // Élite y jefe: más capas (intensidad alta)
      { voice: 'timpani', gain: 0.45, from: 0.7, patterns: [[[null, 0, 0, 2], [null, 0, 4, 2], [null, 0, 8, 2], [null, 0, 12, 1], [null, 0, 13, 1], [null, 0, 14, 2]]] },
      { voice: 'choir', gain: 0.22, from: 0.7, patterns: [[[0, -1, 0, 8], [5, -2, 8, 8]], [[0, -1, 0, 8], [6, -2, 8, 8]]] },
      { voice: 'bass', gain: 0.2, from: 0.85, patterns: [[[0, -3, 0, 8], [5, -4, 8, 8]]] },
    ],
  },
};

/** Variación por subzona: el tema de su zona, cada vez más grave, cerrado y tenso al bajar. */
export interface SubzoneVariation {
  /** Semitonos sobre la tónica de la pista. */
  transpose: number;
  /** Multiplica el tempo. */
  tempo: number;
  /** Multiplica el corte del filtro. */
  cutoff: number;
  /** Intensidad base (capas que entran). */
  intensity: number;
  /** Probabilidad de cambiar una nota por su vecina disonante. */
  dissonance: number;
  ambient: AmbientId[];
}

export const SUBZONE_MUSIC: Record<string, SubzoneVariation> = {
  afueras:    { transpose: 0,  tempo: 1,    cutoff: 1.1,  intensity: 0.2,  dissonance: 0,    ambient: ['viento', 'hoguera'] },
  castillo:   { transpose: -2, tempo: 0.97, cutoff: 1,    intensity: 0.35, dissonance: 0.04, ambient: ['viento', 'antorchas'] },
  calabozos:  { transpose: -3, tempo: 0.94, cutoff: 0.85, intensity: 0.5,  dissonance: 0.08, ambient: ['goteo', 'cadenas'] },
  osario:     { transpose: 0,  tempo: 1,    cutoff: 1,    intensity: 0.3,  dissonance: 0.04, ambient: ['huesos', 'viento'] },
  catacumbas: { transpose: -2, tempo: 0.96, cutoff: 0.85, intensity: 0.45, dissonance: 0.08, ambient: ['agua', 'goteo'] },
  panteon:    { transpose: -3, tempo: 0.93, cutoff: 0.75, intensity: 0.6,  dissonance: 0.12, ambient: ['eco'] },
  carmesi:    { transpose: 0,  tempo: 1,    cutoff: 1,    intensity: 0.35, dissonance: 0.08, ambient: ['latido', 'goteo'] },
  puertas:    { transpose: -1, tempo: 1.03, cutoff: 0.9,  intensity: 0.5,  dissonance: 0.12, ambient: ['vientoCaliente'] },
  rios:       { transpose: -2, tempo: 1.06, cutoff: 0.8,  intensity: 0.65, dissonance: 0.15, ambient: ['lava', 'vientoCaliente'] },
  trono:      { transpose: -4, tempo: 1.1,  cutoff: 0.7,  intensity: 0.85, dissonance: 0.2,  ambient: ['retumbos', 'cadenas'] },
};
export const DEFAULT_VARIATION: SubzoneVariation = { transpose: 0, tempo: 1, cutoff: 1, intensity: 0.4, dissonance: 0, ambient: ['viento'] };

/** Interruptores (13/11, noche):
 *  · musicaActivada: las 6 pistas GENERADAS por código (con su capa de peligro y sus fanfarrias). Apagadas.
 *  · ambienteActivado: el sonido ambiente de cada subzona (goteo, viento, antorchas, lava…). Apagado.
 *  · listasActivadas: la música de archivo (PLAYLISTS, abajo; rutas relativas a /play/). Encendida: suena en el menú y el Bastión. */
export const musicaActivada = false;
export const ambienteActivado = false;
export const listasActivadas = true;

/** Listas de música de archivo. Cada una suena en sus pantallas, alternando pistas sin repetir la misma dos veces
 *  seguidas, con una pausa en silencio al azar entre una y otra. En las pantallas que no están en ninguna lista
 *  (mazmorra, combate y resultados) no hay música. Para añadir pistas: copia OGG + MP3 a public/audio y añádelas aquí. */
export interface FileTrack { id: string; name: string; ogg: string; mp3: string; gain?: number; origen: string }
export interface Playlist { screens: string[]; tracks: FileTrack[]; pause: [number, number]; fadeIn: number; fadeOut: number; gain: number }

export const PLAYLISTS: Record<string, Playlist> = {
  bastion: {
    // Menú principal, elegir y crear personaje, copia de seguridad y todo el Bastión (todas las pestañas del lobby)
    screens: ['boot', 'title', 'select', 'create', 'backup', 'lobby'],
    tracks: [
      { id: 'estampie', name: 'Medieval Estampie', ogg: '../audio/medieval-estampie.ogg', mp3: '../audio/medieval-estampie.mp3', origen: 'Magnific (biblioteca de audio)' },
      { id: 'whisper', name: 'Whisper of the Bow', ogg: '../audio/whisper-of-the-bow.ogg', mp3: '../audio/whisper-of-the-bow.mp3', origen: 'Magnific (biblioteca de audio)' },
    ],
    pause: [5, 15],
    fadeIn: 2,
    fadeOut: 2,
    gain: 0.8,
  },
};

export const MUSIC_CFG = {
  /** Volumen relativo de cada parte bajo el general (los de Ajustes multiplican). */
  mix: { music: 0.55, ambient: 0.4, fanfare: 0.7 },
  /** Pausa con solo ambiente entre bloques de frases (segundos). */
  pause: [10, 30] as [number, number],
  /** Fundido cruzado al cambiar de pista, de zona o de situación (segundos). */
  crossfade: 2.2,
  /** Entrada y salida del combate (segundos). */
  combatFade: 1.2,
  /** Combate: «normal» (1), «low» o «off». */
  combatLevel: { normal: 1, low: 0.4, off: 0 },
  /** Élites y jefes: más tempo e intensidad sobre la pista de combate. */
  eliteBoost: { tempo: 1.1, intensity: 1 },
  normalCombatIntensity: 0.4,
  /** Peligro: capa de tensión con poca vida o poco tiempo para el portal. */
  danger: { hpBelow: 0.25, timeBelowMs: 2 * 60_000, gain: 0.35 },
  /** Mientras suena una fanfarria, la música baja a este nivel. */
  duck: 0.25,
  /** Variación del tempo entre frases (±). */
  tempoJitter: 0.03,
  /** Modo ligero (móviles lentos): sin reverberación y con menos capas. */
  light: { maxLayers: 3 },
};
