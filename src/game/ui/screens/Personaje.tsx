// Habilidades (25/11, versión 3): todo a la vista. Izquierda «Atributos» (al tocar una habilidad se marca en verde o rojo lo
// que cambia mientras dura); centro el héroe con su círculo de rombos; derecha «Habilidades»: fichas pequeñas por mano, la fila
// de hitos de clase (Nv 1·20·40·60·80) y abajo el detalle de lo elegido con coste y recarga grandes y «Equipar» o «Elegir».
// En el móvil, el héroe y el panel de Habilidades; los atributos, con el botón «Atributos».
// Los atributos, el desglose y la trayectoria están en Intendencia → «Ver detalles» (HeroDetails.tsx).
// No cambia ninguna regla: los ataques salen de las armas y la habilidad de clase se elige en los hitos (core/classSkills.ts).
import React, { useEffect, useRef, useState } from 'react';
import { actions, useGame } from '../../state/store';
import { CLASSES, STAT_LABELS } from '../../../core/data/classes';
import { STATUSES } from '../../../core/statuses';
import { STAT_KEYS, type Stats } from '../../../core/types';
import { Modal } from '../common';
import { baseStats, computeStats } from '../../../core/stats';
import { combatLoadout } from '../../../core/loadout';
import { getSkill } from '../../../core/data/skills';
import { getItem } from '../../../core/data/items';
import { isTwoHanded } from '../../../core/data/weapons';
import { pendingUnlocks, unlocksEarned } from '../../../core/classSkills';
import { CLASS_UNLOCK_LEVELS, skillCost } from '../../../config/progression';
import { PlayerSprite } from '../common';
import { ActionIcon } from '../combatActions';
import { Panel, usePixelScale } from '../kit';
import { useLayout } from '../../../config/ui';
import { className } from '../../../core/gender';

// Mismos colores que la barra de combate (combatActions.tsx → SOURCE)
const C = { basic: '#d9d3c1', class: '#e8b33a', weapon: '#a56bff', offhand: '#8fa8c8' } as const;
type Src = keyof typeof C;
interface Atk { id: string; name: string; desc: string; cost: number; cd: number; fx: string; src: Src }
const MILESTONES = [1, ...CLASS_UNLOCK_LEVELS];

export function useKit() {
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

export function Personaje(_: { onStash?: () => void }) {
  const k = useKit();
  const layout = useLayout();
  const phone = layout === 'phone';
  const earned = 1 + unlocksEarned(k.ch.level);
  const pending = pendingUnlocks(k.profile) > 0;
  // Lo elegido: un ataque, una habilidad de clase o un hito («hito:40»). Si hay un hito por elegir, se abre ese.
  const [focus, setFocus] = useState<string | null>(pending ? `hito:${MILESTONES[k.profile.classSkills.unlocked.length]}` : k.right.items[1]?.id ?? k.right.items[0]?.id ?? null);
  const [stats, setStats] = useState(false);
  const pad = { padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))', gap: 'var(--gap)' } as const;
  const skillId = focus && !focus.startsWith('hito:') ? focus : null;
  const statPanel = <SkillStats skillId={skillId} />;
  const hero = (
    <section className="min-h-0 relative hb-hero" data-testid="character-hero">
      <SkillArc k={k} focus={skillId} onFocus={(id) => setFocus(id)} compact={phone} />
      {phone && <button className="btn absolute left-0 top-0 text-[12px]" style={{ minHeight: 44 }} onClick={() => setStats(true)} data-testid="character-stats">Atributos</button>}
    </section>
  );
  const skills = <Panel title="Habilidades" className="min-h-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col" testId="character-skills"><SkillsPanel k={k} focus={focus} onFocus={setFocus} earned={earned} /></Panel>;
  if (phone) return (
    <div className="h-full grid" style={{ ...pad, gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.25fr)' }} data-testid="screen-character">
      {hero}{skills}
      {stats && <Modal onClose={() => setStats(false)} testId="stats-modal"><div className="panel-title mb-2">Atributos</div>{statPanel}<button className="btn mt-3 w-full" style={{ minHeight: 44 }} onClick={() => setStats(false)}>Cerrar</button></Modal>}
    </div>
  );
  return (
    <div className="h-full grid" style={{ ...pad, gridTemplateColumns: layout === 'tablet' ? 'minmax(0,24fr) minmax(0,38fr) minmax(0,38fr)' : 'minmax(0,22fr) minmax(0,44fr) minmax(0,34fr)' }} data-testid="screen-character">
      <Panel title="Atributos" className="min-h-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col" testId="character-stats">{statPanel}</Panel>
      {hero}{skills}
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
export function CostChips({ cost, cd, res, big, mana, labels }: { cost: number; cd: number; res: string; big?: boolean; mana?: boolean; labels?: boolean }) {
  const sz = big ? 16 : 13;
  const R = mana ? Drop : Bolt;
  return (
    <span className={`hb-chips ${labels ? 'lab' : ''}`} aria-label={`${cost ? `${cost} de ${res}` : 'sin coste'}; ${cd ? `recarga ${cd} turnos` : 'sin recarga'}`}>
      <span className={`hb-chip ${mana ? 'mana' : 'imp'} ${big ? 'big' : ''} ${cost ? '' : 'zero'}`} title={`${mana ? 'Maná' : 'Ímpetu'}: ${cost}`}><span className="hb-chip-n"><R size={sz} />{cost}</span>{labels && <small>{mana ? 'Maná' : 'Ímpetu'}</small>}</span>
      <span className={`hb-chip cd ${big ? 'big' : ''} ${cd ? '' : 'zero'}`} title={cd ? `Recarga: ${cd} turnos` : 'Sin recarga'}><span className="hb-chip-n"><Recharge size={sz} />{cd || '—'}</span>{labels && <small>Recarga</small>}</span>
    </span>
  );
}

// ── Centro: habilidad de clase arriba, mano derecha a un lado y mano izquierda al otro ──
export function SkillArc({ k, focus, onFocus, compact, noFoot }: { k: ReturnType<typeof useKit>; focus: string | null; onFocus: (id: string | null) => void; compact: boolean; noFoot?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const min = usePixelScale('heroSm');
  const [dim, setDim] = useState({ w: 600, h: 500 });
  useEffect(() => {
    const el = box.current; if (!el) return;
    const upd = () => { const r = el.getBoundingClientRect(); setDim({ w: r.width, h: r.height }); };
    upd(); const ro = new ResizeObserver(upd); ro.observe(el); return () => ro.disconnect();
  }, []);
  // Arco (25/11, v3): medio círculo arriba y dos líneas rectas que bajan; habilidad de clase arriba, mano derecha por el lado
  // derecho y mano izquierda por el izquierdo. El héroe dentro, de pie, con «Clase · Nivel» debajo.
  const node = compact ? 44 : 54, big = compact ? 52 : 66, label = compact ? 0 : 24, foot = noFoot ? 0 : compact ? 22 : 30;
  const top = big / 2 + 6;
  const yb = dim.h - foot - node / 2 - label - 6;
  const R = Math.max(50, Math.min(dim.w / 2 - node / 2 - (compact ? 6 : 64), (yb - top) * 0.5));
  const cx = dim.w / 2, cy = top + R;
  const L = Math.max(0, yb - cy);
  // Punto a una distancia d por el lado (sgn 1 derecho, -1 izquierdo), empezando a 45° sobre el arco
  const a0 = Math.PI / 4, arcLen = R * a0;
  const along = (d: number, sgn: number) => d <= arcLen
    ? { x: cx + sgn * R * Math.cos(a0 - d / R), y: cy - R * Math.sin(a0 - d / R) }
    : { x: cx + sgn * R, y: cy + (d - arcLen) };
  const side = (n: number, sgn: number) => Array.from({ length: n }, (_, i) => along(n === 1 ? (arcLen + L) / 2 : ((arcLen + L) * i) / (n - 1), sgn));
  // Pies algo por encima de la base del arco (25/11): el personaje no queda pegado abajo
  const feet = yb - (compact ? 6 : Math.round(Math.max(24, L * 0.18)));
  const scale = Math.max(min, Math.min(Math.floor((feet - cy + R * 0.95) / (noFoot ? 29 : 36)), Math.floor((2 * R - node - 16) / 24)));
  const at = (deg: number) => ({ x: cx + R * Math.cos((deg * Math.PI) / 180), y: cy - R * Math.sin((deg * Math.PI) / 180) });
  const rP = side(k.right.items.length, 1), lP = side(k.left.items.length, -1);
  const nodes: (Atk & { p: { x: number; y: number }; size: number })[] = [
    { ...k.cs, p: at(90), size: big },
    ...k.right.items.map((a, i) => ({ ...a, p: rP[i], size: node })),
    ...k.left.items.map((a, i) => ({ ...a, p: lP[i], size: node })),
  ];
  const arch = (sgn: number) => `M ${cx} ${cy - R} A ${R} ${R} 0 0 ${sgn > 0 ? 1 : 0} ${cx + sgn * R} ${cy} L ${cx + sgn * R} ${yb}`;
  return (
    <div ref={box} className="absolute inset-0" data-testid="skill-arc">
      <svg className="absolute inset-0 pointer-events-none" width={dim.w} height={dim.h} aria-hidden>
        <path d={arch(1)} fill="none" stroke={C.weapon + '77'} strokeWidth="2" />
        <path d={arch(-1)} fill="none" stroke={C.offhand + '77'} strokeWidth="2" />
      </svg>
      <div className="absolute flex justify-center" style={{ left: cx, top: feet, transform: 'translate(-50%, -100%)' }}>
        <div className="pedestal" style={{ width: 22 * scale, height: 5 * scale, bottom: -2.5 * scale }} />
        <div className="relative"><PlayerSprite scale={scale} /></div>
      </div>
      {!noFoot && <div className="hb-arc-foot" style={{ bottom: 4 }}>{className(k.ch.classId, k.ch.appearance.sex)} · Nivel {k.ch.level}</div>}
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


// ── Atributos con lo que cambia la habilidad elegida mientras dura (verde mejora, rojo empeora) ──
type Mark = { txt: string; good: boolean };
function skillMarks(id: string | null, cost: number, res: string): Partial<Record<keyof Stats, Mark[]>> {
  const out: Partial<Record<keyof Stats, Mark[]>> = {};
  if (!id || id === 'basic') return out;
  const s = getSkill(id);
  const add = (k: keyof Stats, txt: string, good = true) => { (out[k] ??= []).push({ txt, good }); };
  const hit: keyof Stats = s.kind === 'magical' ? 'mag' : 'atk';
  if (s.target === 'enemy' && s.power) add(hit, `golpe ×${String(s.power).replace('.', ',')}`);
  if (s.armorPierce) add(hit, `ignora ${Math.round(s.armorPierce * 100)} % de defensa`);
  if (s.ignoresEvasion) add(hit, 'no se puede esquivar');
  if (s.lifesteal) add('maxHp', `+${Math.round(s.lifesteal * 100)} % del daño hecho`);
  if (s.healPct) add('maxHp', `+${Math.round(s.healPct * 100)} % de vida`);
  if (s.shieldPct) add('maxHp', `escudo de ${Math.round(s.shieldPct * 100)} % de vida`);
  if (s.selfDamagePct) add('maxHp', `−${Math.round(s.selfDamagePct * 100)} % de vida al usarla`, false);
  if (cost) add('maxMp', `−${cost} de ${res}`, false);
  if (s.manaGain) add('maxMp', `+${s.manaGain} de ${res}`);
  for (const ap of s.applies ?? []) {
    if (!ap.self) continue;
    const st = STATUSES[ap.status]; const t = ` · ${ap.turns} ${ap.turns === 1 ? 'turno' : 'turnos'}`;
    if (st.damageDealtMult) { const p = Math.round((st.damageDealtMult - 1) * 100); add('atk', `${p > 0 ? '+' : '−'}${Math.abs(p)} % de daño${t}`, p > 0); add('mag', `${p > 0 ? '+' : '−'}${Math.abs(p)} % de daño${t}`, p > 0); }
    if (st.damageTakenMult) { const p = Math.round((1 - st.damageTakenMult) * 100); add('def', `${p > 0 ? '−' : '+'}${Math.abs(p)} % de daño recibido${t}`, p > 0); add('res', `${p > 0 ? '−' : '+'}${Math.abs(p)} % de daño recibido${t}`, p > 0); }
    if (ap.status === 'endure') add('maxHp', `no bajas de 1${t}`);
    if (ap.status === 'evade') add('eva', `esquivas el próximo ataque${t}`);
    if (ap.status === 'regen') add('maxHp', `+${Math.round((st.regenPct ?? 0) * 100)} % por turno${t}`);
    if (ap.status === 'ward') add('maxHp', `escudo de maná${t}`);
  }
  return out;
}
/** Líneas de efecto de una habilidad (sin el coste), sin repetir: «Golpe ×1,4», «+30 % de daño · 3 turnos». */
function effectLines(id: string | null, res: string): Mark[] {
  const seen = new Set<string>(); const out: Mark[] = [];
  for (const [key, ms] of Object.entries(skillMarks(id, 0, res))) for (const m of ms ?? []) {
    if (key === 'maxMp' && m.txt.startsWith('−')) continue;
    if (seen.has(m.txt)) continue; seen.add(m.txt); out.push({ ...m, txt: m.txt[0].toUpperCase() + m.txt.slice(1) });
  }
  return out;
}
function EffectList({ lines }: { lines: Mark[] }) {
  return <ul className="hb-eff">{lines.map((m) => <li key={m.txt} className={m.good ? 'good' : 'bad'}>{m.txt}</li>)}</ul>;
}
function SkillStats({ skillId }: { skillId: string | null }) {
  const profile = useGame((s) => s.profile)!;
  const ch = profile.character;
  const cls = CLASSES[ch.classId];
  const st = computeStats(ch.classId, ch.level, profile.equipment);
  const base = baseStats(ch.classId, ch.level);
  const res = cls.resourceName.toLowerCase();
  const cost = skillId && skillId !== 'basic' ? skillCost(getSkill(skillId).cost, st.maxMp, cls.resource) : 0;
  const marks = skillMarks(skillId, cost, res);
  return (
    <div className="font-body flex flex-col h-full" data-testid="skill-stats">
      {STAT_KEYS.map((key) => {
        const m = marks[key] ?? []; const bonus = st[key] - base[key];
        return (
          <div key={key} className={`hb-stat ${m.length ? (m.every((x) => x.good) ? 'up' : 'down') : ''}`} data-stat={key}>
            <span className="flex justify-between gap-2"><span className="text-stone-300">{key === 'maxMp' ? cls.resourceName : STAT_LABELS[key]}</span>
              <span>{st[key]}{bonus !== 0 && <span className={bonus > 0 ? 'text-heal' : 'text-blood'}> ({bonus > 0 ? '+' : ''}{bonus})</span>}</span></span>
            {m.map((x) => <span key={x.txt} className={`hb-stat-m ${x.good ? 'good' : 'bad'}`}>{x.good ? '▲' : '▼'} {x.txt}</span>)}
          </div>
        );
      })}
    </div>
  );
}

// ── Panel de habilidades: fichas pequeñas por mano, hitos de clase y detalle de lo elegido ──
function MiniTile({ a, on, onPick, res, mana }: { a: Atk; on: boolean; onPick: () => void; res: string; mana: boolean }) {
  return (
    <button type="button" className={`hb-mini ${on ? 'on' : ''}`} onClick={onPick} aria-pressed={on} data-testid={`atk-${a.id}`}>
      <ActionIcon fx={a.fx} color={on ? '#f2c75a' : C[a.src]} size={28} />
      <span className="hb-mini-name">{a.name}</span>
      <span className="hb-mini-cost"><span className={mana ? 'text-[#7fe0e0]' : 'text-gold'}>{mana ? <Drop size={15} /> : <Bolt size={15} />}{a.cost}</span><span className="text-[#8ec0f2]"><Recharge size={15} />{a.cd || '—'}</span></span>
      <span className="sr-only">{res}</span>
    </button>
  );
}
function SkillsPanel({ k, focus, onFocus, earned }: { k: ReturnType<typeof useKit>; focus: string | null; onFocus: (id: string) => void; earned: number }) {
  const cls = k.cls;
  const { unlocked, equipped } = k.profile.classSkills;
  const remaining = cls.classSkills.filter((id) => !unlocked.includes(id));
  const nextLv = MILESTONES[earned];
  const hand = (label: string, item: string, color: string, items: Atk[], two?: boolean) => (
    <section className="hb-psec">
      <h3 className="hb-band" style={{ color }} title={label}>{item}</h3>
      {two ? <p className="text-[13px] text-stone-400 italic">Ocupada por el arma a dos manos.</p>
        : <div className="hb-minis" style={{ gridTemplateColumns: `repeat(${Math.max(3, items.length)}, minmax(0,1fr))` }}>{items.map((a) => <MiniTile key={a.id} a={a} on={focus === a.id} onPick={() => onFocus(a.id)} res={k.res} mana={k.mana} />)}</div>}
    </section>
  );
  return (
    <div className="flex flex-col flex-1 min-h-0" data-testid="class-path">
      {hand(k.left.two ? 'Arma a dos manos' : 'Mano derecha', k.right.label, C.weapon, k.right.items)}
      {hand('Mano izquierda', k.left.label, C.offhand, k.left.items, k.left.two)}
      <section className="hb-psec">
        <h3 className="hb-cap flex justify-between"><span>Habilidades de clase</span><span className="text-stone-400">{unlocked.length}/{cls.classSkills.length}</span></h3>
        <div className="hb-hitos">
          {MILESTONES.map((lv, i) => {
            const id = unlocked[i];
            const st = id ? (id === equipped ? 'equipped' : 'owned') : i < earned ? 'choose' : i === earned ? 'next' : 'later';
            const key = id ?? `hito:${lv}`; const on = focus === key;
            return (
              <button key={lv} type="button" className={`hb-hito st-${st} ${on ? 'on' : ''}`} onClick={() => onFocus(key)} aria-pressed={on}
                aria-label={id ? `${getSkill(id).name}, nivel ${lv}` : `Hito del nivel ${lv}`} data-testid={id ? `class-skill-${id}` : `hito-${lv}`} data-state={st} data-hito={lv}>
                <span className="hb-hito-d">{id ? <ActionIcon fx={getSkill(id).fx ?? 'holy'} color={st === 'equipped' ? '#f2c75a' : C.class} size={22} /> : <span className="hb-hito-q">{st === 'choose' ? '!' : '?'}</span>}</span>
                <span className="hb-hito-lv">Nv {lv}</span>
              </button>
            );
          })}
        </div>
        {nextLv && remaining.length > 0 && !(earned > unlocked.length) && <p className="text-[12px] text-stone-400 mt-1">Próximo desbloqueo al nivel {nextLv} · {nextLv - k.ch.level === 1 ? 'falta 1 nivel' : `faltan ${nextLv - k.ch.level} niveles`}</p>}
      </section>
      <Detail k={k} focus={focus} earned={earned} />
    </div>
  );
}
function Detail({ k, focus, earned }: { k: ReturnType<typeof useKit>; focus: string | null; earned: number }) {
  const cls = k.cls;
  const { unlocked, equipped } = k.profile.classSkills;
  const remaining = cls.classSkills.filter((id) => !unlocked.includes(id));
  const [pick, setPick] = useState<string | null>(null);
  const costOf = (id: string) => skillCost(getSkill(id).cost, k.maxMp, cls.resource);
  const chips = (cost: number, cd: number) => <CostChips cost={cost} cd={cd} res={k.res} mana={k.mana} big labels />;
  // Un hito ya elegido muestra su habilidad
  if (focus?.startsWith('hito:')) { const u = unlocked[MILESTONES.indexOf(Number(focus.slice(5)))]; if (u) focus = u; }
  let body: React.ReactNode = <p className="text-[13px] text-stone-400 text-center m-auto">Toca un ataque, una habilidad o un hito para ver sus efectos.</p>;
  const atk = [...k.right.items, ...k.left.items].find((a) => a.id === focus);
  if (atk) body = <>
    <div className="hb-det-top"><span className="hb-det-name">{atk.name}</span>{chips(atk.cost, atk.cd)}</div>
    {atk.id !== 'basic' && effectLines(atk.id, k.res).length ? <EffectList lines={effectLines(atk.id, k.res)} /> : null}
    <p className="hb-desc">{atk.desc}</p>
  </>;
  else if (focus && unlocked.includes(focus)) {
    const s = getSkill(focus);
    body = <>
      <div className="hb-det-top"><span className="hb-det-name">{s.name}</span>{chips(costOf(focus), s.cooldown ?? 0)}</div>
      {effectLines(focus, k.res).length > 0 && <EffectList lines={effectLines(focus, k.res)} />}
      <p className="hb-desc">{s.description}</p>
      <div className="hb-foot"><span>Desbloqueada al nivel {MILESTONES[unlocked.indexOf(focus)]}</span>
        {focus === equipped ? <span className="text-gold" data-testid="class-equipped">✓ Equipada</span>
          : <button className="btn btn-gold" style={{ minHeight: 44, minWidth: 110 }} onClick={() => actions.equipClassSkill(focus)} data-testid={`equip-class-${focus}`}>Equipar</button>}</div>
    </>;
  } else if (focus?.startsWith('hito:')) {
    const lv = Number(focus.slice(5)); const i = MILESTONES.indexOf(lv);
    const choose = i < earned && i === unlocked.length;
    const opts = remaining.map((id) => { const s = getSkill(id); const sel = pick === id; return (
      <button key={id} type="button" className={`hb-opt ${choose ? 'choose' : 'locked'} ${sel ? 'on' : ''}`} disabled={!choose} onClick={() => setPick(id)} aria-pressed={sel} data-testid={`class-skill-${id}`} data-state={choose ? 'choose' : 'locked'}>
        <span className="flex items-center gap-2 min-w-0">{!choose && <Lock size={12} />}<ActionIcon fx={s.fx ?? 'holy'} color={choose ? C.class : '#8c8693'} size={20} /><span className="hb-name truncate">{s.name}</span><span className="ml-auto"><CostChips cost={costOf(id)} cd={s.cooldown ?? 0} res={k.res} mana={k.mana} /></span></span>
        <span className="hb-desc block mt-1">{s.description}</span>
      </button>); });
    body = <>
      <div className="hb-det-top"><span className="hb-det-name">{choose ? `¡Elige! · Nivel ${lv}` : `Nivel ${lv}`}</span>
        <span className="text-[12px] text-stone-400">{choose ? 'Elige 1 · las demás no se pierden' : i < earned ? 'Elige antes la del hito anterior' : lv - k.ch.level === 1 ? 'Falta 1 nivel' : `Faltan ${lv - k.ch.level} niveles`}</span></div>
      <div className="flex flex-col gap-1.5" data-testid={choose ? 'class-choose' : 'class-next'}>{opts}</div>
      {choose && <button className="btn btn-gold w-full mt-2 disabled:opacity-60" style={{ minHeight: 44 }} disabled={!pick || !remaining.includes(pick)}
        onClick={() => { if (pick) { actions.unlockClassSkill(pick); setPick(null); } }} data-testid={pick ? `btn-unlock-class-${pick}` : 'btn-unlock-class'}>
        {pick && remaining.includes(pick) ? `Elegir ${getSkill(pick).name}` : 'Toca una habilidad'}</button>}
    </>;
  }
  return <div className={`hb-det ${focus?.startsWith('hito:') ? 'hito' : ''}`} data-testid="skill-detail">{body}</div>;
}
