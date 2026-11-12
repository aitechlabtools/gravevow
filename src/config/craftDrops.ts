// ════════════════════════════════════════════════════════════════════
// Bloque 2, fase 4: de dónde salen las materias del crafteo y los planos.
// Se suman al botín normal de cofres y enemigos (core/craftDrops.ts). Todo editable.
// Las subzonas van de 1 (Afueras) a 10 (Trono).
// ════════════════════════════════════════════════════════════════════

export interface MaterialDrop { itemId: string; from: number; to: number; chance: number; min: number; max: number }

/** Materias que aparecen en cualquier cofre de la subzona (además de su botín). */
export const CHEST_MATERIALS: MaterialDrop[] = [
  { itemId: 'scrap_metal', from: 1, to: 10, chance: 0.5, min: 1, max: 3 },
  { itemId: 'old_wood', from: 1, to: 6, chance: 0.45, min: 1, max: 3 },
  { itemId: 'ragged_cloth', from: 1, to: 6, chance: 0.25, min: 1, max: 2 },
  { itemId: 'bitter_herb', from: 1, to: 3, chance: 0.3, min: 1, max: 2 },
  { itemId: 'wrinkled_apple', from: 1, to: 1, chance: 0.2, min: 1, max: 1 },
  { itemId: 'arcane_shard', from: 1, to: 10, chance: 0.2, min: 1, max: 2 },
];

/** Materias que sueltan ciertos enemigos (además de su botín). */
export const ENEMY_MATERIALS: { enemies: string[]; itemId: string; chance: number; min: number; max: number }[] = [
  { enemies: ['starving_wolf', 'bandit', 'bandit_captain'], itemId: 'leather_scrap', chance: 0.45, min: 1, max: 2 },
  { enemies: ['hanged_servant', 'mad_prisoner', 'ossuary_monk', 'mourner', 'embalmed_noble', 'flame_cultist', 'flayed_penitent'], itemId: 'ragged_cloth', chance: 0.4, min: 1, max: 2 },
];

/** Probabilidad de que caiga un plano raro o épico de la subzona. */
export const BLUEPRINT_CHANCE = { lockedChest: 0.1, bossChest: 0.3, elite: 0.15, boss: 0.4 };
/** Plano legendario: solo jefes y élites de las subzonas 8 a 10. */
export const LEGENDARY_BLUEPRINT = { from: 8, elite: 0.03, boss: 0.1 };
/** Un plano cae en su subzona o en las vecinas (±1). */
export const BLUEPRINT_SPREAD = 1;

/** Planos raros que venden los mercaderes con reputación alta (rango según la subzona del plano). */
export const BLUEPRINT_RANK = (tier: number) => (tier <= 3 ? 2 : tier <= 6 ? 3 : 4);
