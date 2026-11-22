// Contratos de Grizk: rejilla de bustos por zona y ficha del elegido (duración, actitud y contratar).
// Rediseño visual del 22/11 (maqueta en mockups/contratos). Estilos: bloque «Contratos de Grizk» de game.css.
import { useState } from 'react';
import { actions, useGame } from '../state/store';
import { getMerc, MERC_ORDER } from '../../core/data/mercenaries';
import { contractPrice, hireBlock, isUnlocked, mercBaseStats, STANCE_DESC, STANCE_NAME } from '../../core/mercenaries';
import { CONTRACT_OPTIONS } from '../../config/contracts';
import { getSkill } from '../../core/data/skills';
import { getZone } from '../../core/data/zones';
import { MonsterSprite } from './common';
import { iconUrl, monsterUrl } from '../../shared/art';
import { useLayout } from '../../config/ui';
import { REP_RANKS } from '../../config/reputation';
import type { MercStance } from '../../core/types';

const ZONES = ['mazmorra', 'cripta', 'infierno'] as const;

/** Busto cuadrado (cabeza y pecho del sprite), a escala entera. Oscuro si aún no se conoce. */
function Bust({ sprite, scale, dark, dim }: { sprite: string; scale: number; dark?: boolean; dim?: boolean }) {
  const side = 20 * scale;
  return (
    <span className={`ct-bust ${dark ? 'ct-dark' : dim ? 'ct-dim' : ''}`} style={{ width: side + 4, height: side + 4 }} aria-hidden>
      <img src={monsterUrl(sprite, scale)} className="pixelated" alt="" draggable={false} />
    </span>
  );
}

const STAT_ICONS = [['amulet_heart', 'Vida', 'maxHp'], ['sword', 'Ataque', 'atk'], ['shield', 'Defensa', 'def'], ['boots_swift', 'Velocidad', 'spd']] as const;

export function ContractsPanel() {
  const profile = useGame((s) => s.profile)!;
  const layout = useLayout();
  const phone = layout === 'phone';
  const [sel, setSel] = useState<string>(profile.contract?.mercId ?? 'bram');
  const [exps, setExps] = useState(3);
  const [stance, setStance] = useState<MercStance>(profile.contract?.stance ?? 'aggressive');
  const m = getMerc(sel);
  const st = mercBaseStats(m);
  const block = hireBlock(profile, m);
  const contract = profile.contract;
  const unlocked = isUnlocked(profile, m);
  const price = contractPrice(profile, m.id, exps);
  const k = phone ? 2 : layout === 'tablet' ? 3 : 5;
  const kb = phone ? 3 : layout === 'tablet' ? 4 : 12;
  const compact = layout !== 'desktop';
  return (
    <div className="ct" data-testid="contracts">
      {contract && (
        <div className="ct-active" data-testid="contract-active">
          <MonsterSprite sprite={getMerc(contract.mercId).sprite} scale={2} />
          <b className="ct-active-name">{getMerc(contract.mercId).name}</b>
          <span className="ct-active-left">{contract.left} {contract.left === 1 ? 'expedición' : 'expediciones'}</span>
          <span className="flex-1" />
          {(['aggressive', 'cautious'] as const).map((s) => (
            <button key={s} className={`btn ${contract.stance === s ? 'btn-gold' : ''}`} onClick={() => actions.setMercStance(s)} title={STANCE_DESC[s]} data-testid={`contract-stance-${s}`}>{STANCE_NAME[s]}</button>
          ))}
          <button className="btn btn-danger" onClick={() => actions.dismissMerc()} data-testid="contract-dismiss">Rescindir</button>
        </div>
      )}

      <div className="ct-main">
        <div className="ct-list" data-testid="merc-list">
          {ZONES.map((z) => (
            <div key={z} className="ct-zone">
              {!phone && <div className="ct-lbl">{getZone(z).name}</div>}
              <div className="ct-row">
                {MERC_ORDER.map(getMerc).filter((d) => d.zone === z).map((d) => {
                  const known = isUnlocked(profile, d);
                  const locked = known && !!hireBlock(profile, d) && !d.captive;
                  return (
                    <button key={d.id} onClick={() => setSel(d.id)} data-testid={`merc-${d.id}`} className={`ct-card ${sel === d.id ? 'ct-sel' : ''}`} title={known ? d.name : 'Desconocido'}>
                      {locked && <span className="ct-rank" title={`Necesitas el rango «${REP_RANKS[d.rank].name}» con Grizk`}>🔒{compact ? "" : ` ${REP_RANKS[d.rank].name}`}</span>}
                      <Bust sprite={d.sprite} scale={k} dark={!known} dim={locked} />
                      <span className={`ct-name ${known ? '' : 'ct-unknown'}`}>{known ? d.name.split(' ')[0] : '¿?'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="ct-detail" data-testid="merc-detail">
          <div className="ct-head">
            <Bust sprite={m.sprite} scale={kb} dark={!unlocked} />
            <div className="ct-info">
              <h2 className="ct-title">{unlocked ? m.name : 'Prisionero desconocido'}</h2>
              <div className="ct-sub">{m.title} · {getZone(m.zone).name}</div>
              {!compact && <p className="ct-blurb">{unlocked ? m.blurb : `Grizk ha oído que alguien sigue encadenado en ${getZone(m.zone).name}. Rompe sus cadenas y extraed con vida.`}</p>}
              {unlocked && !compact && <div className="ct-skills">{m.skills.map((id) => { const sk = getSkill(id); return <span key={id} className="ct-chip" title={sk.description}>{sk.name}</span>; })}</div>}
            </div>
          </div>
          {unlocked && (
            <div className="ct-stats">
              {STAT_ICONS.map(([icon, label, key]) => (
                <span key={key} className="ct-stat" title={label} aria-label={`${label} ${st[key]}`}><img src={iconUrl(icon, layout === 'desktop' ? 3 : 2)} className="pixelated" alt="" />{st[key]}</span>
              ))}
            </div>
          )}
          <div className="ct-buy">
            {!block && (
              <>
                {!phone && <div className="ct-lbl">Expediciones</div>}
                <div className="ct-lens">
                  {CONTRACT_OPTIONS.map((o) => (
                    <button key={o.expeditions} className={`btn ct-len ${exps === o.expeditions ? 'btn-gold' : ''}`} onClick={() => setExps(o.expeditions)} data-testid={`contract-len-${o.expeditions}`}>
                      <b>{o.expeditions}</b>
                      <span><img src={iconUrl('coin', 1)} className="pixelated" alt="" />{contractPrice(profile, m.id, o.expeditions)}</span>
                      {o.mult < 1 && <i className="ct-disc">−{Math.round((1 - o.mult) * 100)} %</i>}
                    </button>
                  ))}
                </div>
                {!phone && <div className="ct-lbl">En combate</div>}
                <div className="ct-stances">
                  {(['aggressive', 'cautious'] as const).map((s) => (
                    <button key={s} className={`btn ${stance === s ? 'btn-gold' : ''}`} onClick={() => setStance(s)} title={STANCE_DESC[s]} data-testid={`hire-stance-${s}`}>{s === 'aggressive' ? '⚔' : '⛨'} {STANCE_NAME[s]}</button>
                  ))}
                </div>
              </>
            )}
            {block ? (
              <div className="btn ct-cta ct-off" data-testid="merc-block">🔒 {block}</div>
            ) : (
              <button className="btn btn-gold ct-cta" disabled={!!contract || profile.gold < price} onClick={() => actions.hireMerc(m.id, exps, stance)} data-testid="merc-hire">
                {contract ? 'Ya tienes un contrato en vigor' : profile.gold < price ? `Te faltan ${price - profile.gold} de oro · Contratar ${price}` : `Contratar · ${price} oro${profile.mercDiscounts.includes(m.id) ? ' (mitad por rescatarlo)' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
