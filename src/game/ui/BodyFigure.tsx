// Anatomía en pantalla (Fase 4): silueta de siete regiones y panel de heridas con sus tratamientos.
// El color siempre va con símbolo o texto: un brazo rojo, uno roto y uno inutilizado se distinguen.
import { ANATOMY, BODY_COLOR, REGION_NAME, type Region } from '../../config/anatomy';
import { useState, type ReactNode } from 'react';
import { bodyHp, isDisabled, isLimb, painfulRegions, summaryHp, regionCap, regionMaxes, REGIONS, treatError, TREATMENT_NAME, urgencies, bestTreatment, type Body, type Treatment } from '../../core/anatomy';
import { countItem } from '../../core/inventory';
import type { Grid } from '../../core/types';
import { useIsTouch } from '../../shared/device';
import { TREATMENT_ITEM } from '../state/medicalActions';
import { ItemIcon } from './inventory';

/** Casillas de la silueta (rejilla de 9 × 15): x, y, ancho y alto. */
const SHAPE: Record<Region, [number, number, number, number]> = {
  head: [3, 0, 3, 3], thorax: [2, 3, 5, 4], abdomen: [2, 7, 5, 2],
  armR: [0, 3, 2, 6], armL: [7, 3, 2, 6], legR: [2, 9, 2, 6], legL: [5, 9, 2, 6],
};

export function regionColor(b: Body, r: Region): string {
  if (isDisabled(b, r)) return BODY_COLOR.disabled;
  const pct = b.parts[r].hp / Math.max(1, regionMaxes(b.total)[r]);
  return pct > 0.75 ? BODY_COLOR.ok : pct > 0.45 ? BODY_COLOR.hurt : pct > 0.2 ? BODY_COLOR.bad : BODY_COLOR.critical;
}

/** Texto de una región: vida y lesiones. */
export function regionStatus(b: Body, r: Region): string[] {
  const p = b.parts[r];
  const out: string[] = [];
  if (isDisabled(b, r)) out.push('Inutilizada');
  else if (r === 'head' || r === 'thorax') { if (p.hp <= regionMaxes(b.total)[r] * 0.3) out.push('¡Peligro de muerte!'); }
  if (p.bleed === 2) out.push('Sangrado grave');
  else if (p.bleed === 1) out.push('Sangrado leve');
  if (p.fracture) out.push('Fractura');
  if ((p.fracture || isDisabled(b, r)) && !b.painFree) out.push('Dolor');
  if (p.operated) out.push('Operada');
  return out;
}

/** Silueta pixelada (escala entera). `unit`: píxeles por casilla. */
export function BodyFigure({ body, unit = 3, onClick, testId, label = 'Heridas' }: { body: Body; unit?: number; onClick?: () => void; testId?: string; label?: string }) {
  const w = 9 * unit, h = 15 * unit;
  const hurt = urgencies(body).length > 0;
  const svg = (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true">
      {REGIONS.map((r) => {
        const [x, y, cw, ch] = SHAPE[r];
        const p = body.parts[r];
        const X = x * unit, Y = y * unit, W = cw * unit, H = ch * unit;
        const m = Math.max(1, Math.floor(unit / 3));
        return (
          <g key={r} data-region={r}>
            <rect x={X + m / 2} y={Y + m / 2} width={W - m} height={H - m} fill={regionColor(body, r)} stroke={BODY_COLOR.outline} strokeWidth={m} />
            {isDisabled(body, r) && <line x1={X + m} y1={Y + H - m} x2={X + W - m} y2={Y + m} stroke="#8c8693" strokeWidth={m} />}
            {p.fracture && <><line x1={X + m} y1={Y + H / 2 - unit} x2={X + W - m} y2={Y + H / 2 + unit} stroke="#f2ead8" strokeWidth={m} /><line x1={X + W - m} y1={Y + H / 2 - unit} x2={X + m} y2={Y + H / 2 + unit} stroke="#f2ead8" strokeWidth={m} /></>}
            {p.bleed > 0 && <rect x={X + W - unit - m} y={Y + m} width={unit} height={p.bleed === 2 ? unit * 2 : unit} fill="#ff2030" stroke={BODY_COLOR.outline} strokeWidth={m / 2} />}
          </g>
        );
      })}
    </svg>
  );
  const summary = REGIONS.map((r) => `${REGION_NAME[r]}: ${body.parts[r].hp}/${regionCap(body, r)}${regionStatus(body, r).length ? ` (${regionStatus(body, r).join(', ').toLowerCase()})` : ''}`).join('. ');
  if (!onClick) return <span className="inline-block" role="img" aria-label={summary} data-testid={testId}>{svg}</span>;
  return (
    <button type="button" className={`body-btn ${hurt ? 'hurt' : ''}`} onClick={onClick} aria-label={`${label}. ${summary}`} title={label} data-testid={testId}>
      {svg}
    </button>
  );
}

/** Dónde va la etiqueta de cada región en el mapa (porcentaje del ancho y del alto), al estilo de un parte médico. */
const TAG_POS: Record<Region, [number, number]> = {
  head: [62, 2], thorax: [36, 20], abdomen: [36, 42], armR: [0, 42], armL: [70, 42], legR: [6, 72], legL: [62, 72],
};

/** Nombre corto en la etiqueta (el completo va en el detalle y para lectores de pantalla). */
const TAG_NAME: Record<Region, string> = { head: 'Cabeza', thorax: 'Tórax', abdomen: 'Abdomen', armR: 'Brazo der.', armL: 'Brazo izq.', legR: 'Pierna der.', legL: 'Pierna izq.' };

/** Silueta de fondo, neutra: solo se tiñen (tenue) las regiones heridas. */
function Ghost({ body }: { body: Body }) {
  const u = 10;
  return (
    <svg className="body-ghost" viewBox={`0 0 ${9 * u} ${15 * u}`} shapeRendering="crispEdges" aria-hidden="true">
      {REGIONS.map((r) => {
        const [x, y, w, h] = SHAPE[r];
        const hurt = body.parts[r].hp < regionMaxes(body.total)[r] || body.parts[r].bleed > 0 || body.parts[r].fracture;
        return <rect key={r} x={x * u + 1} y={y * u + 1} width={w * u - 2} height={h * u - 2} fill={hurt ? regionColor(body, r) : '#3a3640'} opacity={hurt ? 0.45 : 1} />;
      })}
    </svg>
  );
}

/** Etiqueta de una región: nombre, vida y una barra fina; las lesiones con símbolo (nunca solo color). */
function RegionTag({ body, r, on, onPick }: { body: Body; r: Region; on: boolean; onPick?: () => void }) {
  const p = body.parts[r];
  const cap = regionCap(body, r);
  const pct = Math.max(0, Math.min(100, (p.hp / Math.max(1, regionMaxes(body.total)[r])) * 100));
  const off = isDisabled(body, r);
  const [x, y] = TAG_POS[r];
  return (
    <button type="button" className={`body-tag ${on ? 'on' : ''} ${off ? 'off' : ''}`} style={{ left: `${x}%`, top: `${y}%` }}
      onClick={onPick} aria-pressed={on} aria-label={`${REGION_NAME[r]}: ${p.hp} de ${cap}. ${regionStatus(body, r).join(', ')}`} data-testid={`body-row-${r}`}>
      <span className="body-tag-name">
        <span className="truncate">{TAG_NAME[r]}</span>
        <b>{p.hp}/{cap}</b>
      </span>
      <span className="body-tag-row">
        <span className="body-tag-bar"><span style={{ width: `${pct}%`, background: regionColor(body, r) }} /></span>
        {p.bleed > 0 && <i className={`body-ico bleed ${p.bleed === 2 ? 'heavy' : ''}`} title={p.bleed === 2 ? 'Sangrado grave' : 'Sangrado leve'}>{p.bleed === 2 ? '◆◆' : '◆'}</i>}
        {p.fracture && <i className="body-ico frac" title="Fractura">✕</i>}
        {off && <i className="body-ico off" title="Inutilizada">⊘</i>}
      </span>
    </button>
  );
}

/**
 * Panel de heridas: mapa del cuerpo (silueta tenue con una etiqueta por región) y, al lado, la región
 * elegida con sus lesiones y los tratamientos que llevas y sirven ahí. Lo que no sirve no aparece.
 */
export function BodyPanel({ body, backpack, onTreat, surgery, note, children }: {
  body: Body; backpack?: Grid; onTreat?: (itemId: string, region: Region) => void;
  surgery?: { region: Region; left: number } | null; note?: string; children?: ReactNode;
}) {
  const touch = useIsTouch();
  const have = (t: Treatment) => !!backpack && countItem(backpack, TREATMENT_ITEM[t]) > 0;
  const first = urgencies(body)[0]?.region ?? 'thorax';
  const [sel, setSel] = useState<Region>(first);
  const quick = (() => {
    if (!onTreat) return null;
    for (const u of urgencies(body)) {
      if (u.need === 'disabled') continue;
      const t = bestTreatment(body, u, have);
      if (t) return { t, r: u.region };
    }
    return null;
  })();
  const options = (r: Region): Treatment[] => (['bandage', 'hemostatic', 'tourniquet', 'splint', 'surgery'] as Treatment[]).filter((t) => have(t) && !treatError(body, t, r));
  const total = bodyHp(body), dead = summaryHp(body) === 0;
  const st = regionStatus(body, sel);
  const opts = onTreat && !surgery ? options(sel) : [];
  return (
    <div className="body-panel" data-testid="body-panel">
      <div className="body-map" data-testid="body-map">
        <Ghost body={body} />
        {REGIONS.map((r) => <RegionTag key={r} body={body} r={r} on={sel === r} onPick={() => setSel(r)} />)}
        <div className={`body-total ${dead ? 'dead' : ''}`} data-testid="body-total">Vida <b>{dead ? 0 : total}</b> / {body.total}</div>
      </div>
      <div className="body-side">
        {note && <p className="text-xs text-stone-400 mb-2">{note}</p>}
        {surgery && <p className="text-sm text-gold mb-2" data-testid="body-surgery">Operando {REGION_NAME[surgery.region].toLowerCase()}: faltan {surgery.left} pulsos. Si algo te hiere, se pierde el equipo.</p>}
        {body.painFree ? <p className="text-xs text-[#b48ad8] mb-2" data-testid="body-painfree">Analgésico: sin dolor durante {body.painFree} pulsos más.</p>
          : onTreat && painfulRegions(body).length > 0 && have('painkiller') && (
          <button className="btn w-full mb-2 flex items-center justify-center gap-2" onClick={() => onTreat('painkiller', 'thorax')} data-testid="body-painkiller">
            <ItemIcon itemId="painkiller" size={20} /> Analgésico: calmar el dolor ({ANATOMY.painkillerPulses} pulsos)
          </button>
        )}
        {quick && (
          <button className="btn btn-gold w-full mb-2 flex items-center justify-center gap-2" onClick={() => onTreat!(TREATMENT_ITEM[quick.t], quick.r)} data-testid="body-quick">
            <ItemIcon itemId={TREATMENT_ITEM[quick.t]} size={20} /> {TREATMENT_NAME[quick.t]} → {REGION_NAME[quick.r].toLowerCase()}
          </button>
        )}
        <div className="body-detail" data-testid="body-detail">
          <div className="font-display text-parchment">{REGION_NAME[sel]} <span className="text-stone-400 text-sm">{body.parts[sel].hp}/{regionCap(body, sel)}</span></div>
          <div className="text-xs" style={{ color: st.length ? '#e8b33a' : '#8c8693' }}>{st.length ? st.join(' · ') : 'Sin lesiones'}</div>
          {opts.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {opts.map((t) => (
                <button key={t} className={`btn body-treat ${touch ? 'touch' : ''}`} onClick={() => onTreat!(TREATMENT_ITEM[t], sel)} data-testid={`treat-${t}-${sel}`}>
                  <ItemIcon itemId={TREATMENT_ITEM[t]} size={18} />{TREATMENT_NAME[t]}
                </button>
              ))}
            </div>
          )}
        </div>
        {onTreat && !REGIONS.some((r) => options(r).length) && urgencies(body).length > 0 && <p className="text-xs text-stone-400 mt-2">No llevas nada que sirva para estas heridas. Hermana Vesper vende vendas, torniquetes, férulas y hemostáticos.</p>}
        {!urgencies(body).length && <p className="text-xs text-stone-400 mt-2">Sin sangrados ni fracturas.{REGIONS.some((r) => isLimb(r) && body.parts[r].hp < regionCap(body, r)) ? ' La vida perdida se recupera con pociones.' : ''}</p>}
        {children}
      </div>
    </div>
  );
}
