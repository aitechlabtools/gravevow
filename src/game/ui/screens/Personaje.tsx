// Habilidades (rehecha el 25/11): tres columnas 30/40/30 en escritorio y tableta. Izquierda «Ataques» (tarjetas por mano con
// ímpetu en amarillo y recarga en azul), centro el héroe con su círculo de rombos y derecha «Habilidades de clase» (equipada,
// desbloqueadas con «Equipar» y progresión en línea horizontal 1·20·40·60·80 con las opciones del próximo hito plegadas).
// En el móvil, el mismo diseño: el héroe y un panel con selector Ataques · Clase.
// Los atributos, el desglose y la trayectoria están en Intendencia → «Ver detalles» (HeroDetails.tsx).
// No cambia ninguna regla: los ataques salen de las armas y la habilidad de clase se elige en los hitos (core/classSkills.ts).
import { useEffect, useRef, useState } from 'react';
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
import { usePixelScale } from '../kit';
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
  const mana = cls.resource === 'mana';
  return { profile, ch, cls, res, right, left, cs, maxMp, mana };
}


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
  const [focus, setFocus] = useState<string | null>(null);
  // Móvil: un solo panel al lado del personaje, con selector Ataques · Clase. Se abre en Clase si hay un hito por elegir.
  const pending = pendingUnlocks(k.profile) > 0;
  const [tab, setTab] = useState<'atk' | 'class'>(pending ? 'class' : 'atk');
  const pick = (id: string | null) => { setFocus(id); if (id) setTab(id === k.cs.id ? 'class' : 'atk'); };
  const pad = { padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))', gap: 'var(--gap)' } as const;
  const arc = <SkillArc k={k} focus={focus} onFocus={pick} compact={phone} />;
  const attacks = <Attacks k={k} focus={focus} onFocus={pick} onStash={onStash} />;
  const path = <ClassPath focus={focus} onFocus={pick} />;

  // Mismo esquema en los tres formatos: el héroe con su círculo a la izquierda y un panel con dos pestañas en la cabecera
  const tabs = (
    <div className="hb-tabs" role="tablist" data-testid="character-seg">
      {([{ id: 'atk', label: 'Ataques' }, { id: 'class', label: 'Habilidades de clase' }] as const).map((o) => (
        <button key={o.id} role="tab" aria-selected={tab === o.id} className={tab === o.id ? 'on' : ''} onClick={() => setTab(o.id)} data-testid={`seg-${o.id}`}>
          <span className="hb-tab-d" aria-hidden>◆</span>{o.label}{o.id === 'class' && pending && <span className="text-gold ml-1">●</span>}
        </button>
      ))}
    </div>
  );
  return (
    <div className="h-full grid" style={{ ...pad, gridTemplateColumns: phone ? 'minmax(0,1fr) minmax(0,1.15fr)' : 'minmax(0,60fr) minmax(0,40fr)' }} data-testid="screen-character">
      <div className="min-h-0 relative">{arc}</div>
      <div className="min-h-0 flex flex-col" data-testid="character-panels">
        <section className="panel ui-panel flex-1 min-h-0" data-testid={tab === 'class' ? 'character-class' : 'character-atk'}>
          {tabs}
          <div className="ui-pbody overflow-y-auto scroll-thin">{tab === 'class' ? path : attacks}</div>
        </section>
      </div>
    </div>
  );
}

// ── Indicadores de ímpetu (amarillo) y recarga (azul): los mismos en Ataques y en Habilidades de clase ──
function Bolt({ size = 14, color = '#e8b33a' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 7 9" shapeRendering="crispEdges" aria-hidden><path d="M3 0h3v1H5v2h2v1H6v1H5v1H4v1H3v1H2V6h1V5H0V4h1V3h1V1h1z" fill={color} /></svg>;
}
function Drop({ size = 14, color = '#5fd1d1' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 7 9" shapeRendering="crispEdges" aria-hidden><path d="M3 0h1v1h1v2h1v1h1v4H6v1H1V8H0V4h1V3h1V1h1z" fill={color} /><path d="M2 5h1v2H2z" fill="#d8f6f6" /></svg>;
}
function Recharge({ size = 14, color = '#6fa8e8' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden><path d="M2 0h4v1h1v1H6V1H2v1H1v5h1v1h4V7h1v1H6v1H2V8H1V7H0V2h1V1h1zM5 2h4v4H8V4H7V3H5zM7 5h1v2H7z" fill={color} /></svg>;
}
/** Coste en el recurso de la clase: ímpetu (rayo, amarillo) o maná (gota, turquesa); recarga en azul. */
export function CostChips({ cost, cd, res, big, mana }: { cost: number; cd: number; res: string; big?: boolean; mana?: boolean }) {
  const sz = big ? 16 : 13;
  const R = mana ? Drop : Bolt;
  return (
    <span className="hb-chips" aria-label={`${cost ? `${cost} de ${res}` : 'sin coste'}; ${cd ? `recarga ${cd} turnos` : 'sin recarga'}`}>
      <span className={`hb-chip ${mana ? 'mana' : 'imp'} ${big ? 'big' : ''} ${cost ? '' : 'zero'}`} title={`${mana ? 'Maná' : 'Ímpetu'}: ${cost}`}><R size={sz} />{cost}</span>
      <span className={`hb-chip cd ${big ? 'big' : ''} ${cd ? '' : 'zero'}`} title={cd ? `Recarga: ${cd} turnos` : 'Sin recarga'}><Recharge size={sz} />{cd || '—'}</span>
    </span>
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
  // Círculo compacto (25/11): rombos algo más pequeños y nombres sobre una placa oscura para que se lean
  const node = compact ? 44 : 54, big = compact ? 52 : 66, label = compact ? 0 : 24;
  const R = Math.max(64, Math.min((dim.h - big - label - 12) / 1.62, dim.w / 2 - node / 2 - (compact ? 4 : 56)));
  const usedH = big / 2 + 6 + R * 1.62 + label;
  const cx = dim.w / 2, cy = big / 2 + 6 + R + Math.max(0, (dim.h - usedH) / 2);
  const scale = Math.max(min, Math.floor((R / 21) * 0.8)); // algo más pequeño que antes para dejar sitio a los nombres
  const feet = Math.min(dim.h - 6, cy + R * 0.5);
  const spread = (n: number, a0: number, a1: number) => Array.from({ length: n }, (_, i) => a0 + (a1 - a0) * (n === 1 ? 0.5 : i / (n - 1)));
  const rA = spread(k.right.items.length, 42, -38), lA = spread(k.left.items.length, 138, 218);
  const at = (deg: number) => ({ x: cx + R * Math.cos((deg * Math.PI) / 180), y: cy - R * Math.sin((deg * Math.PI) / 180) });
  const nodes: (Atk & { p: { x: number; y: number }; size: number })[] = [
    { ...k.cs, p: at(90), size: big },
    ...k.right.items.map((a, i) => ({ ...a, p: at(rA[i]), size: node })),
    ...k.left.items.map((a, i) => ({ ...a, p: at(lA[i]), size: node })),
  ];
  return (
    <div ref={box} className="absolute inset-0" data-testid="skill-arc">
      <svg className="absolute inset-0 pointer-events-none" width={dim.w} height={dim.h} aria-hidden>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#3a374155" strokeWidth="1" />
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
            {!compact && <span className={`hb-arc-label ${on || n.src === 'class' ? 'on' : ''}`}>{n.name}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Ataques por mano: tarjetas compactas ──
function HandHead({ hand, label, itemId, color }: { hand: string; label: string; itemId?: string; color: string }) {
  return (
    <h3 className="hb-hand">
      <span className="hb-hand-ico">{itemId ? <ItemIcon itemId={itemId} size={28} /> : null}</span>
      <span className="leading-tight min-w-0"><span className="block text-[12px] tracking-[0.15em] uppercase" style={{ color }}>{hand}</span><span className="block text-parchment font-display text-[16px] truncate">{label}</span></span>
    </h3>
  );
}
function AtkCard({ a, res, focus, onFocus, mana }: { a: Atk; res: string; focus: string | null; onFocus: (id: string | null) => void; mana: boolean }) {
  const on = focus === a.id;
  return (
    <button className={`hb-card ${on ? 'on' : ''}`} onClick={() => onFocus(on ? null : a.id)} data-testid={`atk-${a.id}`}>
      <span className="hb-card-top"><span className="hb-name">{a.name}</span><CostChips cost={a.cost} cd={a.cd} res={res} big mana={mana} /></span>
      <span className="hb-desc">{a.desc}</span>
    </button>
  );
}
function Attacks({ k, focus, onFocus }: { k: ReturnType<typeof useKit>; focus: string | null; onFocus: (id: string | null) => void; onStash?: () => void }) {
  return (
    <div className="font-body" data-testid="character-attacks">
      <section className="hb-sec"><HandHead hand="Mano derecha" label={k.right.label} itemId={k.right.itemId} color={C.weapon} />
        <div className="hb-list">{k.right.items.map((a) => <AtkCard key={a.id} a={a} res={k.res} focus={focus} onFocus={onFocus} mana={k.mana} />)}</div></section>
      <section className="hb-sec"><HandHead hand="Mano izquierda" label={k.left.label} itemId={k.left.itemId} color={C.offhand} />
        {k.left.two ? <p className="text-[14px] text-stone-400 italic px-2">Ocupada por el arma a dos manos: sus cuatro ataques están arriba.</p>
          : <div className="hb-list">{k.left.items.map((a) => <AtkCard key={a.id} a={a} res={k.res} focus={focus} onFocus={onFocus} mana={k.mana} />)}</div>}
      </section>
      <div className="hb-legend"><span>{k.mana ? <Drop size={13} /> : <Bolt size={13} />} {k.mana ? 'Maná' : 'Ímpetu'}</span><span><Recharge size={13} /> Recarga en turnos</span></div>
    </div>
  );
}

// ── Habilidades de clase: equipada · desbloqueadas · progresión ──
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
  const nextIdx = earned;
  const nextLv = MILESTONES[nextIdx];
  const prevLv = MILESTONES[nextIdx - 1] ?? 1;
  const frac = nextLv ? Math.min(1, (ch.level - prevLv + ch.xp / xpForNextLevel(ch.level)) / (nextLv - prevLv)) : 1;
  const [pick, setPick] = useState<string | null>(null);
  const chips = (id: string) => { const s = getSkill(id); return <CostChips cost={skillCost(s.cost, maxMp, cls.resource)} cd={s.cooldown ?? 0} res={res} mana={cls.resource === 'mana'} />; };
  const lvOf = (id: string) => MILESTONES[unlocked.indexOf(id)] ?? 1;

  const eq = getSkill(equipped);
  const others = unlocked.filter((id) => id !== equipped);
  // Hito donde se eligió (o se elegirá) cada habilidad: hecho, por elegir, el siguiente o más adelante
  const stOf = (i: number) => i < earned ? (unlocked[i] ? 'done' : 'choose') : i === nextIdx ? 'next' : 'later';
  const chooseNow = pending > 0 && remaining.length > 0;
  return (
    <div className="font-body" data-testid="class-path">
      <section className="hb-sec">
        <h3 className="hb-cap">Habilidad equipada</h3>
        <div className={`hb-card hb-eq ${focus === equipped ? 'on' : ''}`} onClick={() => onFocus(equipped)} data-testid={`class-skill-${equipped}`} data-state="equipped">
          <span className="hb-card-top"><span className="hb-name flex items-center gap-2"><Diamond fx={eq.fx ?? 'holy'} color={C.class} size={20} strong />{eq.name}</span>{chips(equipped)}</span>
          <span className="hb-desc">{eq.description}</span>
          <span className="hb-foot"><span>Desbloqueada al nivel {lvOf(equipped)}</span><span className="text-gold">✓ Equipada</span></span>
        </div>
      </section>

      <section className="hb-sec">
        <h3 className="hb-cap">Habilidades desbloqueadas · {unlocked.length}/{cls.classSkills.length}</h3>
        {others.length ? <div className="hb-list">{others.map((id) => { const s = getSkill(id); return (
          <div key={id} className={`hb-card ${focus === id ? 'on' : ''}`} onClick={() => onFocus(id)} data-testid={`class-skill-${id}`} data-state="owned">
            <span className="hb-card-top"><span className="hb-name">{s.name}</span>{chips(id)}</span>
            <span className="hb-desc">{s.description}</span>
            <span className="hb-foot"><span>Desbloqueada al nivel {lvOf(id)}</span>
              <button className="btn text-[13px]" style={{ minHeight: 44, minWidth: 88 }} onClick={(e) => { e.stopPropagation(); actions.equipClassSkill(id); }} data-testid={`equip-class-${id}`}>Equipar</button></span>
          </div>); })}</div>
          : <p className="text-[13px] text-stone-400 italic">Aún no tienes otras. Elegirás una nueva en cada hito.</p>}
      </section>

      <section className="hb-sec">
        <h3 className="hb-cap">Progresión de clase</h3>
        <div className="hb-track" aria-label="Hitos de clase">
          <span className="hb-track-line" /><span className="hb-track-fill" style={{ width: `${(Math.min(earned - 1 + (nextLv ? frac : 0), MILESTONES.length - 1) / (MILESTONES.length - 1)) * 100}%` }} />
          {MILESTONES.map((lv, i) => <span key={lv} className={`hb-node ${stOf(i)}`} style={{ left: `${(i / (MILESTONES.length - 1)) * 100}%` }} data-hito={lv} data-state={stOf(i)}><span>{lv}</span></span>)}
        </div>
        {chooseNow ? (
          <div className="hb-next choose" data-testid="class-choose">
            <div className="flex flex-wrap justify-between items-baseline gap-x-3"><span className="hb-next-t">¡Elige ya! · Nivel {MILESTONES[unlocked.length]}</span><span className="text-[12px] text-stone-400">Elige 1 · las demás no se pierden</span></div>
            <div className="hb-list mt-2">{remaining.map((id) => { const s = getSkill(id); const sel = pick === id; return (
              <button key={id} type="button" className={`hb-card choose ${sel ? 'on' : ''}`} aria-pressed={sel} onClick={() => setPick(id)} data-testid={`class-skill-${id}`} data-state="choose">
                <span className="hb-card-top"><span className="hb-name">{s.name}</span>{chips(id)}</span><span className="hb-desc">{s.description}</span>
              </button>); })}</div>
            <button className="btn btn-gold w-full mt-2 disabled:opacity-60" style={{ minHeight: 44 }} disabled={!pick || !remaining.includes(pick)}
              onClick={() => { if (pick) { actions.unlockClassSkill(pick); setPick(null); } }} data-testid={pick ? `btn-unlock-class-${pick}` : 'btn-unlock-class'}>
              {pick && remaining.includes(pick) ? `Elegir ${getSkill(pick).name}` : 'Toca una habilidad'}</button>
          </div>
        ) : nextLv && remaining.length ? (
          <div className="hb-next" data-testid="class-next">
            <div className="flex flex-wrap justify-between items-baseline gap-x-3"><span className="hb-next-t">Próximo hito · Nivel {nextLv}</span><span className="text-[13px] text-arcane">{nextLv - ch.level === 1 ? 'Te falta 1 nivel' : `Te faltan ${nextLv - ch.level} niveles`}</span></div>
            <div className="hb-bar"><span style={{ width: `${frac * 100}%` }} /></div>
            <p className="text-[13px] text-stone-300 my-1.5">Elegirás 1 de estas:</p>
            <div className="hb-list">{remaining.map((id) => { const s = getSkill(id); return (
              <details key={id} className="hb-lock" data-testid={`class-skill-${id}`} data-state="locked">
                <summary><Lock size={12} /><span className="hb-name flex-1 min-w-0 truncate">{s.name}</span>{chips(id)}<span className="hb-caret" aria-hidden>▾</span></summary>
                <p className="hb-desc">{s.description}</p>
              </details>); })}</div>
          </div>
        ) : <p className="text-[13px] text-gold mt-2">Has desbloqueado todas las habilidades de tu clase.</p>}
      </section>
    </div>
  );
}
