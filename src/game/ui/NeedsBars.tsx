// Necesidades en pantalla (Fase 5): tira compacta del HUD y panel con el tiempo hasta el siguiente efecto.
// El color va siempre con texto: el estado («Sed», «Hambre grave»…) se escribe cuando penaliza.
import { NEED_CFG, NEED_COLOR, NEED_LOW, NEED_NAME, NEEDS, type Need } from '../../config/needs';
import { ANATOMY } from '../../config/anatomy';
import { needLevel, pulsesToNext, resourceLoss, type Needs } from '../../core/needs';
import type { Body } from '../../core/anatomy';
import { countItem } from '../../core/inventory';
import type { Grid } from '../../core/types';
import { useState } from 'react';
import { useIsTouch } from '../../shared/device';
import { FOOD } from '../../config/food';
import { getItem } from '../../core/data/items';
import { ItemIcon } from './inventory';

const SHORT: Record<Need, string> = { sat: 'Sac', hyd: 'Hid', rest: 'Des' };
const EATS: Need[] = ['sat', 'hyd'];

/** Lo que se puede comer (sat) o beber (hyd) de la mochila; los platos del Refugio se comen allí. */
export function foodsIn(backpack: Grid, need: Need): { id: string; qty: number }[] {
  const ids = [...new Set(backpack.filter((x) => x && FOOD[x.itemId] && !FOOD[x.itemId].dish).map((x) => x!.itemId))];
  return ids.filter((id) => (need === 'hyd') === !!FOOD[id].drink).map((id) => ({ id, qty: countItem(backpack, id) }));
}

/** «+20 Sac · +3 Des» y lo que se desperdicia por pasar de 100. */
function gainText(id: string, needs: Needs): { gain: string; waste: number } {
  const f = FOOD[id];
  let waste = 0;
  const parts = NEEDS.filter((k) => f[k]).map((k) => { waste += Math.max(0, needs[k] + f[k]! - 100); return `+${f[k]} ${SHORT[k]}`; });
  return { gain: parts.join(' · '), waste: Math.round(waste) };
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
export function NeedsPanel({ needs, body, backpack, onUse, note, atBase = false }: { needs: Needs; body?: Body; backpack?: Grid; onUse?: (itemId: string) => void; note?: string; atBase?: boolean }) {
  const touch = useIsTouch();
  const [open, setOpen] = useState<Need | null>(null);
  const loss = resourceLoss(needs);
  return (
    <div className="needs-panel" data-testid="needs-panel">
      {NEEDS.map((k) => {
        const v = needs[k], l = needLevel(v);
        const list = onUse && backpack && EATS.includes(k) ? foodsIn(backpack, k) : null;
        const verb = k === 'hyd' ? 'Beber' : 'Comer';
        return (
          <div key={k} className={`needs-row ${l} ${list && open === k ? "open" : ""}`} data-testid={`need-row-${k}`}>
            <div className="needs-row-top">
              <span className="needs-name">{needState(k, v)}</span>
              <b>{Math.floor(v)}</b>
            </div>
            <span className="needs-bar big"><span style={{ width: `${v}%`, background: NEED_COLOR[k] }} /></span>
            <div className="needs-hint">{atBase ? 'En el Bastión no se gasta.' : nextText(k, needs, body)}</div>
            {list && (
              <button className={`btn body-treat ${touch ? 'touch' : ''} ${open === k ? 'on' : ''}`} onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k} data-testid={`need-open-${k}`}>
                {verb}… ({list.reduce((a, x) => a + x.qty, 0)})
              </button>
            )}
            {list && open === k && (
              <div className="needs-food" data-testid={`need-list-${k}`}>
                {!list.length && <div className="needs-hint">{k === 'hyd' ? 'No llevas bebida. Garth vende odres y vino; Hermana Vesper, té.' : 'No llevas comida. Garth vende raciones; la cocina del Refugio prepara guisos.'}</div>}
                {list.map(({ id, qty }) => {
                  const g = gainText(id, needs);
                  return (
                    <button key={id} className={`needs-food-item ${touch ? 'touch' : ''}`} onClick={() => onUse!(id)} data-testid={`eat-${id}`}>
                      <ItemIcon itemId={id} size={22} />
                      <span className="needs-food-txt"><span>{getItem(id).name} ×{qty}</span><small>{g.gain}{g.waste ? ` · se desperdician ${g.waste}` : ''}</small></span>
                    </button>
                  );
                })}
              </div>
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
