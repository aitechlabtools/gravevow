// Selector de cantidad común a todo el juego (13/11): dividir montones, sacar monedas, destruir y dar al aliado.
// −10 · −1 · [n] · +1 · +10, barra deslizante y atajos «Mitad» y «Todo». Botones de 44 px como mínimo.
// Con teclado: flechas (±1), Re Pág/Av Pág (±10), Inicio y Fin.
import type { KeyboardEvent } from 'react';

export function QtyPicker({ value, min = 1, max, onChange, compact = false, testId = 'amt' }: {
  value: number; min?: number; max: number; onChange: (n: number) => void; compact?: boolean; testId?: string;
}) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v))));
  const big = max - min >= 10;
  const h = compact ? 44 : 52;
  const step = (t: string, d: number) => (
    <button type="button" className="btn text-lg" style={{ minWidth: compact ? 44 : 56, minHeight: h }} onClick={() => set(value + d)}
      disabled={d < 0 ? value <= min : value >= max} data-testid={`${testId}${d > 0 ? '-mas' : '-menos'}${Math.abs(d)}`}>{t}</button>
  );
  const keys = (e: KeyboardEvent) => {
    const k: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
    if (e.key in k) { e.preventDefault(); set(value + k[e.key]); }
    if (e.key === 'Home') { e.preventDefault(); set(min); }
    if (e.key === 'End') { e.preventDefault(); set(max); }
  };
  return (
    <div className="qty-picker" onKeyDown={keys} data-testid={`${testId}-picker`}>
      <div className="flex items-center justify-center gap-2">
        {big && step('−10', -10)}{step('−1', -1)}
        <div className="panel flex items-center justify-center font-display text-gold" tabIndex={0} role="spinbutton" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-label="Cantidad"
          style={{ minWidth: compact ? 64 : 96, minHeight: h, fontSize: compact ? 22 : 30 }} data-testid={`${testId}-value`}>{value}</div>
        {step('+1', 1)}{big && step('+10', 10)}
      </div>
      {max > min && <input type="range" min={min} max={max} value={value} onChange={(e) => set(+e.target.value)} className="w-full mt-3 accent-[#e8b33a]" style={{ height: 32 }} aria-label="Cantidad" />}
      <div className="flex gap-2 mt-2 justify-center flex-wrap">
        <button type="button" className="btn text-sm" style={{ minHeight: 44, minWidth: 44 }} onClick={() => set(Math.max(min, Math.floor(max / 2)))} data-testid={`${testId}-half`}>Mitad</button>
        <button type="button" className="btn text-sm" style={{ minHeight: 44 }} onClick={() => set(max)} data-testid={`${testId}-all`}>Todo ({max})</button>
      </div>
    </div>
  );
}
