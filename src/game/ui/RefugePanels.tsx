// El Bastión (estaciones que se reconstruyen, catre y platos) y el desguace de Orik. Lo que se fabrica va por el menú de
// crafteo común. Todo se decide tocando: nada depende del hover ni de reflejos.
import { useEffect, useState } from 'react';
import { actions, useGame } from '../state/store';
import { prepText, refugeOf } from '../../core/refuge';
import { needsConfirm, salvageInfo, sumItems } from '../../core/salvage';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { stackRarity } from '../../core/data/rarity';
import { durability, hasDurability, maxDurability, wearLevel } from '../../core/durability';
import { WEAR_COLOR } from '../../config/durability';
import { isCover } from '../../core/inventory';
import { ItemIcon } from './inventory';
import { ReceptionSection } from './WorkshopPanels';
import type { CraftStation } from '../../core/data/crafting';
import { CotPanel, CraftPanel, RunePanel, StationDetail, StationTiles, UpgradeButton, type GoTo } from './StationPanels';
import { MODULES, type ModuleId } from '../../core/data/refuge';
import { Modal } from './common';
import { sfx } from '../audio';
import type { ItemStack } from '../../core/types';

const BTN = { minHeight: 44 } as const;

/**
 * El Bastión: tarjetas de estación como las de los mercaderes («Reconstruir» o «Usar»), la pantalla de cada estación en uso
 * (con «▲ Mejorar» arriba), el detalle para reconstruir o mejorar y la recepción de excedentes en un panel aparte.
 * Los platos se comen en la Cocina (al usarla).
 */
export function RefugePanel({ onBack, onGo, initialDetail }: { onBack: () => void; onGo?: GoTo; initialDetail?: ModuleId }) {
  const profile = useGame((s) => s.profile)!;
  const ref = refugeOf(profile);
  const [inside, setInside] = useState<string | null>(null);
  const [detail, setDetail] = useState<ModuleId | null>(initialDetail ?? null);
  const [reception, setReception] = useState(false);
  const back = () => { setInside(null); sfx('click'); };
  const use = (id: ModuleId) => { setDetail(null); setInside(id === 'runic' && ref.runic >= 3 ? 'runic-menu' : id); };
  const recN = (profile.reception ?? []).length;
  // Primera vez en el Bastión (vista de tarjetas): lo explica Orik
  const cards = !inside && !detail;
  useEffect(() => { if (cards) actions.tutorialEvent('bastion:refuge'); }, [cards]);
  const pad = { padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))' } as const;
  const entry = <button className="btn font-display tracking-[0.1em] uppercase" style={BTN} onClick={onBack} data-testid="refuge-back">◂ Entrada</button>;
  const wrap = (node: React.ReactNode) => <div className="h-full overflow-y-auto scroll-thin" style={pad} data-testid="screen-refuge"><div className="w-full max-w-[1200px] mx-auto">{node}</div></div>;
  // Dentro de «Usar»: la estación con «▲ Mejorar» (abre el detalle) y «◂ Entrada»
  const station: ModuleId | null = inside === 'runes' || inside === 'runic-menu' ? 'runic' : (inside as ModuleId | null);
  const extra = station && !detail ? <><UpgradeButton id={station} onOpen={(id) => setDetail(id)} />{entry}</> : null;
  if (detail) {
    const lvl = ref[detail];
    return wrap(<>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <button className="btn font-display tracking-[0.1em] uppercase" style={BTN} onClick={() => { setDetail(null); sfx('click'); }} data-testid="detail-back">◂ Volver</button>
          <h2 className="ui-ptitle border-0 !text-[clamp(14px,1.8vw,26px)] !tracking-[0.18em] !m-0">{lvl >= 1 && lvl < 3 ? `Mejorar · ${MODULES[detail].name}` : MODULES[detail].name}</h2>
        </div>
        {entry}
      </div>
      <StationDetail id={detail} onUse={use} onGo={onGo} />
    </>);
  }
  if (inside === 'cot') return wrap(<CotPanel onBack={back} extra={extra} />);
  if (inside === 'runes') return wrap(<RunePanel onBack={() => setInside('runic-menu')} extra={extra} />);
  if (inside === 'runic-menu') return wrap(
    <div className="flex flex-col gap-2 pt-2" data-testid="runic-menu">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-parchment tracking-[0.08em]">{MODULES.runic.name} · Nivel {ref.runic}/3</span>
        <span className="ml-auto" />{extra}
        <button className="btn text-xs" style={BTN} onClick={back} data-testid="runic-back">◂ Volver</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-gold font-display" style={{ minHeight: 52 }} onClick={() => setInside('runic')} data-testid="runic-craft">Fabricar en el atril</button>
        <button className="btn btn-gold font-display" style={{ minHeight: 52 }} onClick={() => setInside('runes')} data-testid="runic-runes">Grabar runas</button>
      </div>
    </div>);
  if (inside) return wrap(<>
    <CraftPanel station={inside as CraftStation} onBack={ref.runic >= 3 && inside === 'runic' ? () => setInside('runic-menu') : back} extra={extra} />
    {inside === 'kitchen' && <div className="panel p-3 mt-2"><Dishes /></div>}
  </>);
  const prep = prepText(profile.prep);
  return (
    <div className="h-full overflow-y-auto scroll-thin" style={pad} data-testid="screen-refuge">
      <div className="min-h-full flex flex-col items-center justify-center">
        <div className="w-full max-w-[1200px] flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h2 className="ui-ptitle border-0 !text-[clamp(14px,1.8vw,26px)] !tracking-[0.18em] !m-0">El Bastión</h2>
            <div className="text-[12px] text-stone-400 italic [@media(max-height:560px)]:hidden">Lo que queda en pie, y lo que vuelves a levantar.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2" data-testid="refuge-prep">
            <span className="text-[12px] text-stone-300" data-testid="prep-text">Preparación: {prep.length ? prep.join(' · ') : 'ninguna'}</span>
            {recN > 0 && <button className="btn btn-gold text-xs" style={BTN} onClick={() => { setReception(true); sfx('click'); }} data-testid="btn-reception">Recepción ({recN})</button>}
            {entry}
          </div>
        </div>
        <div className="w-full max-w-[1200px]">
          <StationTiles onUse={use} onDetails={(id) => setDetail(id)} />
        </div>
      </div>
      {reception && recN > 0 && (
        <Modal onClose={() => setReception(false)} testId="reception-modal">
          <ReceptionSection />
          <button className="btn mt-3" style={BTN} onClick={() => setReception(false)}>Cerrar</button>
        </Modal>
      )}
    </div>
  );
}

/** Platos que tienes: se comen en la Cocina (al usarla) para bajar preparado. */
function Dishes() {
  const profile = useGame((s) => s.profile)!;
  const prep = prepText(profile.prep);
  const dishes = [...profile.backpack, ...profile.stash].filter((x): x is ItemStack => !!x && !isCover(x) && !!getItem(x.itemId).use && (getItem(x.itemId).use as { dish?: boolean }).dish === true);
  const dishIds = [...new Set(dishes.map((d) => d.itemId))];
  const eat = (itemId: string) => {
    for (const container of ['backpack', 'stash'] as const) {
      const index = profile[container].findIndex((x) => x?.itemId === itemId);
      if (index >= 0) { actions.eat({ kind: 'grid', container, index }); return; }
    }
  };
  return (
    <div className="border-t border-stone-800 pt-2 flex flex-col gap-2" data-testid="refuge-dishes">
      <div className="font-display text-gold text-[13px] tracking-[0.1em] uppercase">Comer antes de bajar</div>
      <div className="text-sm text-stone-300">{prep.length ? `Ahora: ${prep.join(' · ')}` : 'Nada. Come un plato de tu cocina o duerme en un jergón antes de bajar.'}</div>
      <div className="flex flex-wrap gap-2">
        {dishIds.map((id) => (
          <button key={id} className="btn inline-flex items-center gap-2" style={BTN} onClick={() => eat(id)} data-testid={`eat-${id}`}><ItemIcon itemId={id} size={20} />Comer {getItem(id).name.toLowerCase()}</button>
        ))}
        {!dishIds.length && <span className="text-[12px] text-stone-500 italic">No tienes platos.</span>}
      </div>
      <p className="font-body text-[13px] text-stone-400 italic">La preparación dura una incursión y se gasta al bajar. Un plato nuevo sustituye al anterior; los recortes tienen un tope del 30 %.</p>
    </div>
  );
}

/** Desguace en el taller de Orik: se tocan los objetos para marcarlos y se desguazan juntos. Antes se ve lo seguro y lo posible. */
export function ScrapPanel() {
  const profile = useGame((s) => s.profile)!;
  const bench = refugeOf(profile).bench;
  const [marks, setMarks] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const rows = (['backpack', 'stash'] as const).flatMap((container) => profile[container].map((st, index) => {
    if (!st || isCover(st)) return null;
    const info = salvageInfo(st, bench);
    return info ? { container, index, st, info } : null;
  })).filter((x): x is NonNullable<typeof x> => !!x);
  const chosen = rows.filter((r) => marks.includes(r.st.uid));
  const safe = sumItems(chosen.map((r) => r.info.safe));
  const possible = sumItems(chosen.map((r) => r.info.possible));
  const risky = chosen.some((r) => needsConfirm(r.st));
  const toggle = (uid: string) => { setConfirm(false); sfx('click'); setMarks((m) => (m.includes(uid) ? m.filter((x) => x !== uid) : [...m, uid])); };
  const go = () => {
    if (!chosen.length) return;
    if (risky && !confirm) { setConfirm(true); sfx('click'); return; }
    actions.scrap(chosen.map((r) => ({ container: r.container, index: r.index })));
    setMarks([]); setConfirm(false);
  };
  const list = (xs: { itemId: string; qty: number }[]) => xs.map((x) => `${x.qty} ${getItem(x.itemId).name.toLowerCase()}`).join(', ');
  return (
    <div className="space-y-3" data-testid="scrap">
      <p className="font-body text-base text-stone-300 max-w-2xl">
        «Dámelo y te digo qué se salva.» Lo seguro sale siempre; cada pieza de su receta puede salir o no, y lo roto se salva peor.
        {bench >= 1 ? ` Tu banco de trabajo mejora las probabilidades (×${(1 + [0, 0.25, 0.4, 0.55][Math.min(3, bench)]).toFixed(2).replace('.', ',')}).` : ''}
        {' '}Toca los objetos para marcarlos.
      </p>
      {rows.length === 0 ? <p className="font-body italic text-stone-400">No llevas nada que Orik pueda despiezar. Lo que tienes puesto y el equipo de recluta no se tocan.</p> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
          {rows.map(({ container, index, st, info }) => {
            const def = getItem(st.itemId);
            const rar = stackRarity(st, def);
            const key = `${container}-${index}`;
            const on = marks.includes(st.uid);
            const lvl = hasDurability(def) ? wearLevel(st) : null;
            return (
              <button key={key} type="button" aria-pressed={on} onClick={() => toggle(st.uid)} data-testid={`scrap-${key}`}
                className={`text-left bg-black/30 border p-2 flex items-start gap-2 ${on ? 'border-[#d0905a] bg-[#d0905a]/10' : 'border-stone-800'}`} style={BTN}>
                <div className="slot shrink-0" style={{ borderColor: RARITY_INFO[rar].color + 'aa' }}><ItemIcon itemId={def.id} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ color: RARITY_INFO[rar].color }}>{on ? '✔ ' : ''}{def.name}{st.qty > 1 ? ` ×${st.qty}` : ''}</div>
                  <div className="text-xs truncate">
                    <span className="text-stone-400">{container === 'backpack' ? 'Mochila' : 'Almacén'}</span>
                    {lvl && <span style={{ color: WEAR_COLOR[lvl] }}> · {lvl === 'broken' ? 'Roto' : `${durability(st)}/${maxDurability(st)}`}</span>}
                  </div>
                  <div className="text-xs text-parchment">Seguro: {info.safe.length ? list(info.safe) : 'nada (receta simple)'}</div>
                  {info.possible.length > 0 && <div className="text-xs text-stone-300">Posible: {info.possible.map((m) => `${m.qty} ${getItem(m.itemId).name.toLowerCase()} (${Math.round(m.chance * 100)} % c/u)`).join(', ')}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {rows.length > 0 && (
        <div className="sticky bottom-0 bg-[#0d0b09]/95 border border-stone-700 p-2 flex flex-wrap items-center gap-2" data-testid="scrap-summary">
          <div className="min-w-0 flex-1 text-sm">
            {chosen.length ? (<>
              <div className="text-parchment">Seguro: {safe.length ? list(safe) : 'nada'}</div>
              <div className="text-stone-300">Posible: {possible.length ? `hasta ${list(possible)}` : 'nada'}</div>
              {confirm && <div className="text-[#d0905a]">Hay objetos raros o mejores. Se pierden para siempre.</div>}
            </>) : <span className="text-stone-400 italic">Nada marcado.</span>}
          </div>
          {chosen.length > 0 && <button className="btn py-1 px-3" style={BTN} onClick={() => { setMarks([]); setConfirm(false); sfx('click'); }} data-testid="scrap-clear">Quitar marcas</button>}
          <button className={`btn py-1 px-3 ${confirm ? 'btn-gold' : ''}`} style={BTN} disabled={!chosen.length} onClick={go} data-testid="scrap-go">
            {confirm ? '¿Seguro? Desguazar' : `Desguazar seleccionados (${chosen.length})`}
          </button>
        </div>
      )}
      <p className="font-body text-sm text-stone-400 italic">Desguazar no da oro: da material. Fabricar y desguazar siempre pierde algo.</p>
    </div>
  );
}
