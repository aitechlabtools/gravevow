// Misiones (tablón de encargos, 18/11): arriba «Tus misiones» como notas clavadas (máximo 5; los huecos libres llevan
// al Bastión) y, debajo, el «Tablón de encargos» de cada mercader. Tocar una nota abre su detalle: a la derecha en
// escritorio y tableta, a pantalla completa en el móvil. La explicación de cómo funcionan está en el «?».
import { useEffect, useState } from 'react';
import { useGame } from '../../state/store';
import { VENDORS, VENDOR_ORDER, type VendorId } from '../../../core/data/vendors';
import { MAX_ACTIVE_QUESTS, QUESTS } from '../../../core/data/quests';
import { activeQuests, boardQuests, isComplete, isOldQuest } from '../../../core/quests';
import { useLayout } from '../../../config/ui';
import { Modal } from '../common';
import { sfx } from '../../audio';
import { BoardNotes, EmptySlot, MiniBust, QuestDetail, QuestDetailOverlay, QuestNote } from '../QuestNotes';

export const QUESTS_HELP = 'Las misiones de caza, cofres y extracción avanzan al terminar cada expedición. Las entregas se cobran con lo que tengas en la mochila y el alijo. Fija una para tenerla presente en la mazmorra. Si dejas una misión, pierdes lo que llevabas.';

export function Misiones({ vendor }: { vendor?: VendorId | null }) {
  const profile = useGame((s) => s.profile)!;
  const layout = useLayout();
  const phone = layout === 'phone';
  const [open, setOpen] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  // Primero las listas para cobrar, luego las fijadas
  const active = activeQuests(profile).sort((a, b) => Number(isComplete(b, profile)) - Number(isComplete(a, profile)) || Number(!!b.pinned) - Number(!!a.pinned));
  const openP = active.find((p) => p.id === open) ?? null;
  useEffect(() => { if (open && !openP) setOpen(null); }, [open, openP]); // cobrada o dejada: se cierra
  const side = !!openP && !phone;
  const fit = layout !== 'tablet'; // escritorio: todo cabe sin desplazar; móvil: dos columnas, cada una con su desplazamiento; tableta: la pantalla se desplaza
  return (
    <div className={`h-full qscreen ${fit ? 'fit' : 'overflow-y-auto scroll-thin'}`} style={{ padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))' }} data-testid="screen-quests">
      <div className={`mx-auto w-full max-w-[1800px] flex flex-col ${fit ? 'flex-1 min-h-0' : ''}`} style={{ gap: 'var(--gap)' }}>
        <div className={`grid flex-none ${side ? 'qwrap-side' : ''}`} style={{ gap: 'var(--gap)' }}>
          <section className="panel qboard" data-testid="quests-active">
            <div className="phead">
              <span className="phead-t">Tus misiones</span>
              <span className="font-display text-gold text-[clamp(16px,1.3vw,22px)]" data-testid="quests-count">{active.length}/{MAX_ACTIVE_QUESTS}</span>
              <button className="btn ml-auto font-display" style={{ minWidth: 44, minHeight: 44 }} onClick={() => { setHelp(true); sfx('click'); }} aria-label="Cómo funcionan las misiones" data-testid="quests-help">?</button>
            </div>
            <div className="qboard-in">
              <div className={`qgrid ${side ? 'narrow' : ''}`}>
                {active.map((p) => <QuestNote key={p.id} p={p} mode="active" selected={open === p.id} onOpen={() => setOpen(open === p.id ? null : p.id)} />)}
                {Array.from({ length: Math.max(0, MAX_ACTIVE_QUESTS - active.length) }, (_, i) => <EmptySlot key={i} />)}
              </div>
            </div>
          </section>
          {side && <QuestDetail p={openP!} side onClose={() => setOpen(null)} />}
        </div>
        <Available fit={fit} initial={vendor ?? null} />
      </div>
      {openP && phone && <QuestDetailOverlay p={openP} onClose={() => setOpen(null)} />}
      {help && (
        <Modal onClose={() => setHelp(false)} testId="quests-help-modal">
          <div className="panel-title mb-2">Misiones</div>
          <p className="font-body text-lg text-stone-200 leading-snug">{QUESTS_HELP}</p>
          <button className="btn mt-3" style={{ minHeight: 44 }} onClick={() => setHelp(false)} data-testid="quests-help-ok">Entendido</button>
        </Modal>
      )}
    </div>
  );
}

/** Tablón de encargos: siempre visible, con todos los mercaderes que dan encargos (los que no tienen ahora salen apagados). */
const QUEST_VENDORS = VENDOR_ORDER.filter((id) => QUESTS.some((q) => q.vendor === id));
function Available({ fit, initial }: { fit: boolean; initial: VendorId | null }) {
  const profile = useGame((s) => s.profile)!;
  const lv = profile.character.level;
  const count = (id: VendorId) => boardQuests(profile, id).filter((p) => !isOldQuest(p.id, lv)).length;
  const total = (id: VendorId) => boardQuests(profile, id).length;
  const first = QUEST_VENDORS.find((id) => count(id) > 0) ?? QUEST_VENDORS.find((id) => total(id) > 0) ?? QUEST_VENDORS[0];
  const [vid, setVid] = useState<VendorId>(initial && QUEST_VENDORS.includes(initial) ? initial : first);
  return (
    <section className={`panel qboard flex flex-col ${fit ? 'flex-1 min-h-0' : ''}`} data-testid="quests-board">
      <div className="phead flex-none">
        <span className="phead-t">Tablón de encargos</span>
        <span className="text-[14px] text-stone-400 font-body hidden md:inline">Lo que ofrece cada mercader</span>
      </div>
      <div className="qvchips flex-none" role="tablist">
        {QUEST_VENDORS.map((id) => {
          const v = VENDORS[id]; const n = count(id); const none = total(id) === 0;
          return (
            <button key={id} role="tab" aria-selected={vid === id} className={`qvchip ${vid === id ? 'on' : ''} ${none ? 'none' : ''}`} onClick={() => { setVid(id); sfx('click'); }} data-testid={`quests-${id}`} title={none ? `${v.name}: sin encargos` : v.name}>
              <MiniBust sprite={v.sprite} scale={2} /><span className="qvchip-name font-display text-[14px] tracking-[0.06em]" style={{ color: vid === id ? '#120f0a' : none ? '#78716c' : v.color }}>{v.name}</span>
              {none ? <span className="qvchip-none">sin encargos</span> : <span className="qvchip-n">{n}</span>}
            </button>
          );
        })}
      </div>
      <div className={fit ? 'flex-1 min-h-0 overflow-y-auto scroll-thin' : ''}><BoardNotes vendor={vid} /></div>
    </section>
  );
}
