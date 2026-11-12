// ════════════════════════════════════════════════════════════════════
// Rarezas por ejemplar y atributos aleatorios (editable).
// Cada objeto encontrado tiene su propia rareza; las estadísticas se multiplican según ella y las rarezas altas
// traen atributos («de sangrado», «del vampiro»…). Los efectos de los atributos en combate llegan en la fase C5.
// ════════════════════════════════════════════════════════════════════
import type { ItemDef, ItemStack, Rarity, Stats } from '../types';
import { STAT_KEYS } from '../types';
import { qualityStats } from '../forge';
import { RARITY_INFO } from './items';
import { RUNES } from './runes';

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export interface RarityRule {
  /** Multiplicador de las estadísticas del objeto. */
  statMult: number;
  /** Cuántos atributos aleatorios trae [mín, máx]. */
  affixes: [number, number];
  /** Mejora de los especiales del arma (fase C5). */
  specialBonus?: { cooldown?: number; power?: number };
}

export const RARITY_RULES: Record<Rarity, RarityRule> = {
  common: { statMult: 1, affixes: [0, 0] },
  uncommon: { statMult: 1.12, affixes: [1, 1] },
  rare: { statMult: 1.25, affixes: [1, 2], specialBonus: { cooldown: -1 } },
  epic: { statMult: 1.4, affixes: [2, 2], specialBonus: { cooldown: -1, power: 0.15 } },
  legendary: { statMult: 1.6, affixes: [0, 0] },
};

export interface AffixDef {
  id: string;
  /** Cómo se añade al nombre: «Espada de hierro» + « del vampiro». */
  suffix: string;
  description: string;
  /** En qué objetos puede salir. */
  on: 'weapon' | 'armor' | 'any';
  stats?: Partial<Stats>;
}

export const AFFIXES: Record<string, AffixDef> = {
  bleeding: { id: 'bleeding', suffix: 'de sangrado', description: 'El ataque básico hace sangrar un 20 % de las veces.', on: 'weapon' },
  vampire: { id: 'vampire', suffix: 'del vampiro', description: 'Te curas el 8 % del daño que haces.', on: 'weapon' },
  executioner: { id: 'executioner', suffix: 'del verdugo', description: '+25 % de daño a enemigos con menos del 30 % de vida.', on: 'weapon' },
  frost: { id: 'frost', suffix: 'de escarcha', description: '15 % de congelar al golpear.', on: 'weapon' },
  swift: { id: 'swift', suffix: 'veloz', description: '+2 de velocidad.', on: 'any', stats: { spd: 2 } },
  stone: { id: 'stone', suffix: 'de piedra', description: '+4 de defensa.', on: 'any', stats: { def: 4 } },
  sage: { id: 'sage', suffix: 'del sabio', description: '−1 turno de recarga en el primer especial del objeto.', on: 'weapon' },
  hermit: { id: 'hermit', suffix: 'del ermitaño', description: '+12 de vida máxima.', on: 'any', stats: { maxHp: 12 } },
  // Atributos de las runas del Atril (bloque 2): más flojos que los encontrados, porque se graban en todas las piezas
  rune_stone: { id: 'rune_stone', suffix: '', description: 'Runa de piedra: +2 de defensa.', on: 'any', stats: { def: 2 } },
  rune_hermit: { id: 'rune_hermit', suffix: '', description: 'Runa del ermitaño: +6 de vida máxima.', on: 'any', stats: { maxHp: 6 } },
  rune_swift: { id: 'rune_swift', suffix: '', description: 'Runa veloz: +1 de velocidad.', on: 'any', stats: { spd: 1 } },
};

/** Rareza de un ejemplar (la suya o, si no tiene, la del objeto). */
export function stackRarity(stack: ItemStack, def: ItemDef): Rarity {
  return stack.rarity ?? def.rarity;
}

/**
 * Multiplicador de estadísticas de un ejemplar respecto a su ficha. La ficha ya está pensada para su rareza
 * propia, así que un ejemplar de esa misma rareza queda igual (×1) y uno superior o inferior se ajusta.
 */
export function rarityStatFactor(stack: ItemStack, def: ItemDef): number {
  return RARITY_RULES[stackRarity(stack, def)].statMult / RARITY_RULES[def.rarity].statMult;
}

/** Nombre completo de un ejemplar con sus atributos («Espada de hierro gélida del vampiro»). */
export function stackName(stack: ItemStack, def: ItemDef): string {
  const sfx = (stack.affixes ?? []).map((a) => AFFIXES[a]?.suffix).filter(Boolean);
  return sfx.length ? `${def.name} ${sfx.join(' ')}` : def.name;
}

export function rarityColor(r: Rarity): string {
  return RARITY_INFO[r].color;
}

/** Atributos que dan las runas grabadas (bloque 2). */
export function runeAffixes(stack: ItemStack): string[] {
  return (stack.runes ?? []).map((id) => (id ? RUNES[id]?.affix : undefined)).filter((x): x is string => !!x);
}

/** Estadísticas de un ejemplar tal como suman al equipo: calidad de forja, rareza y atributos. */
export function stackStats(stack: ItemStack, def: ItemDef): Partial<Stats> {
  const q = qualityStats(def.stats, stack.quality);
  const f = rarityStatFactor(stack, def);
  const out: Partial<Stats> = {};
  for (const k of STAT_KEYS) {
    const v = Math.round((q[k] ?? 0) * f) + [...(stack.affixes ?? []), ...runeAffixes(stack)].reduce((n, a) => n + (AFFIXES[a]?.stats?.[k] ?? 0), 0);
    if (v) out[k] = v;
  }
  return out;
}

// ── Tirada de rareza al encontrar un objeto ──
/**
 * Probabilidad de subir un escalón de rareza sobre la del objeto (editable):
 * base + por cada subzona más honda, y escalones extra en los cofres con llave (+1) y en los relicarios de jefe (+2).
 */
export const RARITY_ROLL = { base: 0.18, perSubzone: 0.035, perBonus: 0.15, maxSteps: 2, maxRarity: 'epic' as Rarity };

export interface RarityContext {
  /** 0 (Afueras) … 9 (Trono). */
  depth: number;
  /** 0 normal · 1 cofre con llave · 2 relicario de jefe. */
  bonus: number;
}

/** Rareza de un ejemplar nuevo. Las legendarias son siempre legendarias; las demás pueden subir hasta épica. */
export function rollRarity(def: ItemDef, ctx: RarityContext, next: () => number): Rarity {
  if (def.rarity === 'legendary') return 'legendary';
  const [min, max] = def.rarityRange ?? [def.rarity, RARITY_ROLL.maxRarity];
  let i = RARITY_ORDER.indexOf(min);
  const top = Math.min(RARITY_ORDER.indexOf(max), RARITY_ORDER.indexOf(RARITY_ROLL.maxRarity));
  const p = Math.min(0.85, RARITY_ROLL.base + RARITY_ROLL.perSubzone * ctx.depth + RARITY_ROLL.perBonus * ctx.bonus);
  for (let step = 0; step < RARITY_ROLL.maxSteps && i < top; step++) {
    if (next() < p) i++; else break;
  }
  return RARITY_ORDER[i];
}

/** Atributos aleatorios según la rareza (sin repetir y que encajen con el tipo de objeto). */
export function rollAffixes(def: ItemDef, rarity: Rarity, next: () => number): string[] {
  const [lo, hi] = RARITY_RULES[rarity].affixes;
  const n = lo + Math.floor(next() * (hi - lo + 1));
  const isWeapon = def.slot === 'mainHand' || def.slot === 'offHand';
  const pool = Object.values(AFFIXES).filter((a) => !a.id.startsWith('rune_')).filter((a) => a.on === 'any' || (a.on === 'weapon' ? isWeapon : !isWeapon)).map((a) => a.id);
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
  return out;
}

/** Rareza y atributos a cada pieza equipable que se encuentra (las pociones, llaves y materiales no cambian). */
export function rollStacks<T extends ItemStack>(stacks: T[], getDef: (id: string) => ItemDef, ctx: RarityContext, next: () => number): T[] {
  return stacks.map((s) => {
    const def = getDef(s.itemId);
    if (!def.slot || s.rarity) return s;
    const rarity = rollRarity(def, ctx, next);
    const affixes = rollAffixes(def, rarity, next);
    return { ...s, rarity, ...(affixes.length ? { affixes } : {}) };
  });
}

/** Mejora de los especiales de un arma según su rareza: el primero recarga 1 turno antes (rara) o ambos pegan más (épica). */
export function specialMods(stack: ItemStack, def: ItemDef, specials: string[]): Record<string, { cooldown: number; power: number }> {
  const r = stackRarity(stack, def);
  const order = RARITY_ORDER.indexOf(r);
  const out: Record<string, { cooldown: number; power: number }> = {};
  for (const [i, id] of specials.entries()) {
    const m = { cooldown: 0, power: 0 };
    if (order >= RARITY_ORDER.indexOf('rare') && i === 0) m.cooldown -= 1;
    if (order >= RARITY_ORDER.indexOf('epic')) m.power += 0.15;
    if (i === 0 && stack.affixes?.includes('sage')) m.cooldown -= 1;
    if (m.cooldown || m.power) out[id] = m;
  }
  return out;
}
