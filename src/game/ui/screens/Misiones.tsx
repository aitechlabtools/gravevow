// Misiones (tablón de encargos, 18/11): arriba «Tus misiones» como notas clavadas (máximo 5; los huecos libres llevan
// al Bastión) y, debajo, el «Tablón de encargos» de cada mercader. Tocar una nota abre su detalle: a la derecha en
// escritorio y tableta, a pantalla completa en el móvil. La explicación de cómo funcionan está en el «?».
import { useEffect, useState } from 'react';
import { useGame } from '../../state/store';
import { VENDORS, VENDOR_ORDER, type VendorId } from '../../../core/data/vendors';
import { MAX_ACTIVE_QUESTS } from '../../../core/data/quests';
import { activeQuests, boardQuests, isComplete, isOldQuest } from '../../../core/quests';
import { useLayout } from '../../../config/ui';
import { Modal } from '../common';
import { sfx } from '../../audio';
import { BoardNotes, EmptySlot, MiniBust, QuestDetail, QuestDetailOverlay, QuestNote } from '../QuestNotes';

export const QUESTS_HELP = 'Las misiones de caza, cofres y extracción avanzan al terminar cada expedición. Las entregas se cobran con lo que tengas en la mochila y el alijo. Fija una para tenerla presente en la mazmorra. Si dejas una misión, pierdes lo que llevabas.';

export function Misiones({ onBastion }: { onBastion?: () => void }) {
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
  return (
    <div className="h-full overflow-y-auto scroll-thin qscreen" style={{ padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))' }} data-testid="screen-quests">
      <div className="mx-auto max-w-[1800px] flex flex-col" style={{ gap: 'var(--gap)' }}>
        <div className={`grid ${side ? 'qwrap-side' : ''}`} style={{ gap: 'var(--gap)' }}>
          <section className="panel qboard" data-testid="quests-active">
            <div className="phead">
              <span className="phead-t">Tus misiones</span>
              <span className="font-display text-gold text-[clamp(16px,1.3vw,22px)]" data-testid="quests-count">{active.length}/{MAX_ACTIVE_QUESTS}</span>
              <button className="btn ml-auto font-display" style={{ minWidth: 44, minHeight: 44 }} onClick={() => { setHelp(true); sfx('click'); }} aria-label="Cómo funcionan las misiones" data-testid="quests-help">?</button>
            </div>
            <div className="qboard-in">
              <div className={`qgrid ${side ? 'narrow' : ''}`}>
                {active.map((p) => <QuestNote key={p.id} p={p} mode="active" selected={open === p.id} onOpen={() => setOpen(open === p.id ? null : p.id)} />)}
                {Array.from({ length: Math.max(0, MAX_ACTIVE_QUESTS - active.length) }, (_, i) => <EmptySlot key={i} onGo={onBastion} />)}
              </div>
            </div>
          </section>
          {side && <QuestDetail p={openP!} side onClose={() => setOpen(null)} />}
        </div>
        <Available />
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

/** Tablón de encargos: un selector de mercader y sus encargos como notas con «Aceptar». */
function Available() {
  const profile = useGame((s) => s.profile)!;
  const order = VENDOR_ORDER.filter((id) => boardQuests(profile, id).length > 0);
  const [vid, setVid] = useState<VendorId | null>(order[0] ?? null);
  const cur = vid && order.includes(vid) ? vid : order[0];
  if (!cur) return null;
  return (
    <section className="panel qboard" data-testid="quests-board">
      <div className="phead">
        <span className="phead-t">Tablón de encargos</span>
        <span className="text-[14px] text-stone-400 font-body hidden md:inline">Lo que ofrece cada mercader</span>
      </div>
      <div className="flex gap-2 flex-wrap px-3 pt-3" role="tablist">
        {order.map((id) => {
          const v = VENDORS[id];
          const n = boardQuests(profile, id).filter((p) => !isOldQuest(p.id, profile.character.level)).length;
          return (
            <button key={id} role="tab" aria-selected={cur === id} className={`qvchip ${cur === id ? 'on' : ''}`} onClick={() => { setVid(id); sfx('click'); }} data-testid={`quests-${id}`}>
              <MiniBust sprite={v.sprite} scale={2} /><span className="font-display text-[14px] tracking-[0.06em]" style={{ color: cur === id ? '#120f0a' : v.color }}>{v.name}</span><span className="qvchip-n">{n}</span>
            </button>
          );
        })}
      </div>
      <BoardNotes vendor={cur} />
    </section>
  );
}
