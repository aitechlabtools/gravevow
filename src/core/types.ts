// Tipos compartidos del núcleo de Gravevow.
// El núcleo es TypeScript puro: sin Phaser, sin React, sin DOM.
// Así se puede probar con tests y reutilizar en un futuro servidor autoritativo.

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ItemCategory =
  | 'weapon' | 'shield' | 'helmet' | 'armor' | 'gloves' | 'boots' | 'ring' | 'amulet'
  | 'potion' | 'material' | 'relic' | 'jewel' | 'key' | 'quest' | 'coin' | 'tool'
  /** Sacos de oro (contenedores). `cover`: casilla tapada por un objeto de varias casillas (interno, no se ve). */
  | 'container' | 'cover' | 'gold' | 'bag'
  /** Planos de crafteo (bloque 2): se aprenden y desaparecen. */
  | 'blueprint';

export type EquipSlot = 'mainHand' | 'offHand' | 'helmet' | 'armor' | 'gloves' | 'boots' | 'ring' | 'amulet';

export const EQUIP_SLOTS: EquipSlot[] = ['mainHand', 'offHand', 'helmet', 'armor', 'gloves', 'boots', 'ring', 'amulet'];

export type StatKey = 'maxHp' | 'maxMp' | 'atk' | 'def' | 'mag' | 'res' | 'spd' | 'crit' | 'eva';
export type Stats = Record<StatKey, number>;

export const STAT_KEYS: StatKey[] = ['maxHp', 'maxMp', 'atk', 'def', 'mag', 'res', 'spd', 'crit', 'eva'];

export type ClassId = 'warrior' | 'mage' | 'rogue' | 'cleric';

export type ItemEffect =
  | { kind: 'heal'; amount: number }
  | { kind: 'mana'; amount: number }
  | { kind: 'cleanse' }
  /** Kit de campo: repara parte del equipo (solo fuera de combate). */
  | { kind: 'repair' }
  /** Tratamientos de la anatomía (venda, hemostático, torniquete, férula, cirugía): se aplican a una región. */
  | { kind: 'treat'; treat: 'bandage' | 'hemostatic' | 'tourniquet' | 'splint' | 'surgery' | 'painkiller' }
  /** Comida y bebida (Fase 5): suben Saciedad, Hidratación o Descanso. Fuera de combate. */
  /** Bombas y frascos (bloque 2, fase 6): se lanzan en combate, gastan el turno. Cifras en config/bombs.ts. */
  | { kind: 'bomb'; bomb: string }
  | { kind: 'need'; sat?: number; hyd?: number; rest?: number; /** Plato del Refugio (Fase 9): ventaja para la siguiente incursión; solo se come en el Bastión. */ dish?: boolean };

/** Familias de armas y objetos de mano izquierda (ver data/weapons.ts). */
export type WeaponFamily =
  | 'sword' | 'axe' | 'mace' | 'spear' | 'dagger' | 'greatsword' | 'greataxe'
  | 'staff' | 'wand' | 'scepter' | 'greatstaff'
  | 'shield' | 'tome' | 'orb' | 'torch';

/** Recurso de combate: Ímpetu para lo físico (Guerrero), Maná para lo mágico (Mago y futuras clases mágicas). */
export type ResourceKind = 'impetus' | 'mana';

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ItemCategory;
  rarity: Rarity;
  value: number;
  slot?: EquipSlot;
  stats?: Partial<Stats>;
  classes?: ClassId[];
  levelReq?: number;
  /** Tamaño máximo de pila. 1 = no apilable. */
  stack?: number;
  /** Objetos de varias casillas (el saco de oro ocupa 2×2). Sin valor: 1×1. Ver core/inventory.ts (casillas tapadas). */
  size?: { w: number; h: number };
  use?: ItemEffect;
  /** Familia del arma o de la secundaria (decide quién puede llevarla y su estilo). */
  family?: WeaponFamily;
  /** Armas a dos manos: dan sus 4 especiales y no dejan llevar nada en la mano izquierda. */
  hands?: 1 | 2;
  /** Ataques especiales que da en combate (2, o 4 si es a dos manos). Sin valor: los primeros de `grants`. */
  specials?: string[];
  /** Pociones: recurso que recuperan (solo las puede beber quien usa ese recurso). */
  resource?: ResourceKind;
  /** Rareza mínima y máxima con la que puede salir (por defecto, solo la suya). */
  rarityRange?: [Rarity, Rarity];
  /** Ataque básico que da el arma (solo mano principal). */
  attack?: AttackDef;
  /** Herramientas: usos que tiene nueva. */
  uses?: number;
  /** Picos: segundos que se tarda en picar una veta. */
  mineTime?: number;
  /** Habilidades que concede mientras está equipado. */
  grants?: string[];
  /** Equipo de recluta (Bloque 1, fase 9): prestado por el Bastión. No se vende, no se desguaza y no se pierde al morir. */
  recruit?: boolean;
}

export interface ItemStack {
  uid: string;
  itemId: string;
  qty: number;
  /** Calidad de forja (0 tosca, 1 buena, 2 magistral). Solo objetos forjados. */
  quality?: number;
  /** Quién lo forjó. */
  forgedBy?: string;
  /** Usos que le quedan a una herramienta (p. ej. un pico). Sin valor = nueva. */
  uses?: number;
  /** Durabilidad de un arma o pieza de armadura (sin valor = entera). Ver core/durability.ts. */
  dur?: number;
  /** Monedas que lleva un saquito o un saco de oro. */
  gold?: number;
  /** Rareza de este ejemplar (sin valor: la del objeto). */
  rarity?: Rarity;
  /** Girado 90° en la rejilla (Fase 6): ancho y alto cambiados. */
  rot?: boolean;
  /** Atributos aleatorios de este ejemplar (ids de data/rarity.ts, p. ej. «vampire»). */
  affixes?: string[];
  /** Runas grabadas en el Atril rúnico (un id por hueco; null = hueco vacío). */
  runes?: (string | null)[];
}

export type Grid = (ItemStack | null)[];
export type Equipment = Record<EquipSlot, ItemStack | null>;

export type StatusId = 'poison' | 'burn' | 'freeze' | 'stun' | 'bleed' | 'protect' | 'regen' | 'empower' | 'block' | 'endure' | 'evade' | 'weaken' | 'ward' | 'sunder';

export interface StatusInstance {
  id: StatusId;
  turns: number;
}

export type DamageKind = 'physical' | 'magical';

export interface StatusApplication {
  status: StatusId;
  chance: number; // 0..1
  turns: number;
  /** Si es true se aplica al lanzador en vez de al objetivo. */
  self?: boolean;
}

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  target: 'enemy' | 'self';
  kind?: DamageKind;
  power?: number;
  /** Curación como fracción de la vida máxima del lanzador. */
  healPct?: number;
  applies?: StatusApplication[];
  /** Daño extra contra no-muertos (para el Clérigo). */
  bonusVsUndead?: number;
  ignoresEvasion?: boolean;
  /** Fracción de la defensa del objetivo que se ignora (0..1). */
  armorPierce?: number;
  /** Recurso que recupera el lanzador. */
  manaGain?: number;
  /** Turnos que hay que esperar para volver a usarla (0 o sin valor: sin espera). */
  cooldown?: number;
  /** Golpea a todos los enemigos. */
  aoe?: boolean;
  /** Te curas esta fracción del daño hecho. */
  lifesteal?: number;
  /** Pierdes esta fracción de tu vida máxima al usarla (nunca te mata). */
  selfDamagePct?: number;
  /** Deja todas tus otras recargas a 0. */
  resetCooldowns?: boolean;
  /** Escudo que absorbe daño: fracción de tu vida máxima (dura lo que el estado «Escudo de maná»). */
  shieldPct?: number;
  fx: 'slash' | 'fire' | 'frost' | 'shield' | 'poison' | 'holy' | 'dark' | 'bite' | 'smash';
}

export interface AttackDef {
  name: string;
  kind: DamageKind;
  power: number;
  fx: SkillDef['fx'];
}

/** Género del personaje: decide la cara y la concordancia de los textos (ver core/gender.ts). */
export type Sex = 'm' | 'f';

/** Aspecto elegido al crear el personaje (índices de src/core/data/appearance.ts). Los campos opcionales
 *  no existen en partidas antiguas: se leen con los valores por defecto de la clase (`fullLook`). */
export interface Appearance {
  cloak: number;
  skin: number;
  sex?: Sex;
  hair?: number;
  style?: number;
  beard?: number;
}

export interface CharacterData {
  name: string;
  classId: ClassId;
  appearance: Appearance;
  level: number;
  xp: number;
}

export interface QuestProgress {
  id: string;
  progress: number;
  claimed: boolean;
  /** La has aceptado del tablón: solo avanzan las aceptadas (máximo MAX_ACTIVE_QUESTS a la vez). */
  accepted?: boolean;
  /** Fijada: se recuerda en Jugar y en la mazmorra. */
  pinned?: boolean;
}

export interface ProfileStats {
  expeditions: number;
  extractions: number;
  deaths: number;
  kills: number;
}

export interface Settings {
  volume: number; // 0..1, general
  music: boolean;
  /** Volumen de la música y de los efectos (0..1), bajo el general. */
  musicVolume: number;
  sfxVolume: number;
  /** Última sección abierta del panel de Ajustes. */
  settingsTab?: string;
}

export type MercStance = 'aggressive' | 'cautious';

/** Contrato en vigor con un mercenario de Garra Roja. */
export interface Contract {
  mercId: string;
  /** Expediciones que quedan (incluida la próxima). */
  left: number;
  stance: MercStance;
}

export interface Profile {
  /** Fase 10: cayó en la última incursión (la curación completa cuesta 1 moneda, o nada si no tiene). */
  fallen?: boolean;
  /** Bloque 1, fase 9: ya pidió el equipo de recluta al intendente desde la última vuelta al Bastión. */
  recruitClaimed?: boolean;
  /** 2 = escala de niveles 1–100. Los perfiles de la versión 1 se migran al cargarlos. */
  version: 2;
  character: CharacterData;
  gold: number;
  backpack: Grid;
  /** Páginas propias del almacén, seguidas (120 casillas cada una; ver core/stashPages.ts). */
  stash: Grid;
  /** Página «Compartido» (de la cuenta, la ven todos los personajes); null si aún no se ha comprado. */
  shared: Grid | null;
  equipment: Equipment;
  quests: QuestProgress[];
  stats: ProfileStats;
  /** Reputación con cada vendedor (orvel, vesper, garra, brand). */
  reputation: Record<string, number>;
  /** Bestiario: criaturas vistas y derrotadas. */
  bestiary: Record<string, { seen: number; kills: number }>;
  /** Bolsillo seguro: lo que guardes aquí no se pierde al morir. */
  pocket: Grid;
  /** Jefes derrotados al menos una vez (abren el acceso a la zona siguiente). */
  bossesDefeated: string[];
  /** Atuendos (skins): los comprados y el que llevas puesto. Fuera del inventario: morir no los toca. */
  skins: { owned: string[]; equipped: string | null };
  /** Contrato de mercenario en vigor (máximo uno). */
  contract: Contract | null;
  /** Mercenarios rescatados de la mazmorra: ya se pueden contratar con Garra Roja. */
  mercsRescued: string[];
  /** Rescatados que aún tienen el descuento del primer contrato. */
  mercDiscounts: string[];
  /** Marca de expedición en curso, para detectar recargas a mitad de partida. */
  activeExpedition: { startedAt: number } | null;
  tutorialSeen: { lobby: boolean; dungeon: boolean };
  /** Heridas que traes de la última incursión (ya estabilizadas en el Bastión). Sin valor: entero. */
  wounds?: { pct: Partial<Record<'head' | 'thorax' | 'abdomen' | 'armL' | 'armR' | 'legL' | 'legR', number>>; fractures: ('head' | 'thorax' | 'abdomen' | 'armL' | 'armR' | 'legL' | 'legR')[] } | null;
  /** Saciedad, Hidratación y Descanso (Fase 5) al volver al Bastión. Sin valor: llenas. */
  needs?: { sat: number; hyd: number; rest: number } | null;
  /** Refugio (Fase 9): nivel de cada módulo. Sin valor: todo a 0. */
  refuge?: { cot: number; kitchen: number; bench: number; infirmary?: number; forge?: number; alchemy?: number; runic?: number; v?: 2 };
  /** Preparación para la siguiente incursión (catre mejorado, plato). Se gasta al bajar. */
  prep?: { cot?: boolean | number; dish?: string; dishCut?: number } | null;
  /** Receta en el fogón (ingredientes ya gastados): se retoma al volver a la cocina. */
  cooking?: { recipe: string; events: number[]; picks: ('low' | 'mid' | 'high')[] } | null;
  /** Recetas cocinadas al menos una vez (abren la producción normal por lotes). */
  cooked?: string[];
  /** Trabajo en el yunque de Brand o en la mesa de Eldrin (materiales ya gastados, lecturas fijadas). */
  workshop?: { station: 'forge' | 'alchemy'; recipe: string; readings: number[]; picks: ('up' | 'hold' | 'down')[] } | null;
  /** Recetas de forja y alquimia hechas al menos una vez (abren la producción rápida). */
  crafted?: string[];
  /** Planos aprendidos (bloque 2): ids de los objetos plano. No se pierden. */
  blueprints?: string[];
  /** Recepción de excedentes (Fase 9): lo que no cupo al recibirlo. Solo se retira, se vende, se desguaza o se descarta. */
  reception?: ItemStack[];
  /** Tiempo de juego activo acumulado en expediciones (ms, reloj de juego). Formato de guardado 4. */
  playMs?: number;
  /** Tutorial guiado de la primera expedición completado (o saltado). Las partidas con expediciones lo tienen hecho. */
  tutorialDone: boolean;
  /** Kael el Errante: expediciones a la Mazmorra seguidas sin encontrarlo (para la aparición garantizada). */
  kael: { missStreak: number; met?: number; /** Antiguo rencor (ya no se usa: ver `trust`). */ grudge?: number; /** Puntos de traición: deciden su confianza (config/wanderers.ts, KAEL_TRUST). */ trust?: number };
  /** Habilidades de clase: las desbloqueadas (la primera es la inicial) y la que llevas equipada. */
  classSkills: { unlocked: string[]; equipped: string };
  /** Mochila puesta (decide cuántas casillas tiene la mochila). No se pierde al morir. */
  bag: ItemStack;
  /** El oro ya es físico (monedas en el almacén). Sin valor: partida de antes, se convierte al cargarla. */
  goldPhysical?: boolean;
  /** Última subzona a la que se bajó (la tarjeta de Jugar la propone de nuevo). */
  lastSubzone: string | null;
  /** Subzonas a las que ya se ha bajado (para «primera vez» del resumen). Sin valor en partidas antiguas: se deducen de `lastSubzone`. */
  visitedSubzones?: string[];
  settings: Settings;
  createdAt: number;
}
