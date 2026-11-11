// Contratos de Grizk: elige mercenario, duración y actitud. También muestra el contrato en vigor.
import { useState } from 'react';
import { actions, useGame } from '../state/store';
import { getMerc, MERC_ORDER } from '../../core/data/mercenaries';
import { contractPrice, hireBlock, isUnlocked, mercBaseStats, STANCE_DESC, STANCE_NAME } from '../../core/mercenaries';
import { CONTRACT_OPTIONS } from '../../config/contracts';
import { getSkill } from '../../core/data/skills';
import { getZone } from '../../core/data/zones';
import { MonsterSprite } from './common';
import type { MercStance } from '../../core/types';

export function ContractsPanel() {
  const profile = useGame((s) => s.profile)!;
  const [sel, setSel] = useState<string>(profile.contract?.mercId ?? 'bram');
  const [exps, setExps] = useState(3);
  const [stance, setStance] = useState<MercStance>(profile.contract?.stance ?? 'aggressive');
  const m = getMerc(sel);
  const st = mercBaseStats(m);
  const block = hireBlock(profile, m);
  const contract = profile.contract;
  const unlocked = isUnlocked(profile, m);
  return (
    <div className="space-y-3" data-testid="contracts">
      {contract && (
        <div className="panel panel-gold p-3 flex flex-wrap items-center gap-3" data-testid="contract-active">
          <MonsterSprite sprite={getMerc(contract.mercId).sprite} scale={3} />
          <div className="flex-1 min-w-[12rem]">
            <div className="font-display text-lg text-gold">Contrato en vigor: {getMerc(contract.mercId).name}</div>
            <div className="font-body text-base text-stone-300">Te acompaña {contract.left} {contract.left === 1 ? 'expedición' : 'expediciones'} más · actitud {STANCE_NAME[contract.stance].toLowerCase()}. Si muere, el contrato se rompe.</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['aggressive', 'cautious'] as const).map((s) => (
              <button key={s} className={`btn text-sm py-2 ${contract.stance === s ? 'btn-gold' : ''}`} onClick={() => actions.setMercStance(s)} data-testid={`contract-stance-${s}`}>{STANCE_NAME[s]}</button>
            ))}
            <button className="btn btn-danger text-sm py-2" onClick={() => actions.dismissMerc()} data-testid="contract-dismiss">Rescindir</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-3">
        <div className="grid grid-cols-3 gap-2 content-start" data-testid="merc-list">
          {MERC_ORDER.map((id) => {
            const d = getMerc(id);
            const b = hireBlock(profile, d);
            const known = isUnlocked(profile, d);
            return (
              <button key={id} onClick={() => setSel(id)} data-testid={`merc-${id}`}
                className={`bg-black/30 border p-1.5 flex flex-col items-center text-center ${sel === id ? 'border-gold pulse-gold' : 'border-stone-800 hover:brightness-125'}`}>
                <div className={`h-16 flex items-end ${known ? '' : 'brightness-0 opacity-60'}`}><MonsterSprite sprite={d.sprite} scale={2} /></div>
                <div className="text-[11px] leading-tight mt-1 truncate w-full">{known ? d.name.split(' ')[0] : '¿?'}</div>
                <div className="text-[10px] text-stone-400 truncate w-full">{b ? '🔒 ' : ''}{getZone(d.zone).name}</div>
              </button>
            );
          })}
        </div>

        <div className="bg-black/30 border border-stone-800 p-3 flex flex-col gap-2" data-testid="merc-detail">
          <div className="flex gap-3">
            <div className={`shrink-0 w-24 h-32 bg-black/40 border-2 border-stone-700 flex items-end justify-center ${unlocked ? '' : 'brightness-0 opacity-60'}`}><MonsterSprite sprite={m.sprite} scale={4} /></div>
            <div className="min-w-0">
              <div className="font-display text-xl text-parchment">{unlocked ? m.name : 'Prisionero desconocido'}</div>
              <div className="text-xs text-gold">{m.title} · {getZone(m.zone).name}{m.captive ? ' · rescatable' : ''}</div>
              <p className="font-body text-base text-stone-300 leading-snug mt-1">{unlocked ? m.blurb : `Grizk ha oído que alguien sigue encadenado en ${getZone(m.zone).name}. Si rompes sus cadenas y extraéis con vida, podrás contratar sus servicios.`}</p>
            </div>
          </div>
          {unlocked && (
            <>
              <div className="text-xs text-stone-300 grid grid-cols-3 gap-x-2">
                <span>Vida {st.maxHp}</span><span>Ataque {st.atk}</span><span>Defensa {st.def}</span>
                <span>Magia {st.mag}</span><span>Resist. {st.res}</span><span>Velocidad {st.spd}</span>
              </div>
              <ul className="text-xs space-y-0.5">
                {m.skills.map((id) => { const sk = getSkill(id); return <li key={id}><span className="text-arcane">{sk.name}:</span> <span className="text-stone-400">{sk.description}</span></li>; })}
              </ul>
              <p className="text-[11px] text-stone-500">Sube de fuerza con el nivel de la zona, como las criaturas.</p>
            </>
          )}
          {block ? (
            <p className="text-sm text-stone-400" data-testid="merc-block">🔒 {block}</p>
          ) : (
            <>
              <div className="text-xs text-stone-400 mt-1">Duración</div>
              <div className="grid grid-cols-3 gap-2">
                {CONTRACT_OPTIONS.map((o) => (
                  <button key={o.expeditions} className={`btn py-2 text-sm flex flex-col items-center ${exps === o.expeditions ? 'btn-gold' : ''}`} onClick={() => setExps(o.expeditions)} data-testid={`contract-len-${o.expeditions}`}>
                    <span>{o.expeditions} exp.</span>
                    <span className="text-[11px] opacity-80 normal-case">{contractPrice(profile, m.id, o.expeditions)} oro{o.mult < 1 ? ` · -${Math.round((1 - o.mult) * 100)}%` : ''}</span>
                  </button>
                ))}
              </div>
              <div className="text-xs text-stone-400">Actitud en combate (se puede cambiar luego)</div>
              <div className="grid grid-cols-2 gap-2">
                {(['aggressive', 'cautious'] as const).map((s) => (
                  <button key={s} className={`btn py-2 text-left ${stance === s ? 'btn-gold' : ''}`} onClick={() => setStance(s)} data-testid={`hire-stance-${s}`}>
                    <div className="text-sm">{STANCE_NAME[s]}</div>
                    <div className="font-body text-xs opacity-80 normal-case leading-tight">{STANCE_DESC[s]}</div>
                  </button>
                ))}
              </div>
              {profile.mercDiscounts.includes(m.id) && <p className="text-xs text-heal">Lo rescataste: el primer contrato sale a mitad de precio.</p>}
              <button className="btn btn-gold py-2 mt-1" disabled={!!contract || profile.gold < contractPrice(profile, m.id, exps)}
                onClick={() => actions.hireMerc(m.id, exps, stance)} data-testid="merc-hire">
                {contract ? 'Ya tienes un contrato en vigor' : profile.gold < contractPrice(profile, m.id, exps) ? `Oro insuficiente · ${contractPrice(profile, m.id, exps)}` : `Contratar · ${contractPrice(profile, m.id, exps)} oro`}
              </button>
            </>
          )}
        </div>
      </div>
      <p className="font-body text-sm text-stone-400 italic">Un mercenario te sigue por la mazmorra y lucha a tu lado. Puedes llevar a la vez un mercenario contratado y uno errante de los que encuentres abajo. Si cae en combate, el contrato se rompe y no se devuelve el oro.</p>
    </div>
  );
}
