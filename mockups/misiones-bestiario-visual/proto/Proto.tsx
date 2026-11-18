// Maqueta de Misiones (tablón de encargos) y Bestiario (galería de trofeos). Solo presentación, con datos de ejemplo
// y las piezas reales del juego (sprites, iconos, colores, fuentes y estilos del Bastión). No toca src/.
// Vistas por URL: ?v=misiones | misiones&sel=panel|nota | disponibles | bestiario[&pips=1] | ficha&id=… | ficha-full
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { VENDORS, type VendorId } from '../../../src/core/data/vendors';
import { QUESTS, MAX_ACTIVE_QUESTS, type QuestDef } from '../../../src/core/data/quests';
import { ENEMIES, getEnemy } from '../../../src/core/data/enemies';
import { getItem, RARITY_INFO } from '../../../src/core/data/items';
import { getSkill } from '../../../src/core/data/skills';
import { ZONES, type ZoneId } from '../../../src/core/data/zones';
import { BESTIARY_LORE } from '../../../src/core/data/bestiaryLore';
import { bestiaryByZone, knowledge, type BestiaryRecord, type Knowledge } from '../../../src/core/bestiary';
import { enemyAttackLine } from '../../../src/core/armor';
import { BESTIARY_BASIC_KILLS, BESTIARY_FULL_KILLS } from '../../../src/config/bestiary';
import { cachedUrl, drawChest, drawPortal, drawVein, iconUrl, monsterUrl, TILESETS, drawFloorTs } from '../../../src/shared/art';
import { useIsTouch } from '../../../src/shared/device';
import { floorShadow as shadow, bookIcon, crownIcon, lockIcon, loopIcon, nailIcon, pinIcon, planks, repIcon, skullIcon, TIER, xpIcon } from './pixel';

const Q = new URLSearchParams(location.search);
const VIEW = Q.get('v') ?? 'misiones';

/* ───────────────────────── Datos de ejemplo ───────────────────────── */
interface Active { id: string; have: number; pinned?: boolean }
const ACTIVE: Active[] = [
  { id: 'q_garra_rats', have: 6 },            // lista para cobrar (repetible)
  { id: 'q_lord', have: 0, pinned: true },     // fijada, jefe
  { id: 'q_brand_mine', have: 3 },             // normal, repetible
  { id: 'q_orvel_coins', have: 4 },            // entrega, repetible
];
const STATIC_BOARD: Partial<Record<VendorId, string[]>> = {
  garth: ['q_garra_bandits', 'q_garra_captain'], vesper: ['q_bones'], nira: ['q_first_escape', 'q_treasure', 'q_orvel_iron'], brand: ['q_brand_bone', 'q_brand_wings'],
};
const qd = (id: string) => QUESTS.find((q) => q.id === id)!;

/* ───────────────────────── Piezas comunes ───────────────────────── */
function TopBar({ tab }: { tab: 'MISIONES' | 'BESTIARIO' }) {
  const tabs = ['Jugar', 'Habilidades', 'Alijo', 'Bastión', 'Misiones', 'Bestiario', 'Tienda'];
  return (
    <div className="flex items-center gap-3 shrink-0" style={{ height: 'var(--nav-h)', padding: '0 var(--pad)' }}>
      <div className="hidden lg:flex items-center gap-2 w-52 shrink-0">
        <img src={monsterUrl('vendor_valerius', 2)} className="pixelated" style={{ width: 40, height: 34, objectFit: 'cover', objectPosition: 'top' }} alt="" />
        <div className="leading-tight"><div className="font-display text-parchment text-[15px]">Beothord ▾</div><div className="text-[12px] text-stone-400">Guerrero · Nv 22</div></div>
      </div>
      <div className="flex-1 flex justify-center gap-1.5 min-w-0 overflow-hidden">
        {tabs.map((t) => <span key={t} className={`pill ${t.toUpperCase() === tab ? 'on' : ''}`}>{t}</span>)}
      </div>
      <div className="hidden md:flex items-center gap-2 shrink-0"><img src={iconUrl('coin', 2)} className="pixelated" alt="" /><span className="text-gold font-display">56</span>
        <span className="btn" style={{ minWidth: 44, minHeight: 44, display: 'grid', placeItems: 'center' }}>?</span></div>
    </div>
  );
}

/** Medio pecho del mercader (mismo recorte que el Bastión), a escala entera fija. */
function MiniBust({ sprite, scale = 2 }: { sprite: string; scale?: number }) {
  return <span className="block overflow-hidden shrink-0" style={{ width: 20 * scale, height: 15 * scale }}><img src={monsterUrl(sprite, scale)} className="pixelated" alt="" style={{ width: 20 * scale, height: 26 * scale }} /></span>;
}
const Px = ({ src, title }: { src: string; title?: string }) => <img src={src} className="pixelated inline-block shrink-0" alt={title ?? ''} title={title} draggable={false} />;

/** Escala entera que cabe en una caja (como el Bastión). */
function useFit(w: number, h: number, pad = 8, max = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(3);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const fit = () => { const r = el.getBoundingClientRect(); setS(Math.max(1, Math.min(max, Math.floor(Math.min((r.width - pad) / w, (r.height - pad) / h))))); };
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, [w, h, pad, max]);
  return [ref, s] as const;
}

/* ───────────────────────── MISIONES ───────────────────────── */
function objective(q: QuestDef): { src: (s: number) => string; w: number; h: number; boss?: boolean; label: string } {
  if ((q.type === 'kill' || q.type === 'kill_boss') && q.target && ENEMIES[q.target]) {
    const e = ENEMIES[q.target];
    return { src: (s) => monsterUrl(e.sprite, s), w: 24, h: 26, boss: q.type === 'kill_boss' || !!e.boss, label: e.name };
  }
  if (q.type === 'deliver' && q.target) { const it = getItem(q.target); return { src: (s) => iconUrl(it.icon, s), w: 12, h: 12, label: it.name }; }
  if (q.type === 'mine') return { src: (s) => cachedUrl('vein:iron', () => drawVein('#8a8178', '#e9e1cc', false), s), w: 16, h: 16, label: 'Veta de mineral' };
  if (q.type === 'open_chest') return { src: (s) => cachedUrl('chest:rich', () => drawChest('rich', false), s), w: 16, h: 16, label: 'Cofre de hierro' };
  return { src: (s) => cachedUrl('portal:0', () => drawPortal(0), s), w: 24, h: 24, label: 'Portal' };
}

function Rewards({ q, big = false }: { q: QuestDef; big?: boolean }) {
  const v = VENDORS[q.vendor];
  const s = big ? 3 : 2;
  const cls = big ? 'text-[20px]' : 'text-[17px]';
  return (
    <div className={`flex items-center justify-center gap-x-4 gap-y-1 flex-wrap font-display ${cls}`} data-testid="quest-rewards">
      <span className="inline-flex items-center gap-1.5 text-gold"><Px src={iconUrl('coin', s)} title="Oro" />+{q.reward.gold}{big && <span className="font-body text-[15px] text-stone-300">oro</span>}</span>
      <span className="inline-flex items-center gap-1.5 text-arcane"><Px src={xpIcon(s)} title="Experiencia" />+{q.reward.xp}{big && <span className="font-body text-[15px] text-stone-300">XP</span>}</span>
      <span className="inline-flex items-center gap-1.5" style={{ color: v.color }}><Px src={repIcon(v.color, s)} title={`Reputación con ${v.name}`} />+{q.reward.rep}{big && <span className="font-body text-[15px] text-stone-300">reputación</span>}</span>
    </div>
  );
}

function ObjectiveArt({ q, seal }: { q: QuestDef; seal?: string }) {
  const o = objective(q);
  const [ref, s] = useFit(o.w, o.h, 14, 6);
  return (
    <div ref={ref} className={`qn-art ${seal ? 'has-seal' : ''}`}>
      <img src={o.src(s)} className="pixelated" alt={o.label} title={o.label} draggable={false} />
      {o.boss && <span className="absolute top-1.5 left-2"><Px src={crownIcon(3)} title="Jefe" /></span>}
      {seal && <span className="qn-seal" aria-hidden>● {seal}</span>}
    </div>
  );
}

function QuestNote({ a, onOpen, selected, mode = 'active' }: { a: Active; onOpen?: () => void; selected?: boolean; mode?: 'active' | 'board' }) {
  const q = qd(a.id); const v = VENDORS[q.vendor];
  const done = a.have >= q.count;
  const full = ACTIVE.length >= MAX_ACTIVE_QUESTS;
  return (
    <div className={`qnote ${done && mode === 'active' ? 'ready' : ''} ${a.pinned ? 'pinned' : ''} ${selected ? 'sel' : ''}`} data-testid={`quest-${q.id}`}>
      <span className="qn-hold">{a.pinned ? <Px src={pinIcon(2)} title="Fijada" /> : <Px src={nailIcon(2)} />}</span>
      <button type="button" className="qn-body" onClick={onOpen} aria-label={`${q.name}: ver detalle`}>
        <span className="qn-head">
          <MiniBust sprite={v.sprite} scale={2} />
          <span className="qn-vname truncate text-[14px] font-display tracking-[0.06em]" style={{ color: v.color }}>{v.name}</span>
          {q.repeatable && <span className="ml-auto"><Px src={loopIcon(2)} title="Repetible" /></span>}
        </span>
        <ObjectiveArt q={q} seal={done && mode === 'active' ? (q.type === 'deliver' ? 'Lista' : 'Cumplida') : undefined} />
        <span className="qn-title">{q.name}</span>
        {mode === 'active' ? (
          <span className="qn-prog">
            <span className="qn-num">{Math.min(a.have, q.count)}<span className="of">/{q.count}</span></span>
            <span className="bar thin"><div style={{ width: `${Math.min(100, (a.have / q.count) * 100)}%`, background: done ? '#5fd19a' : '#e8b33a' }} /></span>
          </span>
        ) : <span className="qn-desc">{q.description}</span>}
        <Rewards q={q} />
      </button>
      {mode === 'active' && done && (
        <>
          <button className="btn btn-gold qn-cta" data-testid={`claim-${q.id}`}>{q.type === 'deliver' ? 'Entregar' : 'Cobrar'}</button>
        </>
      )}
      {mode === 'board' && <button className="btn btn-gold qn-cta" disabled={full} data-testid={`accept-${q.id}`}>{full ? 'Tablón lleno' : 'Aceptar'}</button>}
    </div>
  );
}

function EmptySlot() {
  return (
    <button type="button" className="qnote empty" data-testid="quest-empty">
      <span className="qn-hold"><Px src={nailIcon(3)} /></span>
      <span className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-3">
        <MiniBust sprite="vendor_garth" scale={3} />
        <span className="font-display text-[15px] text-stone-300 tracking-[0.06em]">Hueco libre</span>
        <span className="qe-hint font-body text-[15px] text-stone-400 leading-snug">Habla con un mercader del Bastión</span>
        <span className="btn text-[13px] font-display tracking-[0.1em] uppercase" style={{ minHeight: 44, display: 'inline-grid', placeItems: 'center', padding: '0 14px' }}>Ir al Bastión ▸</span>
      </span>
    </button>
  );
}

function QuestDetail({ a, onClose, variant }: { a: Active; onClose: () => void; variant: 'panel' | 'nota' }) {
  const q = qd(a.id); const v = VENDORS[q.vendor]; const done = a.have >= q.count;
  const o = objective(q);
  return (
    <div className={variant === 'panel' ? 'qdetail panel-side' : 'qdetail note-big'} data-testid="quest-detail">
      <div className="qd-head">
        <MiniBust sprite={v.sprite} scale={3} />
        <div className="min-w-0"><div className="font-display text-[16px] tracking-[0.06em]" style={{ color: v.color }}>{v.name}</div><div className="text-[13px] text-stone-400">{v.role}</div></div>
        <button className="btn ml-auto" style={{ minWidth: 44, minHeight: 44 }} onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
      <div className="qd-paper">
        <span className="qn-hold">{a.pinned ? <Px src={pinIcon(3)} /> : <Px src={nailIcon(3)} />}</span>
        <div className="flex items-center gap-4">
          <div className="qn-art !h-[120px] !w-[120px] !m-0 shrink-0"><img src={o.src(o.w > 16 ? 4 : 8)} className="pixelated" alt={o.label} /></div>
          <div className="min-w-0">
            <div className="qn-title !text-[24px] !text-left">{q.name}{q.repeatable && <span className="ml-2 align-middle"><Px src={loopIcon(2)} title="Repetible" /></span>}</div>
            {q.repeatable && <div className="font-body text-[14px] text-stone-300">Repetible: vuelve al tablón al cobrarla.</div>}
          </div>
        </div>
        <p className="font-body text-[19px] text-stone-200 leading-snug">{q.description}</p>
        <div className="qn-prog !px-0">
          <div className="flex justify-between font-body text-[15px] text-stone-300"><span>{q.type === 'deliver' ? 'Tienes en mochila y alijo' : 'Progreso'}</span><span className="qn-num !text-[22px]">{Math.min(a.have, q.count)}<span className="of">/{q.count}</span></span></div>
          <span className="bar"><div style={{ width: `${(Math.min(a.have, q.count) / q.count) * 100}%`, background: done ? '#5fd19a' : '#e8b33a' }} /></span>
        </div>
        <Rewards q={q} big />
      </div>
      <div className="flex gap-2 flex-wrap">
        <button className={`btn px-4 font-display ${a.pinned ? 'btn-gold' : ''}`} style={{ minHeight: 48 }} aria-pressed={!!a.pinned}>{a.pinned ? '★ Fijada' : '☆ Fijar'}</button>
        <button className="btn px-4 font-display" style={{ minHeight: 48 }}>Dejar</button>
        <button className="btn btn-gold px-5 font-display ml-auto" style={{ minHeight: 48 }} disabled={!done}>{q.type === 'deliver' ? 'Entregar' : 'Cobrar'}</button>
      </div>
      <p className="qd-hint font-body text-[13px] text-stone-500 italic">Fijada, se recuerda en Jugar y en la mazmorra. Si la dejas, pierdes lo que llevabas.</p>
    </div>
  );
}

function BoardHeader({ count, help = true }: { count: number; help?: boolean }) {
  return (
    <div className="phead">
      <span className="phead-t">Tus misiones</span>
      <span className="font-display text-gold text-[clamp(16px,1.3vw,22px)]" data-testid="quests-count">{count}/{MAX_ACTIVE_QUESTS}</span>
      {help && <span className="btn ml-auto" style={{ minWidth: 44, minHeight: 44, display: 'grid', placeItems: 'center' }} title="Cómo funcionan las misiones">?</span>}
    </div>
  );
}

function Misiones() {
  const sel = Q.get('sel') as 'panel' | 'nota' | null;
  const [open, setOpen] = useState<string | null>(sel ? 'q_garra_rats' : null);
  const variant: 'panel' | 'nota' = sel ?? 'panel';
  const isTouch = useIsTouch();
  const phone = innerHeight <= 520;
  const openA = ACTIVE.find((x) => x.id === open);
  const sideOpen = !!openA && variant === 'panel' && !phone;
  const boardRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (VIEW === 'disponibles') document.getElementById('avail')?.scrollIntoView(); }, []);
  void isTouch;
  return (
    <div className="h-full overflow-y-auto scroll-thin" style={{ padding: '0 var(--pad) var(--pad)' }} data-testid="screen-quests">
      <div className={`grid ${sideOpen ? 'qwrap-side' : ''}`} style={{ gap: 'var(--gap)' }}>
        <section className="panel qboard" ref={boardRef} data-testid="quests-active">
          <BoardHeader count={ACTIVE.length} />
          <div className="qboard-wood">
            <div className={`qgrid ${sideOpen ? 'narrow' : ''}`}>
              {[...ACTIVE].sort((a, b) => Number(b.have >= qd(b.id).count) - Number(a.have >= qd(a.id).count) || Number(!!b.pinned) - Number(!!a.pinned))
                .map((a) => <QuestNote key={a.id} a={a} onOpen={() => setOpen(a.id)} selected={open === a.id} />)}
              {Array.from({ length: MAX_ACTIVE_QUESTS - ACTIVE.length }, (_, i) => <EmptySlot key={i} />)}
            </div>
          </div>
        </section>
        {sideOpen && <QuestDetail a={openA!} variant="panel" onClose={() => setOpen(null)} />}
      </div>
      <Available />
      {openA && (variant === 'nota' || phone) && (
        <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center fade-in" style={{ padding: phone ? 0 : 24 }} onMouseDown={(e) => e.target === e.currentTarget && setOpen(null)}>
          <QuestDetail a={openA} variant="nota" onClose={() => setOpen(null)} />
        </div>
      )}
    </div>
  );
}

function Available() {
  const order: VendorId[] = ['nira', 'vesper', 'garth', 'brand'];
  const [vid, setVid] = useState<VendorId>('garth');
  const list = STATIC_BOARD[vid] ?? [];
  return (
    <section id="avail" className="panel qboard mt-[var(--gap)]" data-testid="quests-board">
      <div className="phead">
        <span className="phead-t">Tablón de encargos</span>
        <span className="text-[14px] text-stone-400 font-body hidden md:inline">Lo que ofrece cada mercader</span>
      </div>
      <div className="flex gap-2 flex-wrap px-3 pt-3" role="tablist">
        {order.map((id) => {
          const v = VENDORS[id]; const n = (STATIC_BOARD[id] ?? []).length;
          return (
            <button key={id} role="tab" aria-selected={vid === id} className={`qvchip ${vid === id ? 'on' : ''}`} onClick={() => setVid(id)} data-testid={`quests-vendor-${id}`}>
              <MiniBust sprite={v.sprite} scale={2} /><span className="font-display text-[14px] tracking-[0.06em]" style={{ color: vid === id ? '#120f0a' : v.color }}>{v.name}</span><span className="qvchip-n">{n}</span>
            </button>
          );
        })}
      </div>
      <div className="qboard-wood">
        <div className="qgrid">
          {list.map((id) => <QuestNote key={id} a={{ id, have: 0 }} mode="board" />)}
          <button className="qnote empty old" data-testid="old-quests"><span className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-3"><Px src={loopIcon(3)} /><span className="font-display text-[14px] text-stone-300">Encargos antiguos (2)</span><span className="font-body text-[14px] text-stone-400">De zonas que ya dejaste atrás</span></span></button>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── BESTIARIO ───────────────────────── */
// Récord de ejemplo como el de la captura: casi toda la Mazmorra, un jefe derrotado (Senescal) y otro visto sin derrotar.
function sampleRecord(): BestiaryRecord {
  const ids = bestiaryByZone()[0].ids;
  const kills = [21, 18, 13, 15, 4, 0, 20, 17, 15, 10, 9, 1, 3, 0, 2, 2, 1];
  const r: BestiaryRecord = {};
  ids.forEach((id, i) => { if (i < kills.length) r[id] = { seen: Math.max(1, kills[i]), kills: kills[i] }; });
  // la Cripta: una vista (bronce)
  const c = bestiaryByZone()[1].ids; r[c[0]] = { seen: 1, kills: 0 };
  return r;
}
const REC = sampleRecord();
const ZONE_TILE: Record<ZoneId, string> = { mazmorra: 'castillo', cripta: 'catacumbas', infierno: 'puertas' };

function BeastTile({ id, onOpen, pips }: { id: string; onOpen: () => void; pips: boolean }) {
  const e = ENEMIES[id]; const k = knowledge(REC, id); const kills = REC[id]?.kills ?? 0;
  const boss = !!e.boss; const down = boss && kills > 0;
  const [ref, s] = useFit(24, 34, boss ? 30 : 22, boss ? 7 : 5);
  const t = TIER[k];
  const silhouette = k === 0 || (boss && !down);
  return (
    <button type="button" onClick={() => k > 0 && onOpen()} disabled={k === 0} className={`btile tier-${k} ${boss ? 'boss' : ''} ${down ? 'down' : ''} ${e.elite ? 'elite' : ''}`} style={{ ['--tier' as string]: t.frame }} data-testid={`beast-${id}`}>
      <span ref={ref} className="btile-stage">
        {boss && <span className="btile-crown"><Px src={crownIcon(3)} title="Jefe" /></span>}
        <span className="btile-fig">
          <img src={monsterUrl(e.sprite, s)} className="pixelated" alt="" draggable={false}
            style={silhouette ? { filter: 'brightness(0)', opacity: boss && k > 0 ? 1 : 0.6 } : undefined} />
          <img src={shadow(Math.max(2, Math.ceil(s / 2)))} className="pixelated shadow" alt="" />
        </span>
        {kills > 0 && <span className="btile-kills" title={`${kills} derrotadas`} data-testid={`beast-kills-${id}`}><Px src={skullIcon(1)} />{kills}</span>}
        {down && <span className="btile-stamp" data-testid={`beast-boss-${id}`}>Derrotado</span>}
        {boss && !down && <span className="btile-threat" data-testid={`beast-boss-${id}`}>Por derrotar</span>}
      </span>
      <span className="btile-name">
        <span className="truncate">{k === 0 ? '???' : e.name}</span>
        {pips && <span className="flex gap-1 justify-center mt-0.5">{[1, 2, 3].map((i) => <span key={i} className={`w-1.5 h-1.5 rotate-45 ${i <= k ? 'bg-gold' : 'bg-stone-700'}`} />)}</span>}
      </span>
    </button>
  );
}

function Bestiario() {
  const [zone, setZone] = useState<ZoneId>('mazmorra');
  const [open, setOpen] = useState<string | null>(null);
  const pips = Q.get('pips') === '1';
  const groups = bestiaryByZone();
  const ids = groups.find((g) => g.zone === zone)!.ids;
  const all = groups.flatMap((g) => g.ids);
  const known = all.filter((id) => knowledge(REC, id) > 0).length;
  const bosses = Object.values(ENEMIES).filter((e) => e.boss);
  const bossDown = bosses.filter((b) => (REC[b.id]?.kills ?? 0) > 0).length;
  return (
    <div className="h-full flex flex-col min-h-0" style={{ padding: '0 var(--pad) var(--pad)', gap: 'var(--gap)' }} data-testid="bestiary">
      <div className="flex items-center gap-x-5 gap-y-2 flex-wrap shrink-0">
        <h2 className="font-display text-parchment tracking-[0.1em] text-[clamp(20px,1.7vw,32px)]">Bestiario</h2>
        <div className="flex items-center gap-4 font-display text-[18px]" data-testid="bestiary-summary">
          <span className="bstat" title="Criaturas derrotadas"><Px src={skullIcon(2)} /><span className="text-parchment">155</span></span>
          <span className="bstat" title="Jefes derrotados"><Px src={crownIcon(2)} /><span className="text-parchment">{bossDown}</span><span className="text-stone-500 text-[14px]">/{bosses.length}</span></span>
          <span className="bstat" title="Criaturas conocidas" data-testid="bestiary-progress"><Px src={bookIcon(2)} /><span className="text-gold">{known}</span><span className="text-stone-500 text-[14px]">/{all.length}</span></span>
        </div>
        <div className="flex gap-2 ml-auto" role="tablist">
          {groups.map((g) => {
            const kn = g.ids.filter((id) => knowledge(REC, id) > 0).length;
            const ts = TILESETS[ZONE_TILE[g.zone]];
            const tile = cachedUrl(`ztile:${g.zone}`, () => drawFloorTs(1, ts), 2);
            return (
              <button key={g.zone} role="tab" aria-selected={zone === g.zone} className={`bzone ${zone === g.zone ? 'on' : ''}`} onClick={() => setZone(g.zone)} data-testid={`bestiary-zone-${g.zone}`}>
                <span className="bzone-sw" style={{ backgroundImage: `url(${tile})` }} />
                <span className="bzone-name text-[14px]">{ZONES[g.zone].name}</span>
                <span className="text-[12px] opacity-70">{kn}/{g.ids.length}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="bgrid flex-1 min-h-0" data-testid="bestiary-grid">
        {ids.map((id) => <BeastTile key={id} id={id} pips={pips} onOpen={() => setOpen(id)} />)}
      </div>
      {(open || VIEW === 'ficha') && <BeastCard id={open ?? Q.get('id') ?? ids[12]} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Locked({ need, kills, what }: { need: number; kills: number; what: string }) {
  const n = need - kills;
  return (
    <div className="bsec locked">
      <div className="bsec-t"><Px src={lockIcon(2)} />{what}</div>
      <div className="font-body text-[16px] text-stone-400">Derrótala {n === 1 ? 'una vez más' : `${n} veces más`}</div>
    </div>
  );
}

function BeastCard({ id, onClose }: { id: string; onClose: () => void }) {
  const e = getEnemy(id); const k = knowledge(REC, id) as Knowledge; const kills = REC[id]?.kills ?? 0;
  const zone = Object.values(ZONES).find((z) => z.boss === id || z.elite === id || z.enemies.some((x) => x.id === id));
  const [pose, setPose] = useState<'idle' | 'attack'>('idle');
  useEffect(() => { const t = setInterval(() => setPose((p) => (p === 'idle' ? 'attack' : 'idle')), 900); return () => clearInterval(t); }, []);
  const [ref, s] = useFit(24, 34, 30, 9);
  const t = TIER[k];
  const loot = [...(e.loot.always ?? []).map((a) => a.itemId), ...e.loot.entries.map((l) => l.itemId)].filter((x, i, a) => x !== 'nothing' && a.indexOf(x) === i);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 fade-in bcard-wrap" onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()} data-testid="beast-card">
      <div className={`panel bcard tier-${k}`} style={{ ['--tier' as string]: t.frame }}>
        <div className="bcard-left">
          <div ref={ref} className="bcard-stage">
            <span className="btile-fig"><img src={monsterUrl(e.sprite, s, pose)} className="pixelated" alt={e.name} /><img src={shadow(Math.max(2, Math.ceil(s / 2)))} className="pixelated shadow" alt="" /></span>
          </div>
          <div className="text-center">
            <h3 className="font-display text-[clamp(20px,1.6vw,28px)] text-parchment tracking-[0.06em]">{e.name}</h3>
            <div className="text-[14px] text-gold">{zone?.name}{e.boss ? ' · Jefe' : e.elite ? ' · Élite' : ''}{e.undead ? ' · No-muerto' : ''}</div>
          </div>
          <div className="flex justify-center gap-5 font-display text-[16px]">
            <span className="bstat"><Px src={skullIcon(2)} />{kills}</span>
            <span className="bstat" style={{ color: t.frame }}>◆ {['', 'Vista', 'Derrotada', 'Estudiada'][k]}</span>
          </div>
        </div>
        <div className="bcard-right scroll-thin">
          <button className="btn bcard-x" style={{ minWidth: 44, minHeight: 44 }} onClick={onClose} aria-label="Cerrar" data-testid="beast-close">✕</button>
          {k >= 2 ? (
            <div className="bsec">
              <div className="bsec-t">Cómo pelea</div>
              <p className="font-body text-[17px] text-stone-200 leading-snug">{BESTIARY_LORE[id] ?? ''}</p>
              <div className="text-[15px] mt-1"><span className="text-stone-400">Ataque básico:</span> {e.basicAttack.name} ({e.basicAttack.kind === 'magical' ? 'mágico' : 'físico'})</div>
              <div className="text-[15px]"><span className="text-stone-400">Cómo hiere:</span> {enemyAttackLine(id)}</div>
            </div>
          ) : <Locked need={BESTIARY_BASIC_KILLS} kills={kills} what="Cómo pelea" />}
          {k >= 3 ? (
            <>
              <div className="bsec"><div className="bsec-t">Habilidades</div>
                <ul className="space-y-1">{e.skills.map((sid) => { const sk = getSkill(sid); return <li key={sid} className="text-[15px]"><span className="text-parchment">{sk.name}</span> <span className="text-stone-400">· {sk.description}</span></li>; })}</ul></div>
              <div className="bsec"><div className="bsec-t">Estadísticas (nivel 1)</div>
                <div className="grid grid-cols-4 gap-x-4 text-[14px]">{([['maxHp', 'Vida'], ['atk', 'Ataque'], ['def', 'Defensa'], ['mag', 'Magia'], ['res', 'Resistencia'], ['spd', 'Velocidad'], ['crit', 'Crítico'], ['eva', 'Evasión']] as const).map(([k2, l]) => <div key={k2} className="flex justify-between"><span className="text-stone-400">{l}</span><span>{e.stats[k2]}</span></div>)}</div></div>
              <div className="bsec"><div className="bsec-t">Botín</div>
                <div className="flex flex-wrap gap-1.5">{loot.map((iid) => <span key={iid} className="flex items-center gap-1 bg-black/30 px-1.5 py-0.5 text-[13px]" style={{ color: RARITY_INFO[getItem(iid).rarity].color }}><Px src={iconUrl(getItem(iid).icon, 2)} />{getItem(iid).name}</span>)}</div></div>
            </>
          ) : (
            <div className="grid sm:grid-cols-3 gap-2">
              <Locked need={BESTIARY_FULL_KILLS} kills={kills} what="Habilidades" />
              <Locked need={BESTIARY_FULL_KILLS} kills={kills} what="Estadísticas" />
              <Locked need={BESTIARY_FULL_KILLS} kills={kills} what="Botín" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Raíz ───────────────────────── */
export function Proto() {
  const mis = VIEW.startsWith('mis') || VIEW === 'disponibles';
  const body: ReactNode = mis ? <Misiones /> : <Bestiario />;
  return (
    <div className="mk h-full flex flex-col bg-[#0b0a0e]">
      <TopBar tab={mis ? 'MISIONES' : 'BESTIARIO'} />
      <div className="flex-1 min-h-0">{body}</div>
    </div>
  );
}
