// Bloque 2, fase 7: simulador de economía. Para cada estación compara, en monedas, lo que cuesta fabricar,
// lo que vale comprar, lo que se saca vendiendo y lo que se espera sacar desguazando (banco 0 y banco 3).
// No tira dados: usa la esperanza (cantidad × probabilidad). Un bucle «gana» si devuelve más de lo que costó.
import { buyPrice, sellPrice } from '../../src/core/economy';
import { CRAFT_RECIPES, STATION_NAMES, recipeFor } from '../../src/core/crafting';
import { getItem } from '../../src/core/data/items';
import { salvageInfo } from '../../src/core/salvage';
import type { CraftStation } from '../../src/core/data/crafting';

const made = new Set(CRAFT_RECIPES.map((r) => r.result));
/** Coste en monedas de una unidad comprando las materias primas (los intermedios se descomponen). */
export function rawCost(id: string): number {
  const r = recipeFor(id);
  if (!r || getItem(id).slot || !made.has(id) || !r.ingredients.length) return buyPrice(id);
  return r.ingredients.reduce((s, m) => s + rawCost(m.itemId) * m.qty, 0) / r.qty;
}
/** Monedas que se esperan del desguace vendiendo lo obtenido. */
export function salvageReturn(id: string, bench: number): number | null {
  const info = salvageInfo({ uid: 'x', itemId: id, qty: 1 }, bench);
  if (!info) return null;
  return info.safe.reduce((s, x) => s + sellPrice(x.itemId) * x.qty, 0) + info.possible.reduce((s, x) => s + sellPrice(x.itemId) * x.qty * x.chance, 0);
}
const pct = (x: number) => `${Math.round(x * 100)} %`;
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

export interface EconRow { station: string; recipes: number; craftVsBuy: number; craftSellMax: number; salvage0Max: number; salvage3Max: number; buySalvageMax: number }

export function economyRows(): EconRow[] {
  const by = new Map<CraftStation, typeof CRAFT_RECIPES>();
  for (const r of CRAFT_RECIPES) by.set(r.station, [...(by.get(r.station) ?? []), r]);
  return [...by].map(([st, rs]) => {
    const cost = (r: (typeof rs)[number]) => r.ingredients.reduce((s, m) => s + rawCost(m.itemId) * m.qty, 0);
    const gear = rs.filter((r) => getItem(r.result).slot);
    const sv = (b: number) => Math.max(0, ...gear.map((r) => (salvageReturn(r.result, b) ?? 0) / cost(r)));
    return {
      station: STATION_NAMES[st], recipes: rs.length,
      craftVsBuy: med(rs.map((r) => cost(r) / (buyPrice(r.result) * r.qty))),
      craftSellMax: Math.max(...rs.map((r) => (sellPrice(r.result) * r.qty) / cost(r))),
      salvage0Max: sv(0), salvage3Max: sv(3),
      buySalvageMax: Math.max(0, ...gear.map((r) => (salvageReturn(r.result, 3) ?? 0) / buyPrice(r.result))),
    };
  });
}

export function economyReport(): string {
  const rows = economyRows();
  const out = ['# Simulador · economía del crafteo', '', 'Cifras en monedas, sin azar (esperanza). Cada columna es la proporción «lo que vuelve ÷ lo que cuesta»: por debajo del 100 % el ciclo pierde.', '',
    '- **Fabricar ÷ comprar**: mediana de lo que cuestan las materias frente al precio de tienda (más bajo = fabricar sale más a cuenta).',
    '- **Fabricar y vender**: el peor caso (el que más devuelve) de comprar materias, fabricar y vender a Nira.',
    '- **Fabricar y desguazar**: el peor caso de fabricar equipo, desguazarlo y vender lo sacado; banco 0 y banco de maestro.',
    '- **Comprar y desguazar**: comprar el objeto en tienda, desguazarlo con el banco de maestro y vender lo sacado.', '',
    '| Estación | Recetas | Fabricar ÷ comprar | Fabricar y vender | Fabricar y desguazar (banco 0) | (banco 3) | Comprar y desguazar |', '|---|---|---|---|---|---|---|'];
  for (const r of rows) out.push(`| ${r.station} | ${r.recipes} | ${pct(r.craftVsBuy)} | ${pct(r.craftSellMax)} | ${r.salvage0Max ? pct(r.salvage0Max) : '—'} | ${r.salvage3Max ? pct(r.salvage3Max) : '—'} | ${r.buySalvageMax ? pct(r.buySalvageMax) : '—'} |`);
  const worst = Math.max(...rows.flatMap((r) => [r.craftSellMax, r.salvage3Max, r.buySalvageMax]));
  const ties = CRAFT_RECIPES.filter((r) => sellPrice(r.result) * r.qty >= r.ingredients.reduce((s, m) => s + rawCost(m.itemId) * m.qty, 0)).map((r) => getItem(r.result).name);
  out.push('', worst > 1 ? `**Atención:** hay un ciclo que gana (${pct(worst)}).` : worst === 1 ? `Ningún ciclo gana. Empatan (se recupera lo gastado, sin ganar nada) por el mínimo de 1 moneda: ${ties.join(', ')}.` : `Ningún ciclo gana: el que más devuelve se queda en el ${pct(worst)}.`);
  out.push('', 'Nota: en monedas, todo lo que vale menos de 10 se compra y se vende por 1 moneda. Por eso fabricar consumibles con materias compradas sale más caro que comprarlos hechos (columna «Fabricar ÷ comprar» por encima del 100 %): las materias baratas se consiguen en las incursiones, no en la tienda.');
  return out.join('\n') + '\n';
}
