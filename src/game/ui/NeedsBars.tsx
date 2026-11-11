// Necesidades en pantalla (Fase 5): tira compacta del HUD y panel con el tiempo hasta el siguiente efecto.
// El color va siempre con texto: el estado («Sed», «Hambre grave»…) se escribe cuando penaliza.
import { NEED_CFG, NEED_COLOR, NEED_LOW, NEED_NAME, NEEDS, type Need } from '../../config/needs';
import { ANATOMY } from '../../config/anatomy';
import { needLevel, pulsesToNext, resourceLoss, type Needs } from '../../core/needs';
import type { Body } from '../../core/anatomy';
import { countItem } from '../../core/inventory';
import type { Grid } from '../../core/types';
import { useIsTouch } from '../../shared/device';
import { ItemIcon } from './inventory';

const SHORT: Record<Need, string> = { sat: 'Sac', hyd: 'Hid', rest: 'Des' };
const ITEM: Partial<Record<Need, string>> = { sat: 'ration', hyd: 'water' };

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
            <span className="needs-bar"><span style={{ width: `${v}%`, background: NEED_COLOR[k] }} /></span>
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

/** Panel de necesidades: valor, efecto, tiempo hasta el siguiente efecto y comer o beber si llevas con qué. */
export function NeedsPanel({ needs, body, backpack, onUse, note }: { needs: Needs; body?: Body; backpack?: Grid; onUse?: (itemId: string) => void; note?: string }) {
  const touch = useIsTouch();
  const loss = resourceLoss(needs);
  return (
    <div className="needs-panel" data-testid="needs-panel">
      {NEEDS.map((k) => {
        const v = needs[k], l = needLevel(v), item = ITEM[k];
        const have = item && backpack ? countItem(backpack, item) : 0;
        return (
          <div key={k} className={`needs-row ${l}`} data-testid={`need-row-${k}`}>
            <div className="needs-row-top">
              <span className="needs-name">{needState(k, v)}</span>
              <b>{Math.floor(v)}</b>
            </div>
            <span className="needs-bar big"><span style={{ width: `${v}%`, background: NEED_COLOR[k] }} /></span>
            <div className="needs-hint">{nextText(k, needs, body)}</div>
            {onUse && item && (
              <button className={`btn body-treat ${touch ? 'touch' : ''}`} disabled={!have || v >= 100} onClick={() => onUse(item)} data-testid={`need-use-${k}`}>
                <ItemIcon itemId={item} size={18} /> {k === 'hyd' ? 'Beber' : 'Comer'} ({have})
              </button>
            )}
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
