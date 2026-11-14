// Habilidades (antes «Personaje»; reorganizada el 14/11, mockups/habilidades): en escritorio, «Ataques» a la izquierda, el héroe
// con sus rombos en el centro (clase arriba, mano derecha en el lado de la espada, mano izquierda en el del escudo) y «Clase»
// (camino de hitos) a la derecha. En tableta y móvil, el héroe y un solo panel con selector Ataques · Clase.
// Los atributos, el desglose y la trayectoria están en Intendencia → «Ver detalles» (HeroDetails.tsx).
// No cambia ninguna regla: los ataques salen de las armas y la habilidad de clase se elige en los hitos (core/classSkills.ts).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { actions, useGame } from '../../state/store';
import { CLASSES } from '../../../core/data/classes';
import { computeStats, xpForNextLevel } from '../../../core/stats';
import { combatLoadout } from '../../../core/loadout';
import { getSkill } from '../../../core/data/skills';
import { getItem } from '../../../core/data/items';
import { isTwoHanded } from '../../../core/data/weapons';
import { pendingUnlocks, unlocksEarned } from '../../../core/classSkills';
import { CLASS_UNLOCK_LEVELS, skillCost } from '../../../config/progression';
import { PlayerSprite } from '../common';
import { ActionIcon } from '../combatActions';
import { ItemIcon } from '../inventory';
import { Panel, Segmented, usePixelScale } from '../kit';
import { useLayout } from '../../../config/ui';

// Mismos colores que la barra de combate (combatActions.tsx → SOURCE)
const C = { basic: '#d9d3c1', class: '#e8b33a', weapon: '#a56bff', offhand: '#8fa8c8' } as const;
type Src = keyof typeof C;
interface Atk { id: string; name: string; desc: string; cost: number; cd: number; fx: string; src: Src }
const MILESTONES = [1, ...CLASS_UNLOCK_LEVELS];

function useKit() {
  const profile = useGame((s) => s.profile)!;
  const ch = profile.character;
  const cls = CLASSES[ch.classId];
  const kit = combatLoadout(ch.classId, profile.equipment, profile.classSkills.equipped);
  const res = cls.resourceName.toLowerCase();
  const maxMp = computeStats(ch.classId, ch.level, profile.equipment).maxMp;
  const mk = (id: string, src: Src): Atk => { const s = getSkill(id); return { id, name: s.name, desc: s.description, cost: skillCost(s.cost, maxMp, cls.resource), cd: s.cooldown ?? 0, fx: s.fx ?? 'slash', src }; };
  const basic: Atk = { id: 'basic', name: kit.basicAttack.name, desc: 'Ataque básico del arma que llevas. No gasta nada.', cost: 0, cd: 0, fx: kit.basicAttack.fx ?? 'slash', src: 'basic' };
  const mainId = profile.equipment.mainHand?.itemId; const offId = profile.equipment.offHand?.itemId;
  const two = mainId ? isTwoHanded(getItem(mainId)) : false;
  const right = { label: kit.right.label, itemId: mainId, items: [basic, ...kit.right.skills.map((id) => mk(id, 'weapon'))] };
  const left = { label: two ? `${kit.right.label} (a dos manos)` : kit.left.label, itemId: two ? mainId : offId, two, items: kit.left.skills.map((id) => mk(id, 'offhand')) };
  const cs = mk(kit.classSkill, 'class');
  return { profile, ch, cls, res, right, left, cs, maxMp };
}

const costText = (a: { cost: number; cd: number }, res: string) => `${a.cost ? `${a.cost} ${res}` : 'sin coste'}${a.cd ? ` · recarga ${a.cd}` : ''}`;

function Diamond({ fx, color, size, strong }: { fx: string; color: string; size: number; strong?: boolean }) {
  return (
    <span className="grid place-items-center rotate-45 border-2 bg-[#0d0c11] shrink-0" style={{ width: size, height: size, borderColor: strong ? color : color + '99', boxShadow: strong ? `0 0 0 2px #0d0c11, 0 0 0 4px ${color}55` : undefined }}>
      <span className="-rotate-45"><ActionIcon fx={fx} color={color} size={Math.round(size * 0.5)} /></span>
    </span>
  );
}

function Lock({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden><path d="M2 0h3v1h1v2h1v4H0V3h1V1h1zM2 1v2h3V1z" fill="#8c8693" /><path d="M3 4h1v2H3z" fill="#07060a" /></svg>;
}

export function Personaje({ onStash }: { onStash?: () => void }) {
  const k = useKit();
  const layout = useLayout();
  const phone = layout === 'phone';
  const both = layout === 'desktop';
  const [focus, setFocus] = useState<string | null>(null);
  // Tableta y móvil: un solo panel al lado del personaje, con selector Ataques · Clase. Se abre en Clase si hay un hito por elegir.
  const pending = pendingUnlocks(k.profile) > 0;
  const [tab, setTab] = useState<'atk' | 'class'>(pending ? 'class' : 'atk');
  // Tocar un rombo resalta su entrada (en los dos sitios) y, con selector, abre el panel donde está
  const pick = (id: string | null) => { setFocus(id); if (id && !both) setTab(id === k.cs.id ? 'class' : 'atk'); };
  const pad = { padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))', gap: 'var(--gap)' } as const;
  const arc = <SkillArc k={k} focus={focus} onFocus={pick} compact={phone} />;
  const attacks = <Attacks k={k} focus={focus} onFocus={pick} onStash={onStash} />;
  const path = <ClassPath focus={focus} onFocus={pick} />;
  const classTitle = pending ? 'Clase ◆' : 'Clase';

  if (both) {
    // Escritorio: Ataques a la izquierda, el personaje en el centro y Clase a la derecha, sin selector
    return (
      <div className="h-full grid pj-wide" style={{ ...pad, gridTemplateColumns: '400px minmax(0,1fr) 420px' }} data-testid="screen-character">
        <div className="min-h-0 flex" data-testid="character-panels"><Panel title="Ataques" className="flex-1 min-h-0" bodyClassName="overflow-y-auto scroll-thin" testId="character-atk">{attacks}</Panel></div>
        <div className="min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 relative">{arc}</div>
          <p className="font-body text-stone-400 text-center text-[16px] leading-snug max-w-lg mx-auto pt-2">Tus ataques salen de tus armas. Tu habilidad de clase la eliges tú.</p>
        </div>
        <Panel title={classTitle} className="min-h-0" bodyClassName="overflow-y-auto scroll-thin" testId="character-class">{path}</Panel>
      </div>
    );
  }
  return (
    <div className={`h-full grid ${phone ? '' : 'pj-wide'}`} style={{ ...pad, gridTemplateColumns: phone ? 'minmax(0,1fr) minmax(0,1.15fr)' : 'minmax(0,1fr) 440px' }} data-testid="screen-character">
      <div className="min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 relative">{arc}</div>
        {!phone && <p className="font-body text-stone-400 text-center text-[16px] leading-snug max-w-lg mx-auto pt-2">Tus ataques salen de tus armas. Tu habilidad de clase la eliges tú.</p>}
      </div>
      <div className="min-h-0 flex flex-col" style={{ gap: 'var(--gap)' }} data-testid="character-panels">
        <Segmented full options={[{ id: 'atk', label: 'Ataques' }, { id: 'class', label: classTitle }]} value={tab} onChange={setTab} testId="character-seg" />
        <Panel className="flex-1 min-h-0" bodyClassName="overflow-y-auto scroll-thin" testId={tab === 'class' ? 'character-class' : 'character-atk'}>{tab === 'class' ? path : attacks}</Panel>
      </div>
    </div>
  );
}

// ── Centro: habilidad de clase arriba, mano derecha a un lado y mano izquierda al otro ──
function SkillArc({ k, focus, onFocus, compact }: { k: ReturnType<typeof useKit>; focus: string | null; onFocus: (id: string | null) => void; compact: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const min = usePixelScale('heroSm');
  const [dim, setDim] = useState({ w: 600, h: 500 });
  useEffect(() => {
    const el = box.current; if (!el) return;
    const upd = () => { const r = el.getBoundingClientRect(); setDim({ w: r.width, h: r.height }); };
    upd(); const ro = new ResizeObserver(upd); ro.observe(el); return () => ro.disconnect();
  }, []);
  const node = compact ? 44 : 56, big = compact ? 52 : 70, label = compact ? 0 : 22;
  const R = Math.max(64, Math.min((dim.h - big - label - 12) / 1.62, dim.w / 2 - node / 2 - (compact ? 4 : 60)));
  // Si lo que limita es el ancho, se centra en vertical (tableta)
  const usedH = big / 2 + 6 + R * 1.62 + label;
  const cx = dim.w / 2, cy = big / 2 + 6 + R + Math.max(0, (dim.h - usedH) / 2);
  const scale = Math.max(min, Math.floor(R / 21)); // más grande (14/11): la cabeza llega cerca del rombo de clase
  const feet = Math.min(dim.h - 6, cy + R * 0.55);
  // El sprite mira al frente: la mano derecha (espada) queda a la derecha de la pantalla y la izquierda (escudo) a la izquierda.
  const spread = (n: number, a0: number, a1: number) => Array.from({ length: n }, (_, i) => a0 + (a1 - a0) * (n === 1 ? 0.5 : i / (n - 1)));
  const rA = spread(k.right.items.length, 42, -38), lA = spread(k.left.items.length, 138, 218);
  const at = (deg: number) => ({ x: cx + R * Math.cos((deg * Math.PI) / 180), y: cy - R * Math.sin((deg * Math.PI) / 180) });
  const nodes: (Atk & { p: { x: number; y: number }; size: number })[] = [
    { ...k.cs, p: at(90), size: big },
    ...k.right.items.map((a, i) => ({ ...a, p: at(rA[i]), size: node })),
    ...k.left.items.map((a, i) => ({ ...a, p: at(lA[i]), size: node })),
  ];
  const sideLabel = (txt: string, sub: string, x: number, align: 'left' | 'right', color: string) => !compact && (
    <div className="absolute text-[11px] leading-tight" style={{ [align]: x, bottom: 4, textAlign: align, color }}>
      <div className="tracking-[0.15em] uppercase">{txt}</div><div className="text-stone-400 normal-case">{sub}</div>
    </div>
  );
  return (
    <div ref={box} className="absolute inset-0" data-testid="skill-arc">
      <svg className="absolute inset-0 pointer-events-none" width={dim.w} height={dim.h} aria-hidden>
        <path d={`M ${at(42).x} ${at(42).y} A ${R} ${R} 0 0 0 ${at(90).x} ${at(90).y}`} fill="none" stroke={C.class + '55'} strokeWidth="2" strokeDasharray="4 4" />
        <path d={`M ${at(138).x} ${at(138).y} A ${R} ${R} 0 0 1 ${at(90).x} ${at(90).y}`} fill="none" stroke={C.class + '55'} strokeWidth="2" strokeDasharray="4 4" />
        <path d={`M ${at(42).x} ${at(42).y} A ${R} ${R} 0 0 1 ${at(-38).x} ${at(-38).y}`} fill="none" stroke={C.weapon + '88'} strokeWidth="2" />
        {k.left.items.length > 0 && <path d={`M ${at(138).x} ${at(138).y} A ${R} ${R} 0 0 0 ${at(218).x} ${at(218).y}`} fill="none" stroke={C.offhand + '88'} strokeWidth="2" />}
      </svg>
      <div className="absolute flex justify-center" style={{ left: cx, top: feet, transform: 'translate(-50%, -100%)' }}>
        <div className="pedestal" style={{ width: 22 * scale, height: 5 * scale, bottom: -2.5 * scale }} />
        <div className="relative"><PlayerSprite scale={scale} /></div>
      </div>
      {nodes.map((n) => {
        const on = focus === n.id;
        return (
          <button key={n.id} className="absolute grid place-items-center" style={{ left: n.p.x, top: n.p.y, width: Math.max(44, n.size), height: Math.max(44, n.size), transform: 'translate(-50%, -50%)' }}
            onClick={() => onFocus(on ? null : n.id)} onPointerEnter={(e) => e.pointerType === 'mouse' && onFocus(n.id)} aria-label={`${n.name}: ${n.desc}`} aria-pressed={on} data-testid={`arc-${n.src === 'class' ? 'class' : n.id}`}>
            <span style={{ filter: on ? `drop-shadow(0 0 10px ${C[n.src]})` : undefined }}><Diamond fx={n.fx} color={on ? '#f2c75a' : C[n.src]} size={Math.round(n.size * 0.72)} strong={n.src === 'class' || on} /></span>
            {!compact && <span className={`absolute left-1/2 -translate-x-1/2 top-full text-[11px] whitespace-nowrap ${on ? 'text-gold' : n.src === 'class' ? 'text-gold' : 'text-stone-300'}`}>{n.src === 'basic' ? `${n.name} · básico` : n.name}</span>}
          </button>
        );
      })}
      {sideLabel('Mano izquierda', k.left.label, 6, 'left', C.offhand)}
      {sideLabel('Mano derecha', k.right.label, 6, 'right', C.weapon)}
      {!compact && <div className="absolute left-1/2 -translate-x-1/2 text-[11px] tracking-[0.15em] uppercase text-gold" style={{ top: cy - R + big / 2 + 22 }}>Clase</div>}
    </div>
  );
}

// ── Ataques por mano (informativo) ──
function HandHead({ hand, label, itemId, color }: { hand: string; label: string; itemId?: string; color: string }) {
  return (
    <h3 className="flex items-center gap-2 mb-1">
      <span className="w-9 h-9 grid place-items-center bg-[#0d0c11] border border-stone-700 shrink-0">{itemId ? <ItemIcon itemId={itemId} size={28} /> : null}</span>
      <span className="leading-tight"><span className="block text-[11px] tracking-[0.15em] uppercase" style={{ color }}>{hand}</span><span className="text-parchment font-display text-[15px]">{label}</span></span>
    </h3>
  );
}
function AtkRow({ a, res, focus, onFocus, compact }: { a: Atk; res: string; focus: string | null; onFocus: (id: string | null) => void; compact?: boolean }) {
  const on = focus === a.id;
  return (
    <button className={`w-full text-left flex gap-3 items-start p-2 border-2 min-h-[44px] ${on ? 'border-gold bg-[#2a2116]' : 'border-transparent'}`} onClick={() => onFocus(on ? null : a.id)} data-testid={`atk-${a.id}`}>
      <span className="mt-1"><Diamond fx={a.fx} color={C[a.src]} size={24} /></span>
      <span className="min-w-0 flex-1">
        <span className="flex justify-between gap-2 items-baseline"><span className="font-display text-parchment">{a.name}</span>
          <span className="text-[11px] text-stone-400 whitespace-nowrap">{a.src === 'basic' ? 'Básico · sin coste' : costText(a, res)}</span></span>
        {(!compact || on) && <span className="block text-[14px] text-stone-300 leading-snug">{a.desc}</span>}
      </span>
    </button>
  );
}
function StashLink({ onStash }: { onStash?: () => void }) {
  return (
    <div className="border-t border-stone-700 pt-3 mt-1 flex items-center justify-between gap-3 flex-wrap">
      <span className="text-[13px] text-stone-400 italic">Los ataques dependen de tus armas.</span>
      <button className="btn py-1 px-3 text-sm min-h-[44px]" onClick={onStash} data-testid="btn-change-weapons">Cambiar armas en el Alijo</button>
    </div>
  );
}
function Attacks({ k, focus, onFocus, onStash }: { k: ReturnType<typeof useKit>; focus: string | null; onFocus: (id: string | null) => void; onStash?: () => void }) {
  return (
    <div className="font-body space-y-4" data-testid="character-attacks">
      <section><HandHead hand="Mano derecha" label={k.right.label} itemId={k.right.itemId} color={C.weapon} />{k.right.items.map((a) => <AtkRow key={a.id} a={a} res={k.res} focus={focus} onFocus={onFocus} />)}</section>
      <section><HandHead hand="Mano izquierda" label={k.left.label} itemId={k.left.itemId} color={C.offhand} />
        {k.left.two ? <p className="text-[14px] text-stone-400 italic px-2">Ocupada por el arma a dos manos: sus cuatro ataques están arriba.</p> : k.left.items.map((a) => <AtkRow key={a.id} a={a} res={k.res} focus={focus} onFocus={onFocus} />)}
      </section>
      <StashLink onStash={onStash} />
    </div>
  );
}
// ── Habilidad de clase: camino de hitos ──
function ClassPath({ focus, onFocus }: { focus: string | null; onFocus: (id: string | null) => void }) {
  const profile = useGame((s) => s.profile)!;
  const ch = profile.character;
  const cls = CLASSES[ch.classId];
  const res = cls.resourceName.toLowerCase();
  const maxMp = computeStats(ch.classId, ch.level, profile.equipment).maxMp;
  const { unlocked, equipped } = profile.classSkills;
  const pending = pendingUnlocks(profile);
  const earned = 1 + unlocksEarned(ch.level);
  const remaining = cls.classSkills.filter((id) => !unlocked.includes(id));
  const nextIdx = earned; // índice del próximo hito aún no alcanzado
  const nextLv = MILESTONES[nextIdx];
  const prevLv = MILESTONES[nextIdx - 1] ?? 1;
  const frac = nextLv ? Math.min(1, (ch.level - prevLv + ch.xp / xpForNextLevel(ch.level)) / (nextLv - prevLv)) : 1;

  // Tarjeta de una habilidad: equipada (grande), desbloqueada (toca para equiparla), candidata a elegir o bloqueada (gris)
  const card = (id: string, state: 'equipped' | 'owned' | 'choose' | 'locked') => {
    const s = getSkill(id); const on = focus === id; const locked = state === 'locked';
    return (
      <div key={id} className={`flex gap-3 items-start p-2.5 border-2 ${state === 'equipped' ? 'border-gold bg-[#2a2116]' : state === 'choose' ? 'border-[#a56bff] bg-[#1a1424]' : on ? 'border-stone-500' : locked ? 'border-[#1f1d24] bg-[#0b0a0e]' : 'border-stone-700 bg-[#0d0c11]'} ${state === 'owned' ? 'cursor-pointer hover:border-stone-500' : ''}`}
        onClick={() => { if (state === 'owned') actions.equipClassSkill(id); onFocus(id); }} data-testid={`class-skill-${id}`} data-state={state}>
        <span className={`grid place-items-center shrink-0 ${state === 'equipped' ? 'w-11 h-11 my-0.5' : 'w-8 h-8'} ${locked ? 'grayscale opacity-45' : ''}`}><Diamond fx={s.fx ?? 'holy'} color={C.class} size={state === 'equipped' ? 22 : 20} strong={state === 'equipped'} /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={`font-display text-[15px] leading-tight ${locked ? 'text-stone-400' : 'text-parchment'}`}>{s.name}</span>
            {locked ? <Lock size={12} /> : <span className="text-[11px] text-stone-400 whitespace-nowrap">{costText({ cost: skillCost(s.cost, maxMp, cls.resource), cd: s.cooldown ?? 0 }, res)}</span>}
          </span>
          <span className={`block text-[14px] leading-snug mt-0.5 ${locked ? 'text-stone-500' : 'text-stone-300'}`}>{s.description}</span>
          {locked && <span className="block text-[11px] text-stone-500 mt-1">{costText({ cost: skillCost(s.cost, maxMp, cls.resource), cd: s.cooldown ?? 0 }, res)}</span>}
          {state === 'owned' && <span className="block text-[12px] text-stone-400 mt-1">Toca para equiparla</span>}
          {state === 'choose' && <button className="btn btn-gold py-1 px-3 text-xs min-h-[44px] mt-2" onClick={(e) => { e.stopPropagation(); actions.unlockClassSkill(id); }} data-testid={`btn-unlock-class-${id}`}>Elegir esta</button>}
        </span>
      </div>
    );
  };

  // Carril: una columna fija con la línea y los rombos centrados en ella (centro a 14 px del borde)
  const RAIL = 28;
  type St = 'done' | 'choose' | 'next' | 'later';
  const rows = MILESTONES.map((lv, i) => {
    const st: St = i < earned ? (unlocked[i] ? 'done' : 'choose') : i === nextIdx && pending === 0 ? 'next' : 'later';
    return { lv, i, st };
  });
  const COLOR: Record<St, string> = { done: C.class, choose: C.class, next: '#a56bff', later: '#3a3741' };
  const chip = (txt: string, color: string) => <span className="text-[11px] tracking-[0.12em] uppercase whitespace-nowrap" style={{ color }}>{txt}</span>;
  return (
    <div className="font-body" data-testid="class-path">
      <h3 className="text-[11px] tracking-[0.15em] uppercase text-gold mb-1.5">Equipada</h3>
      {card(equipped, 'equipped')}
      <p className="text-[13px] text-stone-400 mt-2">Solo llevas una. Toca otra de las que tengas para cambiarla.</p>

      <div className="flex items-baseline justify-between mt-6 mb-3 border-b border-stone-800 pb-1.5">
        <h3 className="text-[11px] tracking-[0.15em] uppercase text-gold">Camino de hitos</h3>
        <span className="text-[11px] text-stone-400">{unlocked.length} de {cls.classSkills.length} habilidades</span>
      </div>
      <ol className="relative">
        {rows.map(({ lv, i, st }, k) => {
          const last = k === rows.length - 1;
          const id = unlocked[i];
          const below = rows[k + 1];
          // Tramo de línea hasta el hito siguiente: dorado si ese hito ya se alcanzó
          const seg = !last && <span className="absolute w-[2px]" style={{ left: RAIL / 2 - 1, top: 15, bottom: -15, background: below.st === 'done' || below.st === 'choose' ? C.class : '#2e2b35' }} aria-hidden />;
          const marker = (
            <span className="absolute grid place-items-center" style={{ left: 0, top: 1, width: RAIL, height: RAIL }} aria-hidden>
              <span className="absolute rotate-45 border-2" style={{ width: 20, height: 20, borderColor: COLOR[st], background: st === 'done' || st === 'choose' ? '#2a2116' : '#0d0c11', boxShadow: st === 'next' ? '0 0 10px #a56bff88' : undefined }} />
              <span className={`relative font-display text-[10px] leading-none ${st === 'later' ? 'text-stone-500' : 'text-parchment'}`}>{lv}</span>
            </span>
          );
          const head = (txt: ReactNode, right?: ReactNode) => (
            <div className="flex items-center justify-between gap-2 min-h-[30px]">
              <span className="font-display text-[15px] text-parchment">{txt}</span>{right}
            </div>
          );
          let body: ReactNode = null;
          if (st === 'done') {
            body = <>
              {head(<>Nivel {lv}</>, chip(id === equipped ? 'Elegida · equipada' : 'Elegida', C.class))}
              {id === equipped
                ? <div className="flex items-center gap-2 px-2.5 py-2 border border-[#3a2f1c] bg-[#15120d]"><Diamond fx={getSkill(id).fx ?? 'holy'} color={C.class} size={14} /><span className="font-display text-[14px] text-gold">{getSkill(id).name}</span><span className="text-[12px] text-stone-400 ml-auto">arriba</span></div>
                : card(id, 'owned')}
            </>;
          } else if (st === 'choose') {
            body = i > unlocked.length
              ? <>{head(<>Nivel {lv}</>, chip('Por elegir', C.class))}<p className="text-[14px] text-stone-400 italic">Elige primero la del hito anterior; luego te tocará esta.</p></>
              : <>{head(<>Nivel {lv}</>, chip('¡Elige ya!', C.class))}
                  <p className="text-[14px] text-gold mb-2">{remaining.length > 1 ? 'Hito alcanzado. Elige 1; las demás seguirán esperando al próximo hito.' : 'Hito alcanzado. La última habilidad de tu clase te espera.'}</p>
                  <div className="space-y-2">{remaining.map((r) => card(r, 'choose'))}</div></>;
          } else if (st === 'next') {
            body = <>
              {head(<>Nivel {lv}</>, chip(lv - ch.level === 1 ? 'Te falta 1 nivel' : `Te faltan ${lv - ch.level} niveles`, '#c79bff'))}
              <div className="h-1.5 bg-stone-800 mb-2"><div className="h-full bg-arcane" style={{ width: `${frac * 100}%` }} /></div>
              <p className="text-[14px] text-stone-300 mb-2">Elegirás 1 de estas:</p>
              <div className="space-y-2">{remaining.map((r) => card(r, 'locked'))}</div>
            </>;
          } else {
            const left = cls.classSkills.length - i;
            body = head(<span className="text-stone-500">Nivel {lv}</span>, <span className="text-[13px] text-stone-500 text-right">{left > 1 ? `Elegirás 1 de las ${left} que queden` : 'La última que quede'}</span>);
          }
          return (
            <li key={lv} className={`relative ${last ? '' : 'pb-4'}`} style={{ paddingLeft: RAIL + 12 }} data-hito={lv} data-state={st}>
              {seg}{marker}{body}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

