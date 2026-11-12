// ════════════════════════════════════════════════════════════════════
// Apariencia del equipo: cómo se ve cada objeto equipado sobre el personaje.
// Es solo datos (sin DOM). Añadir un objeto visible = añadir una entrada aquí.
// ════════════════════════════════════════════════════════════════════
import type { ClassId, EquipSlot, Equipment } from '../core/types';
import { EQUIP_SLOTS } from '../core/types';
import { CLASSES } from '../core/data/classes';
import { getItem } from '../core/data/items';
import { PAL } from './palette';

export type GearLook =
  | { slot: 'mainHand'; shape: 'sword' | 'axe' | 'staff' | 'dagger' | 'mace' | 'greatsword'; color: string; orb?: string }
  | { slot: 'offHand'; shape: 'shield'; color: string; rim: string; emblem: string }
  | { slot: 'offHand'; shape: 'tome'; color: string }
  | { slot: 'helmet'; shape: 'hood' | 'helmet' | 'wizard'; color: string; trim?: string }
  | { slot: 'armor'; style: 'tunic' | 'mail' | 'robe'; color: string; trim: string }
  | { slot: 'gloves'; color: string }
  | { slot: 'boots'; color: string }
  | { slot: 'amulet'; color: string }
  | { slot: 'ring' };

export const GEAR_LOOKS: Record<string, GearLook> = {
  // Armas
  rusty_sword: { slot: 'mainHand', shape: 'sword', color: '#9a8a78' },
  recruit_sword: { slot: 'mainHand', shape: 'sword', color: '#8a8278' },
  recruit_staff: { slot: 'mainHand', shape: 'staff', color: PAL.earth3, orb: PAL.bone1 },
  plank_shield: { slot: 'offHand', shape: 'shield', color: PAL.earth3, rim: PAL.earth1, emblem: PAL.earth2 },
  worn_grimoire: { slot: 'offHand', shape: 'tome', color: PAL.earth2 },
  recruit_doublet: { slot: 'armor', style: 'tunic', color: PAL.earth2, trim: PAL.earth1 },
  recruit_robe: { slot: 'armor', style: 'robe', color: PAL.earth3, trim: PAL.night2 },
  iron_sword: { slot: 'mainHand', shape: 'sword', color: PAL.steel2 },
  executioner_axe: { slot: 'mainHand', shape: 'axe', color: PAL.steel3 },
  apprentice_staff: { slot: 'mainHand', shape: 'staff', color: PAL.earth2, orb: PAL.ice },
  ember_staff: { slot: 'mainHand', shape: 'staff', color: PAL.earth1, orb: PAL.fire1 },
  runic_staff: { slot: 'mainHand', shape: 'staff', color: PAL.magic0, orb: PAL.magic2 },
  bone_dagger: { slot: 'mainHand', shape: 'dagger', color: PAL.bone2 },
  knight_sword: { slot: 'mainHand', shape: 'sword', color: PAL.steel3 },
  dread_blade: { slot: 'mainHand', shape: 'sword', color: PAL.threat2 },
  battle_axe: { slot: 'mainHand', shape: 'axe', color: PAL.steel2 },
  bonereaver: { slot: 'mainHand', shape: 'axe', color: PAL.bone2 },
  frost_staff: { slot: 'mainHand', shape: 'staff', color: '#5a7fa8', orb: '#ffffff' },
  blessed_mace: { slot: 'mainHand', shape: 'mace', color: PAL.gold2 },
  iron_shield: { slot: 'offHand', shape: 'shield', color: PAL.steel2, rim: PAL.steel1, emblem: PAL.steel0 },
  eclipse_grimoire: { slot: 'offHand', shape: 'tome', color: PAL.magic0 },
  knight_helm: { slot: 'helmet', shape: 'helmet', color: PAL.steel3 },
  bastion_plate: { slot: 'armor', style: 'mail', color: PAL.steel2, trim: PAL.gold2 },
  archmage_robe: { slot: 'armor', style: 'robe', color: PAL.night1, trim: PAL.gold2 },
  // Secundarias
  wooden_shield: { slot: 'offHand', shape: 'shield', color: PAL.earth2, rim: PAL.steel1, emblem: PAL.earth3 },
  bastion_shield: { slot: 'offHand', shape: 'shield', color: PAL.steel1, rim: PAL.steel2, emblem: PAL.gold2 },
  arcane_tome: { slot: 'offHand', shape: 'tome', color: PAL.magic1 },
  // Cabeza
  leather_hood: { slot: 'helmet', shape: 'hood', color: PAL.earth2 },
  iron_helm: { slot: 'helmet', shape: 'helmet', color: PAL.steel2 },
  wizard_hat: { slot: 'helmet', shape: 'wizard', color: PAL.night2, trim: PAL.gold2 },
  // Torso
  padded_tunic: { slot: 'armor', style: 'tunic', color: PAL.earth3, trim: PAL.earth1 },
  chainmail: { slot: 'armor', style: 'mail', color: PAL.steel1, trim: PAL.steel2 },
  linen_robe: { slot: 'armor', style: 'robe', color: PAL.bone1, trim: PAL.night2 },
  shadow_robe: { slot: 'armor', style: 'robe', color: PAL.magic1, trim: PAL.magic3 },
  // Manos y pies
  leather_gloves: { slot: 'gloves', color: PAL.earth3 },
  gauntlets: { slot: 'gloves', color: PAL.steel2 },
  worn_boots: { slot: 'boots', color: PAL.earth1 },
  swift_boots: { slot: 'boots', color: PAL.night2 },
  // Joyería
  copper_ring: { slot: 'ring' },
  ring_of_embers: { slot: 'ring' },
  bone_amulet: { slot: 'amulet', color: PAL.bone2 },
  heart_of_umbravel: { slot: 'amulet', color: PAL.threat2 },

  // ── La Cripta ──
  sepulchral_sword: { slot: 'mainHand', shape: 'sword', color: '#cfd8e3' },
  gravewarden_blade: { slot: 'mainHand', shape: 'sword', color: '#8fb8e8' },
  headsman_axe: { slot: 'mainHand', shape: 'axe', color: '#b9c7d6' },
  requiem_axe: { slot: 'mainHand', shape: 'axe', color: PAL.bone3 },
  ossuary_staff: { slot: 'mainHand', shape: 'staff', color: PAL.bone1, orb: '#7cff9a' },
  requiem_staff: { slot: 'mainHand', shape: 'staff', color: '#5a7fa8', orb: PAL.ice },
  shroud_staff: { slot: 'mainHand', shape: 'staff', color: PAL.bone2, orb: '#e8ecf2' },
  headstone_shield: { slot: 'offHand', shape: 'shield', color: PAL.stone4, rim: PAL.bone2, emblem: PAL.bone3 },
  funeral_grimoire: { slot: 'offHand', shape: 'tome', color: '#2f3542' },
  silver_helm: { slot: 'helmet', shape: 'helmet', color: '#dfe5ec' },
  mourner_hood: { slot: 'helmet', shape: 'hood', color: '#3d4a5c' },
  silver_plate: { slot: 'armor', style: 'mail', color: '#cfd8e3', trim: PAL.ice },
  shroud_robe: { slot: 'armor', style: 'robe', color: '#e8ecf2', trim: '#6f7f96' },
  silver_gauntlets: { slot: 'gloves', color: '#cfd8e3' },
  grave_boots: { slot: 'boots', color: '#2f3542' },
  reliquary_amulet: { slot: 'amulet', color: PAL.gold2 },
  veiled_ring: { slot: 'ring' },
  // ── El Infierno ──
  obsidian_sword: { slot: 'mainHand', shape: 'sword', color: '#3a2a3a' },
  hellforged_blade: { slot: 'mainHand', shape: 'sword', color: PAL.fire1 },
  chain_axe: { slot: 'mainHand', shape: 'axe', color: '#6a3a2a' },
  sulfur_staff: { slot: 'mainHand', shape: 'staff', color: PAL.earth0, orb: '#e8d24a' },
  abyss_scepter: { slot: 'mainHand', shape: 'staff', color: '#1a0a0a', orb: PAL.fire2 },
  demonscale_shield: { slot: 'offHand', shape: 'shield', color: '#4a1414', rim: PAL.fire1, emblem: PAL.fire2 },
  burning_tome: { slot: 'offHand', shape: 'tome', color: PAL.fire0 },
  hellsteel_helm: { slot: 'helmet', shape: 'helmet', color: '#3a1a1a' },
  ash_cowl: { slot: 'helmet', shape: 'hood', color: '#4a4448' },
  hellsteel_plate: { slot: 'armor', style: 'mail', color: '#4a1a1a', trim: PAL.fire1 },
  ash_robe: { slot: 'armor', style: 'robe', color: '#3a3438', trim: PAL.fire1 },
  demon_gauntlets: { slot: 'gloves', color: '#2a1010' },
  cinder_boots: { slot: 'boots', color: '#3a1a10' },
  ember_ring: { slot: 'ring' },
  heart_of_belzar: { slot: 'amulet', color: PAL.fire2 },
  // ── La forja ──
  tempered_sword: { slot: 'mainHand', shape: 'sword', color: '#c9d2dc' },
  tempered_axe: { slot: 'mainHand', shape: 'axe', color: '#c9d2dc' },
  cavern_staff: { slot: 'mainHand', shape: 'staff', color: PAL.earth2, orb: '#5fe0d0' },
  silver_forged_sword: { slot: 'mainHand', shape: 'sword', color: '#f2f6fa' },
  ecto_staff: { slot: 'mainHand', shape: 'staff', color: '#6f7f96', orb: '#9dffc4' },
  bone_bulwark: { slot: 'offHand', shape: 'shield', color: PAL.bone1, rim: '#cfd8e3', emblem: PAL.ice },
  obsidian_greatblade: { slot: 'mainHand', shape: 'sword', color: '#2a1a2a' },
  brimstone_scepter: { slot: 'mainHand', shape: 'staff', color: PAL.earth0, orb: '#ffef6a' },
  demonblood_plate: { slot: 'armor', style: 'mail', color: '#6a1414', trim: PAL.fire2 },
  // ── Subzonas (C4). Provisional: lanzas y varitas se dibujan como bastón; orbes, antorchas y dagas de la
  //    izquierda, como tomo. Ver la lista de assets en docs/plan-combate.md ──
  guard_spear: { slot: 'mainHand', shape: 'staff', color: PAL.earth2, orb: PAL.steel3 },
  birch_wand: { slot: 'mainHand', shape: 'staff', color: PAL.bone1, orb: PAL.ice },
  pitch_torch: { slot: 'offHand', shape: 'tome', color: PAL.fire1 },
  war_mace: { slot: 'mainHand', shape: 'mace', color: PAL.steel2 },
  parry_dagger: { slot: 'offHand', shape: 'tome', color: PAL.steel3 },
  murky_orb: { slot: 'offHand', shape: 'tome', color: '#6f7f96' },
  jailer_greatsword: { slot: 'mainHand', shape: 'greatsword', color: PAL.steel2 },
  jailer_greatstaff: { slot: 'mainHand', shape: 'staff', color: PAL.steel1, orb: PAL.ice },
  femur_spear: { slot: 'mainHand', shape: 'staff', color: PAL.bone2, orb: PAL.bone3 },
  vertebra_wand: { slot: 'mainHand', shape: 'staff', color: PAL.bone1, orb: '#7cff9a' },
  ossuary_orb: { slot: 'offHand', shape: 'tome', color: PAL.bone2 },
  drowned_trident: { slot: 'mainHand', shape: 'staff', color: '#3d6a6a', orb: '#bff0e8' },
  ferryman_lantern: { slot: 'offHand', shape: 'tome', color: '#2a5a3a' },
  dukes_rapier: { slot: 'mainHand', shape: 'sword', color: '#e8ecf2' },
  queens_veil: { slot: 'offHand', shape: 'tome', color: PAL.ice },
  blood_mace: { slot: 'mainHand', shape: 'mace', color: PAL.threat2 },
  umbral_ritual_dagger: { slot: 'offHand', shape: 'tome', color: PAL.threat1 },
  ignaroth_hammer: { slot: 'mainHand', shape: 'mace', color: '#3a2a3a' },
  magma_orb: { slot: 'offHand', shape: 'tome', color: PAL.fire1 },
  chain_shield: { slot: 'offHand', shape: 'shield', color: PAL.steel1, rim: PAL.outline, emblem: PAL.fire1 },
  sulfur_greataxe: { slot: 'mainHand', shape: 'axe', color: '#e8d24a' },
  ash_wand: { slot: 'mainHand', shape: 'staff', color: '#4a4448', orb: PAL.fire2 },
  infernal_torch: { slot: 'offHand', shape: 'tome', color: PAL.threat2 },
  belzar_chain: { slot: 'mainHand', shape: 'mace', color: PAL.steel1 },
  throne_greatsword: { slot: 'mainHand', shape: 'greatsword', color: '#3a2a3a' },
  abyss_eye: { slot: 'offHand', shape: 'tome', color: PAL.threat0 },
  abyss_greatstaff: { slot: 'mainHand', shape: 'staff', color: PAL.outline, orb: PAL.fire2 },
  sentinel_cap: { slot: 'helmet', shape: 'hood', color: PAL.earth1 },
  guard_helm: { slot: 'helmet', shape: 'helmet', color: PAL.steel2 },
  jailer_hood: { slot: 'helmet', shape: 'hood', color: '#2a2830' },
  bone_mask: { slot: 'helmet', shape: 'helmet', color: PAL.bone2 },
  dukes_crown: { slot: 'helmet', shape: 'helmet', color: '#cfd8e3' },
  cult_hood: { slot: 'helmet', shape: 'hood', color: PAL.threat1 },
  obsidian_helm: { slot: 'helmet', shape: 'helmet', color: '#3a2a3a' },
  belzar_broken_crown: { slot: 'helmet', shape: 'helmet', color: PAL.threat2 },
  soaked_robe: { slot: 'armor', style: 'robe', color: '#3d6a6a', trim: '#7cd0c0' },
  dried_blood_cuirass: { slot: 'armor', style: 'mail', color: PAL.threat1, trim: PAL.bone2 },
  chain_cuirass: { slot: 'armor', style: 'mail', color: PAL.steel1, trim: PAL.fire2 },
  leather_bracers: { slot: 'gloves', color: PAL.earth2 },
  funeral_silk_gloves: { slot: 'gloves', color: '#e8ecf2' },
  forge_gauntlets: { slot: 'gloves', color: '#3a2a3a' },
  courtyard_boots: { slot: 'boots', color: PAL.earth1 },
  silt_boots: { slot: 'boots', color: '#3d4a3a' },
  ash_boots: { slot: 'boots', color: '#5a5458' },
  phalanx_rosary: { slot: 'amulet', color: PAL.bone2 },
  sulfur_amulet: { slot: 'amulet', color: '#e8d24a' },
  broken_shackles: { slot: 'ring' },
  black_coral_ring: { slot: 'ring' },
  condemned_ring: { slot: 'ring' },
};

export function lookOf(itemId: string): GearLook | null {
  return GEAR_LOOKS[itemId] ?? null;
}

/** Equipo inicial de la clase como «equipo» (para la creación de personaje y la web). */
export function starterEquipment(classId: ClassId): Equipment {
  const eq = Object.fromEntries(EQUIP_SLOTS.map((s) => [s, null])) as Equipment;
  for (const k of CLASSES[classId].starterKit) {
    const slot = getItem(k.itemId).slot;
    if (slot && !eq[slot]) eq[slot] = { uid: `starter-${k.itemId}`, itemId: k.itemId, qty: 1 };
  }
  return eq;
}

/** Firma corta del aspecto: cambia solo cuando cambia algo visible. Sirve como clave de caché. */
export function lookSignature(equipment: Equipment): string {
  return EQUIP_SLOTS.map((s: EquipSlot) => {
    const it = equipment[s];
    const look = it ? lookOf(it.itemId) : null;
    return it && look && look.slot !== 'ring' ? it.itemId : '-';
  }).join('|');
}

function gear(items: Partial<Record<EquipSlot, string>>): Equipment {
  const eq = Object.fromEntries(EQUIP_SLOTS.map((s) => [s, null])) as Equipment;
  for (const [slot, id] of Object.entries(items)) eq[slot as EquipSlot] = { uid: `show-${id}`, itemId: id!, qty: 1 };
  return eq;
}

/** Equipo representativo de cada clase para la web (no el de recluta). */
export const SHOWCASE_GEAR: Record<ClassId, Equipment> = {
  warrior: gear({ mainHand: 'iron_sword', offHand: 'wooden_shield', helmet: 'iron_helm', armor: 'chainmail', gloves: 'gauntlets', boots: 'worn_boots' }),
  mage: gear({ mainHand: 'ember_staff', offHand: 'arcane_tome', helmet: 'wizard_hat', armor: 'linen_robe', boots: 'worn_boots' }),
  rogue: gear({ mainHand: 'bone_dagger', helmet: 'leather_hood', armor: 'padded_tunic', gloves: 'leather_gloves', boots: 'swift_boots' }),
  cleric: gear({ mainHand: 'blessed_mace', offHand: 'bastion_shield', armor: 'linen_robe', gloves: 'leather_gloves', boots: 'worn_boots', amulet: 'bone_amulet' }),
};
