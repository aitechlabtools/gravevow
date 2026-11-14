// Panel Aventurero del Alijo (14/11): nivel con su barra de experiencia y los atributos. Cada atributo enseña su desglose
// al pasar el ratón (o al tocarlo): «Vida 139 · base 135 · equipo +4», una fuente por línea, verde lo que suma y rojo lo que
// resta, y solo las fuentes distintas de cero. Para añadir runas, habilidades, heridas o comida, se suman en `statSources`.
import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../state/store';
import { CLASSES, STAT_LABELS } from '../../core/data/classes';
import { computeStats, baseStats, xpForNextLevel } from '../../core/stats';
import { STAT_KEYS, type Profile, type Stats } from '../../core/types';
import { useIsTouch } from '../../shared/device';

export interface StatSource { label: string; v: number }

/** Fuentes de cada atributo además de la base. Hoy solo el equipo. */
export function statSources(p: Profile): Record<keyof Stats, StatSource[]> {
  const ch = p.character;
  const base = baseStats(ch.classId, ch.level);
  const total = computeStats(ch.classId, ch.level, p.equipment);
  const out = {} as Record<keyof Stats, StatSource[]>;
  for (const k of STAT_KEYS) out[k] = [{ label: 'Equipo', v: total[k] - base[k] }].filter((s) => s.v !== 0);
  return out;
}

export function LevelBar({ compact }: { compact?: boolean }) {
  const ch = useGame((s) => s.profile!.character);
  const need = xpForNextLevel(ch.level);
  return (
    <div className="font-body" data-testid="hero-level">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-display text-parchment ${compact ? 'text-[15px]' : 'text-lg'}`}>Nivel {ch.level}</span>
        <span className="text-[12px] text-stone-400">{ch.xp} / {need} XP</span>
      </div>
      <div className="h-1.5 bg-stone-800 mt-1"><div className="h-full bg-arcane" style={{ width: `${Math.min(100, (ch.xp / need) * 100)}%` }} /></div>
    </div>
  );
}

export function HeroStats() {
  const profile = useGame((s) => s.profile)!;
  const touch = useIsTouch();
  const ch = profile.character;
  const cls = CLASSES[ch.classId];
  const stats = computeStats(ch.classId, ch.level, profile.equipment);
  const base = baseStats(ch.classId, ch.level);
  const src = statSources(profile);
  const [tip, setTip] = useState<{ k: keyof Stats; x: number; y: number } | null>(null);
  const label = (k: keyof Stats) => (k === 'maxMp' ? cls.resourceName : STAT_LABELS[k]);
  const show = (k: keyof Stats, el: HTMLElement) => { const r = el.getBoundingClientRect(); setTip({ k, x: r.right + 8, y: r.top + r.height / 2 }); };
  let pop: ReactNode = null;
  if (tip) {
    const k = tip.k;
    const left = Math.min(tip.x, window.innerWidth - 270);
    const below = left < tip.x; // no cabe a la derecha: se pone debajo de la fila
    pop = createPortal(
      <div className="fixed z-[70] panel panel-gold px-3 py-2 font-body text-[14px] pointer-events-none w-[250px]" role="tooltip" data-testid="stat-tip"
        style={below ? { left: left, top: tip.y + 18 } : { left, top: tip.y, transform: 'translateY(-50%)' }}>
        <div className="flex justify-between gap-3 font-display text-parchment"><span>{label(k)}</span><span>{stats[k]}</span></div>
        <div className="flex justify-between gap-3 text-stone-300"><span>Base</span><span>{base[k]}</span></div>
        {src[k].map((s) => <div key={s.label} className="flex justify-between gap-3"><span className="text-stone-300">{s.label}</span><span className={s.v > 0 ? 'text-heal' : 'text-blood'}>{s.v > 0 ? '+' : ''}{s.v}</span></div>)}
      </div>, document.body);
  }
  return (
    <div className="alijo-stats" onMouseLeave={() => !touch && setTip(null)}>
      <div data-testid="stats">
        {STAT_KEYS.map((k) => {
          const bonus = stats[k] - base[k];
          const on = tip?.k === k;
          return (
            <button key={k} type="button" data-stat={k} className={`w-full flex justify-between text-left ${on ? 'bg-[#2a2116]' : ''}`} style={{ minHeight: touch ? 44 : undefined }}
              onMouseEnter={(e) => !touch && show(k, e.currentTarget)} onClick={(e) => (on ? setTip(null) : show(k, e.currentTarget))}
              aria-label={`${label(k)} ${stats[k]}: base ${base[k]}${src[k].map((s) => `, ${s.label.toLowerCase()} ${s.v > 0 ? '+' : ''}${s.v}`).join('')}`}>
              <span className="text-stone-300">{label(k)}</span>
              <span>{stats[k]}{bonus !== 0 && <span className={bonus > 0 ? 'text-heal' : 'text-blood'}> ({bonus > 0 ? '+' : ''}{bonus})</span>}</span>
            </button>
          );
        })}
      </div>
      {pop}
      {touch && tip && <div className="fixed inset-0 z-[65]" onClick={() => setTip(null)} aria-hidden />}
    </div>
  );
}
