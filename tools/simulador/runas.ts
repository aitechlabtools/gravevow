// Runas (bloque 2, parte 2.1): mismo escenario de zona con y sin runas grabadas en todo el equipo.
import { GEAR, scenario, type Cls } from './sim';
import { SUBZONES, SUBZONE_ORDER } from '../../src/core/data/subzones';
import { zoneEnemyLevel } from '../../src/core/data/zones';
import type { Equipment, ItemStack } from '../../src/core/types';

type Plan = 'sin' | 'una' | 'dos';
/** «una»: una runa por pieza (común o poco común): vampiro en el arma, piedra en el resto.
 *  «dos»: dos por pieza (raro o épico; aquí sin cambiar la rareza, solo el efecto de las runas): vampiro + veloz en armas, piedra + ermitaño en el resto. */
function rune(eq: Equipment, plan: Plan): Equipment {
  if (plan === 'sin') return eq;
  const out = { ...eq };
  for (const [slot, st] of Object.entries(eq) as [keyof Equipment, ItemStack | null][]) {
    if (!st || slot === 'ring') continue;
    const weapon = slot === 'mainHand' || slot === 'offHand';
    const runes = weapon ? ['rune_vampire', 'rune_swift'] : ['rune_stone', 'rune_hermit'];
    out[slot] = { ...st, runes: runes.slice(0, plan === 'dos' ? 2 : 1) };
  }
  return out;
}

export function runeReport(runs: number): string {
  const out = ['# Simulador · runas del Atril rúnico', '', `${runs} incursiones por fila, 4 combates seguidos con el equipo de su zona, 3 pociones y 2 vendas. Se sigue vivo tras el 4.º combate.`, '', '| Clase | Subzona | Sin runas | Una por pieza | Dos por pieza |', '|---|---|---|---|---|'];
  for (const cls of ['warrior', 'mage'] as Cls[]) {
    for (const id of SUBZONE_ORDER.slice(3)) {
      const sz = SUBZONES[id];
      const i = SUBZONE_ORDER.indexOf(id);
      const lv = Math.round((sz.levels[0] + sz.levels[1]) / 2);
      const row = (plan: Plan) => scenario(plan, { cls, sub: id, level: lv, gear: rune(GEAR[sz.zone][cls], plan), enemies: sz.enemies.map((e) => e.id), enemyLevel: zoneEnemyLevel(sz, lv), potions: 3, pairChance: 0.25, headHits: true, depth: i, pulsesBetween: 8, bandages: 2 }, runs).win[3];
      out.push(`| ${cls === 'warrior' ? 'Guerrero' : 'Mago'} | S${i + 1} | ${Math.round(row('sin') * 100)} % | ${Math.round(row('una') * 100)} % | ${Math.round(row('dos') * 100)} % |`);
    }
  }
  return out.join('\n') + '\n';
}
