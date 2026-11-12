// Necesidades en pantalla (Fase 5): tira compacta del HUD y panel con el tiempo hasta el siguiente efecto.
// El color va siempre con texto: el estado («Sed», «Hambre grave»…) se escribe cuando penaliza.
import { NEED_CFG, NEED_COLOR, NEED_LOW, NEED_NAME, NEEDS, type Need } from '../../config/needs';
import { ANATOMY } from '../../config/anatomy';
import { needLevel, pulsesToNext, resourceLoss, type Needs } from '../../core/needs';
import type { Body } from '../../core/anatomy';
import { countItem } from '../../core/inventory';
import type { Grid } from '../../core/types';
import { useEffect, useRef, useState } from 'react';
import { useIsTouch } from '../../shared/device';
import { FOOD } from '../../config/food';

const SHORT: Record<Need, string> = { sat: 'Sac', hyd: 'Hid', rest: 'Des' };
const EATS: Need[] = ['sat', 'hyd'];

/** Lo que se puede comer (sat) o beber (hyd) de la mochila; los platos del Refugio se comen allí. */
export function foodsIn(backpack: Grid, need: Need): { id: string; qty: number }[] {
  const ids = [...new Set(backpack.filter((x) => x && FOOD[x.itemId] && !FOOD[x.itemId].dish).map((x) => x!.itemId))];
  return ids.filter((id) => (need === 'hyd') === !!FOOD[id].drink).map((id) => ({ id, qty: countItem(backpack, id) }));
}

const LONG: Record<Need, string> = { sat: 'saciedad', hyd: 'hidratación', rest: 'descanso' };

/** «+25 saciedad, +5 hidratación» y lo que se desperdicia por pasar de 100 (ficha del objeto). */
export function foodGain(id: string, needs?: Needs): { gain: string; waste: number } | null {
  const f = FOOD[id];
  if (!f) return null;
  let waste = 0;
  const parts = NEEDS.filter((k) => f[k]).map((k) => { if (needs) waste += Math.max(0, needs[k] + f[k]! - 100); return `+${f[k]} ${LONG[k]}`; });
  return { gain: parts.join(', '), waste: Math.round(waste) };
}

/** Barra que se rellena con una pequeña animación cuando sube (al comer o beber). */
function NeedBar({ v, color, big = false }: { v: number; color: string; big?: boolean }) {
  const prev = useRef(v);
  const [fill, setFill] = useState(false);
  useEffect(() => {
    if (v > prev.current + 0.5) { setFill(true); const t = window.setTimeout(() => setFill(false), 900); prev.current = v; return () => window.clearTimeout(t); }
    prev.current = v;
  }, [v]);
  return <span className={`needs-bar ${big ? 'big' : ''} ${fill ? 'need-fill' : ''}`} data-fill={fill ? '1' : undefined}><span style={{ width: `${v}%`, background: color }} /></span>;
}

/** Nombre del estado de la barra: normal o el de la penalización. */
export function needState(need: Need, v: number): string {
  const l = needLevel(v);
  if (l === 'ok') return NEED_NAME[need];
  if (l === 'low') return NEED_LOW[need];
  return `${NEED_LOW[need]} grave`;
}

/** Tira del HUD: tres barras finas con su abreviatura; parpadea la que penaliza. */
export function NeedsStrip({ needs }: { needs: Needs }) {
  return (
    <div className="needs-strip" data-testid="hud-needs">
      {NEEDS.map((k) => {
        const v = needs[k], l = needLevel(v);
        return (
          <div key={k} className={`needs-cell ${l}`} title={`${needState(k, v)}: ${Math.floor(v)} / 100`} data-testid={`hud-need-${k}`}>
            <span className="needs-lbl">{SHORT[k]}{l !== 'ok' && <b>{Math.floor(v)}</b>}</span>
            <NeedBar v={v} color={NEED_COLOR[k]} />
          </div>
        );
      })}
    </div>
  );
}

function aprox(pulses: number): string {
  const s = pulses * ANATOMY.pulseSeconds;
  return s < 60 ? `${s} s` : `${Math.round(s / 60)} min`;
}

/** Qué pasará y cuándo (tiempo de exploración activa). */
function nextText(need: Need, n: Needs, body?: Body): string {
  const v = n[need];
  const p = pulsesToNext(n, need, body);
  if (p === null) return 'Iniciativa −20 % hasta que duermas en el catre.';
  if (v > NEED_CFG.warnAt) return `Penaliza en ~${aprox(p)}.`;
  if (v > NEED_CFG.criticalAt) return `Grave en ~${aprox(p)}.`;
  if (v > 0) return need === 'rest' ? `Agotado en ~${aprox(p)}.` : `A cero en ~${aprox(p)}; después hiere el tórax.`;
  return `Herida en el tórax en ~${aprox(p)}.`;
}

/**
 * Panel de necesidades: valor, efecto y tiempo hasta el siguiente efecto. No tiene botones de comer ni de beber: se come
 * desde el objeto (seleccionarlo y «Comer»/«Beber», o doble toque). Si una barra está baja y llevas con qué, un aviso
 * pequeño («Tienes comida en la mochila») resalta esos objetos al tocarlo (`onShowFood`); sin `onShowFood`, solo texto.
 */
export function NeedsPanel({ needs, body, backpack, onShowFood, note, atBase = false }: { needs: Needs; body?: Body; backpack?: Grid; onShowFood?: (ids: string[]) => void; note?: string; atBase?: boolean }) {
  const touch = useIsTouch();
  const loss = resourceLoss(needs);
  return (
    <div className="needs-panel" data-testid="needs-panel">
      {NEEDS.map((k) => {
        const v = needs[k], l = needLevel(v);
        const list = backpack && EATS.includes(k) && (l !== 'ok' || v < NEED_CFG.warnAt + 15) ? foodsIn(backpack, k) : [];
        const hint = list.length ? (k === 'hyd' ? 'Tienes bebida en la mochila' : 'Tienes comida en la mochila') : '';
        return (
          <div key={k} className={`needs-row ${l}`} data-testid={`need-row-${k}`}>
            <div className="needs-row-top">
              <span className="needs-name">{needState(k, v)}</span>
              <b>{Math.floor(v)}</b>
            </div>
            <NeedBar v={v} color={NEED_COLOR[k]} big />
            <div className="needs-hint">{atBase ? 'En el Bastión no se gasta.' : nextText(k, needs, body)}</div>
            {hint && (onShowFood
              ? <button className={`needs-food-hint ${touch ? 'touch' : ''}`} onClick={() => onShowFood(list.map((x) => x.id))} data-testid={`need-food-${k}`}>{hint} ›</button>
              : <div className="needs-food-hint static" data-testid={`need-food-${k}`}>{hint}.</div>)}
          </div>
        );
      })}
      <div className="needs-note">
        {loss > 0 ? `Tu Ímpetu o Maná máximo baja un ${Math.round(loss * 100)} %. ` : ''}
        {note ?? 'Solo se gastan mientras exploras o combates; en el Bastión, no.'}
      </div>
    </div>
  );
}
