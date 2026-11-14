// Bastión unificado (14/11). La pestaña Bastión enseña directamente los 8 mercaderes (2 filas de 4) con un primer plano
// de medio pecho, su lugar, el estado de su estación, la reputación y un aviso si hay algo pendiente. Al tocar uno se
// abre su pantalla: a la izquierda su retrato, su frase, lo pendiente y la reputación; arriba, sus pestañas (solo las que
// tiene: Tienda, Vender, Misiones, sus servicios y SU estación, que es una por mercader) y «◂ Bastión»; a la derecha, tu
// mochila, tus materiales o la zona de venta. La estación se reconstruye, se usa y se mejora dentro de su pestaña.
// En el móvil, el retrato y el nombre van en la misma línea que las pestañas y la tercera zona en un cajón.
import { StashPanel } from '../StashPanel';
import { useEffect, useRef, useState, type ReactNode, useCallback } from 'react';
import { actions, useGame } from '../../state/store';
import { PLACES, VENDORS, type VendorId } from '../../../core/data/vendors';
import { QUESTS } from '../../../core/data/quests';
import { prepText, refugeOf, upgradeBlock } from '../../../core/refuge';
import { CotPanel, CraftPanel, RunePanel, StationDetail, UpgradeButton } from '../StationPanels';
import { MODULES, MODULE_ORDER, type ModuleId } from '../../../core/data/refuge';
import { stationArtUrl } from '../stationArt';
import { REP_RANKS, rankOf } from '../../../config/reputation';
import { readyQuestCount } from '../../../core/quests';
import { getItem } from '../../../core/data/items';
import { owned } from '../../../core/forge';
import type { Loc } from '../../../core/inventory';
import { MonsterSprite, GoldAmount, Modal } from '../common';
import { monsterUrl } from '../../../shared/art';
import { GridView, ItemIcon, isUpgrade } from '../inventory';
import { useDrag, useClearOnDrop } from '../pointerDrag';
import { useIsTouch } from '../../../shared/device';
import { buysThis, vendorSellPrice } from '../../../core/economy';
import { isCover } from '../../../core/inventory';
import { isCoins } from '../../../core/gold';
import { stackRarity } from '../../../core/data/rarity';
import { RARITY_INFO } from '../../../core/data/items';
import type { ItemStack, Profile } from '../../../core/types';
import { RepBar, ShopStock, VendorQuests, type VendorTarget, type VendorView } from '../VendorsTab';
import { RepairPanel } from '../RepairPanel';
import { InfirmaryPanel } from '../InfirmaryPanel';
import { ContractsPanel } from '../ContractsPanel';
import { Dishes, ScrapPanel } from '../RefugePanels';
import { ReceptionSection } from '../WorkshopPanels';
import { ItemCard } from './ItemCard';
import { Drawer, Panel, SubHead, usePixelScale } from '../kit';
import { useLayout } from '../../../config/ui';
import { sfx } from '../../audio';
import { TutDot } from '../MiniTutorial';

/** Orden de las tarjetas del Bastión. */
const BASTION_ORDER: VendorId[] = ['nira', 'vesper', 'garth', 'orik', 'grizk', 'brand', 'valerius', 'eldrin'];
/** La estación de cada mercader (una por mercader; el encargado está en config/stations.ts). */
export const STATION_OF = Object.fromEntries(MODULE_ORDER.map((id) => [MODULES[id].by, id])) as Partial<Record<VendorId, ModuleId>>;

const VIEW_LABEL: Record<VendorView, string> = { shop: 'Tienda', quests: 'Misiones', sell: 'Vender', repair: 'Reparar', contracts: 'Contratos', infirmary: 'Enfermería', scrap: 'Desguace', station: 'Estación' };

/** Las pestañas de cada mercader: solo las que tiene, y su estación al final. */
function servicesOf(id: VendorId): VendorView[] {
  const v: VendorView[] = [];
  if (VENDORS[id].stock.length) v.push('shop');
  if (VENDORS[id].buysItems) v.push('sell');
  if (id === 'grizk') v.push('contracts');
  if (QUESTS.some((q) => q.vendor === id)) v.push('quests');
  if (id === 'vesper') v.push('infirmary');
  if (id === 'brand' || id === 'nira' || id === 'orik') v.push('repair');
  if (id === 'orik') v.push('scrap');
  if (STATION_OF[id]) v.push('station');
  return v;
}

/** Lo pendiente de un mercader: misión lista, estación que ya se puede reconstruir o mejora pagable. */
function pendingOf(p: Profile, id: VendorId): { kind: 'quest' | 'rebuild' | 'upgrade'; text: string } | null {
  if (readyQuestCount(p, id) > 0) return { kind: 'quest', text: 'Misión lista' };
  const st = STATION_OF[id];
  if (!st) return null;
  const lvl = refugeOf(p)[st];
  if (lvl < 3 && !upgradeBlock(p, st)) return lvl < 1 ? { kind: 'rebuild', text: 'Se puede reconstruir' } : { kind: 'upgrade', text: '▲ Mejora' };
  return null;
}

export function Mercaderes({ target, onConsumed }: { target: VendorTarget | null; onConsumed: () => void }) {
  const [open, setOpen] = useState<VendorTarget | null>(target);
  useEffect(() => { if (target) { setOpen(target); onConsumed(); } }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  const goTo = (vendor: VendorId, view: VendorView) => setOpen({ vendor, view });
  return open
    ? <VendorInterior key={`${open.vendor}-${open.view}`} vendor={open.vendor} initial={open.view} onBack={() => { setOpen(null); sfx('click'); }} onGo={goTo} />
    : <BastionGrid onTalk={(vendor) => { setOpen({ vendor, view: servicesOf(vendor)[0] }); sfx('click'); }} />;
}

/** El Bastión: los 8 mercaderes en dos filas de 4, llenando la pantalla. */
function BastionGrid({ onTalk }: { onTalk: (v: VendorId) => void }) {
  const profile = useGame((s) => s.profile)!;
  const phone = useLayout() === 'phone';
  // La presentación de los mercaderes sale después de la bienvenida del intendente (que también pasa por aquí)
  const welcomed = useGame((s) => !!s.tutorials?.seen.includes('bienvenida'));
  useEffect(() => { if (welcomed) actions.tutorialEvent('bastion:merchants'); }, [welcomed]);
  const [reception, setReception] = useState(false);
  const recN = (profile.reception ?? []).length;
  const prep = prepText(profile.prep);
  return (
    <div className="h-full flex flex-col min-h-0" style={{ padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))', gap: 'var(--gap)' }} data-testid="screen-merchants">
      {!phone && (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 shrink-0">
          <h2 className="font-display text-parchment tracking-[0.1em] text-[clamp(20px,1.7vw,32px)]">El Bastión de Ceniza</h2>
          <span className="text-[15px] text-stone-400">Toca a un mercader para hablar, comerciar y usar su estación.</span>
          <span className="ml-auto flex flex-wrap items-center gap-2" data-testid="refuge-prep">
            <span className="text-[14px] text-stone-300" data-testid="prep-text">Preparación: {prep.length ? prep.join(' · ') : 'ninguna'}</span>
            {recN > 0 && <button className="btn btn-gold text-xs" style={{ minHeight: 44 }} onClick={() => { setReception(true); sfx('click'); }} data-testid="btn-reception">Recepción ({recN})</button>}
          </span>
        </div>
      )}
      <div className="grid flex-1 min-h-0" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gridTemplateRows: 'repeat(2, minmax(0,1fr))', gap: 'var(--gap)' }} data-testid="vendor-list">
        {BASTION_ORDER.map((id) => <VendorTile key={id} id={id} onTalk={onTalk} />)}
      </div>
      {phone && recN > 0 && <button className="btn btn-gold text-xs shrink-0 self-end" style={{ minHeight: 44 }} onClick={() => { setReception(true); sfx('click'); }} data-testid="btn-reception">Recepción ({recN})</button>}
      {reception && recN > 0 && (
        <Modal onClose={() => setReception(false)} testId="reception-modal">
          <ReceptionSection />
          <button className="btn mt-3" style={{ minHeight: 44 }} onClick={() => setReception(false)}>Cerrar</button>
        </Modal>
      )}
    </div>
  );
}

/** Primer plano de medio pecho: el sprite del mercader (20 × 26) recortado por la cabeza y el pecho, a la mayor escala
 *  entera que quepa en el hueco. Si un día hay retratos dibujados a mano, sustituyen a este recorte. */
function Bust({ sprite }: { sprite: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(4);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const fit = () => { const r = el.getBoundingClientRect(); setScale(Math.max(1, Math.floor(Math.min((r.width - 8) / 20, (r.height - 4) / 16)))); };
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="vbust" aria-hidden>
      <img src={monsterUrl(sprite, scale)} className="pixelated" alt="" draggable={false} style={{ width: 20 * scale, height: 26 * scale, marginTop: scale }} />
    </div>
  );
}

function VendorTile({ id, onTalk }: { id: VendorId; onTalk: (v: VendorId) => void }) {
  const profile = useGame((s) => s.profile)!;
  const phone = useLayout() === 'phone';
  const v = VENDORS[id];
  const rep = profile.reputation[id] ?? 0;
  const st = STATION_OF[id];
  const lvl = st ? refugeOf(profile)[st] : 0;
  const pend = pendingOf(profile, id);
  const status = st ? `${MODULES[st].name} · ${lvl < 1 ? 'En ruinas' : `Nv ${lvl}/3`}` : '';
  return (
    <button type="button" className="panel vtile text-left" onClick={() => onTalk(id)} data-testid={`vendor-${id}`}>
      <span className="vtile-name font-display relative" data-testid={`vendor-card-${id}`}>{v.name}<TutDot testId={`vendor-card-${id}`} inset /></span>
      <span className="vtile-port">
        <Bust sprite={v.sprite} />
        {pend && <span className={`vtile-pend ${pend.kind === 'upgrade' ? 'gold' : ''}`} data-testid={`vendor-pending-${id}`}>{pend.kind === 'upgrade' ? (phone ? '▲' : pend.text) : <>{'●'}{phone ? '' : ` ${pend.text}`}</>}</span>}
      </span>
      <span className="vtile-info">
        {st && <img src={stationArtUrl(st, lvl < 1)} className="pixelated shrink-0" alt="" draggable={false} style={{ width: phone ? 20 : 40, height: phone ? 26 : 52 }} />}
        <span className="min-w-0">
          <span className="block text-gold uppercase tracking-[0.12em] text-[13px] [@media(max-height:520px)]:text-[12px] truncate" data-testid={`vendor-place-${id}`}>{PLACES[v.place].name}</span>
          {!phone && st && <span className="block text-[14px] text-stone-300 truncate" data-testid={`vendor-station-${id}`}>{status}</span>}
        </span>
      </span>
      <span className="vtile-rep"><RepBar rep={rep} /></span>
    </button>
  );
}

/** Lo que dice cada encargado si su estación sigue en ruinas. */
const RUINED_LINE: Partial<Record<ModuleId, string>> = {
  forge: 'Esta forja sigue en ruinas. Reconstrúyela y la haré cantar.',
  armory: 'La vieja armería está llena de escombros. Reconstrúyela y forjaremos placas de verdad.',
  kitchen: 'La cocina del Bastión sigue en ruinas. Reconstrúyela y volverá a oler a guiso.',
  alchemy: 'Mi laboratorio sigue entre escombros. Reconstrúyelo y destilaremos juntos.',
  infirmary: 'El rincón de cura sigue en ruinas. Reconstrúyelo y podré prepararte vendas.',
  tannery: 'Las tinas están rotas. Reconstruye la curtiduría y te curtiré lo que traigas.',
  bench: 'El banco del taller está bajo los cascotes. Levántalo y desguazar rendirá más.',
};

/** La estación de un mercader dentro de su pestaña: reconstruirla (en ruinas), usarla y mejorarla. */
function StationTab({ id, onGo, extraTop }: { id: ModuleId; onGo: (v: VendorId, x: VendorView) => void; extraTop?: ReactNode }) {
  const profile = useGame((s) => s.profile)!;
  const lvl = refugeOf(profile)[id];
  const [detail, setDetail] = useState(false);
  const [runes, setRunes] = useState(false);
  useEffect(() => { actions.tutorialEvent('bastion:station'); }, []);
  if (lvl < 1 || detail) {
    return (
      <div className="flex flex-col gap-2" data-testid="station-panel">
        {lvl < 1 && <p className="font-body text-base text-stone-300" data-testid={`craft-locked-${id}`}>«{RUINED_LINE[id] ?? 'Esta estación sigue en ruinas. Reconstrúyela.'}»</p>}
        {detail && <div><button className="btn font-display tracking-[0.1em] uppercase" style={{ minHeight: 44 }} onClick={() => { setDetail(false); sfx('click'); }} data-testid="detail-back">◂ Volver</button></div>}
        <StationDetail id={id} onUse={() => setDetail(false)} onGo={onGo} />
      </div>
    );
  }
  const up = <UpgradeButton id={id} onOpen={() => setDetail(true)} />;
  if (id === 'cot') return <div data-testid="station-panel"><CotPanel extra={up} /></div>;
  if (id === 'alchemy' && runes) return <div data-testid="station-panel"><RunePanel onBack={() => setRunes(false)} extra={up} /></div>;
  const runeBtn = id === 'alchemy' && lvl >= 3
    ? <button className="btn btn-gold text-xs font-display" style={{ minHeight: 44 }} onClick={() => { setRunes(true); sfx('click'); }} data-testid="runic-runes">Grabar runas</button> : null;
  return (
    <div className="flex flex-col gap-2" data-testid="station-panel">
      {extraTop}
      <CraftPanel station={id} extra={<>{runeBtn}{up}</>} />
      {id === 'kitchen' && <div className="panel p-3 mt-2"><Dishes /></div>}
    </div>
  );
}

function VendorInterior({ vendor, initial, onBack, onGo }: { vendor: VendorId; initial: VendorView; onBack: () => void; onGo: (v: VendorId, x: VendorView) => void }) {
  const profile = useGame((s) => s.profile)!;
  const layout = useLayout();
  const phone = layout === 'phone';
  const scale = usePixelScale('vendor');
  const tabs = servicesOf(vendor);
  const [view, setView] = useState<VendorView>(tabs.includes(initial) ? initial : tabs[0]);
  const [sel, setSel] = useState<Loc | null>(null);
  useEffect(() => { actions.tutorialEvent(`vendor:${vendor}`); }, [vendor]);
  useClearOnDrop(useCallback(() => setSel(null), []));
  const [marks, setMarks] = useState<string[]>([]);
  const v = VENDORS[vendor];
  const st = STATION_OF[vendor];
  const rep = profile.reputation[vendor] ?? 0;
  const discount = REP_RANKS[rankOf(rep)].discount;
  const go = (x: VendorView) => { setView(x); setSel(null); setMarks([]); sfx('click'); };
  // Quién compra al vender (Grizk solo joyas y tesoros, y paga mejor)
  useEffect(() => { actions.setActiveVendor(vendor); return () => actions.setActiveVendor(null); }, [vendor]);
  const label = (x: VendorView) => (x === 'station' && st ? MODULES[st].name : VIEW_LABEL[x]);
  const ready = readyQuestCount(profile, vendor);
  const pend = pendingOf(profile, vendor);

  const title = view === 'station' && st ? MODULES[st].name : view === 'scrap' ? `Desguace de ${v.name}` : view === 'repair' ? `Yunque de ${v.name}` : view === 'infirmary' ? `Enfermería de ${v.name}` : view === 'contracts' ? 'Contratos de Grizk' : view === 'sell' ? `Vender a ${v.name}` : view === 'quests' ? `Encargos de ${v.name}` : `Tienda de ${v.name}`;
  const center: ReactNode =
    view === 'shop' ? <ShopStock vid={vendor} cols={`grid gap-2 ${phone ? 'grid-cols-1' : 'grid-cols-2 2xl:grid-cols-3'}`} />
      : view === 'quests' ? <VendorQuests vendor={vendor} />
        : view === 'station' && st ? <StationTab id={st} onGo={onGo} />
          : view === 'repair' ? <RepairPanel />
            : view === 'infirmary' ? <InfirmaryPanel />
              : view === 'contracts' ? <ContractsPanel />
                : view === 'scrap' ? <ScrapPanel />
                  : <SellGrids sel={sel} setSel={setSel} marks={marks} setMarks={setMarks} vendor={vendor} />;
  const crafting = (view === 'station' && st !== 'cot') || view === 'scrap';
  const side: ReactNode = view === 'sell'
    ? <Panel title="A vender" className="min-h-0 h-full" bodyClassName="overflow-y-auto scroll-thin flex flex-col" testId="sale-panel">
        <SalePanel vendor={vendor} marks={marks} setMarks={setMarks} onSold={() => setSel(null)} />
        <div className="panel p-3 mt-3"><ItemCard loc={sel} mode="merchant" onClear={() => setSel(null)} compact /></div>
      </Panel>
    : crafting
      ? <Panel title="Tus materiales" className="min-h-0 h-full" bodyClassName="overflow-y-auto scroll-thin flex flex-col"><Materials /></Panel>
      : <Panel title="Tu mochila" className="min-h-0 h-full" bodyClassName="overflow-y-auto scroll-thin flex flex-col"><BagSummary /></Panel>;

  const tabBar = (
    <div className="ui-seg vtabs" role="tablist" data-testid="vendor-tabs">
      {tabs.map((x) => (
        <button key={x} type="button" role="tab" aria-selected={view === x} className={view === x ? 'on' : ''} onClick={() => go(x)} data-testid={`vendor-view-${x}`}>
          {label(x)}{x === 'quests' && ready > 0 && <span className="vtab-dot" aria-label="Misión lista">●</span>}
          {x === 'station' && pend && pend.kind !== 'quest' && <span className={`vtab-dot ${pend.kind === 'upgrade' ? 'gold' : ''}`} aria-label={pend.text}>{pend.kind === 'upgrade' ? '▲' : '●'}</span>}
        </button>
      ))}
      <button type="button" onClick={onBack} data-testid="vendor-back">◂ Bastión</button>
    </div>
  );
  const pendBox = pend && (
    <div className="panel p-3 mt-3 text-left" data-testid="vendor-pending">
      <div className="text-[13px] uppercase tracking-[0.12em] text-stone-400">Pendiente</div>
      <div className="text-[15px] text-parchment mt-1">{pend.kind === 'quest' ? (ready === 1 ? 'Una misión lista para entregar' : `${ready} misiones listas para entregar`) : pend.kind === 'rebuild' ? `${MODULES[st!].name}: ya puedes reconstruirla` : `${MODULES[st!].name}: mejora disponible`}</div>
      <button className="btn btn-gold w-full mt-2 font-display tracking-[0.1em] uppercase text-xs" style={{ minHeight: 44 }} onClick={() => go(pend.kind === 'quest' ? 'quests' : 'station')} data-testid="vendor-pending-go">
        {pend.kind === 'quest' ? 'Entregar' : pend.kind === 'rebuild' ? 'Reconstruir' : '▲ Mejorar'}
      </button>
    </div>
  );
  const left = (
    <Panel className="min-h-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col" testId="vendor-panel">
      <div className="ui-arch shrink-0" style={{ height: 26 * scale + 30 }}><div className="pb-1"><MonsterSprite sprite={v.sprite} scale={scale} /></div></div>
      <div className="text-center font-display text-parchment text-[20px] mt-2" data-testid="vendor-name">{v.name}</div>
      <div className="text-center text-[13px] uppercase tracking-[0.1em] text-gold">{PLACES[v.place].name}</div>
      <div className="text-center text-[14px]" style={{ color: v.color }}>{v.role}</div>
      <p className="font-body italic text-stone-300 text-center text-[15px] leading-snug mt-2">«{v.blurb}»</p>
      {pendBox}
      <div className="flex-1" />
      <div className="mt-3"><RepBar rep={rep} /></div>
      {discount > 0 && <div className="text-[13px] text-heal mt-0.5">{Math.round(discount * 100)} % de descuento por tu reputación</div>}
    </Panel>
  );
  const main = <Panel title={title} className="min-h-0 flex-1" bodyClassName={`overflow-y-auto scroll-thin ${view === 'sell' ? 'flex flex-col' : ''}`} testId={`vendor-main-${view}`}>{center}</Panel>;
  const pad = { padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))', gap: 'var(--gap)' } as const;

  if (phone) {
    return (
      <div className="h-full flex flex-col relative min-h-0" style={{ ...pad, paddingRight: 'calc(max(var(--pad), env(safe-area-inset-right)) + 40px)' }} data-testid="vendor-interior">
        <div className="flex items-center gap-2 shrink-0 min-w-0" data-testid="vendor-panel">
          <MonsterSprite sprite={v.sprite} scale={1} />
          <span className="font-display text-parchment shrink-0" data-testid="vendor-name">{v.name}</span>
          <div className="min-w-0 overflow-x-auto scroll-thin">{tabBar}</div>
        </div>
        {main}
        <Drawer label={crafting ? 'Materiales' : view === 'sell' ? (marks.length ? `Vender (${marks.length})` : 'A vender') : 'Mochila'} side="right" testId="vendor-side">{side}</Drawer>
      </div>
    );
  }
  const sideW = layout === 'tablet' ? 260 : 320;
  return (
    <div className="h-full grid" style={{ ...pad, gridTemplateColumns: `${layout === 'tablet' ? 220 : 300}px minmax(0,1fr) ${sideW}px` }} data-testid="vendor-interior">
      {left}
      <div className="min-h-0 flex flex-col" style={{ gap: 'var(--gap)' }}>{tabBar}{main}</div>
      <div className="min-h-0">{side}</div>
    </div>
  );
}

/** Vender: la mochila y el almacén. Tocar un objeto lo marca para vender (y enseña su ficha); se pueden marcar varios
 *  o arrastrarlos a la zona «A vender». Doble clic: vender ese al momento. */
const markKey = (l: Loc) => (l.kind === 'grid' && (l.container === 'backpack' || l.container === 'stash') ? `${l.container}:${l.index}` : null);
function SellGrids({ sel, setSel, marks, setMarks, vendor }: { sel: Loc | null; setSel: (l: Loc | null) => void; marks: string[]; setMarks: (m: string[] | ((m: string[]) => string[])) => void; vendor: VendorId }) {
  const profile = useGame((s) => s.profile)!;
  const quick = (l: Loc) => { if (l.kind === 'grid' && (l.container === 'backpack' || l.container === 'stash')) { actions.sell(l.container, l.index, true); setMarks((m) => m.filter((k) => k !== markKey(l))); } };
  const toggle = (l: Loc) => {
    const k = markKey(l);
    setSel(l);
    if (!k) return;
    const g = l.kind === 'grid' && (l.container === 'backpack' || l.container === 'stash') ? profile[l.container][l.index] : null;
    if (g && (!buysThis(vendor, g.itemId) || isCoins(g) || (g.gold ?? 0) > 0)) { sfx('error'); return; }
    sfx('click');
    setMarks((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k]));
  };
  // Soltar un objeto arrastrado sobre la zona de venta lo marca
  useEffect(() => {
    const h = (e: Event) => { const l = (e as CustomEvent<Loc>).detail; const k = markKey(l); if (k) setMarks((m) => (m.includes(k) ? m : [...m, k])); setSel(l); };
    window.addEventListener('cr-drop-sell', h); return () => window.removeEventListener('cr-drop-sell', h);
  }, [setMarks, setSel]);
  const touchy = useIsTouch();
  const isMarked = (l: Loc) => { const k = markKey(l); return !!k && marks.includes(k); };
  const bagUsed = profile.backpack.some((x) => !!x && !isCover(x));
  return (
    <div className="my-auto flex flex-wrap justify-center items-start" style={{ gap: 'calc(var(--gap) * 2)' }} data-testid="sell-grids">
      <div className="flex flex-col">
        <SubHead right={<button className="btn text-xs" style={{ minHeight: touchy ? 44 : 34 }} onClick={() => { sfx('click'); actions.emptyBackpack(); }} disabled={!bagUsed} data-testid="sell-empty-backpack" title="Pasa todo lo de la mochila al almacén">Vaciar mochila</button>}>Mochila</SubHead>
        <GridView grid={profile.backpack} container="backpack" cols={6} equipment={profile.equipment} mode="merchant" selected={sel} onSelect={toggle} onQuick={quick} onAlt={quick} marked={isMarked} />
        <p className="font-body text-[13px] text-stone-400 mt-3 max-w-[340px] leading-snug">Toca los objetos para marcarlos, o arrástralos a «A vender». Doble clic: vender al momento.</p>
      </div>
      <div className="flex flex-col" style={{ height: 'min(70vh, 640px)', minHeight: 280 }}>
        <StashPanel cols={8} mode="merchant" sel={sel} onSelect={toggle} onQuick={quick} onAlt={quick} testId="sell-stash" marked={isMarked} />
      </div>
    </div>
  );
}

/** Zona de venta: lo marcado con su precio, el total, selección rápida, vender todo y recomprar lo último vendido. */
function SalePanel({ vendor, marks, setMarks, onSold }: { vendor: VendorId; marks: string[]; setMarks: (m: string[]) => void; onSold: () => void }) {
  const profile = useGame((s) => s.profile)!;
  const buyback = useGame((s) => s.buyback);
  const [confirm, setConfirm] = useState(false);
  const drag = useDrag();
  const over = !!drag && !drag.back && drag.over === SELL_DROP;
  const rows = marks.map((k) => {
    const [container, i] = k.split(':') as ['backpack' | 'stash', string];
    const st = profile[container][Number(i)];
    return st && !isCover(st) ? { k, container, index: Number(i), st, price: vendorSellPrice(vendor, st.itemId, st) * st.qty } : null;
  }).filter((x): x is NonNullable<typeof x> => !!x);
  const total = rows.reduce((t, r) => t + r.price, 0);
  const risky = rows.filter((r) => ['rare', 'epic', 'legendary'].includes(stackRarity(r.st, getItem(r.st.itemId))) || isUpgrade(r.st, profile.equipment, profile.character));
  // Selección rápida en la mochila y la página abierta del almacén
  const all = (pred: (st: ItemStack) => boolean) => {
    const ks: string[] = [];
    (['backpack', 'stash'] as const).forEach((c) => profile[c].forEach((st, i) => { if (st && !isCover(st) && !isCoins(st) && !(st.gold ?? 0) && buysThis(vendor, st.itemId) && pred(st)) ks.push(`${c}:${i}`); }));
    setMarks([...new Set([...marks, ...ks])]); sfx('click');
  };
  const doSell = () => { actions.sellMany(rows.map((r) => ({ container: r.container, index: r.index }))); setMarks([]); setConfirm(false); onSold(); };
  return (
    <div data-testid="sale-zone">
      <div className={`sell-drop border-2 border-dashed border-stone-700 p-2 min-h-[64px] ${over ? 'drag-over' : ''}`} data-drop={SELL_DROP}>
        {rows.length ? (
          <ul className="space-y-0.5 text-[14px]">{rows.map((r) => (
            <li key={r.k} className="flex items-center gap-2">
              <ItemIcon itemId={r.st.itemId} size={20} /><span className="flex-1 truncate" style={{ color: RARITY_INFO[stackRarity(r.st, getItem(r.st.itemId))].color }}>{getItem(r.st.itemId).name}{r.st.qty > 1 ? ` ×${r.st.qty}` : ''}</span>
              <span className="text-gold">{r.price}</span>
              <button className="text-stone-500 hover:text-parchment w-7 h-7" onClick={() => setMarks(marks.filter((x) => x !== r.k))} aria-label="Quitar de la venta">✕</button>
            </li>))}</ul>
        ) : <p className="text-[13px] text-stone-400 italic text-center py-3">Toca objetos para marcarlos o arrástralos aquí.</p>}
      </div>
      {rows.length > 0 && <div className="flex justify-between font-display text-parchment mt-2"><span>Total</span><span className="text-gold" data-testid="sale-total">{total} oro</span></div>}
      <div className="flex flex-wrap gap-1 mt-2">
        <button className="btn text-xs" style={{ minHeight: 44 }} onClick={() => all((st) => stackRarity(st, getItem(st.itemId)) === 'common' && !!getItem(st.itemId).slot)} data-testid="mark-common">Marcar equipo común</button>
        <button className="btn text-xs" style={{ minHeight: 44 }} onClick={() => all((st) => getItem(st.itemId).category === 'material')} data-testid="mark-materials">Marcar materiales</button>
        <button className="btn text-xs" style={{ minHeight: 44 }} onClick={() => all((st) => ['jewel', 'relic'].includes(getItem(st.itemId).category))} data-testid="mark-treasure">Marcar tesoros</button>
        {rows.length > 0 && <button className="btn text-xs" style={{ minHeight: 44 }} onClick={() => setMarks([])} data-testid="mark-none">Quitar marcas</button>}
      </div>
      <button className="btn btn-gold w-full mt-3 font-display" style={{ minHeight: 48 }} disabled={!rows.length} onClick={() => (risky.length ? setConfirm(true) : doSell())} data-testid="btn-sell-marked">
        {rows.length ? `Vender ${rows.length === 1 ? '1 objeto' : `${rows.length} objetos`} · ${total} oro` : 'Vender'}
      </button>
      {buyback.length > 0 && (
        <div className="mt-3" data-testid="buyback">
          <div className="text-[11px] tracking-[0.15em] uppercase text-stone-400 mb-1">Recomprar (mientras sigas aquí)</div>
          {buyback.map((b, i) => (
            <button key={i} className="w-full flex items-center gap-2 text-[14px] py-1 hover:bg-[#15131a]" style={{ minHeight: 36 }} onClick={() => actions.buyBack(i)} data-testid={`buyback-${i}`}>
              <ItemIcon itemId={b.stack.itemId} size={20} /><span className="flex-1 text-left truncate">{getItem(b.stack.itemId).name}{b.stack.qty > 1 ? ` ×${b.stack.qty}` : ''}</span><span className="text-gold">↺ {b.price}</span>
            </button>))}
        </div>
      )}
      {confirm && (
        <Modal onClose={() => setConfirm(false)} testId="confirm-sell">
          <h2 className="panel-title text-lg mb-2">¿Vender también esto?</h2>
          <p className="font-body text-lg">Entre lo marcado hay {risky.length === 1 ? 'algo valioso' : `${risky.length} objetos valiosos`}: {risky.slice(0, 4).map((r) => getItem(r.st.itemId).name).join(', ')}{risky.length > 4 ? '…' : ''}.</p>
          <p className="text-sm text-stone-400 mt-1">Si te equivocas, podrás recomprarlo al mismo precio mientras sigas con este mercader.</p>
          <div className="flex gap-2 mt-4"><button className="btn btn-gold" style={{ minHeight: 44 }} onClick={doSell} data-testid="btn-confirm-sell">Vender {rows.length} · {total} oro</button>
            <button className="btn" style={{ minHeight: 44 }} onClick={() => setConfirm(false)}>Cancelar</button></div>
        </Modal>
      )}
    </div>
  );
}
const SELL_DROP = JSON.stringify({ type: 'sell' });

function BagSummary() {
  const profile = useGame((s) => s.profile)!;
  return (
    <>
      <GridView grid={profile.backpack} container="backpack" cols={4} equipment={profile.equipment} mode="lobby" />
      <div className="flex-1" />
      <div className="panel p-3 mt-3 flex justify-between items-center"><span className="text-stone-300 text-sm">Oro</span><GoldAmount value={profile.gold} /></div>
    </>
  );
}

/** Materiales de la mochila y el almacén (los que pide la forja). */
function Materials() {
  const profile = useGame((s) => s.profile)!;
  const ids = [...new Set([...profile.backpack, ...profile.stash].filter((x): x is NonNullable<typeof x> => !!x).map((x) => x.itemId).filter((id) => getItem(id).category === 'material'))];
  return (
    <>
      {ids.length ? (
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(4, var(--slot))' }} data-testid="forge-materials">
          {ids.map((id) => <div key={id} className="slot" title={getItem(id).name}><ItemIcon itemId={id} /><span className="qty">{owned(profile, id)}</span></div>)}
        </div>
      ) : <p className="font-body text-stone-400 italic">Aún no tienes materiales. Pica vetas en las mazmorras.</p>}
      <p className="text-[11px] text-stone-400 mt-2">De la mochila y del almacén.</p>
      <div className="flex-1" />
      <div className="panel p-3 mt-3 flex justify-between items-center"><span className="text-stone-300 text-sm">Oro</span><GoldAmount value={profile.gold} /></div>
    </>
  );
}
