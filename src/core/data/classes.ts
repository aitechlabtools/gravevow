import type { ClassId, ResourceKind, Stats } from '../types';

export interface ClassDef {
  id: ClassId;
  name: string;
  /** Nombre en femenino (Guerrera, Maga…). */
  nameF: string;
  tagline: string;
  description: string;
  playable: boolean;
  resourceName: string;
  /** Ímpetu (físico) o Maná (mágico): decide qué poción le sirve (tónico de concentración o poción de maná). */
  resource: ResourceKind;
  resourceRegen: number;
  base: Stats;
  perLevel: Partial<Stats>;
  /** Habilidad de clase inicial (la primera de `classSkills`). */
  classSkill: string;
  /** Las 5 habilidades de clase: la primera al empezar; las otras se desbloquean, a elegir, en los niveles 20, 40, 60 y 80. */
  classSkills: string[];
  /** Familias de armas que puede usar (informativo; el objeto decide con su lista de clases). */
  weapons: string;
  starterKit: { itemId: string; qty: number }[];
  color: string;
  /** Puntos fuertes y débiles (pantalla de crear personaje). */
  pros?: string[];
  cons?: string[];
}

export const CLASSES: Record<ClassId, ClassDef> = {
  warrior: {
    id: 'warrior', name: 'Guerrero', nameF: 'Guerrera', tagline: 'Acero, cicatrices y paciencia.',
    description: 'Vida y defensa elevadas. Aguanta en primera línea y castiga con golpes que hacen sangrar.',
    playable: true, resourceName: 'Ímpetu', resource: 'impetus', resourceRegen: 0,
    base: { maxHp: 120, maxMp: 20, atk: 16, def: 12, mag: 4, res: 8, spd: 9, crit: 5, eva: 3 },
    perLevel: { maxHp: 12, maxMp: 2, atk: 2, def: 2, res: 1 },
    classSkill: 'war_cry', classSkills: ['war_cry', 'bloodthirst', 'hold_line', 'steel_whirl', 'last_bastion'], weapons: 'Espadas, hachas y escudos',
    pros: ['Mucha vida y defensa', 'Sus tajos hacen sangrar', 'Grito de guerra: +30 % de daño durante 3 turnos'],
    cons: ['Lento', 'Casi sin poder mágico', 'Poco ímpetu para encadenar ataques especiales'],
    starterKit: [{ itemId: 'rusty_sword', qty: 1 }, { itemId: 'wooden_shield', qty: 1 }, { itemId: 'padded_tunic', qty: 1 }, { itemId: 'health_potion', qty: 3 }, { itemId: 'focus_tonic', qty: 1 }, { itemId: 'ration', qty: 1 }, { itemId: 'water', qty: 1 }],
    color: '#c0563b',
  },
  mage: {
    id: 'mage', name: 'Mago', nameF: 'Maga', tagline: 'El conocimiento quema.',
    description: 'Daño elemental devastador a cambio de poca resistencia. Gestiona bien tu maná o caerás.',
    playable: true, resourceName: 'Maná', resource: 'mana', resourceRegen: 1,
    base: { maxHp: 92, maxMp: 45, atk: 6, def: 7, mag: 21, res: 12, spd: 11, crit: 6, eva: 5 },
    perLevel: { maxHp: 12, maxMp: 5, mag: 3, def: 1, res: 1 },
    classSkill: 'mana_shield', classSkills: ['mana_shield', 'blink', 'curse_weakness', 'blood_pact', 'abyss_comet'], weapons: 'Báculos y tomos',
    pros: ['Fuego, hielo y sombra según el báculo', 'Escudo de maná: absorbe golpes', 'Quema y congela a sus enemigos'],
    cons: ['Poca vida', 'Poco daño físico', 'Sin maná, está perdido'],
    starterKit: [{ itemId: 'apprentice_staff', qty: 1 }, { itemId: 'linen_robe', qty: 1 }, { itemId: 'health_potion', qty: 3 }, { itemId: 'mana_potion', qty: 1 }, { itemId: 'ration', qty: 1 }, { itemId: 'water', qty: 1 }],
    color: '#7b5ae0',
  },
  rogue: {
    id: 'rogue', name: 'Pícaro', nameF: 'Pícara', tagline: 'Nadie le oye llegar.',
    description: 'Velocidad, evasión y críticos. Envenena y desaparece antes de la respuesta.',
    playable: false, resourceName: 'Ímpetu', resource: 'impetus', resourceRegen: 0,
    base: { maxHp: 90, maxMp: 30, atk: 14, def: 8, mag: 5, res: 8, spd: 16, crit: 15, eva: 12 },
    perLevel: { maxHp: 8, atk: 2, spd: 1, crit: 1 },
    classSkill: 'shadow_veil', classSkills: ['shadow_veil'], weapons: 'Dagas',
    starterKit: [{ itemId: 'bone_dagger', qty: 1 }, { itemId: 'leather_hood', qty: 1 }, { itemId: 'health_potion', qty: 2 }],
    color: '#4fa36b',
  },
  cleric: {
    id: 'cleric', name: 'Clérigo', nameF: 'Clériga', tagline: 'La luz también corta.',
    description: 'Curación, protección y castigo sagrado contra las criaturas de la oscuridad.',
    playable: false, resourceName: 'Maná', resource: 'mana', resourceRegen: 1,
    base: { maxHp: 100, maxMp: 40, atk: 10, def: 11, mag: 15, res: 15, spd: 8, crit: 4, eva: 3 },
    perLevel: { maxHp: 10, maxMp: 4, mag: 2, res: 2 },
    classSkill: 'prayer', classSkills: ['prayer'], weapons: 'Mazas, escudos y tomos',
    starterKit: [{ itemId: 'blessed_mace', qty: 1 }, { itemId: 'wooden_shield', qty: 1 }, { itemId: 'health_potion', qty: 2 }],
    color: '#e0c25a',
  },
};

export const STAT_LABELS: Record<keyof Stats, string> = {
  maxHp: 'Vida', maxMp: 'Recurso', atk: 'Ataque', def: 'Defensa', mag: 'Poder mágico',
  res: 'Resist. mágica', spd: 'Velocidad', crit: 'Crítico %', eva: 'Evasión %',
};
