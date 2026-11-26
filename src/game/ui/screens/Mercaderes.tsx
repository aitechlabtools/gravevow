// Bastión unificado (14/11). La pestaña Bastión enseña directamente los 8 mercaderes (2 filas de 4) con un primer plano
// de medio pecho, su lugar, el estado de su estación, la reputación y un aviso si hay algo pendiente. Al tocar uno se
// abre su pantalla: a la izquierda su retrato, su frase, lo pendiente y la reputación; arriba, sus pestañas (solo las que
// tiene: Tienda, Vender, Misiones, sus servicios y SU estación, que es una por mercader) y «◂ Bastión»; a la derecha, tu
// mochila, tus materiales o la zona de venta. La estación se reconstruye, se usa y se mejora dentro de su pestaña.
// En el móvil, el retrato y el nombre van en la misma línea que las pestañas y la tercera zona en un cajón.
import { InsureTab, Seal } from '../InsurePanels';
import { pendingFor } from '../../../core/insurance';
import { REFORGER } from '../../../config/insurance';
import { stationLevel } from '../../../core/crafting';
import { StashPanel } from '../StashPanel';
import { useEffect, useRef, useState, type ReactNode, useCallback } from 'react';
import { actions, toast, useGame } from '../../state/store';
import { PLACES, VENDORS, type VendorId } from '../../../core/data/vendors';
import { prepText, refugeOf, upgradeBlock } from '../../../core/refuge';
import { CotPanel, CraftPanel, RunePanel, StationDetail, UpgradeButton } from '../StationPanels';
import { MODULES, MODULE_ORDER, type ModuleId } from '../../../core/data/refuge';
import { stationIconUrl } from '../stationArt';
import { REP_RANKS, rankOf } from '../../../config/reputation';
import { readyQuestCount, boardQuests, activeQuests, isOldQuest } from '../../../core/quests';
import { getItem } from '../../../core/data/items';
import { owned } from '../../../core/forge';
import type { Loc } from '../../../core/inventory';
import { MonsterSprite, GoldAmount, Modal } from '../common';
import { monsterUrl } from '../../../shared/art';
import { GridView, ItemIcon, isUpgrade, SellFilter } from '../inventory';
import { useDrag, useClearOnDrop } from '../pointerDrag';
import { useIsTouch } from '../../../shared/device';
import { buysThis, vendorSellPrice } from '../../../core/economy';
import { buyerOpen, wrongBuyerText } from '../../../core/sellRoutes';
import { pageSlice, pageStart } from '../../../core/stashPages';
import { isCover } from '../../../core/inventory';
import { isCoins } from '../../../core/gold';
import { stackRarity } from '../../../core/data/rarity';
import { RARITY_INFO } from '../../../core/data/items';
import type { ItemStack, Profile } from '../../../core/types';
import { RepBar, ShopStock, ShopCard, VendorQuests, type VendorTarget, type VendorView } from '../VendorsTab';
import { RepairPanel } from '../RepairPanel';
import { InfirmaryPanel } from '../InfirmaryPanel';
import { ContractsPanel } from '../ContractsPanel';
import { Dishes, ScrapPanel } from '../RefugePanels';
import { ReceptionSection } from '../WorkshopPanels';
import { ItemCard } from './ItemCard';
import { Drawer, Panel, SubHead } from '../kit';
import { useLayout } from '../../../config/ui';
import { sfx } from '../../audio';
import { TutDot } from '../MiniTutorial';
import { PixelIcon } from '../../../shared/community';
import { VENDOR_TAB_ICONS, BASTION_SKYLINE } from '../kit/tabIcons';

/** Orden de las tarjetas del Bastión. */
const BASTION_ORDER: VendorId[] = ['nira', 'vesper', 'garth', 'orik', 'grizk', 'brand', 'valerius', 'eldrin'];
/** La estación de cada mercader (una por mercader; el encargado está en config/stations.ts). */
export const STATION_OF = Object.fromEntries(MODULE_ORDER.map((id) => [MODULES[id].by, id])) as Partial<Record<VendorId, ModuleId>>;

const VIEW_LABEL: Record<VendorView, string> = { shop: 'Tienda', quests: 'Misiones', sell: 'Vender', repair: 'Reparar', contracts: 'Contratos', infirmary: 'Enfermería', scrap: 'Desguace', station: 'Estación', insure: 'Seguro' };

/** Las pestañas de cada mercader: solo las que tiene, y su estación al final. */
function servicesOf(id: VendorId, p?: Profile): VendorView[] {
  const v: VendorView[] = [];
  // Seguro (24/11): con la estación del mercader reconstruida, o si te guarda piezas reforjadas
  // Una función por mercader (24/11): el seguro solo con Valerius, con alguna estación de las piezas reconstruida o piezas pendientes
  const insure = !!(p && id === 'valerius' && ([...new Set(Object.values(REFORGER).map((r) => r.station))].some((st) => stationLevel(p, st) >= 1) || pendingFor(p, id).length));
  if (VENDORS[id].stock.length) v.push('shop');
  if (VENDORS[id].buysItems) v.push('sell');
  if (id === 'grizk') v.push('contracts');
  if (id === 'vesper') v.push('infirmary');
  if (id === 'brand') v.push('repair'); // Reparar solo con Brand (24/11: antes también en Nira y Orik)
  if (id === 'orik') v.push('scrap');
  if (STATION_OF[id]) v.push('station');
  if (insure) v.splice(Math.min(1, v.length), 0, 'insure');
  return v;
}

/** Lo pendiente de un mercader: misión lista, estación que ya se puede reconstruir o mejora pagable. */
function pendingOf(p: Profile, id: VendorId): { kind: 'quest' | 'rebuild' | 'upgrade' | 'reforge'; text: string } | null {
  if (pendingFor(p, id).length) return { kind: 'reforge', text: 'Pieza reforjada' };
  if (readyQuestCount(p, id) > 0) return { kind: 'quest', text: 'Misión lista' };
  const st = STATION_OF[id];
  if (!st) return null;
  const lvl = refugeOf(p)[st];
  if (lvl < 3 && !upgradeBlock(p, st)) return lvl < 1 ? { kind: 'rebuild', text: 'Se puede reconstruir' } : { kind: 'upgrade', text: '▲ Mejora' };
  return null;
}

export function Mercaderes({ target, onConsumed, onQuests }: { target: VendorTarget | null; onConsumed: () => void; onQuests?: (v: VendorId) => void }) {
  const [open, setOpen] = useState<VendorTarget | null>(target);
  useEffect(() => { if (target) { setOpen(target); onConsumed(); } }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  const goTo = (vendor: VendorId, view: VendorView) => setOpen({ vendor, view });
  return open
    ? <VendorInterior key={`${open.vendor}-${open.view}`} vendor={open.vendor} initial={open.view} onBack={() => { setOpen(null); sfx('click'); }} onGo={goTo} onQuests={onQuests} />
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
        {pend && <span className={`vtile-pend ${pend.kind === 'upgrade' || pend.kind === 'reforge' ? 'gold' : ''}`} data-testid={`vendor-pending-${id}`}>{pend.kind === 'reforge' ? <span className="inline-flex items-center gap-1"><Seal scale={1} title={pend.text} />{phone ? '' : pend.text}</span> : <>{pend.kind === 'upgrade' ? (phone ? '▲' : pend.text) : <>{'●'}{phone ? '' : ` ${pend.text}`}</>}</>}</span>}
      </span>
      <span className="vtile-info">
        {st && <img src={stationIconUrl(st, lvl < 1)} className="pixelated shrink-0" alt="" draggable={false} style={{ width: phone ? 20 : 40, height: phone ? 26 : 52 }} />}
        <span className="min-w-0">
          <span className="block text-gold uppercase tracking-[0.12em] text-[13px] [@media(max-height:520px)]:text-[12px] truncate" data-testid={`vendor-place-${id}`}>{PLACES[v.place].name}</span>
          {!phone && st && <span className="block text-[14px] text-stone-300 truncate" data-testid={`vendor-station-${id}`}>{status}</span>}
        </span>
      </span>
      <span className="vtile-rep"><RepBar rep={rep} /></span>
    </button>
  );
}

/** La estación de un mercader dentro de su pestaña: reconstruirla (en ruinas), usarla y mejorarla. */
function StationTab({ id, onGo, extraTop }: { id: ModuleId; onGo: (v: VendorId, x: VendorView) => void; extraTop?: ReactNode }) {
  const profile = useGame((s) => s.profile)!;
  const lvl = refugeOf(profile)[id];
  const [detail, setDetail] = useState(false);
  const stLayout = useLayout();
  const [runes, setRunes] = useState(false);
  useEffect(() => { actions.tutorialEvent('bastion:station'); }, []);
  if (lvl < 1 || detail) {
    return (
      <div className="flex flex-col gap-2" data-testid="station-panel">{lvl < 1 && <span hidden data-testid={`craft-locked-${id}`} />}
        {detail && <div><button className="btn font-display tracking-[0.1em] uppercase" style={{ minHeight: 44 }} onClick={() => { setDetail(false); sfx('click'); }} data-testid="detail-back">◂ Volver</button></div>}
        <StationDetail id={id} onUse={() => setDetail(false)} onGo={onGo}>{lvl >= 1 && <Panel title="Tus materiales" className="min-h-0 h-full" bodyClassName="overflow-y-auto scroll-thin flex flex-col"><Materials /></Panel>}</StationDetail>
      </div>
    );
  }
  const up = <UpgradeButton id={id} onOpen={() => setDetail(true)} />;
  if (id === 'cot') return <div data-testid="station-panel"><CotPanel extra={up} /></div>;
  if (id === 'alchemy' && runes) return <div data-testid="station-panel"><RunePanel onBack={() => setRunes(false)} extra={up} /></div>;
  const runeBtn = id === 'alchemy' && lvl >= 3
    ? <button className="btn btn-gold text-xs font-display" style={{ minHeight: 44 }} onClick={() => { setRunes(true); sfx('click'); }} data-testid="runic-runes">Grabar runas</button> : null;
  return (
    <div className="flex flex-col gap-2" data-testid="station-panel">{lvl < 1 && <span hidden data-testid={`craft-locked-${id}`} />}
      {extraTop}
      <StationDetail id={id} onGo={onGo}>
        <div className={`grid ${stLayout !== 'phone' ? 'h-full' : 'items-start'}`} style={{ gridTemplateColumns: stLayout !== 'phone' ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(150px,24%)', gap: 'var(--gap)' }}>
          <CraftPanel station={id} extra={runeBtn} />
          {stLayout === 'phone' && <div className="min-h-0 flex flex-col" style={{ maxHeight: 'min(72vh, 620px)' }}><Panel title="Tus materiales" className="min-h-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col"><Materials /></Panel></div>}
        </div>
      </StationDetail>
      {id === 'kitchen' && <div className="panel p-3 mt-2"><Dishes /></div>}
    </div>
  );
}

function VendorInterior({ vendor, initial, onBack, onGo, onQuests }: { vendor: VendorId; initial: VendorView; onBack: () => void; onGo: (v: VendorId, x: VendorView) => void; onQuests?: (v: VendorId) => void }) {
  const profile = useGame((s) => s.profile)!;
  const layout = useLayout();
  const phone = layout === 'phone';
  const tabs = servicesOf(vendor, profile);
  // Con piezas reforjadas esperando, se entra directo en «Seguro» para recogerlas
  const [view, setView] = useState<VendorView>(tabs.includes('insure') && pendingFor(profile, vendor).length ? 'insure' : tabs.includes(initial) ? initial : tabs[0]);
  const [sel, setSel] = useState<Loc | null>(null);
  useEffect(() => { actions.tutorialEvent(`vendor:${vendor}`); }, [vendor]);
  useClearOnDrop(useCallback(() => setSel(null), []));
  const [marks, setMarks] = useState<string[]>([]);
  const [shopSel, setShopSel] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const side_tabs = true;
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
  // Encargos de este mercader: un aviso que lleva a la pestaña Misiones con él elegido (ya no hay pestaña propia)
  const offers = boardQuests(profile, vendor).filter((p) => !isOldQuest(p.id, profile.character.level)).length;
  const taken = activeQuests(profile, vendor).length;
  const questLink = (offers > 0 || taken > 0) && (
    <button type="button" className="panel vquest-link" onClick={() => { sfx('click'); onQuests?.(vendor); }} data-testid="vendor-quests-link">
      <PixelIcon rows={VENDOR_TAB_ICONS.quests} size={22} color="currentColor" />
      <span className="min-w-0 flex-1 text-left">
        <span className="vq-t block font-display text-[14px] tracking-[0.08em] text-parchment">{offers > 0 ? (phone ? (offers === 1 ? '1 encargo' : `${offers} encargos`) : offers === 1 ? '1 encargo nuevo' : `${offers} encargos nuevos`) : 'Encargos'}</span>
        <span className="vq-s block text-[13px] text-stone-400">{ready > 0 ? (ready === 1 ? '1 lista para entregar' : `${ready} listas para entregar`) : taken > 0 ? (taken === 1 ? '1 aceptada' : `${taken} aceptadas`) : 'Míralos en Misiones'}</span>
      </span>
      <span className="text-gold" aria-hidden>▸</span>
    </button>
  );

  const center: ReactNode =
    view === 'shop' ? <ShopStock vid={vendor} sel={shopSel} onSel={(id) => { setShopSel(id); if (phone) setShopOpen(true); sfx('click'); }} />
      : view === 'quests' ? <VendorQuests vendor={vendor} />
        : view === 'station' && st ? <StationTab id={st} onGo={onGo} />
          : view === 'insure' ? <InsureTab vendor={vendor} />
          : view === 'repair' ? <RepairPanel />
            : view === 'infirmary' ? <InfirmaryPanel />
              : view === 'contracts' ? <ContractsPanel />
                : view === 'scrap' ? <ScrapPanel />
                  : <SellGrids sel={sel} setSel={setSel} marks={marks} setMarks={setMarks} vendor={vendor} />;
  const crafting = (view === 'station' && st !== 'cot') || view === 'scrap';
  const side: ReactNode = view === 'sell'
    ? <Panel className="min-h-0 h-full" bodyClassName="flex flex-col min-h-0" testId="sale-panel">
        <SalePanel vendor={vendor} marks={marks} setMarks={setMarks} onSold={() => setSel(null)} sel={sel} setSel={setSel} />
      </Panel>
    : view === 'shop'
      ? <div className="min-h-0 h-full flex flex-col" style={{ gap: 'var(--gap)' }}>
          <Panel title="Ficha" className="shrink-0" bodyClassName="flex flex-col" testId="shop-card-panel"><ShopCard vid={vendor} itemId={shopSel} /></Panel>
          <Panel title={<>Tu mochila · {profile.backpack.filter((x) => !!x && !isCover(x)).length}/{profile.backpack.length}</>} className="min-h-0 flex-1" bodyClassName="overflow-y-auto scroll-thin"><GridView grid={profile.backpack} container="backpack" cols={layout === 'tablet' ? 4 : 5} equipment={profile.equipment} mode="lobby" /></Panel>
        </div>
    : crafting
      ? <Panel title="Tus materiales" className="min-h-0 h-full" bodyClassName="overflow-y-auto scroll-thin flex flex-col"><Materials /></Panel>
      : <Panel title="Tu mochila" className="min-h-0 h-full" bodyClassName="overflow-y-auto scroll-thin flex flex-col"><BagSummary /></Panel>;

  const tabBar = (
    <div className="vtabs-col" role="tablist" aria-orientation={side_tabs ? 'vertical' : 'horizontal'} data-testid="vendor-tabs">
      {tabs.map((x) => (
        <button key={x} type="button" role="tab" aria-selected={view === x} className={view === x ? 'on' : ''} onClick={() => go(x)} data-testid={`vendor-view-${x}`}>
          <PixelIcon rows={VENDOR_TAB_ICONS[x]} size={24} color={view === x ? '#1a1206' : 'currentColor'} /><span className="vtab-lbl">{label(x)}</span>{x === 'quests' && ready > 0 && <span className="vtab-dot" aria-label="Misión lista">●</span>}
          {x === 'insure' && pend?.kind === 'reforge' && <span className="vtab-dot gold" aria-label={pend.text}>●</span>}{x === 'station' && pend && pend.kind !== 'quest' && pend.kind !== 'reforge' && <span className={`vtab-dot ${pend.kind === 'upgrade' ? 'gold' : ''}`} aria-label={pend.text}>{pend.kind === 'upgrade' ? '▲' : '●'}</span>}
        </button>
      ))}
    </div>
  );
  const backBtn = <button type="button" className="btn vback" onClick={onBack} data-testid="vendor-back">◂ Bastión</button>;
  // En la propia pestaña de la estación no se repite: la acción ya está junto a sus requisitos (18/11)
  const pendBox = pend && !(view === 'station' && pend.kind !== 'quest') && !(view === 'insure' && pend.kind === 'reforge') && (
    <div className="panel p-3 text-left" data-testid="vendor-pending">
      <div className="text-[13px] uppercase tracking-[0.12em] text-stone-400">Pendiente</div>
      <div className="text-[15px] text-parchment mt-1">{pend.kind === 'reforge' ? 'Te ha reforjado piezas que perdiste' : pend.kind === 'quest' ? (ready === 1 ? 'Una misión lista para entregar' : `${ready} misiones listas para entregar`) : pend.kind === 'rebuild' ? `${MODULES[st!].name}: ya puedes reconstruirla` : `${MODULES[st!].name}: mejora disponible`}</div>
      <button className="btn btn-gold w-full mt-2 font-display tracking-[0.1em] uppercase text-xs" style={{ minHeight: 44 }} onClick={() => { if (pend.kind === 'quest') { sfx('click'); onQuests?.(vendor); } else go(pend.kind === 'reforge' ? 'insure' : 'station'); }} data-testid="vendor-pending-go">
        {pend.kind === 'reforge' ? 'Recoger' : pend.kind === 'quest' ? 'Entregar' : pend.kind === 'rebuild' ? 'Reconstruir' : '▲ Mejorar'}
      </button>
    </div>
  );
  const left = (
    <div className="min-h-0 flex flex-col overflow-y-auto scroll-thin" style={{ gap: 'var(--gap)' }} data-testid="vendor-panel">
      <div className="panel vtile vcard shrink-0" style={{ height: layout === 'tablet' ? 300 : 'clamp(220px, 36vh, 380px)', cursor: 'default' }}>
        <span className="vtile-name font-display" data-testid="vendor-name">{v.name}</span>
        <span className="vtile-port"><Bust sprite={v.sprite} /></span>
        <span className="vtile-info">
          {st && <img src={stationIconUrl(st, refugeOf(profile)[st] < 1)} className="pixelated shrink-0" alt="" draggable={false} style={{ width: 40, height: 52 }} />}
          <span className="min-w-0">
            <span className="block text-gold uppercase tracking-[0.12em] text-[13px] truncate">{PLACES[v.place].name}</span>
            <span className="block text-[14px] text-stone-300 leading-snug">{st ? `${MODULES[st].name} · ${refugeOf(profile)[st] < 1 ? 'En ruinas' : `Nv ${refugeOf(profile)[st]}/3`}` : v.role}</span>
          </span>
        </span>
        <span className="vtile-rep"><RepBar rep={rep} />{discount > 0 && <span className="block text-[13px] text-heal mt-0.5">{Math.round(discount * 100)} % de descuento</span>}</span>
      </div>
      {questLink}
      {tabBar}
      {pendBox}
      <button type="button" className="panel vback-card flex-1" onClick={onBack} data-testid="vendor-back">
        <span className="vback-art"><PixelIcon rows={BASTION_SKYLINE} size={layout === 'tablet' ? 96 : 128} color="currentColor" /></span>
        <span className="vback-lbl">{layout === 'tablet' ? '◂ Bastión' : '◂ Volver al Bastión'}</span>
      </button>
    </div>
  );
  const main = <Panel className="min-h-0 flex-1" bodyClassName={`overflow-y-auto scroll-thin ${view === 'sell' ? 'flex flex-col' : ''}`} testId={`vendor-main-${view}`}>{center}</Panel>;
  const pad = { padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))', gap: 'var(--gap)' } as const;

  // Móvil: el cajón lateral solo para vender y para fabricar; la mochila se mira en el Alijo
  const drawer = (crafting || view === 'sell') && !(view === 'station' && st && refugeOf(profile)[st] < 1);
  if (phone) {
    return (
      <div className="h-full flex flex-col relative min-h-0" style={{ ...pad, paddingRight: drawer ? 'calc(max(var(--pad), env(safe-area-inset-right)) + 40px)' : 'max(var(--pad), env(safe-area-inset-right))' }} data-testid="vendor-interior">
        <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: '150px minmax(0,1fr)', gap: 'var(--gap)' }}>
          <div className="min-h-0 flex flex-col overflow-y-auto scroll-thin" style={{ gap: 6 }} data-testid="vendor-panel">
            <div className="flex items-center gap-2 px-1"><MonsterSprite sprite={v.sprite} scale={1} /><span className="font-display text-parchment text-[15px] leading-tight min-w-0" data-testid="vendor-name">{v.name}</span></div>
            {questLink}
            {tabBar}
            <div className="mt-1">{backBtn}</div>
          </div>
          {main}
        </div>
        {shopOpen && shopSel && (
          <div className="fixed inset-0 z-50 bg-black/75 flex fade-in" onMouseDown={(e) => e.target === e.currentTarget && setShopOpen(false)} data-testid="shop-card-overlay">
            <div className="panel m-auto p-4 flex flex-col gap-3" style={{ width: 'min(520px, calc(100% - 24px))', maxHeight: 'calc(100% - 16px)', overflowY: 'auto' }}>
              <ShopCard vid={vendor} itemId={shopSel} />
              <button className="btn text-[15px]" style={{ minHeight: 44 }} onClick={() => setShopOpen(false)} data-testid="shop-card-close">Cerrar</button>
            </div>
          </div>
        )}
        {drawer && <Drawer label={crafting ? 'Materiales' : view === 'sell' ? (marks.length ? `Vender (${marks.length})` : 'A vender') : 'Mochila'} side="right" testId="vendor-side">{side}</Drawer>}
      </div>
    );
  }
  const sideW = layout === 'tablet' ? 260 : 320;
  return (
    <div className="h-full grid" style={{ ...pad, gridTemplateColumns: `${layout === 'tablet' ? 220 : 300}px minmax(0,1fr) ${sideW}px` }} data-testid="vendor-interior">
      {left}
      <div className="min-h-0 flex flex-col" style={{ gap: 'var(--gap)' }}>{side_tabs ? null : <div className="flex items-center gap-2 shrink-0">{backBtn}{tabBar}</div>}{main}</div>
      <div className="min-h-0">{side}</div>
    </div>
  );
}

/** Vender (rediseño 24/11): pestañas Mochila · Almacén · Compartido, barra de filtros y selección rápida.
 *  Tocar un objeto lo marca para vender (y enseña su ficha a la derecha); doble clic lo vende al momento.
 *  Los filtros solo apagan casillas: nada cambia de sitio. Lo marcado se recuerda al cambiar de pestaña o página. */
const markKey = (l: Loc) => (l.kind === 'grid' && (l.container === 'backpack' || l.container === 'stash') ? `${l.container}:${l.index}` : null);
type SellTab = 'backpack' | 'stash' | 'shared';
type Kind = 'all' | 'weapon' | 'armor' | 'jewel' | 'consumable' | 'material' | 'other';
const KIND_LABEL: Record<Kind, string> = { all: 'Todo tipo', weapon: 'Armas', armor: 'Armaduras', jewel: 'Joyas y tesoros', consumable: 'Consumibles', material: 'Materiales', other: 'Otros' };
const kindOf = (itemId: string): Kind => {
  const c = getItem(itemId).category;
  return c === 'weapon' ? 'weapon' : ['shield', 'helmet', 'armor', 'gloves', 'boots'].includes(c) ? 'armor' : ['ring', 'amulet', 'jewel', 'relic', 'key'].includes(c) ? 'jewel'
    : c === 'potion' ? 'consumable' : c === 'material' ? 'material' : 'other';
};
const RAR_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
/** ¿Se puede marcar para vender a este mercader? (null = sí; si no, el motivo). */
function sellBlock(p: Profile, vendor: VendorId, st: ItemStack, container: string): string | null {
  if (isCoins(st)) return 'Las monedas ya son oro.';
  if ((st.gold ?? 0) > 0) return 'Vacía el saco antes de venderlo.';
  if (getItem(st.itemId).recruit) return 'Es equipo de recluta: no se vende.';
  if (container === 'shared') return 'Lo del Compartido no se vende: pásalo antes a tu almacén.';
  if (st.locked) return 'Está protegido: quítale el candado para venderlo.';
  if (!buysThis(vendor, st.itemId, p)) return wrongBuyerText(VENDORS[vendor].name, p, st.itemId);
  return null;
}

function SellGrids({ sel, setSel, marks, setMarks, vendor }: { sel: Loc | null; setSel: (l: Loc | null) => void; marks: string[]; setMarks: (m: string[] | ((m: string[]) => string[])) => void; vendor: VendorId }) {
  const profile = useGame((s) => s.profile)!;
  const stashPage = useGame((s) => s.stashPage);
  const layout = useLayout();
  const phone = layout === 'phone';
  const touchy = useIsTouch();
  const [tab, setTab] = useState<SellTab>('backpack');
  const [onlySell, setOnlySell] = useState(false);
  const [rar, setRar] = useState<string>('all');
  const [kind, setKind] = useState<Kind>('all');
  const pass = (st: ItemStack) => (rar === 'all' || stackRarity(st, getItem(st.itemId)) === rar) && (kind === 'all' || kindOf(st.itemId) === kind)
    && (!onlySell || !sellBlock(profile, vendor, st, 'stash'));
  const filtering = onlySell || rar !== 'all' || kind !== 'all';
  const quick = (l: Loc) => {
    if (l.kind !== 'grid') return;
    const g = l.container === 'backpack' || l.container === 'stash' || l.container === 'shared' ? (l.container === 'shared' ? profile.shared : profile[l.container])?.[l.index] : null;
    const why = g && sellBlock(profile, vendor, g, l.container);
    if (why) { sfx('error'); toast(why, 'info'); return; }
    if (l.container === 'backpack' || l.container === 'stash') { actions.sell(l.container, l.index, true); setMarks((m) => m.filter((k) => k !== markKey(l))); }
  };
  const toggle = (l: Loc) => {
    setSel(l);
    if (l.kind !== 'grid') return;
    const g = l.container === 'shared' ? profile.shared?.[l.index] : l.container === 'backpack' || l.container === 'stash' ? profile[l.container][l.index] : null;
    if (!g) return;
    const why = sellBlock(profile, vendor, g, l.container);
    if (why) { sfx('error'); toast(why, 'info'); return; }
    const k = markKey(l)!;
    sfx('click');
    setMarks((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k]));
  };
  // Soltar un objeto arrastrado sobre la zona de venta lo marca
  useEffect(() => {
    const h = (e: Event) => { const l = (e as CustomEvent<Loc>).detail; setSel(l);
      if (l.kind !== 'grid') return;
      const g = l.container === 'shared' ? profile.shared?.[l.index] : l.container === 'backpack' || l.container === 'stash' ? profile[l.container][l.index] : null;
      const why = g && sellBlock(profile, vendor, g, l.container);
      if (why) { sfx('error'); toast(why, 'info'); return; }
      const k = markKey(l); if (k) setMarks((m) => (m.includes(k) ? m : [...m, k])); };
    window.addEventListener('cr-drop-sell', h); return () => window.removeEventListener('cr-drop-sell', h);
  }, [setMarks, setSel, profile, vendor]);
  const isMarked = (l: Loc) => { const k = markKey(l); return !!k && marks.includes(k); };
  // Selección rápida: solo lo de la pestaña abierta (en el almacén, la página abierta) y lo que pasa el filtro
  const scopeIdx = (): { container: 'backpack' | 'stash'; idx: number[] } | null => {
    if (tab === 'backpack') return { container: 'backpack', idx: profile.backpack.map((_, i) => i) };
    if (tab === 'stash' && stashPage !== 'shared') { const s = pageStart(stashPage); return { container: 'stash', idx: pageSlice(profile.stash, stashPage).map((_, i) => s + i) }; }
    return null;
  };
  const pick = (pred: (st: ItemStack) => boolean) => {
    const sc = scopeIdx(); if (!sc) return;
    const ks = sc.idx.filter((i) => { const st = profile[sc.container][i]; return !!st && !isCover(st) && !sellBlock(profile, vendor, st, sc.container) && pass(st) && pred(st); }).map((i) => `${sc.container}:${i}`);
    sfx('click'); setMarks((m) => [...new Set([...m, ...ks])]);
    if (!ks.length) toast('No hay nada que marcar aquí.', 'info');
  };
  const scope = tab === 'backpack' ? 'mochila' : 'esta página';
  const goTab = (t: SellTab) => { sfx('click'); setTab(t); if (t === 'shared') actions.setStashPage('shared'); else if (t === 'stash' && stashPage === 'shared') actions.setStashPage(0); };
  const H = touchy ? 44 : 36;
  const bagUsed = profile.backpack.some((x) => !!x && !isCover(x));
  return (
    <SellFilter.Provider value={filtering ? pass : null}>
      <div className="flex flex-col min-h-0 flex-1 sell-center" style={{ gap: 8 }} data-testid="sell-grids">
        <div className="flex shrink-0" style={{ gap: 4 }} role="tablist" data-testid="sell-tabs">
          {(['backpack', 'stash', 'shared'] as const).filter((t) => t !== 'shared' || !!profile.shared).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={`pill flex-1 ${tab === t ? 'on' : ''}`} style={{ minHeight: 44 }} onClick={() => goTab(t)} data-testid={`sell-tab-${t}`}>
              {t === 'backpack' ? 'Mochila' : t === 'stash' ? 'Almacén' : 'Compartido'}
              {(() => { const n = marks.filter((k) => k.startsWith(t + ':')).length; return n ? <span className="text-gold ml-1">· {n}</span> : null; })()}
            </button>))}
        </div>
        <div className="flex flex-wrap items-center shrink-0 sell-tools" style={{ gap: 4 }} data-testid="sell-tools">
          <button className={`btn text-xs ${onlySell ? 'btn-gold' : ''}`} style={{ minHeight: H }} aria-pressed={onlySell} onClick={() => { sfx('click'); setOnlySell(!onlySell); }} data-testid="filter-sellable">{onlySell ? '✓ ' : ''}Vendibles</button>
          <select className="btn text-xs" style={{ minHeight: H }} value={rar} onChange={(e) => setRar(e.target.value)} data-testid="filter-rarity" aria-label="Filtrar por rareza">
            <option value="all">Toda rareza</option>{RAR_ORDER.map((r) => <option key={r} value={r}>{RARITY_INFO[r].name}</option>)}
          </select>
          <select className="btn text-xs" style={{ minHeight: H }} value={kind} onChange={(e) => setKind(e.target.value as Kind)} data-testid="filter-kind" aria-label="Filtrar por tipo">
            {(Object.keys(KIND_LABEL) as Kind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
          <span className="flex-1" />
          {tab !== 'shared' && <>
            <button className="btn text-xs" style={{ minHeight: H }} onClick={() => pick(() => true)} data-testid="mark-all" title={`Marca todo lo que compra ${VENDORS[vendor].name} (${scope})`}>Todo lo vendible{phone ? '' : ` (${scope})`}</button>
            <button className="btn text-xs" style={{ minHeight: H }} onClick={() => pick((st) => stackRarity(st, getItem(st.itemId)) === 'common')} data-testid="mark-common" title={`Marca lo común (${scope})`}>Comunes{phone ? '' : ` (${scope})`}</button>
          </>}
          <button className="btn text-xs" style={{ minHeight: H }} disabled={!marks.length} onClick={() => { sfx('click'); setMarks([]); }} data-testid="mark-none" title="Quita todas las marcas, de todas las pestañas">Limpiar</button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          {tab === 'backpack' && (
            <div className="flex flex-col min-h-0 overflow-y-auto scroll-thin items-center">
              <SubHead right={<button className="btn text-xs" style={{ minHeight: H }} onClick={() => { sfx('click'); actions.emptyBackpack(); }} disabled={!bagUsed} data-testid="sell-empty-backpack" title="Pasa todo lo de la mochila al almacén">Vaciar mochila</button>}>Mochila · {profile.backpack.filter((x) => !!x && !isCover(x)).length}/{profile.backpack.length}</SubHead>
              <GridView grid={profile.backpack} container="backpack" cols={6} equipment={profile.equipment} mode="merchant" selected={sel} onSelect={toggle} onQuick={quick} onAlt={quick} marked={isMarked} />
            </div>
          )}
          {tab !== 'backpack' && <StashPanel cols={8} mode="merchant" sel={sel} onSelect={toggle} onQuick={quick} onAlt={quick} testId="sell-stash" marked={isMarked} hideShared={tab === 'stash'} onlyShared={tab === 'shared'} fill />}
        </div>
        <p className="font-body text-[13px] text-stone-400 shrink-0 leading-snug">{touchy ? 'Toca para marcar o arrastra a «A vender».' : 'Clic: marcar · Doble clic: vender al momento · Arrastra a «A vender».'}{tab === 'shared' ? ' Lo del Compartido no se vende: pásalo antes a tu almacén.' : ''}</p>
      </div>
    </SellFilter.Provider>
  );
}

/** Zona de venta: lo marcado (cantidad elegible en las pilas), la ficha del objeto, y abajo, siempre a la vista, el total y el botón. */
function SalePanel({ vendor, marks, setMarks, onSold, sel, setSel }: { vendor: VendorId; marks: string[]; setMarks: (m: string[]) => void; onSold: () => void; sel: Loc | null; setSel: (l: Loc | null) => void }) {
  const profile = useGame((s) => s.profile)!;
  const buyback = useGame((s) => s.buyback);
  const [confirm, setConfirm] = useState(false);
  const [byPrice, setByPrice] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [pop, setPop] = useState<{ n: number; k: number } | null>(null);
  const small = useLayout() === 'phone';
  const drag = useDrag();
  const over = !!drag && !drag.back && drag.over === SELL_DROP;
  let rows = marks.map((k) => {
    const [container, i] = k.split(':') as ['backpack' | 'stash', string];
    const st = profile[container][Number(i)];
    if (!st || isCover(st) || sellBlock(profile, vendor, st, container)) return null;
    const n = Math.max(1, Math.min(st.qty, qty[k] ?? st.qty));
    return { k, container, index: Number(i), st, n, unit: vendorSellPrice(vendor, st.itemId, st), price: vendorSellPrice(vendor, st.itemId, st) * n };
  }).filter((x): x is NonNullable<typeof x> => !!x);
  if (byPrice) rows = [...rows].sort((a, b) => b.price - a.price);
  const total = rows.reduce((t, r) => t + r.price, 0);
  const units = rows.reduce((t, r) => t + r.n, 0);
  const risky = rows.filter((r) => ['epic', 'legendary'].includes(stackRarity(r.st, getItem(r.st.itemId))) || isUpgrade(r.st, profile.equipment, profile.character));
  const setN = (k: string, max: number, v: number) => setQty((q) => ({ ...q, [k]: Math.max(1, Math.min(max, Math.floor(v) || 1)) }));
  const doSell = () => {
    const got = actions.sellMany(rows.map((r) => ({ container: r.container, index: r.index, qty: r.n < r.st.qty ? r.n : undefined })), true);
    setMarks([]); setQty({}); setConfirm(false); onSold();
    if (got > 0) setPop({ n: got, k: Date.now() });
  };
  useEffect(() => { if (!pop) return; const t = window.setTimeout(() => setPop(null), 900); return () => window.clearTimeout(t); }, [pop]);
  const label = rows.length ? `Vender ${rows.length === 1 ? '1 objeto' : `${rows.length} objetos`} · ${total} oro` : 'Marca lo que quieras vender';
  return (
    <div className="flex flex-col min-h-0 h-full" data-testid="sale-zone">
      <div className="flex items-center justify-between gap-2 shrink-0 mb-2">
        <span className="font-display text-gold tracking-[0.1em] uppercase text-[15px]" data-testid="sale-title">A vender{rows.length ? ` · ${rows.length}` : ''}</span>
        {rows.length > 1 && <button className="btn text-xs" style={{ minHeight: 36 }} aria-pressed={byPrice} onClick={() => { sfx('click'); setByPrice(!byPrice); }} data-testid="sale-sort">{byPrice ? '✓ ' : ''}Por precio</button>}
      </div>
      <div className={`sell-drop border-2 border-dashed border-stone-700 p-2 min-h-[64px] flex-1 overflow-y-auto scroll-thin ${over ? 'drag-over' : ''}`} style={{ flexBasis: 0 }} data-drop={SELL_DROP}>
        {rows.length ? (
          <ul className="text-[14px]" data-testid="sale-rows">{rows.map((r) => (
            <li key={r.k} className={`sale-row ${small ? 'flex-wrap' : ''} ${sel && markKey(sel) === r.k ? 'on' : ''}`} data-testid="sale-row">
              <button className="flex items-center gap-2 flex-1 min-w-0 text-left" style={{ minHeight: 36 }} onClick={() => setSel({ kind: 'grid', container: r.container, index: r.index })}>
                <ItemIcon itemId={r.st.itemId} size={24} />
                <span className="flex-1 truncate" style={{ color: RARITY_INFO[stackRarity(r.st, getItem(r.st.itemId))].color }}>{getItem(r.st.itemId).name}</span>
              </button>
              {r.st.qty > 1 && (
                <span className={`flex items-center shrink-0 ${small ? 'w-full justify-end order-last' : ''}`} data-testid="sale-qty">
                  <button className="qbtn" onClick={() => setN(r.k, r.st.qty, r.n - 1)} aria-label="Una menos" disabled={r.n <= 1}>−</button>
                  <input className="qin" type="number" min={1} max={r.st.qty} value={r.n} onChange={(e) => setN(r.k, r.st.qty, Number(e.target.value))} aria-label="Unidades" data-testid="sale-qty-input" />
                  <button className="qbtn" onClick={() => setN(r.k, r.st.qty, r.n + 1)} aria-label="Una más" disabled={r.n >= r.st.qty}>+</button>
                  <button className="qbtn w" onClick={() => setN(r.k, r.st.qty, r.n === r.st.qty ? 1 : r.st.qty)} title={r.n === r.st.qty ? 'Vender solo una' : 'Vender todas'} data-testid="sale-qty-all">{r.n === r.st.qty ? '1' : `×${r.st.qty}`}</button>
                </span>
              )}
              <span className="text-gold shrink-0 text-right" style={{ minWidth: 34 }}>{r.price}</span>
              <button className="qbtn x" onClick={() => setMarks(marks.filter((x) => x !== r.k))} aria-label="Quitar de la venta" data-testid="sale-remove">✕</button>
            </li>))}</ul>
        ) : !buyerOpen(profile, vendor)
          ? <p className="text-[14px] text-center py-3" style={{ color: '#e0a060' }} data-testid="sell-closed">{VENDORS[vendor].name} aún no compra: reconstruye su estación. Mientras, lo compra Nira en El Mercado.</p>
          : <p className="text-[13px] text-stone-400 italic text-center py-3">Toca objetos para marcarlos o arrástralos aquí.</p>}
        {buyback.length > 0 && (
          <div className="mt-3 pt-2 border-t border-stone-800" data-testid="buyback">
            <div className="text-[12px] tracking-[0.15em] uppercase text-stone-400 mb-1">Recomprar (mientras sigas aquí)</div>
            {buyback.map((b, i) => (
              <button key={i} className="w-full flex items-center gap-2 text-[14px] py-1 hover:bg-[#15131a]" style={{ minHeight: 36 }} onClick={() => actions.buyBack(i)} data-testid={`buyback-${i}`}>
                <ItemIcon itemId={b.stack.itemId} size={20} /><span className="flex-1 text-left truncate">{getItem(b.stack.itemId).name}{b.stack.qty > 1 ? ` ×${b.stack.qty}` : ''}</span><span className="text-gold">↺ {b.price}</span>
              </button>))}
          </div>
        )}
      </div>
      {sel && <div className="panel p-2 mt-2 shrink-0 overflow-y-auto scroll-thin" style={{ maxHeight: small ? '22%' : '34%' }} data-testid="sale-inspect"><ItemCard loc={sel} mode="merchant" onClear={() => setSel(null)} compact stacked /></div>}
      <div className={`sale-foot shrink-0 border-t border-stone-700 relative ${small ? 'mt-1 pt-1' : 'mt-2 pt-2'}`} data-testid="sale-foot">
        {small ? (
          <div className="flex justify-between items-baseline text-[13px] text-stone-300"><span>Oro {profile.gold} → <b className="text-gold" data-testid="sale-after">{profile.gold + total}</b></span><span className="font-display text-gold text-[16px]" data-testid="sale-total">+{total} oro</span></div>
        ) : <>
          <div className="flex justify-between text-[14px] text-stone-300"><span>Objetos</span><span>{rows.length}{units !== rows.length ? ` (${units} uds.)` : ''}</span></div>
          <div className="flex justify-between text-[14px] text-stone-300"><span>Oro actual</span><span>{profile.gold}</span></div>
          <div className="flex justify-between font-display text-parchment text-[17px]"><span>Total</span><span className="text-gold" data-testid="sale-total">+{total} oro</span></div>
          <div className="flex justify-between text-[14px] text-stone-300"><span>Después de vender</span><span className="text-gold" data-testid="sale-after">{profile.gold + total}</span></div>
        </>}
        <button className={`btn btn-gold w-full font-display uppercase tracking-[0.08em] ${small ? 'mt-1' : 'mt-2'}`} style={{ minHeight: small ? 44 : 48 }} disabled={!rows.length} onClick={() => (risky.length ? setConfirm(true) : doSell())} data-testid="btn-sell-marked">{label}</button>
        {pop && <span key={pop.k} className="sale-pop" aria-live="polite" data-testid="sale-pop">+{pop.n} oro</span>}
      </div>
      {confirm && (
        <Modal onClose={() => setConfirm(false)} testId="confirm-sell">
          <h2 className="panel-title text-lg mb-2">¿Vender también esto?</h2>
          <p className="font-body text-lg">Entre lo marcado hay {risky.length === 1 ? 'algo épico, legendario o mejor que lo que llevas' : `${risky.length} objetos épicos, legendarios o mejores que lo que llevas`}: {risky.slice(0, 4).map((r) => getItem(r.st.itemId).name).join(', ')}{risky.length > 4 ? '…' : ''}.</p>
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
        <div className="grid gap-1.5 mx-auto" style={{ gridTemplateColumns: 'repeat(4, var(--slot))', ['--slot' as string]: '64px' }} data-testid="forge-materials">
          {ids.map((id) => <div key={id} className="slot" title={getItem(id).name}><ItemIcon itemId={id} /><span className="qty">{owned(profile, id)}</span></div>)}
        </div>
      ) : <p className="font-body text-stone-400 italic">Aún no tienes materiales. Pica vetas en las mazmorras.</p>}
      <div className="flex-1" />
      <div className="panel p-3 mt-3 flex justify-between items-center"><span className="text-stone-300 text-sm">Oro</span><GoldAmount value={profile.gold} /></div>
    </>
  );
}
