// Cartel del tutorial inicial de expedición: «Paso N de 8», la indicación (de ratón o de toque) y «Saltar» con
// confirmación. Resalta lo que hay que tocar (`tut-pulse`); la flecha sobre el mapa la pone la escena.
// Datos y guion: core/data/tutorial.ts.
import { useEffect, useState } from 'react';
import { actions, useGame } from '../state/store';
import { TUTORIAL_PARTS, TUTORIAL_STEPS, TUTORIAL_WEAPON, type TutorialStep } from '../../core/data/tutorial';
import { useIsTouch } from '../../shared/device';
import { rich } from './MiniTutorial';
import { sfx } from '../audio';

/** Selectores de lo que se resalta en este paso, por orden de preferencia. */
function selectors(step: TutorialStep, weapon: string, touch: boolean): string[] {
  if (step.highlight) return step.highlight.map((x) => x.replace('{weapon}', weapon));
  if (step.target && 'ui' in step.target) return [`[data-testid="${touch && step.target.ui === 'btn-potion' ? 'touch-potion' : step.target.ui}"]`];
  return [];
}

/** Pasos que se ven también durante el combate (los demás esperan a que acabe). */
const IN_COMBAT = new Set(['attack', 'special', 'together']);

export function TutorialGuide() {
  const t = useGame((s) => s.tutorial)!;
  const inCombat = useGame((s) => !!s.combat && !s.combat.state.outcome);
  const combatOpen = useGame((s) => !!s.combat);
  const classId = useGame((s) => s.profile?.character.classId ?? 'warrior');
  const touch = useIsTouch();
  const channel = useGame((s) => s.hud.channel);
  const [ask, setAsk] = useState(false);
  const step = TUTORIAL_STEPS[t.step];
  const sels = step ? selectors(step, TUTORIAL_WEAPON[classId], touch) : [];
  const key = sels.join('|');
  // Resalta el primero que esté en pantalla; la pantalla cambia sin avisar, así que se mira a menudo
  useEffect(() => {
    if (!key) return;
    const list = key.split('|');
    let el: Element | null = null;
    const find = () => {
      let now: Element | null = null;
      for (const q of list) { now = document.querySelector(q); if (now) break; }
      if (now !== el) { el?.classList.remove('tut-pulse'); el = now; }
      // React rehace el `class` al repintar: se vuelve a poner si se ha perdido
      if (el && !el.classList.contains('tut-pulse')) el.classList.add('tut-pulse');
    };
    find();
    const iv = setInterval(find, 250);
    return () => { clearInterval(iv); el?.classList.remove('tut-pulse'); };
  }, [key]);
  if (!step) return null;
  // Combate: solo sus propios pasos (y no en la pantalla de resultado). Al canalizar el portal se aparta.
  if (combatOpen && !(inCombat && IN_COMBAT.has(step.id))) return null;
  if (channel > 0) return null;
  const text = touch ? step.touch : step.desktop;
  return (
    <div className={`tut-guide panel panel-gold ${inCombat ? 'in-combat' : ''}`} role="status" aria-live="polite" data-testid="tutorial-guide" data-step={step.id}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-gold text-[11px] tracking-[0.2em] uppercase" data-testid="tutorial-count">Paso {step.part} de {TUTORIAL_PARTS}</span>
        {!ask && (
          <button className="tut-skip" onClick={() => { sfx('click'); setAsk(true); }} data-testid="tutorial-skip">Saltar</button>
        )}
      </div>
      {ask ? (
        <div data-testid="tutorial-skip-confirm">
          <div className="font-body text-parchment leading-snug mt-1">¿Saltar el tutorial? Podrás jugarlo desde Ajustes › Partida.</div>
          <div className="flex gap-2 justify-center mt-2">
            <button className="btn text-sm" style={{ minHeight: 44 }} onClick={() => setAsk(false)} data-testid="tutorial-skip-no">Seguir</button>
            <button className="btn btn-danger text-sm" style={{ minHeight: 44 }} onClick={() => { sfx('click'); void actions.skipTutorialRun(); }} data-testid="tutorial-skip-yes">Saltar el tutorial</button>
          </div>
        </div>
      ) : (
        <div className="font-body text-parchment leading-snug mt-0.5" data-testid="tutorial-text">{rich(text)}</div>
      )}
    </div>
  );
}
