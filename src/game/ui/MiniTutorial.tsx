// Capa común de los mini tutoriales: atenúa la pantalla, deja un hueco sobre el elemento que hay que mirar o tocar y
// enseña un cartel con el retrato de quien lo cuenta. Uno a la vez (cola en el store); espera si hay combate, otra
// ventana o el tutorial inicial. Los datos están en core/data/tutorials.ts.
import { useEffect, useState, type ReactNode } from 'react';
import { actions, dev, useGame } from '../state/store';
import { canShowNow, currentMini, pendingBadges } from '../../core/tutorials';
import { VENDORS } from '../../core/data/vendors';
import type { Narrator } from '../../core/data/tutorials';
import { useIsTouch } from '../../shared/device';
import { useLayout } from '../../config/ui';
import { MonsterSprite } from './common';
import { STATION_ART_H, STATION_ART_W, stationArtUrl } from './stationArt';
import { sfx } from '../audio';

type Box = { x: number; y: number; w: number; h: number };
const PAD = 6;

function rectOf(testId: string | undefined): Box | null {
  if (!testId) return null;
  const el = document.querySelector(`[data-testid="${testId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const vw = window.innerWidth, vh = window.innerHeight;
  // Recortado a la pantalla: un panel largo con desplazamiento no deja el cartel fuera
  const x = Math.max(0, r.left - PAD), y = Math.max(0, r.top - PAD);
  return { x, y, w: Math.min(vw, r.right + PAD) - x, h: Math.min(vh, r.bottom + PAD) - y };
}

/** «**negrita**» → dorado. */
export function rich(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i} className="text-gold font-semibold">{part}</b> : part));
}

export function narratorName(n: Narrator): string {
  return n === 'intendant' ? 'El intendente' : VENDORS[n].name;
}

function Portrait({ who, scale }: { who: Narrator; scale: number }) {
  if (who === 'intendant') {
    return <img src={stationArtUrl('intendant')} className="pixelated" alt="" draggable={false} style={{ width: STATION_ART_W * scale, height: STATION_ART_H * scale }} />;
  }
  return <MonsterSprite sprite={VENDORS[who].sprite} scale={scale} />;
}

export function MiniTutorialLayer() {
  const queue = useGame((s) => s.miniQueue);
  const step = useGame((s) => s.miniStep);
  const combat = useGame((s) => !!s.combat);
  const modalOpen = useGame((s) => !!s.modal || !!s.notice);
  const tutorialRun = useGame((s) => !!s.tutorial);
  const touch = useIsTouch();
  const layout = useLayout();
  const phone = layout === 'phone';
  const m = currentMini(queue);
  const st = m?.steps[Math.min(step, m.steps.length - 1)];
  // Hueco y ventanas abiertas: se miran a menudo porque la pantalla cambia sin avisar al store
  const [box, setBox] = useState<Box | null>(null);
  const [domModal, setDomModal] = useState(false);
  // Un botón desactivado (p. ej. «Vaciar mochila» sin nada dentro) no recibe el clic: el paso pasa a «Entendido»
  const [targetOff, setTargetOff] = useState(false);
  useEffect(() => {
    if (!m) return;
    const tick = () => {
      setDomModal(!!document.querySelector('[data-modal]'));
      setTargetOff(!!st?.target && !!document.querySelector(`[data-testid="${st.target}"]:disabled`));
      const b = rectOf(st?.target);
      setBox((o) => (o && b && o.x === b.x && o.y === b.y && o.w === b.w && o.h === b.h ? o : b));
    };
    // Si lo señalado está dentro de un panel con desplazamiento y no se ve entero, se lleva a la vista
    if (st?.target) document.querySelector(`[data-testid="${st.target}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    tick();
    const t = setInterval(tick, 250);
    window.addEventListener('resize', tick);
    return () => { clearInterval(t); window.removeEventListener('resize', tick); };
  }, [m, st]);
  // Acción real: el paso termina cuando se toca el elemento resaltado
  const visible = !!m && !!st && canShowNow(m, { combat, modal: modalOpen || domModal, tutorialRun });
  useEffect(() => {
    if (!visible || st?.action !== 'click' || !st.target || targetOff) return;
    const h = (e: Event) => {
      const el = document.querySelector(`[data-testid="${st.target}"]`);
      if (el && e.target instanceof Node && el.contains(e.target)) setTimeout(() => actions.miniNext(), 0);
    };
    document.addEventListener('click', h, true);
    return () => document.removeEventListener('click', h, true);
  }, [visible, st, targetOff]);
  if (!visible || !m || !st) return null;

  const who = m.narrator ?? 'intendant';
  const waitsClick = st.action === 'click' && !!box && !targetOff;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  // El cartel va en la mitad contraria a la del elemento resaltado; si este ocupa media pantalla o más, abajo (sin tapar la barra)
  const cardTop = box ? box.h < vh * 0.5 && box.y + box.h / 2 > vh / 2 : false;
  // La capa no recoge clics; sí lo hacen el atenuado, el cartel y (si no hay acción real) el hueco
  const dim = 'absolute bg-black/65 pointer-events-auto';
  return (
    <div className="absolute inset-0 z-[60] fade-in pointer-events-none" data-testid="mini-tutorial" data-mini={m.id} data-step={step} role="dialog" aria-modal="true" aria-label={`Guía: ${narratorName(who)}`}>
      {box ? (
        <>
          <div className={dim} style={{ left: 0, top: 0, right: 0, height: box.y }} />
          <div className={dim} style={{ left: 0, top: box.y + box.h, right: 0, bottom: 0 }} />
          <div className={dim} style={{ left: 0, top: box.y, width: box.x, height: box.h }} />
          <div className={dim} style={{ left: box.x + box.w, top: box.y, right: 0, height: box.h }} />
          {/* Sin acción real, el hueco se ve pero no se toca */}
          <div className="absolute mini-hole" data-testid="mini-hole" style={{ left: box.x, top: box.y, width: box.w, height: box.h, pointerEvents: waitsClick ? 'none' : 'auto' }} />
        </>
      ) : <div className={`${dim} inset-0`} />}
      <div className={`absolute left-1/2 -translate-x-1/2 panel panel-gold pointer-events-auto flex gap-3 items-end ${phone ? 'p-2 w-[min(92%,560px)]' : 'p-3 w-[min(90%,600px)]'}`}
        style={cardTop ? { top: 'max(12px, env(safe-area-inset-top))' } : { bottom: 'max(12px, env(safe-area-inset-bottom))' }} data-testid="mini-card">
        <div className="shrink-0 flex items-end justify-center bg-[#0d0c11] border border-stone-700 px-1 pt-1"><Portrait who={who} scale={phone ? 2 : 3} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`font-display text-gold tracking-wider uppercase ${phone ? 'text-[10px]' : 'text-[11px]'}`} data-testid="mini-narrator">{narratorName(who)}</span>
            <span className="text-[11px] text-stone-400" data-testid="mini-count">{step + 1}/{m.steps.length}</span>
          </div>
          <p className={`font-body text-parchment leading-snug mt-0.5 ${phone ? 'text-sm' : 'text-base'}`} data-testid="mini-text">{rich(touch && st.touch ? st.touch : st.text)}</p>
          <div className="flex gap-2 justify-end mt-2">
            <button className="btn text-sm" style={{ minHeight: 44, minWidth: 44 }} onClick={() => { sfx('click'); actions.miniDone(m.id); }} data-testid="mini-skip">Saltar</button>
            {waitsClick
              ? <span className="self-center text-[12px] text-stone-300 italic" data-testid="mini-wait">{touch ? 'Toca lo señalado' : 'Haz clic en lo señalado'}</span>
              : <button className="btn btn-gold text-sm" style={{ minHeight: 44, minWidth: 96 }} onClick={() => { sfx('click'); actions.miniNext(); }} data-testid="mini-ok">
                  {step + 1 < m.steps.length ? 'Siguiente' : 'Entendido'}
                </button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** ¿Tiene este elemento un mini tutorial pendiente? (para pintar el «!»). */
export function useTutBadge(testId: string): boolean {
  const t = useGame((s) => s.tutorials);
  return !dev.skipMinis && pendingBadges(t).has(testId);
}

/** «!» discreto de «hay algo nuevo que ver». Va dentro de un elemento con `position: relative`. */
export function TutDot({ testId, inset = false }: { testId: string; inset?: boolean }) {
  return useTutBadge(testId) ? <span className="tut-dot" style={inset ? { top: 8, left: 8, right: 'auto' } : undefined} aria-label="Novedad por ver" data-testid={`tut-dot-${testId}`}>!</span> : null;
}
