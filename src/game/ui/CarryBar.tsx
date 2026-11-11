// Barra de carga (Fase 6): peso de lo que llevas encima contra tu capacidad, con los tramos de penalización.
import { CARRY_MAX, CARRY_TIERS } from '../../config/carry';
import { fmtWeight, loadOf } from '../../core/carry';
import { useGame } from '../state/store';
import { getPact, pactPrice } from '../../core/data/altars';
import { CLASSES } from '../../core/data/classes';

const TIER_COLOR = ['#8fae6a', '#e8b33a', '#d0533f'];

export function useLoad() {
  const p = useGame((s) => s.profile);
  const e = useGame((s) => (s.screen === 'dungeon' ? s.expedition : null));
  if (!p) return null;
  const src = e ?? p;
  return loadOf({ backpack: src.backpack, pocket: src.pocket, equipment: src.equipment, bag: p.bag }, p.character.classId);
}

/** Texto de lo que te cuesta la carga actual. */
export function loadText(tier: number): string {
  if (!tier) return 'Sin penalización';
  const t = CARRY_TIERS[tier - 1];
  return `Sobrecarga: −${Math.round(t.mobility * 100)} % de paso, +${Math.round(t.rest * 100)} % de Descanso`;
}

export function CarryBar({ className = '' }: { className?: string }) {
  const l = useLoad();
  if (!l) return null;
  const scale = CARRY_MAX; // la barra llega al 150 %
  const pos = (f: number) => `${Math.min(100, (f / scale) * 100)}%`;
  const color = TIER_COLOR[l.tier];
  return (
    <div className={`text-xs ${className}`} data-testid="carry-bar" data-tier={l.tier}>
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-stone-300">Carga <b className="font-display" style={{ color }} data-testid="carry-weight">{fmtWeight(l.weight)}</b> / {fmtWeight(l.capacity)}</span>
        <span style={{ color: l.tier ? color : '#a8a29e' }} className="text-right truncate">{loadText(l.tier)}</span>
      </div>
      <div className="relative h-2 mt-1 bg-black/60 border border-stone-700" title={`Hasta ${fmtWeight(l.capacity)} sin penalización; no puedes coger más allá de ${fmtWeight(l.capacity * CARRY_MAX)}.`}>
        <div className="absolute inset-y-0 left-0" style={{ width: pos(l.pct), background: color }} />
        {CARRY_TIERS.map((t) => <span key={t.over} className="absolute inset-y-0 w-px bg-stone-300/60" style={{ left: pos(t.over) }} />)}
      </div>
    </div>
  );
}

/** Aviso compacto para el HUD de la mazmorra: solo aparece con sobrecarga. */
export function OverloadChip() {
  const l = useLoad();
  if (!l || !l.tier) return null;
  return <span className="hud-overload font-pixel text-[10px] px-1.5 py-0.5 border" style={{ color: TIER_COLOR[l.tier], borderColor: TIER_COLOR[l.tier], background: '#0b0a0dcc' }} data-testid="hud-overload" title={loadText(l.tier)}>Sobrecarga {Math.round(l.pct * 100)} %</span>;
}

/** Fase 7: pacto de altar activo (beneficio y precio en la ventanita). */
export function PactChip() {
  const id = useGame((s) => s.expedition?.pact ?? null);
  const cls = useGame((s) => s.profile?.character.classId ?? 'warrior');
  const pact = getPact(id);
  if (!pact) return null;
  return <span className="font-pixel text-[10px] px-1.5 py-0.5 border" style={{ color: '#ff6a5a', borderColor: '#8e1c2c', background: '#0b0a0dcc' }} data-testid="hud-pact" title={`${pact.boon}. Precio: ${pactPrice(pact, CLASSES[cls].resourceName)}.`}>{pact.name}</span>;
}
