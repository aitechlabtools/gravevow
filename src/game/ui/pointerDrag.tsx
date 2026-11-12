// Arrastrar y soltar objetos con el puntero: sirve igual para ratón, dedo y lápiz (el arrastre nativo del navegador solo va con ratón).
//
// Gestos:
//  · Ratón: pulsar y mover unos píxeles empieza a arrastrar.
//  · Dedo: mantener pulsado un instante (HOLD_MS) y luego mover. Si el dedo se mueve antes, es un desplazamiento del panel
//    y no se arrastra nada. Mientras se arrastra, la página no se desplaza ni hace zoom.
//  · Un toque sin arrastre sigue siendo un clic normal (elegir el objeto).
//
// Destinos: cualquier elemento con `data-drop` (JSON de DropTarget). Las casillas lo ponen solas (ItemSlot); las pestañas del
// almacén y la casilla de la mochila puesta también. Al pasar por encima de una pestaña del almacén un momento, se abre esa página.
// Si se suelta fuera de un destino, el icono vuelve a su sitio con una animación corta.
import { useSyncExternalStore, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { actions } from '../state/store';
import type { Loc } from '../../core/inventory';
import { ItemIcon } from './inventory';

export type DropTarget =
  | { type: 'loc'; loc: Loc; lootId?: string }
  | { type: 'page'; page: number | 'shared'; owned: boolean }
  | { type: 'bag' }
  /** Zona de venta del mercader: el objeto queda marcado para vender (Mercaderes escucha «cr-drop-sell»). */
  | { type: 'sell' }
  /** Una parte del cuerpo (Intendencia → Estado): curar con el objeto que se suelta (BodyPanel escucha «cr-drop-body»). */
  | { type: 'body'; region: string };

export interface DragState {
  from: Loc;
  lootId?: string;
  itemId: string;
  /** Tamaño del objeto tal como está (Fase 6) y su uid: para enseñar el hueco que ocuparía antes de soltar. */
  size?: { w: number; h: number };
  uid?: string;
  x: number;
  y: number;
  touch: boolean;
  /** Destino bajo el puntero (su `data-drop` tal cual, para comparar). */
  over: string | null;
  /** Al soltar fuera: el icono vuelve a su sitio. */
  back?: { x: number; y: number };
}

const HOLD_MS = 170;      // dedo: tiempo quieto antes de poder arrastrar
const TOUCH_SLOP = 8;     // dedo: si se mueve más antes de HOLD_MS, es desplazamiento
const MOUSE_SLOP = 5;     // ratón: píxeles para empezar a arrastrar
const PAGE_HOVER_MS = 450;
/** En táctil, el icono va por encima del dedo para que no lo tape. */
export const TOUCH_LIFT = 46;

let state: DragState | null = null;
/** Posición en vivo del icono: se mueve directamente en el DOM (cada cuadro) sin volver a pintar React. */
const live = { x: 0, y: 0 };
let ghostEl: HTMLDivElement | null = null;
const placeGhost = () => { if (ghostEl && state && !state.back) ghostEl.style.transform = `translate3d(${live.x}px, ${live.y}px, 0) translate(-50%, -50%) rotate(-6deg)`; };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (s: DragState | null) => { state = s; emit(); };
export function useDrag(): DragState | null {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state, () => null);
}
/** Tras un arrastre, el navegador lanza un clic al soltar: se ignora para no elegir el objeto de debajo. */
let suppressClickUntil = 0;
export function dragJustEnded(): boolean { return performance.now() < suppressClickUntil; }

function targetAt(x: number, y: number): { el: HTMLElement; raw: string } | null {
  const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest('[data-drop]') as HTMLElement | null;
  return el ? { el, raw: el.dataset.drop! } : null;
}

function drop(d: DragState, raw: string | null): boolean {
  if (!raw) return false;
  const t = JSON.parse(raw) as DropTarget;
  if (t.type === 'loc') {
    if (JSON.stringify(t.loc) === JSON.stringify(d.from)) return false;
    actions.transfer(d.from, t.loc, d.lootId ?? t.lootId);
    return true;
  }
  if (t.type === 'page') {
    if (!t.owned || d.lootId) return false;
    actions.moveToPage(d.from, t.page);
    return true;
  }
  if (t.type === 'bag') { actions.equipBag(d.from); return true; }
  if (t.type === 'body') { if (d.lootId) return false; window.dispatchEvent(new CustomEvent('cr-drop-body', { detail: { itemId: d.itemId, region: t.region } })); return true; }
  if (t.type === 'sell') { if (d.lootId) return false; window.dispatchEvent(new CustomEvent('cr-drop-sell', { detail: d.from })); return true; }
  return false;
}

/** Manejador de `pointerdown` para una casilla con objeto. */
export function startPointerDrag(e: React.PointerEvent, from: Loc, itemId: string, lootId?: string, size?: { w: number; h: number }, uid?: string) {
  if (e.button !== 0 || state) return;
  const touch = e.pointerType !== 'mouse';
  const x0 = e.clientX, y0 = e.clientY;
  const src = e.currentTarget as HTMLElement;
  let armed = !touch;      // ratón: listo desde el principio; dedo: tras mantener pulsado
  let dragging = false;
  let pageTimer: number | undefined;
  let lastPage: string | null = null;
  const hold = touch ? window.setTimeout(() => { armed = true; navigator.vibrate?.(8); }, HOLD_MS) : undefined;

  let raf = 0;
  let overEl: HTMLElement | null = null;
  let px = x0, py = y0;
  // Cada cuadro como mucho: se coloca el icono y se busca el destino. Solo se avisa a React si cambia el destino.
  const frame = () => {
    raf = 0;
    const ty = touch ? py - TOUCH_LIFT : py;
    live.x = px; live.y = ty;
    const t = targetAt(px, ty);
    const over = t?.raw ?? null;
    // El destino se ilumina directamente en el DOM: así no se vuelven a pintar todas las casillas al cruzar cada una
    if (t?.el !== overEl) { overEl?.classList.remove('drag-over'); overEl = t?.el ?? null; overEl?.classList.add('drag-over'); }
    // Pestaña del almacén: si se queda encima un momento, se abre esa página
    if (over !== lastPage) {
      window.clearTimeout(pageTimer); lastPage = over;
      const pt = over ? (JSON.parse(over) as DropTarget) : null;
      if (pt?.type === 'page' && pt.owned) pageTimer = window.setTimeout(() => actions.setStashPage(pt.page), PAGE_HOVER_MS);
    }
    if (!state) set({ from, lootId, itemId, size, uid, x: px, y: ty, touch, over });
    // Solo los objetos grandes necesitan saber el destino (vista previa del hueco); así no se repinta en cada casilla
    else if (size && size.w * size.h > 1 && state.over !== over) set({ ...state, over });
    placeGhost();
  };
  const move = (x: number, y: number, ev?: Event) => {
    const dist = Math.hypot(x - x0, y - y0);
    if (!dragging) {
      if (!armed) { if (dist > TOUCH_SLOP) end(null); return; }   // dedo que se movió pronto: es desplazamiento
      if (dist < (touch ? 3 : MOUSE_SLOP)) return;
      dragging = true;
    }
    if (ev?.cancelable) ev.preventDefault();
    px = x; py = y;
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const onPointerMove = (ev: PointerEvent) => { if (!touch) move(ev.clientX, ev.clientY, ev); };
  const onTouchMove = (ev: TouchEvent) => {
    const t = ev.touches[0]; if (!t) return;
    // Solo se bloquea el desplazamiento cuando ya se mantuvo pulsado: así el panel sigue desplazándose con un gesto normal
    if (armed && ev.cancelable) ev.preventDefault();
    move(t.clientX, t.clientY);
  };
  const onUp = (ev: PointerEvent | TouchEvent) => {
    let x = x0, y = y0;
    if ('clientX' in ev) { x = ev.clientX; y = ev.clientY; }
    else if (ev.changedTouches[0]) { x = ev.changedTouches[0].clientX; y = ev.changedTouches[0].clientY; }
    end(dragging ? targetAt(x, touch ? y - TOUCH_LIFT : y)?.raw ?? null : null, true);
  };
  const onCancel = () => { if (!dragging) end(null); };
  const onContext = (ev: Event) => { if (touch) ev.preventDefault(); };

  function end(raw: string | null, released = false) {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    overEl?.classList.remove('drag-over'); overEl = null;
    window.clearTimeout(hold); window.clearTimeout(pageTimer);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onUp);
    window.removeEventListener('contextmenu', onContext, true);
    if (!dragging) { if (released || !state) set(null); return; }
    suppressClickUntil = performance.now() + 350;
    const d = state;
    if (d && released && drop(d, raw)) { set(null); window.dispatchEvent(new Event('cr-dropped')); return; }
    // No vale: el icono vuelve a su casilla y desaparece
    const r = src.getBoundingClientRect();
    if (d) {
      set({ ...d, over: null, back: { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
      window.setTimeout(() => set(null), 180);
    } else set(null);
  }

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  if (touch) {
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);
    // Mantener pulsado no debe abrir el menú del navegador ni el «clic derecho» del juego
    window.addEventListener('contextmenu', onContext, true);
  }
}

/** Icono que sigue al puntero mientras se arrastra (se monta una vez, en App). */
export function DragLayer() {
  const d = useDrag();
  const ghost = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.documentElement.classList.toggle('is-dragging', !!d && !d.back);
  }, [d]);
  if (!d) return null;
  const pos = d.back ?? live;
  return createPortal(
    <div ref={(el) => { ghost.current = el; ghostEl = el; }} className={`drag-ghost ${d.back ? 'is-back' : ''}`}
      style={{ left: 0, top: 0, transform: `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) rotate(-6deg)` }} aria-hidden data-testid="drag-ghost">
      <ItemIcon itemId={d.itemId} size={d.touch ? 56 : 48} />
    </div>,
    document.body,
  );
}

/** Al soltar un objeto arrastrado se deja de marcar la casilla elegida. */
export function useClearOnDrop(clear: () => void) {
  useEffect(() => {
    const f = () => clear();
    window.addEventListener('cr-dropped', f);
    return () => window.removeEventListener('cr-dropped', f);
  }, [clear]);
}
