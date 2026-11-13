// Crear personaje (opción D): tres columnas. Izquierda: pestañas Clase y Aspecto (género, capa, piel, pelo, peinado, barba y Aleatorio). Centro: la clase elegida en grande.
// Centro: se gira entre frente y espalda (flechas o arrastrar). Derecha: sobre la clase (descripción, arma, puntos fuertes y débiles, habilidades y equipo inicial).
// Abajo: Volver, el nombre del personaje y Confirmar.
import { useEffect, useRef, useState } from 'react';
import { actions, tutorialDoneOnDevice, useGame } from '../../state/store';
import { CLASSES } from '../../../core/data/classes';
import type { Appearance, ClassId, Sex } from '../../../core/types';
import { BEARDS, HAIR_COLORS, HAIR_STYLES, SEXES, CLASS_LOOK_DEFAULT, randomName } from '../../../core/data/appearance';
import { className } from '../../../core/gender';
import { heroBackUrl, heroUrl } from '../../../shared/art';
import { CLOAK_COLORS, CLOAK_NAMES, SKIN_COLORS, SKIN_NAMES } from '../../../shared/palette';
import { HeroSprite } from '../common';
import { starterEquipment } from '../../../shared/gearLook';
import { combatLoadout } from '../../../core/loadout';
import { getSkill } from '../../../core/data/skills';
import { getItem, RARITY_INFO } from '../../../core/data/items';
import { ItemIcon } from '../inventory';
import { Panel, Segmented, usePixelScale } from '../kit';
import { useLayout } from '../../../config/ui';
import { sfx } from '../../audio';

import { emptyEquipment } from '../../../core/inventory';
/** Las miniaturas de cabeza, sin yelmo ni equipo. */
const NO_GEAR = emptyEquipment();

const ORDER: ClassId[] = ['warrior', 'mage', 'rogue', 'cleric'];

export function CrearPersonaje() {
  const [name, setName] = useState('');
  const [cls, setCls] = useState<ClassId>('warrior');
  const [tab, setTab] = useState<'clase' | 'aspecto'>('clase');
  const [ap, setAp] = useState<Required<Appearance>>({ cloak: 0, skin: 0, sex: 'm', ...CLASS_LOOK_DEFAULT.warrior });
  const [view, setView] = useState<'front' | 'back'>('front');
  const [turning, setTurning] = useState(false);
  const layout = useLayout();
  const phone = layout === 'phone';
  const minScale = usePixelScale('heroSm');
  const stage = useRef<HTMLDivElement>(null);
  const heroScale = useFitScale(stage, minScale);
  const portrait = usePixelScale('portrait');
  const def = CLASSES[cls];
  const cname = (id: ClassId) => className(id, ap.sex);
  // Giro: el sprite se estrecha, cambia de vista y vuelve a abrirse (solo escala en X, sin suavizado)
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  const turn = (to?: 'front' | 'back') => {
    setTurning(true);
    later(() => { setView((v) => to ?? (v === 'front' ? 'back' : 'front')); setTurning(false); }, 110);
  };
  const showBack = useRef<number | null>(null);
  const set = <K extends keyof Appearance>(k: K, v: Required<Appearance>[K]) => {
    setAp((a) => ({ ...a, [k]: v }));
    sfx('click');
    if (k === 'cloak' && view === 'front') { // enseña la capa un momento y vuelve
      turn('back');
      if (showBack.current) clearTimeout(showBack.current);
      showBack.current = window.setTimeout(() => turn('front'), 1300);
      timers.current.push(showBack.current);
    }
  };
  const pickClass = (id: ClassId) => {
    setCls(id); sfx('click');
    setAp((a) => (a.hair === CLASS_LOOK_DEFAULT[cls].hair ? { ...a, hair: CLASS_LOOK_DEFAULT[id].hair } : a)); // si no tocó el pelo, el de la clase
  };
  const rnd = (n: number) => Math.floor(Math.random() * n);
  const random = () => { sfx('click'); setAp({ cloak: rnd(CLOAK_COLORS.length), skin: rnd(SKIN_COLORS.length), sex: SEXES[rnd(SEXES.length)].id, hair: rnd(HAIR_COLORS.length), style: rnd(HAIR_STYLES.length), beard: rnd(BEARDS.length) }); };
  const drag = useRef<number | null>(null);
  const valid = name.trim().length >= 2;
  // Si en este navegador ya se completó el tutorial alguna vez, se puede saltar
  // Con el tutorial ya jugado por otro personaje de la partida, los nuevos empiezan directamente (pueden jugarlo si quieren)
  const accountDone = useGame((s) => s.accountTutorialDone);
  const hasRoster = useGame((s) => s.roster.length > 0);
  const canSkip = accountDone || tutorialDoneOnDevice();
  const [skip, setSkip] = useState(accountDone);
  const create = () => { if (!valid) return; sfx('equip'); void actions.createCharacter(name, cls, ap, canSkip && skip); };
  const side = phone ? 236 : layout === 'tablet' ? 268 : 340;

  return (
    <div className="h-full flex flex-col" data-testid="create-screen"
      style={{ background: 'radial-gradient(ellipse at 50% 55%, #2a1b3a 0%, #120d19 45%, #07060a 80%)', padding: 'max(var(--pad), env(safe-area-inset-top)) max(var(--pad), env(safe-area-inset-right)) max(var(--pad), env(safe-area-inset-bottom)) max(var(--pad), env(safe-area-inset-left))', gap: 'var(--gap)' }}>
      <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: `${side}px minmax(0,1fr) ${side}px`, gap: 'var(--gap)' }}>
        {/* Clase o aspecto */}
        <Panel title={tab === 'clase' ? 'Clases' : 'Aspecto'} className="min-h-0" bodyClassName="overflow-y-auto scroll-thin">
          <Segmented full testId="create-tabs" options={[{ id: 'clase', label: 'Clase' }, { id: 'aspecto', label: 'Aspecto' }]} value={tab} onChange={(t) => { setTab(t); sfx('click'); }} />
          {tab === 'clase' ? (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {ORDER.map((id) => {
              const c = CLASSES[id];
              const on = id === cls;
              return (
                <button key={id} data-testid={`class-${id}`} disabled={!c.playable} onClick={() => pickClass(id)}
                  aria-pressed={on} aria-label={c.playable ? cname(id) : `${cname(id)} (próximamente)`}
                  className={`panel p-1.5 flex flex-col items-center relative ${on ? 'border-gold' : ''} ${c.playable ? 'hover:brightness-125' : 'cursor-not-allowed'}`}
                  style={on ? { boxShadow: '0 0 0 1px #07060a, 0 0 16px #e8b33a55' } : undefined}>
                  <span className={`font-display text-xs leading-tight ${on ? 'text-gold' : 'text-stone-300'}`}>{cname(id)}</span>
                  {/* Retrato provisional: la parte de arriba del personaje (el definitivo, 24×24, lo dibujará el usuario) */}
                  <div className="overflow-hidden flex justify-center mt-1" style={{ height: 24 * portrait, width: 28 * portrait }}>
                    <HeroSprite classId={id} appearance={ap} scale={portrait} animate={false} className={c.playable ? '' : 'brightness-[.35] grayscale'} />
                  </div>
                  {!c.playable && <span className="absolute left-0 right-0 bottom-1 text-center text-[9px] tracking-[0.12em] uppercase bg-black/80 text-stone-300 py-0.5">Próximamente</span>}
                </button>
              );
            })}
          </div>
          ) : (
            <div data-testid="look-panel">
              {/* Género y, en la misma fila, Aleatorio (así cabe todo sin scroll en escritorio y tableta) */}
              <Heads label="Género" names={SEXES.map((x) => x.name)} value={SEXES.findIndex((x) => x.id === ap.sex)} testId="look-sex"
                onChange={(i) => set('sex', SEXES[i].id as Sex)} make={(i) => heroUrl(cls, { ...ap, sex: SEXES[i].id, beard: 0 }, 3, 0, 'idle', NO_GEAR)}
                extra={<button className="btn flex-1 flex items-center justify-center gap-2 px-2" style={{ minHeight: 'var(--touch)', minWidth: 'var(--touch)' }} onClick={random} data-testid="look-random" title="Aspecto al azar">
                  <DiceIcon /> Aleatorio
                </button>} />
              <Swatches label="Capa" names={CLOAK_NAMES} colors={CLOAK_COLORS} value={ap.cloak} onChange={(i) => set('cloak', i)} testId="cloak" />
              <Swatches label="Piel" names={SKIN_NAMES} colors={SKIN_COLORS} value={ap.skin} onChange={(i) => set('skin', i)} testId="skin" />
              <Swatches label="Pelo" names={HAIR_COLORS.map((h) => h.name)} colors={HAIR_COLORS.map((h) => h.color!)} value={ap.hair} onChange={(i) => set('hair', i)} testId="hair" />
              <Heads label="Peinado" names={HAIR_STYLES.map((h) => h.name)} value={ap.style} onChange={(i) => set('style', i)} testId="look-style"
                make={(i) => heroUrl(cls, { ...ap, style: i, beard: 0 }, 3, 0, 'idle', NO_GEAR)} />
              <Heads label="Barba" names={BEARDS.map((h) => h.name)} value={ap.beard} onChange={(i) => set('beard', i)} testId="look-beard"
                make={(i) => heroUrl(cls, { ...ap, beard: i }, 3, 0, 'idle', NO_GEAR)} />
            </div>
          )}
        </Panel>

        {/* La clase elegida, en grande */}
        <div className="min-h-0 flex flex-col items-center text-center overflow-hidden">
          <div className="text-[11px] tracking-[0.3em] uppercase text-stone-400">Elige tu clase</div>
          <h1 className="font-display text-parchment leading-none mt-1" style={{ fontSize: phone ? 24 : 40 }} data-testid="create-class-name">
            <span className="text-gold">{cname(cls)[0]}</span>{cname(cls).slice(1)}
          </h1>
          <div className="font-body italic text-stone-300 mt-1" style={{ fontSize: phone ? 13 : 17 }}>«{def.tagline}»</div>
          <div ref={stage} className="flex-1 min-h-0 w-full flex items-center justify-center pb-5 relative select-none" data-testid="create-stage" data-view={view}
            style={{ touchAction: 'pan-y' }}
            onPointerDown={(e) => { drag.current = e.clientX; }}
            onPointerUp={(e) => { if (drag.current !== null && Math.abs(e.clientX - drag.current) > 30) turn(); drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}>
            <div className="flex items-center" style={{ gap: phone ? 8 : 32 }}>
              <TurnArrow dir="left" onClick={() => turn()} />
              <div className="relative flex justify-center">
                <div className="pedestal" style={{ width: 24 * heroScale, height: 6 * heroScale, bottom: -3 * heroScale }} />
                <div className="relative" style={{ transform: `scaleX(${turning ? 0.08 : 1})`, transition: 'transform 110ms steps(3)' }}>
                  {view === 'front'
                    ? <HeroSprite classId={cls} appearance={ap} scale={heroScale} />
                    : <img src={heroBackUrl(cls, ap, heroScale)} className="pixelated" alt="" draggable={false} data-testid="hero-sprite-back" />}
                </div>
              </div>
              <TurnArrow dir="right" onClick={() => turn()} />
            </div>
            <div className="absolute left-0 right-0 bottom-0 flex justify-center gap-3 pointer-events-none" aria-hidden>
              {(['front', 'back'] as const).map((v) => (
                <span key={v} className={`text-[10px] tracking-[0.2em] uppercase ${view === v ? 'text-gold' : 'text-stone-500'}`}>{v === 'front' ? 'Frente' : 'Espalda'}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Sobre la clase */}
        <Panel title="Sobre la clase" className="min-h-0" bodyClassName="overflow-y-auto scroll-thin font-body" testId="class-about">
          <p className="text-parchment leading-snug" style={{ fontSize: phone ? 13 : 16 }}>{def.description}</p>
          <div className="mt-3">
            <div className="font-display text-gold text-sm">Arma preferida</div>
            <div className="text-stone-200">{def.weapons}</div>
          </div>
          {def.pros && <ul className="mt-3 space-y-0.5 text-heal">{def.pros.map((p) => <li key={p}>+ {p}</li>)}</ul>}
          {def.cons && <ul className="mt-2 space-y-0.5 text-[#ff7a6a]">{def.cons.map((p) => <li key={p}>− {p}</li>)}</ul>}
          <StartingSkills classId={cls} />
          <div className="mt-3">
            <div className="text-xs text-stone-400 mb-1">Equipo inicial</div>
            <div className="flex flex-wrap gap-1">
              {def.starterKit.map((k) => {
                const it = getItem(k.itemId);
                return (
                  <div key={k.itemId} className="slot" title={it.name} style={{ borderColor: RARITY_INFO[it.rarity].color + 'aa' }}>
                    <ItemIcon itemId={k.itemId} size={phone ? 28 : 36} />{k.qty > 1 && <span className="qty">{k.qty}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>

      {/* Volver · nombre · Confirmar */}
      <div className="grid items-end" style={{ gridTemplateColumns: `${side}px minmax(0,1fr) ${side}px`, gap: 'var(--gap)' }}>
        <button className="btn cta text-base self-stretch" style={{ fontSize: phone ? 14 : 18, letterSpacing: '.1em' }} onClick={() => (hasRoster ? void actions.openSelect() : actions.goto('title'))} data-testid="btn-create-back">Volver</button>
        <label className="flex flex-col items-center justify-self-center w-full max-w-sm">
          {!phone && <span className="text-[11px] tracking-[0.25em] uppercase text-stone-400 mb-1">Nombre del personaje</span>}
          <div className="flex w-full gap-1">
            <input data-testid="name-input" value={name} maxLength={18} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder={phone ? 'Nombre del personaje' : 'Escribe un nombre'} aria-label="Nombre del personaje"
              className="flex-1 min-w-0 text-center bg-[#0d0c11] border-2 border-[#6b4a12] px-3 font-display text-parchment tracking-[0.08em] focus:outline-none focus:border-gold"
              style={{ height: 'var(--cta-h)', fontSize: phone ? 16 : 22 }} />
            <button type="button" className="btn flex items-center justify-center shrink-0" title="Nombre al azar" aria-label="Nombre al azar" data-testid="name-random"
              style={{ width: 'var(--cta-h)', height: 'var(--cta-h)' }} onClick={(e) => { e.preventDefault(); sfx('click'); setName(randomName(ap.sex)); }}><QuillIcon /></button>
          </div>
          {canSkip && (
            <span className="flex items-center gap-2 mt-1 text-sm text-stone-300 cursor-pointer" style={{ minHeight: 44 }}>
              <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} className="accent-[#e8b33a] w-5 h-5" data-testid="skip-tutorial" />
              <span onClick={() => setSkip(!skip)}>Saltar el tutorial</span>
            </span>
          )}
        </label>
        <button className="btn btn-gold cta self-stretch" style={{ fontSize: phone ? 14 : 18, letterSpacing: '.1em' }} disabled={!valid} onClick={create} data-testid="btn-create"
          title={valid ? undefined : 'Escribe un nombre (mín. 2 letras)'}>Confirmar</button>
      </div>
    </div>
  );
}

/**
 * El personaje llena el hueco central: la mayor escala ENTERA que cabe (el sprite mide 20×26 y el arma sobresale),
 * dejando sitio para el círculo de los pies. Se recalcula al cambiar el tamaño de la ventana.
 */
function useFitScale(ref: React.RefObject<HTMLDivElement | null>, min: number): number {
  const [s, setS] = useState(min);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => {
      const { width, height } = el.getBoundingClientRect();
      setS(Math.max(min, Math.floor(Math.min((height * 0.9) / 29, (width - 140) / 24))));
    };
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, min]);
  return s;
}

function Swatches({ label, names, colors, value, onChange, testId }: { label: string; names: string[]; colors: string[]; value: number; onChange: (i: number) => void; testId: string }) {
  return (
    <div className="mt-2">
      <div className="text-[11px] tracking-[0.2em] uppercase text-stone-400 mb-1">{label}: <span className="text-stone-200 normal-case tracking-normal">{names[value]}</span></div>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c, i) => (
          <button key={c} aria-label={`${label}: ${names[i]}`} aria-pressed={value === i} onClick={() => onChange(i)} data-testid={`${testId}-${i}`}
            className={`border-2 ${value === i ? 'border-gold' : 'border-stone-700'}`} style={{ background: c, width: 'var(--touch)', height: 'var(--touch)' }} />
        ))}
      </div>
    </div>
  );
}

/** Habilidades con las que empieza: la de clase y las del arma y la secundaria iniciales. */
function StartingSkills({ classId }: { classId: ClassId }) {
  const kit = combatLoadout(classId, starterEquipment(classId));
  const ids = kit.groups.flatMap((g) => g.skills);
  return (
    <div className="mt-3" data-testid="starting-skills">
      <div className="text-xs text-stone-400 mb-1">Habilidades al empezar</div>
      <div className="text-stone-200 leading-snug">{ids.map((id) => getSkill(id).name).join(' · ')}</div>
    </div>
  );
}

/** Miniaturas de la cabeza: el mismo sprite del juego, recortado a la cabeza. */
function Heads({ label, names, value, onChange, make, testId, extra }: { label: string; names: string[]; value: number; onChange: (i: number) => void; make: (i: number) => string; testId: string; extra?: React.ReactNode }) {
  return (
    <div className="mt-2">
      <div className="text-[11px] tracking-[0.2em] uppercase text-stone-400 mb-1">{label}: <span className="text-stone-200 normal-case tracking-normal">{names[value]}</span></div>
      <div className="flex flex-wrap gap-1.5">
        {names.map((n, i) => (
          <button key={n} aria-label={`${label}: ${n}`} aria-pressed={value === i} onClick={() => onChange(i)} data-testid={`${testId}-${i}`}
            className={`border-2 bg-[#0d0c11] overflow-hidden relative ${value === i ? 'border-gold' : 'border-stone-700'}`} style={{ width: 'var(--touch)', height: 'var(--touch)' }}>
            <img src={make(i)} className="pixelated absolute" style={{ left: '50%', top: -6, transform: 'translateX(-50%)', maxWidth: 'none' }} alt="" draggable={false} />
          </button>
        ))}
        {extra}
      </div>
    </div>
  );
}

function TurnArrow({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
  return (
    <button className="btn flex items-center justify-center shrink-0" aria-label={dir === 'left' ? 'Girar a la izquierda' : 'Girar a la derecha'} title="Girar"
      style={{ width: 'var(--touch)', height: 56, fontSize: 22, padding: 0 }} onClick={onClick} data-testid={`turn-${dir}`}>{dir === 'left' ? '◂' : '▸'}</button>
  );
}

// Iconos provisionales en pixel art de 12 × 12 a ×2 (los definitivos: docs/ASSETS.md)
function DiceIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden>
      <rect x="1" y="1" width="10" height="10" fill="#d9d3c1" /><rect x="1" y="10" width="10" height="1" fill="#a49c86" /><rect x="10" y="1" width="1" height="10" fill="#a49c86" />
      <rect x="3" y="3" width="2" height="2" fill="#4a0e18" /><rect x="7" y="7" width="2" height="2" fill="#4a0e18" /><rect x="5" y="5" width="2" height="2" fill="#4a0e18" />
    </svg>
  );
}
function QuillIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden>
      <rect x="8" y="1" width="2" height="1" fill="#d9d3c1" /><rect x="7" y="2" width="2" height="2" fill="#d9d3c1" /><rect x="6" y="4" width="2" height="2" fill="#a49c86" />
      <rect x="5" y="6" width="1" height="2" fill="#a49c86" /><rect x="4" y="8" width="1" height="2" fill="#e8b33a" /><rect x="3" y="10" width="1" height="1" fill="#e8b33a" /><rect x="1" y="11" width="5" height="1" fill="#6b4a12" />
    </svg>
  );
}
