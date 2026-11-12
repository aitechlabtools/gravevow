// Anatomía en pantalla (Fase 4): silueta de siete regiones y panel de heridas con sus tratamientos.
// El color siempre va con símbolo o texto: un brazo rojo, uno roto y uno inutilizado se distinguen.
import { ANATOMY, BODY_COLOR, REGION_NAME, REGION_SHORT, VITAL_REGIONS, WOUND_FIXES, WOUND_TEXT, type Region, type WoundKind } from '../../config/anatomy';
import { useEffect, useState, type ReactNode } from 'react';
import { getItem } from '../../core/data/items';
import { useDrag } from './pointerDrag';
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
/** Estado de una región en una palabra (va con su símbolo: nunca solo color). */
export function regionWord(b: Body, r: Region): { word: string; ico: string; cls: string } {
  const p = b.parts[r];
  if (isDisabled(b, r)) return { word: 'Inutilizada', ico: '⊘', cls: 'off' };
  if (p.bleed) return { word: p.bleed === 2 ? 'Sangra mucho' : 'Sangra', ico: p.bleed === 2 ? '◆◆' : '◆', cls: 'bleed' };
  if (p.fracture) return { word: 'Rota', ico: '✕', cls: 'frac' };
  if (p.hp < regionMaxes(b.total)[r]) return { word: 'Herida', ico: '!', cls: 'hurt' };
  return { word: 'Sana', ico: '✓', cls: 'ok' };
}

/** ¿Sirve este objeto en esta región? (para resaltarla mientras se arrastra) */
function usefulOn(body: Body, itemId: string, r: Region): boolean {
  const use = getItem(itemId).use;
  if (use?.kind === 'treat') return use.treat !== 'painkiller' && !treatError(body, use.treat as Treatment, r);
  if (use?.kind === 'heal') return !isDisabled(body, r) && body.parts[r].hp < regionMaxes(body.total)[r];
  return false;
}

function RegionTag({ body, r, on, onPick, drop }: { body: Body; r: Region; on: boolean; onPick?: () => void; drop?: 'yes' | 'no' | null }) {
  const p = body.parts[r];
  const cap = regionCap(body, r);
  const pct = Math.max(0, Math.min(100, (p.hp / Math.max(1, regionMaxes(body.total)[r])) * 100));
  const off = isDisabled(body, r);
  const [x, y] = TAG_POS[r];
  const word = regionWord(body, r);
  return (
    <button type="button" className={`body-tag ${VITAL_REGIONS.includes(r) ? 'vital' : ''} ${on ? 'on' : ''} ${off ? 'off' : ''} ${drop === 'yes' ? 'drop-yes' : drop === 'no' ? 'drop-no' : ''}`} style={{ left: `${x}%`, top: `${y}%` }}
      data-drop={JSON.stringify({ type: 'body', region: r })}
      onClick={onPick} aria-pressed={on} aria-label={`${REGION_NAME[r]}: ${p.hp} de ${cap}. ${regionStatus(body, r).join(', ')}`} data-testid={`body-row-${r}`}>
      <span className="body-tag-name">
        <span className="truncate">{VITAL_REGIONS.includes(r) && <span className="body-vital" aria-hidden="true">◆</span>}<span className="tall-only inline">{TAG_NAME[r]}</span><span className="short-only inline">{REGION_SHORT[r]}</span></span>
        <b>{p.hp}/{cap}</b>
      </span>
      <span className="body-tag-row">
        <span className="body-tag-bar"><span style={{ width: `${pct}%`, background: regionColor(body, r) }} /></span>
        {p.bleed > 0 && <i className={`body-ico bleed ${p.bleed === 2 ? 'heavy' : ''}`} title={p.bleed === 2 ? 'Sangrado grave' : 'Sangrado leve'}>{p.bleed === 2 ? '◆◆' : '◆'}</i>}
        {p.fracture && <i className="body-ico frac" title="Fractura">✕</i>}
        {off && <i className="body-ico off" title="Inutilizada">⊘</i>}
      </span>
      <span className={`body-tag-state ${word.cls}`} data-testid={`body-state-${r}`}>{word.ico} {word.word}</span>
    </button>
  );
}

/** Lesiones de una región, de la más urgente a la menos. */
function woundsOf(b: Body, r: Region): WoundKind[] {
  const p = b.parts[r];
  const out: WoundKind[] = [];
  if (p.bleed === 2) out.push('bleed2');
  if (p.bleed === 1) out.push('bleed1');
  if (p.fracture) out.push('fracture');
  if (isDisabled(b, r) && !p.operated) out.push('disabled');
  if (p.operated) out.push('operated');
  if (!out.length && !isDisabled(b, r) && p.hp < regionMaxes(b.total)[r]) out.push('hurt');
  return out;
}

/** Pista de una cura que sirve pero no es la más adecuada. */
function fixHint(k: WoundKind, t: Treatment): string {
  if (k === 'bleed1' && t === 'tourniquet') return 'También sirve; guárdalo para uno grave';
  if (k === 'bleed1' && t === 'hemostatic') return 'También sirve; mejor para uno grave';
  if (t === 'surgery') return 'Tarda dos pulsos; si algo te hiere, se pierde';
  if (t === 'splint') return 'Entablilla el hueso roto';
  return k === 'bleed2' ? 'Corta el sangrado grave' : 'Corta el sangrado leve';
}

/**
 * Panel de heridas y necesidades (bloque 1, fase 5): el cuerpo con sus siete partes (◆ las vitales), el detalle de la
 * parte elegida con cada lesión y lo que la cura (lo que llevas, con «Usar»; lo que no, dice quién lo vende) y,
 * debajo, las necesidades (`children`).
 */
export function BodyPanel({ body, backpack, onTreat, onHeal, surgery, note, combat, full, children }: {
  body: Body; backpack?: Grid; onTreat?: (itemId: string, region: Region) => void;
  /** Pociones de vida (Estado, en el Bastión): curan el cuerpo entero. */
  onHeal?: (itemId: string) => void;
  surgery?: { region: Region; left: number } | null; note?: string;
  /** En combate, curar gasta el turno. */
  combat?: boolean;
  /** Ocupa todo el alto disponible (Intendencia → Estado). */
  full?: boolean;
  children?: ReactNode;
}) {
  const touch = useIsTouch();
  const have = (t: Treatment) => !!backpack && countItem(backpack, TREATMENT_ITEM[t]) > 0;
  const count = (t: Treatment) => (backpack ? countItem(backpack, TREATMENT_ITEM[t]) : 0);
  const first = urgencies(body)[0]?.region ?? REGIONS.find((r) => woundsOf(body, r).length) ?? 'thorax';
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
  // Arrastrar un objeto de cura a una parte del cuerpo (resalta dónde sirve)
  const drag = useDrag();
  const dragUse = drag && onTreat ? getItem(drag.itemId).use : null;
  const dragging = dragUse && (dragUse.kind === 'treat' || (dragUse.kind === 'heal' && onHeal)) ? drag!.itemId : null;
  useEffect(() => {
    if (!onTreat) return;
    const f = (e: Event) => {
      const { itemId, region } = (e as CustomEvent<{ itemId: string; region: Region }>).detail;
      const use = getItem(itemId).use;
      setSel(region); setPick(null);
      if (use?.kind === 'treat') onTreat(itemId, region);
      else if (use?.kind === 'heal' && onHeal) onHeal(itemId);
    };
    window.addEventListener('cr-drop-body', f);
    return () => window.removeEventListener('cr-drop-body', f);
  }, [onTreat, onHeal]);
  // Tocar para curar (fase 6): eliges una cura de tu mochila y el cuerpo resalta dónde sirve; o eliges una parte y se resaltan sus curas.
  const [pick, setPick] = useState<string | null>(null);
  const kit = onTreat && backpack ? [...new Set(backpack.filter((x) => x && x.itemId !== 'cover').map((x) => x!.itemId))]
    .filter((id) => { const u = getItem(id).use; return (u?.kind === 'treat' && u.treat !== 'painkiller') || (u?.kind === 'heal' && !!onHeal); }) : [];
  const apply = (itemId: string, r: Region) => {
    const use = getItem(itemId).use;
    if (use?.kind === 'treat') onTreat!(itemId, r);
    else if (use?.kind === 'heal' && onHeal) onHeal(itemId);
  };
  const tapRegion = (r: Region) => {
    if (pick && !surgery && usefulOn(body, pick, r)) { apply(pick, r); setPick(null); }
    else if (pick) setPick(null);
    setSel(r);
  };
  const shown = dragging ?? (pick && kit.includes(pick) ? pick : null);
  const wounds = woundsOf(body, sel);
  const canTreat = !!onTreat && !surgery;
  const potion = onHeal && backpack && !isDisabled(body, sel) && body.parts[sel].hp < regionMaxes(body.total)[sel] ? (backpack.find((x) => x && x.itemId !== 'cover' && getItem(x.itemId).use?.kind === 'heal')?.itemId ?? null) : null;
  const others = REGIONS.filter((r) => r !== sel && woundsOf(body, r).some((k) => k !== 'hurt'));
  const hurtCount = REGIONS.filter((r) => woundsOf(body, r).some((k) => k !== 'hurt')).length;
  const btnCls = `btn body-treat ${touch ? 'touch' : ''}`;
  return (
    <div className={`body-panel ${full ? 'full' : ''}`} data-testid="body-panel">
      <div className="body-box">
        <div className="body-box-head"><span className="font-display text-parchment">Cuerpo</span><span className="body-legend">◆ zona vital</span></div>
        <div className="body-map" data-testid="body-map">
          <Ghost body={body} />
          {REGIONS.map((r) => <RegionTag key={r} body={body} r={r} on={sel === r} onPick={() => tapRegion(r)} drop={shown ? (usefulOn(body, shown, r) ? 'yes' : 'no') : null} />)}
        </div>
        <div className={`body-total ${dead ? 'dead' : ''}`} data-testid="body-total">
          <span>Vida <b>{dead ? 0 : total}</b> / {body.total}</span>
          <span className="body-total-r">{hurtCount ? `${hurtCount} ${hurtCount === 1 ? 'parte con lesiones' : 'partes con lesiones'}` : 'Sin lesiones'}</span>
        </div>
      </div>
      <div className="body-side">
        {kit.length > 0 && (
          <div className="body-kit" data-testid="body-kit">
            <span className="body-kit-title">{pick ? `${touch ? 'Toca' : 'Elige'} la parte que quieres curar` : 'Tus curas'}</span>
            <div className="body-kit-row">
              {kit.map((id) => {
                const fit = usefulOn(body, id, sel);
                return (
                  <button key={id} type="button" className={`body-kit-item ${pick === id ? 'on' : ''} ${fit ? 'fit' : ''}`} aria-pressed={pick === id}
                    aria-label={`${getItem(id).name} (${countItem(backpack!, id)})${fit ? `: sirve en ${REGION_NAME[sel].toLowerCase()}` : ''}`} title={getItem(id).name}
                    onClick={() => setPick(pick === id ? null : id)} data-testid={`kit-${id}`}>
                    <ItemIcon itemId={id} size={24} /><b>{countItem(backpack!, id)}</b>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {note && <p className="body-note">{note}</p>}
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
          <div className="body-detail-title">{VITAL_REGIONS.includes(sel) && <span className="text-gold">◆ </span>}{REGION_NAME[sel]} <span className="text-stone-400 text-sm">{body.parts[sel].hp}/{regionCap(body, sel)}</span></div>
          {!wounds.length && <div className="text-xs text-stone-400" data-testid="body-sound">{isDisabled(body, sel) ? regionStatus(body, sel).join(' · ') : 'Sana. Sin lesiones.'}</div>}
          {wounds.map((k) => {
            const w = WOUND_TEXT[k];
            const fixes = canTreat ? WOUND_FIXES[k].filter((t) => !treatError(body, t, sel)) : [];
            return (
              <div key={k} className={`wound-card ${k}`} data-testid={`wound-${k}-${sel}`}>
                <div className="wound-name">{w.ico} {w.name}{k === 'fracture' && !body.painFree ? ' · duele' : ''}</div>
                <div className="wound-text">{w.text}</div>
                {fixes.map((t) => have(t) ? (
                  <div key={t} className="wound-opt">
                    <span className="wound-slot"><ItemIcon itemId={TREATMENT_ITEM[t]} size={22} /><b>{count(t)}</b></span>
                    <span className="wound-info">{TREATMENT_NAME[t]}<small>{fixHint(k, t)}</small></span>
                    <button className={`${btnCls} ${t === WOUND_FIXES[k].find((x) => have(x) && !treatError(body, x, sel)) ? 'go' : ''}`} onClick={() => onTreat!(TREATMENT_ITEM[t], sel)} data-testid={`treat-${t}-${sel}`}>Usar</button>
                  </div>
                ) : (
                  <p key={t} className="wound-miss" data-testid={`fix-missing-${t}`}>
                    <ItemIcon itemId={TREATMENT_ITEM[t]} size={16} /> {TREATMENT_NAME[t]}: no llevas · lo vende Hermana Vesper
                  </p>
                ))}
                {k === 'operated' && <p className="wound-lock" data-testid={`wound-lock-${sel}`}>🔒 Solo en el Bastión: Hermana Vesper</p>}
                {k === 'disabled' && canTreat && !fixes.length && <p className="wound-lock" data-testid={`wound-lock-${sel}`}>🔒 Solo en el Bastión: Hermana Vesper</p>}
                {k === 'hurt' && potion && (
                  <div className="wound-opt">
                    <span className="wound-slot"><ItemIcon itemId={potion} size={22} /></span>
                    <span className="wound-info">{getItem(potion).name}<small>Devuelve vida, no cierra heridas</small></span>
                    <button className={`${btnCls} go`} onClick={() => onHeal!(potion)} data-testid={`heal-${sel}`}>Usar</button>
                  </div>
                )}
              </div>
            );
          })}
          {wounds.some((k) => k !== 'hurt') && potion && (
            <button className={`${btnCls} mt-1`} onClick={() => onHeal!(potion)} data-testid={`heal-${sel}`}>
              <ItemIcon itemId={potion} size={18} />{getItem(potion).name} · devuelve vida, no cierra heridas
            </button>
          )}
          {combat && canTreat && wounds.length > 0 && <p className="wound-turn">Curar gasta tu turno.</p>}
        </div>
        {others.length > 0 && (
          <div className="body-others" data-testid="body-others">
            <span className="text-stone-400">Otras heridas:</span>
            {others.map((r) => <button key={r} type="button" className="body-other" onClick={() => setSel(r)}>{TAG_NAME[r]}: {woundsOf(body, r).filter((k) => k !== 'hurt').map((k) => WOUND_TEXT[k].name.toLowerCase()).join(', ')}</button>)}
          </div>
        )}
        {onTreat && !REGIONS.some((r) => options(r).length) && urgencies(body).length > 0 && <p className="body-note mt-2">No llevas nada que sirva para estas heridas. Hermana Vesper vende vendas, torniquetes, férulas y hemostáticos.</p>}
        {!urgencies(body).length && <p className="body-note mt-2">Sin sangrados ni fracturas.{REGIONS.some((r) => isLimb(r) && body.parts[r].hp < regionCap(body, r)) ? ' La vida perdida se recupera con pociones.' : ''}</p>}
        <p className="body-note body-hint">{kit.length ? `${touch ? 'Toca' : 'Haz clic en'} una cura y luego la parte del cuerpo${touch ? '' : ', o arrástrala hasta ella'}.` : `${touch ? 'Toca' : 'Haz clic en'} otra parte del cuerpo para ver sus heridas.`}</p>
      </div>
      {children && <div className="body-needs">{children}</div>}
    </div>
  );
}
