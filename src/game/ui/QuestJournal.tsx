// Diario de misiones (25/11): tres columnas en escritorio y tableta.
// Izquierda «Tus misiones» (tarjetas compactas, listas para cobrar primero) · centro el detalle de la elegida · derecha el «Tablón de encargos»
// con filtro por mercader (Todos por defecto). Estados: disponible (gris), en progreso (dorado), completada (verde).
import { useState } from 'react';
import { actions, useGame } from '../state/store';
import { VENDORS, VENDOR_ORDER, type VendorId } from '../../core/data/vendors';
import { MAX_ACTIVE_QUESTS, QUESTS } from '../../core/data/quests';
import { acceptBlock, activeQuests, boardQuests, isComplete, isOldQuest, questDef, questProgress } from '../../core/quests';
import type { QuestProgress } from '../../core/types';
import { iconUrl } from '../../shared/art';
import { sfx } from '../audio';
import { ClaimButton, ObjectiveArt, Px, objective } from './QuestNotes';
import { loopIcon, nailIcon, pinIcon, repIcon, xpIcon } from './uiIcons';

const QUEST_VENDORS = VENDOR_ORDER.filter((id) => QUESTS.some((q) => q.vendor === id));
type State = 'board' | 'progress' | 'done';
const STATE_TXT: Record<State, string> = { board: 'Disponible', progress: 'En progreso', done: 'Completada' };

/** Qué hay que hacer, en una línea. */
function goalText(id: string): string {
  const q = questDef(id);
  const verb = q.type === 'deliver' ? 'Entregar' : q.type === 'kill' || q.type === 'kill_boss' ? 'Eliminar' : q.type === 'mine' ? 'Picar' : q.type === 'open_chest' ? 'Abrir' : 'Completar';
  return `${verb}: ${objective(q).label.toLowerCase()}`;
}

export function QuestJournal({ onVisit, onHelp, initial }: { onVisit?: (v: VendorId) => void; onHelp: () => void; initial?: VendorId | null }) {
  const profile = useGame((s) => s.profile)!;
  const active = activeQuests(profile).sort((a, b) => Number(isComplete(b, profile)) - Number(isComplete(a, profile)) || Number(!!b.pinned) - Number(!!a.pinned));
  const [selId, setSelId] = useState<string | null>(null);
  const sel = active.find((p) => p.id === selId) ?? active[0] ?? null;
  const free = Math.max(0, MAX_ACTIVE_QUESTS - active.length);
  return (
    <div className="qj" data-testid="quest-journal">
      <section className="panel qj-col" data-testid="quests-active">
        <div className="qj-head"><span className="phead-t">Tus misiones</span><span className="font-display text-gold text-[18px] ml-auto" data-testid="quests-count">{active.length}/{MAX_ACTIVE_QUESTS}</span>
          <button className="btn font-display" style={{ minWidth: 44, minHeight: 44 }} onClick={() => { onHelp(); sfx('click'); }} aria-label="Cómo funcionan las misiones" data-testid="quests-help">?</button></div>
        <div className="qj-slots" aria-hidden>{Array.from({ length: MAX_ACTIVE_QUESTS }, (_, i) => <span key={i} className={i < active.length ? 'on' : ''} />)}</div>
        <div className="qj-list scroll-thin">
          {active.map((p) => <ActiveCard key={p.id} p={p} on={sel?.id === p.id} onPick={() => { setSelId(p.id); sfx('click'); }} />)}
          {free > 0 && <div className="qj-free" data-testid="quest-empty">+ {free} {free === 1 ? 'espacio disponible' : 'espacios disponibles'}</div>}
        </div>
      </section>
      <section className="panel qj-col qj-center" data-testid="quest-detail-col">
        <div className="qj-head justify-center"><span className="phead-t">Detalle de misión</span></div>
        {sel ? <Detail key={sel.id} p={sel} onVisit={onVisit} />
          : <div className="qj-empty"><span className="font-display text-parchment text-[16px]">Sin misiones aceptadas</span><span>Elige un encargo del tablón para empezar.</span></div>}
      </section>
      <Board initial={initial ?? null} />
    </div>
  );
}

function ActiveCard({ p, on, onPick }: { p: QuestProgress; on: boolean; onPick: () => void }) {
  const profile = useGame((s) => s.profile)!;
  const q = questDef(p.id), v = VENDORS[q.vendor];
  const prog = Math.min(questProgress(p, profile), q.count);
  const st: State = prog >= q.count ? 'done' : 'progress';
  return (
    <button type="button" className={`qj-card st-${st} ${on ? 'on' : ''}`} onClick={onPick} aria-pressed={on} data-testid={`quest-${q.id}`} data-mode="active">
      <span className="qj-nail" aria-hidden><Px src={p.pinned ? pinIcon(2) : nailIcon(2)} title={p.pinned ? 'Fijada' : undefined} /></span>
      <span className="qj-ico"><ObjectiveArt q={q} /></span>
      {st === 'done' && <span className="qj-seal" data-testid={`quest-ready-${q.id}`}>● {q.type === 'deliver' ? 'Lista' : 'Cumplida'}</span>}
      <span className="qj-card-main">
        <span className="qj-vname" style={{ color: v.color }}>{v.name}</span>
        <span className="qj-name">{q.name}</span>
        <span className="qj-row"><span className={`qj-st st-${st}`}>{STATE_TXT[st]}</span><span className="qj-n">{prog}/{q.count}</span></span>
        <span className="qj-bar"><span style={{ width: `${(prog / q.count) * 100}%` }} /></span>
      </span>
    </button>
  );
}

function RewardCards({ id }: { id: string }) {
  const q = questDef(id), v = VENDORS[q.vendor];
  return (
    <div className="qj-rw" data-testid={`quest-rewards-${q.id}`}>
      <div><Px src={iconUrl('coin', 2)} /><b className="text-gold">+{q.reward.gold}</b><span>Oro</span></div>
      <div><Px src={xpIcon(2)} /><b className="text-arcane">+{q.reward.xp}</b><span>Experiencia</span></div>
      <div><Px src={repIcon(v.color, 2)} /><b style={{ color: v.color }}>+{q.reward.rep}</b><span>Reputación</span></div>
    </div>
  );
}

function Detail({ p, onVisit }: { p: QuestProgress; onVisit?: (v: VendorId) => void }) {
  const profile = useGame((s) => s.profile)!;
  const [confirm, setConfirm] = useState(false);
  const q = questDef(p.id), v = VENDORS[q.vendor];
  const prog = Math.min(questProgress(p, profile), q.count);
  const done = prog >= q.count;
  return (
    <div className="qj-detail" data-testid="quest-detail">
      <div className="qj-art"><ObjectiveArt q={q} big seal={done ? (q.type === 'deliver' ? 'Lista' : 'Cumplida') : undefined} /></div>
      <div className="text-center">
        <div className="qj-title">{q.name}{q.repeatable && <span className="ml-2 align-middle"><Px src={loopIcon(2)} title="Repetible" /></span>}</div>
        <div className="text-[13px] text-stone-400">Encargo de <span style={{ color: v.color }}>{v.name}</span>{q.repeatable ? ' · repetible' : ''}</div>
      </div>
      <p className="qj-desc">{q.description}</p>
      <div className="qj-sec">
        <div className="qj-cap">Objetivo</div>
        <div className="flex justify-between text-[14px]"><span className="text-stone-200">{q.type === 'deliver' ? 'Tienes en la mochila y el alijo' : goalText(q.id)}</span><b className={done ? 'text-[#5fd19a]' : 'text-parchment'}>{prog}/{q.count}</b></div>
        <div className="qj-bar big"><span style={{ width: `${(prog / q.count) * 100}%`, background: done ? '#5fd19a' : undefined }} /></div>
      </div>
      <div className="qj-sec"><div className="qj-cap">Recompensas</div><RewardCards id={q.id} /></div>
      <div className="qj-actions">
        {done && <ClaimButton q={q} done className="w-full" />}
        <div className="flex gap-2">
          {onVisit && <button className="btn flex-1 font-display" style={{ minHeight: 44 }} onClick={() => { sfx('click'); onVisit(q.vendor); }} data-testid={`visit-${q.id}`}>Visitar a {v.name}</button>}
          <button className={`btn font-display px-4 ${p.pinned ? 'btn-gold' : ''}`} style={{ minHeight: 44 }} onClick={() => actions.togglePinQuest(q.id)} aria-pressed={!!p.pinned} title="Se recuerda en Jugar y en la mazmorra" data-testid={`pin-${q.id}`}>{p.pinned ? '★ Fijada' : '☆ Fijar'}</button>
        </div>
        {confirm
          ? <div className="flex gap-2 items-center justify-center"><span className="text-[13px] text-[#ff8a8a]">¿Dejarla? Pierdes lo hecho.</span>
              <button className="btn btn-danger font-display px-3" style={{ minHeight: 44 }} onClick={() => { actions.abandonQuest(q.id); setConfirm(false); }} data-testid={`abandon-yes-${q.id}`}>Sí, dejar</button>
              <button className="btn font-display px-3" style={{ minHeight: 44 }} onClick={() => setConfirm(false)}>No</button></div>
          : <button className="qj-abandon" onClick={() => setConfirm(true)} data-testid={`abandon-${q.id}`}>Abandonar misión</button>}
      </div>
    </div>
  );
}

function Board({ initial }: { initial: VendorId | null }) {
  const profile = useGame((s) => s.profile)!;
  const lv = profile.character.level;
  const [vid, setVid] = useState<VendorId | 'all'>(initial && QUEST_VENDORS.includes(initial) ? initial : 'all');
  const [old, setOld] = useState(false);
  const list = (id: VendorId) => boardQuests(profile, id);
  const fresh = (id: VendorId) => list(id).filter((p) => !isOldQuest(p.id, lv));
  const ids = vid === 'all' ? QUEST_VENDORS : [vid];
  const shown = ids.flatMap((id) => fresh(id));
  const stale = ids.flatMap((id) => list(id).filter((p) => isOldQuest(p.id, lv)));
  const total = QUEST_VENDORS.reduce((n, id) => n + fresh(id).length, 0);
  const block = acceptBlock(profile);
  return (
    <section className="panel qj-col" data-testid="quests-board">
      <div className="qj-head"><span className="phead-t">Tablón de encargos</span><span className="text-[12px] text-stone-400 ml-auto">{total} {total === 1 ? 'disponible' : 'disponibles'}</span></div>
      <div className="qj-filter" role="tablist">
        {(['all', ...QUEST_VENDORS] as const).map((id) => {
          const n = id === 'all' ? total : fresh(id).length;
          const name = id === 'all' ? 'Todos' : VENDORS[id].name;
          return (
            <button key={id} role="tab" aria-selected={vid === id} className={`qj-fopt ${vid === id ? 'on' : ''} ${n ? '' : 'none'}`} onClick={() => { setVid(id); sfx('click'); }} data-testid={`quests-${id}`}>
              <span className="qj-radio" aria-hidden /><span className="flex-1 truncate" style={id !== 'all' && n ? { color: VENDORS[id].color } : undefined}>{name}</span><span className="qj-fn">{n}</span>
            </button>
          );
        })}
      </div>
      <div className="qj-list scroll-thin">
        {shown.map((p) => <BoardCard key={p.id} p={p} block={block} />)}
        {old && stale.map((p) => <BoardCard key={p.id} p={p} block={block} />)}
        {stale.length > 0 && <button className="qj-free" onClick={() => { setOld(!old); sfx('click'); }} data-testid={`old-quests-${vid}`}>{old ? 'Ocultar encargos antiguos' : `Encargos antiguos (${stale.length})`}</button>}
        {!shown.length && !stale.length && <p className="text-[13px] text-stone-400 italic px-1" data-testid={`quests-none-${vid}`}>Sin encargos ahora mismo. Vuelve más adelante o cuando seas más fuerte.</p>}
      </div>
    </section>
  );
}

function BoardCard({ p, block }: { p: QuestProgress; block: string | null }) {
  const q = questDef(p.id), v = VENDORS[q.vendor];
  return (
    <div className="qj-bcard" data-testid={`quest-${q.id}`} data-mode="board">
      <span className="qj-nail" aria-hidden><Px src={nailIcon(2)} /></span>
      <div className="flex gap-3 items-center">
        <div className="qj-bart"><ObjectiveArt q={q} /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px]" style={{ color: v.color }}>{v.name}{q.repeatable && <span className="ml-1 align-middle"><Px src={loopIcon(2)} title="Repetible" /></span>}</div>
          <div className="qj-bname">{q.name}</div>
          <div className="text-[13px] text-stone-300 leading-snug">{q.description}</div>
        </div>
      </div>
      <div className="qj-bmini font-display"><span className="text-gold"><Px src={iconUrl('coin', 2)} />+{q.reward.gold}</span><span className="text-arcane"><Px src={xpIcon(2)} />+{q.reward.xp}</span><span style={{ color: v.color }}><Px src={repIcon(v.color, 2)} />+{q.reward.rep}</span></div>
      <button className={`btn ${block ? '' : 'btn-gold'} font-display uppercase tracking-[0.08em]`} style={{ minHeight: 44 }} disabled={!!block} title={block ?? undefined}
        onClick={() => { actions.acceptQuest(q.id); sfx('click'); }} data-testid={`accept-${q.id}`}>{block ? 'Tablón lleno' : 'Aceptar encargo'}</button>
    </div>
  );
}
