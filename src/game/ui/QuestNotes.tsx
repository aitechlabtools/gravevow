// Notas de misión (18/11): las usan la pantalla Misiones y la pestaña Misiones de cada mercader.
// Una nota enseña el retrato del mercader, el objetivo en grande, el título, el progreso y las recompensas en iconos.
// Solo «Cobrar/Entregar» (si está lista) y «Aceptar» (en el tablón) se ven sin abrirla; al tocarla se abre el detalle
// con la descripción y Fijar, Dejar y Cobrar/Entregar. Estilos: bloque «Notas de misión» de game.css (.qnote, .qdetail…).
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { actions, useGame } from '../state/store';
import { VENDORS, type VendorId } from '../../core/data/vendors';
import { ENEMIES } from '../../core/data/enemies';
import { getItem } from '../../core/data/items';
import { acceptBlock, activeQuests, boardQuests, isComplete, isOldQuest, questDef, questProgress } from '../../core/quests';
import type { QuestDef } from '../../core/data/quests';
import type { QuestProgress } from '../../core/types';
import { cachedUrl, drawChest, drawPortal, drawVein, iconUrl, monsterUrl } from '../../shared/art';
import { useLayout } from '../../config/ui';
import { sfx } from '../audio';
import { crownIcon, loopIcon, nailIcon, pinIcon, repIcon, xpIcon } from './uiIcons';

export const Px = ({ src, title }: { src: string; title?: string }) => <img src={src} className="pixelated inline-block shrink-0" alt={title ?? ''} title={title} draggable={false} />;

/** Medio pecho del mercader (el mismo recorte que las tarjetas del Bastión), a escala entera fija. */
export function MiniBust({ sprite, scale = 2 }: { sprite: string; scale?: number }) {
  return <span className="block overflow-hidden shrink-0" style={{ width: 20 * scale, height: 15 * scale }}><img src={monsterUrl(sprite, scale)} className="pixelated" alt="" draggable={false} style={{ width: 20 * scale, height: 26 * scale }} /></span>;
}

/** La mayor escala entera de un dibujo de w × h que cabe en la caja. */
export function useFitScale(w: number, h: number, pad = 8, max = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(3);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const fit = () => { const r = el.getBoundingClientRect(); if (r.width) setS(Math.max(1, Math.min(max, Math.floor(Math.min((r.width - pad) / w, (r.height - pad) / h))))); };
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, [w, h, pad, max]);
  return [ref, s] as const;
}

/** El dibujo del objetivo: la criatura, el objeto que se entrega, la veta, el cofre o el portal. */
function objective(q: QuestDef): { src: (s: number) => string; w: number; h: number; boss?: boolean; label: string } {
  if ((q.type === 'kill' || q.type === 'kill_boss') && q.target && ENEMIES[q.target]) {
    const e = ENEMIES[q.target];
    return { src: (s) => monsterUrl(e.sprite, s), w: 24, h: 26, boss: q.type === 'kill_boss' || !!e.boss, label: e.name };
  }
  if (q.type === 'deliver' && q.target) { const it = getItem(q.target); return { src: (s) => iconUrl(it.icon, s), w: 12, h: 12, label: it.name }; }
  if (q.type === 'mine') return { src: (s) => cachedUrl('vein:iron', () => drawVein('#8a8178', '#e9e1cc', false), s), w: 16, h: 16, label: 'Veta de mineral' };
  if (q.type === 'open_chest') return { src: (s) => cachedUrl('chest:rich', () => drawChest('rich', false), s), w: 16, h: 16, label: 'Cofre' };
  return { src: (s) => cachedUrl('portal:0', () => drawPortal(0), s), w: 24, h: 24, label: 'Portal' };
}

/** Tamaño real (a escala 1) de un dibujo: las criaturas no miden todas igual. */
function useNaturalSize(src1: string, fallback: [number, number]) {
  const [wh, setWh] = useState<[number, number]>(fallback);
  useEffect(() => { const i = new Image(); i.onload = () => setWh([i.naturalWidth, i.naturalHeight]); i.src = src1; }, [src1]);
  return wh;
}

function ObjectiveArt({ q, seal, big = false }: { q: QuestDef; seal?: string; big?: boolean }) {
  const o = objective(q);
  const [w, h] = useNaturalSize(o.src(1), [o.w, o.h]);
  const [ref, s] = useFitScale(w, h, big ? 10 : 14, big ? 5 : 6);
  return (
    <div ref={ref} className={`qn-art ${seal ? 'has-seal' : ''} ${big ? 'big' : ''}`}>
      <img src={o.src(s)} className="pixelated" alt={o.label} title={o.label} draggable={false} />
      {o.boss && <span className="absolute top-1.5 left-2"><Px src={crownIcon(3)} title="Jefe" /></span>}
      {seal && <span className="qn-seal" aria-hidden>● {seal}</span>}
    </div>
  );
}

function Rewards({ q, big = false }: { q: QuestDef; big?: boolean }) {
  const v = VENDORS[q.vendor];
  const s = big ? 3 : 2;
  return (
    <div className="qn-rewards font-display" data-big={big || undefined} data-testid={`quest-rewards-${q.id}`}>
      <span className="text-gold"><Px src={iconUrl('coin', s)} title="Oro" />+{q.reward.gold}{big && <span className="qn-rw">oro</span>}</span>
      <span className="text-arcane"><Px src={xpIcon(s)} title="Experiencia" />+{q.reward.xp}{big && <span className="qn-rw">XP</span>}</span>
      <span style={{ color: v.color }}><Px src={repIcon(v.color, s)} title={`Reputación con ${v.name}`} />+{q.reward.rep}{big && <span className="qn-rw">reputación</span>}</span>
    </div>
  );
}

function Progress({ q, prog, big = false }: { q: QuestDef; prog: number; big?: boolean }) {
  const done = prog >= q.count;
  const n = Math.min(prog, q.count);
  return (
    <span className="qn-prog">
      {big
        ? <span className="flex justify-between items-baseline text-[15px] text-stone-300"><span>{q.type === 'deliver' ? 'Tienes en la mochila y el alijo' : 'Progreso'}</span><span className="qn-num">{n}<span className="of">/{q.count}</span></span></span>
        : <span className="qn-num">{n}<span className="of">/{q.count}</span></span>}
      <span className={`bar ${big ? '' : 'thin'}`}><div style={{ width: `${(n / q.count) * 100}%`, background: done ? '#5fd19a' : '#e8b33a' }} /></span>
    </span>
  );
}

function ClaimButton({ q, done, className = '' }: { q: QuestDef; done: boolean; className?: string }) {
  return (
    <button className={`btn btn-gold font-display ${className}`} style={{ minHeight: 48 }} disabled={!done}
      onClick={(e) => { e.stopPropagation(); actions.claimQuest(q.id); sfx('click'); }} data-testid={`claim-${q.id}`}>{q.type === 'deliver' ? 'Entregar' : 'Cobrar'}</button>
  );
}

/** Una nota del tablón. mode 'active': misión aceptada; 'board': encargo que se puede aceptar. */
export function QuestNote({ p, mode, selected, onOpen, showVendor = true }: { p: QuestProgress; mode: 'active' | 'board'; selected?: boolean; onOpen?: () => void; showVendor?: boolean }) {
  const profile = useGame((s) => s.profile)!;
  const q = questDef(p.id); const v = VENDORS[q.vendor];
  const prog = questProgress(p, profile);
  const done = mode === 'active' && prog >= q.count;
  const block = mode === 'board' ? acceptBlock(profile) : null;
  return (
    <div className={`qnote ${done ? 'ready' : ''} ${p.pinned ? 'pinned' : ''} ${selected ? 'sel' : ''}`} data-testid={`quest-${q.id}`} data-mode={mode}>
      <span className="qn-hold">{p.pinned ? <Px src={pinIcon(2)} title="Fijada" /> : <Px src={nailIcon(2)} />}</span>
      <button type="button" className="qn-body" onClick={() => { onOpen?.(); sfx('click'); }} aria-label={`${q.name}: ver detalle`} data-testid={`quest-open-${q.id}`}>
        <span className="qn-head">
          {showVendor && <MiniBust sprite={v.sprite} scale={2} />}
          {showVendor && <span className="qn-vname truncate" style={{ color: v.color }}>{v.name}</span>}
          {q.repeatable && <span className="ml-auto" data-testid={`quest-repeat-${q.id}`}><Px src={loopIcon(2)} title="Repetible" /></span>}
        </span>
        <ObjectiveArt q={q} seal={done ? (q.type === 'deliver' ? 'Lista' : 'Cumplida') : undefined} />
        <span className="qn-title">{q.name}</span>
        {mode === 'active' ? <Progress q={q} prog={prog} /> : <span className="qn-desc">{q.description}</span>}
        <Rewards q={q} />
      </button>
      {done && <ClaimButton q={q} done className="qn-cta" />}
      {mode === 'board' && (
        <button className={`btn ${block ? "" : "btn-gold"} qn-cta font-display`} disabled={!!block} title={block ?? undefined}
          onClick={() => { actions.acceptQuest(q.id); sfx('click'); }} data-testid={`accept-${q.id}`}>{block ? 'Tablón lleno' : 'Aceptar'}</button>
      )}
    </div>
  );
}

/** Hueco libre del tablón (llevas menos de 5): lleva al Bastión, donde los mercaderes dan encargos. */
export function EmptySlot() {
  return (
    <div className="qnote empty" data-testid="quest-empty">
      <span className="qn-hold"><Px src={nailIcon(2)} /></span>
      <span className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-3 py-3">
        <span className="font-display text-[15px] text-stone-300 tracking-[0.06em] uppercase">Hueco libre</span>
        <span className="qe-hint font-body text-[14px] text-stone-400 leading-snug">Acepta un encargo del tablón</span>
      </span>
    </div>
  );
}

/** Detalle de una misión aceptada: descripción completa, progreso, recompensas y Fijar, Dejar y Cobrar/Entregar. */
export function QuestDetail({ p, onClose, side = false }: { p: QuestProgress; onClose: () => void; side?: boolean }) {
  const profile = useGame((s) => s.profile)!;
  const [confirm, setConfirm] = useState(false);
  const q = questDef(p.id); const v = VENDORS[q.vendor];
  const prog = questProgress(p, profile);
  const done = prog >= q.count;
  return (
    <div className={`qdetail ${side ? 'side' : 'full'}`} data-testid="quest-detail">
      <div className="qd-head">
        <MiniBust sprite={v.sprite} scale={3} />
        <div className="min-w-0"><div className="font-display text-[16px] tracking-[0.06em]" style={{ color: v.color }}>{v.name}</div><div className="text-[13px] text-stone-400">{v.role}</div></div>
        <button className="btn ml-auto" style={{ minWidth: 44, minHeight: 44 }} onClick={onClose} aria-label="Cerrar" data-testid="quest-detail-close">✕</button>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-[120px] h-[120px] shrink-0 flex"><ObjectiveArt q={q} big /></div>
        <div className="min-w-0">
          <div className="qn-title !p-0 !text-left !text-[clamp(17px,1.3vw,22px)]">{q.name}{q.repeatable && <span className="ml-2 align-middle"><Px src={loopIcon(2)} title="Repetible" /></span>}</div>
          {q.repeatable && <div className="text-[14px] text-stone-400">Repetible: vuelve al tablón al cobrarla.</div>}
        </div>
      </div>
      <p className="font-body text-[18px] text-stone-200 leading-snug">{q.description}</p>
      <Progress q={q} prog={prog} big />
      <Rewards q={q} big />
      <div className="flex gap-2 flex-wrap">
        <button className={`btn px-4 font-display ${p.pinned ? 'btn-gold' : ''}`} style={{ minHeight: 48 }} onClick={() => actions.togglePinQuest(q.id)} aria-pressed={!!p.pinned}
          title="Se recuerda en Jugar y en la mazmorra" data-testid={`pin-${q.id}`}>{p.pinned ? '★ Fijada' : '☆ Fijar'}</button>
        {confirm
          ? <button className="btn btn-danger px-3 font-display" style={{ minHeight: 48 }} onClick={() => { actions.abandonQuest(q.id); setConfirm(false); onClose(); }} data-testid={`abandon-yes-${q.id}`}>¿Seguro? Pierdes lo hecho</button>
          : <button className="btn px-4 font-display" style={{ minHeight: 48 }} onClick={() => setConfirm(true)} data-testid={`abandon-${q.id}`}>Dejar</button>}
        <ClaimButton q={q} done={done} className="px-5 ml-auto" />
      </div>
      <p className="qd-hint font-body text-[14px] text-stone-400 italic">Fijada, se recuerda en Jugar y en la mazmorra. Si la dejas, pierdes lo que llevabas.</p>
    </div>
  );
}

/** El detalle por encima de todo (móvil, o donde no hay sitio para el panel lateral). */
export function QuestDetailOverlay({ p, onClose }: { p: QuestProgress; onClose: () => void }) {
  const phone = useLayout() === 'phone';
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }; window.addEventListener('keydown', h, true); return () => window.removeEventListener('keydown', h, true); }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center fade-in" style={{ padding: phone ? 0 : 24 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()} data-testid="quest-detail-overlay">
      <QuestDetail p={p} onClose={onClose} />
    </div>,
    document.body,
  );
}

/** Encargos de un mercader como notas (los de zonas muy bajas, plegados en «Encargos antiguos»). */
export function BoardNotes({ vendor, showVendor = true }: { vendor: VendorId; showVendor?: boolean }) {
  const profile = useGame((s) => s.profile)!;
  const [old, setOld] = useState(false);
  const lv = profile.character.level;
  const board = boardQuests(profile, vendor);
  const fresh = board.filter((p) => !isOldQuest(p.id, lv));
  const stale = board.filter((p) => isOldQuest(p.id, lv));
  return (
    <div className="qboard-in qboard-in-list">
      <div className="qgrid">
        {fresh.map((p) => <QuestNote key={p.id} p={p} mode="board" showVendor={showVendor} />)}
        {old && stale.map((p) => <QuestNote key={p.id} p={p} mode="board" showVendor={showVendor} />)}
        {stale.length > 0 && (
          <button className="qnote empty old" aria-expanded={old} onClick={() => { setOld(!old); sfx('click'); }} data-testid={`old-quests-${vendor}`}>
            <span className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-3 py-4">
              <img src={loopIcon(3)} className="pixelated" alt="" />
              <span className="font-display text-[14px] text-stone-300">{old ? 'Ocultar encargos antiguos' : `Encargos antiguos (${stale.length})`}</span>
              <span className="qe-hint font-body text-[14px] text-stone-400">De zonas que ya dejaste atrás</span>
            </span>
          </button>
        )}
      </div>
      {!fresh.length && !stale.length && <p className="qboard-none font-body text-stone-400 italic" data-testid={`quests-none-${vendor}`}>Sin encargos para ti ahora mismo. Vuelve más adelante o cuando seas más fuerte.</p>}
    </div>
  );
}

/** Pestaña Misiones de un mercader: sus misiones aceptadas (con Cobrar si están listas) y sus encargos para aceptar. */
export function VendorQuestNotes({ vendor }: { vendor: VendorId }) {
  const profile = useGame((s) => s.profile)!;
  const [open, setOpen] = useState<string | null>(null);
  const active = activeQuests(profile, vendor).sort((a, b) => Number(isComplete(b, profile)) - Number(isComplete(a, profile)));
  const openP = active.find((p) => p.id === open) ?? null;
  return (
    <div className="flex flex-col gap-2" data-testid="vendor-quests">
      {active.length > 0 && (
        <>
          <div className="panel-title text-sm">Aceptadas</div>
          <div className="qboard-in !p-0"><div className="qgrid">{active.map((p) => <QuestNote key={p.id} p={p} mode="active" showVendor={false} selected={open === p.id} onOpen={() => setOpen(p.id)} />)}</div></div>
          <div className="panel-title text-sm mt-2">Encargos</div>
        </>
      )}
      <BoardNotes vendor={vendor} showVendor={false} />
      {openP && <QuestDetailOverlay p={openP} onClose={() => setOpen(null)} />}
    </div>
  );
}
