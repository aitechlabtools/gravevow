// Intendencia (antes «Alijo»). Vista «Equipo»: Aventurero · Equipo (equipamiento, mochila y bolsillo seguro) · Almacén.
// Vista «Estado»: heridas y necesidades con la mochila al lado; curarte con tus objetos sin pagar a Vesper.
// Mover objetos: arrastrar (ordenador), o tocar un objeto (se abre su ficha) y después tocar una casilla libre.
// En móvil no caben las tres columnas: segmentos «Equipo», «Almacén» y «Estado».
import { className, g } from '../../../core/gender';
import { useState, useCallback, useEffect, useRef } from 'react';
import { actions, useGame } from '../../state/store';
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
import { ItemSlot, GridView, SLOT_LABELS, highlightItems, type InvMode } from '../inventory';
import { PlayerSprite, GoldAmount } from '../common';
import { Panel, SubHead, Segmented, usePixelScale } from '../kit';
import { BodyPanel } from '../BodyFigure';
import { NeedsPanel } from '../NeedsBars';
import { needsOf } from '../../../core/needs';
import { CureOffer, useCure } from '../CureOffer';
import { RecruitOffer } from '../RecruitOffer';
import { baseBody } from '../../state/medicalActions';
import { bodyHp } from '../../../core/anatomy';
import { useLayout } from '../../../config/ui';
import { ItemCard } from './ItemCard';
import { PixelIcon } from '../../../shared/community';
import { TAB_ICONS, VENDOR_TAB_ICONS } from '../kit/tabIcons';
const HELM = ['...XXXXXX...', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XX..XX..XX.', '.XX..XX..XX.', '.XX..XX..XX.', '.XXX.XX.XXX.', '.XXX.XX.XXX.', '.XXX....XXX.', '..XX....XX..', '............'];
const SIDE_ICONS: Record<string, string[]> = { gear: HELM, storage: TAB_ICONS.stash, status: VENDOR_TAB_ICONS.infirmary };
import { sfx } from '../../audio';
import { SkinSlot, SkinPicker } from './Atuendos';
import { HeroStats, LevelBar } from '../HeroStats';
import { xpForNextLevel } from '../../../core/stats';

const SLOT_ICON: Record<EquipSlot, string> = { mainHand: 'sword', offHand: 'shield', helmet: 'helm', armor: 'tunic', gloves: 'gloves', boots: 'boots', ring: 'ring', amulet: 'amulet' };
const MODE: InvMode = 'lobby';

export function Alijo({ onShop }: { onShop?: () => void }) {
  const profile = useGame((s) => s.profile)!;
  const layout = useLayout();
  const phone = layout === 'phone';
  const [sel, setSel] = useState<Loc | null>(null);
  useClearOnDrop(useCallback(() => setSel(null), []));
  const [view, setView] = useState<'gear' | 'storage' | 'status'>('gear');
  useEffect(() => { if (view === 'status') actions.tutorialEvent('stash:status'); }, [view]);
  const [picker, setPicker] = useState(false);
  // Escritorio estrecho (p. ej. 1366 × 768): Aventurero más estrecho y casillas del panel Equipo a 44 px para que quepan las dos columnas
  const compact = layout === 'desktop' && typeof window !== 'undefined' && window.innerWidth < 1600;
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
  const card = <ItemCard loc={sel} mode={MODE} onClear={clear} compact={phone} stacked={(phone && view !== 'status') || (layout === 'tablet' && view === 'gear')} />;
  const status = <StatusView withNeeds={phone} />;
  const seg = (opts: { id: 'gear' | 'storage' | 'status'; label: string }[]) => (
    <Segmented options={opts} value={view} onChange={(v) => { setView(v); setSel(null); sfx('click'); }} testId="alijo-seg" />
  );

  if (phone) {
    // Fase 3: pestañas en columna de iconos a la izquierda y ficha fija a la derecha (no tapa nada)
    const opts = [{ id: 'gear', label: 'Equipo' }, { id: 'storage', label: 'Almacén' }, { id: 'status', label: 'Heridas' }] as const;
    const tabs = (
      <div className="vtabs-col alijo-side" role="tablist" aria-orientation="vertical" data-testid="alijo-seg">
        {opts.map((o) => (
          <button key={o.id} role="tab" aria-selected={view === o.id} aria-label={o.label} title={o.label} onClick={() => { setView(o.id); setSel(null); sfx('click'); }} data-testid={`seg-${o.id}`}>
            <PixelIcon rows={SIDE_ICONS[o.id]} size={24} color={view === o.id ? '#1a1206' : 'currentColor'} />
          </button>
        ))}
      </div>
    );
    const sheet = (
      <Panel className="min-h-0 alijo-sheet" bodyClassName="overflow-y-auto scroll-thin" testId="item-sheet">
        {sel ? <div className="relative"><button className="btn icon-btn absolute right-0 top-0" onClick={clear} aria-label="Cerrar la ficha">✕</button>{card}</div>
          : <div className="h-full flex flex-col items-center justify-center text-center text-muted gap-2 px-2"><span className="font-display text-sm tracking-wide">{opts.find((o) => o.id === view)!.label}</span><span className="text-sm">Toca un objeto para ver su ficha aquí.</span></div>}
      </Panel>
    );
    return (
      <div className="h-full flex" style={{ padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))', gap: 'var(--gap)' }} data-testid="screen-stash">
        {tabs}
        <div className="flex-1 min-w-0 min-h-0 flex" style={{ gap: 'var(--gap)' }}>
          {view === 'status' ? (
            <>
              <Panel className="min-h-0 flex-[3]" bodyClassName="overflow-y-auto scroll-thin body-cq">{status}</Panel>
              <Panel className="min-h-0 flex-[2]" bodyClassName="overflow-y-auto scroll-thin"><CureBag grids={grids} quick={quickFromBag} onStash={(l) => { actions.quickMove(l, 'stash'); clear(); }} /></Panel>
            </>
          ) : view === 'gear' ? (
            <>
              <Panel className="min-h-0 shrink-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col items-center"><div className="w-full" style={{ ['--slot' as string]: '44px', ['--slot-big' as string]: '44px', width: 270 }} data-testid="alijo-hero"><RecruitOffer /><CharacterEquip sel={sel} onSelect={onSelect} onEmpty={onEmpty} onDone={clear} onSkin={() => setPicker(true)} compact /></div></Panel>
              <Panel className="min-h-0 shrink-0" bodyClassName="overflow-y-auto scroll-thin">{backpack}{pocket}</Panel>
              {sheet}
            </>
          ) : (
            <>
              {storage}
              {sel ? sheet : <Panel className="min-h-0 shrink-0" bodyClassName="overflow-y-auto scroll-thin">{backpack}</Panel>}
            </>
          )}
        </div>
        {pickerModal}
        {view === 'status' && sel && (
          <div className="absolute left-0 right-0 bottom-0 z-30 panel panel-gold p-3" data-testid="item-sheet-status">
            <button className="btn icon-btn absolute right-2 top-2" onClick={clear} aria-label="Cerrar la ficha">✕</button>
            <div className="pr-12">{card}</div>
          </div>
        )}
      </div>
    );
  }

  const side = layout === 'tablet' ? 256 : compact ? 280 : 340;
  const deskSeg = <div className="flex justify-center shrink-0">{seg([{ id: 'gear', label: 'Equipo' }, { id: 'status', label: 'Heridas' }])}</div>;
  const padX = { padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))', gap: 'var(--gap)' } as const;
  if (view !== 'gear') {
    return (
      <div className="h-full flex flex-col" data-testid="screen-stash" style={padX}>
        {deskSeg}
        <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: `${side}px minmax(0,1fr) ${layout === 'tablet' ? 300 : 360}px`, gap: 'var(--gap)' }}>
          <Panel title={g("{Aventurero|Aventurera}")} className="min-h-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col" testId="alijo-hero"><HeroColumn needs /></Panel>
          <Panel title="Estado físico" className="min-h-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col">{status}</Panel>
          <Panel title="Mochila" className="min-h-0" bodyClassName="overflow-y-auto scroll-thin"><CureBag grids={grids} quick={quickFromBag} onStash={(l) => { actions.quickMove(l, 'stash'); clear(); }} />{sel && <div className="panel p-3 mt-3">{card}</div>}</Panel>
        </div>
        {pickerModal}
      </div>
    );
  }
  // Vista «Equipo» (escritorio y tableta): Personaje y equipo · Mochila · Almacén
  const slotVar = layout === 'tablet' ? { ['--slot' as string]: '44px', ['--slot-big' as string]: '44px' } : compact ? { ['--slot' as string]: '48px', ['--slot-big' as string]: '48px' } : { ['--slot' as string]: '60px', ['--slot-big' as string]: '60px' };
  const bagW = `calc(var(--slot) * 6 + 34px)`;
  const bagPanel = (
    <Panel title="Mochila" className="min-h-0" bodyClassName="min-h-0 flex flex-col overflow-y-auto scroll-thin" testId="alijo-backpack-panel">
      <div data-testid="alijo-backpack" className="mx-auto" style={{ width: bagW }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-stone-300 text-sm">Ocupación: <b className="text-parchment">{profile.backpack.filter(Boolean).length}/{profile.backpack.length}</b></span>
          <GoldAmount value={profile.gold} />
        </div>
        <GridView grid={profile.backpack} container="backpack" cols={6} {...grids} onQuick={quickFromBag} onAlt={(l) => { actions.quickMove(l, 'stash'); clear(); }} />
        <CarryBar className="mt-2" />
        <div className="flex justify-between text-xs mt-1"><span className="text-stone-400">En riesgo si mueres</span><span className="text-ember" data-testid="gold-box">{gridValue(profile.backpack) + equippedValue(profile.equipment)}</span></div>
        <div className="grid grid-cols-3 gap-1 mt-2" data-testid="backpack-quick">
          <button className="btn text-xs" style={{ minHeight: touchy ? 44 : 34 }} onClick={() => actions.sortContainer('backpack')} data-testid="sort-backpack">Ordenar</button>
          <button className="btn text-xs" style={{ minHeight: touchy ? 44 : 34 }} onClick={askEmpty} disabled={!bagUsed} data-testid="empty-backpack" title="Pasa todo lo de la mochila al almacén (no toca el equipo ni el bolsillo seguro)">Depositar</button>
          <button className="btn text-xs" style={{ minHeight: touchy ? 44 : 34 }} onClick={() => { actions.emptyBackpack(true); clear(); }} disabled={!hasMaterials} data-testid="store-materials" title="Manda minerales y materiales al almacén">Materiales</button>
        </div>
        {gridGold(profile.backpack) > 0 && (
          <div className="flex items-center justify-between text-xs mt-1.5" data-testid="gold-carried"><span className="text-stone-300">Oro encima (se pierde si mueres)</span>
            <button className="btn text-xs" style={{ minHeight: touchy ? 44 : 30 }} onClick={() => actions.groupGold('backpack')} data-testid="group-gold-backpack" title="Mete las monedas sueltas en tus saquitos y sacos">Agrupar {gridGold(profile.backpack)}</button></div>
        )}
        {pocket}
      </div>
      {sel && layout !== 'tablet' && <div className="panel p-3 mt-3 shrink-0" data-testid="item-card-wrap">{card}</div>}
    </Panel>
  );
  return (
    <div className="h-full flex flex-col" data-testid="screen-stash" style={padX}>
    {deskSeg}
    <div className="flex-1 min-h-0 grid" style={{ ...slotVar, gridTemplateColumns: `minmax(0,1fr) minmax(0,1fr) auto`, gap: 'var(--gap)' }}>
      {sel && layout === 'tablet' ? (
        <Panel className="min-h-0" bodyClassName="overflow-y-auto scroll-thin" testId="item-sheet">
          <div className="relative"><button className="btn icon-btn absolute right-0 top-0" onClick={clear} aria-label="Cerrar la ficha">✕</button>{card}</div>
        </Panel>
      ) : (
        <Panel title="Personaje y equipo" className="min-h-0" bodyClassName="overflow-y-auto scroll-thin" testId="alijo-hero">
          <div className="mb-3"><RecruitOffer /></div>
          <CharacterEquip sel={sel} onSelect={onSelect} onEmpty={onEmpty} onDone={clear} onSkin={() => setPicker(true)} />
        </Panel>
      )}
      {bagPanel}
      {storage}
      {pickerModal}
    </div>
    </div>
  );
}

/** Personaje en el centro con el equipo alrededor (arma, manos, pies, anillo | cabeza, torso, secundaria, amuleto), atuendo y mochila debajo, y atributos. */
function CharacterEquip({ sel, onSelect, onEmpty, onDone, onSkin, compact }: { sel: Loc | null; onSelect: (l: Loc) => void; onEmpty: (l: Loc) => void; onDone: () => void; onSkin: () => void; compact?: boolean }) {
  const prof = useGame((s) => s.profile!);
  const eq = prof.equipment;
  // El personaje llena el arco: escala entera según el alto y el ancho que quedan entre las dos columnas de ranuras
  const archRef = useRef<HTMLDivElement | null>(null);
  const [arch, setArch] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = archRef.current; if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setArch({ w: e.contentRect.width, h: e.contentRect.height })); ro.observe(el); return () => ro.disconnect();
  }, []);
  const scale = arch.h ? Math.max(2, Math.min(Math.floor((arch.h - 24) / 26), Math.floor((arch.w - 8) / 26))) : 4;
  const selItem = sel?.kind === 'grid' ? (() => { const g = sel.container === 'shared' ? prof.shared : sel.container === 'backpack' || sel.container === 'stash' || sel.container === 'pocket' ? prof[sel.container] : null; return g?.[sel.index]?.itemId; })() : undefined;
  const slot = (s: EquipSlot) => (
    <div className="flex flex-col items-center gap-0.5" key={s}>
      <ItemSlot stack={eq[s]} loc={{ kind: 'equip', slot: s }} equipment={eq} mode={MODE} placeholderIcon={SLOT_ICON[s]} label={SLOT_LABELS[s]}
        selected={sel?.kind === 'equip' && sel.slot === s} awaiting={!!sel} onSelect={onSelect} onEmpty={onEmpty} movingItemId={selItem}
        onQuick={(l) => { actions.unequip(l); onDone(); }} onAlt={(l) => { actions.unequip(l); onDone(); }} />
      <span className="text-[12px] text-stone-300">{SLOT_LABELS[s]}</span>
    </div>
  );
  return (
    <div className="flex flex-col" data-testid="equipment">
      <div className={`text-center font-display text-gold ${compact ? 'text-[13px]' : ''}`} data-testid="hero-level">{className(prof.character.classId, prof.character.appearance.sex)} · Nivel {prof.character.level}</div>
      <div className={`mx-auto mt-1 w-3/4 ${compact ? 'mb-1.5' : 'mb-3'}`} title={`${prof.character.xp} / ${xpForNextLevel(prof.character.level)} XP`}><div className="h-1.5 bg-stone-800"><div className="h-full bg-arcane" style={{ width: `${Math.min(100, (prof.character.xp / xpForNextLevel(prof.character.level)) * 100)}%` }} /></div><div className="text-center text-[12px] text-stone-400 mt-0.5">{prof.character.xp} / {xpForNextLevel(prof.character.level)} XP</div></div>
      <div className={`flex items-center justify-center ${compact ? 'gap-1.5' : 'gap-3'}`}>
        <div className="flex flex-col gap-1.5">{(['mainHand', 'gloves', 'boots', 'ring'] as EquipSlot[]).map(slot)}</div>
        <div ref={archRef} className="ui-arch flex-1 min-w-0 self-stretch flex items-end justify-center overflow-hidden" style={{ maxWidth: 340, minWidth: compact ? 96 : undefined }}><div className={compact ? 'pb-1' : 'pb-3'}><PlayerSprite scale={scale} /></div></div>
        <div className="flex flex-col gap-1.5">{(['helmet', 'armor', 'offHand', 'amulet'] as EquipSlot[]).map(slot)}</div>
      </div>
      <div className="flex justify-center gap-6 mt-2"><div className="flex flex-col items-center gap-0.5"><SkinSlot onClick={onSkin} /></div><BagSlot sel={sel} onDone={onDone} /></div>
      <div className="mt-3 border-t border-stone-700 pt-2"><div className="ins-cap mb-1" style={{ color: '#e8b33a' }}>Atributos</div><HeroStats /></div>
    </div>
  );
}

function HeroColumn({ needs }: { needs?: boolean }) {
  const profile = useGame((s) => s.profile)!;
  const scale = usePixelScale('heroSm');
  return (
    <>
      <div className="mb-3 shrink-0"><LevelBar /></div>
      <div className="ui-arch mx-auto w-full shrink-0" style={{ height: 26 * scale + 40 }}><div className="pb-3"><PlayerSprite scale={scale} /></div></div>
      <div className="text-center font-display text-gold mt-3">◆ {className(profile.character.classId, profile.character.appearance.sex)} ◆</div>
      {/* En «Estado» no van las estadísticas: así las necesidades suben y se ven sin desplazar */}
      {!needs && <div className="mt-2"><HeroStats /></div>}
      {needs && <LifeBar />}
      {needs && <div className="needs-side mt-3"><NeedsPanel needs={needsOf(profile.needs)} backpack={profile.backpack} onShowFood={highlightItems} atBase note="El catre está en el Bastión, con Grizk." /></div>}
    </>
  );
}


/** Vida total del cuerpo (Alijo › Heridas), encima de las necesidades. */
function LifeBar() {
  const profile = useGame((s) => s.profile)!;
  const b = baseBody(profile), hp = bodyHp(b);
  return (
    <div className="panel p-2 mt-3" data-testid="hero-life">
      <div className="flex justify-between text-sm"><span className="font-display text-parchment">Vida</span><span>{hp}/{b.total}</span></div>
      <div className="h-1.5 bg-stone-800 mt-1"><div className="h-full" style={{ width: `${Math.min(100, hp / Math.max(1, b.total) * 100)}%`, background: '#6fae5a' }} /></div>
    </div>
  );
}

/** Mochila en Heridas: filtro Todo / Curación (apaga lo que no cura), carga y ordenar. */
function CureBag({ grids, quick, onStash }: { grids: Record<string, unknown>; quick: (l: Loc, s: ItemStack) => void; onStash: (l: Loc) => void }) {
  const profile = useGame((s) => s.profile)!;
  const touchy = useIsTouch();
  const [only, setOnly] = useState<'all' | 'cure'>('all');
  const cures = [...new Set(profile.backpack.filter((x): x is ItemStack => !!x && !isCover(x)).map((x) => x.itemId))].filter((id) => { const u = getItem(id).use; return u?.kind === 'treat' || u?.kind === 'heal'; });
  const dimCss = only === 'cure' ? `.bag-cure .slot[data-item]:not([data-item=""])${cures.map((id) => `:not([data-item="${id}"])`).join('')}{opacity:.25}` : '';
  return (
    <div data-testid="alijo-backpack" className={only === 'cure' ? 'bag-cure' : ''}>
      {dimCss && <style>{dimCss}</style>}
      <div className="flex items-center justify-between mb-2"><span className="font-display text-parchment">Mochila · {profile.backpack.filter(Boolean).length}/{profile.backpack.length}</span></div>
      <div className="mb-2"><Segmented full options={[{ id: 'all', label: 'Todo' }, { id: 'cure', label: `Curación${cures.length ? ` · ${cures.length}` : ''}` }]} value={only} onChange={(v) => { sfx('click'); setOnly(v); }} testId="bag-filter" /></div>
      <GridView grid={profile.backpack} container="backpack" cols={6} {...(grids as object)} onQuick={quick} onAlt={onStash} />
      <CarryBar className="mt-2" />
      <button className="btn text-xs w-full mt-2" style={{ minHeight: touchy ? 44 : 34 }} onClick={() => actions.sortContainer('backpack')} data-testid="sort-backpack">Ordenar mochila</button>
      <p className="text-[12px] text-stone-400 mt-2">{touchy ? 'Toca' : 'Elige'} un objeto curativo y luego la parte del cuerpo para tratar una lesión.</p>
    </div>
  );
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
        note={cure ? 'Toca una parte para ver qué le pasa y curarla con lo que llevas, o arrastra una venda, una férula o una poción hasta ella.' : undefined}>
        {withNeeds && <NeedsPanel needs={needsOf(profile.needs)} body={body} backpack={profile.backpack} onShowFood={highlightItems} atBase note="El catre está en el Bastión, con Grizk." />}
      </BodyPanel>
    </div>
  );
}
