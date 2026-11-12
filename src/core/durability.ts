// DURABILIDAD de armas, armaduras y herramientas (Fase 3 de la expansión).
// Nada se destruye al romperse: un objeto roto no da estadísticas ni especiales, pero sigue en su sitio
// y se repara con Maese Brand o con un kit de campo. El arma rota aún permite el ataque básico.
import type { Equipment, EquipSlot, Grid, ItemDef, ItemStack, Rarity } from './types';
import { getItem } from './data/items';
import { stackRarity } from './data/rarity';
import { DURABILITY } from '../config/durability';

/** Huecos que se desgastan: armas, secundarias y armadura. Anillos y amuletos no. */
export const WEAR_SLOTS: EquipSlot[] = ['mainHand', 'offHand', 'helmet', 'armor', 'gloves', 'boots'];
const ARMOR_SLOTS: EquipSlot[] = ['offHand', 'helmet', 'armor', 'gloves', 'boots'];

function isTool(def: ItemDef): boolean {
  return def.category === 'tool' && def.uses !== undefined;
}

/** ¿Este objeto se desgasta? */
export function hasDurability(def: ItemDef): boolean {
  if (isTool(def)) return true;
  return !!def.slot && WEAR_SLOTS.includes(def.slot);
}

/** Durabilidad máxima del ejemplar (0 si no se desgasta). Herramientas: sus usos. */
export function maxDurability(stack: ItemStack): number {
  const def = getItem(stack.itemId);
  if (isTool(def)) return def.uses!;
  if (!hasDurability(def)) return 0;
  const r: Rarity = stackRarity(stack, def);
  return DURABILITY.byRarity[r] + (stack.quality ?? 0) * DURABILITY.perQuality;
}

/** Durabilidad actual (sin valor = nueva). */
export function durability(stack: ItemStack): number {
  const def = getItem(stack.itemId);
  if (isTool(def)) return stack.uses ?? def.uses!;
  const max = maxDurability(stack);
  return Math.max(0, Math.min(max, stack.dur ?? max));
}

export function isBroken(stack: ItemStack | null | undefined): boolean {
  if (!stack || maxDurability(stack) <= 0) return false;
  return durability(stack) <= 0;
}

export function withDurability(stack: ItemStack, value: number): ItemStack {
  const def = getItem(stack.itemId);
  const v = Math.max(0, Math.min(maxDurability(stack), Math.round(value)));
  if (isTool(def)) return { ...stack, uses: v };
  const { dur: _old, ...rest } = stack;
  return v >= maxDurability(stack) ? rest : { ...rest, dur: v };
}

export type WearLevel = 'ok' | 'worn' | 'critical' | 'broken';

/** Avisos: gastado al 25 % o menos, a punto de romperse al 10 % o menos. */
export function wearLevel(stack: ItemStack): WearLevel {
  const max = maxDurability(stack);
  if (max <= 0) return 'ok';
  const d = durability(stack);
  if (d <= 0) return 'broken';
  if (d <= max * DURABILITY.critical) return 'critical';
  if (d <= max * DURABILITY.worn) return 'worn';
  return 'ok';
}

export interface WearNotice { slot: EquipSlot; name: string; level: WearLevel }

/**
 * Desgaste tras un combate: el arma (y la secundaria si también es arma) pierde 1 por ataque;
 * cada golpe recibido desgasta una pieza de armadura, por turnos y siempre en el mismo orden.
 * Devuelve el equipo nuevo y los avisos de las piezas que han cruzado un umbral.
 */
export function wearEquipment(eq: Equipment, swings: number, hits: number, bySlot?: Partial<Record<EquipSlot, number>>): { equipment: Equipment; notices: WearNotice[] } {
  const out: Equipment = { ...eq };
  const loss: Partial<Record<EquipSlot, number>> = {};
  const add = (sl: EquipSlot, n: number) => { loss[sl] = (loss[sl] ?? 0) + n; };
  if (swings > 0) {
    if (out.mainHand) add('mainHand', swings);
    const off = out.offHand ? getItem(out.offHand.itemId) : null;
    if (off && off.category === 'weapon') add('offHand', swings);
  }
  const armor = ARMOR_SLOTS.filter((sl) => {
    const st = out[sl];
    return !!st && hasDurability(getItem(st.itemId)) && !(sl === 'offHand' && getItem(st.itemId).category === 'weapon');
  });
  // Fase 10: si se sabe qué pieza encajó cada golpe, se desgasta esa; si no (combates antiguos), por turnos
  if (bySlot) { for (const [sl, n] of Object.entries(bySlot) as [EquipSlot, number][]) if (armor.includes(sl)) add(sl, n); }
  else if (armor.length) for (let i = 0; i < hits; i++) add(armor[i % armor.length], 1);
  const notices: WearNotice[] = [];
  for (const sl of Object.keys(loss) as EquipSlot[]) {
    const st = out[sl];
    if (!st || maxDurability(st) <= 0 || isBroken(st)) continue;
    const before = wearLevel(st);
    const next = withDurability(st, durability(st) - loss[sl]!);
    out[sl] = next;
    const after = wearLevel(next);
    if (after !== before) notices.push({ slot: sl, name: getItem(st.itemId).name, level: after });
  }
  return { equipment: out, notices };
}

export function noticeText(n: WearNotice): string {
  if (n.level === 'broken') return `${n.name} se ha roto. No te protege ni da especiales hasta que la repares.`;
  if (n.level === 'critical') return `${n.name} está a punto de romperse.`;
  return `${n.name} está muy gastada.`;
}

/** Precio de Maese Brand por reparar del todo un objeto (0 si está entero). */
export function repairCost(stack: ItemStack): number {
  const max = maxDurability(stack);
  const missing = max - durability(stack);
  if (max <= 0 || missing <= 0) return 0;
  const def = getItem(stack.itemId);
  return Math.max(1, Math.ceil((def.value * DURABILITY.repairValueShare * missing) / max));
}

/** Arreglo de campo: repara una parte del máximo de cada pieza equipada y de los picos de la mochila. */
export function fieldRepair(eq: Equipment, backpack: Grid): { equipment: Equipment; backpack: Grid; repaired: number } {
  let repaired = 0;
  const fix = (st: ItemStack): ItemStack => {
    const max = maxDurability(st);
    if (max <= 0 || durability(st) >= max) return st;
    repaired += 1;
    return withDurability(st, durability(st) + Math.ceil(max * DURABILITY.kitShare));
  };
  const equipment: Equipment = { ...eq };
  for (const sl of WEAR_SLOTS) if (equipment[sl]) equipment[sl] = fix(equipment[sl]!);
  const bp = backpack.map((s) => (s && isTool(getItem(s.itemId)) ? fix(s) : s));
  return { equipment, backpack: bp, repaired };
}
