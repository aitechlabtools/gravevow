// Seguro de equipo por bajada (24/11): sello, ventana de «Descender» y pestaña «Seguro» de Brand, Valerius y Eldrin.
// Misma pieza en los dos sitios: la cuadrícula de ranuras (dos filas de cuatro) y el recibo con precios y botones.
import { useEffect, useState } from 'react';
import { actions, toast, useGame } from '../state/store';
import { insurableSlots, pendingFor, type SlotInsure } from '../../core/insurance';
import { SLOT_LABEL } from '../../config/insurance';
import { STATIONS } from '../../config/stations';
import { reforgerFor } from '../../core/insuranceLoss';
import { VENDORS, type VendorId } from '../../core/data/vendors';
import { getItem } from '../../core/data/items';
import type { EquipSlot, Profile } from '../../core/types';
import { ItemIcon, statLine } from './inventory';
import { RARITY_INFO } from '../../core/data/items';
import { AFFIXES, stackName, stackRarity, stackStats } from '../../core/data/rarity';
import { STAT_KEYS } from '../../core/types';
import { maxDurability } from '../../core/durability';
import { Modal } from './common';
import { sfx } from '../audio';
import { Seal } from './kit/Seal';
export { Seal };

const stationName = (s: SlotInsure) => { const st = STATIONS[reforgerFor(s.slot, s.item).station]; return `${st.name} de ${VENDORS[st.by].name}`; };

/** Una casilla: icono, coste arriba a la izquierda, sello si va marcada; apagada con candado si su estación está en ruinas. */
function SlotCell({ s, on, onToggle }: { s: SlotInsure; on: boolean; onToggle: () => void }) {
  const has = !!s.item;
  const title = !has ? `${SLOT_LABEL[s.slot]}: vacío` : s.locked ? `Reconstruye la ${stationName(s)} para asegurarlo` : `${getItem(s.item!.itemId).name}: ${s.cost} ${s.cost === 1 ? 'moneda' : 'monedas'} · lo reforja ${VENDORS[s.vendor].name}`;
  return (
    <div className="ins-cell">
      <button type="button" className={`ins-slot ${on ? 'on' : ''} ${s.locked && has ? 'locked' : ''}`} disabled={!has} aria-pressed={on} title={title} aria-label={title}
        onClick={() => { if (s.locked) { toast(title, 'info'); return; } sfx('click'); onToggle(); }} data-testid={`insure-${s.slot}`}>
        {has ? <ItemIcon itemId={s.item!.itemId} size={36} /> : <span className="ins-empty" aria-hidden>—</span>}
        {has && !s.locked && <span className="ins-cost">{s.cost}</span>}
        {has && s.locked && <span className="ins-lock" aria-hidden>🔒</span>}
        {on && <span className="ins-seal"><Seal scale={1} /></span>}
      </button>
      <span className={`ins-lbl ${on ? 'on' : ''}`}>{SLOT_LABEL[s.slot]}</span>
    </div>
  );
}

/** Cuadrícula + recibo. `vendor`: solo las ranuras de ese mercader (pestaña Seguro). */
function InsureBody({ p, sel, setSel, vendor, actionsSlot }: { p: Profile; sel: EquipSlot[]; setSel: (s: EquipSlot[]) => void; vendor?: VendorId; actionsSlot: (total: number, short: boolean) => React.ReactNode }) {
  const slots = insurableSlots(p).filter((s) => !vendor || s.vendor === vendor);
  const ok = slots.filter((s) => s.item && !s.locked);
  const chosen = ok.filter((s) => sel.includes(s.slot));
  const total = chosen.reduce((n, s) => n + s.cost, 0);
  const toggle = (slot: EquipSlot) => setSel(sel.includes(slot) ? sel.filter((x) => x !== slot) : [...sel, slot]);
  const all = ok.length > 0 && ok.every((s) => sel.includes(s.slot));
  return (
    <div className="ins-body">
      <div className={`ins-grid ${vendor ? 'few' : ''}`} data-testid="insure-grid">{slots.map((s) => <SlotCell key={s.slot} s={s} on={sel.includes(s.slot) && !!s.item && !s.locked} onToggle={() => toggle(s.slot)} />)}</div>
      <div className="ins-receipt">
        <div className="ins-head"><span className="ins-cap">Asegurado</span>
          <button type="button" className="btn ins-all" onClick={() => { sfx('click'); setSel(all ? sel.filter((x) => !ok.some((s) => s.slot === x)) : [...new Set([...sel, ...ok.map((s) => s.slot)])]); }} disabled={!ok.length} data-testid="insure-all">{all ? 'Nada' : 'Todo'}</button></div>
        <div className="ins-lines" data-testid="insure-lines">
          {chosen.length ? chosen.map((s) => <div key={s.slot} className="ins-line"><Seal scale={1} /><span className="ins-name">{getItem(s.item!.itemId).name}</span><span className="ins-price">{s.cost} ●</span></div>)
            : <div className="ins-none">{ok.length ? 'Toca una pieza para asegurarla.' : vendor ? 'No llevas puesto nada que asegure.' : 'Nada que asegurar.'}</div>}
        </div>
        <div className="ins-total"><span className="ins-have">Tienes {p.gold}</span><span className="ins-sum" data-testid="insure-total">Total {total} ●</span></div>
        {actionsSlot(total, total > p.gold)}
      </div>
    </div>
  );
}

/** Ventana al pulsar «Descender». */
export function InsureModal({ onGo, onClose }: { onGo: (slots: EquipSlot[] | undefined) => void; onClose: () => void }) {
  const p = useGame((s) => s.profile)!;
  const initial = p.insurePlan ?? insurableSlots(p).filter((s) => s.item && !s.locked).map((s) => s.slot);
  const [sel, setSel] = useState<EquipSlot[]>(initial);
  useEffect(() => { actions.tutorialEvent('insure:first'); }, []);
  return (
    <Modal onClose={onClose} fit testId="insure-modal">
      <h2 className="font-display ins-title">¿Aseguras tu equipo?</h2>
      <InsureBody p={p} sel={sel} setSel={setSel} actionsSlot={(total, short) => (<>
        <button type="button" className="btn btn-gold ins-go" disabled={short} onClick={() => { actions.setInsurePlan(sel); onGo(sel); }} data-testid="insure-go">{short ? `Te faltan ${total - p.gold}` : 'Asegurar y bajar'}</button>
        <button type="button" className="btn ins-go" onClick={() => { actions.setInsurePlan(sel); onGo(undefined); }} data-testid="insure-skip">Bajar sin asegurar</button>
      </>)} />
    </Modal>
  );
}

/** Ficha de una pieza en la pestaña «Seguro»: color y nombre de su rareza, estadísticas, atributos, runas y durabilidad. */
function PieceCard({ s, on, onToggle }: { s: SlotInsure; on: boolean; onToggle: () => void }) {
  if (!s.item) return (
    <div className="ins-card empty" data-testid={`insure-card-${s.slot}`}><span className="ins-card-ico empty">—</span><span className="ins-card-main"><b className="ins-card-name">{SLOT_LABEL[s.slot]}</b><span className="ins-card-sub">Nada puesto</span></span></div>
  );
  const st = s.item, def = getItem(st.itemId), r = RARITY_INFO[stackRarity(st, def)];
  const stats = def.stats ? stackStats(st, def) : null;
  const keys = stats ? STAT_KEYS.filter((k) => stats[k]) : [];
  const dmax = maxDurability(st);
  return (
    <div className={`ins-card ${on ? 'on' : ''}`} style={{ ['--rc' as string]: r.color }} data-testid={`insure-card-${s.slot}`}>
      <span className="ins-card-ico"><ItemIcon itemId={st.itemId} size={40} />{on && <span className="ins-seal"><Seal scale={1} /></span>}</span>
      <span className="ins-card-main">
        <b className="ins-card-name" style={{ color: r.color }}>{stackName(st, def)}</b>
        <span className="ins-card-sub">{r.name} · {SLOT_LABEL[s.slot]}{dmax > 0 ? ` · durabilidad ${st.dur ?? dmax}/${dmax}` : ''}</span>
        {keys.length > 0 && <span className="ins-stats">{keys.map((k) => <span key={k} className={stats![k]! > 0 ? 'pos' : 'neg'}>{statLine(k, stats![k]!)}</span>)}</span>}
        {(st.affixes?.length || st.runes?.some(Boolean)) ? <span className="ins-card-extra">{[...(st.affixes ?? []).map((a) => AFFIXES[a]?.description ?? a), ...(st.runes ?? []).filter((x): x is string => !!x).map((x) => getItem(x).name)].join(' · ')}</span> : null}
      </span>
      <span className="ins-card-act">
        <span className="ins-card-cost">{s.locked ? '' : `${s.cost} ●`}</span>
        {s.locked ? <span className="ins-card-lock">🔒 Reconstruye la estación</span>
          : <button type="button" className={`btn ${on ? 'btn-gold' : ''} ins-card-btn`} aria-pressed={on} onClick={() => { sfx('click'); onToggle(); }} data-testid={`insure-${s.slot}`}>{on ? 'Asegurada' : 'Asegurar'}</button>}
      </span>
    </div>
  );
}

const HOW: [string, string][] = [
  ['Solo una bajada', 'Se paga al pulsar «Descender». Al volver se acaba, extraigas o no.'],
  ['Si caes, te la reforjo', 'Brand me ayuda en la forja. Te espera aquí, como la bajaste y con la durabilidad entera.'],
  ['Solo lo que llevas puesto', 'La mochila y lo que encuentres abajo no se aseguran.'],
  ['El 4 % de su valor', 'Mínimo 1 moneda por pieza. Cuanto mejor la pieza, más cuesta.'],
];

/** Pestaña «Seguro» de Brand, Valerius o Eldrin: recoger lo reforjado, cómo funciona y lo que se asegurará en la próxima bajada. */
export function InsureTab({ vendor }: { vendor: VendorId }) {
  const p = useGame((s) => s.profile)!;
  const pend = pendingFor(p, vendor);
  const sel = p.insurePlan ?? [];
  const slots = insurableSlots(p).filter((s) => s.vendor === vendor);
  const ok = slots.filter((s) => s.item && !s.locked);
  const chosen = ok.filter((s) => sel.includes(s.slot));
  const total = chosen.reduce((n, s) => n + s.cost, 0);
  const all = ok.length > 0 && ok.every((s) => sel.includes(s.slot));
  const setSel = (x: EquipSlot[]) => actions.setInsurePlan(x);
  const toggle = (slot: EquipSlot) => setSel(sel.includes(slot) ? sel.filter((x) => x !== slot) : [...sel, slot]);
  return (
    <div className="ins-tab" data-testid="insure-tab">
      {pend.length > 0 && (
        <div className="ins-pend" data-testid="reforged-list">
          <div className="ins-head"><span className="ins-cap ins-cap-gold"><Seal scale={2} title="Piezas reforjadas" /> Piezas reforjadas</span>
            {pend.length > 1 && <button type="button" className="btn btn-gold ins-all" onClick={() => actions.collectReforged(vendor)} data-testid="reforged-all">Recoger todo</button>}</div>
          {pend.map((r) => {
            const d = getItem(r.item.itemId), rc = RARITY_INFO[stackRarity(r.item, d)];
            return (
              <div key={r.item.uid} className="ins-pend-row">
                <ItemIcon itemId={r.item.itemId} size={36} /><span className="ins-name"><span style={{ color: rc.color }}>{stackName(r.item, d)}</span><span className="ins-sub">{rc.name} · vuelve como la bajaste, sin seguro</span></span>
                <button type="button" className="btn" style={{ minHeight: 44 }} onClick={() => actions.collectReforged(vendor, r.item.uid)} data-testid={`reforged-take-${r.item.uid}`}>Recoger</button>
              </div>
            );
          })}
        </div>
      )}
      <div className="ins-how" data-testid="insure-how">
        {HOW.map(([t, d]) => <div key={t} className="ins-how-item"><Seal scale={2} title="" /><span><b>{t}</b><span>{d}</span></span></div>)}
      </div>
      <div className="ins-cols">
        <div className="ins-cards" data-testid="insure-grid">
          <div className="ins-head"><span className="ins-cap">Lo que {VENDORS[vendor].name} te reforja</span>
            <button type="button" className="btn ins-all" disabled={!ok.length} onClick={() => { sfx('click'); setSel(all ? sel.filter((x) => !ok.some((s) => s.slot === x)) : [...new Set([...sel, ...ok.map((s) => s.slot)])]); }} data-testid="insure-all">{all ? 'Nada' : 'Todo'}</button></div>
          {slots.map((s) => <PieceCard key={s.slot} s={s} on={sel.includes(s.slot) && !!s.item && !s.locked} onToggle={() => toggle(s.slot)} />)}
        </div>
        <div className="ins-receipt ins-receipt-tab">
          <span className="ins-cap">Próxima bajada</span>
          <div className="ins-lines" data-testid="insure-lines">
            {chosen.length ? chosen.map((s) => { const d = getItem(s.item!.itemId); return <div key={s.slot} className="ins-line"><Seal scale={1} /><span className="ins-name" style={{ color: RARITY_INFO[stackRarity(s.item!, d)].color }}>{stackName(s.item!, d)}</span><span className="ins-price">{s.cost} ●</span></div>; })
              : <div className="ins-none">Nada marcado. Pulsa «Asegurar» en una pieza.</div>}
          </div>
          <div className="ins-total"><span className="ins-have">Tienes {p.gold}</span><span className="ins-sum" data-testid="insure-total">Total {total} ●</span></div>
          <p className="ins-note">Se cobra al pulsar «Descender»; allí aún puedes cambiarlo{total > p.gold ? `. Te faltan ${total - p.gold}.` : '.'}</p>
        </div>
      </div>
    </div>
  );
}
