import { NeedsPanel, NeedsStrip } from './NeedsBars';
import { CarryBar, OverloadChip } from './CarryBar';
import { effectiveMaxMp, needsOf } from '../../core/needs';
import { useClearOnDrop } from './pointerDrag';
import { gridGold, isCoins } from '../../core/gold';
import { useCallback, useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { DungeonScene, activeScene } from '../engine/DungeonScene';
import { actions, getState, useGame, exposeDebug } from '../state/store';
import { computeStats } from '../../core/stats';
import { CLASSES } from '../../core/data/classes';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { countItem, gridValue, type Loc } from '../../core/inventory';
import { timeLeft } from '../../core/expedition';
import { CombatScreen } from './CombatScreen';
import { BodyFigure, BodyPanel } from './BodyFigure';
import { expBody } from '../state/medicalActions';
import { Bar, EquipmentView, GridView, StatsList, ItemIcon } from './inventory';
import { PlayerSprite, MonsterSprite, Modal, formatTime, ItemActions, GoldAmount } from './common';
import { SettingsModal } from './TitleScreen';
import { chestType } from '../../core/data/chests';
import { TouchControls } from './TouchControls';
import { useIsTouch } from '../../shared/device';
import { FullscreenButton } from './FullscreenButton';
import { HudIcon } from './hudIcons';
import { TOUCH_CFG, safe, useTouchSize } from '../../config/touch';
import { getMerc } from '../../core/data/mercenaries';
import { mercBaseStats, STANCE_DESC, STANCE_NAME } from '../../core/mercenaries';
import { getWanderer } from '../../core/data/wanderers';
import { TUTORIAL_STEPS } from '../../core/data/tutorial';
import { RISK, GOLD_SHARE, SHARE_FAIR_RATIO, type RiskLevel } from '../../config/wanderers';
import { shareVerdict } from '../../core/social';
import { pinnedQuests, questDef, questProgress } from '../../core/quests';
import { planPayment } from '../../core/share';

export function DungeonScreen() {
  const host = useRef<HTMLDivElement>(null);
  const touch = useIsTouch();
  const modal = useGame((s) => s.modal);
  const combat = useGame((s) => s.combat);
  const tutorial = useGame((s) => s.tutorial);
  const profile = useGame((s) => s.profile)!;

  useEffect(() => {
    if (!host.current) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      backgroundColor: '#07060a',
      pixelArt: true,
      roundPixels: true,
      banner: false,
      audio: { noAudio: true },
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      scene: [DungeonScene],
    });
    exposeDebug({ scene: () => activeScene, game });
    const t = setInterval(() => actions.tick(), 250);
    return () => {
      clearInterval(t);
      game.destroy(true);
    };
  }, []);

  // Teclas rápidas de exploración
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const s = getState();
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (s.combat) return; // el combate gestiona sus teclas
      if (s.modal?.type === 'interact') {
        const n = Number(e.key);
        if (n >= 1 && n <= s.modal.options.length) {
          e.preventDefault();
          activeScene?.chooseInteraction(n - 1);
          return;
        }
      }
      if (k === 'escape') {
        e.preventDefault();
        if (s.modal?.type === 'rival' && s.tutorial && s.rival.disposition !== 'allied') return; // tutorial: hay que aliarse
        if (s.modal) actions.closeModal();
        else actions.openModal({ type: 'pause' });
      } else if (k === 'i') {
        e.preventDefault();
        if (s.modal?.type === 'inventory') actions.closeModal();
        else if (!s.modal) actions.openModal({ type: 'inventory' });
      } else if (!s.modal && (k === 'e' || k === ' ')) {
        e.preventDefault();
        activeScene?.interact();
      } else if (!s.modal && k === 'q') {
        e.preventDefault();
        actions.drinkPotion();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-void">
      <div ref={host} className="absolute inset-0" data-testid="game-canvas" />
      <div className="vignette" />
      <Hud />
      {touch && <TouchControls />}
      {modal?.type === 'loot' && <LootModal />}
      {modal?.type === 'rival' && <RivalModal />}
      {modal?.type === 'confirmBetray' && <ConfirmBetray />}
      {modal?.type === 'rivalDemand' && <RivalDemand />}
      {modal?.type === 'inventory' && <DungeonInventory />}
      {modal?.type === 'pause' && <PauseModal />}
      {modal?.type === 'chestLock' && <ChestLockModal chestId={modal.chestId} table={modal.table} />}
      {modal?.type === 'interact' && <InteractMenu options={modal.options} />}
      {modal?.type === 'captive' && <CaptiveModal mercId={modal.mercId} />}
      {modal?.type === 'merc' && <MercModal />}
      {modal?.type === 'body' && <BodyModal />}
      {combat && <CombatScreen />}
      {!profile.tutorialSeen.dungeon && !tutorial && !modal && !combat && <DungeonTutorial />}
      {tutorial && <TutorialGuide />}
    </div>
  );
}

function Hud() {
  const s = useGame((x) => x);
  const tutorial = s.tutorial;
  const touch = useIsTouch();
  const exp = s.expedition;
  if (!exp || !s.profile) return null;
  const ch = s.profile.character;
  const stats = computeStats(ch.classId, ch.level, exp.equipment);
  const needs = needsOf(exp.needs);
  const left = timeLeft(exp, s.now);
  const potions = countItem(exp.backpack, 'health_potion');
  const urgent = left < 120000;
  return (
    <>
      {touch ? <TouchTopHud /> : (
        <>
          <div className="absolute left-3 top-3 panel p-3 w-64 z-10" data-testid="hud-player">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-[#0d0c11] border-2 border-stone-700 flex items-end justify-center overflow-hidden"><PlayerSprite scale={2} animate={false} /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate">{ch.name}</div>
                <div className="text-xs text-stone-400">{CLASSES[ch.classId].name} · Nv {ch.level}</div>
              </div>
              <BodyFigure body={exp.body} unit={3} onClick={() => actions.openModal({ type: 'body' })} testId="hud-body" />
            </div>
            <Bar value={exp.hp} max={stats.maxHp} color="#c4283b" label="Vida" testId="hud-hp" />
            <div className="h-1" />
            <Bar value={exp.mp} max={effectiveMaxMp(stats.maxMp, needs)} color={CLASSES[ch.classId].resource === 'impetus' ? '#e08a3d' : '#3d7be0'} label={CLASSES[ch.classId].resourceName} />
            {!tutorial && <NeedsStrip needs={needs} />}
            {!tutorial && <OverloadChip />}
            <button className="btn w-full mt-2 text-sm flex items-center justify-center gap-2" onClick={() => actions.drinkPotion()} disabled={!potions} data-testid="btn-potion">
              <ItemIcon itemId="health_potion" size={20} /> Poción ({potions}) <kbd className="text-xs opacity-60">Q</kbd>
            </button>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 top-3 text-center z-10 pointer-events-none">
            <div className={`panel px-5 py-1 font-display text-3xl ${urgent ? 'text-blood animate-pulse' : 'text-parchment'}`} data-testid="hud-timer">{tutorial ? 'Tutorial' : formatTime(left)}</div>
            <div className="mt-1 text-sm text-stone-300 tracking-widest uppercase font-display" data-testid="hud-room">{s.hud.room}</div>
            {s.dungeon && <div className="text-[11px] text-stone-500 mt-0.5" data-testid="hud-dungeon">{s.dungeon.name}{s.dungeon.seed !== undefined ? ` · mapa ${s.dungeon.seed}` : ''}</div>}
          </div>

          <div className="absolute right-3 top-3 flex flex-col items-end gap-2 z-10">
            <div className="flex gap-2">
              <button className="btn text-sm" onClick={() => actions.openModal({ type: 'inventory' })} data-testid="btn-inventory">Inventario <kbd className="opacity-60">I</kbd></button>
              <button className="btn text-sm" onClick={() => actions.openModal({ type: 'pause' })} data-testid="btn-menu">Menú <kbd className="opacity-60">Esc</kbd></button>
            </div>
            <Companions width="w-52" />
          </div>

          <div className="absolute left-3 bottom-3 panel px-3 py-2 text-sm z-10 flex items-center gap-4 hud-loot">
            <span>Botín: <span className="text-gold" data-testid="hud-loot-value">{gridValue(exp.backpack)}</span></span>
            <span className="flex items-center gap-1" title="Oro que llevas encima: se pierde si mueres">Oro encima: <GoldAmount value={gridGold(exp.backpack)} /></span>
          </div>
        </>
      )}

      {/* Centro abajo: canalización del portal y lo que se puede usar (en táctil, sin tecla y sobre los pulgares) */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 pointer-events-none max-w-[44vw]"
        style={{ bottom: touch ? safe('bottom', 16) : '1.5rem' }}>
        {s.hud.channel > 0 && (
          <div className="panel p-2 w-72 max-w-full text-center border-arcane" data-testid="hud-channel">
            <div className="text-arcane text-sm mb-1">{s.hud.channelLabel ?? 'Canalizando el portal… no te muevas'}</div>
            <div className="bar"><div style={{ width: `${s.hud.channel * 100}%`, background: '#a35ae0' }} /></div>
          </div>
        )}
        {s.hud.prompt && !s.modal && !s.combat && (
          <div className="panel px-4 py-2 fade-in text-center" data-testid="hud-prompt"><kbd className="bg-gold text-black px-1.5 mr-2">E</kbd>{s.hud.prompt}</div>
        )}
      </div>
    </>
  );
}

/** Misiones fijadas: recordatorio con el progreso (las bajas de esta bajada ya cuentan; se apuntan al salir). */
function PinnedQuestsHud({ width }: { width: string }) {
  const profile = useGame((s) => s.profile);
  const kills = useGame((s) => s.expedition?.kills);
  if (!profile) return null;
  const pins = pinnedQuests(profile);
  if (!pins.length) return null;
  return (
    <div className={`panel p-2 ${width} border-gold`} data-testid="hud-pinned">
      {pins.map((p) => {
        const q = questDef(p.id);
        const live = Math.min(q.count, questProgress(p, profile) + ((q.type === 'kill' || q.type === 'kill_boss') ? kills?.[q.target!] ?? 0 : 0));
        return <div key={p.id} className="text-sm flex justify-between gap-2"><span className="truncate text-gold">★ {q.name}</span><span className={live >= q.count ? 'text-heal' : 'text-stone-300'}>{live}/{q.count}</span></div>;
      })}
    </div>
  );
}

/** Aliado (Kael) y mercenario: barras pequeñas bajo los botones de la derecha. */
function Companions({ width }: { width: string }) {
  const rival = useGame((s) => s.rival);
  const merc = useGame((s) => s.merc);
  return (
    <>
      <PinnedQuestsHud width={width} />
      {rival.disposition === 'allied' && (
        <button className={`panel p-2 ${width} border-heal text-left`} onClick={() => actions.interactRival()} data-testid="hud-ally">
          <div className="text-xs text-heal mb-1 flex items-center gap-1.5"><RiskBadge risk={rival.risk} size={14} /><span className="truncate">Aliado · {getWanderer(rival.who).name}</span></div>
          <Bar value={rival.hp} max={getWanderer(rival.who).stats.maxHp} color="#5fd19a" />
        </button>
      )}
      {merc?.alive && (() => {
        const m = getMerc(merc.id);
        return (
          <button className={`panel p-2 ${width} border-heal text-left`} onClick={() => actions.interactMerc()} data-testid="hud-merc">
            <div className="text-xs text-heal mb-1 flex justify-between gap-1"><span className="truncate">{merc.rescued ? 'Rescatado' : 'Mercenario'} · {m.name}</span><span className="text-stone-400 shrink-0">{STANCE_NAME[merc.stance]}</span></div>
            <Bar value={merc.hp} max={mercBaseStats(m).maxHp} color="#5fd19a" />
          </button>
        );
      })()}
      {rival.disposition === 'hostile' && <div className="panel px-3 py-1 text-sm text-blood border-blood" data-testid="hud-rival-hostile">{getWanderer(rival.who).name.split(' ')[0]} es hostil</div>}
      {rival.disposition === 'fleeing' && <div className="panel px-3 py-1 text-sm text-ember border-blood" data-testid="hud-rival-fleeing">¡{getWanderer(rival.who).name.split(' ')[0]} huye con tu botín!</div>}
    </>
  );
}

/**
 * Barra superior en táctil: toda la información arriba y el centro libre para jugar.
 * Izquierda: retrato, vida, recurso y botín. Centro: reloj y sala. Derecha: inventario, menú y
 * pantalla completa (44 px) y, debajo, los aliados. Respeta la zona segura (notch, esquinas redondeadas).
 */
function TouchTopHud() {
  const s = useGame((x) => x);
  const tutorial = s.tutorial;
  const size = useTouchSize();
  const exp = s.expedition!;
  const ch = s.profile!.character;
  const stats = computeStats(ch.classId, ch.level, exp.equipment);
  const needs = needsOf(exp.needs);
  const left = timeLeft(exp, s.now);
  const urgent = left < 120000;
  const edge = TOUCH_CFG.edge[size];
  const phone = size === 'phone';
  const icon = TOUCH_CFG.hudIcon;
  return (
    <>
      <div className={`absolute z-10 panel ${phone ? 'p-2 w-48' : 'p-3 w-60'}`} style={{ left: safe('left', edge), top: safe('top', edge) }} data-testid="hud-player">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`${phone ? 'w-7 h-7' : 'w-9 h-9'} bg-[#0d0c11] border-2 border-stone-700 flex items-end justify-center overflow-hidden shrink-0`}><PlayerSprite scale={phone ? 1 : 2} animate={false} /></div>
          <div className="min-w-0 leading-tight flex-1">
            <div className="truncate text-sm">{ch.name}</div>
            <div className="text-[11px] text-stone-400 truncate">{CLASSES[ch.classId].name} · Nv {ch.level}</div>
          </div>
          <BodyFigure body={exp.body} unit={3} onClick={() => actions.openModal({ type: 'body' })} testId="hud-body" />
        </div>
        <Bar value={exp.hp} max={stats.maxHp} color="#c4283b" label={phone ? undefined : 'Vida'} testId="hud-hp" />
        <div className="h-1" />
        <Bar value={exp.mp} max={effectiveMaxMp(stats.maxMp, needs)} color={CLASSES[ch.classId].resource === 'impetus' ? '#e08a3d' : '#3d7be0'} label={phone ? undefined : CLASSES[ch.classId].resourceName} />
        {!tutorial && <NeedsStrip needs={needs} />}
            {!tutorial && <OverloadChip />}
        <div className="text-[11px] mt-1.5 flex items-center gap-1 flex-wrap">Botín: <span className="text-gold" data-testid="hud-loot-value">{gridValue(exp.backpack)}</span> · Oro encima: <GoldAmount value={gridGold(exp.backpack)} /></div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none" style={{ top: safe('top', edge) }}>
        <div className={`panel font-display ${phone ? 'px-3 text-xl' : 'px-4 py-0.5 text-2xl'} ${urgent ? 'text-blood animate-pulse' : 'text-parchment'}`} data-testid="hud-timer">{tutorial ? 'Tutorial' : formatTime(left)}</div>
        <div className={`mt-1 text-stone-300 tracking-widest uppercase font-display ${phone ? 'text-[10px]' : 'text-xs'}`} data-testid="hud-room">{s.hud.room}</div>
      </div>

      <div className="absolute z-10 flex flex-col items-end gap-2" style={{ right: safe('right', edge), top: safe('top', edge) }}>
        <div className="flex gap-2">
          <button className="btn flex items-center justify-center p-0" style={{ width: icon, height: icon, padding: 0 }} onClick={() => actions.openModal({ type: 'inventory' })} aria-label="Inventario" title="Inventario" data-testid="btn-inventory"><HudIcon name="bag" px={24} /></button>
          <button className="btn flex items-center justify-center p-0" style={{ width: icon, height: icon, padding: 0 }} onClick={() => actions.openModal({ type: 'pause' })} aria-label="Menú" title="Menú" data-testid="btn-menu"><HudIcon name="menu" px={24} /></button>
          <FullscreenButton />
        </div>
        <Companions width={phone ? 'w-40' : 'w-48'} />
      </div>
    </>
  );
}

function ChestLockModal({ chestId, table }: { chestId: string; table: string }) {
  const exp = useGame((s) => s.expedition)!;
  const type = chestType(table);
  const key = type.key!;
  const have = countItem(exp.backpack, key) + countItem(exp.pocket, key);
  return (
    <Modal onClose={() => actions.closeModal()} testId="chest-lock">
      <h2 className="panel-title text-xl">{type.name}</h2>
      <div className="flex items-center gap-4 mt-3">
        <ItemIcon itemId={key} size={48} />
        <div className="font-body text-lg leading-snug">
          Está cerrado con llave. Necesitas <b className="text-parchment">{getItem(key).name}</b>.
          <div className={`text-base mt-1 ${have ? 'text-heal' : 'text-blood'}`}>{have ? `Llevas ${have}. Se gastará una al abrirlo.` : 'No llevas ninguna. Las venden en el refugio o caen de las criaturas.'}</div>
        </div>
      </div>
      <div className="flex gap-2 mt-5 flex-wrap">
        {have > 0 && <button className="btn btn-gold py-2.5 px-5" onClick={() => actions.unlockChest(chestId, table)} data-testid="btn-unlock">Abrir con {getItem(key).name.toLowerCase()}</button>}
        <button className="btn py-2.5 px-5" onClick={() => actions.closeModal()} data-testid="btn-lock-close">Dejarlo</button>
      </div>
    </Modal>
  );
}

/** Cuánto le has dado al errante del valor del botín y cómo lo ve. */
function ShareMeter({ given, total, single, name }: { given: number; total: number; single?: boolean; name: string }) {
  const v = shareVerdict(given, total, single);
  const pct = total > 0 ? Math.min(1, given / total) : 0;
  const txt = v === 'fair' ? `${name} está satisfecho.` : v === 'stingy' ? `${name} frunce el ceño.` : `${name} te mira mal.`;
  const color = v === 'fair' ? '#6fbf73' : v === 'stingy' ? '#e0a040' : '#d0453a';
  return (
    <div className="mt-1.5" data-testid="share-meter" data-verdict={v}>
      <div className="relative h-2.5 bg-[#0b0a0f] border border-stone-700">
        <div className="h-full" style={{ width: `${pct * 100}%`, background: color }} />
        <div className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-parchment/70" style={{ left: `${SHARE_FAIR_RATIO * 100}%` }} title="Reparto justo" />
      </div>
      <div className="text-sm mt-0.5" style={{ color }}>{txt} <span className="text-stone-400">({Math.round(given)} de {Math.round(total)} monedas de valor)</span></div>
    </div>
  );
}

function LootModal() {
  const s = useGame((x) => x);
  const [sel, setSel] = useState<Loc | null>(null);
  useClearOnDrop(useCallback(() => setSel(null), []));
  if (s.modal?.type !== 'loot' || !s.expedition) return null;
  const session = s.modal.session;
  const grid = s.chests[session.id] ?? s.bags[session.id]?.grid ?? [];
  const share = session.shareAsked && s.rival.disposition === 'allied';
  const selStack = sel?.kind === 'grid' && sel.container === 'loot' ? grid[sel.index] : null;
  return (
    <Modal onClose={() => actions.closeLoot()} wide testId="loot-modal">
      <div className="flex items-center justify-between mb-3 gap-2 sticky top-0 z-10 py-1" style={{ background: '#16151b' }}>
        <h2 className="panel-title text-xl">{session.title}</h2>
        <div className="flex gap-2 flex-wrap justify-end">
          {grid.some((x) => x?.itemId === 'gold_coins') && <button className="btn" onClick={() => actions.takeGold(session.id)} data-testid="btn-take-gold">Coger el oro ({gridGold(grid)})</button>}
          <button className="btn btn-gold" onClick={() => actions.takeAll(session.id)} data-testid="btn-take-all">Cogerlo todo</button>
        </div>
      </div>
      {share && (
        <div className="panel p-3 mb-3 border-heal flex items-center gap-3">
          <MonsterSprite sprite={getWanderer(s.rival.who).sprite} scale={2} />
          <div className="font-body text-base flex-1">
            <b className="text-heal">{getWanderer(s.rival.who).name.split(' ')[0]} espera su parte.</b> Selecciona algo y pulsa «Dar». Cuenta el valor, no el número de cosas: con una cuarta parte del botín (la marca de la barra) queda satisfecho y baja su riesgo de traición; si no le das nada, sube. Lo que repartas también rebaja lo que te pedirá en el portal.
            <ShareMeter given={session.givenValue ?? 0} total={session.totalValue ?? 0} single={session.single} name={getWanderer(s.rival.who).name.split(' ')[0]} />
            {(session.given.length > 0 || (session.givenGold ?? 0) > 0) && <div className="text-heal text-sm">Le has dado: {[...((session.givenGold ?? 0) > 0 ? [`${session.givenGold} monedas`] : []), ...session.given.map((id) => getItem(id).name)].join(', ')}.</div>}
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <div className="text-sm text-stone-300 mb-2">Contenido</div>
          <GridView grid={grid} container="loot" cols={6} lootId={session.id} equipment={s.expedition.equipment} mode="dungeon" selected={sel} onSelect={setSel}
            onQuick={(l) => actions.quickMove(l, 'backpack', session.id)} onAlt={(l) => actions.quickMove(l, 'backpack', session.id)} />
          {grid.every((x) => !x) && <p className="text-stone-400 text-sm mt-2 italic">Vacío.</p>}
          {selStack && (
            <div className="flex gap-2 mt-3 items-center flex-wrap">
              <span style={{ color: RARITY_INFO[getItem(selStack.itemId).rarity].color }}>{getItem(selStack.itemId).name}</span>
              <button className="btn btn-gold text-sm" onClick={() => { actions.quickMove(sel!, 'backpack', session.id); setSel(null); }}>Coger</button>
              {share && <button className="btn text-sm" onClick={() => { actions.giveToRival(session.id, (sel as { index: number }).index); setSel(null); }} data-testid="btn-give">Dar a {getWanderer(s.rival.who).name.split(' ')[0]}</button>}
            </div>
          )}
        </div>
        <div>
          <div className="text-sm text-stone-300 mb-2">Tu mochila · {s.expedition.backpack.filter(Boolean).length}/{s.expedition.backpack.length}</div>
          <GridView grid={s.expedition.backpack} container="backpack" cols={6} lootId={session.id} equipment={s.expedition.equipment} mode="dungeon"
            onQuick={(l) => actions.quickMove(l, 'loot', session.id)} onAlt={(l) => actions.quickMove(l, 'loot', session.id)} />
          {!s.tutorial && <CarryBar className="mt-2" />}
        </div>
      </div>
      <p className="text-xs text-stone-400 mt-3">Doble clic o clic derecho para mover. También puedes arrastrar.</p>
      <button className="btn mt-3" onClick={() => actions.closeLoot()} data-testid="btn-close-loot">Cerrar <kbd className="opacity-60">Esc</kbd></button>
    </Modal>
  );
}

/** Triángulo de riesgo de traición: color y símbolo (se distingue sin color). */
export function RiskBadge({ risk, size = 22 }: { risk: RiskLevel; size?: number }) {
  const r = RISK[risk];
  return (
    <span className="risk-badge" style={{ width: size, height: size, ['--risk' as string]: r.color, fontSize: Math.round(size * (r.symbol.length > 1 ? 0.36 : 0.46)) }} title={r.label} aria-label={r.label} data-testid="risk-badge" data-risk={risk}>
      <span>{r.symbol}</span>
    </span>
  );
}

function CaptiveModal({ mercId }: { mercId: string }) {
  const m = getMerc(mercId);
  const busy = useGame((s) => !!s.merc?.alive);
  return (
    <Modal onClose={() => actions.closeModal()} testId="captive-modal">
      <div className="flex gap-4">
        <div className="shrink-0 w-28 h-36 bg-black/40 border-2 border-stone-700 flex items-end justify-center"><MonsterSprite sprite={m.sprite} scale={5} /></div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-2xl">{m.name}</h2>
          <div className="text-sm text-gold">Prisionero · {m.title}</div>
          <p className="font-body text-lg mt-2 leading-snug">{m.blurb}</p>
          <p className="font-body text-lg mt-2 leading-snug text-parchment">{m.rescueLine}</p>
        </div>
      </div>
      <p className="font-body text-base text-stone-300 mt-3">Si rompes sus cadenas, luchará a tu lado gratis en esta expedición. <b className="text-heal">Si extraéis con vida</b>, llegará al refugio y podrás contratar sus servicios con Garra Roja (el primer contrato, a mitad de precio). Si cae en combate o mueres tú, se pierde.</p>
      <div className="flex flex-wrap gap-2 mt-4">
        <button className="btn btn-gold" disabled={busy} onClick={() => actions.freeCaptive(mercId)} data-testid="captive-free">Romper las cadenas</button>
        <button className="btn" onClick={() => actions.closeModal()}>Dejarlo para luego</button>
      </div>
      {busy && <p className="text-sm text-blood mt-2">Ya te acompaña un mercenario: solo puedes llevar uno.</p>}
    </Modal>
  );
}

function BodyModal() {
  const exp = useGame((s) => s.expedition);
  const tutorial = useGame((s) => !!s.tutorial);
  const profile = useGame((s) => s.profile);
  if (!exp || !profile) return null;
  return (
    <Modal onClose={() => actions.closeModal()} wide testId="body-modal">
      <h2 className="font-display text-2xl mb-2">Heridas y necesidades</h2>
      <BodyPanel body={expBody(exp, profile)} backpack={exp.backpack} surgery={exp.surgery} onTreat={(id, r) => actions.treat(id, r)}
        note="Se muere si la cabeza o el tórax llegan a cero. Tratar fuera de combate no gasta turno; la cirugía tarda dos pulsos.">
        {!tutorial && <NeedsPanel needs={needsOf(exp.needs)} body={exp.body} backpack={exp.backpack} onUse={(id) => actions.eatItem(id)} />}
      </BodyPanel>
      <button className="btn mt-3 text-sm" onClick={() => actions.closeModal()} data-testid="body-close">Cerrar</button>
    </Modal>
  );
}

function MercModal() {
  const ms = useGame((s) => s.merc);
  const contract = useGame((s) => s.profile?.contract);
  if (!ms) return null;
  const m = getMerc(ms.id);
  return (
    <Modal onClose={() => actions.closeModal()} testId="merc-modal">
      <div className="flex gap-4">
        <div className="shrink-0 w-28 h-36 bg-black/40 border-2 border-stone-700 flex items-end justify-center"><MonsterSprite sprite={m.sprite} scale={5} /></div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-2xl">{m.name}</h2>
          <div className="text-sm text-heal">{ms.rescued ? 'Rescatado · va gratis en esta expedición' : `Contratado · ${contract?.left ?? 0} ${(contract?.left ?? 0) === 1 ? 'expedición' : 'expediciones'} contando esta`}</div>
          <div className="mt-2"><Bar value={ms.hp} max={mercBaseStats(m).maxHp} color="#5fd19a" label="Vida" /></div>
          <div className="text-sm text-stone-400 mt-1">Pociones: {ms.potions}</div>
        </div>
      </div>
      <h3 className="panel-title text-sm mt-4 mb-2">Actitud en combate</h3>
      <div className="grid sm:grid-cols-2 gap-2">
        {(['aggressive', 'cautious'] as const).map((st) => (
          <button key={st} className={`btn text-left py-2 ${ms.stance === st ? 'btn-gold' : ''}`} onClick={() => actions.setMercStance(st)} data-testid={`merc-stance-${st}`}>
            <div>{STANCE_NAME[st]}</div>
            <div className="font-body text-sm opacity-80 normal-case">{STANCE_DESC[st]}</div>
          </button>
        ))}
      </div>
      <button className="btn mt-4 text-sm" onClick={() => actions.closeModal()}>Cerrar</button>
    </Modal>
  );
}

function RivalModal() {
  const rival = useGame((s) => s.rival);
  const line = useGame((s) => s.rivalLine);
  const allied = rival.disposition === 'allied';
  // En el tutorial, con Osric solo cabe aliarse
  const onlyAlly = useGame((s) => !!s.tutorial) && !allied;
  const w = getWanderer(rival.who);
  const r = RISK[rival.risk];
  const first = w.name.split(' ')[0];
  return (
    <Modal onClose={() => { if (!onlyAlly) actions.closeModal(); }} testId="rival-modal">
      <div className="flex gap-4">
        <div className="shrink-0 w-28 h-36 bg-black/40 border-2 border-stone-700 flex flex-col items-center justify-end relative">
          <span className="absolute top-1.5"><RiskBadge risk={rival.risk} size={26} /></span>
          <MonsterSprite sprite={w.sprite} scale={5} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-2xl" data-testid="rival-name">{w.name}</h2>
          <div className="text-sm">
            {allied ? <span className="text-heal">● Aliado</span> : <span className="text-gold">● {w.title}</span>}
            <span className="text-stone-400"> · </span><span style={{ color: r.color }}>{r.symbol} {r.label} de traición</span>
          </div>
          <p className="font-body text-lg mt-3 leading-snug min-h-[3.5rem]" data-testid="rival-line">
            {line ?? (allied ? `${first}: «¿Qué pasa? Mantén los ojos abiertos.»` : `${first} te observa, la mano cerca del arma. No parece hostil… todavía.`)}
          </p>
        </div>
      </div>
      <div className={`grid gap-2 mt-4 ${onlyAlly ? '' : 'sm:grid-cols-2'}`}>
        {!onlyAlly && <button className="btn" onClick={() => actions.rivalTalk()} data-testid="rival-talk">Hablar</button>}
        {!allied && <button className="btn btn-gold" onClick={() => actions.rivalPropose()} data-testid="rival-ally">Aliarse</button>}
        {!allied && !onlyAlly && <button className="btn" onClick={() => actions.rivalIgnore()} data-testid="rival-ignore">Seguir tu camino</button>}
        {allied && <button className="btn" onClick={() => actions.rivalLeave()} data-testid="rival-leave">Separar vuestros caminos</button>}
        {!allied && !onlyAlly && <button className="btn btn-danger" onClick={() => actions.rivalAttack()} data-testid="rival-attack">Atacar</button>}
        {allied && <button className="btn btn-danger" onClick={() => actions.askBetray()} data-testid="rival-betray">Traicionar…</button>}
      </div>
      <p className="text-stone-400 mt-3 font-body text-sm" data-testid="rival-terms">
        {allied ? `Lucha a tu lado. Quiere su parte de cada cofre y de cada saco de combate, y al llegar al portal te pedirá el ${Math.round(GOLD_SHARE * 100)} % del oro (menos si repartes bien, más si no).` : `Si os aliáis, lucha a tu lado a cambio de su parte del botín y, en el portal, del ${Math.round(GOLD_SHARE * 100)} % del oro. El triángulo indica cuánto puedes fiarte.`}
        {' '}Una traición es a muerte y sin huida.
      </p>
      {!onlyAlly && <button className="btn mt-3 text-sm" onClick={() => actions.closeModal()}>Cerrar</button>}
    </Modal>
  );
}

/** En el portal, el errante aliado pide su parte: pagar, negarte o atacarle. */
function RivalDemand() {
  const s = useGame((x) => x);
  const m = s.modal;
  if (m?.type !== 'rivalDemand' || !s.expedition) return null;
  const w = getWanderer(s.rival.who);
  const first = w.name.split(' ')[0];
  const pay = planPayment(s.expedition.backpack, s.expedition.pocket, m.amount);
  const mood = m.pct < 0.2 ? `Has repartido bien durante la bajada: ${first} se conforma con el ${Math.round(m.pct * 100)} %.` : m.pct > 0.2 ? `Te has quedado con casi todo: ${first} pide el ${Math.round(m.pct * 100)} % y no está de humor.` : `Lo acordado: el ${Math.round(m.pct * 100)} % del oro ganado desde que os aliasteis.`;
  return (
    <Modal onClose={() => actions.closeModal()} testId="rival-demand">
      <div className="flex items-center gap-3 mb-2">
        <MonsterSprite sprite={w.sprite} scale={2} />
        <h2 className="panel-title text-xl">{first} quiere su parte</h2>
      </div>
      <p className="font-body text-lg italic text-parchment">{m.line}</p>
      <p className="font-body text-base text-stone-300 mt-2">{mood}</p>
      <div className="panel p-3 mt-3 font-body text-base" data-testid="rival-demand-plan">
        {pay.gold > 0 && <div><span className="text-gold">{pay.gold} monedas</span> de tu mochila{pay.pocket !== s.expedition.pocket && gridGold(pay.pocket) < gridGold(s.expedition.pocket) ? ' y del bolsillo seguro' : ''}.</div>}
        {pay.items.length > 0 && <div>No llevas monedas suficientes: se cobra el resto con {pay.items.map((x) => getItem(x.itemId).name).join(', ')}.</div>}
        {pay.short && <div className="text-ember">Ni con todo llega: se lleva lo que tienes.</div>}
      </div>
      <div className="flex gap-2 mt-4 flex-wrap">
        <button className="btn btn-gold" onClick={() => actions.payRival()} data-testid="rival-pay">Pagar y cruzar</button>
        <button className="btn btn-danger" onClick={() => actions.refuseRival()} data-testid="rival-refuse">Negarte</button>
        <button className="btn btn-danger" onClick={() => actions.confirmBetray()} data-testid="rival-strike">Atacarle primero</button>
        <button className="btn" onClick={() => actions.closeModal()} data-testid="rival-later">Todavía no</button>
      </div>
      <p className="text-sm text-stone-400 mt-3">Si te niegas, te atacará a muerte, sin huida posible. Si le atacas tú primero, empezará aturdido. Si ganas, te quedas con todo lo que lleva.{s.rival.who === 'kael' ? ' Kael no olvida.' : ''}</p>
    </Modal>
  );
}

function ConfirmBetray() {
  return (
    <Modal onClose={() => actions.closeModal()} testId="confirm-betray">
      <h2 className="panel-title text-xl text-blood mb-2">¿Traicionar a {getWanderer(getState().rival.who).name.split(' ')[0]}?</h2>
      <p className="font-body text-lg">Romperás la alianza y lo atacarás por sorpresa (empezará aturdido). <b className="text-blood">Lucharéis a muerte, sin posibilidad de huir.</b> Si ganas, te quedas con todo lo que lleva y su oro. Si pierdes, mueres aquí y la mazmorra se queda con tu equipo.</p>
      <div className="flex gap-2 mt-4">
        <button className="btn btn-danger" onClick={() => actions.confirmBetray()} data-testid="confirm-betray-yes">Sí, es una traición</button>
        <button className="btn" onClick={() => actions.closeModal()}>No, era un error</button>
      </div>
    </Modal>
  );
}

function DungeonInventory() {
  const s = useGame((x) => x);
  const [sel, setSel] = useState<Loc | null>(null);
  useClearOnDrop(useCallback(() => setSel(null), []));
  const clear = useCallback(() => setSel(null), []);
  if (!s.expedition || !s.profile) return null;
  const ch = s.profile.character;
  const stats = computeStats(ch.classId, ch.level, s.expedition.equipment);
  return (
    <Modal onClose={() => actions.closeModal()} wide testId="dungeon-inventory">
      <div className="flex items-center justify-between mb-3"><h2 className="panel-title text-xl">Inventario</h2><div className="flex gap-2">
        <button className="btn text-sm" style={{ minHeight: 44 }} onClick={() => actions.groupGold('backpack')} data-testid="group-gold-dungeon" title="Mete las monedas sueltas en tus saquitos y sacos">Agrupar oro</button>
        <button className="btn text-sm" style={{ minHeight: 44 }} onClick={() => actions.sortContainer('backpack')}>Ordenar</button></div></div>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="space-y-4">
          <EquipmentView equipment={s.expedition.equipment} selected={sel} onSelect={setSel} mode="dungeon" portrait={<PlayerSprite scale={5} />} />
          <StatsList stats={stats} resourceName={CLASSES[ch.classId].resourceName} />
        </div>
        <div>
          <GridView grid={s.expedition.backpack} container="backpack" cols={6} equipment={s.expedition.equipment} mode="dungeon" selected={sel} onSelect={setSel}
            onQuick={(l, st) => (getItem(st.itemId).slot ? actions.quickEquip(l) : getItem(st.itemId).use ? actions.useItem(l) : undefined)} />
          {!s.tutorial && <CarryBar className="mt-2" />}
          <div className="mt-3">
            <div className="text-xs text-gold mb-1">Bolsillo seguro · no se pierde al morir{gridGold(s.expedition.pocket) > 0 ? ` · oro a salvo: ${gridGold(s.expedition.pocket)}` : ''}</div>
            <GridView grid={s.expedition.pocket} container="pocket" cols={3} equipment={s.expedition.equipment} mode="dungeon" selected={sel} onSelect={setSel} onQuick={(l) => actions.quickMove(l, 'backpack')} />
          </div>
          <div className="mt-4"><ItemActions loc={sel} mode="dungeon" onClear={clear} /></div>
        </div>
      </div>
      <button className="btn mt-4" onClick={() => actions.closeModal()}>Cerrar <kbd className="opacity-60">I</kbd></button>
    </Modal>
  );
}

function PauseModal() {
  const [settings, setSettings] = useState(false);
  const [giveUp, setGiveUp] = useState(false);
  if (settings) return <SettingsModal onClose={() => setSettings(false)} />;
  return (
    <Modal onClose={() => actions.closeModal()} testId="pause">
      <h2 className="panel-title text-xl mb-1">Pausa</h2>
      <p className="font-body text-stone-300 mb-4">El reloj de la cripta no se detiene.</p>
      <div className="flex flex-col gap-2">
        <button className="btn btn-gold" onClick={() => actions.closeModal()}>Continuar</button>
        <button className="btn" onClick={() => setSettings(true)}>Ajustes</button>
        {!giveUp ? (
          <button className="btn btn-danger" onClick={() => setGiveUp(true)}>Rendirse…</button>
        ) : (
          <div className="panel p-3 border-blood">
            <p className="font-body text-lg mb-2">Rendirte cuenta como una muerte: <b className="text-blood">perderás todo lo que llevas encima</b>.</p>
            <div className="flex gap-2">
              <button className="btn btn-danger" onClick={() => void actions.finishExpedition('died')}>Rendirme</button>
              <button className="btn" onClick={() => setGiveUp(false)}>Seguir luchando</button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 text-sm text-stone-400 font-body text-base">WASD/flechas o clic: moverse · E: interactuar · Q: poción · I: inventario · Esc: menú</div>
    </Modal>
  );
}

function DungeonTutorial() {
  return (
    <Modal onClose={() => actions.markTutorial('dungeon')} testId="dungeon-tutorial">
      <h2 className="panel-title text-xl mb-3">Las Criptas de Umbravel</h2>
      <ul className="font-body text-lg space-y-1.5">
        <li><b>Moverse:</b> WASD, flechas o clic en el suelo.</li>
        <li><b>Interactuar:</b> E (cofres, puertas, otros aventureros, portal).</li>
        <li><b>Combate:</b> al tocar a un enemigo empieza un combate por turnos.</li>
        <li><b>Extraer:</b> busca el portal violeta y canaliza 3 segundos sin moverte.</li>
        <li><b>Tiempo:</b> si el reloj llega a cero, la cripta se queda con todo.</li>
      </ul>
      <button className="btn btn-gold mt-4" onClick={() => actions.markTutorial('dungeon')} data-testid="btn-dungeon-tutorial-ok">¡A por ello!</button>
    </Modal>
  );
}

function InteractMenu({ options }: { options: string[] }) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-50 panel panel-gold p-3 w-80 fade-in" data-testid="interact-menu" role="menu">
      <div className="text-sm text-stone-300 mb-2">¿Qué quieres hacer?</div>
      <div className="flex flex-col gap-1.5">
        {options.map((o, i) => (
          <button key={o} className="btn text-left flex items-center gap-2" onClick={() => activeScene?.chooseInteraction(i)} data-testid={`interact-${i}`} autoFocus={i === 0} role="menuitem">
            <kbd className="text-xs bg-black/40 px-1.5">{i + 1}</kbd>{o}
          </button>
        ))}
      </div>
      <button className="btn w-full mt-2 text-sm" onClick={() => actions.closeModal()}>Cancelar <kbd className="opacity-60">Esc</kbd></button>
    </div>
  );
}

/**
 * Indicaciones del tutorial: un cartel arriba con el paso actual (texto de ratón o de toque según el dispositivo)
 * y el botón que hay que pulsar resaltado. La flecha sobre el mapa la pone la escena.
 */
function TutorialGuide() {
  const t = useGame((s) => s.tutorial)!;
  const combat = useGame((s) => s.combat);
  const touch = useIsTouch();
  const channel = useGame((s) => s.hud.channel);
  const raw = TUTORIAL_STEPS[t.step];
  // Paso de la poción: no se muestra nada hasta que los pinchos te hieren
  const step = raw?.id === 'potion' && t.potionsAt === undefined ? undefined : raw;
  const invOpen = useGame((s) => s.modal?.type === 'inventory');
  const looseCoins = useGame((s) => !!s.expedition?.backpack.some((x) => x && isCoins(x)));
  const base = step?.target && 'ui' in step.target ? (touch && step.target.ui === 'btn-potion' ? 'touch-potion' : step.target.ui) : null;
  // Bolsillo seguro: con el inventario abierto, se resalta «Agrupar oro» mientras queden monedas sueltas
  const target = step?.id === 'pocket' && invOpen ? (looseCoins ? 'group-gold-dungeon' : null) : base;
  useEffect(() => {
    if (!target) return;
    let el: Element | null = null;
    const find = () => {
      const now = document.querySelector(`[data-testid="${target}"]`);
      if (now !== el) { el?.classList.remove('tut-pulse'); el = now; el?.classList.add('tut-pulse'); }
    };
    find();
    const iv = setInterval(find, 300);
    return () => { clearInterval(iv); el?.classList.remove('tut-pulse'); };
  }, [target]);
  // Al canalizar el portal se aparta, para que se vea la barra de extracción
  if (!step || combat || channel > 0) return null;
  return (
    <div className="tut-guide panel panel-gold" role="status" aria-live="polite" data-testid="tutorial-guide" data-step={step.id}>
      <div className="font-display text-gold text-[11px] tracking-[0.2em] uppercase">Tutorial · {t.step + 1}/{TUTORIAL_STEPS.length}</div>
      <div className="font-body text-parchment leading-snug mt-0.5" data-testid="tutorial-text">{touch ? step.touch : step.desktop}</div>
    </div>
  );
}
