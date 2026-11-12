// Elige quién baja: los 4 huecos de personaje. Tocar uno entra al refugio con él; los vacíos crean uno nuevo.
// Borrar pide escribir el nombre (doble confirmación) y avisa de que se pierde todo lo suyo, salvo la página «Compartido».
import { useEffect, useState } from 'react';
import { actions, useGame, type RosterEntry } from '../../state/store';
import { CLASSES } from '../../../core/data/classes';
import { MAX_CHARACTERS } from '../../../core/save';
import { GoldAmount, HeroSprite, Modal } from '../common';
import { useLayout } from '../../../config/ui';
import { sfx } from '../../audio';
import { FullscreenButton } from '../FullscreenButton';

export function lastPlayedLabel(t: number, now = Date.now()): string {
  const d = new Date(t);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(new Date(now)) - day(d)) / 86400000);
  const hm = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (diff <= 0) return `Hoy, ${hm}`;
  if (diff === 1) return `Ayer, ${hm}`;
  if (diff < 30) return `Hace ${diff} días`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ElegirPersonaje() {
  const roster = useGame((s) => s.roster);
  useEffect(() => { actions.tutorialEvent('screen:select'); }, []);
  const activeId = useGame((s) => s.activeId);
  const layout = useLayout();
  const phone = layout === 'phone';
  const [toDelete, setToDelete] = useState<RosterEntry | null>(null);
  const slots = Array.from({ length: MAX_CHARACTERS }, (_, i) => roster.find((r) => r.slot === i) ?? null);
  return (
    <div className="h-full flex flex-col relative" style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a1520 0%, #0d0b11 55%, #07060a 100%)' }} data-testid="screen-select">
      <header className="ui-nav" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn" style={{ minHeight: 44 }} onClick={() => { sfx('click'); actions.goto('title'); }} data-testid="btn-select-back">‹ Menú</button>
        <h1 className="font-display text-parchment tracking-[0.14em] uppercase" style={{ fontSize: phone ? 15 : 22 }}>Elige quién baja</h1>
        <div className="flex justify-end" style={{ minWidth: 96 }}><FullscreenButton className="icon-btn" /></div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto scroll-thin">
        <div className="grid mx-auto w-full h-full" style={{ gridTemplateColumns: `repeat(${MAX_CHARACTERS}, minmax(0, 1fr))`, gap: 'var(--gap)', padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))', maxWidth: 1500, alignContent: 'center' }}>
          {slots.map((r, i) => (r
            ? <HeroCard key={r.id} r={r} active={r.id === activeId} onDelete={() => setToDelete(r)} />
            : <EmptyCard key={`e${i}`} slot={i} />))}
        </div>
      </div>
      {!phone && <p className="text-center text-xs text-stone-400 pb-3">Los atuendos comprados, el tutorial y la página «Compartido» del almacén son de todos tus personajes.</p>}
      {toDelete && <DeleteModal r={toDelete} onClose={() => setToDelete(null)} />}
    </div>
  );
}

function HeroCard({ r, active, onDelete }: { r: RosterEntry; active: boolean; onDelete: () => void }) {
  const layout = useLayout();
  const sc = layout === 'phone' ? 2 : layout === 'tablet' ? 4 : 6;
  const play = () => { sfx('click'); void actions.selectCharacter(r.id); };
  return (
    <div className={`panel ${active ? 'panel-gold' : ''} flex flex-col items-center text-center relative`} style={{ padding: 'var(--gap)' }} data-testid={`slot-char-${r.slot}`}>
      {active && <span className="absolute left-2 top-2 text-[10px] font-display tracking-wider text-gold uppercase">Último</span>}
      <button className="btn icon-btn text-stone-300" onClick={onDelete} aria-label={`Borrar a ${r.name}`} title="Borrar personaje"
        style={{ position: 'absolute', right: 6, top: 6, zIndex: 2 }} data-testid={`btn-delete-char-${r.slot}`}><IconTrash /></button>
      <button className="w-full flex flex-col items-center" onClick={play} aria-label={`Jugar con ${r.name}`}>
        <div className="ui-arch w-full flex items-end justify-center" style={{ height: 26 * sc + (layout === 'phone' ? 14 : 36) }}>
          <div className="pb-2"><HeroSprite classId={r.classId} appearance={r.appearance} equipment={r.equipment} skin={r.skin} scale={sc} animate={false} /></div>
        </div>
        <div className="font-display text-parchment mt-2 truncate max-w-full" style={{ fontSize: layout === 'phone' ? 14 : 18 }}>{r.name}</div>
        <div className="text-xs md:text-sm text-stone-300">{CLASSES[r.classId].name} · Nv {r.level}</div>
        <div className="mt-1 text-xs md:text-sm"><GoldAmount value={r.gold} /></div>
        <div className="text-[11px] text-stone-400 mt-0.5">{lastPlayedLabel(r.lastPlayedAt)}</div>
      </button>
      <div className="flex-1" />
      <button className={`btn ${active ? 'btn-gold' : ''} w-full mt-2`} style={{ minHeight: 44 }} onClick={play} data-testid={`btn-play-char-${r.slot}`}>Jugar</button>
    </div>
  );
}

function EmptyCard({ slot }: { slot: number }) {
  return (
    <button className="panel flex flex-col items-center justify-center text-center gap-2" style={{ padding: 'var(--gap)', borderStyle: 'dashed', minHeight: 120 }}
      onClick={() => { sfx('click'); actions.newCharacter(slot); }} data-testid={`btn-new-char-${slot}`}>
      <span className="font-display text-4xl md:text-6xl text-stone-500 leading-none">+</span>
      <span className="font-display text-parchment text-sm md:text-base">Nuevo personaje</span>
      <span className="text-[11px] text-stone-400">Hueco {slot + 1} de {MAX_CHARACTERS}</span>
    </button>
  );
}

function DeleteModal({ r, onClose }: { r: RosterEntry; onClose: () => void }) {
  const [typed, setTyped] = useState('');
  const ok = typed.trim().toLowerCase() === r.name.trim().toLowerCase();
  return (
    <Modal onClose={onClose} testId="delete-char">
      <h2 className="panel-title text-lg mb-2">Borrar a {r.name}</h2>
      <p className="font-body text-lg">Se perderá <b>todo lo suyo</b>: nivel, equipo, mochila, oro, reputación, encargos y los objetos de sus páginas del almacén. No se puede deshacer.</p>
      <p className="font-body text-base text-heal mt-2">Lo que haya en la página «Compartido» y los atuendos comprados se quedan para tus otros personajes.</p>
      <label className="block mt-3 text-sm text-stone-300">Escribe <b className="text-parchment">{r.name}</b> para confirmar
        <input className="mt-1 w-full bg-[#0d0c11] border-2 border-stone-700 px-3 text-parchment font-body text-lg focus:outline-none focus:border-blood" style={{ minHeight: 44 }}
          value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" data-testid="delete-name-input" />
      </label>
      <div className="flex gap-2 mt-4 flex-wrap">
        <button className="btn btn-danger" style={{ minHeight: 44 }} disabled={!ok} onClick={() => { void actions.deleteCharacterById(r.id); onClose(); }} data-testid="btn-confirm-delete">Borrar para siempre</button>
        <button className="btn" style={{ minHeight: 44 }} onClick={onClose}>Cancelar</button>
      </div>
    </Modal>
  );
}

function IconTrash() {
  return <svg width={18} height={18} viewBox="0 0 12 12" shapeRendering="crispEdges" fill="currentColor" aria-hidden><path d="M4 1h4v1h3v1H1V2h3zM2 4h8v7H2zm2 1v5h1V5zm3 0v5h1V5z" /></svg>;
}
