// Bombas (bloque 2, fase 6): mismo escenario de zona sin bombas y con dos bombas de su nivel.
import { GEAR, scenario, starter, type Cls } from './sim';
import { SUBZONES, SUBZONE_ORDER } from '../../src/core/data/subzones';
import { zoneEnemyLevel } from '../../src/core/data/zones';

/** Qué bomba se lleva en cada subzona (la que se puede fabricar a esa altura). */
const BY_SUB = ['nail_bomb', 'pitch_flask', 'nail_bomb', 'silver_shrapnel', 'silver_shrapnel', 'silver_shrapnel', 'sulfur_flask', 'sulfur_flask', 'sulfur_flask', 'sulfur_flask'];
const NAME: Record<string, string> = { nail_bomb: 'Clavos', pitch_flask: 'Brea', silver_shrapnel: 'Metralla de plata', sulfur_flask: 'Azufre' };

export function bombReport(runs: number): string {
  const out = ['# Simulador · bombas y frascos', '', `${runs} incursiones por fila, 4 combates seguidos (25 % de parejas), 3 pociones y 2 vendas; S1 con equipo inicial y 2 pociones. Se sigue vivo tras el 4.º combate. «Con bombas»: se llevan 2 y se lanza una por combate (las de área, con dos enemigos o en el último).`, '', '| Clase | Subzona | Bomba | Sin bombas | Con 2 bombas | Diferencia |', '|---|---|---|---|---|---|'];
  for (const cls of ['warrior', 'mage'] as Cls[]) {
    SUBZONE_ORDER.forEach((id, i) => {
      const sz = SUBZONES[id];
      const lv = Math.round((sz.levels[0] + sz.levels[1]) / 2);
      const bomb = BY_SUB[i];
      const base = { cls, sub: id, level: lv, gear: i === 0 ? starter(cls) : GEAR[sz.zone][cls], enemies: sz.enemies.map((e) => e.id), enemyLevel: zoneEnemyLevel(sz, lv), potions: i === 0 ? 2 : 3, pairChance: 0.25, headHits: i >= 2, depth: i, pulsesBetween: 8, bandages: i === 0 ? 0 : 2 };
      const a = scenario('sin', base, runs).win[3];
      const b = scenario('con', { ...base, bombs: { id: bomb, n: 2 } }, runs).win[3];
      out.push(`| ${cls === 'warrior' ? 'Guerrero' : 'Mago'} | S${i + 1} | ${NAME[bomb]} | ${Math.round(a * 100)} % | ${Math.round(b * 100)} % | ${b >= a ? '+' : ''}${Math.round((b - a) * 100)} |`);
    });
  }
  return out.join('\n') + '\n';
}
