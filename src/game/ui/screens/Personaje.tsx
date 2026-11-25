// Habilidades (25/11, versión 3): todo a la vista. Izquierda «Atributos» (al tocar una habilidad se marca en verde o rojo lo
// que cambia mientras dura); centro el héroe con su círculo de rombos; derecha «Habilidades»: fichas pequeñas por mano, la fila
// de hitos de clase (Nv 1·20·40·60·80) y abajo el detalle de lo elegido con coste y recarga grandes y «Equipar» o «Elegir».
// En el móvil, el héroe y el panel de Habilidades; los atributos, con el botón «Atributos».
// Los atributos, el desglose y la trayectoria están en Intendencia → «Ver detalles» (HeroDetails.tsx).
// No cambia ninguna regla: los ataques salen de las armas y la habilidad de clase se elige en los hitos (core/classSkills.ts).
import { useEffect, useRef, useState } from 'react';
import { actions, useGame } from '../../state/store';
import { CLASSES, STAT_LABELS } from '../../../core/data/classes';
import { STATUSES } from '../../../core/statuses';
import { STAT_KEYS, type Stats } from '../../../core/types';
import { baseStats, computeStats } from '../../../core/stats';
import { combatLoadout } from '../../../core/loadout';
import { getSkill } from '../../../core/data/skills';
import { getItem } from '../../../core/data/items';
import { isTwoHanded } from '../../../core/data/weapons';
import { pendingUnlocks, unlocksEarned } from '../../../core/classSkills';
import { CLASS_UNLOCK_LEVELS, skillCost } from '../../../config/progression';
import { PlayerSprite } from '../common';
import { ActionIcon } from '../combatActions';
import { Panel, Segmented, usePixelScale } from '../kit';
import { useLayout } from '../../../config/ui';
import { PixelIcon } from '../../../shared/community';
import { TAB_ICONS } from '../kit/tabIcons';
import { className } from '../../../core/gender';

// Mismos colores que la barra de combate (combatActions.tsx → SOURCE)
const C = { basic: '#d9d3c1', class: '#e8b33a', weapon: '#a56bff', offhand: '#8fa8c8' } as const;
type Src = keyof typeof C;
interface Atk { id: string; name: string; desc: string; cost: number; cd: number; fx: string; src: Src }
const MILESTONES = [1, ...CLASS_UNLOCK_LEVELS];
const HELM_ICON = ['...XXXXXX...', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XX..XX..XX.', '.XX..XX..XX.', '.XX..XX..XX.', '.XXX.XX.XXX.', '.XXX.XX.XXX.', '.XXX....XXX.', '..XX....XX..', '............'];

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
  // Derecha: «Ataques» (los de las armas) o «Habilidades» (las de clase y sus hitos). Si hay un hito por elegir, abre Habilidades.
  const [tab, setTab] = useState<'atk' | 'class'>(pending ? 'class' : 'atk');
  const isClassFocus = (id: string | null) => !!id && (id.startsWith('hito:') || k.cls.classSkills.includes(id));
  const pickFocus = (id: string | null) => { setFocus(id); if (id) setTab(isClassFocus(id) ? 'class' : 'atk'); };
  const pickTab = (t: 'atk' | 'class') => { setTab(t); if (isClassFocus(focus) !== (t === 'class')) setFocus(t === 'class' ? k.profile.classSkills.equipped ?? null : k.right.items[1]?.id ?? k.right.items[0]?.id ?? null); };
  const pad = { padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))', gap: 'var(--gap)' } as const;
  const skillId = focus && !focus.startsWith('hito:') ? focus : null;
  const statPanel = <SkillStats skillId={skillId} />;
  const hero = (
    <section className="min-h-0 relative hb-hero" data-testid="character-hero">
      <SkillArc k={k} focus={skillId} onFocus={pickFocus} compact={phone} />
    </section>
  );
  const skills = <Panel className="min-h-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col" testId="character-skills"><SkillsPanel k={k} focus={focus} onFocus={pickFocus} earned={earned} tab={tab} onTab={pickTab} /></Panel>;
  if (phone) {
    // Móvil (25/11, v2): un selector vertical de iconos y dos bloques iguales, como el Alijo.
    // Rombo (por defecto): Ataques | Habilidad. Casco: el héroe en su arco | Atributos.
    const sk = (t: 'atk' | 'class', id: string) => <Panel className="min-h-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col" testId={id}><SkillsPanel k={k} focus={focus} onFocus={pickFocus} earned={earned} tab={t} onTab={setTab} fixed /></Panel>;
    const opts = [{ id: 'skills', label: 'Ataques y habilidad', icon: TAB_ICONS.character }, { id: 'hero', label: 'Personaje y atributos', icon: HELM_ICON }] as const;
    const mode = stats ? 'hero' : 'skills';
    return (
      <div className="h-full grid" style={{ ...pad, gridTemplateColumns: 'auto minmax(0,1fr) minmax(0,1fr)' }} data-testid="screen-character">
        <div className="al-vsw" role="tablist" aria-orientation="vertical" data-testid="character-seg">
          {opts.map((o) => (
            <button key={o.id} role="tab" aria-selected={mode === o.id} className={mode === o.id ? 'on' : ''} aria-label={o.label} title={o.label}
              onClick={() => setStats(o.id === 'hero')} data-testid={`character-mode-${o.id}`}>
              <PixelIcon rows={o.icon} size={22} color={mode === o.id ? '#1a1206' : 'currentColor'} />
            </button>
          ))}
        </div>
        {mode === 'skills' ? <>{sk('atk', 'character-skills')}{sk('class', 'character-class')}</> : <>
          <div className="panel ui-panel min-h-0 relative"><div className="absolute inset-0 [&>section]:h-full">{hero}</div></div>
          <Panel className="min-h-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col al-stats-tight" testId="character-stats">{statPanel}</Panel>
        </>}
      </div>
    );
  }
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
// Recarga: reloj de arena (turnos de espera)
const HOURGLASS = ['XXXXXXX', '.X...X.', '.XXXXX.', '..XXX..', '...X...', '..X.X..', '.X.X.X.', '.XXXXX.', 'XXXXXXX'];
function Recharge({ size = 14, color = '#6fa8e8' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 7 9" shapeRendering="crispEdges" aria-hidden>{HOURGLASS.flatMap((r, y) => [...r].map((c, x) => c === 'X' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null))}</svg>;
}
/** Coste en el recurso de la clase: ímpetu (rayo, amarillo) o maná (gota, turquesa); recarga en azul. */
export function CostChips({ cost, cd, res, big, mana, labels }: { cost: number; cd: number; res: string; big?: boolean; mana?: boolean; labels?: boolean }) {
  const sz = big ? 16 : 13;
  const R = mana ? Drop : Bolt;
  return (
    <span className={`hb-chips ${labels ? 'lab' : ''}`} aria-label={`${cost ? `${cost} de ${res}` : 'sin coste'}; ${cd ? `recarga ${cd} turnos` : 'sin recarga'}`}>
      <span className={`hb-chip ${mana ? 'mana' : 'imp'} ${big ? 'big' : ''} ${cost ? '' : 'zero'}`} title={`${mana ? 'Maná' : 'Ímpetu'}: ${cost}`}><span className="hb-chip-n"><R size={sz} />{cost}</span>{labels && <small>{mana ? 'Maná' : 'Ímpetu'}</small>}</span>
      {cd > 0 && <span className={`hb-chip cd ${big ? 'big' : ''} ${cd ? '' : 'zero'}`} title={cd ? `Recarga: ${cd} turnos` : 'Sin recarga'}><span className="hb-chip-n"><Recharge size={sz} />{cd || '—'}</span>{labels && <small>Recarga</small>}</span>}
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
/** Ficha grande de un ataque: icono, nombre, ímpetu o maná y recarga con su nombre, efectos y qué hace. */
function AtkCard({ a, on, onPick, k }: { a: Atk; on: boolean; onPick: () => void; k: ReturnType<typeof useKit> }) {
  const lines = a.id !== 'basic' ? effectLines(a.id, k.res) : [];
  return (
    <button type="button" className="hb-acard" onClick={onPick} aria-pressed={on} data-testid={`atk-${a.id}`}>
      <span className="hb-acard-top"><ActionIcon fx={a.fx} color={C[a.src]} size={28} /><span className="hb-acard-name">{a.name}</span><CostChips cost={a.cost} cd={a.cd} res={k.res} mana={k.mana} labels /></span>
      {lines.length > 0 && <EffectList lines={lines} />}
      <span className="hb-desc block">{a.desc}</span>
    </button>
  );
}
function SkillsPanel({ k, focus, onFocus, earned, tab, onTab, fixed }: { k: ReturnType<typeof useKit>; focus: string | null; onFocus: (id: string) => void; earned: number; tab: 'atk' | 'class'; onTab: (t: 'atk' | 'class') => void; fixed?: boolean }) {
  const cls = k.cls;
  const { unlocked, equipped } = k.profile.classSkills;
  const remaining = cls.classSkills.filter((id) => !unlocked.includes(id));
  const nextLv = MILESTONES[earned];
  const canUnlock = earned > unlocked.length && remaining.length > 0;
  const hand = (item: string, color: string, items: Atk[], two?: boolean) => (
    <section className="hb-psec">
      <h3 className="hb-band" style={{ color }}>{item}</h3>
      {two ? <p className="text-[14px] text-stone-400 italic">Ocupada por el arma a dos manos.</p>
        : <div className="flex flex-col gap-2">{items.map((a) => <AtkCard key={a.id} a={a} on={focus === a.id} onPick={() => onFocus(a.id)} k={k} />)}</div>}
    </section>
  );
  return (
    <div className="flex flex-col flex-1 min-h-0" data-testid="class-path">
      {!fixed && <div className="mb-2 shrink-0"><Segmented full options={[{ id: 'atk', label: 'Ataques' }, { id: 'class', label: 'Habilidad' }]} value={tab} onChange={onTab} testId="skills-tab" /></div>}
      {tab === 'atk' ? (
        <div className="flex-1 min-h-0 overflow-y-auto scroll-thin pr-1">
          {hand(k.right.label, C.weapon, k.right.items)}
          {hand(k.left.label, C.offhand, k.left.items, k.left.two)}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto scroll-thin pr-1" data-testid="class-list">
          {canUnlock ? <p className="hb-note ok" data-testid="class-note">¡Puedes desbloquear una habilidad! Elige cuál.</p>
 : null}
          {cls.classSkills.map((id) => {
            const sk = getSkill(id); const own = unlocked.includes(id); const eq = id === equipped;
            return (
              <div key={id} className={`hb-acard ${eq ? 'on' : ''} ${own || canUnlock ? '' : 'locked'}`} onClick={() => own && onFocus(id)} data-testid={`class-skill-${id}`} data-state={eq ? 'equipped' : own ? 'owned' : canUnlock ? 'choose' : 'locked'}>
                <span className="hb-acard-top"><ActionIcon fx={sk.fx ?? 'holy'} color={eq ? '#f2c75a' : own || canUnlock ? C.class : '#8c8693'} size={26} /><span className="hb-acard-name">{sk.name}</span>{!own && !canUnlock && nextLv && <span className="hb-req" title={`Requiere nivel ${nextLv}`} aria-label={`Requiere nivel ${nextLv}`} data-testid={`class-req-${id}`}><Lock size={12} />Nv {nextLv}</span>}<CostChips cost={skillCost(sk.cost, k.maxMp, cls.resource)} cd={sk.cooldown ?? 0} res={k.res} mana={k.mana} labels /></span>
                {effectLines(id, k.res).length > 0 && <EffectList lines={effectLines(id, k.res)} />}
                <span className="hb-desc block">{sk.description}</span>
                <span className="flex justify-end">
                  {eq ? <span className="text-gold text-[14px]" data-testid="class-equipped">✓ En uso</span>
                    : own ? <button className="btn" style={{ minHeight: 44, minWidth: 110 }} onClick={(e) => { e.stopPropagation(); actions.equipClassSkill(id); }} data-testid={`equip-class-${id}`}>Usar</button>
                    : canUnlock ? <button className="btn btn-gold" style={{ minHeight: 44, minWidth: 130 }} onClick={(e) => { e.stopPropagation(); actions.unlockClassSkill(id); }} data-testid={`btn-unlock-class-${id}`}>Desbloquear</button> : null}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
