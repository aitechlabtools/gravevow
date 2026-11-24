// Seguro de equipo por bajada (24/11): sello, ventana de «Descender» y pestaña «Seguro» de Brand, Valerius y Eldrin.
// Misma pieza en los dos sitios: la cuadrícula de ranuras (dos filas de cuatro) y el recibo con precios y botones.
import { useEffect, useState } from 'react';
import { actions, toast, useGame } from '../state/store';
import { insurableSlots, pendingFor, type SlotInsure } from '../../core/insurance';
import { SLOT_LABEL } from '../../config/insurance';
import { STATIONS } from '../../config/stations';
import { REFORGER } from '../../config/insurance';
import { VENDORS, type VendorId } from '../../core/data/vendors';
import { getItem } from '../../core/data/items';
import type { EquipSlot, Profile } from '../../core/types';
import { ItemIcon } from './inventory';
import { Modal } from './common';
import { sfx } from '../audio';
import { Seal } from './kit/Seal';
export { Seal };

const stationName = (slot: EquipSlot) => `${STATIONS[REFORGER[slot].station].name} de ${VENDORS[REFORGER[slot].vendor].name}`;

/** Una casilla: icono, coste arriba a la izquierda, sello si va marcada; apagada con candado si su estación está en ruinas. */
function SlotCell({ s, on, onToggle }: { s: SlotInsure; on: boolean; onToggle: () => void }) {
  const has = !!s.item;
  const title = !has ? `${SLOT_LABEL[s.slot]}: vacío` : s.locked ? `Reconstruye la ${stationName(s.slot)} para asegurarlo` : `${getItem(s.item!.itemId).name}: ${s.cost} ${s.cost === 1 ? 'moneda' : 'monedas'} · lo reforja ${VENDORS[s.vendor].name}`;
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

/** Pestaña «Seguro» de Brand, Valerius o Eldrin: recoger lo reforjado y dejar marcado lo de la próxima bajada. */
export function InsureTab({ vendor }: { vendor: VendorId }) {
  const p = useGame((s) => s.profile)!;
  const pend = pendingFor(p, vendor);
  const sel = p.insurePlan ?? [];
  return (
    <div className="ins-tab" data-testid="insure-tab">
      {pend.length > 0 && (
        <div className="ins-pend" data-testid="reforged-list">
          <div className="ins-head"><span className="ins-cap ins-cap-gold"><Seal scale={2} title="Piezas reforjadas" /> Piezas reforjadas</span>
            {pend.length > 1 && <button type="button" className="btn btn-gold ins-all" onClick={() => actions.collectReforged(vendor)} data-testid="reforged-all">Recoger todo</button>}</div>
          {pend.map((r) => (
            <div key={r.item.uid} className="ins-pend-row">
              <ItemIcon itemId={r.item.itemId} size={36} /><span className="ins-name">{getItem(r.item.itemId).name}<span className="ins-sub">Vuelve como la bajaste, sin seguro</span></span>
              <button type="button" className="btn" style={{ minHeight: 44 }} onClick={() => actions.collectReforged(vendor, r.item.uid)} data-testid={`reforged-take-${r.item.uid}`}>Recoger</button>
            </div>
          ))}
        </div>
      )}
      <p className="ins-note">Marca lo que quieres asegurar en la próxima bajada. Se paga al pulsar «Descender».</p>
      <InsureBody p={p} vendor={vendor} sel={sel} setSel={(s) => actions.setInsurePlan(s)} actionsSlot={() => null} />
    </div>
  );
}
