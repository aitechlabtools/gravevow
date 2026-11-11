// Jugador de simulación que lee las intenciones (Fase 8): corta lo que se puede cortar, se pone en guardia ante
// un golpe anunciado y castiga al expuesto con su mejor ataque. Es la «respuesta accesible» del plan con acciones básicas.
import { readIntents, canUseSkill, intentDamage, type CombatAction, type CombatState, type Combatant } from '../src/core/combat';
import { getSkill } from '../src/core/data/skills';

export function intentResponse(s: CombatState, me: Combatant): CombatAction | null {
  const r = readIntents(s, me);
  if (r.breakable) return { type: 'attack', targetId: r.breakable.id };
  // Guardia si el golpe anunciado haría daño de verdad (un 15 % de la vida o más); si no, se aguanta y se sigue atacando
  if (r.threat && intentDamage(r.threat, me) >= me.stats.maxHp * 0.15) return { type: 'defend' };
  if (r.exposed && me.hp / me.stats.maxHp >= 0.35) {
    const best = me.skills.map(getSkill).filter((k) => k.target === 'enemy' && k.power && canUseSkill(me, k.id)).sort((x, y) => (y.power ?? 0) - (x.power ?? 0))[0];
    return best ? { type: 'skill', skillId: best.id, targetId: r.exposed.id } : { type: 'attack', targetId: r.exposed.id };
  }
  return null;
}
