// Aviso que sale en el pueblo cuando hay un desbloqueo de clase pendiente (niveles 20, 40, 60 y 80).
// La lista completa y el camino de hitos están en screens/Personaje.tsx (pestaña «Habilidad de clase»).
import { className } from '../../core/gender';
import { useState } from 'react';
import { actions, useGame } from '../state/store';
import { CLASSES } from '../../core/data/classes';
import { getSkill } from '../../core/data/skills';
import { pendingUnlocks } from '../../core/classSkills';
import { ActionIcon } from './combatActions';
import { Modal } from './common';

/** Aviso en el pueblo al ganar un desbloqueo: eliges cuál y te invita a equiparla para probarla. */
export function ClassUnlockNotice() {
  const profile = useGame((s) => s.profile)!;
  const [closed, setClosed] = useState(false);
  const [just, setJust] = useState<string | null>(null);
  const pending = pendingUnlocks(profile);
  // Capturas automáticas (landing, tráiler): ?debug&noclass no enseña el aviso
  const hidden = typeof window !== 'undefined' && /[?&]noclass/.test(window.location.search);
  if (hidden || closed || (!pending && !just)) return null;
  const close = () => setClosed(true);
  if (just) {
    const sk = getSkill(just);
    return (
      <Modal onClose={() => setJust(null)} testId="class-unlocked">
        <h2 className="panel-title text-xl mb-2">{sk.name}</h2>
        <p className="font-body text-lg text-stone-200">{sk.description}</p>
        <p className="font-body text-stone-300 mt-2">¿La llevas en la próxima expedición para probarla? Solo puedes llevar una habilidad de clase; la cambias cuando quieras en Personaje.</p>
        <div className="flex gap-2 mt-4 flex-wrap">
          <button className="btn btn-gold" onClick={() => { actions.equipClassSkill(just); setJust(null); }} data-testid="btn-try-class">Equiparla</button>
          <button className="btn" onClick={() => setJust(null)} data-testid="btn-later-class">Ahora no</button>
        </div>
      </Modal>
    );
  }
  const cls = CLASSES[profile.character.classId];
  const options = cls.classSkills.filter((id) => !profile.classSkills.unlocked.includes(id));
  return (
    <Modal onClose={close} testId="class-unlock">
      <h2 className="panel-title text-xl mb-1">Nuevo desbloqueo de clase</h2>
      <p className="font-body text-stone-300 mb-3">Has llegado al nivel {profile.character.level}. Elige qué habilidad de {className(profile.character.classId, profile.character.appearance.sex).toLowerCase()} aprendes; las demás seguirán esperando a tus próximos desbloqueos.</p>
      <div className="grid gap-2 max-h-[55vh] overflow-y-auto scroll-thin">
        {options.map((id) => {
          const sk = getSkill(id);
          return (
            <button key={id} className="text-left flex gap-3 items-start p-2 border-2 border-stone-700 hover:border-gold min-h-[44px]" onClick={() => { if (actions.unlockClassSkill(id)) setJust(id); }} data-testid={`pick-class-${id}`}>
              <span className="grid place-items-center rotate-45 border-2 bg-[#0d0c11] shrink-0 mt-2 ml-1" style={{ width: 28, height: 28, borderColor: '#e8b33a99' }}><span className="-rotate-45"><ActionIcon fx={sk.fx} color="#e8b33a" size={15} /></span></span>
              <span className="min-w-0"><span className="font-display text-parchment block">{sk.name} <span className="text-[11px] text-stone-400 font-body">· recarga {sk.cooldown}</span></span><span className="font-body text-[14px] text-stone-300 leading-snug">{sk.description}</span></span>
            </button>
          );
        })}
      </div>
      <button className="btn mt-3" onClick={close} data-testid="btn-class-unlock-later">Elegir más tarde</button>
    </Modal>
  );
}
