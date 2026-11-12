// Intendencia (antes «Alijo»). Vista «Equipo»: Aventurero · Equipo (equipamiento, mochila y bolsillo seguro) · Almacén.
// Vista «Estado»: heridas y necesidades con la mochila al lado; curarte con tus objetos sin pagar a Vesper.
// Mover objetos: arrastrar (ordenador), o tocar un objeto (se abre su ficha) y después tocar una casilla libre.
// En móvil no caben las tres columnas: segmentos «Equipo», «Almacén» y «Estado».
import { useState, useCallback, useEffect } from 'react';
import { actions, useGame } from '../../state/store';
import { CLASSES } from '../../../core/data/classes';
import { computeStats, baseStats } from '../../../core/stats';
import { getItem } from '../../../core/data/items';
import { gridValue, equippedValue, isCover, type Loc } from '../../../core/inventory';
import { stackRarity } from '../../../core/data/rarity';
import { useIsTouch } from '../../../shared/device';
import { StashPanel } from '../StashPanel';
import { gridGold } from '../../../core/gold';
import { BAG_SIZES } from '../../../config/gold';
import { ItemIcon } from '../inventory';
import { dragJustEnded, useDrag, useClearOnDrop } from '../pointerDrag';

const BAG_DROP = JSON.stringify({ type: 'bag' });
import { Modal } from '../common';
import type { EquipSlot, ItemStack } from '../../../core/types';
import { CarryBar } from '../CarryBar';
import { ItemSlot, GridView, StatsList, SLOT_LABELS, highlightItems, type InvMode } from '../inventory';
import { PlayerSprite, GoldAmount } from '../common';
import { Panel, SubHead, Segmented, usePixelScale } from '../kit';
import { BodyPanel } from '../BodyFigure';
import { NeedsPanel } from '../NeedsBars';
import { needsOf } from '../../../core/needs';
import { CureOffer, useCure } from '../CureOffer';
import { RecruitOffer } from '../RecruitOffer';
import { baseBody } from '../../state/medicalActions';
import { useLayout } from '../../../config/ui';
import { ItemCard } from './ItemCard';
import { sfx } from '../../audio';
import { SkinSlot, SkinPicker } from './Atuendos';

const SLOT_ICON: Record<EquipSlot, string> = { mainHand: 'sword', offHand: 'shield', helmet: 'helm', armor: 'tunic', gloves: 'gloves', boots: 'boots', ring: 'ring', amulet: 'amulet' };
const MODE: InvMode = 'lobby';

export function Alijo({ onDetails, onShop }: { onDetails: () => void; onShop?: () => void }) {
  const profile = useGame((s) => s.profile)!;
  const layout = useLayout();
  const phone = layout === 'phone';
  const [sel, setSel] = useState<Loc | null>(null);
  useClearOnDrop(useCallback(() => setSel(null), []));
  const [view, setView] = useState<'gear' | 'storage' | 'status'>('gear');
  useEffect(() => { if (view === 'status') actions.tutorialEvent('stash:status'); }, [view]);
  const [picker, setPicker] = useState(false);
  const clear = () => setSel(null);
  const same = (a: Loc | null, b: Loc) => !!a && JSON.stringify(a) === JSON.stringify(b);

  // Tocar un objeto lo elige (o lo suelta si ya estaba elegido); tocar una casilla libre lleva allí el elegido.
  const onSelect = (l: Loc) => {
    // Con un objeto de la mochila o del almacén elegido, tocar una ranura de equipo ocupada lo equipa ahí (cambia lo puesto)
    if (sel && sel.kind === 'grid' && l.kind === 'equip') { actions.transfer(sel, l); clear(); return; }
    setSel(same(sel, l) ? null : l); sfx('click');
  };
  const onEmpty = (l: Loc) => { if (!sel) return; actions.transfer(sel, l); clear(); };
  // Doble toque o doble clic: equipar, comer o beber, o mandar al almacén
  const quickFromBag = (l: Loc, s: ItemStack) => { const d = getItem(s.itemId); (d.slot ? actions.quickEquip(l) : d.use?.kind === 'need' ? actions.eat(l) : actions.quickMove(l, 'stash')); clear(); };
  // «Tienes comida en la mochila»: si estás en Estado, vuelve a Equipo para ver la mochila resaltada
  useEffect(() => {
    const h = (e: Event) => {
      if (document.querySelector('[data-testid=alijo-backpack]')) return;
      const ids = (e as CustomEvent<string[]>).detail;
      setView('gear'); window.setTimeout(() => highlightItems(ids), 120);
    };
    window.addEventListener('gv-hint-items', h); return () => window.removeEventListener('gv-hint-items', h);
  }, []);
  const grids = { equipment: profile.equipment, mode: MODE, selected: sel, onSelect, onEmpty };
  // Vaciar la mochila: pide confirmación solo si hay algo raro o mejor
  const touchy = useIsTouch();
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const bagItems = profile.backpack.filter((x): x is ItemStack => !!x && !isCover(x));
  const bagUsed = bagItems.length > 0;
  const hasMaterials = bagItems.some((x) => getItem(x.itemId).category === 'material');
  const valuable = bagItems.filter((x) => ['rare', 'epic', 'legendary'].includes(stackRarity(x, getItem(x.itemId))));
  const askEmpty = () => { sfx('click'); if (valuable.length) setConfirmEmpty(true); else { actions.emptyBackpack(); clear(); } };
  const emptyModal = confirmEmpty && (
    <Modal onClose={() => setConfirmEmpty(false)} testId="confirm-empty">
      <h2 className="panel-title text-lg mb-2">¿Vaciar la mochila?</h2>
      <p className="font-body text-lg">Todo pasa al almacén, también {valuable.length === 1 ? 'un objeto valioso' : `${valuable.length} objetos valiosos`}: {valuable.slice(0, 3).map((x) => getItem(x.itemId).name).join(', ')}{valuable.length > 3 ? '…' : ''}.</p>
      <p className="text-sm text-stone-400 mt-1">El equipo puesto y el bolsillo seguro no se tocan.</p>
      <div className="flex gap-2 mt-4"><button className="btn btn-gold" style={{ minHeight: 44 }} onClick={() => { actions.emptyBackpack(); setConfirmEmpty(false); clear(); }} data-testid="btn-confirm-empty">Vaciar</button>
        <button className="btn" style={{ minHeight: 44 }} onClick={() => setConfirmEmpty(false)}>Cancelar</button></div>
    </Modal>
  );

  const equipment = (
    <EquipmentGrid sel={sel} onSelect={onSelect} onEmpty={onEmpty} onDone={clear} onSkin={() => setPicker(true)} />
  );
  const pickerModal = <>{picker && <SkinPicker onClose={() => setPicker(false)} onShop={onShop} />}{emptyModal}</>;
  const backpack = (
    <div data-testid="alijo-backpack">
      <SubHead right={<span className="flex gap-1">
        <button className="btn text-xs" onClick={() => actions.groupGold('backpack')} data-testid="group-gold-backpack" title="Mete las monedas sueltas en tus saquitos y sacos">Agrupar oro</button>
        <button className="btn text-xs" onClick={() => actions.sortContainer('backpack')} data-testid="sort-backpack">Ordenar</button></span>}>
        Mochila · {profile.backpack.filter(Boolean).length}/{profile.backpack.length}
      </SubHead>
      <GridView grid={profile.backpack} container="backpack" cols={6} {...grids} onQuick={quickFromBag} onAlt={(l) => { actions.quickMove(l, 'stash'); clear(); }} />
      <CarryBar className="mt-1.5" />
      <div className="flex gap-1 mt-1.5" data-testid="backpack-quick">
        <button className="btn text-xs flex-1" style={{ minHeight: touchy ? 44 : 34 }} onClick={askEmpty} disabled={!bagUsed} data-testid="empty-backpack" title="Pasa todo lo de la mochila al almacén (no toca el equipo ni el bolsillo seguro)">Vaciar mochila</button>
        <button className="btn text-xs flex-1" style={{ minHeight: touchy ? 44 : 34 }} onClick={() => { actions.emptyBackpack(true); clear(); }} disabled={!hasMaterials} data-testid="store-materials" title="Manda minerales y materiales al almacén">Guardar materiales</button>
      </div>
      {gridGold(profile.backpack) > 0 && (
        <div className="flex items-center justify-between text-xs mt-1.5" data-testid="gold-carried"><span className="text-stone-300">Oro encima (se pierde si mueres)</span><span className="font-display text-ember">{gridGold(profile.backpack)}</span></div>
      )}
    </div>
  );
  const pocket = (
    <div className="mt-3" data-testid="alijo-pocket">
      <SubHead right={<span className="text-[11px] text-heal" data-testid="pocket-gold">{gridGold(profile.pocket) > 0 ? `oro a salvo: ${gridGold(profile.pocket)}` : 'no se pierde al morir'}</span>}>Bolsillo seguro · {profile.pocket.filter(Boolean).length}/{profile.pocket.length}</SubHead>
      <GridView grid={profile.pocket} container="pocket" cols={3} {...grids} onQuick={(l) => { actions.quickMove(l, 'backpack'); clear(); }} />
    </div>
  );
  // El almacén tiene 8 columnas en todos los formatos (los objetos de 2×2 necesitan la misma forma siempre)
  const stashCols = 8;
  const storage = (
    <StashPanel cols={stashCols} sel={sel} onSelect={onSelect} onEmpty={onEmpty}
      onQuick={(l, st) => { if (getItem(st.itemId).use?.kind === 'need') actions.eat(l); else actions.quickMove(l, 'backpack'); clear(); }} onAlt={(l) => { actions.quickMove(l, 'backpack'); clear(); }} />
  );
  const card = <ItemCard loc={sel} mode={MODE} onClear={clear} compact={phone} />;
  const status = <StatusView withNeeds={phone} />;
  const seg = (opts: { id: 'gear' | 'storage' | 'status'; label: string }[]) => (
    <Segmented options={opts} value={view} onChange={(v) => { setView(v); setSel(null); sfx('click'); }} testId="alijo-seg" />
  );

  if (phone) {
    return (
      <div className="h-full flex flex-col items-center" style={{ padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))', gap: 'var(--gap)' }} data-testid="screen-stash">
        {seg([{ id: 'gear', label: 'Equipo' }, { id: 'storage', label: 'Almacén' }, { id: 'status', label: 'Estado' }])}
        <div className="flex-1 min-h-0 w-full flex justify-center" style={{ gap: 'var(--gap)' }}>
          {view === 'status' ? (
            <>
              <Panel className="min-h-0 flex-[3]" bodyClassName="overflow-y-auto scroll-thin">{status}</Panel>
              <Panel className="min-h-0 flex-[2]" bodyClassName="overflow-y-auto scroll-thin">{backpack}</Panel>
            </>
          ) : view === 'gear' ? (
            <>
              <Panel className="min-h-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col items-center"><RecruitOffer />{equipment}</Panel>
              <Panel className="min-h-0" bodyClassName="overflow-y-auto scroll-thin">{backpack}{pocket}</Panel>
            </>
          ) : (
            <>
              <Panel className="min-h-0" bodyClassName="overflow-y-auto scroll-thin">{backpack}</Panel>
              {storage}
            </>
          )}
        </div>
        {pickerModal}
        {sel && (
          <div className="absolute left-0 right-0 bottom-0 z-30 panel panel-gold p-3" style={{ paddingLeft: 'max(12px, env(safe-area-inset-left))', paddingRight: 'max(12px, env(safe-area-inset-right))' }} data-testid="item-sheet">
            <button className="btn icon-btn absolute right-2 top-2" onClick={clear} aria-label="Cerrar la ficha">✕</button>
            <div className="pr-12">{card}</div>
          </div>
        )}
      </div>
    );
  }

  const side = layout === 'tablet' ? 288 : 340;
  const deskSeg = <div className="flex justify-center shrink-0">{seg([{ id: 'gear', label: 'Equipo' }, { id: 'status', label: 'Estado' }])}</div>;
  const padX = { padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))', gap: 'var(--gap)' } as const;
  if (view !== 'gear') {
    return (
      <div className="h-full flex flex-col" data-testid="screen-stash" style={padX}>
        {deskSeg}
        <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: `${side}px minmax(0,1fr) ${layout === 'tablet' ? 300 : 360}px`, gap: 'var(--gap)' }}>
          <Panel title="Aventurero" className="min-h-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col" testId="alijo-hero"><HeroColumn onDetails={onDetails} needs /></Panel>
          <Panel title="Heridas" className="min-h-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col">{status}</Panel>
          <Panel title="Mochila" className="min-h-0" bodyClassName="overflow-y-auto scroll-thin">{backpack}{sel && <div className="panel p-3 mt-3">{card}</div>}</Panel>
        </div>
        {pickerModal}
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col" data-testid="screen-stash" style={padX}>
    {deskSeg}
    <div className="flex-1 min-h-0 grid"
      style={{ gridTemplateColumns: `${side}px minmax(0,1fr) auto`, gap: 'var(--gap)' }}>
      <Panel title="Aventurero" className="min-h-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col" testId="alijo-hero">
        <HeroColumn onDetails={onDetails} />
      </Panel>
      <Panel title="Equipo" className="min-h-0" bodyClassName="min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto scroll-thin">
          <div className="mb-3"><RecruitOffer /></div>
          <div className="w-fit mx-auto">
            <div className="flex justify-center mb-4">{equipment}</div>
            {backpack}
            {pocket}
          </div>
        </div>
        {/* En tableta, la ficha solo aparece al elegir un objeto: así cabe la mochila y el bolsillo */}
        {(sel || layout === 'desktop') && <div className="flex mt-3 shrink-0" style={{ gap: 'var(--gap)' }}>
          <div className="panel p-3 flex-1 min-w-0">{card}</div>
          {layout === 'desktop' && (
            <div className="panel p-3 w-44 shrink-0 flex flex-col justify-center gap-1 text-sm">
              <div className="flex justify-between items-center"><span className="text-stone-300">Oro</span><GoldAmount value={profile.gold} /></div>
              <div className="flex justify-between"><span className="text-stone-300">En riesgo</span><span className="text-ember">{gridValue(profile.backpack) + equippedValue(profile.equipment)}</span></div>
            </div>
          )}
        </div>}
      </Panel>
      {storage}
      {pickerModal}
    </div>
    </div>
  );
}

/** Equipamiento en tres columnas: arma (grande) y manos · cabeza, torso y pies · secundaria (grande), amuleto y anillo. */
function EquipmentGrid({ sel, onSelect, onEmpty, onDone, onSkin }: { sel: Loc | null; onSelect: (l: Loc) => void; onEmpty: (l: Loc) => void; onDone: () => void; onSkin: () => void }) {
  const eq = useGame((s) => s.profile!.equipment);
  const prof = useGame((s) => s.profile!);
  // Objeto elegido en la mochila o el almacén (para iluminar la ranura de equipo donde encaja)
  const selItem = sel?.kind === 'grid' ? (() => { const g = sel.container === 'shared' ? prof.shared : sel.container === 'backpack' || sel.container === 'stash' || sel.container === 'pocket' ? prof[sel.container] : null; return g?.[sel.index]?.itemId; })() : undefined;
  const slot = (s: EquipSlot, big = false) => (
    <div className="flex flex-col items-center gap-0.5" key={s}>
      <ItemSlot stack={eq[s]} loc={{ kind: 'equip', slot: s }} equipment={eq} mode={MODE} placeholderIcon={SLOT_ICON[s]} label={SLOT_LABELS[s]} big={big}
        selected={sel?.kind === 'equip' && sel.slot === s} awaiting={!!sel} onSelect={onSelect} onEmpty={onEmpty} movingItemId={selItem}
        onQuick={(l) => { actions.unequip(l); onDone(); }} onAlt={(l) => { actions.unequip(l); onDone(); }} />
      <span className="text-[10px] text-stone-300 uppercase tracking-wider">{SLOT_LABELS[s]}</span>
    </div>
  );
  return (
    <div className="flex items-start gap-6" data-testid="equipment">
      <div className="flex flex-col items-center gap-2">{slot('mainHand', true)}{slot('gloves')}<SkinSlot onClick={onSkin} /></div>
      <div className="flex flex-col items-center gap-2">{slot('helmet')}{slot('armor')}{slot('boots')}<BagSlot sel={sel} onDone={onDone} /></div>
      <div className="flex flex-col items-center gap-2">{slot('offHand', true)}{slot('amulet')}{slot('ring')}</div>
    </div>
  );
}

function HeroColumn({ onDetails, needs }: { onDetails: () => void; needs?: boolean }) {
  const profile = useGame((s) => s.profile)!;
  const ch = profile.character;
  const cls = CLASSES[ch.classId];
  const scale = usePixelScale('heroSm');
  const stats = computeStats(ch.classId, ch.level, profile.equipment);
  return (
    <>
      <div className="ui-arch mx-auto w-full shrink-0" style={{ height: 26 * scale + 40 }}><div className="pb-3"><PlayerSprite scale={scale} /></div></div>
      <div className="text-center font-display text-gold mt-3">◆ {cls.name} ◆</div>
      {/* En «Estado» no van las estadísticas: así las necesidades suben y se ven sin desplazar */}
      {!needs && <div className="mt-2"><StatsColumn stats={stats} base={baseStats(ch.classId, ch.level)} resourceName={cls.resourceName} /></div>}
      {needs && <div className="needs-side mt-3"><NeedsPanel needs={needsOf(profile.needs)} backpack={profile.backpack} onShowFood={highlightItems} atBase note="El catre está en el Bastión, en los barracones." /></div>}
      <div className="flex-1" />
      <button className="btn w-full mt-3 font-display tracking-[0.1em] uppercase" style={{ minHeight: 'var(--btn-h)' }} onClick={onDetails} data-testid="btn-hero-details">Ver detalles</button>
    </>
  );
}

/** Lista de atributos en una columna (Vida 258/258 (+52)…). */
function StatsColumn(props: Parameters<typeof StatsList>[0]) {
  return <div className="alijo-stats"><StatsList {...props} /></div>;
}

/** Casilla de la mochila puesta: nunca está vacía y no se pierde al morir. Suelta otra mochila aquí (o tócala y toca aquí) para cambiarla. */
function BagSlot({ sel, onDone }: { sel: Loc | null; onDone: () => void }) {
  const profile = useGame((s) => s.profile)!;
  const bag = profile.bag;
  const def = getItem(bag.itemId);
  const [info, setInfo] = useState(false);
  const drag = useDrag();
  const over = !!drag && !drag.back && drag.over === BAG_DROP;
  const dragBag = !!drag && !drag.back && !!BAG_SIZES[drag.itemId];
  const selIsBag = sel?.kind === 'grid' && (() => { const g = sel.container === 'shared' ? profile.shared : sel.container === 'backpack' || sel.container === 'stash' ? profile[sel.container] : null; const x = g?.[sel.index]; return !!x && !!BAG_SIZES[x.itemId]; })();
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button className={`slot ${over ? 'drag-over' : ''} ${selIsBag || dragBag ? 'drop-ok' : drag && !drag.back ? 'drop-dim' : ''}`} data-testid="slot-bag" data-item={bag.itemId} title={`${def.name} · ${profile.backpack.length} casillas`}
        aria-label={`Mochila: ${def.name}, ${profile.backpack.length} casillas`}
        onClick={() => { if (dragJustEnded()) return; sfx('click'); if (selIsBag && sel) { actions.equipBag(sel); onDone(); } else setInfo(true); }}
        data-drop={BAG_DROP}>
        <ItemIcon itemId={bag.itemId} size={36} />
        <span className="qty">{profile.backpack.length}</span>
      </button>
      <span className="text-[10px] text-stone-300 uppercase tracking-wider">Mochila</span>
      {info && (
        <Modal onClose={() => setInfo(false)} testId="bag-info">
          <h2 className="panel-title text-lg mb-2">{def.name}</h2>
          <p className="font-body text-lg">{def.description}</p>
          <p className="text-sm text-heal mt-2">Tu mochila tiene {profile.backpack.length} casillas. La mochila puesta no se pierde al morir.</p>
          <p className="text-xs text-stone-400 mt-2">Para cambiarla, suelta otra mochila en esta casilla (o tócala y luego toca aquí). Grizk vende mochilas más grandes, y puedes pasarle una a otro personaje por la página «Compartido».</p>
          <button className="btn mt-4" style={{ minHeight: 44 }} onClick={() => setInfo(false)}>Cerrar</button>
        </Modal>
      )}
    </div>
  );
}

/** Vista «Estado» de la Intendencia: heridas (curables con lo que llevas en la mochila) y necesidades (comer y beber). */
function StatusView({ withNeeds }: { withNeeds?: boolean }) {
  const profile = useGame((s) => s.profile)!;
  const body = baseBody(profile);
  const cure = useCure();
  return (
    <div className="flex-1 min-h-0 flex flex-col status-wrap" data-testid="intendencia-status">
      {cure && <div className="mb-3 status-center"><CureOffer /></div>}
      <BodyPanel body={body} backpack={profile.backpack} onTreat={(id, r) => actions.baseTreat(id, r)} onHeal={(id) => actions.baseHeal(id)} full
        note={cure ? 'Toca una parte para ver qué le pasa y curarla con lo que llevas, o arrastra una venda, una férula o una poción hasta ella.' : 'Estás entero.'}>
        {withNeeds && <NeedsPanel needs={needsOf(profile.needs)} body={body} backpack={profile.backpack} onShowFood={highlightItems} atBase note="El catre está en el Bastión, en los barracones." />}
      </BodyPanel>
    </div>
  );
}
