// Disparadores de los mini tutoriales de la expedición (fase 5, data/tutorials.ts): mira el estado de la bajada y
// lanza cada evento la primera vez que pasa. La cola ya descarta los vistos y los repetidos; aquí solo se detecta.
import { useEffect } from 'react';
import { actions, useGame } from '../state/store';
import { regionMaxes, REGIONS, VITAL } from '../../core/anatomy';
import { isBroken } from '../../core/durability';
import { needLevel } from '../../core/needs';
import { NEEDS } from '../../config/needs';
import { getEnemy } from '../../core/data/enemies';
import { cooldownLeft, currentActor } from '../../core/combat';
import { combatLoadout } from '../../core/loadout';
import { isSubzoneId, SUBZONES } from '../../core/data/subzones';
import { useLoad } from './CarryBar';

export function useExpeditionMinis() {
  const off = useGame((s) => !!s.tutorial || s.screen !== 'dungeon' || !s.expedition);
  // Cuerpo: el del combate si hay uno (es el que cambia golpe a golpe), si no el de la expedición
  const body = useGame((s) => s.combat?.state.combatants.find((c) => c.control === 'player')?.body ?? s.expedition?.body ?? null);
  const vital = !!body && VITAL.some((r) => body.parts[r].hp < regionMaxes(body.total)[r] * 0.5);
  const fracture = !!body && REGIONS.some((r) => body.parts[r].fracture);
  const bleeding = !!body && REGIONS.some((r) => body.parts[r].bleed > 0);
  const broken = useGame((s) => !!s.expedition && Object.values(s.expedition.equipment).some((x) => isBroken(x)));
  const needLow = useGame((s) => !!s.expedition?.needs && NEEDS.some((k) => needLevel(s.expedition!.needs![k]) !== 'ok'));
  const load = useLoad();
  const full = useGame((s) => !!s.invError && /cabe|peso|sitio|espacio/i.test(s.invError)) || !!load?.tier;
  const rivalRisk = useGame((s) => (s.modal?.type === 'rival' ? s.rival.risk : null));
  const elite = useGame((s) => !!s.combat?.state.combatants.some((c) => c.side === 'B' && c.hp > 0 && !!c.ref && c.ref !== 'rival' && !!getEnemy(c.ref)?.elite));
  const boss = useGame((s) => !!s.combat?.state.combatants.some((c) => c.side === 'B' && c.hp > 0 && c.boss));
  const classReady = useGame((s) => {
    const cs = s.combat?.state, p = s.profile;
    if (!cs || cs.outcome || !p) return false;
    const me = cs.combatants.find((c) => c.control === 'player');
    const kit = combatLoadout(p.character.classId, s.expedition?.equipment ?? p.equipment, p.classSkills.equipped);
    return !!me && currentActor(cs)?.id === me.id && me.skills.includes(kit.classSkill) && !cooldownLeft(me, kit.classSkill);
  });
  const subzone = useGame((s) => s.expedition?.subzone ?? null);

  const fire = (cond: boolean, trigger: string) => { if (!off && cond) actions.tutorialEvent(trigger); };
  useEffect(() => fire(true, 'exp:clock'), [off]);
  useEffect(() => { if (!off && subzone && isSubzoneId(subzone) && SUBZONES[subzone].index > 1) actions.tutorialEvent(`subzone:${subzone}`); }, [off, subzone]);
  useEffect(() => fire(vital, 'exp:vital-wound'), [off, vital]);
  useEffect(() => fire(fracture, 'exp:fracture'), [off, fracture]);
  useEffect(() => fire(bleeding, 'exp:bleeding'), [off, bleeding]);
  useEffect(() => fire(broken, 'exp:armor-broken'), [off, broken]);
  useEffect(() => fire(needLow, 'exp:need-low'), [off, needLow]);
  useEffect(() => fire(full, 'exp:backpack-full'), [off, full]);
  useEffect(() => fire(rivalRisk === 'kael', 'exp:kael'), [off, rivalRisk]);
  useEffect(() => fire(!!rivalRisk && rivalRisk !== 'kael', 'exp:merc-triangle'), [off, rivalRisk]);
  useEffect(() => fire(elite, 'exp:elite'), [off, elite]);
  useEffect(() => fire(boss, 'exp:boss'), [off, boss]);
  useEffect(() => fire(classReady, 'combat:class-skill'), [off, classReady]);
}

/** Va dentro de la pantalla de la mazmorra: no pinta nada. */
export function ExpeditionMinis() {
  useExpeditionMinis();
  return null;
}
