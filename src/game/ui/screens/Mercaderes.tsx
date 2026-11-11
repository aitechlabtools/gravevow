// Bastión (antes «Mercaderes»). Fuera: los ocho mercaderes, cada uno en su lugar (cocina, enfermería, forja…), con su
// retrato, rango, barra de reputación, misiones listas y servicios; los que aún no han llegado dicen cuándo llegan. El
// catre está en la cabecera. Al hablar: tres zonas: el mercader y sus servicios · el servicio elegido · tu mochila, tus materiales o la
// ficha del objeto que vas a vender. La forja (Maese Brand) y los contratos (Grizk) viven dentro de su mercader.
// En móvil, la tercera zona va en un cajón por la derecha.
import { StashPanel } from '../StashPanel';
import { useEffect, useState, type ReactNode, useCallback } from 'react';
import { actions, useGame } from '../../state/store';
import { PLACES, VENDORS, VENDOR_ORDER, type VendorId } from '../../../core/data/vendors';
import { vendorLockText, vendorUnlocked } from '../../../core/vendors';
import { QUESTS } from '../../../core/data/quests';
import { needsOf } from '../../../core/needs';
import { canSleepForPrep } from '../../../core/refuge';
import { REP_RANKS, rankOf } from '../../../config/reputation';
import { readyQuestCount } from '../../../core/quests';
import { getItem } from '../../../core/data/items';
import { owned } from '../../../core/forge';
import type { Loc } from '../../../core/inventory';
import { MonsterSprite, GoldAmount, Modal } from '../common';
import { GridView, ItemIcon, isUpgrade } from '../inventory';
import { useDrag, useClearOnDrop } from '../pointerDrag';
import { useIsTouch } from '../../../shared/device';
import { buysThis, vendorSellPrice } from '../../../core/economy';
import { isCover } from '../../../core/inventory';
import { isCoins } from '../../../core/gold';
import { stackRarity } from '../../../core/data/rarity';
import { RARITY_INFO } from '../../../core/data/items';
import type { ItemStack } from '../../../core/types';
import { RepBar, ShopStock, VendorQuests, type VendorTarget, type VendorView } from '../VendorsTab';
import { ForgePanel } from '../ForgePanel';
import { RepairPanel } from '../RepairPanel';
import { InfirmaryPanel } from '../InfirmaryPanel';
import { ContractsPanel } from '../ContractsPanel';
import { CookPanel, RefugePanel, ScrapPanel } from '../RefugePanels';
import { ItemCard } from './ItemCard';
import { Card, Drawer, Panel, SubHead, usePixelScale } from '../kit';
import { useLayout } from '../../../config/ui';
import { sfx } from '../../audio';

const VIEW_LABEL: Record<VendorView, string> = { shop: 'Tienda', quests: 'Misiones', sell: 'Vender', forge: 'Forja', repair: 'Reparar', contracts: 'Contratos', infirmary: 'Enfermería', cook: 'Cocina', scrap: 'Desguace' };

function servicesOf(id: VendorId): VendorView[] {
  const v: VendorView[] = ['shop'];
  if (QUESTS.some((q) => q.vendor === id)) v.push('quests');
  if (VENDORS[id].buysItems) v.push('sell');
  if (id === 'grizk') v.push('contracts');
  if (id === 'brand') v.push('forge');
  if (id === 'brand' || id === 'nira' || id === 'orik') v.push('repair');
  if (id === 'vesper') v.push('infirmary');
  if (id === 'garth') v.push('cook');
  if (id === 'orik') v.push('scrap');
  return v;
}
/** El servicio propio de cada mercader (se resalta en su tarjeta). */
const SPECIAL: Partial<Record<VendorId, VendorView>> = { grizk: 'contracts', brand: 'forge', nira: 'sell', vesper: 'infirmary', orik: 'scrap', garth: 'cook' };

export function Mercaderes({ target, onConsumed }: { target: VendorTarget | null; onConsumed: () => void }) {
  const [open, setOpen] = useState<VendorTarget | null>(target);
  useEffect(() => { if (target) { setOpen(target); onConsumed(); } }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  const profile = useGame((s) => s.profile)!;
  const [refuge, setRefuge] = useState(false);
  if (refuge && !open) return <RefugePanel onBack={() => { setRefuge(false); sfx('click'); }} />;
  return open && vendorUnlocked(profile, open.vendor)
    ? <VendorInterior vendor={open.vendor} initial={open.view} onBack={() => { setOpen(null); sfx('click'); }} />
    : <VendorCards onTalk={(vendor) => { setOpen({ vendor, view: 'shop' }); sfx('click'); }} onRefuge={() => { setRefuge(true); sfx('click'); }} />;
}

function VendorCards({ onTalk, onRefuge }: { onTalk: (v: VendorId) => void; onRefuge: () => void }) {
  const profile = useGame((s) => s.profile)!;
  const scale = usePixelScale('vendor');
  const needs = needsOf(profile.needs);
  const cols = 4;
  return (
    <div className="h-full overflow-y-auto scroll-thin" style={{ padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))' }} data-testid="screen-merchants">
      <div className="min-h-full flex flex-col items-center justify-center">
      <div className="w-full max-w-[1200px] flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="ui-ptitle border-0 !text-[clamp(14px,1.8vw,26px)] !tracking-[0.18em] !m-0">El Bastión</h2>
        <div className="flex items-center gap-2" data-testid="bastion-cot">
          <span className="text-[12px] text-stone-300">Barracones · Descanso {Math.round(needs.rest)}</span>
          <button className="btn text-xs" style={{ minHeight: 44 }} onClick={() => { actions.sleepCot(); sfx('click'); }} disabled={needs.rest >= 100 && !canSleepForPrep(profile)} title="Descanso a 100, gratis" data-testid="btn-cot">Dormir en el catre</button>
          <button className="btn btn-gold text-xs" style={{ minHeight: 44 }} onClick={onRefuge} data-testid="btn-refuge">Tu Refugio</button>
        </div>
      </div>
      <div className="grid w-full max-w-[1200px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: 'var(--gap)' }} data-testid="vendor-list">
        {VENDOR_ORDER.map((id) => {
          const v = VENDORS[id];
          const here = vendorUnlocked(profile, id);
          const rep = profile.reputation[id] ?? 0;
          const ready = here ? readyQuestCount(profile, id) : 0;
          const special = SPECIAL[id];
          return (
            <Card key={id} title={v.name} badge={ready} testId={`vendor-card-${id}`} className={here ? '' : 'opacity-60'}
              art={<div className="pb-2 pt-4" style={here ? undefined : { filter: 'grayscale(1) brightness(0.5)' }}><MonsterSprite sprite={v.sprite} scale={scale} /></div>}>
              <div className="text-center text-[11px] uppercase tracking-[0.12em] text-stone-400" data-testid={`vendor-place-${id}`}>{PLACES[v.place].name}</div>
              <div className="text-center text-[12px]" style={{ color: v.color }}>{v.role}</div>
              {here ? <>
                <RepBar rep={rep} />
                <div className="flex flex-wrap justify-center gap-1">
                  {servicesOf(id).map((s) => <span key={s} className={`ui-tag ${s === special ? 'on' : ''}`}>{VIEW_LABEL[s]}</span>)}
                </div>
                <button className="btn w-full mt-auto font-display tracking-[0.12em] uppercase" style={{ minHeight: 'var(--btn-h)' }}
                  onClick={() => onTalk(id)} data-testid={`vendor-${id}`}>Hablar</button>
              </> : <p className="text-center text-[12px] text-stone-400 italic mt-auto" data-testid={`vendor-lock-${id}`}>{vendorLockText(id)}</p>}
            </Card>
          );
        })}
      </div>
      </div>
    </div>
  );
}

function VendorInterior({ vendor, initial, onBack }: { vendor: VendorId; initial: VendorView; onBack: () => void }) {
  const profile = useGame((s) => s.profile)!;
  const layout = useLayout();
  const phone = layout === 'phone';
  const scale = usePixelScale('vendor');
  const [view, setView] = useState<VendorView>(initial);
  const [sel, setSel] = useState<Loc | null>(null);
  useClearOnDrop(useCallback(() => setSel(null), []));
  const [marks, setMarks] = useState<string[]>([]);
  const v = VENDORS[vendor];
  const rep = profile.reputation[vendor] ?? 0;
  const rank = rankOf(rep);
  const discount = REP_RANKS[rank].discount;
  const go = (x: VendorView) => { setView(x); setSel(null); setMarks([]); sfx('click'); };
  // Quién compra al vender (Grizk solo joyas y tesoros, y paga mejor)
  useEffect(() => { actions.setActiveVendor(vendor); return () => actions.setActiveVendor(null); }, [vendor]);

  const title = view === 'cook' ? `Cocina de ${v.name}` : view === 'scrap' ? `Desguace de ${v.name}` : view === 'forge' ? `Forja de ${v.name}` : view === 'repair' ? `Yunque de ${v.name}` : view === 'infirmary' ? `Enfermería de ${v.name}` : view === 'contracts' ? 'Contratos de Grizk' : view === 'sell' ? `Vender a ${v.name}` : view === 'quests' ? `Encargos de ${v.name}` : `Tienda de ${v.name}`;
  const center: ReactNode =
    view === 'shop' ? <ShopStock vid={vendor} cols={`grid gap-2 ${phone ? 'grid-cols-1' : 'grid-cols-2 2xl:grid-cols-3'}`} />
      : view === 'quests' ? <VendorQuests vendor={vendor} />
        : view === 'forge' ? <ForgePanel />
          : view === 'repair' ? <RepairPanel />
          : view === 'infirmary' ? <InfirmaryPanel />
          : view === 'contracts' ? <ContractsPanel />
          : view === 'cook' ? <CookPanel />
          : view === 'scrap' ? <ScrapPanel />
            : <SellGrids sel={sel} setSel={setSel} marks={marks} setMarks={setMarks} vendor={vendor} />;
  const side: ReactNode = view === 'sell'
    ? <Panel title="A vender" className="min-h-0 h-full" bodyClassName="overflow-y-auto scroll-thin flex flex-col" testId="sale-panel">
        <SalePanel vendor={vendor} marks={marks} setMarks={setMarks} onSold={() => setSel(null)} />
        <div className="panel p-3 mt-3"><ItemCard loc={sel} mode="merchant" onClear={() => setSel(null)} compact /></div>
      </Panel>
    : view === 'forge' || view === 'scrap' || view === 'cook'
      ? <Panel title="Tus materiales" className="min-h-0 h-full" bodyClassName="overflow-y-auto scroll-thin flex flex-col"><Materials /></Panel>
      : <Panel title="Tu mochila" className="min-h-0 h-full" bodyClassName="overflow-y-auto scroll-thin flex flex-col"><BagSummary /></Panel>;

  const left = (
    <Panel className="min-h-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col" testId="vendor-panel">
      <div className="ui-arch shrink-0" style={{ height: 26 * (phone ? 2 : scale) + (phone ? 14 : 30) }}><div className="pb-1"><MonsterSprite sprite={v.sprite} scale={phone ? 2 : scale} /></div></div>
      <div className="text-center font-display text-parchment mt-2" data-testid="vendor-name">{v.name}</div>
      <div className="text-center text-[12px]" style={{ color: v.color }}>{v.role}</div>
      {!phone && <p className="font-body italic text-stone-300 text-center text-[15px] leading-snug mt-2">«{v.blurb}»</p>}
      <div className="mt-2"><RepBar rep={rep} /></div>
      {discount > 0 && <div className="text-[11px] text-heal mt-0.5">{Math.round(discount * 100)} % de descuento por tu reputación</div>}
      <div className="flex flex-col gap-2 mt-3">
        {servicesOf(vendor).map((s) => (
          <button key={s} className={`btn font-display tracking-[0.1em] uppercase ${view === s ? 'btn-gold' : ''}`} style={{ minHeight: 'var(--btn-h)' }} onClick={() => go(s)} data-testid={`vendor-view-${s}`}>{VIEW_LABEL[s]}</button>
        ))}
        <button className="btn font-display tracking-[0.1em] uppercase" style={{ minHeight: 'var(--btn-h)' }} onClick={onBack} data-testid="vendor-back">◂ Volver</button>
      </div>
    </Panel>
  );
  const main = <Panel title={title} className="min-h-0" bodyClassName={`overflow-y-auto scroll-thin ${view === 'sell' ? 'flex flex-col' : ''}`} testId={`vendor-main-${view}`}>{center}</Panel>;
  const pad = { padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))', gap: 'var(--gap)' } as const;

  if (phone) {
    return (
      <div className="h-full grid relative" style={{ ...pad, gridTemplateColumns: '170px minmax(0,1fr)', paddingRight: 'calc(max(var(--pad), env(safe-area-inset-right)) + 40px)' }} data-testid="vendor-interior">
        {left}{main}
        <Drawer label={view === 'forge' || view === 'scrap' || view === 'cook' ? 'Materiales' : view === 'sell' ? (marks.length ? `Vender (${marks.length})` : 'A vender') : 'Mochila'} side="right" testId="vendor-side">{side}</Drawer>
      </div>
    );
  }
  const sideW = layout === 'tablet' ? 260 : 320;
  return (
    <div className="h-full grid" style={{ ...pad, gridTemplateColumns: `${layout === 'tablet' ? 220 : 300}px minmax(0,1fr) ${sideW}px` }} data-testid="vendor-interior">
      {left}{main}<div className="min-h-0">{side}</div>
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
