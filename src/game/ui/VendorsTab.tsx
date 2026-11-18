// Piezas de los mercaderes (las usa screens/Mercaderes.tsx y screens/Misiones.tsx): barra de reputación,
// mercancía con precio según tu reputación y lista de encargos.
import { actions, useGame } from '../state/store';
import { VENDORS, type VendorId } from '../../core/data/vendors';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { buyPrice } from '../../core/economy';
import { REP_RANKS, rankOf } from '../../config/reputation';
import { VendorQuestNotes } from './QuestNotes';
import { Bar, ItemIcon } from './inventory';

export function RepBar({ rep }: { rep: number }) {
  const r = rankOf(rep);
  const next = REP_RANKS[r + 1];
  const base = REP_RANKS[r].rep;
  return (
    <div>
      <div className="flex justify-between text-[13px]"><span className="text-gold">{REP_RANKS[r].name}</span><span className="text-stone-400">{next ? `${rep - base}/${next.rep - base}` : 'Máximo'}</span></div>
      <Bar value={next ? rep - base : 1} max={next ? next.rep - base : 1} color="#e8b33a" />
    </div>
  );
}

/** Pestañas de un mercader. 'station': su estación del Bastión (una por mercader). */
export type VendorView = 'shop' | 'quests' | 'sell' | 'repair' | 'contracts' | 'infirmary' | 'scrap' | 'station';
export interface VendorTarget { vendor: VendorId; view: VendorView }

/** Mercancía de un mercader, con el precio según tu reputación y lo que está bloqueado por rango. */
export function ShopStock({ vid, cols = 'grid sm:grid-cols-2 xl:grid-cols-3 gap-2' }: { vid: VendorId; cols?: string }) {
  const profile = useGame((s) => s.profile)!;
  const v = VENDORS[vid];
  const rep = profile.reputation[vid] ?? 0;
  const rank = rankOf(rep);
  const ch = profile.character;
  return (
    <div className={cols} data-testid="merchant-stock">
            {v.stock.map(({ itemId, rank: need }) => {
              const d = getItem(itemId);
              const locked = rank < need;
              const price = buyPrice(itemId, rep);
              const usable = !d.classes || d.classes.includes(ch.classId);
              return (
                <div key={itemId} className={`flex items-center gap-2 bg-black/30 p-2 border border-stone-800 ${locked ? 'opacity-60' : ''}`}>
                  <div className="slot" style={{ borderColor: RARITY_INFO[d.rarity].color + 'aa' }}><ItemIcon itemId={itemId} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ color: RARITY_INFO[d.rarity].color }}>{d.name}</div>
                    <div className="text-xs text-stone-400 truncate">
                      {d.slot && d.levelReq ? <span className={ch.level < d.levelReq ? 'text-blood' : 'text-heal'}>Nv {d.levelReq} · </span> : null}
                      {d.stats ? Object.entries(d.stats).map(([k, val]) => `${val! > 0 ? '+' : ''}${val} ${k}`).join(' ') : d.description}
                      {!usable && <span className="text-blood"> · otra clase</span>}
                    </div>
                  </div>
                  {locked ? (
                    <span className="text-[11px] text-stone-400 text-right leading-tight w-20" data-testid={`locked-${itemId}`}>🔒 {REP_RANKS[need].name}</span>
                  ) : (
                    <button className="btn btn-gold text-sm whitespace-nowrap" disabled={profile.gold < price} onClick={() => actions.buy(itemId, vid)} data-testid={`buy-${itemId}`}>{profile.gold < price ? `Oro insuficiente · ${price}` : `${price} oro`}</button>
                  )}
                </div>
              );
            })}
          </div>
  );
}

/** Encargos de un mercader: las mismas notas que la pantalla Misiones (QuestNotes.tsx), solo con los suyos. */
export function VendorQuests({ vendor }: { vendor: VendorId }) {
  return <VendorQuestNotes vendor={vendor} />;
}
