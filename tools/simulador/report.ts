// Tablas del simulador en Markdown.
import { allRows, bossRows, noviceRows, tutorialDeaths, type Row } from './sim';
import { applyScenario } from './escenarios';

const pct = (x: number) => `${Math.round(x * 100)} %`;
const CLS = { warrior: 'Guerrero', mage: 'Mago' } as const;

export function report(runs: number, name: string): string {
  const note = applyScenario(name);
  const rows = allRows(runs);
  const out: string[] = [];
  out.push(`# Simulador de combate · escenario «${name}»`, '', `${runs} incursiones por fila. ${note}`, '');
  out.push('## Combates seguidos', '', 'Se sigue vivo tras 1, 2, 3 y 4 combates seguidos (cada combate tiene un 25 % de que se sume un segundo enemigo). Vida media al acabar cada uno (de los que siguen vivos). S1 con equipo inicial y 2 pociones, sin vendas; el resto con el equipo de su zona, 3 pociones y 2 vendas.', '');
  out.push('| Clase | Escenario | 1 | 2 | 3 | 4 | Vida tras 1 · 2 · 3 · 4 | Pociones gastadas |', '|---|---|---|---|---|---|---|---|');
  for (const r of rows) out.push(`| ${CLS[r.cls]} | ${r.label} | ${r.win.map(pct).join(' | ')} | ${r.hp.map(pct).join(' · ')} | ${r.potions.toFixed(1)} |`);
  out.push('', '## Estados por golpe recibido', '', 'Golpes que alcanzan al jugador y lo que provocan (sangrados y fracturas por la anatomía; el resto, estados de habilidades enemigas).', '');
  out.push('| Clase | Escenario | Golpes | Sangrado leve | Sangrado grave | Fractura | Algún estado de cuerpo | Otros estados |', '|---|---|---|---|---|---|---|---|');
  for (const r of rows) out.push(statsRow(r));
  out.push('', '## Élites y jefes (un combate, cuerpo entero, 3 pociones)', '', '| Subzona | Clase | Nivel | Élite | Jefe |', '|---|---|---|---|---|');
  for (const b of bossRows(Math.max(60, Math.round(runs / 3)))) out.push(`| ${b.id} | ${CLS[b.cls]} | ${b.level} | ${pct(b.elite)} | ${pct(b.boss)} |`);
  out.push('', '## Tutorial: probabilidad de caer (sin la red de seguridad)', '', '«Novato» solo usa el ataque básico y la poción por debajo del 35 %.', '', '| Clase | Jugador | Rata | Bandidos con Osric | Osric traidor | Alguna vez |', '|---|---|---|---|---|---|');
  for (const novice of [false, true]) for (const [cls, d] of Object.entries(tutorialDeaths(runs, novice))) out.push(`| ${CLS[cls as 'warrior']} | ${novice ? 'novato' : 'razonable'} | ${pct(d.rata)} | ${pct(d.bandidos)} | ${pct(d.osric)} | ${pct(d.total)} |`);
  out.push('', '## S1 con un jugador novato (solo ataque básico)', '', '| Clase | Escenario | 1 | 2 | 3 | 4 | Vida tras 1 · 2 · 3 · 4 |', '|---|---|---|---|---|---|---|');
  for (const r of noviceRows(runs)) out.push(`| ${CLS[r.cls]} | ${r.label} | ${r.win.map(pct).join(' | ')} | ${r.hp.map(pct).join(' · ')} |`);
  out.push('');
  return out.join('\n');
}

function statsRow(r: Row) {
  const t = r.tally, h = Math.max(1, t.hits);
  const body = (t.bleedLight + t.bleedHeavy + t.fracture) / h;
  const other = Object.entries(t.other).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${pct(v / h)}`).join(', ') || '—';
  return `| ${CLS[r.cls]} | ${r.label} | ${(t.hits / r.runs).toFixed(1)} | ${pct(t.bleedLight / h)} | ${pct(t.bleedHeavy / h)} | ${pct(t.fracture / h)} | ${pct(body)} | ${other} |`;
}
