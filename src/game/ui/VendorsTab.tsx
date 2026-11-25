// Piezas de los mercaderes (las usa screens/Mercaderes.tsx y screens/Misiones.tsx): barra de reputación,
// mercancía con precio según tu reputación y lista de encargos.
import { actions, useGame } from '../state/store';
import { VENDORS, type VendorId } from '../../core/data/vendors';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { buyPrice } from '../../core/economy';
import { REP_RANKS, rankOf } from '../../config/reputation';
import { VendorQuestNotes } from './QuestNotes';
import { Bar, ItemIcon } from './inventory';
import { iconUrl } from '../../shared/art';
import { lockIcon } from './uiIcons';

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
export type VendorView = 'shop' | 'quests' | 'sell' | 'repair' | 'contracts' | 'infirmary' | 'scrap' | 'station' | 'insure';
export interface VendorTarget { vendor: VendorId; view: VendorView }

/** Mercancía de un mercader (fase 2): filas que se tocan para ver la ficha; el precio es texto dorado con moneda.
 *  En escritorio, doble clic compra. Lo bloqueado por rango va atenuado con candado. */
export function ShopStock({ vid, cols = 'shop-list', sel, onSel }: { vid: VendorId; cols?: string; sel?: string | null; onSel?: (id: string) => void }) {
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
          <button type="button" key={itemId} className={`shop-row ${locked ? 'locked' : ''} ${!usable ? 'other' : ''} ${sel === itemId ? 'on' : ''}`} aria-pressed={sel === itemId}
            onClick={() => onSel?.(itemId)} onDoubleClick={() => !locked && profile.gold >= price && actions.buy(itemId, vid)} data-testid={`shop-row-${itemId}`}>
            <span className="slot shop-ico" style={{ borderColor: RARITY_INFO[d.rarity].color + 'aa' }}><ItemIcon itemId={itemId} /></span>
            <span className="flex-1 min-w-0 text-left">
              <span className="block shop-name leading-tight line-clamp-2" style={{ color: RARITY_INFO[d.rarity].color }}>{d.name}</span>
              <span className="block truncate shop-sub">
                {d.slot && d.levelReq ? <span className={ch.level < d.levelReq ? 'text-danger' : ''}>Nv {d.levelReq} · </span> : null}
                {!usable ? <span className="text-danger">Otra clase</span> : d.stats ? Object.entries(d.stats).map(([k, val]) => `${val! > 0 ? '+' : ''}${val} ${k}`).join(' ') : d.description}
              </span>
            </span>
            {locked
              ? <span className="shop-lock" data-testid={`locked-${itemId}`}><img src={lockIcon(2)} className="pixelated" alt="" /> {REP_RANKS[need].name}</span>
              : <PriceTag value={price} short={profile.gold < price} />}
          </button>
        );
      })}
    </div>
  );
}

/** Precio en texto dorado con la moneda (rojo si no llega el oro). */
export function PriceTag({ value, short = false }: { value: number; short?: boolean }) {
  return <span className={`price-tag ${short ? 'short' : ''}`}><img src={iconUrl('coin', 2)} width={18} height={18} className="pixelated" alt="" />{value}</span>;
}

/** Ficha de un objeto de la tienda con un único botón dorado «Comprar · N oro». */
export function ShopCard({ vid, itemId }: { vid: VendorId; itemId: string | null }) {
  const profile = useGame((s) => s.profile)!;
  if (!itemId) return <p className="font-body text-stone-400 italic text-[15px] leading-snug" data-testid="shop-card-empty">Toca un objeto para ver su ficha y comprarlo.</p>;
  const d = getItem(itemId);
  const rep = profile.reputation[vid] ?? 0;
  const need = VENDORS[vid].stock.find((x) => x.itemId === itemId)?.rank ?? 0;
  const locked = rankOf(rep) < need;
  const price = buyPrice(itemId, rep);
  const ch = profile.character;
  const usable = !d.classes || d.classes.includes(ch.classId);
  const low = !!(d.slot && d.levelReq && ch.level < d.levelReq);
  const poor = profile.gold < price;
  return (
    <div className="flex flex-col gap-2" data-testid="shop-card">
      <div className="flex gap-3 items-start">
        <span className="slot shrink-0" style={{ borderColor: RARITY_INFO[d.rarity].color + 'aa' }}><ItemIcon itemId={itemId} /></span>
        <span className="min-w-0">
          <span className="block font-display text-[18px] leading-tight" style={{ color: RARITY_INFO[d.rarity].color }}>{d.name}</span>
          <span className="block text-[13px] text-stone-400">{RARITY_INFO[d.rarity].name}{d.slot && d.levelReq ? ` · Nv ${d.levelReq}` : ''}</span>
        </span>
      </div>
      {d.stats && <div className="text-[14px] text-heal">{Object.entries(d.stats).map(([k, val]) => `${val! > 0 ? '+' : ''}${val} ${k}`).join(' · ')}</div>}
      {d.description && <p className="font-body text-[15px] text-stone-300 leading-snug">{d.description}</p>}
      {!usable && <div className="text-[14px] text-danger">No es para tu clase: no podrás equiparlo.</div>}
      {low && <div className="text-[14px] text-danger">Necesitas nivel {d.levelReq}.</div>}
      {locked
        ? <div className="text-[14px] text-stone-300 flex items-center gap-2"><img src={lockIcon(2)} className="pixelated" alt="" />Hace falta el rango «{REP_RANKS[need].name}».</div>
        : <button className={`btn ${poor ? '' : 'btn-gold'} w-full font-display text-[16px]`} style={{ minHeight: 48 }} disabled={poor} onClick={() => actions.buy(itemId, vid)} data-testid={`buy-${itemId}`}>
            {poor ? `Te faltan ${price - profile.gold} de oro` : `Comprar · ${price} oro`}
          </button>}
    </div>
  );
}

/** Encargos de un mercader: las mismas notas que la pantalla Misiones (QuestNotes.tsx), solo con los suyos. */
export function VendorQuests({ vendor }: { vendor: VendorId }) {
  return <VendorQuestNotes vendor={vendor} />;
}
