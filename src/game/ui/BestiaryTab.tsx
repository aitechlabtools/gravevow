// Bestiario: fichas de criaturas que se desbloquean al verlas y derrotarlas.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../state/store';
import { ENEMIES, getEnemy } from '../../core/data/enemies';
import { enemyAttackLine } from '../../core/armor';
import { getSkill } from '../../core/data/skills';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { STATUSES } from '../../core/statuses';
import { ZONES, type ZoneId } from '../../core/data/zones';
import { bestiaryByZone, bestiaryProgress, knowledge, type Knowledge } from '../../core/bestiary';
import { BESTIARY_LORE } from '../../core/data/bestiaryLore';
import { BESTIARY_BASIC_KILLS, BESTIARY_FULL_KILLS } from '../../config/bestiary';
import { monsterUrl } from '../../shared/art';
import { ItemIcon } from './inventory';

const STAT_NAMES: [keyof import('../../core/types').Stats, string][] = [['maxHp', 'Vida'], ['atk', 'Ataque'], ['def', 'Defensa'], ['mag', 'Magia'], ['res', 'Resistencia'], ['spd', 'Velocidad'], ['crit', 'Crítico'], ['eva', 'Evasión']];

export function BestiaryTab() {
  const rec = useGame((s) => s.profile!.bestiary);
  const kills = useGame((s) => s.profile!.stats.kills);
  const beaten = useGame((s) => s.profile!.bossesDefeated);
  const bosses = Object.values(ENEMIES).filter((e) => e.boss).map((e) => e.id);
  const bossDown = (id: string) => beaten.includes(id) || (rec[id]?.kills ?? 0) > 0;
  const [zone, setZone] = useState<ZoneId>('mazmorra');
  const [open, setOpen] = useState<string | null>(null);
  const groups = bestiaryByZone();
  const ids = groups.find((g) => g.zone === zone)!.ids;
  const prog = bestiaryProgress(rec);
  return (
    <div className="max-w-5xl space-y-4" data-testid="bestiary">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-3xl text-parchment">Bestiario</h2>
          <p className="font-body text-base text-stone-400">Lucha para saber más: al verla conoces su nombre; al derrotarla, cómo pelea; tras {BESTIARY_FULL_KILLS} victorias, todos sus secretos.</p>
        </div>
        <div className="text-gold font-display text-xl" data-testid="bestiary-progress">{prog.known} / {prog.total}</div>
      </div>
      <div className="panel px-4 py-2.5 flex flex-wrap gap-x-8 gap-y-1 font-body text-[16px]" data-testid="bestiary-summary">
        <span><span className="text-stone-300">Criaturas derrotadas</span> <span className="font-display text-parchment">{kills}</span></span>
        <span><span className="text-stone-300">Jefes derrotados</span> <span className="font-display text-parchment">{bosses.filter(bossDown).length}</span> <span className="text-stone-400">de {bosses.length}</span></span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {groups.map((g) => {
          const known = g.ids.filter((id) => knowledge(rec, id) > 0).length;
          return (
            <button key={g.zone} className={`btn py-2 px-4 ${g.zone === zone ? 'btn-gold' : ''}`} onClick={() => setZone(g.zone)} data-testid={`bestiary-zone-${g.zone}`}>
              {ZONES[g.zone].name} <span className="opacity-70 text-xs">{known}/{g.ids.length}</span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {ids.map((id) => {
          const e = ENEMIES[id];
          const k = knowledge(rec, id);
          return (
            <button key={id} onClick={() => k > 0 && setOpen(id)} disabled={k === 0} data-testid={`beast-${id}`}
              className={`panel p-2 flex flex-col items-center gap-1 min-h-[8.5rem] ${k > 0 ? 'hover:brightness-125 cursor-pointer' : 'cursor-default'} ${e.boss ? 'border-blood' : e.elite ? 'border-gold' : ''}`}>
              <div className="h-20 flex items-end justify-center">
                <img src={monsterUrl(e.sprite, 4)} alt="" className="pixelated max-h-20" style={k === 0 ? { filter: 'brightness(0) opacity(.55)' } : undefined} />
              </div>
              <span className="text-[11px] text-center leading-tight">{k === 0 ? '???' : e.name}</span>
              <KnowledgePips k={k} />
              {e.boss
                ? <span className={`text-[11px] font-display whitespace-nowrap ${bossDown(id) ? 'text-heal' : 'text-blood'}`} data-testid={`beast-boss-${id}`}>{bossDown(id) ? '✓ Derrotado' : 'Por derrotar'}</span>
                : (rec[id]?.kills ?? 0) > 0 && <span className="text-[11px] text-stone-400" data-testid={`beast-kills-${id}`}>{rec[id].kills} {rec[id].kills === 1 ? 'derrotada' : 'derrotadas'}</span>}
            </button>
          );
        })}
      </div>
      {open && <BeastCard id={open} k={knowledge(rec, open)} kills={rec[open]?.kills ?? 0} onClose={() => setOpen(null)} />}
    </div>
  );
}

function KnowledgePips({ k }: { k: Knowledge }) {
  return (
    <span className="flex gap-1" aria-label={`Conocimiento ${k} de 3`}>
      {[1, 2, 3].map((i) => <span key={i} className={`w-2 h-2 rotate-45 ${i <= k ? 'bg-gold' : 'bg-stone-700'}`} />)}
    </span>
  );
}

function BeastCard({ id, k, kills, onClose }: { id: string; k: Knowledge; kills: number; onClose: () => void }) {
  const e = getEnemy(id);
  const zone = Object.values(ZONES).find((z) => z.boss === id || z.elite === id || z.enemies.some((x) => x.id === id));
  const locked = (text: string) => <p className="font-body text-stone-500 italic">{text}</p>;
  // Se pinta sobre <body>: las animaciones del refugio crean un contexto que recortaría la ficha
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 fade-in p-3" onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()} data-testid="beast-card">
      <div className="panel panel-gold p-5 max-w-4xl w-full max-h-[94vh] overflow-y-auto scroll-thin">
      <div className="grid sm:grid-cols-[180px_1fr] gap-5">
        <div className="flex flex-col items-center gap-2">
          <div className="panel w-full h-44 flex items-end justify-center pb-2"><img src={monsterUrl(e.sprite, 6)} alt={e.name} className="pixelated max-h-40" /></div>
          <KnowledgePips k={k} />
          <span className="text-xs text-stone-400">Derrotadas: {kills}</span>
        </div>
        <div className="space-y-3 min-w-0">
          <div>
            <h3 className="font-display text-2xl text-parchment">{e.name}</h3>
            <div className="text-sm text-gold">{zone?.name}{zone ? ` · niveles ${zone.levels[0]}–${zone.levels[1]}` : ''}{e.boss ? ' · Jefe' : e.elite ? ' · Élite' : ''}{k >= 2 && e.role && !e.boss && !e.elite ? ` · ${e.role}` : ''}{e.undead ? ' · No-muerto' : ''}</div>
          </div>
          {k >= 2 ? (
            <>
              <p className="font-body text-lg text-stone-200 leading-snug">{BESTIARY_LORE[id] ?? ''}</p>
              <div className="text-sm"><span className="text-stone-400">Ataque básico:</span> {e.basicAttack.name} ({e.basicAttack.kind === 'magical' ? 'mágico' : 'físico'})</div>
              <div className="text-sm" data-testid="bestiary-zones"><span className="text-stone-400">Cómo hiere:</span> {enemyAttackLine(id)}</div>
            </>
          ) : locked(`Derrótala ${BESTIARY_BASIC_KILLS === 1 ? 'una vez' : `${BESTIARY_BASIC_KILLS} veces`} para saber cómo pelea.`)}
          {k >= 3 ? (
            <>
              <div>
                <div className="panel-title text-sm mb-1">Habilidades</div>
                <ul className="space-y-1.5">
                  {e.skills.map((sid) => {
                    const sk = getSkill(sid);
                    return (
                      <li key={sid} className="text-sm">
                        <span className="text-parchment">{sk.name}</span> <span className="text-stone-400">· {sk.description}</span>
                        {sk.applies?.length ? <span className="ml-1">{sk.applies.map((a) => <span key={a.status} className="chip ml-1" style={{ color: STATUSES[a.status].color, borderColor: STATUSES[a.status].color }}>{STATUSES[a.status].name}</span>)}</span> : null}
                      </li>
                    );
                  })}
                </ul>
                <div className="text-xs text-stone-400 mt-1">Usa una habilidad en el {Math.round(e.skillChance * 100)}% de sus turnos.</div>
              </div>
              <div>
                <div className="panel-title text-sm mb-1">Estadísticas base (nivel 1)</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5 text-sm">
                  {STAT_NAMES.map(([key, label]) => <div key={key} className="flex justify-between"><span className="text-stone-400">{label}</span><span>{e.stats[key]}</span></div>)}
                </div>
                <div className="text-xs text-stone-400 mt-1">Crece con el nivel de la zona. Experiencia base: {e.xp}.</div>
              </div>
              <div>
                <div className="panel-title text-sm mb-1">Botín posible</div>
                <div className="flex flex-wrap gap-1.5">
                  {[...(e.loot.always ?? []).map((a) => a.itemId), ...e.loot.entries.map((l) => l.itemId)].filter((x, i, a) => x !== 'nothing' && a.indexOf(x) === i).map((iid) => (
                    <span key={iid} className="flex items-center gap-1 bg-black/30 px-1.5 py-0.5 text-xs" style={{ color: RARITY_INFO[getItem(iid).rarity].color }}><ItemIcon itemId={iid} size={18} />{getItem(iid).name}</span>
                  ))}
                  <span className="text-xs text-gold px-1.5 py-0.5">+ {e.loot.gold[0]}–{e.loot.gold[1]} oro</span>
                </div>
              </div>
            </>
          ) : locked(`Derrótala ${BESTIARY_FULL_KILLS} veces para conocer sus habilidades, sus estadísticas y su botín (llevas ${kills}).`)}
          <button className="btn mt-2" onClick={onClose} data-testid="beast-close">Cerrar</button>
        </div>
      </div>
      </div>
    </div>,
    document.body,
  );
}
