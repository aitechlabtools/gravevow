// Ventana con el selector de cantidad común (kit/QtyPicker): sacar monedas, dividir montones, dar al aliado.
import { useState, type ReactNode } from 'react';
import { Modal } from './common';
import { QtyPicker } from './kit/QtyPicker';

export function GoldAmountPicker({ title, from, max, initial, confirm, note, onConfirm, onClose }: {
  title: string; from: ReactNode; max: number; initial?: number; confirm: (n: number) => string; note?: string;
  onConfirm: (n: number) => void; onClose: () => void;
}) {
  const [n, setN] = useState(Math.max(1, Math.min(max, initial ?? Math.min(10, max))));
  return (
    <Modal onClose={onClose} testId="gold-picker">
      <h2 className="panel-title text-lg mb-2">{title}</h2>
      <div className="flex items-center gap-3">{from}</div>
      <div className="mt-4"><QtyPicker value={n} max={max} onChange={setN} /></div>
      {note && <p className="text-xs text-stone-400 mt-3 text-center">{note}</p>}
      <div className="flex gap-2 mt-4 justify-center">
        <button className="btn btn-gold" style={{ minHeight: 44 }} onClick={() => { onConfirm(n); onClose(); }} data-testid="amt-confirm">{confirm(n)}</button>
        <button className="btn" style={{ minHeight: 44 }} onClick={onClose}>Cancelar</button>
      </div>
    </Modal>
  );
}
