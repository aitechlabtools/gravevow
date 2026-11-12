import { useState } from 'react';
// Piezas de los mercaderes (las usa screens/Mercaderes.tsx y screens/Misiones.tsx): barra de reputación,
// mercancía con precio según tu reputación y lista de encargos.
import { actions, useGame } from '../state/store';
import { VENDORS, type VendorId } from '../../core/data/vendors';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { buyPrice } from '../../core/economy';
import { REP_RANKS, rankOf } from '../../config/reputation';
import { acceptBlock, activeQuests, boardQuests, isOldQuest, questDef, questProgress } from '../../core/quests';
import type { QuestProgress } from '../../core/types';
import { Bar, ItemIcon } from './inventory';

export function RepBar({ rep }: { rep: number }) {
  const r = rankOf(rep);
  const next = REP_RANKS[r + 1];
  const base = REP_RANKS[r].rep;
  return (
    <div>
      <div className="flex justify-between text-[11px]"><span className="text-gold">{REP_RANKS[r].name}</span><span className="text-stone-400">{next ? `${rep - base}/${next.rep - base}` : 'Máximo'}</span></div>
      <Bar value={next ? rep - base : 1} max={next ? next.rep - base : 1} color="#e8b33a" />
    </div>
  );
}

export type VendorView = 'shop' | 'quests' | 'sell' | 'forge' | 'repair' | 'contracts' | 'infirmary' | 'cook' | 'scrap' | 'alchemy' | 'care' | 'stations';
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

/** Una misión: aceptada (Cobrar, Dejar, Fijar) o del tablón (Aceptar). */
export function QuestCard({ p, mode }: { p: QuestProgress; mode: 'active' | 'board' }) {
  const profile = useGame((s) => s.profile)!;
  const [confirm, setConfirm] = useState(false);
  const q = questDef(p.id);
  const prog = questProgress(p, profile);
  const done = prog >= q.count;
  const block = mode === 'board' ? acceptBlock(profile) : null;
  const v = VENDORS[q.vendor];
  return (
    <div className={`bg-black/30 border p-3 flex flex-wrap items-center gap-3 ${p.pinned ? 'border-gold' : 'border-stone-800'}`} data-testid={`quest-${q.id}`} data-mode={mode}>
      <div className="flex-1 min-w-[12rem]">
        {mode === 'active' && <div className="text-sm" style={{ color: v.color }}>{v.name}</div>}
        <div className="font-display text-xl text-gold">{q.name}{q.repeatable ? <span className="text-sm text-stone-400"> · repetible</span> : null}</div>
        <div className="font-body text-lg text-stone-200 leading-snug">{q.description}</div>
        {(mode === 'active' || q.type === 'deliver') && <div className="mt-2 max-w-sm quest-bar"><Bar value={prog} max={q.count} color={done ? '#5fd19a' : '#e8b33a'} label={q.type === 'deliver' ? 'Tienes' : 'Progreso'} /></div>}
      </div>
      <div className="text-right text-base leading-snug flex flex-col items-end">
        <div className="text-gold">+{q.reward.gold} oro</div>
        <div className="text-arcane">+{q.reward.xp} XP</div>
        <div style={{ color: v.color }}>+{q.reward.rep} reputación</div>
        {mode === 'board' ? (
          <button className="btn btn-gold mt-2 px-4" style={{ minHeight: 44 }} disabled={!!block} title={block ?? undefined} onClick={() => actions.acceptQuest(q.id)} data-testid={`accept-${q.id}`}>Aceptar</button>
        ) : (
          <div className="flex gap-1.5 mt-2 flex-wrap justify-end">
            <button className={`btn px-3 ${p.pinned ? 'btn-gold' : ''}`} style={{ minHeight: 44 }} onClick={() => actions.togglePinQuest(q.id)} aria-pressed={!!p.pinned} title="Se recuerda en Jugar y en la mazmorra" data-testid={`pin-${q.id}`}>{p.pinned ? '★ Fijada' : '☆ Fijar'}</button>
            {confirm
              ? <button className="btn btn-danger px-3" style={{ minHeight: 44 }} onClick={() => { actions.abandonQuest(q.id); setConfirm(false); }} data-testid={`abandon-yes-${q.id}`}>¿Seguro? Pierdes lo hecho</button>
              : <button className="btn px-3" style={{ minHeight: 44 }} onClick={() => setConfirm(true)} data-testid={`abandon-${q.id}`}>Dejar</button>}
            <button className="btn btn-gold px-4" style={{ minHeight: 44 }} disabled={!done} onClick={() => actions.claimQuest(q.id)} data-testid={`claim-${q.id}`}>{q.type === 'deliver' ? 'Entregar' : 'Cobrar'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Tablón de un mercader: sus misiones aceptadas arriba y las que puedes aceptar; las de zonas muy bajas, plegadas. */
export function VendorQuests({ vendor, showActive = true }: { vendor: VendorId; showActive?: boolean }) {
  const profile = useGame((s) => s.profile)!;
  const [old, setOld] = useState(false);
  const active = showActive ? activeQuests(profile, vendor) : [];
  const board = boardQuests(profile, vendor);
  const lv = profile.character.level;
  const fresh = board.filter((p) => !isOldQuest(p.id, lv));
  const stale = board.filter((p) => isOldQuest(p.id, lv));
  return (
    <div className="space-y-2">
      {active.map((p) => <QuestCard key={p.id} p={p} mode="active" />)}
      {fresh.map((p) => <QuestCard key={p.id} p={p} mode="board" />)}
      {!active.length && !fresh.length && !stale.length && <p className="font-body text-lg text-stone-400 italic">No tiene encargos para ti ahora mismo. Vuelve cuando seas más fuerte.</p>}
      {stale.length > 0 && (
        <div>
          <button className="btn w-full text-left px-3" style={{ minHeight: 44 }} aria-expanded={old} onClick={() => setOld(!old)} data-testid={`old-quests-${vendor}`}>{old ? '▾' : '▸'} Encargos antiguos ({stale.length})</button>
          {old && <div className="space-y-2 mt-2">{stale.map((p) => <QuestCard key={p.id} p={p} mode="board" />)}</div>}
        </div>
      )}
    </div>
  );
}
