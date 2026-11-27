// ESTADO en escritorio (27/11): piezas del apartado Estado del Bastión.
// Atributos con lo que te quitan las heridas y las necesidades, resumen con la curación de Vesper y las tres barras.
// Todas las cifras salen de la lógica (anatomy.ts, needs.ts y refuge.ts): aquí no se inventa ningún efecto.
import { REGION_NAME, type Region } from '../../config/anatomy';
import { NEED_COLOR, NEED_LOW, NEED_NAME, NEEDS } from '../../config/needs';
import { bodyHp, initiativeMult, isDisabled, isLimb, offenseMult, painLoss, REGIONS, summaryHp, type Body } from '../../core/anatomy';
import { CLASSES, STAT_LABELS } from '../../core/data/classes';
import { exhaustionLoss, needsOf, resourceLoss, type Needs } from '../../core/needs';
import { prepText } from '../../core/refuge';
import { baseStats, computeStats } from '../../core/stats';
import { STAT_KEYS, type Stats } from '../../core/types';
import { actions, useGame } from '../state/store';
import { useCure } from './CureOffer';
import { woundsOf } from './BodyFigure';

type Mark = { txt: string; good: boolean };
const pct = (x: number) => `${Math.round(x * 100)} %`;
const side = (r: Region) => REGION_NAME[r].toLowerCase();

/** Lo que cambia cada atributo ahora mismo por las heridas y las necesidades. */
export function statusMarks(body: Body, needs: Needs): Partial<Record<keyof Stats, Mark[]>> {
  const out: Partial<Record<keyof Stats, Mark[]>> = {};
  const add = (k: keyof Stats, m: Mark) => { (out[k] ??= []).push(m); };
  const missing = body.total - bodyHp(body);
  if (missing > 0) add('maxHp', { txt: `Te faltan ${Math.round(missing)} de vida`, good: false });
  const rl = resourceLoss(needs);
  if (rl) {
    const low = NEEDS.filter((n) => needs[n] === Math.min(needs.sat, needs.hyd, needs.rest)).map((n) => NEED_LOW[n]).join(' y ');
    add('maxMp', { txt: `−${pct(rl)} de máximo · ${low}`, good: false });
  }
  const pain = painLoss(body) > 0 ? ['dolor'] : [];
  const off = 1 - offenseMult(body);
  if (off > 0) {
    const why = [...REGIONS.filter((r) => isLimb(r) && r.startsWith('arm') && (body.parts[r].fracture || isDisabled(body, r))).map((r) => `${side(r)} ${isDisabled(body, r) ? 'inutilizado' : 'roto'}`), ...pain].join(', ');
    add('atk', { txt: `−${pct(off)} de daño · ${why}`, good: false });
    add('mag', { txt: `−${pct(off)} de daño · ${why}`, good: false });
  }
  const ex = exhaustionLoss(needs);
  const ini = 1 - initiativeMult(body, ex);
  if (ini > 0) {
    const why = [...REGIONS.filter((r) => r.startsWith('leg') && (body.parts[r].fracture || isDisabled(body, r))).map((r) => `${side(r)} ${isDisabled(body, r) ? 'inutilizada' : 'rota'}`), ...pain, ...(ex ? ['cansancio'] : [])].join(', ');
    add('spd', { txt: `−${pct(ini)} de iniciativa y paso · ${why}`, good: false });
  }
  return out;
}

/** Columna izquierda: los atributos de Habilidades con sus efectos activos (▼ rojo, ▲ verde). */
export function StatusAttrs({ body }: { body: Body }) {
  const p = useGame((s) => s.profile)!;
  const ch = p.character;
  const st = computeStats(ch.classId, ch.level, p.equipment);
  const base = baseStats(ch.classId, ch.level);
  const marks = statusMarks(body, needsOf(p.needs));
  return (
    <div className="font-body flex flex-col h-full estado-attrs" data-testid="estado-attrs">
      {STAT_KEYS.map((key) => {
        const m = marks[key] ?? [];
        const bonus = st[key] - base[key];
        return (
          <div key={key} className={`hb-stat ${m.length ? (m.every((x) => x.good) ? 'up' : 'down') : ''}`} data-stat={key}>
            <span className="flex justify-between gap-2"><span className="text-stone-300">{key === 'maxMp' ? CLASSES[ch.classId].resourceName : STAT_LABELS[key]}</span>
              <span>{key === 'maxHp' ? `${summaryHp(body)} / ${st.maxHp}` : st[key]}{key !== 'maxHp' && bonus !== 0 && <span className={bonus > 0 ? 'text-heal' : 'text-blood'}> ({bonus > 0 ? '+' : ''}{bonus})</span>}</span></span>
            {m.map((x) => <span key={x.txt} className={`hb-stat-m ${x.good ? 'good' : 'bad'}`}>{x.good ? '▲' : '▼'} {x.txt}</span>)}
          </div>
        );
      })}
      {!Object.keys(marks).length && <p className="text-sm text-stone-400 mt-3 px-1">Sin efectos activos: ni heridas ni hambre, sed o cansancio te restan nada.</p>}
    </div>
  );
}

/** Resumen corto de arriba y botón de Vesper: «Curar · 5 monedas» (desactivado si no llega, con lo que falta). */
export function StatusTop({ body }: { body: Body }) {
  const gold = useGame((s) => s.profile!.gold);
  const cure = useCure();
  const lesions = REGIONS.reduce((n, r) => n + woundsOf(body, r).filter((k) => k !== 'hurt').length, 0);
  const hurt = REGIONS.filter((r) => woundsOf(body, r).length).length;
  const short = cure && !cure.free ? Math.max(0, cure.price - gold) : 0;
  return (
    <div className="estado-top" data-testid="estado-top">
      <span className="font-display text-parchment">Vida <b>{summaryHp(body)}</b> / {body.total}</span>
      {hurt ? <span className="text-blood" data-testid="body-banner">✕ {lesions ? `${lesions} ${lesions === 1 ? 'lesión' : 'lesiones'} · ` : ''}{hurt} {hurt === 1 ? 'parte herida' : 'partes heridas'}</span>
        : <span className="text-heal" data-testid="body-banner">✓ Sin lesiones</span>}
      {cure && (
        <button className="btn btn-gold ml-auto" style={{ minHeight: 44 }} disabled={short > 0} onClick={() => actions.vesperTreat()} data-testid="cure-btn"
          title="Hermana Vesper: toda la vida, las heridas y los huesos. Se paga del oro del almacén.">
          {cure.free ? 'Curar gratis' : `Curar · ${cure.price} ${cure.price === 1 ? 'moneda' : 'monedas'}`}{short > 0 ? ` · te faltan ${short}` : ''}
        </button>
      )}
    </div>
  );
}

/** Las tres barras con su estado (▼ Hambre, Sed o Cansancio) y, debajo, la preparación que ya llevas (▲). */
export function StatusNeeds() {
  const p = useGame((s) => s.profile)!;
  const n = needsOf(p.needs);
  const prep = prepText(p.prep);
  return (
    <div className="estado-needs" data-testid="estado-needs">
      {NEEDS.map((k) => {
        const v = Math.round(n[k]);
        const low = v <= 30;
        return (
          <div key={k} className={`estado-need ${low ? 'low' : ''}`} data-testid={`need-${k}`}>
            <div className="flex justify-between gap-2"><span>{NEED_NAME[k]}{low && <span className="text-blood text-sm"> ▼ {NEED_LOW[k]}{v <= 0 && k !== 'rest' ? ' · hiere el tórax' : ''}</span>}</span><span>{v}</span></div>
            <div className="estado-need-bar"><i style={{ width: `${v}%`, background: NEED_COLOR[k] }} /></div>
          </div>
        );
      })}
      {prep.map((t) => <p key={t} className="text-heal text-sm" data-testid="estado-prep">▲ {t}</p>)}
      <p className="text-xs text-stone-400">Solo bajan en la mazmorra; por encima de 30 no restan nada. El catre está con Grizk.</p>
    </div>
  );
}
