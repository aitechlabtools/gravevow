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
import { regionColor, regionWord, usefulOn, woundsOf } from './BodyFigure';
import { PixelIcon } from '../../shared/community';
import { ItemIcon } from './inventory';
import { COIN_ID } from '../../config/gold';
import { regionCap, regionMaxes } from '../../core/anatomy';

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
    </div>
  );
}

/** Salud general: vida total con su barra, lesiones y el botón de Vesper («Curar · 5 monedas», desactivado si no llega). */
export function StatusTop({ body }: { body: Body }) {
  const gold = useGame((s) => s.profile!.gold);
  const cure = useCure();
  const lesions = REGIONS.reduce((n, r) => n + woundsOf(body, r).filter((k) => k !== 'hurt').length, 0);
  const hurt = REGIONS.filter((r) => woundsOf(body, r).length).length;
  const short = cure && !cure.free ? Math.max(0, cure.price - gold) : 0;
  const hp = summaryHp(body);
  const missing = Math.round(body.total - bodyHp(body));
  const fixes = REGIONS.some((r) => woundsOf(body, r).some((k) => k !== 'hurt'));
  const restores = missing > 0 && fixes ? 'recupera toda la vida y cura todas las lesiones' : fixes ? 'cura todas las lesiones' : 'recupera toda la vida';
  const pc = Math.max(0, Math.min(100, (hp / Math.max(1, body.total)) * 100));
  return (
    <div className="estado-top" data-testid="estado-top">
      <div className="estado-h"><span className="estado-cap">Salud general</span><span className="font-display text-parchment text-xl">{hp} / {body.total}</span></div>
      <div className="estado-hp"><i style={{ width: `${pc}%`, background: pc > 75 ? '#6fae5a' : pc > 45 ? '#e8b33a' : '#d23a3a' }} /></div>
      {(hurt > 0 || !!cure) && <div className="estado-h2">
        <div className="flex flex-col">
          {hurt ? <span className="text-blood" data-testid="body-banner"><span className="estado-dot" aria-hidden>●</span> {lesions ? `${lesions} ${lesions === 1 ? 'lesión' : 'lesiones'} · ` : ''}{hurt} {hurt === 1 ? 'parte herida' : 'partes heridas'}</span>
            : null}
          {missing > 0 && <span className="text-sm text-stone-400" data-testid="estado-missing">−{missing} puntos de vida</span>}
        </div>
        {cure && (
          <button className={`estado-cure ${short > 0 ? 'off' : ''}`} disabled={short > 0} onClick={() => actions.vesperTreat()} data-testid="cure-btn"
            title={`Hermana Vesper: ${restores}. Se paga del oro del almacén.${short > 0 ? ` Te faltan ${short} monedas.` : ''}`}
            aria-label={cure.free ? 'Curar gratis' : `Curar por ${cure.price} ${cure.price === 1 ? 'moneda' : 'monedas'}${short > 0 ? `, te faltan ${short}` : ''}`}>
            <span>Curar</span><span className="estado-cure-sep" aria-hidden />
            {cure.free ? <span>gratis</span> : <span className="estado-cure-price"><ItemIcon itemId={COIN_ID} size={20} />{cure.price}</span>}
          </button>
        )}
      </div>}
    </div>
  );
}

// Estado corporal: silueta plana (escala del lienzo 600 × 300) y una ficha por parte unida con una línea.
const SIL: Record<Region, string> = {
  head: '282,8 318,8 330,22 328,48 314,60 286,60 272,48 270,22',
  thorax: '256,70 344,70 356,84 350,132 250,132 244,84',
  abdomen: '256,138 344,138 340,176 260,176',
  armR: '240,76 252,72 254,132 242,192 222,188 230,128',
  armL: '360,76 348,72 346,132 358,192 378,188 370,128',
  legR: '262,182 298,182 296,292 268,292 264,232',
  legL: '302,182 338,182 336,232 332,292 304,292',
};
const CARD: Record<Region, { x: number; y: number; to: [number, number] }> = {
  head: { x: 402, y: 6, to: [328, 34] }, thorax: { x: 402, y: 64, to: [348, 100] }, abdomen: { x: 402, y: 122, to: [340, 158] },
  armL: { x: 402, y: 180, to: [368, 178] }, legL: { x: 402, y: 238, to: [334, 262] },
  armR: { x: 38, y: 112, to: [232, 150] }, legR: { x: 38, y: 222, to: [280, 256] },
};
const CW = 160, CH = 52;
const CARD_NAME: Record<Region, string> = { head: 'Cabeza', thorax: 'Tórax', abdomen: 'Abdomen', armR: 'Brazo der.', armL: 'Brazo izq.', legR: 'Pierna der.', legL: 'Pierna izq.' };

/** Cuerpo con fichas: tocar una ficha (o su parte) con una cura elegida la aplica; arrastrar una cura encima, también. */
export function BodyMap({ body, shown, onPick }: { body: Body; shown: string | null; onPick: (r: Region) => void }) {
  const drop = (r: Region) => (shown ? (usefulOn(body, shown, r) ? 'yes' : 'no') : null);
  return (
    <div className="bmap" data-testid="body-map">
      <svg viewBox="0 0 600 300" className="bmap-svg" shapeRendering="crispEdges" aria-hidden>
        {REGIONS.map((r) => {
          const c = CARD[r], left = c.x < 300;
          const d = drop(r);
          return (
            <g key={r} className={d ? `bmap-${d}` : undefined}>
              <line x1={left ? c.x + CW : c.x} y1={c.y + CH / 2} x2={c.to[0]} y2={c.to[1]} stroke={d === 'yes' ? '#e8b33a' : '#4a4652'} strokeWidth={1.5} />
              <polygon points={SIL[r]} fill={d === 'yes' ? '#3a2f17' : '#262c27'} stroke={isDisabled(body, r) ? '#6b6470' : regionColor(body, r)} strokeWidth={2} onClick={() => onPick(r)} style={{ cursor: 'pointer', pointerEvents: 'all' }} />
            </g>
          );
        })}
      </svg>
      {REGIONS.map((r) => {
        const c = CARD[r], p = body.parts[r], cap = regionCap(body, r), max = regionMaxes(body.total)[r];
        const w = regionWord(body, r), d = drop(r);
        return (
          <button key={r} type="button" className={`bmap-card ${w.cls !== 'ok' ? 'hurt' : ''} ${d === 'yes' ? 'drop-yes' : d === 'no' ? 'drop-no' : ''}`}
            style={{ left: `${(c.x / 600) * 100}%`, top: `${(c.y / 300) * 100}%`, width: `${(CW / 600) * 100}%`, height: `${(CH / 300) * 100}%`, ['--rc' as string]: regionColor(body, r) }}
            data-drop={JSON.stringify({ type: 'body', region: r })} onClick={() => onPick(r)}
            aria-label={`${REGION_NAME[r]}: ${p.hp} de ${cap}. ${w.word}`} data-testid={`body-row-${r}`}>
            <span className="bmap-name">{CARD_NAME[r]}{w.cls !== 'ok' && <span className={`doll-word ${w.cls}`} data-testid={`body-state-${r}`} title={w.word}>{w.ico}<span className="dw-t"> {w.word}</span></span>}</span>
            <span className="bmap-row"><span className="bmap-bar"><i style={{ width: `${(p.hp / Math.max(1, max)) * 100}%`, background: regionColor(body, r) }} /></span><span className="bmap-hp">{p.hp} / {cap}</span></span>
            {d === 'yes' && <span className="doll-apply" aria-hidden>◆ Aplicar aquí</span>}
          </button>
        );
      })}
    </div>
  );
}

const NEED_ICON: Record<string, string[]> = {
  sat: ['X.X.X...XX', 'X.X.X..XXX', 'X.X.X..XXX', 'XXXXX..XXX', '.XXX...XXX', '..X.....XX', '..X.....X.', '..X.....X.', '..X.....X.', '..X.....X.'],
  hyd: ['....XX....', '....XX....', '...XXXX...', '..XXXXXX..', '..XXXXXX..', '.XXXXXXXX.', '.XXXXXXXX.', '.XXXXXXXX.', '..XXXXXX..', '...XXXX...'],
  rest: ['...XXXX...', '.XXXX.....', '.XXX......', 'XXX.......', 'XXX.......', 'XXX.......', 'XXXX......', '.XXXX...X.', '..XXXXXXX.', '....XXX...'],
};

/** Supervivencia: Saciedad, Hidratación y Descanso en tres tarjetas; con 30 o menos, «▼ Hambre / Sed / Cansancio». */
export function StatusNeeds() {
  const p = useGame((s) => s.profile)!;
  const n = needsOf(p.needs);
  const prep = prepText(p.prep);
  return (
    <div className="estado-needs" data-testid="estado-needs">
      <div className="estado-need-row">
        {NEEDS.map((k) => {
          const v = Math.round(n[k]);
          const low = v <= 30;
          return (
            <div key={k} className={`estado-need ${low ? 'low' : ''}`} data-testid={`need-${k}`} title={NEED_NAME[k]} aria-label={`${NEED_NAME[k]}: ${v} %`}>
              <span className="estado-need-top"><PixelIcon rows={NEED_ICON[k]} size={26} color={NEED_COLOR[k]} label={NEED_NAME[k]} /><span className="text-lg" style={{ color: NEED_COLOR[k] }}>{v} %</span></span>
              {low && <span className="text-blood text-sm">▼ {NEED_LOW[k]}{v <= 0 && k !== 'rest' ? ' · hiere el tórax' : ''}</span>}
            </div>
          );
        })}
      </div>
      {prep.map((t) => <p key={t} className="text-heal text-sm text-center" data-testid="estado-prep">▲ {t}</p>)}
    </div>
  );
}
