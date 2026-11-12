// La recepción de excedentes del Refugio. Los minijuegos del yunque y la mesa se retiraron en el bloque 2 (fase 3):
// todo se fabrica con el menú de crafteo común (StationPanels). Todo se decide tocando: sin hover ni reflejos.
import { useState } from 'react';
import { actions, useGame } from '../state/store';
import { ownedQty } from '../../core/refuge';
import { salvageBlock } from '../../core/salvage';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { stackRarity } from '../../core/data/rarity';
import { sellPrice } from '../../core/economy';
import { vendorUnlocked } from '../../core/vendors';
import { ItemIcon } from './inventory';

const BTN = { minHeight: 44 } as const;

export function Needs({ items, gold = 0, mult = 1 }: { items: { itemId: string; qty: number }[]; gold?: number; mult?: number }) {
  const profile = useGame((s) => s.profile)!;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {items.map((m) => {
        const have = ownedQty(profile, m.itemId);
        const need = m.qty * mult;
        return <span key={m.itemId} className="inline-flex items-center gap-1" style={{ color: have >= need ? '#c9c2ae' : '#d0605a' }}><ItemIcon itemId={m.itemId} size={18} />{getItem(m.itemId).name} {have}/{need}</span>;
      })}
      {gold > 0 && <span style={{ color: profile.gold >= gold * mult ? '#e8b33a' : '#d0605a' }}>{gold * mult} oro</span>}
    </div>
  );
}

/** Recepción de excedentes: lo que no cupo. Se retira, se vende, se desguaza o se descarta; mientras haya algo, no se baja. */
export function ReceptionSection() {
  const profile = useGame((s) => s.profile)!;
  const list = profile.reception ?? [];
  const [confirm, setConfirm] = useState<number | null>(null);
  const orik = vendorUnlocked(profile, 'orik');
  if (!list.length) return null;
  return (
    <div className="w-full max-w-[1200px] mx-auto panel p-3 mt-2 flex flex-col gap-2" data-testid="reception" style={{ borderColor: '#d0905a' }}>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-display text-parchment tracking-[0.08em]">Recepción</span>
        <span className="text-sm text-[#d0905a]">No cupo en la mochila ni en el almacén. No puedes bajar hasta vaciarla; nada se pierde solo.</span>
      </div>
      <div className="grid xl:grid-cols-2 gap-2">
        {list.map((st, i) => {
          const def = getItem(st.itemId);
          const rar = stackRarity(st, def);
          const y = orik && !salvageBlock(st);
          return (
            <div key={st.uid} className="bg-black/30 border border-stone-800 p-2 flex flex-wrap items-center gap-2" data-testid={`reception-${i}`}>
              <div className="slot shrink-0" style={{ borderColor: RARITY_INFO[rar].color + 'aa' }}><ItemIcon itemId={def.id} /></div>
              <div className="min-w-0 flex-1 truncate" style={{ color: RARITY_INFO[rar].color }}>{def.name}{st.qty > 1 ? ` ×${st.qty}` : ''}</div>
              <div className="flex flex-wrap gap-1">
                <button className="btn py-1 px-2 text-xs" style={BTN} onClick={() => actions.reception('withdraw', i)} data-testid={`reception-withdraw-${i}`}>Retirar</button>
                <button className="btn py-1 px-2 text-xs" style={BTN} onClick={() => actions.reception('sell', i)} data-testid={`reception-sell-${i}`}>Vender · {sellPrice(st.itemId, st) * st.qty}</button>
                {y && <button className="btn py-1 px-2 text-xs" style={BTN} onClick={() => actions.reception('scrap', i)} data-testid={`reception-scrap-${i}`}>Desguazar</button>}
                <button className={`btn py-1 px-2 text-xs ${confirm === i ? 'btn-gold' : ''}`} style={BTN} data-testid={`reception-discard-${i}`}
                  onClick={() => { if (confirm !== i) { setConfirm(i); return; } setConfirm(null); actions.reception('discard', i); }}>{confirm === i ? '¿Tirarlo?' : 'Descartar'}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
