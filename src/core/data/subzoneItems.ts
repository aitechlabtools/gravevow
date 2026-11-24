// ════════════════════════════════════════════════════════════════════
// Armas, secundarias y equipo nuevos de cada subzona (fase C4 del plan de combate).
// Las estadísticas salen de unas curvas por nivel (abajo) para que bajar de subzona se note; los especiales
// salen de data/skills.ts. Las legendarias (★) tienen nombre propio y un especial único.
// Añadir un objeto = añadir una línea aquí (y su icono y su aspecto en el personaje, que de momento son provisionales).
// ════════════════════════════════════════════════════════════════════
import type { ClassId, ItemDef, Rarity, Stats, WeaponFamily, EquipSlot } from '../types';
import type { SubzoneId } from './subzones';

const W: ClassId[] = ['warrior'];
const M: ClassId[] = ['mage'];
const WM: ClassId[] = ['warrior', 'mage'];

const r = Math.round;
/** Curvas de estadísticas por nivel (editable). */
export const ITEM_CURVES = {
  /** Ataque o poder mágico de un arma a una mano. */
  weapon: (L: number) => r(4 + 0.56 * L),
  /** Las de dos manos pegan más porque no dejan llevar nada en la izquierda. */
  twoHand: 1.4,
  shieldDef: (L: number) => r(3 + 0.32 * L),
  orbMag: (L: number) => r(2 + 0.17 * L),
  helmDef: (L: number) => r(1 + 0.22 * L),
  armorDef: (L: number) => r(2 + 0.36 * L),
};
/** Precio orientativo según nivel y rareza. */
const RARITY_VALUE: Record<Rarity, number> = { common: 1, uncommon: 1.6, rare: 2.6, epic: 4, legendary: 7 };
const val = (L: number, rr: Rarity) => r((10 + L * 6) * RARITY_VALUE[rr]);

interface Base { id: string; name: string; description: string; icon: string; sub: SubzoneId; level: number; rarity: Rarity }

function weapon(b: Base & { family: WeaponFamily; classes: ClassId[]; specials: string[]; stats?: Partial<Stats>; hands?: 1 | 2 }): ItemDef {
  const magic = b.classes.includes('mage') && !b.classes.includes('warrior');
  const main = r(ITEM_CURVES.weapon(b.level) * (b.hands === 2 ? ITEM_CURVES.twoHand : 1));
  const stats: Partial<Stats> = magic ? { mag: main, maxMp: r(4 + 0.3 * b.level) } : { atk: main };
  return {
    id: b.id, name: b.name, description: b.description, icon: b.icon, category: 'weapon', slot: 'mainHand', family: b.family,
    rarity: b.rarity, value: val(b.level, b.rarity), levelReq: b.level, stats: { ...stats, ...b.stats }, classes: b.classes,
    specials: b.specials, grants: b.specials, hands: b.hands,
  };
}

function offhand(b: Base & { family: WeaponFamily; classes: ClassId[]; specials: string[]; stats: Partial<Stats> }): ItemDef {
  return {
    id: b.id, name: b.name, description: b.description, icon: b.icon, category: b.family === 'shield' ? 'shield' : 'relic', slot: 'offHand', family: b.family,
    rarity: b.rarity, value: val(b.level, b.rarity), levelReq: b.level, stats: b.stats, classes: b.classes, specials: b.specials, grants: b.specials,
  };
}

function gear(b: Base & { slot: EquipSlot; stats: Partial<Stats>; classes?: ClassId[]; heavy?: boolean }): ItemDef {
  const category = b.slot === 'ring' || b.slot === 'amulet' ? 'jewel' : b.slot === 'helmet' ? 'helmet' : b.slot === 'armor' ? 'armor' : b.slot;
  return { id: b.id, name: b.name, description: b.description, icon: b.icon, category: category as ItemDef['category'], slot: b.slot, rarity: b.rarity, value: val(b.level, b.rarity), levelReq: b.level, stats: b.stats, classes: b.classes, ...(b.heavy ? { heavy: true } : {}) };
}

const L = (n: number) => n;
export const SUBZONE_ITEMS: (ItemDef & { sub?: SubzoneId })[] = [];
function add(sub: SubzoneId, it: ItemDef) { SUBZONE_ITEMS.push(Object.assign(it, { sub })); }

// ── 1 · Afueras del castillo (1–10): armas oxidadas y de soldado ──
add('afueras', weapon({ id: 'guard_spear', name: 'Lanza de la guardia', description: 'Asta de fresno y punta mellada. La empuñaban los centinelas de la empalizada.', icon: 'spear', sub: 'afueras', level: L(5), rarity: 'common', family: 'spear', classes: W, specials: ['impale', 'keep_at_bay'] }));
add('afueras', weapon({ id: 'birch_wand', name: 'Varita de abedul', description: 'Un palo con una runa grabada a navaja. Rápida y poco más.', icon: 'wand', sub: 'afueras', level: L(4), rarity: 'common', family: 'wand', classes: M, specials: ['spark', 'frost_lance'], stats: { spd: 2 } }));
add('afueras', offhand({ id: 'pitch_torch', name: 'Antorcha de brea', description: 'Arde lento y huele fatal. A las bestias no les gusta nada.', icon: 'torch', sub: 'afueras', level: L(3), rarity: 'common', family: 'torch', classes: WM, specials: ['torch_burn', 'scare'], stats: { atk: 1, mag: 1 } }));
add('afueras', gear({ id: 'sentinel_cap', name: 'Gorro de centinela', description: 'Cuero hervido y un remache por adorno.', icon: 'hood', sub: 'afueras', level: L(4), rarity: 'common', slot: 'helmet', stats: { def: 2, maxHp: 4 } }));
add('afueras', gear({ id: 'leather_bracers', name: 'Brazales de cuero', description: 'Paran un tajo. Uno.', icon: 'gloves', sub: 'afueras', level: L(6), rarity: 'common', slot: 'gloves', stats: { def: 1, atk: 1, eva: 1 } }));

// ── 2 · El castillo (10–20): armas de caballero ──
add('castillo', weapon({ id: 'war_mace', name: 'Maza de armas', description: 'Cabeza de hierro con aletas. Abolla yelmos y orgullos.', icon: 'mace_iron', sub: 'castillo', level: L(14), rarity: 'uncommon', family: 'mace', classes: W, specials: ['crush', 'dull_blow'] }));
add('castillo', offhand({ id: 'parry_dagger', name: 'Daga de parada', description: 'Hoja corta con guarda ancha para desviar estocadas.', icon: 'dagger_steel', sub: 'castillo', level: L(12), rarity: 'uncommon', family: 'dagger', classes: W, specials: ['parry_stab', 'venom_strike'], stats: { atk: 3, eva: 3 } }));
add('castillo', offhand({ id: 'murky_orb', name: 'Orbe turbio', description: 'Dentro se mueve algo, como humo en agua sucia.', icon: 'orb', sub: 'castillo', level: L(13), rarity: 'uncommon', family: 'orb', classes: M, specials: ['arcane_pulse', 'focus'], stats: { mag: ITEM_CURVES.orbMag(13), maxMp: 10 } }));
add('castillo', gear({ id: 'guard_helm', name: 'Yelmo de la guardia', description: 'Con el emblema del castillo rascado a cuchillo.', icon: 'helm', sub: 'castillo', level: L(13), rarity: 'uncommon', slot: 'helmet', stats: { def: ITEM_CURVES.helmDef(13), maxHp: 10 }, classes: W }));
add('castillo', gear({ id: 'courtyard_boots', name: 'Botas de patio', description: 'Suelas de clavos para el empedrado mojado.', icon: 'boots', sub: 'castillo', level: L(16), rarity: 'uncommon', slot: 'boots', stats: { spd: 2, def: 2, eva: 1 } }));

// ── 3 · Los calabozos (20–30): hierro de carcelero ──
add('calabozos', weapon({ id: 'jailer_greatsword', name: 'Mandoble del verdugo', description: 'Tan largo como un hombre. Solo se usaba una vez por condenado.', icon: 'greatsword', sub: 'calabozos', level: L(25), rarity: 'rare', family: 'greatsword', hands: 2, classes: W, specials: ['rending_slash', 'pommel_strike', 'brutal_blow', 'dread_cut'], stats: { spd: -1 } }));
add('calabozos', weapon({ id: 'jailer_greatstaff', name: 'Báculo mayor del carcelero', description: 'Una barra de celda con un cristal atado. Funciona, por desgracia.', icon: 'greatstaff', sub: 'calabozos', level: L(26), rarity: 'rare', family: 'greatstaff', hands: 2, classes: M, specials: ['frost_lance', 'fireball', 'ice_prison', 'dark_nova'] }));
add('calabozos', gear({ id: 'jailer_hood', name: 'Capucha de carcelero', description: 'Negra, sin agujeros para la boca.', icon: 'hood_dark', sub: 'calabozos', level: L(24), rarity: 'uncommon', slot: 'helmet', stats: { def: 4, res: 4, maxHp: 12 } }));
add('calabozos', gear({ id: 'broken_shackles', name: 'Grilletes rotos', description: 'Un anillo hecho con el eslabón que no aguantó.', icon: 'ring', sub: 'calabozos', level: L(27), rarity: 'rare', slot: 'ring', stats: { atk: 4, mag: 4, spd: 1 } }));

// ── 4 · El osario (30–40): hueso ──
add('osario', weapon({ id: 'femur_spear', name: 'Lanza de fémur', description: 'Un fémur de gigante afilado en punta. Aún cruje.', icon: 'spear_bone', sub: 'osario', level: L(35), rarity: 'uncommon', family: 'spear', classes: W, specials: ['impale', 'sweep'] }));
add('osario', weapon({ id: 'vertebra_wand', name: 'Varita de vértebra', description: 'Vértebras ensartadas en un hilo de plata.', icon: 'wand_bone', sub: 'osario', level: L(34), rarity: 'uncommon', family: 'wand', classes: M, specials: ['sepulchral_bolt', 'life_siphon'], stats: { spd: 2 } }));
add('osario', offhand({ id: 'ossuary_orb', name: 'Orbe del osario', description: 'Un cráneo pulido hasta brillar como el cristal.', icon: 'orb_bone', sub: 'osario', level: L(36), rarity: 'rare', family: 'orb', classes: M, specials: ['arcane_pulse', 'life_siphon'], stats: { mag: ITEM_CURVES.orbMag(36), maxMp: 18, res: 4 } }));
add('osario', gear({ id: 'bone_mask', name: 'Máscara de hueso', description: 'La cara de otro, para que la tuya no se vea.', icon: 'helm_bone', sub: 'osario', level: L(33), rarity: 'uncommon', slot: 'helmet', stats: { def: ITEM_CURVES.helmDef(33), res: 5, maxHp: 18 } }));
add('osario', gear({ id: 'phalanx_rosary', name: 'Rosario de falanges', description: 'Cada cuenta, un dedo. Cada dedo, una plegaria.', icon: 'amulet', sub: 'osario', level: L(37), rarity: 'rare', slot: 'amulet', stats: { res: 7, maxHp: 22, mag: 3 } }));

// ── 5 · Las catacumbas (40–50): agua y muerte ──
add('catacumbas', weapon({ id: 'drowned_trident', name: 'Tridente del ahogado', description: 'Lo sacaron del canal con su dueño aún agarrado.', icon: 'spear_sea', sub: 'catacumbas', level: L(45), rarity: 'rare', family: 'spear', classes: W, specials: ['impale', 'keep_at_bay'], stats: { crit: 4 } }));
add('catacumbas', offhand({ id: 'ferryman_lantern', name: 'Farol del barquero', description: 'Su luz verde no ilumina: señala.', icon: 'lantern', sub: 'catacumbas', level: L(44), rarity: 'rare', family: 'torch', classes: WM, specials: ['torch_burn', 'scare'], stats: { atk: 5, mag: 5, res: 6 } }));
add('catacumbas', gear({ id: 'soaked_robe', name: 'Túnica empapada', description: 'Nunca se seca. Nunca.', icon: 'robe_sea', sub: 'catacumbas', level: L(43), rarity: 'uncommon', slot: 'armor', stats: { def: 7, res: 16, mag: 8, maxMp: 14, maxHp: 20 }, classes: M }));
add('catacumbas', gear({ id: 'silt_boots', name: 'Botas de cieno', description: 'Pesan el doble, pero no resbalan.', icon: 'boots', sub: 'catacumbas', level: L(46), rarity: 'uncommon', slot: 'boots', stats: { spd: 3, def: 5, maxHp: 12 } }));
add('catacumbas', gear({ id: 'black_coral_ring', name: 'Anillo de coral negro', description: 'Coral de un mar que no está aquí.', icon: 'ring_sea', sub: 'catacumbas', level: L(48), rarity: 'rare', slot: 'ring', stats: { mag: 6, atk: 6, res: 4 } }));

// ── 6 · El panteón (50–60): nobleza muerta ──
add('panteon', weapon({ id: 'dukes_rapier', name: 'Estoque de los duques', description: 'Fino como una aguja y con su escudo de armas en la cazoleta.', icon: 'sword_noble', sub: 'panteon', level: L(55), rarity: 'epic', family: 'sword', classes: W, specials: ['thrust', 'dread_cut'], stats: { crit: 8, spd: 2 } }));
add('panteon', offhand({ id: 'queens_veil', name: 'Velo de la Reina', description: 'El velo de la Reina Velada. Frío como su mirada.', icon: 'orb_veil', sub: 'panteon', level: L(58), rarity: 'legendary', family: 'orb', classes: M, specials: ['veil_lament', 'focus'], stats: { mag: ITEM_CURVES.orbMag(58) + 6, maxMp: 30, res: 10, maxHp: 20 } }));
add('panteon', gear({ id: 'dukes_crown', name: 'Corona del duque', description: 'Pequeña, de plata vieja. Pesa más de lo que parece.', icon: 'crown', sub: 'panteon', level: L(54), rarity: 'rare', slot: 'helmet', stats: { def: 9, res: 9, maxHp: 30, mag: 4, atk: 4 } }));
add('panteon', gear({ id: 'funeral_silk_gloves', name: 'Guantes de seda fúnebre', description: 'Para no tocar a los muertos con las manos desnudas.', icon: 'gloves_silk', sub: 'panteon', level: L(57), rarity: 'rare', slot: 'gloves', stats: { mag: 6, atk: 6, crit: 3 } }));

// ── 7 · El Umbral Carmesí (60–70): sangre y culto ──
add('carmesi', weapon({ id: 'blood_mace', name: 'Maza de sangre', description: 'La cabeza es hueso y la sangre seca la mantiene unida.', icon: 'mace_blood', sub: 'carmesi', level: L(65), rarity: 'rare', family: 'mace', classes: W, specials: ['crush', 'hammer_blow'] }));
add('carmesi', offhand({ id: 'umbral_ritual_dagger', name: 'Daga ritual del Umbral', description: 'Los cultistas la usaban para abrir algo más que gargantas.', icon: 'dagger_blood', sub: 'carmesi', level: L(64), rarity: 'rare', family: 'dagger', classes: M, specials: ['life_siphon', 'venom_strike'], stats: { mag: 10, atk: 6, crit: 4 } }));
add('carmesi', gear({ id: 'dried_blood_cuirass', name: 'Coraza de sangre seca', description: 'Rígida como el cuero, roja como la herida.', icon: 'plate_blood', sub: 'carmesi', level: L(63), rarity: 'rare', slot: 'armor', stats: { def: ITEM_CURVES.armorDef(63), maxHp: 70, res: 8 }, classes: W }));
add('carmesi', gear({ id: 'cult_hood', name: 'Capucha del culto', description: 'Bordada con un ojo que parece seguirte.', icon: 'hood_blood', sub: 'carmesi', level: L(66), rarity: 'rare', slot: 'helmet', stats: { mag: 12, res: 12, maxHp: 30 }, classes: M }));

// ── 8 · Las puertas del abismo (70–80): obsidiana y fuego ──
add('puertas', weapon({ id: 'ignaroth_hammer', name: 'Martillo de Ignaroth', description: 'El martillo del herrero del abismo. Todavía está caliente.', icon: 'hammer_fire', sub: 'puertas', level: L(78), rarity: 'legendary', family: 'mace', hands: 2, classes: W, specials: ['living_forge', 'crush', 'dull_blow', 'hammer_blow'], stats: { crit: 6, maxHp: 30 } }));
add('puertas', offhand({ id: 'magma_orb', name: 'Orbe de magma', description: 'Roca fundida que no termina de enfriarse dentro de su cáscara.', icon: 'orb_fire', sub: 'puertas', level: L(74), rarity: 'rare', family: 'orb', classes: M, specials: ['arcane_pulse', 'ember_rain'], stats: { mag: ITEM_CURVES.orbMag(74), maxMp: 30, res: 8 } }));
add('puertas', offhand({ id: 'chain_shield', name: 'Escudo de cadenas', description: 'Eslabones soldados en un muro. Pesa como una puerta.', icon: 'shield_chain', sub: 'puertas', level: L(76), rarity: 'rare', family: 'shield', classes: W, specials: ['block', 'iron_wall'], stats: { def: ITEM_CURVES.shieldDef(76), res: 10, maxHp: 46 } }));
add('puertas', gear({ id: 'obsidian_helm', name: 'Yelmo de obsidiana', description: 'Vidrio negro tallado. Corta a quien lo toca.', icon: 'helm_obsidian', sub: 'puertas', level: L(74), rarity: 'rare', slot: 'helmet', stats: { def: ITEM_CURVES.helmDef(74), maxHp: 60, res: 9 }, classes: W }));
add('puertas', gear({ id: 'forge_gauntlets', name: 'Guanteletes de forja', description: 'Hechos para sacar el hierro del fuego sin pinzas.', icon: 'gauntlets_fire', sub: 'puertas', level: L(77), rarity: 'rare', slot: 'gloves', stats: { atk: 10, def: 8, crit: 3 }, heavy: true }));

// ── 9 · Los ríos de fuego (80–90): azufre y ceniza ──
add('rios', weapon({ id: 'sulfur_greataxe', name: 'Gran hacha de azufre', description: 'El filo amarillea y humea al cortar.', icon: 'greataxe', sub: 'rios', level: L(85), rarity: 'epic', family: 'greataxe', hands: 2, classes: W, specials: ['brutal_blow', 'skull_splitter', 'reaping', 'hammer_blow'], stats: { spd: -1, crit: 5 } }));
add('rios', weapon({ id: 'ash_wand', name: 'Varita de ceniza', description: 'Se deshace un poco cada vez que la usas.', icon: 'wand_fire', sub: 'rios', level: L(84), rarity: 'rare', family: 'wand', classes: M, specials: ['fireball', 'ember_rain'], stats: { spd: 2, crit: 4 } }));
add('rios', offhand({ id: 'infernal_torch', name: 'Antorcha infernal', description: 'Una llama arrancada a los ríos del abismo.', icon: 'torch_hell', sub: 'rios', level: L(86), rarity: 'epic', family: 'torch', classes: WM, specials: ['torch_burn', 'scare'], stats: { atk: 10, mag: 10, res: 12, maxHp: 30 } }));
add('rios', gear({ id: 'ash_boots', name: 'Botas de ceniza', description: 'Dejan huellas grises que tardan en apagarse.', icon: 'boots_ash', sub: 'rios', level: L(83), rarity: 'rare', slot: 'boots', stats: { spd: 7, eva: 6, def: 7 } }));
add('rios', gear({ id: 'sulfur_amulet', name: 'Amuleto de azufre', description: 'Un cristal amarillo que pica en el pecho.', icon: 'amulet_sulfur', sub: 'rios', level: L(87), rarity: 'epic', slot: 'amulet', stats: { res: 13, maxHp: 60, atk: 8, mag: 8 } }));

// ── 10 · El trono de Belzar (90–100) ──
add('trono', weapon({ id: 'belzar_chain', name: 'Cadena de Belzar', description: 'La cadena con la que Belzar arrastraba almas hasta su trono.', icon: 'chain', sub: 'trono', level: L(96), rarity: 'legendary', family: 'mace', classes: W, specials: ['drag_abyss', 'crush'], stats: { crit: 8, maxHp: 40 } }));
add('trono', weapon({ id: 'throne_greatsword', name: 'Mandoble del Trono', description: 'La espada de la guardia de Belzar. Ningún mortal debería poder alzarla.', icon: 'greatsword_dark', sub: 'trono', level: L(94), rarity: 'epic', family: 'greatsword', hands: 2, classes: W, specials: ['rending_slash', 'thrust', 'dread_cut', 'reaping'], stats: { crit: 7 } }));
add('trono', offhand({ id: 'abyss_eye', name: 'Ojo del Abismo', description: 'Un ojo que no parpadea. Mira a quien tú miras.', icon: 'orb_eye', sub: 'trono', level: L(97), rarity: 'legendary', family: 'orb', classes: M, specials: ['void_gaze', 'focus'], stats: { mag: ITEM_CURVES.orbMag(97) + 8, maxMp: 44, res: 14, maxHp: 40 } }));
add('trono', weapon({ id: 'abyss_greatstaff', name: 'Báculo mayor del abismo', description: 'Hueso negro coronado por una llama que no da calor.', icon: 'greatstaff_dark', sub: 'trono', level: L(95), rarity: 'epic', family: 'greatstaff', hands: 2, classes: M, specials: ['fireball', 'blizzard', 'dark_nova', 'sepulchral_bolt'], stats: { crit: 6 } }));
add('trono', gear({ id: 'chain_cuirass', name: 'Coraza de cadenas', description: 'Cadenas del trono fundidas en una armadura.', icon: 'plate_chain', sub: 'trono', level: L(93), rarity: 'epic', slot: 'armor', stats: { def: ITEM_CURVES.armorDef(93), maxHp: 105, res: 15, spd: -1 }, classes: W }));
add('trono', gear({ id: 'condemned_ring', name: 'Anillo del condenado', description: 'Lo llevaba alguien que pidió clemencia. No la hubo.', icon: 'ring_dark', sub: 'trono', level: L(92), rarity: 'epic', slot: 'ring', stats: { atk: 11, mag: 11, crit: 6, maxHp: 20 } }));
add('trono', gear({ id: 'belzar_broken_crown', name: 'Corona rota de Belzar', description: 'Partida en dos el día que cayó. Aún quiere mandar.', icon: 'crown_dark', sub: 'trono', level: L(98), rarity: 'legendary', slot: 'helmet', stats: { def: 22, res: 18, maxHp: 90, atk: 10, mag: 10, crit: 4 } }));

/** Nuevos de cada subzona (para el botín). */
export function itemsOfSubzone(sub: string): ItemDef[] {
  return SUBZONE_ITEMS.filter((i) => i.sub === sub);
}

/** Armas y equipo que ya existían, repartidos por subzona (ver docs/plan-combate.md, 5.3). */
export const REUSED_BY_SUBZONE: Record<SubzoneId, string[]> = {
  afueras: ['rusty_sword', 'iron_sword', 'battle_axe', 'apprentice_staff', 'ember_staff', 'wooden_shield', 'iron_shield', 'arcane_tome'],
  castillo: ['tempered_sword', 'tempered_axe', 'knight_sword', 'executioner_axe', 'cavern_staff', 'frost_staff', 'bastion_shield'],
  calabozos: ['dread_blade', 'bonereaver', 'runic_staff', 'eclipse_grimoire'],
  osario: ['sepulchral_sword', 'headsman_axe', 'ossuary_staff'],
  catacumbas: ['gravewarden_blade', 'silver_forged_sword', 'ecto_staff', 'requiem_staff', 'headstone_shield', 'bone_bulwark', 'funeral_grimoire'],
  panteon: ['requiem_axe', 'shroud_staff'],
  carmesi: ['obsidian_sword', 'sulfur_staff', 'demonscale_shield', 'burning_tome'],
  puertas: ['chain_axe', 'obsidian_greatblade', 'brimstone_scepter'],
  rios: ['hellforged_blade', 'abyss_scepter'],
  trono: [],
};
