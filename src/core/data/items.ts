import type { ItemDef, Rarity } from '../types';

// Catálogo de objetos basado en datos. Añadir un objeto = añadir una entrada.
export const RARITY_INFO: Record<Rarity, { name: string; color: string; order: number }> = {
  common: { name: 'Común', color: '#9a9a9a', order: 0 },
  uncommon: { name: 'Poco común', color: '#5fbf4a', order: 1 },
  rare: { name: 'Raro', color: '#4a8fe0', order: 2 },
  epic: { name: 'Épico', color: '#a35ae0', order: 3 },
  legendary: { name: 'Legendario', color: '#e8b33a', order: 4 },
};

import { SLASH, CHOP, STAB, BOLT, SMITE } from './attacks';
import { CRIPTA_ITEMS } from './zones/cripta';
import { INFIERNO_ITEMS } from './zones/infierno';
import { FORGED_ITEMS } from './forge';
import { SUBZONE_ITEMS } from './subzoneItems';
import { CRAFT_MATERIALS, BLUEPRINT_ITEMS } from './crafting';
import { RUNE_ITEMS } from './runes';
import { foodUse } from '../../config/food';

// Clases que pueden usar cada familia: la clase define quién eres, el arma cómo luchas.
const W = ['warrior'] as const;
const M = ['mage'] as const;

const list: ItemDef[] = [
  // ── Espadas (Guerrero) ─────────────────────────────────
  { id: 'rusty_sword', name: 'Espada oxidada', description: 'Ha visto días mejores. Todavía corta.', icon: 'sword', category: 'weapon', slot: 'mainHand', family: 'sword', rarity: 'common', value: 12, levelReq: 1, stats: { atk: 4 }, classes: [...W], attack: SLASH, grants: ['rending_slash', 'thrust'] },
  { id: 'iron_sword', name: 'Espada de hierro', description: 'Forjada en las fraguas del Bastión.', icon: 'sword', category: 'weapon', slot: 'mainHand', family: 'sword', rarity: 'uncommon', value: 45, levelReq: 7, stats: { atk: 7, crit: 2 }, classes: [...W], attack: SLASH, grants: ['rending_slash', 'thrust'] },
  { id: 'knight_sword', name: 'Espada del caballero', description: 'Equilibrada, honesta y letal.', icon: 'sword_knight', category: 'weapon', slot: 'mainHand', family: 'sword', rarity: 'rare', value: 150, levelReq: 14, stats: { atk: 11, crit: 4, def: 2 }, classes: [...W], attack: SLASH, grants: ['rending_slash', 'thrust', 'pommel_strike'] },
  { id: 'dread_blade', name: 'Hoja del Pavor', description: 'Quien la empuña deja de soñar.', icon: 'sword_dread', category: 'weapon', slot: 'mainHand', family: 'sword', rarity: 'epic', value: 420, levelReq: 24, stats: { atk: 15, crit: 6 }, classes: [...W], attack: SLASH, grants: ['rending_slash', 'pommel_strike', 'dread_cut'] },
  // ── Hachas (Guerrero) ──────────────────────────────────
  { id: 'battle_axe', name: 'Hacha de batalla', description: 'Pesada pero fiable.', icon: 'axe', category: 'weapon', slot: 'mainHand', family: 'axe', rarity: 'uncommon', value: 50, levelReq: 7, stats: { atk: 9, spd: -1 }, classes: [...W], attack: CHOP, grants: ['brutal_blow', 'skull_splitter'] },
  { id: 'executioner_axe', name: 'Hacha del verdugo', description: 'Pesada, cruel, definitiva.', icon: 'axe_exec', category: 'weapon', slot: 'mainHand', family: 'axe', rarity: 'rare', value: 160, levelReq: 14, stats: { atk: 13, crit: 5, spd: -1 }, classes: [...W], attack: CHOP, grants: ['brutal_blow', 'skull_splitter'] },
  { id: 'bonereaver', name: 'Segadora de huesos', description: 'Su filo está hecho de algo que gritaba.', icon: 'axe_bone', category: 'weapon', slot: 'mainHand', family: 'axe', rarity: 'epic', value: 440, levelReq: 24, stats: { atk: 20, crit: 6, spd: -2 }, classes: [...W], attack: CHOP, grants: ['brutal_blow', 'skull_splitter', 'reaping'] },
  // ── Báculos (Mago) ─────────────────────────────────────
  { id: 'apprentice_staff', name: 'Báculo de aprendiz', description: 'Madera de fresno con una runa tímida.', icon: 'staff', category: 'weapon', slot: 'mainHand', family: 'staff', rarity: 'common', value: 12, levelReq: 1, stats: { mag: 4, maxMp: 5 }, classes: [...M], attack: BOLT, grants: ['frost_lance', 'spark'] },
  { id: 'ember_staff', name: 'Báculo de brasas', description: 'Su punta nunca termina de enfriarse.', icon: 'staff_fire', category: 'weapon', slot: 'mainHand', family: 'staff', rarity: 'uncommon', value: 50, levelReq: 7, stats: { mag: 8, maxMp: 8 }, classes: [...M], attack: BOLT, grants: ['fireball', 'ember_rain'] },
  { id: 'frost_staff', name: 'Báculo del invierno eterno', description: 'Escarcha en la madera, aunque haga calor.', icon: 'staff_frost', category: 'weapon', slot: 'mainHand', family: 'staff', rarity: 'rare', value: 160, levelReq: 14, stats: { mag: 12, maxMp: 12, res: 3 }, classes: [...M], attack: BOLT, grants: ['frost_lance', 'blizzard', 'ice_prison'] },
  { id: 'runic_staff', name: 'Bastón rúnico de Umbravel', description: 'Susurra nombres que nadie debería recordar.', icon: 'staff_rune', category: 'weapon', slot: 'mainHand', family: 'staff', rarity: 'epic', value: 440, levelReq: 24, stats: { mag: 18, maxMp: 18, crit: 4 }, classes: [...M], attack: BOLT, grants: ['fireball', 'blizzard', 'dark_nova'] },
  // ── Dagas (Pícaro, preparado) y mazas (Clérigo, preparado) ──
  { id: 'bone_dagger', name: 'Daga de hueso', description: 'Tallada a partir de algo que antes caminaba.', icon: 'dagger', category: 'weapon', slot: 'mainHand', family: 'dagger', rarity: 'uncommon', value: 40, levelReq: 1, stats: { atk: 5, crit: 6, spd: 2 }, classes: ['rogue'], attack: STAB, grants: ['venom_strike', 'backstab'] },
  { id: 'blessed_mace', name: 'Maza bendita', description: 'Lleva grabada una oración a medio borrar.', icon: 'mace', category: 'weapon', slot: 'mainHand', family: 'mace', rarity: 'common', value: 14, levelReq: 1, stats: { atk: 3, mag: 3 }, classes: ['cleric'], attack: SMITE, grants: ['holy_light'] },

  // ── Escudos (Guerrero, Clérigo) ────────────────────────
  { id: 'wooden_shield', name: 'Escudo de madera', description: 'Mejor que nada. Por poco.', icon: 'shield', category: 'shield', slot: 'offHand', family: 'shield', rarity: 'common', value: 10, levelReq: 1, stats: { def: 3 }, classes: ['warrior', 'cleric'], grants: ['block'] },
  { id: 'iron_shield', name: 'Escudo de hierro', description: 'Abollado por mil golpes que no llegaron.', icon: 'shield_steel', category: 'shield', slot: 'offHand', family: 'shield', rarity: 'uncommon', value: 45, levelReq: 7, stats: { def: 5, maxHp: 5 }, classes: ['warrior', 'cleric'], grants: ['block', 'shield_bash'] },
  { id: 'bastion_shield', name: 'Escudo del Bastión', description: 'Hierro remachado con el emblema de una orden caída.', icon: 'shield_iron', category: 'shield', slot: 'offHand', family: 'shield', rarity: 'rare', value: 150, levelReq: 14, stats: { def: 8, res: 4, maxHp: 10 }, classes: ['warrior', 'cleric'], grants: ['block', 'shield_bash', 'iron_wall'] },
  // ── Tomos (Mago, Clérigo) ──────────────────────────────
  { id: 'arcane_tome', name: 'Tomo arcano', description: 'Páginas que se pasan solas.', icon: 'tome', category: 'relic', slot: 'offHand', family: 'tome', rarity: 'uncommon', value: 55, levelReq: 7, stats: { mag: 3, maxMp: 10 }, classes: ['mage', 'cleric'], grants: ['arcane_barrier'] },
  { id: 'eclipse_grimoire', name: 'Grimorio del eclipse', description: 'Al abrirlo, la luz de la sala se apaga un poco.', icon: 'tome_dark', category: 'relic', slot: 'offHand', family: 'tome', rarity: 'epic', value: 400, levelReq: 24, stats: { mag: 7, maxMp: 20, res: 5 }, classes: ['mage'], grants: ['arcane_barrier', 'mana_siphon'] },

  // ── Cabeza ────────────────────────────────────────────
  { id: 'leather_hood', name: 'Capucha de cuero', description: 'Huele a lluvia y a humo.', icon: 'hood', category: 'helmet', slot: 'helmet', rarity: 'common', value: 8, levelReq: 1, stats: { def: 1, eva: 2 } },
  { id: 'iron_helm', name: 'Yelmo de hierro', description: 'Abollado, pero entero.', icon: 'helm', category: 'helmet', slot: 'helmet', rarity: 'uncommon', value: 40, levelReq: 7, stats: { def: 4, maxHp: 10 }, classes: ['warrior', 'cleric'] },
  { id: 'knight_helm', name: 'Yelmo del caballero', description: 'La cimera roja aún no ha perdido el color.', icon: 'helm_knight', category: 'helmet', slot: 'helmet', rarity: 'rare', value: 140, levelReq: 14, stats: { def: 6, maxHp: 18, res: 2 }, classes: ['warrior'] },
  { id: 'wizard_hat', name: 'Sombrero del erudito', description: 'Bordado con constelaciones olvidadas.', icon: 'hat', category: 'helmet', slot: 'helmet', rarity: 'uncommon', value: 40, levelReq: 7, stats: { mag: 3, res: 3 }, classes: ['mage'] },

  // ── Torso ─────────────────────────────────────────────
  // ── Equipo de recluta (Bloque 1, fase 9): un 15 % peor que el inicial; el Bastión lo presta ──
  // Tutorial: el arma de la hoguera, un poco mejor que la del equipo inicial de cada clase
  { id: 'short_sword', name: 'Espada corta', description: 'Hoja recta y bien equilibrada. Alguien la dejó junto a una hoguera.', icon: 'sword', category: 'weapon', slot: 'mainHand', family: 'sword', rarity: 'common', value: 16, levelReq: 1, stats: { atk: 5, crit: 1 }, classes: [...W], attack: SLASH, grants: ['rending_slash', 'thrust'] },
  { id: 'ash_staff', name: 'Báculo de fresno', description: 'Fresno curado al humo, con una runa que aún brilla.', icon: 'staff', category: 'weapon', slot: 'mainHand', family: 'staff', rarity: 'common', value: 14, levelReq: 1, stats: { mag: 5, maxMp: 6 }, classes: [...M], attack: BOLT, grants: ['frost_lance', 'spark'] },
  { id: 'keen_dagger', name: 'Daga afilada', description: 'Acero fino, recién afilado. Corta antes de que la veas.', icon: 'dagger', category: 'weapon', slot: 'mainHand', family: 'dagger', rarity: 'common', value: 34, levelReq: 1, stats: { atk: 6, crit: 6, spd: 2 }, classes: ['rogue'], attack: STAB, grants: ['venom_strike', 'backstab'] },
  { id: 'iron_mace', name: 'Maza de hierro', description: 'Cabeza de hierro sobre mango de roble. Sencilla y contundente.', icon: 'mace', category: 'weapon', slot: 'mainHand', family: 'mace', rarity: 'common', value: 18, levelReq: 1, stats: { atk: 4, mag: 3 }, classes: ['cleric'], attack: SMITE, grants: ['holy_light'] },
  { id: 'recruit_sword', name: 'Espada de recluta', description: 'Hierro blando del armero del Bastión. Equipo de recluta: no se vende ni se pierde al morir.', icon: 'sword', category: 'weapon', slot: 'mainHand', family: 'sword', rarity: 'common', value: 0, levelReq: 1, stats: { atk: 3 }, classes: [...W], attack: SLASH, grants: ['rending_slash', 'thrust'], recruit: true },
  { id: 'plank_shield', name: 'Escudo de tablas', description: 'Tablas clavadas a toda prisa. Equipo de recluta: no se vende ni se pierde al morir.', icon: 'shield', category: 'shield', slot: 'offHand', family: 'shield', rarity: 'common', value: 0, levelReq: 1, stats: { def: 2 }, classes: ['warrior', 'cleric'], grants: ['block'], recruit: true },
  { id: 'recruit_doublet', name: 'Jubón de recluta', description: 'Huele a los que lo llevaron antes. Equipo de recluta: no se vende ni se pierde al morir.', icon: 'tunic', category: 'armor', slot: 'armor', rarity: 'common', value: 0, levelReq: 1, stats: { def: 2, maxHp: 4 }, recruit: true },
  { id: 'recruit_staff', name: 'Bastón de recluta', description: 'Una vara con una runa a medio borrar. Equipo de recluta: no se vende ni se pierde al morir.', icon: 'staff', category: 'weapon', slot: 'mainHand', family: 'staff', rarity: 'common', value: 0, levelReq: 1, stats: { mag: 3, maxMp: 4 }, classes: [...M], attack: BOLT, grants: ['frost_lance', 'spark'], recruit: true },
  { id: 'worn_grimoire', name: 'Grimorio gastado', description: 'Faltan la mitad de las páginas. Equipo de recluta: no se vende ni se pierde al morir.', icon: 'tome', category: 'relic', slot: 'offHand', family: 'tome', rarity: 'common', value: 0, levelReq: 1, stats: { maxMp: 3 }, classes: ['mage', 'cleric'], grants: ['arcane_barrier'], recruit: true },
  { id: 'recruit_robe', name: 'Túnica de recluta', description: 'Lino remendado mil veces. Equipo de recluta: no se vende ni se pierde al morir.', icon: 'robe', category: 'armor', slot: 'armor', rarity: 'common', value: 0, levelReq: 1, stats: { def: 1, res: 3, maxMp: 4 }, classes: ['mage', 'cleric'], recruit: true },
  { id: 'padded_tunic', name: 'Jubón acolchado', description: 'Ropa de recluta.', icon: 'tunic', category: 'armor', slot: 'armor', rarity: 'common', value: 10, levelReq: 1, stats: { def: 3, maxHp: 5 } },
  { id: 'chainmail', name: 'Cota de malla', description: 'Cada anilla, una promesa.', icon: 'chainmail', category: 'armor', slot: 'armor', rarity: 'uncommon', value: 60, levelReq: 7, stats: { def: 7, maxHp: 15, spd: -1 }, classes: ['warrior', 'cleric'] },
  { id: 'bastion_plate', name: 'Coraza del Bastión', description: 'La última armadura que salió de sus fraguas.', icon: 'plate', category: 'armor', slot: 'armor', rarity: 'epic', value: 420, levelReq: 24, stats: { def: 11, maxHp: 28, res: 4, spd: -1 }, classes: ['warrior'] },
  { id: 'linen_robe', name: 'Túnica de lino', description: 'Ligera y discreta.', icon: 'robe', category: 'armor', slot: 'armor', rarity: 'common', value: 10, levelReq: 1, stats: { def: 1, res: 4, maxMp: 5 }, classes: ['mage', 'cleric'] },
  { id: 'shadow_robe', name: 'Túnica de las sombras', description: 'La oscuridad se pliega a su alrededor.', icon: 'robe_dark', category: 'armor', slot: 'armor', rarity: 'rare', value: 130, levelReq: 14, stats: { def: 3, res: 8, mag: 4, maxMp: 10 }, classes: ['mage', 'cleric'] },
  { id: 'archmage_robe', name: 'Túnica del archimago', description: 'Hilo de oro y paciencia de siglos.', icon: 'robe_gold', category: 'armor', slot: 'armor', rarity: 'epic', value: 420, levelReq: 24, stats: { def: 5, res: 12, mag: 10, maxMp: 20 }, classes: ['mage'] },

  // ── Manos y pies ──────────────────────────────────────
  { id: 'leather_gloves', name: 'Guantes de cuero', description: 'Agarre firme.', icon: 'gloves', category: 'gloves', slot: 'gloves', rarity: 'common', value: 8, levelReq: 1, stats: { atk: 1, crit: 1 } },
  { id: 'gauntlets', name: 'Guanteletes de acero', description: 'Puños que no se rinden.', icon: 'gauntlets', category: 'gloves', slot: 'gloves', rarity: 'uncommon', value: 35, levelReq: 7, stats: { atk: 2, def: 2 }, classes: ['warrior', 'cleric'] },
  { id: 'worn_boots', name: 'Botas gastadas', description: 'Conocen muchos caminos.', icon: 'boots', category: 'boots', slot: 'boots', rarity: 'common', value: 8, levelReq: 1, stats: { spd: 1, def: 1 } },
  { id: 'swift_boots', name: 'Botas del correveidile', description: 'Para quien sabe cuándo huir.', icon: 'boots_swift', category: 'boots', slot: 'boots', rarity: 'rare', value: 110, levelReq: 14, stats: { spd: 4, eva: 4 } },

  // ── Joyería ───────────────────────────────────────────
  { id: 'copper_ring', name: 'Anillo de cobre', description: 'Deja la piel verde.', icon: 'ring', category: 'jewel', slot: 'ring', rarity: 'common', value: 15, levelReq: 1, stats: { maxHp: 6 } },
  { id: 'ring_of_embers', name: 'Anillo de ascuas', description: 'Tibio al tacto, siempre.', icon: 'ring_red', category: 'jewel', slot: 'ring', rarity: 'rare', value: 150, levelReq: 14, stats: { mag: 4, atk: 4, crit: 3 } },
  { id: 'bone_amulet', name: 'Amuleto de hueso', description: 'Protege de lo que viene de abajo.', icon: 'amulet', category: 'jewel', slot: 'amulet', rarity: 'uncommon', value: 45, levelReq: 7, stats: { res: 4, maxHp: 8 } },
  { id: 'heart_of_umbravel', name: 'Corazón de Umbravel', description: 'Late. Despacio. Contigo.', icon: 'amulet_heart', category: 'jewel', slot: 'amulet', rarity: 'legendary', value: 900, levelReq: 24, stats: { maxHp: 30, mag: 6, atk: 6, res: 6, def: 4 } },

  // ── Consumibles ───────────────────────────────────────
  { id: 'health_potion', name: 'Poción de vida', description: 'Restaura 45 puntos de vida (o el 18% de tu vida máxima, si es más).', icon: 'potion_red', category: 'potion', rarity: 'common', value: 20, stack: 5, use: { kind: 'heal', amount: 45 } },
  { id: 'mana_potion', name: 'Poción de maná', description: 'Restaura 25 puntos de maná (o el 35% del máximo, si es más). Para magos.', icon: 'potion_blue', category: 'potion', rarity: 'common', value: 20, stack: 5, use: { kind: 'mana', amount: 25 }, resource: 'mana' },
  { id: 'focus_tonic', name: 'Tónico de concentración', description: 'Restaura 25 puntos de ímpetu (o el 35% del máximo, si es más). Para guerreros.', icon: 'potion_orange', category: 'potion', rarity: 'common', value: 20, stack: 5, use: { kind: 'mana', amount: 25 }, resource: 'impetus' },
  { id: 'antidote', name: 'Antídoto amargo', description: 'Elimina veneno y quemadura en combate (y el sangrado de quien no tiene anatomía). No cierra heridas: para eso, vendas.', icon: 'potion_green', category: 'potion', rarity: 'uncommon', value: 25, stack: 5, use: { kind: 'cleanse' } },

  // ── Tesoros y materiales ──────────────────────────────
  // ── Minería ───────────────────────────────────────────
  { id: 'miner_pick', name: 'Pico de minero', description: 'Para picar vetas de mineral en las paredes de la mazmorra. Se desgasta con el uso.', icon: 'pick', category: 'tool', rarity: 'common', value: 40, stack: 1, uses: 12, mineTime: 2.6 },
  { id: 'steel_pick', name: 'Pico de acero', description: 'Más duro y más rápido. Brand lo templa para los que bajan hondo.', icon: 'pick_steel', category: 'tool', rarity: 'uncommon', value: 220, stack: 1, uses: 30, mineTime: 1.6 },
  // ── Tratamientos (anatomía, Fase 4): se aplican a una región; en combate gastan el turno ──
  { id: 'bandage', name: 'Venda', description: 'Detiene un sangrado leve en una región. No devuelve la vida perdida.', icon: 'bandage', category: 'potion', rarity: 'common', value: 10, stack: 5, use: { kind: 'treat', treat: 'bandage' } },
  { id: 'hemostatic', name: 'Hemostático', description: 'Polvo coagulante de la orden. Detiene un sangrado grave en cualquier región (también uno leve, pero es un desperdicio).', icon: 'hemostatic', category: 'potion', rarity: 'uncommon', value: 30, stack: 3, use: { kind: 'treat', treat: 'hemostatic' } },
  { id: 'tourniquet', name: 'Torniquete', description: 'Detiene un sangrado (leve o grave) en un brazo o una pierna. No sirve en la cabeza, el tórax ni el abdomen.', icon: 'tourniquet', category: 'potion', rarity: 'common', value: 18, stack: 3, use: { kind: 'treat', treat: 'tourniquet' } },
  { id: 'splint', name: 'Férula', description: 'Fija un hueso roto de un brazo o una pierna: quita la fractura, pero no recupera vida.', icon: 'splint', category: 'potion', rarity: 'common', value: 22, stack: 3, use: { kind: 'treat', treat: 'splint' } },
  { id: 'painkiller', name: 'Analgésico alquímico', description: 'Adormece el dolor de fracturas y miembros inutilizados durante 10 pulsos (o rondas): quita su penalización extra. No cura ni detiene hemorragias.', icon: 'painkiller', category: 'potion', rarity: 'uncommon', value: 24, stack: 3, use: { kind: 'treat', treat: 'painkiller' } },
  { id: 'surgery_kit', name: 'Equipo de cirugía', description: 'Fuera de combate y en dos pulsos, devuelve el uso a un miembro o al abdomen inutilizado (20 % de vida, máximo al 60 % hasta el Bastión). Una vez por región e incursión; si te interrumpen, se pierde.', icon: 'surgery_kit', category: 'potion', rarity: 'rare', value: 90, stack: 1, use: { kind: 'treat', treat: 'surgery' } },
  // ── Comida y bebida (Fase 5): fuera de combate ──
  { id: 'ration', name: 'Ración de viaje', description: 'Pan duro, cecina y queso envueltos en tela encerada. Recupera 30 de Saciedad.', icon: 'ration', category: 'potion', rarity: 'common', value: 6, stack: 5, use: foodUse('ration') },
  { id: 'water', name: 'Odre de agua', description: 'Agua del pozo del Bastión, con regusto a cuero. Recupera 30 de Hidratación.', icon: 'water', category: 'potion', rarity: 'common', value: 5, stack: 5, use: foodUse('water') },
  { id: 'stale_bread', name: 'Pan duro', description: 'Hogaza de hace días. Recupera 20 de Saciedad.', icon: 'stale_bread', category: 'potion', rarity: 'common', value: 3, stack: 5, use: foodUse('stale_bread') },
  { id: 'wrinkled_apple', name: 'Manzana arrugada', description: 'Del huerto muerto tras la muralla. Recupera 10 de Saciedad y 10 de Hidratación.', icon: 'wrinkled_apple', category: 'potion', rarity: 'common', value: 3, stack: 5, use: foodUse('wrinkled_apple') },
  { id: 'jerky', name: 'Cecina', description: 'Carne seca y prensada: ocupa poco y pesa menos. Recupera 35 de Saciedad.', icon: 'jerky', category: 'potion', rarity: 'common', value: 7, stack: 5, use: foodUse('jerky') },
  { id: 'aged_cheese', name: 'Queso curado', description: 'Duro como la piedra y igual de fiable. Recupera 25 de Saciedad y 3 de Descanso.', icon: 'aged_cheese', category: 'potion', rarity: 'common', value: 6, stack: 5, use: foodUse('aged_cheese') },
  { id: 'watered_wine', name: 'Vino aguado', description: 'Más agua que vino, pero templa los nervios. Recupera 20 de Hidratación y 5 de Descanso.', icon: 'watered_wine', category: 'potion', rarity: 'common', value: 6, stack: 5, use: foodUse('watered_wine') },
  { id: 'bitter_tea', name: 'Té de raíz amarga', description: 'Infusión de la enfermería. Recupera 25 de Hidratación y 3 de Descanso.', icon: 'bitter_tea', category: 'potion', rarity: 'common', value: 9, stack: 5, use: foodUse('bitter_tea') },
  { id: 'repair_kit', name: 'Kit de reparación', description: 'Remaches, cuero y piedra de afilar. Fuera de combate devuelve parte de la durabilidad a todo lo que llevas puesto y a tus picos.', icon: 'repair_kit', category: 'tool', rarity: 'common', value: 45, stack: 3, use: { kind: 'repair' } },
  // ── Cocina del Refugio (Fase 9): ingredientes de Garth y platos ──
  { id: 'salted_meat', name: 'Carne en salazón', description: 'Tiras de carne de bestia curadas en sal. Garth las cocina; cruda, mejor no.', icon: 'salted_meat', category: 'material', rarity: 'common', value: 5, stack: 10 },
  { id: 'cave_mushroom', name: 'Setas de galería', description: 'Crecen donde no llega la luz. Dan cuerpo al caldo.', icon: 'cave_mushroom', category: 'material', rarity: 'common', value: 3, stack: 10 },
  { id: 'hearty_stew', name: 'Guiso del Bastión', description: 'Espeso y caliente. Recupera 40 de Saciedad y 10 de Hidratación y, en la siguiente incursión, gastas un 10 % menos de Descanso. Se come en el Bastión.', icon: 'stew', category: 'potion', rarity: 'uncommon', value: 4, stack: 3, use: foodUse('hearty_stew') },
  { id: 'spiced_broth', name: 'Caldo especiado', description: 'Pica en la garganta y asienta el estómago. Recupera 30 de Hidratación y 10 de Saciedad y, en la siguiente incursión, gastas un 10 % menos de Saciedad e Hidratación. Se come en el Bastión.', icon: 'broth', category: 'potion', rarity: 'uncommon', value: 4, stack: 3, use: foodUse('spiced_broth') },
  // ── Desguace (Fase 9): lo que sale de despiezar equipo en el taller de Orik ──
  { id: 'scrap_metal', name: 'Chatarra', description: 'Remaches, hebillas y trozos de hoja. Orik la usa para reconstruir el Bastión.', icon: 'scrap_metal', category: 'material', rarity: 'common', value: 4, stack: 20 },
  { id: 'leather_scrap', name: 'Retales de cuero', description: 'Cuero curtido aprovechable de correas y jubones.', icon: 'leather_scrap', category: 'material', rarity: 'common', value: 3, stack: 20 },
  { id: 'arcane_shard', name: 'Esquirla arcana', description: 'Un fragmento que aún zumba. Sale de bastones, tomos y joyas.', icon: 'arcane_shard', category: 'material', rarity: 'uncommon', value: 6, stack: 20 },
  { id: 'copper_ore', name: 'Mena de cobre', description: 'Piedra verdosa con vetas rojizas. Se pica en la Mazmorra.', icon: 'ore_copper', category: 'material', rarity: 'common', value: 8, stack: 10 },
  { id: 'iron_ore', name: 'Mena de hierro', description: 'Pesada y oscura. Brand la funde para templar hojas.', icon: 'ore_iron', category: 'material', rarity: 'uncommon', value: 14, stack: 10 },
  { id: 'silver_ore', name: 'Mena de plata', description: 'Plata en bruto de las galerías de la Cripta.', icon: 'ore_silver', category: 'material', rarity: 'uncommon', value: 24, stack: 10 },
  { id: 'bone_dust', name: 'Polvo de hueso', description: 'Los alquimistas pagan por él.', icon: 'dust', category: 'material', rarity: 'common', value: 6, stack: 10 },
  { id: 'bat_wing', name: 'Ala de murciélago', description: 'Fina como el pergamino.', icon: 'wing', category: 'material', rarity: 'common', value: 5, stack: 10 },
  { id: 'old_coin', name: 'Moneda antigua', description: 'Acuñada por un reino que ya no existe.', icon: 'coin', category: 'coin', rarity: 'uncommon', value: 15, stack: 20 },
  { id: 'golden_chalice', name: 'Cáliz dorado', description: 'Aún conserva restos de vino oscuro.', icon: 'chalice', category: 'relic', rarity: 'rare', value: 180, stack: 1 },
  { id: 'blood_gem', name: 'Gema de sangre', description: 'Brilla más cuando alguien muere cerca.', icon: 'gem_red', category: 'jewel', rarity: 'epic', value: 260, stack: 1 },
  { id: 'crypt_key', name: 'Llave de la cripta', description: 'Fría y pesada. Abre algo, en algún lugar.', icon: 'key', category: 'key', rarity: 'uncommon', value: 30, stack: 1 },
  // ── Oro físico: sacos (ver config/gold.ts) ──
  { id: 'gold_coins', name: 'Monedas de oro', description: 'Oro del Bastión. Pesa: si lo llevas encima, lo arriesgas.', icon: 'coins', category: 'gold', rarity: 'common', value: 1, stack: 10 },
  { id: 'gold_pouch', name: 'Saquito de oro', description: 'Guarda hasta 50 monedas en una casilla. Cabe en el bolsillo seguro.', icon: 'pouch', category: 'container', rarity: 'common', value: 50, stack: 1 },
  // Mejoras de mochila del Coleccionista (no son objetos: al comprarlas, la mochila crece para siempre)
  { id: 'backpack_basic', name: 'Mochila de cuero', description: '24 casillas (6×4). La que llevan todos los que bajan por primera vez.', icon: 'bag1', category: 'bag', rarity: 'common', value: 10, stack: 1 },
  { id: 'backpack_30', name: 'Mochila reforzada', description: '30 casillas (6×5). La mochila puesta no se pierde al morir.', icon: 'bag2', category: 'bag', rarity: 'uncommon', value: 1500, stack: 1 },
  { id: 'backpack_36', name: 'Mochila de explorador', description: '36 casillas (6×6). La mochila puesta no se pierde al morir.', icon: 'bag3', category: 'bag', rarity: 'rare', value: 6000, stack: 1 },
  { id: 'gold_sack', name: 'Saco de oro', description: 'Saco de arpillera con el cordón bien prieto. Guarda hasta 250 monedas. Ocupa 2×2 casillas y no cabe en el bolsillo seguro.', icon: 'sack', category: 'container', rarity: 'uncommon', value: 250, stack: 1, size: { w: 2, h: 2 } },
  // Casilla tapada por un objeto de 2×2 (no es un objeto de verdad: no se ve, no se vende, no se cuenta)
  { id: 'cover', name: '', description: '', icon: 'coin', category: 'cover', rarity: 'common', value: 0, stack: 1 },
  // ── Llaves de cofres (ver data/chests.ts) ──
  { id: 'iron_key', name: 'Llave de hierro', description: 'Abre los cofres de hierro de la Mazmorra.', icon: 'key', category: 'key', rarity: 'uncommon', value: 40, stack: 5 },
  { id: 'bone_key', name: 'Llave de hueso', description: 'Abre las arcas sepulcrales de la Cripta.', icon: 'key', category: 'key', rarity: 'rare', value: 160, stack: 5 },
  { id: 'sulfur_key', name: 'Llave de azufre', description: 'Abre los cofres infernales. Quema un poco al cogerla.', icon: 'key', category: 'key', rarity: 'epic', value: 420, stack: 5 },
  { id: 'relic_key', name: 'Llave de reliquia', description: 'Abre el relicario sellado que guarda cada jefe.', icon: 'key', category: 'key', rarity: 'epic', value: 300, stack: 5 },
];

// Objetos de la Mazmorra (arriba) + los de cada zona más profunda (archivos de zones/)
export const ITEMS: Record<string, ItemDef> = Object.fromEntries([...list, ...CRIPTA_ITEMS, ...INFIERNO_ITEMS, ...FORGED_ITEMS, ...SUBZONE_ITEMS, ...CRAFT_MATERIALS, ...BLUEPRINT_ITEMS, ...RUNE_ITEMS].map((i) => [i.id, i]));

export function getItem(id: string): ItemDef {
  const def = ITEMS[id];
  if (!def) throw new Error(`Objeto desconocido: ${id}`);
  return def;
}

export function maxStack(id: string): number {
  return getItem(id).stack ?? 1;
}
