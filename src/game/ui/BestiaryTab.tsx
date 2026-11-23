// Bestiario (galería de trofeos, 18/11): casillas grandes con la criatura sobre el fondo del panel y su sombra.
// El conocimiento se ve en el color del borde: piedra (desconocida), bronce (vista), plata (derrotada) y oro (estudiada).
// Los jefes ocupan dos casillas, con corona: «Derrotado» o «Por derrotar» (silueta) en la esquina. Las victorias, con una
// calavera en la otra esquina. Al tocar una criatura se abre su ficha; lo que aún no conoces sale con candado.
// Estilos: bloque «Bestiario» de game.css (.bgrid, .btile, .bcard…).
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../state/store';
import { ENEMIES, getEnemy } from '../../core/data/enemies';
import { enemyAttackLine } from '../../core/armor';
import { getSkill } from '../../core/data/skills';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { STATUSES } from '../../core/statuses';
import { ZONES, type ZoneId } from '../../core/data/zones';
import { SUBZONE_ORDER, getSubzone } from '../../core/data/subzones';
import { bestiaryByZone, bestiaryProgress, knowledge, type Knowledge } from '../../core/bestiary';
import { BESTIARY_LORE } from '../../core/data/bestiaryLore';
import { BESTIARY_BASIC_KILLS, BESTIARY_FULL_KILLS } from '../../config/bestiary';
import { cachedUrl, drawFloorTs, iconUrl, monsterUrl, TILESETS } from '../../shared/art';
import { useLayout } from '../../config/ui';
import { sfx } from '../audio';
import { Px, useFitScale } from './QuestNotes';
import { bookIcon, crownIcon, floorShadow, lockIcon, skullIcon } from './uiIcons';

const STAT_NAMES: [keyof import('../../core/types').Stats, string][] = [['maxHp', 'Vida'], ['atk', 'Ataque'], ['def', 'Defensa'], ['mag', 'Magia'], ['res', 'Resistencia'], ['spd', 'Velocidad'], ['crit', 'Crítico'], ['eva', 'Evasión']];
/** Color plano del borde según lo que sabes (colores del juego): piedra, bronce = oro apagado, plata y oro. */
const TIER_COLOR = ['#2a2830', '#9a6b1a', '#c8ccd8', '#e8b33a'] as const;
const TIER_NAME = ['Desconocida', 'Vista', 'Derrotada', 'Estudiada'] as const;
/** Baldosa de cada zona para su pestaña. */
const ZONE_TILE: Record<ZoneId, string> = { mazmorra: 'castillo', cripta: 'catacumbas', infierno: 'puertas' };

/** Tamaño real (a escala 1) del sprite: las bestias y los murciélagos no miden como los humanoides. */
function useSpriteSize(sprite: string): [number, number] {
  const [wh, setWh] = useState<[number, number]>([20, 26]);
  useEffect(() => { const i = new Image(); i.onload = () => setWh([i.naturalWidth, i.naturalHeight]); i.src = monsterUrl(sprite, 1); }, [sprite]);
  return wh;
}

export function BestiaryTab() {
  const rec = useGame((s) => s.profile!.bestiary);
  const kills = useGame((s) => s.profile!.stats.kills);
  const beaten = useGame((s) => s.profile!.bossesDefeated);
  const phone = useLayout() === 'phone';
  const bosses = Object.values(ENEMIES).filter((e) => e.boss).map((e) => e.id);
  const bossDown = (id: string) => beaten.includes(id) || (rec[id]?.kills ?? 0) > 0;
  const [zone, setZone] = useState<ZoneId>('mazmorra');
  const [open, setOpen] = useState<string | null>(null);
  const groups = bestiaryByZone();
  const ids = groups.find((g) => g.zone === zone)!.ids;
  const prog = bestiaryProgress(rec);
  return (
    <div className="h-full flex flex-col min-h-0 bscreen" style={{ padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))', gap: 'var(--gap)' }} data-testid="bestiary">
      <div className="flex items-center gap-x-5 gap-y-2 flex-wrap shrink-0">
        {!phone && <h2 className="font-display text-parchment tracking-[0.1em] text-[clamp(20px,1.7vw,32px)]">Bestiario</h2>}
        <div className="flex items-center gap-4 font-display text-[18px]" data-testid="bestiary-summary">
          <span className="bstat" title="Criaturas derrotadas"><Px src={skullIcon(2)} /><span className="text-parchment">{kills}</span></span>
          <span className="bstat" title="Jefes derrotados"><Px src={crownIcon(2)} /><span className="text-parchment">{bosses.filter(bossDown).length}</span><span className="text-stone-400 text-[14px]">/{bosses.length}</span></span>
          <span className="bstat" title="Criaturas conocidas" data-testid="bestiary-progress"><Px src={bookIcon(2)} /><span className="text-gold">{prog.known}</span><span className="text-stone-400 text-[14px]">/{prog.total}</span></span>
        </div>
        <div className="flex gap-2 ml-auto" role="tablist">
          {groups.map((g) => {
            const known = g.ids.filter((id) => knowledge(rec, id) > 0).length;
            const tile = cachedUrl(`ztile:${g.zone}`, () => drawFloorTs(1, TILESETS[ZONE_TILE[g.zone]]), 2);
            return (
              <button key={g.zone} role="tab" aria-selected={zone === g.zone} className={`bzone ${zone === g.zone ? 'on' : ''}`} onClick={() => { setZone(g.zone); sfx('click'); }}
                aria-label={ZONES[g.zone].name} data-testid={`bestiary-zone-${g.zone}`}>
                <span className="bzone-sw" style={{ backgroundImage: `url(${tile})` }} />
                <span className="bzone-txt">
                  <span className="bzone-name">{ZONES[g.zone].name}</span>
                  <span className="bzone-bar" aria-hidden><i style={{ width: `${(known / g.ids.length) * 100}%` }} /></span>
                </span>
                <span className="bzone-n">{known}/{g.ids.length}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="bgrid flex-1 min-h-0 scroll-thin" data-testid="bestiary-grid">
        {ids.map((id) => <BeastTile key={id} id={id} k={knowledge(rec, id)} kills={rec[id]?.kills ?? 0} down={bossDown(id)} onOpen={() => { setOpen(id); sfx('click'); }} />)}
      </div>
      {open && <BeastCard id={open} k={knowledge(rec, open)} kills={rec[open]?.kills ?? 0} onClose={() => setOpen(null)} />}
    </div>
  );
}

function BeastTile({ id, k, kills, down, onOpen }: { id: string; k: Knowledge; kills: number; down: boolean; onOpen: () => void }) {
  const e = ENEMIES[id];
  const boss = !!e.boss;
  const [w, h] = useSpriteSize(e.sprite);
  const [ref, s] = useFitScale(w, h + 6, boss ? 30 : 22, boss ? 7 : 5);
  // Desconocida, o jefe aún sin derrotar: silueta negra (sin brillo)
  const silhouette = k === 0 || (boss && !down);
  return (
    <button type="button" onClick={() => k > 0 && onOpen()} disabled={k === 0} className={`btile ${boss ? 'boss' : ''} ${boss && down ? 'down' : ''} ${k === 0 ? 'unknown' : ''}`}
      style={{ ['--tier' as string]: TIER_COLOR[k] }} aria-label={k === 0 ? 'Criatura desconocida' : `${e.name} · ${TIER_NAME[k]}`} data-testid={`beast-${id}`} data-knowledge={k}>
      <span ref={ref} className="btile-stage">
        {boss && <span className="btile-crown"><Px src={crownIcon(3)} title="Jefe" /></span>}
        <span className="btile-fig">
          <img src={monsterUrl(e.sprite, s)} className="pixelated" alt="" draggable={false} style={silhouette ? { filter: 'brightness(0)', opacity: k === 0 ? 0.6 : 1 } : undefined} />
          <img src={floorShadow(Math.max(2, Math.ceil(s / 2)))} className="pixelated btile-shadow" alt="" draggable={false} />
        </span>
        {kills > 0 && <span className="btile-kills" title={`${kills} ${kills === 1 ? 'derrotada' : 'derrotadas'}`} data-testid={`beast-kills-${id}`}><Px src={skullIcon(1)} />{kills}</span>}
        {boss && (down
          ? <span className="btile-stamp" data-testid={`beast-boss-${id}`}>Derrotado</span>
          : <span className="btile-threat" data-testid={`beast-boss-${id}`}>Por derrotar</span>)}
      </span>
      <span className="btile-name">{k === 0 ? '???' : e.name}</span>
    </button>
  );
}

function Locked({ need, kills, what }: { need: number; kills: number; what: string }) {
  const n = Math.max(1, need - kills);
  return (
    <div className="bsec locked" data-testid="beast-locked">
      <div className="bsec-t"><Px src={lockIcon(2)} />{what}</div>
      <div className="font-body text-[16px] text-stone-400">Derrótala {n === 1 ? 'una vez más' : `${n} veces más`}</div>
    </div>
  );
}

function BeastCard({ id, k, kills, onClose }: { id: string; k: Knowledge; kills: number; onClose: () => void }) {
  const e = getEnemy(id);
  const zone = Object.values(ZONES).find((z) => z.boss === id || z.elite === id || z.enemies.some((x) => x.id === id));
  // Jefes y élites: la subzona donde salen (el jefe de zona, solo en la última de su zona)
  const sub = e.boss || e.elite ? SUBZONE_ORDER.map(getSubzone).find((s) => s.boss === id || s.elite === id) : undefined;
  const zoneBoss = Object.values(ZONES).some((z) => z.boss === id);
  // La criatura alterna reposo y ataque (las dos poses que ya existen)
  const [pose, setPose] = useState<'idle' | 'attack'>('idle');
  useEffect(() => { const t = setInterval(() => setPose((p) => (p === 'idle' ? 'attack' : 'idle')), 900); return () => clearInterval(t); }, []);
  useEffect(() => { const h = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { ev.stopPropagation(); onClose(); } }; window.addEventListener('keydown', h, true); return () => window.removeEventListener('keydown', h, true); }, [onClose]);
  const [w, h] = useSpriteSize(e.sprite);
  const [ref, s] = useFitScale(w, h + 6, 30, 9);
  const loot = [...(e.loot.always ?? []).map((a) => a.itemId), ...e.loot.entries.map((l) => l.itemId)].filter((x, i, a) => x !== 'nothing' && a.indexOf(x) === i);
  // Se pinta sobre <body>: las animaciones del refugio crean un contexto que recortaría la ficha
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 fade-in bcard-wrap" onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()} data-testid="beast-card">
      <div className="bcard" style={{ ['--tier' as string]: TIER_COLOR[k] }}>
        <div className="bcard-left">
          <div ref={ref} className="bcard-stage">
            <span className="btile-fig"><img src={monsterUrl(e.sprite, s, pose)} className="pixelated" alt={e.name} draggable={false} /><img src={floorShadow(Math.max(2, Math.ceil(s / 2)))} className="pixelated btile-shadow" alt="" draggable={false} /></span>
          </div>
          <div className="text-center">
            <h3 className="font-display text-[clamp(18px,1.6vw,28px)] text-parchment tracking-[0.06em] leading-tight">{e.name}</h3>
            <div className="text-[14px] text-gold">{sub?.name ?? zone?.name}{e.boss ? (zoneBoss ? ' · Jefe de zona' : ' · Jefe') : e.elite ? ' · Élite' : ''}{k >= 2 && e.role && !e.boss && !e.elite ? ` · ${e.role}` : ''}{e.undead ? ' · No-muerto' : ''}</div>
          </div>
          <div className="flex justify-center gap-5 font-display text-[16px]">
            <span className="bstat" title="Derrotadas"><Px src={skullIcon(2)} />{kills}</span>
            <span className="bstat" style={{ color: TIER_COLOR[k] }} data-testid="beast-knowledge">◆ {TIER_NAME[k]}</span>
          </div>
        </div>
        <div className="bcard-right scroll-thin">
          <button className="btn bcard-x" style={{ minWidth: 44, minHeight: 44 }} onClick={onClose} aria-label="Cerrar" data-testid="beast-close">✕</button>
          {k >= 2 ? (
            <div className="bsec">
              <div className="bsec-t">Cómo pelea</div>
              <p className="font-body text-[17px] text-stone-200 leading-snug">{BESTIARY_LORE[id] ?? ''}</p>
              <div className="text-[15px] mt-1"><span className="text-stone-400">Ataque básico:</span> {e.basicAttack.name} ({e.basicAttack.kind === 'magical' ? 'mágico' : 'físico'})</div>
              <div className="text-[15px]" data-testid="bestiary-zones"><span className="text-stone-400">Cómo hiere:</span> {enemyAttackLine(id)}</div>
            </div>
          ) : <Locked need={BESTIARY_BASIC_KILLS} kills={kills} what="Cómo pelea" />}
          {k >= 3 ? (
            <>
              <div className="bsec">
                <div className="bsec-t">Habilidades</div>
                <ul className="space-y-1">
                  {e.skills.map((sid) => {
                    const sk = getSkill(sid);
                    return (
                      <li key={sid} className="text-[15px]">
                        <span className="text-parchment">{sk.name}</span> <span className="text-stone-400">· {sk.description}</span>
                        {sk.applies?.length ? <span className="ml-1">{sk.applies.map((a) => <span key={a.status} className="chip ml-1" style={{ color: STATUSES[a.status].color, borderColor: STATUSES[a.status].color }}>{STATUSES[a.status].name}</span>)}</span> : null}
                      </li>
                    );
                  })}
                </ul>
                <div className="text-[13px] text-stone-400 mt-1">Usa una habilidad en el {Math.round(e.skillChance * 100)}% de sus turnos.</div>
              </div>
              <div className="bsec">
                <div className="bsec-t">Estadísticas (nivel 1)</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5 text-[14px]">
                  {STAT_NAMES.map(([key, label]) => <div key={key} className="flex justify-between"><span className="text-stone-400">{label}</span><span>{e.stats[key]}</span></div>)}
                </div>
                <div className="text-[13px] text-stone-400 mt-1">Crece con el nivel de la zona. Experiencia base: {e.xp}.</div>
              </div>
              <div className="bsec">
                <div className="bsec-t">Botín</div>
                <div className="flex flex-wrap gap-1.5">
                  {loot.map((iid) => <span key={iid} className="flex items-center gap-1 bg-black/30 px-1.5 py-0.5 text-[13px]" style={{ color: RARITY_INFO[getItem(iid).rarity].color }}><Px src={iconUrl(getItem(iid).icon, 2)} />{getItem(iid).name}</span>)}
                  <span className="text-[13px] text-gold px-1.5 py-0.5">+ {e.loot.gold[0]}–{e.loot.gold[1]} oro</span>
                </div>
              </div>
            </>
          ) : (
            <div className="grid sm:grid-cols-3 gap-2">
              <Locked need={BESTIARY_FULL_KILLS} kills={kills} what="Habilidades" />
              <Locked need={BESTIARY_FULL_KILLS} kills={kills} what="Estadísticas" />
              <Locked need={BESTIARY_FULL_KILLS} kills={kills} what="Botín" />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
