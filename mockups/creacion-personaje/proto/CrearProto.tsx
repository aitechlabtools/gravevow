// PROTOTIPO (maqueta) de la nueva creación de personaje. Usa el arte real del juego con las capas nuevas (proto/art.ts).
// Estado inicial por URL: ?cls=warrior&tab=aspecto&view=back&helmet=1&cloak=0&skin=0&hair=1&style=0&beard=0&name=Aldric
import { useEffect, useRef, useState } from 'react';
import { CLASSES } from '../../../src/core/data/classes';
import type { ClassId, Equipment } from '../../../src/core/types';
import { CLOAK_COLORS, CLOAK_NAMES, SKIN_COLORS, SKIN_NAMES } from '../../../src/shared/palette';
import { starterEquipment } from '../../../src/shared/gearLook';
import { getItem, RARITY_INFO } from '../../../src/core/data/items';
import { ItemIcon } from '../../../src/game/ui/inventory';
import { Panel, Segmented, usePixelScale } from '../../../src/game/ui/kit';
import { useLayout } from '../../../src/config/ui';
import { heroUrl, heroBackUrl } from './art';
import { HAIR_COLORS, HAIR_STYLES, BEARDS, NAME_PARTS, SEXES, CLASS_NAME_G } from './looks';

const ORDER: ClassId[] = ['warrior', 'mage', 'rogue', 'cleric'];
const q = new URLSearchParams(location.search);
const qn = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);

type Ap = { sex: number; cloak: number; skin: number; hair: number; style: number; beard: number };

function gear(cls: ClassId): Equipment {
  const eq = { ...starterEquipment(cls) };
  if (q.get('helmet') === '1') eq.helmet = { uid: 'h', itemId: cls === 'mage' ? 'wizard_hat' : 'iron_helm', qty: 1 };
  return eq;
}

export function CrearProto() {
  const [cls, setCls] = useState<ClassId>((q.get('cls') as ClassId) ?? 'warrior');
  const [tab, setTab] = useState<'clase' | 'aspecto'>((q.get('tab') as 'aspecto') ?? 'clase');
  const [view, setView] = useState<'front' | 'back'>((q.get('view') as 'back') ?? 'front');
  const [ap, setAp] = useState<Ap>({ sex: qn('sex', 0), cloak: qn('cloak', 0), skin: qn('skin', 0), hair: qn('hair', cls === 'mage' ? 5 : 1), style: qn('style', 0), beard: qn('beard', 0) });
  const [name, setName] = useState(q.get('name') ?? '');
  const [turning, setTurning] = useState(false);
  const layout = useLayout();
  const phone = layout === 'phone';
  const stage = useRef<HTMLDivElement>(null);
  const heroScale = useFitScale(stage, usePixelScale('heroSm'));
  const portrait = usePixelScale('portrait');
  const def = CLASSES[cls];
  const cname = (id: ClassId) => CLASS_NAME_G[id][ap.sex];
  const side = phone ? 236 : layout === 'tablet' ? 268 : 340;
  const eq = gear(cls);

  // Giro: el sprite se estrecha, cambia de vista y vuelve a abrirse (sin suavizado: solo escala en X)
  const turn = (to?: 'front' | 'back') => {
    setTurning(true);
    setTimeout(() => { setView((v) => to ?? (v === 'front' ? 'back' : 'front')); setTurning(false); }, 110);
  };
  const back = useRef<number | null>(null);
  const set = (k: keyof Ap, v: number) => {
    setAp((a) => ({ ...a, [k]: v }));
    if (k === 'cloak' && view === 'front') { // enseña la capa un momento y vuelve
      turn('back');
      if (back.current) clearTimeout(back.current);
      back.current = window.setTimeout(() => turn('front'), 1300);
    }
  };
  const random = () => setAp({ sex: rnd(2), cloak: rnd(CLOAK_COLORS.length), skin: rnd(SKIN_COLORS.length), hair: rnd(HAIR_COLORS.length), style: rnd(HAIR_STYLES.length), beard: rnd(BEARDS.length) });
  const drag = useRef<number | null>(null);

  return (
    <div className="h-full flex flex-col" data-testid="create-screen"
      style={{ background: 'radial-gradient(ellipse at 50% 55%, #2a1b3a 0%, #120d19 45%, #07060a 80%)', padding: 'var(--pad)', gap: 'var(--gap)' }}>
      <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: `${side}px minmax(0,1fr) ${side}px`, gap: 'var(--gap)' }}>
        <Panel title={tab === 'clase' ? 'Clases' : 'Aspecto'} className="min-h-0" bodyClassName="overflow-y-auto scroll-thin">
          <Segmented full options={[{ id: 'clase', label: 'Clase' }, { id: 'aspecto', label: 'Aspecto' }]} value={tab} onChange={setTab} />
          {tab === 'clase' ? (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {ORDER.map((id) => {
                const c = CLASSES[id]; const on = id === cls;
                return (
                  <button key={id} disabled={!c.playable} onClick={() => setCls(id)}
                    className={`panel p-1.5 flex flex-col items-center relative ${on ? 'border-gold' : ''}`}
                    style={on ? { boxShadow: '0 0 0 1px #07060a, 0 0 16px #e8b33a55' } : undefined}>
                    <span className={`font-display text-xs leading-tight ${on ? 'text-gold' : 'text-stone-300'}`}>{cname(id)}</span>
                    <div className="overflow-hidden flex justify-center mt-1" style={{ height: 24 * portrait, width: 28 * portrait }}>
                      <img src={heroUrl(id, ap, portrait, 0, 'idle', starterEquipment(id))} className={`pixelated ${c.playable ? '' : 'brightness-[.35] grayscale'}`} alt="" />
                    </div>
                    {!c.playable && <span className="absolute left-0 right-0 bottom-1 text-center text-[9px] tracking-[0.12em] uppercase bg-black/80 text-stone-300 py-0.5">Próximamente</span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <button className="btn w-full mt-2 flex items-center justify-center gap-2" style={{ minHeight: 44 }} onClick={random} data-testid="look-random">
                <Dice /> Aleatorio
              </button>
              <Heads label="Cuerpo" names={SEXES.map((x) => x.name)} value={ap.sex} onChange={(i) => set('sex', i)} make={(i) => heroUrl(cls, { ...ap, sex: i, style: i ? 1 : 0, beard: 0 } as never, 3, 0, 'idle', {})} />
              <Swatches label="Capa" names={CLOAK_NAMES} colors={CLOAK_COLORS} value={ap.cloak} onChange={(i) => set('cloak', i)} />
              <Swatches label="Piel" names={SKIN_NAMES} colors={SKIN_COLORS} value={ap.skin} onChange={(i) => set('skin', i)} />
              <Swatches label="Pelo" names={HAIR_COLORS.map((h) => h.name)} colors={HAIR_COLORS.map((h) => h.color!)} value={ap.hair} onChange={(i) => set('hair', i)} />
              <Heads label="Peinado" names={HAIR_STYLES.map((h) => h.name)} value={ap.style} onChange={(i) => set('style', i)} make={(i) => heroUrl(cls, { ...ap, style: i, beard: 0 } as never, 3, 0, 'idle', {})} />
              <Heads label="Barba" names={BEARDS.map((h) => h.name)} value={ap.beard} onChange={(i) => set('beard', i)} make={(i) => heroUrl(cls, { ...ap, beard: i } as never, 3, 0, 'idle', {})} />
            </div>
          )}
        </Panel>

        <div className="min-h-0 flex flex-col items-center text-center overflow-hidden">
          <div className="text-[11px] tracking-[0.3em] uppercase text-stone-400">Elige tu clase</div>
          <h1 className="font-display text-parchment leading-none mt-1" style={{ fontSize: phone ? 24 : 40 }}>
            <span className="text-gold">{cname(cls)[0]}</span>{cname(cls).slice(1)}
          </h1>
          {!phone && <div className="font-body italic text-stone-300 mt-1" style={{ fontSize: 17 }}>«{def.tagline}»</div>}
          <div ref={stage} className="flex-1 min-h-0 w-full flex items-center justify-center pb-2 relative" style={{ touchAction: 'pan-y' }}
            onPointerDown={(e) => { drag.current = e.clientX; }}
            onPointerUp={(e) => { if (drag.current !== null && Math.abs(e.clientX - drag.current) > 30) turn(); drag.current = null; }}>
            <div className="flex items-center" style={{ gap: phone ? 8 : 32 }}>
            <TurnArrow dir="left" onClick={() => turn()} />
            <div className="relative flex justify-center">
              <div className="pedestal" style={{ width: 24 * heroScale, height: 6 * heroScale, bottom: -3 * heroScale }} />
              <div className="relative" style={{ transform: `scaleX(${turning ? 0.08 : 1})`, transition: 'transform 110ms steps(3)' }}>
                <img className="pixelated" draggable={false} alt=""
                  src={view === 'front' ? heroUrl(cls, ap as never, heroScale, 0, 'idle', eq) : heroBackUrl(cls, ap as never, heroScale, 'idle', eq)} />
              </div>
            </div>
            <TurnArrow dir="right" onClick={() => turn()} />
            </div>
            <div className="absolute left-0 right-0 flex justify-center gap-2" style={{ bottom: 0 }}>
              {(['front', 'back'] as const).map((v) => (
                <span key={v} className={`text-[10px] tracking-[0.2em] uppercase ${view === v ? 'text-gold' : 'text-stone-500'}`}>{v === 'front' ? 'Frente' : 'Espalda'}</span>
              ))}
            </div>
          </div>
        </div>

        <Panel title="Sobre la clase" className="min-h-0" bodyClassName="overflow-y-auto scroll-thin font-body">
          <p className="text-parchment leading-snug" style={{ fontSize: phone ? 13 : 16 }}>{def.description}</p>
          <div className="mt-3"><div className="font-display text-gold text-sm">Arma preferida</div><div className="text-stone-200">{def.weapons}</div></div>
          {def.pros && <ul className="mt-3 space-y-0.5 text-heal">{def.pros.map((p) => <li key={p}>+ {p}</li>)}</ul>}
          {def.cons && <ul className="mt-2 space-y-0.5 text-[#ff7a6a]">{def.cons.map((p) => <li key={p}>− {p}</li>)}</ul>}
          <div className="mt-3">
            <div className="text-xs text-stone-400 mb-1">Equipo inicial</div>
            <div className="flex flex-wrap gap-1">
              {def.starterKit.map((k) => { const it = getItem(k.itemId); return (
                <div key={k.itemId} className="slot" style={{ borderColor: RARITY_INFO[it.rarity].color + 'aa' }}><ItemIcon itemId={k.itemId} size={phone ? 28 : 36} />{k.qty > 1 && <span className="qty">{k.qty}</span>}</div>); })}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid items-end" style={{ gridTemplateColumns: `${side}px minmax(0,1fr) ${side}px`, gap: 'var(--gap)' }}>
        <button className="btn cta text-base self-stretch" style={{ fontSize: phone ? 14 : 18, letterSpacing: '.1em' }}>Volver</button>
        <label className="flex flex-col items-center justify-self-center w-full max-w-sm">
          {!phone && <span className="text-[11px] tracking-[0.25em] uppercase text-stone-400 mb-1">Nombre del personaje</span>}
          <div className="flex w-full gap-1">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={phone ? 'Nombre del personaje' : 'Escribe un nombre'}
              className="flex-1 min-w-0 text-center bg-[#0d0c11] border-2 border-[#6b4a12] px-3 font-display text-parchment tracking-[0.08em]"
              style={{ height: 'var(--cta-h)', fontSize: phone ? 16 : 22 }} />
            <button className="btn flex items-center justify-center" title="Nombre al azar" aria-label="Nombre al azar" data-testid="name-random"
              style={{ width: 'var(--cta-h)', minWidth: 44, height: 'var(--cta-h)' }} onClick={() => setName(randomName(ap.sex))}><Quill /></button>
          </div>
          {!phone && <span className="flex items-center gap-2 mt-1 text-sm text-stone-300" style={{ minHeight: 44 }}><input type="checkbox" defaultChecked className="accent-[#e8b33a] w-5 h-5" />Saltar el tutorial</span>}
        </label>
        <button className="btn btn-gold cta self-stretch" style={{ fontSize: phone ? 14 : 18, letterSpacing: '.1em' }} disabled={name.trim().length < 2}>Confirmar</button>
      </div>
    </div>
  );
}

const rnd = (n: number) => Math.floor(Math.random() * n);
function randomName(sex: number) {
  const ends = sex ? NAME_PARTS.endF : NAME_PARTS.endM;
  const s = NAME_PARTS.start[rnd(NAME_PARTS.start.length)], e = ends[rnd(ends.length)];
  return s + e;
}

function TurnArrow({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
  return (
    <button className="btn flex items-center justify-center shrink-0" aria-label={dir === 'left' ? 'Girar a la izquierda' : 'Girar a la derecha'}
      style={{ width: 44, height: 56, fontSize: 22 }} onClick={onClick} data-testid={`turn-${dir}`}>{dir === 'left' ? '◂' : '▸'}</button>
  );
}

function useFitScale(ref: React.RefObject<HTMLDivElement | null>, min: number): number {
  const [s, setS] = useState(min);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const upd = () => { const { width, height } = el.getBoundingClientRect(); setS(Math.max(min, Math.floor(Math.min((height * 0.88) / 29, (width - 110) / 24)))); };
    upd(); const ro = new ResizeObserver(upd); ro.observe(el); return () => ro.disconnect();
  }, [ref, min]);
  return s;
}

function Swatches({ label, names, colors, value, onChange }: { label: string; names: string[]; colors: string[]; value: number; onChange: (i: number) => void }) {
  return (
    <div className="mt-2">
      <div className="text-[11px] tracking-[0.2em] uppercase text-stone-400 mb-1">{label}: <span className="text-stone-200 normal-case tracking-normal">{names[value]}</span></div>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c, i) => <button key={c} aria-label={`${label}: ${names[i]}`} onClick={() => onChange(i)} className={`border-2 ${value === i ? 'border-gold' : 'border-stone-700'}`} style={{ background: c, width: 'var(--touch)', height: 'var(--touch)' }} />)}
      </div>
    </div>
  );
}

/** Miniaturas de la cabeza (el mismo sprite del juego, recortado a la cabeza). */
function Heads({ label, names, value, onChange, make }: { label: string; names: string[]; value: number; onChange: (i: number) => void; make: (i: number) => string }) {
  return (
    <div className="mt-2">
      <div className="text-[11px] tracking-[0.2em] uppercase text-stone-400 mb-1">{label}: <span className="text-stone-200 normal-case tracking-normal">{names[value]}</span></div>
      <div className="flex flex-wrap gap-1.5">
        {names.map((n, i) => (
          <button key={n} aria-label={`${label}: ${n}`} onClick={() => onChange(i)} className={`border-2 bg-[#0d0c11] overflow-hidden relative ${value === i ? 'border-gold' : 'border-stone-700'}`} style={{ width: 'var(--touch)', height: 'var(--touch)' }}>
            <img src={make(i)} className="pixelated absolute" style={{ left: '50%', top: -6, transform: 'translateX(-50%)', maxWidth: 'none' }} alt="" />
          </button>
        ))}
      </div>
    </div>
  );
}

// Iconos provisionales en pixel art (12×12), a escala entera ×2
function Dice() {
  return (
    <svg width={24} height={24} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden>
      <rect x="1" y="1" width="10" height="10" fill="#d9d3c1" /><rect x="1" y="10" width="10" height="1" fill="#a49c86" /><rect x="10" y="1" width="1" height="10" fill="#a49c86" />
      <rect x="3" y="3" width="2" height="2" fill="#4a0e18" /><rect x="7" y="7" width="2" height="2" fill="#4a0e18" /><rect x="5" y="5" width="2" height="2" fill="#4a0e18" />
    </svg>
  );
}
function Quill() {
  return (
    <svg width={24} height={24} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden>
      <rect x="8" y="1" width="2" height="1" fill="#d9d3c1" /><rect x="7" y="2" width="2" height="2" fill="#d9d3c1" /><rect x="6" y="4" width="2" height="2" fill="#a49c86" />
      <rect x="5" y="6" width="1" height="2" fill="#a49c86" /><rect x="4" y="8" width="1" height="2" fill="#e8b33a" /><rect x="3" y="10" width="1" height="1" fill="#e8b33a" /><rect x="1" y="11" width="5" height="1" fill="#6b4a12" />
    </svg>
  );
}
