// REPARACIÓN en la forja de Maese Brand: equipo puesto, mochila y almacén. Cobra del oro del almacén.
import type { EquipSlot, ItemStack, Profile } from './types';
import { durability, maxDurability, repairCost, withDurability } from './durability';
import { spendGold } from './wallet';

export type RepairRef = { where: 'equipment'; slot: EquipSlot } | { where: 'backpack' | 'stash'; index: number };
export interface RepairJob { ref: RepairRef; stack: ItemStack; cost: number }

/** Todo lo que está dañado, con su precio. Primero lo que llevas puesto. */
export function repairJobs(p: Profile): RepairJob[] {
  const jobs: RepairJob[] = [];
  const push = (ref: RepairRef, st: ItemStack | null | undefined) => {
    if (!st || maxDurability(st) <= 0 || durability(st) >= maxDurability(st)) return;
    jobs.push({ ref, stack: st, cost: repairCost(st) });
  };
  for (const [slot, st] of Object.entries(p.equipment) as [EquipSlot, ItemStack | null][]) push({ where: 'equipment', slot }, st);
  p.backpack.forEach((st, index) => push({ where: 'backpack', index }, st));
  p.stash.forEach((st, index) => push({ where: 'stash', index }, st));
  return jobs;
}

function fixed(p: Profile, ref: RepairRef): Profile {
  if (ref.where === 'equipment') {
    const st = p.equipment[ref.slot]!;
    return { ...p, equipment: { ...p.equipment, [ref.slot]: withDurability(st, maxDurability(st)) } };
  }
  const grid = [...p[ref.where]];
  const st = grid[ref.index]!;
  grid[ref.index] = withDurability(st, maxDurability(st));
  return { ...p, [ref.where]: grid };
}

const same = (a: RepairRef, b: RepairRef) =>
  a.where === b.where && (a.where === 'equipment' ? a.slot === (b as { slot: EquipSlot }).slot : a.index === (b as { index: number }).index);

/** Repara un objeto o, sin `ref`, todo lo dañado. El oro sale del almacén. */
export function repair(p: Profile, ref?: RepairRef): { ok: true; profile: Profile; count: number; cost: number } | { ok: false; error: string } {
  const jobs = repairJobs(p).filter((j) => !ref || same(j.ref, ref));
  if (!jobs.length) return { ok: false, error: 'No hay nada que reparar.' };
  const cost = jobs.reduce((n, j) => n + j.cost, 0);
  if (p.gold < cost) return { ok: false, error: `Oro insuficiente: necesitas ${cost}.` };
  // Primero se cobra (puede mover monedas del almacén) y luego se reparan los objetos, que no son monedas
  const paid = spendGold(p, cost);
  if (!paid.ok) return { ok: false, error: paid.error };
  let out = paid.profile;
  for (const j of jobs) out = fixed(out, j.ref);
  return { ok: true, profile: out, count: jobs.length, cost };
}
