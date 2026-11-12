// Equipo de recluta a mano (Bloque 1, fase 9): el intendente lo ofrece gratis mientras te falte arma o armadura,
// una vez por cada vuelta al Bastión. Sale en Intendencia → Equipo.
import { actions, useGame } from '../state/store';
import { recruitGaps } from '../../core/profile';

export function RecruitOffer() {
  const profile = useGame((s) => s.profile);
  if (!profile || !recruitGaps(profile) || profile.recruitClaimed) return null;
  const what = !profile.equipment.mainHand && !profile.equipment.armor ? 'arma ni armadura' : !profile.equipment.mainHand ? 'arma' : 'armadura';
  return (
    <div className="panel panel-gold p-3 flex flex-col gap-2 w-full max-w-full min-w-0 box-border mb-2" data-testid="recruit-offer">
      <p className="font-body text-base text-stone-200 min-w-0 break-words">
        No llevas {what}. El intendente te presta equipo de recluta.
        <span className="text-stone-400 text-sm block">Gratis, una vez por vuelta. No se vende ni se pierde al morir.</span>
      </p>
      <button className="btn btn-gold py-2 px-4 w-full" style={{ minHeight: 44 }} onClick={() => actions.claimRecruitKit()} data-testid="recruit-claim">Equipo de recluta</button>
    </div>
  );
}
