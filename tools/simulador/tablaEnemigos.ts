// Tabla de enemigos por subzona (análisis del bloque 1): golpe, tipo, habilidades y lo que pueden causar.
import { SUBZONES } from '../../src/core/data/subzones';
import { getEnemy } from '../../src/core/data/enemies';
import { getSkill } from '../../src/core/data/skills';
import { enemyThreats } from '../../src/core/armor';
export function tabla(): string {
  const rows = ['| Subzona | Enemigo | Rol | PV | Golpe básico (efecto) | Habilidades (efecto) | Puede causar |', '|---|---|---|---|---|---|---|'];
  for (const sz of Object.values(SUBZONES)) {
    const list = [...sz.enemies.map((e) => [e.id, 'común']), [sz.elite, 'élite'], [sz.boss, 'jefe']];
    for (const [id, rol] of list) {
      const e = getEnemy(id);
      const sk = e.skills.map((s) => { const k = getSkill(s); return `${k.name} (${k.kind ?? '—'}/${k.fx ?? '—'})`; }).join(', ');
      rows.push(`| ${sz.index} ${sz.name} | ${e.name} | ${rol} | ${e.stats.maxHp} | ${e.basicAttack.name} (${e.basicAttack.kind}/${e.basicAttack.fx}) | ${sk || '—'} | ${enemyThreats(id).join(', ') || '—'} |`);
    }
  }
  return rows.join('\n');
}
