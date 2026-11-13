// Cuerpo de un aliado caído (13/11): queda en el suelo como una bolsa con lo que compartisteis.
// Lógica pura: qué contiene y cómo queda el aliado después (vacío, para que nada se pueda coger dos veces).
import type { ItemStack } from './types';
import { coins } from './gold';
import { makeUid } from './rng';

export const BODY_POTION = 'health_potion';

/** Lo que guarda el cuerpo: lo que le diste o repartiste, su oro y las pociones que le quedaban. Sin su propio equipo. */
export function allyBodyStacks(itemIds: string[], gold: number, potions: number): ItemStack[] {
  const out: ItemStack[] = [];
  const count = new Map<string, number>();
  for (const id of itemIds) count.set(id, (count.get(id) ?? 0) + 1);
  for (const [itemId, qty] of count) out.push({ uid: makeUid(), itemId, qty });
  if (potions > 0) out.push({ uid: makeUid(), itemId: BODY_POTION, qty: potions });
  if (gold > 0) out.push(coins(gold));
  return out;
}

/** Nombre de la bolsa del cuerpo. */
export const bodyLabel = (name: string) => `Cuerpo de ${name.split(' ')[0]}`;
