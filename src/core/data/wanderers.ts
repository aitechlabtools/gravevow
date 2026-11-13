// ════════════════════════════════════════════════════════════════════
// Mercenarios errantes: NPCs que encuentras dentro de la mazmorra y que pueden acompañarte esa expedición.
// No son los de Garra Roja (esos se contratan en el refugio y nunca traicionan). Todo editable.
// El aspecto provisional está en shared/art.ts → MONSTER_SPECS con la clave de `sprite`.
// ════════════════════════════════════════════════════════════════════
import { g } from '../gender';
import type { Stats } from '../types';
import type { BasicAttack } from '../combat';
import type { ZoneId } from './zones/types';

export interface WandererLines {
  /** Al acercarte la primera vez. */
  greet: string[];
  /** Al hablar (se van rotando). */
  talk: string[];
  join: string;
  refuse?: string;
  fair: string;
  greedy: string;
  /** Le das algo, pero poco. */
  stingy?: string;
  /** En el portal, al pedir su parte («{n}» es la cantidad). */
  demand?: string;
  /** Si te niegas a pagarle. */
  refused?: string;
  /** Aviso antes de traicionar (siempre hay uno). */
  warn: string;
  betray: string;
  rob?: string;
  leave: string;
  /** Al extraer juntos. */
  farewell: string;
  /** Errantes hostiles: lo que gritan al verte. */
  hostile?: string;
  /** Al encontrarlo cuando ya llevas otro aliado (solo cabe uno). */
  rivalry?: string;
  /** Tras verte traicionar a tu aliado anterior para quedarte con él. */
  witness?: string;
  /** Kael con la confianza baja: saludos recelosos. */
  greetLow?: string[];
}

export interface WandererDef {
  id: string;
  name: string;
  title: string;
  sprite: string;
  /** Zonas donde puede aparecer. */
  zones: ZoneId[];
  /** Estadísticas a nivel 1 (crecen con el nivel del combate como las criaturas). */
  stats: Stats;
  skills: string[];
  basicAttack: BasicAttack;
  resourceName: string;
  lines: WandererLines;
  /** Lo que lleva encima (se recupera si cae). */
  gear?: string[];
  /** Solo para el tutorial (nunca sale en expediciones normales). */
  tutorialOnly?: boolean;
}

const s = (maxHp: number, atk: number, def: number, mag: number, res: number, spd: number, crit = 9, eva = 8): Stats => ({ maxHp, maxMp: 30, atk, def, mag, res, spd, crit, eva });

export const WANDERERS: Record<string, WandererDef> = {
  kael: {
    id: 'kael', name: 'Kael el Errante', title: 'Mercenario veterano', sprite: 'rival', zones: ['mazmorra'],
    gear: ['bone_dagger', 'leather_hood', 'swift_boots', 'old_coin', 'health_potion'],
    stats: s(105, 17, 9, 4, 8, 14, 12, 10), skills: ['venom_strike', 'backstab'], resourceName: 'Energía',
    basicAttack: { name: 'Cuchillada', kind: 'physical', power: 1, fx: 'slash' },
    lines: {
      greet: [
        'Kael: «Baja la voz. Lo que vive aquí oye mejor que tú.»',
        'Kael: «Otra vez tú. Empiezo a pensar que me sigues.»',
        'Kael: «Mira quién sigue viv{o|a}. Me alegro, de verdad.»',
      ],
      talk: [
        'Kael: «Vendí mi espada a la orden del Bastión antes de que cayera. Desde entonces bajo solo.»',
        'Kael: «Si el reloj llega a cero, aquí abajo te quedas. No lo olvides.»',
        'Kael: «Los que corren mueren cansados. Los que se paran mueren antes. Camina.»',
        'Kael: «Si muero, mi linterna es tuya. No la apagues.»',
      ],
      rivalry: 'Kael: «Ya tienes compañía. Yo no comparto hoguera con desconocidos… salvo que me lo pidas tú.»',
      greetLow: [
        'Kael: «Otra vez tú. Me aliaré, que el oro no entiende de rencores. Pero esta vez dormiré con un ojo abierto.»',
        'Kael: «Mantén las manos donde pueda verlas y hablamos.»',
      ],
      hostile: 'Kael: «Te dije que no olvidaba. Aquí se acaba.»',
      witness: 'Kael: «Ya he visto lo que haces con quien te sigue. No me des la espalda.»',
      join: 'Kael: «Vamos juntos. Repartimos a partes iguales. Y si no, también: lo que no quieras, me lo quedo.»',
      fair: 'Kael: «{Justo y honrado|Justa y honrada}. Así da gusto.»',
      greedy: 'Kael: «Ya veo cómo funciona esto…» Kael te mira en silencio.',
      stingy: 'Kael: «¿Esto es mi mitad? Tienes un concepto curioso de «a partes iguales».»',
      demand: 'Kael: «Antes de cruzar, lo mío. {n} monedas, como acordamos.»',
      refused: 'Kael: «Llevo demasiados años en esto para que un crío me tome el pelo.»',
      warn: 'Kael: «He tenido una mala racha, {chico|chica}…» Su mano descansa sobre la daga.',
      betray: 'Kael: «Nada personal. Es que tu mochila pesa demasiado para ti.»',
      leave: 'Kael: «Así que aquí se separan nuestros caminos. Que la cripta te sea leve.»',
      farewell: 'Kael: «Hasta la próxima bajada. Y no te fíes de nadie más.»',
    },
  },
  // ── La Mazmorra ──
  brann: {
    id: 'brann', name: 'Brann el Cazarrecompensas', title: 'Ballestero', sprite: 'wand_brann', zones: ['mazmorra'],
    stats: s(96, 18, 8, 2, 7, 12, 14, 8), skills: ['aimed_shot', 'thrust'], resourceName: 'Energía',
    basicAttack: { name: 'Virote', kind: 'physical', power: 1, fx: 'slash' },
    lines: {
      greet: ['Brann: «Busco a un desertor con precio. Si me ayudas, comparto. Si me estorbas, también cobro por ti.»'],
      talk: ['Brann: «El oro es oro, venga de un bandido o de un muerto.»', 'Brann: «Mantén las antorchas a tu espalda. Ciegan a los arqueros.»'],
      rivalry: 'Brann: «Ya llevas perro, por lo que veo. Suéltalo y mi ballesta es tuya. Si no, sigue andando y no me estorbes.»',
      join: 'Brann: «Trato. Tú delante, yo detrás. Así nadie se queda sin parte.»',
      fair: 'Brann: «Así se hacen los tratos.»', greedy: 'Brann: «Apunto la deuda. Siempre cobro.»',
      warn: 'Brann tensa la ballesta sin dejar de mirarte.', betray: 'Brann: «Tu cabeza no vale mucho. Tu mochila sí.»',
      leave: 'Brann: «Como quieras. Que te vaya bien… o no.»', farewell: 'Brann: «Buen negocio. Nos veremos abajo.»',
    },
  },
  sela: {
    id: 'sela', name: 'Sela Dedos Finos', title: 'Ladrona', sprite: 'wand_sela', zones: ['mazmorra', 'cripta'],
    stats: s(88, 16, 7, 3, 7, 16, 16, 14), skills: ['backstab', 'dirty_cut'], resourceName: 'Energía',
    basicAttack: { name: 'Estilete', kind: 'physical', power: 1, fx: 'slash' },
    lines: {
      greet: ['Sela: «Tranquil{o|a}, solo estaba mirando. ¿Ese cofre es tuyo? Qué pena.»'],
      talk: ['Sela: «Abro cualquier cerradura. Las de las personas también.»', 'Sela: «No me mires así. Hoy he venido a trabajar honradamente.»'],
      rivalry: 'Sela: «Uy, ya vas acompañad{o|a}. Qué pena. Si te cansas de esa cara, yo sigo por aquí.»',
      join: 'Sela: «Me apunto. Tú pegas, yo abro. Y repartimos, palabra.»',
      fair: 'Sela: «Vaya, un caballero. Quedan pocos.»', greedy: 'Sela: «Muy bien. Lo recordaré cuando no mires.»',
      warn: 'Sela no deja de mirar tu mochila. Sonríe demasiado.', betray: 'Sela: «Lo siento, de verdad. Bueno, no tanto.»',
      rob: 'Sela te quita algo de la mochila y echa a correr hacia el portal.',
      leave: 'Sela: «Una lástima. Íbamos a hacernos ricos.»', farewell: 'Sela: «Ha sido un placer. Revisa tus bolsillos, por si acaso.»',
    },
  },
  // ── La Cripta ──
  odo: {
    id: 'odo', name: 'Hermano Odo', title: 'Monje exorcista', sprite: 'wand_odo', zones: ['cripta'],
    stats: s(100, 8, 8, 18, 14, 10, 8, 6), skills: ['holy_light', 'prayer'], resourceName: 'Fe',
    basicAttack: { name: 'Bastón bendito', kind: 'magical', power: 1, fx: 'dark' },
    lines: {
      greet: ['Hermano Odo: «Que la luz te guarde, {viajero|viajera}. Aquí abajo la necesitamos los dos.»'],
      talk: ['Hermano Odo: «Los muertos de Umbravel eran mis hermanos. Vengo a darles descanso.»', 'Hermano Odo: «La plata bendita les quema. Llévala si puedes.»'],
      rivalry: 'Hermano Odo: «Veo que la luz ya te ha dado compañía. Si tu camino cambia, aquí rezaré.»',
      join: 'Hermano Odo: «Caminaré a tu lado. Lo que encontremos servirá a la orden… y a ti.»',
      fair: 'Hermano Odo: «Tu generosidad no pasará inadvertida.»', greedy: 'Hermano Odo: «La codicia también es una cripta.»',
      warn: 'Hermano Odo murmura una oración que no reconoces. Sus ojos brillan de otra forma.',
      betray: 'Hermano Odo: «La orden necesita fondos. Perdóname… o no.»',
      leave: 'Hermano Odo: «Ve con la luz. Yo seguiré solo.»', farewell: 'Hermano Odo: «Rezaré por tu próxima bajada.»',
    },
  },
  varga: {
    id: 'varga', name: 'Varga la Saqueatumbas', title: 'Saqueadora', sprite: 'wand_varga', zones: ['cripta'],
    stats: s(110, 19, 10, 2, 8, 11, 12, 6), skills: ['brutal_blow', 'skull_splitter'], resourceName: 'Furia',
    basicAttack: { name: 'Pala de hierro', kind: 'physical', power: 1, fx: 'smash' },
    lines: {
      greet: ['Varga: «Llegas tarde. Lo bueno ya lo he sacado yo. Bueno, casi todo.»'],
      talk: ['Varga: «Los nobles se enterraban con sus joyas. Error suyo.»', 'Varga: «Si oyes cantar, corre. No preguntes.»'],
      rivalry: 'Varga: «Dos ya sois mucha gente para una tumba. Elige: o él o yo.»',
      join: 'Varga: «Dos palas cavan más que una. Vamos.»',
      fair: 'Varga: «Bien repartido. Así da gusto saquear.»', greedy: 'Varga: «Vale. La próxima tumba es mía entera.»',
      warn: 'Varga sopesa la pala mirando tu nuca.', betray: 'Varga: «Una tumba más no se nota.»',
      leave: 'Varga: «Tú te lo pierdes.»', farewell: 'Varga: «Buena excavación. Hasta la próxima.»',
    },
  },
  // ── El Infierno ──
  malek: {
    id: 'malek', name: 'Malek el Condenado', title: 'Caballero caído', sprite: 'wand_malek', zones: ['infierno'],
    stats: s(130, 20, 12, 4, 9, 9, 10, 4), skills: ['hell_cleave', 'block'], resourceName: 'Furia',
    basicAttack: { name: 'Espada negra', kind: 'physical', power: 1, fx: 'slash' },
    lines: {
      greet: ['Malek: «¿Viv{o|a}? ¿Aquí? Entonces o eres valiente o eres idiota. Me sirven los dos.»'],
      talk: ['Malek: «Belzar me encadenó. Las rompí. Ahora busco la salida, como tú.»', 'Malek: «El calor no mata. Lo que vive en el calor, sí.»'],
      rivalry: 'Malek: «Deja a ese perro y camina conmigo. Prometo… lo de siempre.»',
      join: 'Malek: «Juntos, entonces. Hasta el portal.»',
      fair: 'Malek: «Bien. Hay honor hasta en el Infierno.»', greedy: 'Malek: «El Infierno enseña a cobrarse las deudas.»',
      warn: 'Malek respira hondo. Las marcas de sus cadenas empiezan a brillar.', betray: 'Malek: «Belzar me prometió la libertad por tu alma.»',
      leave: 'Malek: «Vete. Antes de que cambie de idea.»', farewell: 'Malek: «Respira aire limpio por mí.»',
      hostile: 'Malek: «¡Otra alma para Belzar!»',
    },
  },
  iskra: {
    id: 'iskra', name: 'Iskra la Renegada', title: 'Piromante', sprite: 'wand_iskra', zones: ['infierno'],
    stats: s(92, 6, 7, 22, 12, 13, 12, 10), skills: ['fireball', 'ember_rain'], resourceName: 'Maná',
    basicAttack: { name: 'Llamarada', kind: 'magical', power: 1, fx: 'fire' },
    lines: {
      greet: ['Iskra: «El fuego de aquí abajo canta. ¿No lo oyes? Ya lo oirás.»'],
      talk: ['Iskra: «Vine a robarle una llama a Belzar. Todavía no la he encontrado.»', 'Iskra: «El azufre se enciende con mirarlo. Ni lo mires.»'],
      rivalry: 'Iskra: «Tu amigo arde poco. Cámbialo por mí y verás lo que es fuego.»',
      join: 'Iskra: «Me vienes bien. Los demonios atacan primero a quien va delante.»',
      fair: 'Iskra: «Mmm. Generos{o|a}. Qué raro.»', greedy: 'Iskra: «Arde por dentro, ¿eh? Como yo.»',
      warn: 'Iskra juega con una llama entre los dedos y te mira de reojo.', betray: 'Iskra: «Lo siento. El fuego quiere lo que quiere.»',
      rob: 'Iskra te arranca algo de la mochila y huye entre las llamas hacia el portal.',
      leave: 'Iskra: «Allá tú. Arderás igual.»', farewell: 'Iskra: «Sobrevivir sienta bien. Repítelo.»',
      hostile: 'Iskra: «¡Tu equipo arderá mejor sin ti dentro!»',
    },
  },
  // ── Tutorial ──
  osric: {
    id: 'osric', name: 'Osric Dedos Largos', title: 'Ratero', sprite: 'wand_osric', zones: ['mazmorra'], tutorialOnly: true,
    stats: s(60, 10, 4, 0, 4, 11, 6, 6), skills: ['dirty_cut'], resourceName: 'Energía',
    basicAttack: { name: 'Navaja', kind: 'physical', power: 0.9, fx: 'slash' },
    lines: {
      greet: ['Osric: «¡Eh, eh! No me mires así. Solo me caliento. ¿Vas hacia el castillo? Yo también.»'],
      talk: ['Osric: «Conozco estas murallas como mis bolsillos. Bueno, como los bolsillos de otros.»'],
      rivalry: 'Osric: «Ya tienes quien te guarde la espalda, ¿eh? Yo solo miraba.»',
      join: 'Osric: «¡Trato hecho! Tú delante, yo te cubro. Palabra de Osric.»',
      fair: 'Osric: «¡Qué detalle!»', greedy: 'Osric: «Vaya. Bueno.»',
      warn: 'Osric mira tu mochila y se relame. «Bonita espada, ¿eh?»',
      betray: 'Osric: «¡Lo siento, compañero! Esa espada vale más que tu amistad.»',
      leave: 'Osric: «¡Tú te lo pierdes!»', farewell: 'Osric: «…»',
    },
  },
};

/** El errante, con sus frases ya concordadas con el género del personaje ({o|a}, ver core/gender.ts). */
export function getWanderer(id: string): WandererDef {
  const w = WANDERERS[id] ?? WANDERERS.kael;
  const lines = Object.fromEntries(Object.entries(w.lines).map(([k, v]) => [k, Array.isArray(v) ? v.map((x) => g(x)) : typeof v === 'string' ? g(v) : v]));
  return { ...w, lines: lines as WandererDef['lines'] };
}

/** Errantes que pueden salir en una zona (sin Kael, que tiene su propia regla, ni el del tutorial). */
export function wanderersOf(zone: ZoneId): WandererDef[] {
  return Object.values(WANDERERS).filter((w) => w.id !== 'kael' && !w.tutorialOnly && w.zones.includes(zone));
}
