// Bloque 2, fase 4: materias y planos que se suman al botín (cifras en config/craftDrops.ts).
import type { ItemStack } from './types';
import type { Rng } from './rng';
import { makeUid } from './rng';
import { getItem } from './data/items';
import { CRAFT_RECIPES } from './crafting';
import { SUBZONE_ITEMS } from './data/subzoneItems';
import { SUBZONE_ORDER } from './data/subzones';
import type { VendorId } from './data/vendors';
import { CHEST_MATERIALS, ENEMY_MATERIALS, BLUEPRINT_CHANCE, LEGENDARY_BLUEPRINT, BLUEPRINT_SPREAD, BLUEPRINT_RANK } from '../config/craftDrops';

/** Número de subzona (1–10); 0 si no hay (tutorial). */
export function subzoneTier(sub: string | undefined): number {
  return sub ? SUBZONE_ORDER.indexOf(sub as never) + 1 : 0;
}

const KEY_TIER: Record<number, number> = { 1: 2, 2: 5, 3: 8 };

/** Subzona a la que pertenece un plano: la del objeto que enseña (o su nivel). */
export function blueprintTier(bpId: string): number {
  const r = CRAFT_RECIPES.find((x) => x.blueprint === bpId);
  if (!r) return 0;
  const sub = SUBZONE_ITEMS.find((s) => s.id === r.result)?.sub;
  if (sub) return subzoneTier(sub);
  const req = getItem(r.result).levelReq;
  return req ? Math.min(10, Math.max(1, Math.ceil(req / 10))) : KEY_TIER[r.level];
}

const allBlueprints = () => [...new Set(CRAFT_RECIPES.map((r) => r.blueprint).filter((b): b is string => !!b))];

/** Planos raros o épicos que pueden caer en una subzona. */
export function blueprintPool(tier: number): string[] {
  return allBlueprints().filter((b) => getItem(b).rarity !== 'legendary' && Math.abs(blueprintTier(b) - tier) <= BLUEPRINT_SPREAD);
}
export function legendaryPool(): string[] {
  return allBlueprints().filter((b) => getItem(b).rarity === 'legendary');
}

const stack = (itemId: string, qty: number): ItemStack => ({ uid: makeUid(), itemId, qty });
const pick = <T,>(xs: T[], rng: Rng): T => xs[Math.min(xs.length - 1, Math.floor(rng.next() * xs.length))];

function rollBlueprint(tier: number, chance: number, legendary: number, rng: Rng): ItemStack[] {
  const out: ItemStack[] = [];
  const pool = blueprintPool(tier);
  if (pool.length && rng.chance(chance)) out.push(stack(pick(pool, rng), 1));
  if (tier >= LEGENDARY_BLUEPRINT.from && legendary > 0 && rng.chance(legendary)) out.push(stack(pick(legendaryPool(), rng), 1));
  return out;
}

/** Lo que se añade a un cofre: materias de la subzona y, si tiene cerradura, quizá un plano. */
export function chestCraftDrops(tier: number, kind: { locked: boolean; boss: boolean }, rng: Rng): ItemStack[] {
  if (!tier) return [];
  const out: ItemStack[] = [];
  for (const m of CHEST_MATERIALS) if (tier >= m.from && tier <= m.to && rng.chance(m.chance)) out.push(stack(m.itemId, rng.int(m.min, m.max)));
  const chance = kind.boss ? BLUEPRINT_CHANCE.bossChest : kind.locked ? BLUEPRINT_CHANCE.lockedChest : 0;
  if (chance) out.push(...rollBlueprint(tier, chance, 0, rng));
  return out;
}

/** Lo que se añade al botín de un enemigo: sus materias y, si es élite o jefe, quizá un plano. */
export function enemyCraftDrops(enemyId: string, tier: number, kind: { elite: boolean; boss: boolean }, rng: Rng): ItemStack[] {
  const out: ItemStack[] = [];
  for (const m of ENEMY_MATERIALS) if (m.enemies.includes(enemyId) && rng.chance(m.chance)) out.push(stack(m.itemId, rng.int(m.min, m.max)));
  if (tier && (kind.boss || kind.elite)) {
    out.push(...rollBlueprint(tier, kind.boss ? BLUEPRINT_CHANCE.boss : BLUEPRINT_CHANCE.elite, kind.boss ? LEGENDARY_BLUEPRINT.boss : LEGENDARY_BLUEPRINT.elite, rng));
  }
  return out;
}

/** Planos raros que vende cada mercader (Brand: armas; Valerius: yelmos, escudos y guantes; Eldrin: lo rúnico). */
export function vendorBlueprints(v: VendorId): { itemId: string; rank: number }[] {
  const test: Partial<Record<VendorId, (station: string, cat: string) => boolean>> = {
    brand: (st, c) => st === 'forge' && c === 'weapon',
    valerius: (st, c) => st === 'armory' && ['helmet', 'shield', 'gloves'].includes(c),
    eldrin: (st, c) => st === 'alchemy' && c !== 'potion' && c !== 'material',
  };
  const t = test[v];
  if (!t) return [];
  return CRAFT_RECIPES
    .filter((r) => r.blueprint && getItem(r.blueprint).rarity === 'rare' && t(r.station, getItem(r.result).category))
    .map((r) => ({ itemId: r.blueprint!, rank: BLUEPRINT_RANK(blueprintTier(r.blueprint!)) }))
    .sort((a, b) => a.rank - b.rank || blueprintTier(a.itemId) - blueprintTier(b.itemId));
}
