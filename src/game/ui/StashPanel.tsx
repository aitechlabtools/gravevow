// Almacén por páginas: pestañas 1–5 (las no compradas, con candado y precio) y «Compartido».
// Mover un objeto a otra página: arrastrarlo hasta la pestaña, o tocarlo (queda elegido) y tocar la pestaña.
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { actions, useGame } from '../state/store';
import { pageCount, pageSlice, pageStart, nextPageCost, type StashPage } from '../../core/stashPages';
import { SHARED_PAGE_COST, STASH_MAX_PAGES, STASH_PAGE_SIZE } from '../../config/stash';
import type { Loc } from '../../core/inventory';
import type { ItemStack } from '../../core/types';
import { GridView, type InvMode } from './inventory';
import { dragJustEnded, useDrag } from './pointerDrag';
import { GoldAmount, Modal } from './common';
import { useLayout } from '../../config/ui';
import { sfx } from '../audio';

/** Color propio de la página «Compartido» (verde azulado): se distingue de las páginas del personaje. */
export const SHARED_COLOR = '#7fd6c9';

export function StashPanel({ cols, sel, onSelect, onEmpty, onQuick, onAlt, mode = 'lobby', compactHeader = false, title = 'Almacén', testId = 'alijo-storage', marked }: {
  /** Venta: casillas marcadas para vender. */
  marked?: (l: Loc) => boolean;
  cols: number; sel: Loc | null; onSelect: (l: Loc) => void; onEmpty?: (l: Loc) => void;
  onQuick?: (l: Loc, s: ItemStack) => void; onAlt?: (l: Loc, s: ItemStack) => void;
  /** Al tocar una pestaña con un objeto elegido, se lleva allí y se suelta la elección. */
  mode?: InvMode; compactHeader?: boolean; title?: string; testId?: string;
}) {
  const profile = useGame((s) => s.profile)!;
  const page = useGame((s) => s.stashPage);
  const layout = useLayout();
  const touchy = layout !== 'desktop';
  const shownPage: StashPage = page === 'shared' ? (profile.shared ? 'shared' : 0) : Math.min(page, pageCount(profile.stash) - 1);
  const grid = shownPage === 'shared' ? profile.shared! : pageSlice(profile.stash, shownPage);
  const used = grid.filter(Boolean).length;
  const label = shownPage === 'shared' ? 'Compartido' : `pág. ${shownPage + 1}`;
  // En ordenador la página entera (15 filas) se ve sin desplazar: las casillas se encogen lo justo para caber en alto.
  const box = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (touchy || !el) { setSlot(null); return; }
    const rows = Math.ceil(STASH_PAGE_SIZE / cols);
    const fit = () => {
      const h = el.clientHeight;
      const base = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slot')) || 52;
      const s = Math.floor((h - (rows - 1) * 4 - 16) / rows);
      setSlot(h > 0 && s < base ? Math.max(34, s) : null);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [touchy, cols]);
  return (
    <section className="panel ui-panel min-h-0" data-testid={testId} style={shownPage === 'shared' ? { borderColor: '#3f8f8a' } : undefined}>
      <div className="flex items-center justify-between gap-2" style={{ padding: compactHeader || touchy ? '6px 8px 0' : '10px 12px 0' }}>
        <h2 className="font-display text-parchment uppercase tracking-[0.1em] truncate" style={{ fontSize: 'var(--fs-title, 15px)' }}>
          {title} <span className="normal-case tracking-normal text-xs font-body" style={{ color: shownPage === 'shared' ? SHARED_COLOR : '#a8a29e' }} data-testid="stash-count">· {label} · {used}/{STASH_PAGE_SIZE}</span>
        </h2>
        <span className="flex gap-1 shrink-0">
          <button className="btn text-xs" style={{ minHeight: touchy ? 44 : 34 }} onClick={() => actions.groupGold('stash')} data-testid="group-gold-stash" title="Mete las monedas sueltas de esta página en sus saquitos y sacos">Agrupar oro</button>
          <button className="btn text-xs" style={{ minHeight: touchy ? 44 : 34 }} onClick={() => actions.sortContainer('stash')} data-testid="sort-stash">Ordenar</button>
        </span>
      </div>
      <div style={{ padding: touchy ? '6px 8px' : '8px 12px' }} className="border-b border-[#2a2830]">
        <PageTabs sel={sel} onMoved={() => sel && onSelect(sel)} />
      </div>
      {shownPage === 'shared' && <p className="text-[11px] px-3 pt-2" style={{ color: SHARED_COLOR }}>Lo que dejes aquí lo verán y podrán coger todos tus personajes.</p>}
      <div className="ui-pbody min-h-0 flex flex-col">
        <div ref={box} className="flex-1 min-h-0 overflow-y-auto scroll-thin" style={slot ? ({ '--slot': `${slot}px` } as CSSProperties) : undefined}>
          <GridView key={String(shownPage)} marked={marked} grid={grid} container={shownPage === 'shared' ? 'shared' : 'stash'} offset={shownPage === 'shared' ? 0 : pageStart(shownPage)}
            cols={cols} equipment={profile.equipment} mode={mode} selected={sel} onSelect={onSelect} onEmpty={onEmpty} onQuick={onQuick} onAlt={onAlt} />
        </div>
      </div>
    </section>
  );
}

/** Pestañas de páginas. Son destino de arrastre y, con un objeto elegido, un toque lo lleva a esa página. */
function PageTabs({ sel, onMoved }: { sel: Loc | null; onMoved: () => void }) {
  const profile = useGame((s) => s.profile)!;
  const page = useGame((s) => s.stashPage);
  const wide = useLayout() === 'desktop';
  const owned = pageCount(profile.stash);
  const [buying, setBuying] = useState<StashPage | null>(null);
  // Arrastrar un objeto sobre una pestaña: se resalta y, si se queda encima, se abre esa página (pointerDrag.tsx)
  const drag = useDrag();
  const tabDrop = (pg: StashPage, isOwned: boolean) => JSON.stringify({ type: 'page', page: pg, owned: isOwned });
  const overTab = (pg: StashPage, isOwned: boolean) => !!drag && !drag.back && drag.over === tabDrop(pg, isOwned);
  const tap = (pg: StashPage, isOwned: boolean) => {
    if (dragJustEnded()) return;
    sfx('click');
    if (!isOwned) return setBuying(pg);
    if (sel && !(sel.kind === 'grid' && isSamePage(sel, pg))) { actions.moveToPage(sel, pg); onMoved(); return; }
    actions.setStashPage(pg);
  };
  const dnd = (pg: StashPage, isOwned: boolean) => ({ 'data-drop': tabDrop(pg, isOwned) });
  const tabs: ReactNode[] = [];
  for (let k = 0; k < STASH_MAX_PAGES; k++) {
    const isOwned = k < owned;
    const on = page === k;
    const price = k === owned ? nextPageCost(profile.stash) : null;
    tabs.push(
      <button key={k} className={`pill ${on ? 'on' : ''} ${overTab(k, isOwned) ? 'drag-over' : ''}`} {...dnd(k, isOwned)}
        style={{ flex: '1 1 0', minWidth: 44, minHeight: 44, padding: 0, opacity: isOwned ? 1 : k === owned ? 0.75 : 0.4, outline: overTab(k, isOwned) ? '2px solid #e8b33a' : undefined }}
        disabled={!isOwned && k !== owned} onClick={() => tap(k, isOwned)} data-testid={`stash-page-${k}`}
        title={isOwned ? `Página ${k + 1}` : price ? `Página ${k + 1} · ${price} de oro` : `Página ${k + 1} (compra antes la ${owned + 1})`}
        aria-label={isOwned ? `Página ${k + 1}` : `Página ${k + 1}, bloqueada`}>
        {isOwned ? k + 1 : <IconLock />}
      </button>,
    );
  }
  const sharedOn = page === 'shared';
  const hasShared = !!profile.shared;
  tabs.push(
    <button key="shared" className={`pill ${overTab('shared', hasShared) ? 'drag-over' : ''}`} {...dnd('shared', hasShared)} onClick={() => tap('shared', hasShared)} data-testid="stash-page-shared"
      title={hasShared ? 'Compartido · para todos tus personajes' : `Compartido · ${SHARED_PAGE_COST} de oro`} aria-label="Página Compartido"
      style={{ flex: wide ? '2.4 1 0' : '1 1 0', minWidth: 44, minHeight: 44, padding: '0 6px', gap: 6, borderColor: '#3f8f8a', color: sharedOn ? '#07130c' : SHARED_COLOR,
        background: sharedOn ? SHARED_COLOR : 'rgba(63,143,138,.15)', opacity: hasShared ? 1 : 0.75, outline: overTab('shared', hasShared) ? '2px solid #e8b33a' : undefined }}>
      {hasShared ? <IconShare /> : <IconLock />}{wide && <span>Compartido</span>}
    </button>,
  );
  return (
    <>
      <div className="flex items-center w-full" style={{ gap: wide ? 4 : 2 }} data-testid="stash-pages">{tabs}</div>
      {sel && <p className="text-[11px] text-gold mt-1">Toca una pestaña para llevar ahí el objeto elegido.</p>}
      {buying !== null && <BuyPageModal page={buying} onClose={() => setBuying(null)} />}
    </>
  );
}

function isSamePage(l: Loc, pg: StashPage): boolean {
  if (l.kind !== 'grid') return false;
  if (pg === 'shared') return l.container === 'shared';
  return l.container === 'stash' && Math.floor(l.index / STASH_PAGE_SIZE) === pg;
}

function BuyPageModal({ page, onClose }: { page: StashPage; onClose: () => void }) {
  const profile = useGame((s) => s.profile)!;
  const shared = page === 'shared';
  const cost = shared ? SHARED_PAGE_COST : nextPageCost(profile.stash) ?? 0;
  const enough = profile.gold >= cost;
  const buy = () => { if (shared) actions.buySharedPage(); else actions.buyStashPage(); onClose(); };
  return (
    <Modal onClose={onClose} testId="buy-page">
      <h2 className="panel-title text-lg mb-2">{shared ? 'Página «Compartido»' : `Página ${(page as number) + 1} del almacén`}</h2>
      <p className="font-body text-lg">
        {shared
          ? <>{STASH_PAGE_SIZE} casillas que comparten <b>todos tus personajes</b>. Es la única forma de pasar objetos de uno a otro. Se compra una sola vez.</>
          : <>{STASH_PAGE_SIZE} casillas más, solo para {profile.character.name}.</>}
      </p>
      <div className="flex items-center justify-between panel p-3 mt-3"><span className="text-stone-300">Precio</span><GoldAmount value={cost} className="text-lg" /></div>
      <p className={`text-xs mt-2 ${enough ? 'text-stone-400' : 'text-blood'}`}>
        {enough ? `Tienes ${profile.gold} de oro. Te quedarán ${profile.gold - cost}.` : `Oro insuficiente: tienes ${profile.gold}.`}
      </p>
      <div className="flex gap-2 mt-4">
        <button className="btn btn-gold" style={{ minHeight: 44 }} disabled={!enough} onClick={buy} data-testid="btn-buy-page">{enough ? 'Comprar página' : 'Oro insuficiente'}</button>
        <button className="btn" style={{ minHeight: 44 }} onClick={onClose}>Cancelar</button>
      </div>
    </Modal>
  );
}

const IconLock = () => <svg width={16} height={16} viewBox="0 0 12 12" shapeRendering="crispEdges" fill="currentColor" aria-hidden><path d="M4 1h4v1h1v3h1v6H2V5h1V2h1zm0 1v3h4V2zm1 5v2h2V7z" /></svg>;
const IconShare = () => <svg width={18} height={18} viewBox="0 0 12 12" shapeRendering="crispEdges" fill="currentColor" aria-hidden><path d="M2 3h3v1h2V3h3v3H7V5H5v2h2V6h3v3H7V8H5v1H2z" /></svg>;
