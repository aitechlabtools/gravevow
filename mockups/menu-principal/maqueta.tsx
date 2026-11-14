// Maqueta del menú principal nuevo: columna de logo y menú a la izquierda, diorama de la landing a la derecha con corte escalonado.
// ?v=chevron (el boceto: corte en «<») o ?v=recta (una sola diagonal). ?p=0 sin personaje.
import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import '../../src/game/game.css';
import './menu.css';
import { Diorama } from '../../src/landing/Diorama';
import { GravevowLogo } from '../../src/shared/GravevowLogo';
import { DiscordIcon, HeartIcon } from '../../src/shared/community';

const q = new URLSearchParams(location.search);
const V = q.get('v') || 'chevron';
const NEGRO = q.get('f') === 'negro';
const M = q.get('m') || 'botones';

/** Polígono escalonado (pixel art): cada tramo de la línea se convierte en escalones de `step` px. */
function stepped(pts: [number, number][], step: number) {
  const out: string[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.max(1, Math.round(Math.abs(y1 - y0) / step));
    for (let k = 0; k < n; k++) {
      const ya = y0 + ((y1 - y0) * k) / n, yb = y0 + ((y1 - y0) * (k + 1)) / n;
      const x = Math.round((x0 + ((x1 - x0) * (k + 0.5)) / n) / step) * step;
      out.push(`${x}px ${ya}px`, `${x}px ${yb}px`);
    }
  }
  return out;
}

function Corte() {
  const ref = useRef<HTMLDivElement>(null);
  const [clip, setClip] = useState<{ a: string; line: string; w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const f = () => {
      const w = el.clientWidth, h = el.clientHeight;
      const step = h < 500 ? 4 : 6;
      const edge: [number, number][] = V === 'recta'
        ? [[w * 0.16, 0], [0, h]]
        : [[w * 0.2, 0], [0, h * 0.46], [w * 0.3, h]];
      const s = stepped(edge, step);
      setClip({ a: `polygon(${w}px 0, ${s.join(',')}, ${w}px ${h}px)`, line: 'M' + s.map((p) => p.replace(/px/g, '')).join(' L'), w, h });
    };
    f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect();
  }, []);
  if (NEGRO) return <div className="tm-art tm-free"><Diorama className="tm-dio" fill="#040308" ax={0.5} ay={0.47} /></div>;
  return (
    <div className="tm-art" ref={ref}>
      {clip && <>
        <div className="tm-scene" style={{ clipPath: clip.a }}>
          <Diorama className="tm-dio" fill="#040308" ax={0.5} ay={0.46} />
          <div className="tm-fade" />
        </div>
      </>}
    </div>
  );
}

/** Propuesta C: menú de videojuego. Entradas de texto grabado sobre una losa, con el rombo del juramento marcando la elegida
 *  (ratón, toque o flechas del teclado), y los enlaces secundarios en una fila pequeña al pie. */
function MenuJuego({ p }: { p: boolean }) {
  const items = p ? ['Continuar', 'Elegir personaje', 'Copia de seguridad', 'Ajustes'] : ['Nuevo personaje', 'Tengo una copia', 'Ajustes'];
  const [sel, setSel] = useState(0);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowDown') setSel((i) => (i + 1) % items.length); if (e.key === 'ArrowUp') setSel((i) => (i + items.length - 1) % items.length); };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [items.length]);
  return (
    <nav className="gm">
      {p && <div className="gm-save"><span className="gm-who">Pau</span><span>Guerrero · Nv 4 · 12 expediciones</span></div>}
      <ul>
        {items.map((t, i) => (
          <li key={t}><button className={`gm-it${i === sel ? ' on' : ''}${i === 0 ? ' main' : ''}`} onMouseEnter={() => setSel(i)} onFocus={() => setSel(i)}>
            <i className="gm-rb" aria-hidden />{t}
          </button></li>
        ))}
      </ul>
      <div className="gm-links">
        <a><HeartIcon size={14} /> Apoyar</a><a><DiscordIcon size={16} /> Discord</a><a>Volver a la web</a>
      </div>
    </nav>
  );
}

function Menu() {
  const p = q.get('p') !== '0';
  return (
    <div className={`tm${NEGRO ? ' tm-negro' : ''}`}>
      <Corte />
      <button className="btn tm-fs" aria-label="Pantalla completa"><svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" /></svg></button>
      <div className="tm-col">
        <div className="tm-head">
          <GravevowLogo className="tm-logo" />
          <p className="tm-tag font-body italic">Confía en tu espada. En nadie más.</p>
        </div>
        {M === 'juego' ? <MenuJuego p={p} /> : (
        <div className="tm-menu">
          <button className="btn btn-gold tm-play">{p ? 'Continuar como Pau' : 'Nuevo personaje'}</button>
          {!p && <button className="btn">Tengo una copia</button>}
          {p && <button className="btn">Elegir personaje</button>}
          {p && <button className="btn">Copia de seguridad</button>}
          <button className="btn">Ajustes</button>
          <a className="btn">Volver a la web</a>
          <div className="tm-comm">
            <a className="btn"><HeartIcon size={16} /> Apoyar</a>
            <a className="btn"><DiscordIcon size={18} /> Discord</a>
          </div>
        </div>
        )}
        <p className="tm-foot">Alpha v0.1 · Tu progreso se guarda en este navegador: haz copias de seguridad.</p>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<Menu />);
