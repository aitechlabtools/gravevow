// El Refugio (estaciones, catre y platos) y el desguace de Orik. Lo que se fabrica va por el menú de crafteo común.
// Todo se decide tocando: nada depende del hover ni de reflejos.
import { useState } from 'react';
import { actions, useGame } from '../state/store';
import { prepText, refugeOf, scrapYield } from '../../core/refuge';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { stackRarity } from '../../core/data/rarity';
import { durability, hasDurability, maxDurability, wearLevel } from '../../core/durability';
import { WEAR_COLOR } from '../../config/durability';
import { isCover } from '../../core/inventory';
import { ItemIcon } from './inventory';
import { ReceptionSection } from './WorkshopPanels';
import type { CraftStation } from '../../core/data/crafting';
import { CraftPanel, RunePanel, StationGrid, type GoTo } from './StationPanels';
import { sfx } from '../audio';
import type { ItemStack } from '../../core/types';

const BTN = { minHeight: 44 } as const;

/** El Refugio: módulos, catre y lo que te prepara para la siguiente bajada. */
export function RefugePanel({ onBack, onGo }: { onBack: () => void; onGo?: GoTo }) {
  const profile = useGame((s) => s.profile)!;
  const ref = refugeOf(profile);
  const [inside, setInside] = useState<string | null>(null);
  const back = () => { setInside(null); sfx('click'); };
  const wrap = (node: React.ReactNode) => <div className="h-full overflow-y-auto scroll-thin" style={{ padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))' }} data-testid="screen-refuge"><div className="w-full max-w-[1200px] mx-auto">{node}</div></div>;
  if (inside && inside !== 'runes' && inside !== 'runic-menu') return wrap(<CraftPanel station={inside as CraftStation} onBack={back} />);
  if (inside === 'runes') return wrap(<RunePanel onBack={back} />);
  if (inside === 'runic-menu') return wrap(
    <div className="flex flex-wrap gap-2 pt-2" data-testid="runic-menu">
      <button className="btn btn-gold font-display" style={{ minHeight: 52 }} onClick={() => setInside('runic')} data-testid="runic-craft">Fabricar en el atril</button>
      <button className="btn btn-gold font-display" style={{ minHeight: 52 }} onClick={() => setInside('runes')} data-testid="runic-runes">Grabar runas</button>
      <button className="btn" style={{ minHeight: 52 }} onClick={back}>◂ Refugio</button>
    </div>);
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
    <div className="h-full overflow-y-auto scroll-thin" style={{ padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))' }} data-testid="screen-refuge">
      <div className="w-full max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="ui-ptitle border-0 !text-[clamp(14px,1.8vw,26px)] !tracking-[0.18em] !m-0">El Refugio</h2>
        <button className="btn font-display tracking-[0.1em] uppercase" style={BTN} onClick={onBack} data-testid="refuge-back">◂ Bastión</button>
      </div>
      <ReceptionSection />
      <div className="w-full max-w-[1200px] mx-auto mt-2">
        <StationGrid onGo={onGo} onEnter={(id) => setInside(id === 'runic' && ref.runic >= 3 ? 'runic-menu' : id)} />
      </div>
      <div className="w-full max-w-[1200px] mx-auto panel p-3 mt-2 flex flex-wrap items-center gap-3" data-testid="refuge-prep">
        <span className="font-display text-parchment tracking-[0.08em]">Preparación</span>
        <span className="text-sm text-stone-300 flex-1 min-w-[180px]" data-testid="prep-text">{prep.length ? prep.join(' · ') : 'Nada. Duerme en un jergón o come un plato de tu cocina antes de bajar.'}</span>
        {dishIds.map((id) => (
          <button key={id} className="btn inline-flex items-center gap-2" style={BTN} onClick={() => eat(id)} data-testid={`eat-${id}`}><ItemIcon itemId={id} size={20} />Comer {getItem(id).name.toLowerCase()}</button>
        ))}
      </div>
      <p className="w-full max-w-[1200px] mx-auto font-body text-sm text-stone-400 italic mt-2">La preparación dura una incursión y se gasta al bajar. Un plato nuevo sustituye al anterior; los recortes tienen un tope del 30 %.</p>
    </div>
  );
}

/** Desguace en el taller de Orik: lo que se puede despiezar de la mochila y el almacén, con lo que rinde. */
export function ScrapPanel() {
  const profile = useGame((s) => s.profile)!;
  const bench = refugeOf(profile).bench;
  const [confirm, setConfirm] = useState<string | null>(null);
  const rows = (['backpack', 'stash'] as const).flatMap((container) => profile[container].map((st, index) => {
    if (!st || isCover(st)) return null;
    const y = scrapYield(st, bench);
    return y ? { container, index, st, y } : null;
  })).filter((x): x is NonNullable<typeof x> => !!x);
  return (
    <div className="space-y-3" data-testid="scrap">
      <p className="font-body text-base text-stone-300 max-w-2xl">
        «Dámelo y te devuelvo lo que vale de verdad.» Lo desguazado se pierde para siempre; a cambio, sus materiales levantan tu Refugio. Lo roto rinde menos.
        {bench >= 1 ? ' Tu banco de trabajo añade un 25 %.' : ''}
      </p>
      {rows.length === 0 ? <p className="font-body italic text-stone-400">No llevas nada que Orik pueda despiezar. Lo que tienes puesto no se toca.</p> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
          {rows.map(({ container, index, st, y }) => {
            const def = getItem(st.itemId);
            const rar = stackRarity(st, def);
            const key = `${container}-${index}`;
            const valuable = ['rare', 'epic', 'legendary'].includes(rar);
            const lvl = hasDurability(def) ? wearLevel(st) : null;
            return (
              <div key={key} className="bg-black/30 border border-stone-800 p-2 flex items-center gap-2" data-testid={`scrap-${key}`}>
                <div className="slot shrink-0" style={{ borderColor: RARITY_INFO[rar].color + 'aa' }}><ItemIcon itemId={def.id} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ color: RARITY_INFO[rar].color }}>{def.name}{st.qty > 1 ? ` ×${st.qty}` : ''}</div>
                  <div className="text-xs truncate">
                    <span className="text-stone-400">{container === 'backpack' ? 'Mochila' : 'Almacén'}</span>
                    {lvl && <span style={{ color: WEAR_COLOR[lvl] }}> · {lvl === 'broken' ? 'Roto' : `${durability(st)}/${maxDurability(st)}`}</span>}
                  </div>
                  <div className="text-xs inline-flex items-center gap-1 text-parchment">→ <ItemIcon itemId={y.itemId} size={16} />{getItem(y.itemId).name} ×{y.qty}</div>
                </div>
                <button className={`btn py-1 px-3 shrink-0 ${confirm === key ? 'btn-gold' : ''}`} style={BTN} data-testid={`scrap-btn-${key}`}
                  onClick={() => { if (valuable && confirm !== key) { setConfirm(key); sfx('click'); return; } setConfirm(null); actions.scrap(container, index); }}>
                  {confirm === key ? '¿Seguro?' : 'Desguazar'}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <p className="font-body text-sm text-stone-400 italic">Nunca sacarás más de lo que cuesta comprarlo: aquí no se hace oro de la nada.</p>
    </div>
  );
}
