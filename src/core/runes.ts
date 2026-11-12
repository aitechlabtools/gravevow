// Runas: huecos de un ejemplar, qué runas le valen y grabarlas (bloque 2, parte 2.1). Lógica pura.
import type { EquipSlot, ItemStack, Profile } from './types';
import { RUNES, RUNE_SLOTS, RUNE_TARGETS } from './data/runes';
import { getItem } from './data/items';
import { stackRarity } from './data/rarity';
import { refugeOf, takeItems, ownedQty, type Result } from './refuge';
import { isCover } from './inventory';

/** Dónde está el objeto a encantar. */
export type RuneLoc = { kind: 'grid'; container: 'backpack' | 'stash'; index: number } | { kind: 'equip'; slot: EquipSlot };

/** Atributos que cuentan para el combate y la ficha: los encontrados y los de las runas. */
export function stackAffixes(st: ItemStack | null | undefined): string[] {
  if (!st) return [];
  return [...(st.affixes ?? []), ...(st.runes ?? []).filter((x): x is string => !!x).map((id) => RUNES[id]?.affix).filter((x): x is string => !!x)];
}

export function runeSlots(st: ItemStack): number {
  const def = getItem(st.itemId);
  if (!def.slot || !RUNE_TARGETS.includes(def.slot) || def.recruit) return 0;
  return RUNE_SLOTS[stackRarity(st, def)];
}

const isWeaponSlot = (s?: EquipSlot) => s === 'mainHand' || s === 'offHand';

/** null si esa runa se puede grabar en ese hueco; si no, el motivo. */
export function runeBlock(p: Profile, st: ItemStack, slotIdx: number, runeId: string): string | null {
  if (refugeOf(p).runic < 3) return 'Las runas se graban en el Atril rúnico de nivel 3.';
  const def = getItem(st.itemId);
  const n = runeSlots(st);
  if (!n) return stackRarity(st, def) === 'legendary' ? 'Lo legendario no se encanta.' : 'Este objeto no admite runas.';
  if (slotIdx < 0 || slotIdx >= n) return 'Ese hueco no existe.';
  const rune = RUNES[runeId];
  if (!rune) return 'Eso no es una runa.';
  if (rune.on === 'weapon' && !isWeaponSlot(def.slot)) return 'Esta runa solo prende en armas.';
  const others = [...(st.affixes ?? []), ...(st.runes ?? []).filter((_, i) => i !== slotIdx).filter((x): x is string => !!x).map((id) => RUNES[id]?.affix)];
  if (others.includes(rune.affix)) return 'El objeto ya tiene ese atributo.';
  if (ownedQty(p, runeId) < 1) return `No tienes ${getItem(runeId).name.toLowerCase()}.`;
  return null;
}

function stackAt(p: Profile, loc: RuneLoc): ItemStack | null {
  const st = loc.kind === 'equip' ? p.equipment[loc.slot] : p[loc.container][loc.index];
  return st && !isCover(st) ? st : null;
}

/** Graba la runa en el hueco (sustituye la que hubiera). Gasta una runa del almacén o la mochila. */
export function applyRune(p: Profile, loc: RuneLoc, slotIdx: number, runeId: string): Result {
  const st = stackAt(p, loc);
  if (!st) return { ok: false, error: 'No hay nada ahí.' };
  const block = runeBlock(p, st, slotIdx, runeId);
  if (block) return { ok: false, error: block };
  const taken = takeItems(p, [{ itemId: runeId, qty: 1 }]);
  if (!taken) return { ok: false, error: 'No tienes esa runa.' };
  const runes = Array.from({ length: runeSlots(st) }, (_, i) => st.runes?.[i] ?? null);
  const old = runes[slotIdx];
  runes[slotIdx] = runeId;
  const next: ItemStack = { ...st, runes };
  // La runa puede haber salido de la misma rejilla: se busca el objeto otra vez por su uid
  let out: Profile;
  if (loc.kind === 'equip') out = { ...taken, equipment: { ...taken.equipment, [loc.slot]: next } };
  else {
    const grid = [...taken[loc.container]];
    const i = grid.findIndex((x) => x?.uid === st.uid);
    if (i < 0) return { ok: false, error: 'El objeto se ha movido.' };
    grid[i] = next;
    out = { ...taken, [loc.container]: grid };
  }
  return { ok: true, profile: out, note: old ? `${getItem(runeId).name} sustituye a ${getItem(old).name.toLowerCase()}.` : `${getItem(runeId).name} grabada.` };
}
