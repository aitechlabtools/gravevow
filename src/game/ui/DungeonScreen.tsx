import { NeedsDots, NeedsPanel, NeedsStrip } from './NeedsBars';
import { currentMini } from '../../core/tutorials';
import { className } from '../../core/gender';
import { CarryBar, HudLoad, OverloadChip, PactChip } from './CarryBar';
import { effectiveMaxMp, needsOf } from '../../core/needs';
import { getPact } from '../../core/data/altars';
import { useClearOnDrop } from './pointerDrag';
import { gridGold } from '../../core/gold';
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
import { Bar, EquipmentView, GridView, StatsList, ItemIcon, highlightItems } from './inventory';
import { GoldAmountPicker } from './GoldAmountPicker';
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
import { TutorialGuide } from './TutorialGuide';
import { ExpeditionMinis } from './ExpeditionMinis';
import { RISK, GOLD_SHARE, SHARE_FAIR_RATIO, GRIZK_REP, type RiskLevel } from '../../config/wanderers';
import { shareVerdict } from '../../core/social';
import { pinnedQuests, questDef, questProgress } from '../../core/quests';
import { planPayment } from '../../core/share';
import { useLayout } from '../../config/ui';
import { Panel } from './kit';
import { ItemCard } from './screens/ItemCard';

export function DungeonScreen() {
  const host = useRef<HTMLDivElement>(null);
  const touch = useIsTouch();
  const modal = useGame((s) => s.modal);
  const combat = useGame((s) => s.combat);
  const tutorial = useGame((s) => s.tutorial);

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
      {tutorial && <TutorialGuide />}
      <ExpeditionMinis />
    </div>
  );
}

function Hud() {
  const s = useGame((x) => x);
  const touch = useIsTouch();
  const size = useTouchSize();
  const exp = s.expedition;
  if (!exp || !s.profile) return null;
  // Tres variantes: escritorio (ratón), tableta (dedo en pantalla grande) y móvil (tira compacta)
  const variant: HudVariant = !touch ? 'desktop' : size === 'phone' ? 'phone' : 'tablet';
  return (
    <>
      {variant === 'phone' ? <PhoneStrip /> : <PlayerPanel variant={variant} />}
      {variant === 'desktop' && <DesktopPotion />}
      <HudClock variant={variant} />
      <div className="absolute z-10 flex flex-col items-end gap-2" style={variant === 'desktop' ? { right: 12, top: 12 } : { right: safe('right', TOUCH_CFG.edge[size]), top: safe('top', TOUCH_CFG.edge[size]) }}>
        <HudButtons variant={variant} />
        {variant === 'phone' ? <PhoneRight /> : <Companions width={variant === 'desktop' ? 'w-56' : 'w-48'} />}
      </div>

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
      {/* Un solo aliado: errante (con su triángulo) o mercenario (contrato o rescatado) */}
      {rival.disposition === 'allied' && (
        <button className={`panel p-2 ${width} border-heal text-left`} onClick={() => actions.interactRival()} data-testid="hud-ally" style={{ minHeight: 44 }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-9 h-9 bg-black/40 border border-stone-700 overflow-hidden flex items-end justify-center shrink-0"><MonsterSprite sprite={getWanderer(rival.who).sprite} scale={2} /></span>
            <span className="min-w-0">
              <span className="text-xs text-heal block truncate">Aliado · {getWanderer(rival.who).name}</span>
              <span className="text-[12px] flex items-center gap-1" style={{ color: RISK[rival.risk].color }}><RiskBadge risk={rival.risk} size={14} />{rival.who === 'kael' && rival.risk === 'mid' ? 'Confianza baja' : RISK[rival.risk].label}
                {rival.witnessed && <span className="text-blood ml-1" title="Te vio traicionar a tu aliado anterior: se fía menos" data-testid="hud-ally-witness">👁</span>}</span>
            </span>
          </div>
          <Bar value={rival.hp} max={getWanderer(rival.who).stats.maxHp} color="#5fd19a" />
        </button>
      )}
      {merc?.alive && (() => {
        const m = getMerc(merc.id);
        return (
          <button className={`panel p-2 ${width} border-heal text-left`} onClick={() => actions.interactMerc()} data-testid="hud-merc" style={{ minHeight: 44 }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-9 h-9 bg-black/40 border border-stone-700 overflow-hidden flex items-end justify-center shrink-0"><MonsterSprite sprite={m.sprite} scale={2} /></span>
              <span className="min-w-0">
                <span className="text-xs text-heal block truncate">Aliado · {m.name}</span>
                <span className="text-[12px] text-stone-400">⛨ {merc.rescued ? 'Rescatado' : 'Contrato de Grizk'} · {STANCE_NAME[merc.stance]}</span>
              </span>
            </div>
            <Bar value={merc.hp} max={mercBaseStats(m).maxHp} color="#5fd19a" />
          </button>
        );
      })()}
      {rival.disposition === 'hostile' && <div className="panel px-3 py-1 text-sm text-blood border-blood" data-testid="hud-rival-hostile">{getWanderer(rival.who).name.split(' ')[0]} es hostil</div>}
      {rival.disposition === 'fleeing' && <div className="panel px-3 py-1 text-sm text-ember border-blood" data-testid="hud-rival-fleeing">¡{getWanderer(rival.who).name.split(' ')[0]} huye con tu botín!</div>}
    </>
  );
}

type HudVariant = 'desktop' | 'tablet' | 'phone';

/** Escritorio: la poción abajo a la derecha, en el mismo sitio que en tableta y móvil, con la tecla debajo. */
function DesktopPotion() {
  const potions = useGame((s) => (s.expedition ? countItem(s.expedition.backpack, 'health_potion') : 0));
  return (
    <div className="absolute z-10 flex flex-col items-center gap-1" style={{ right: 24, bottom: 20 }}>
      <button className={`touch-btn ${potions ? '' : 'is-idle'}`} style={{ width: 64, height: 64 }} onClick={() => { if (potions) actions.drinkPotion(); }} aria-disabled={!potions} aria-label={`Beber poción (${potions})`} title="Beber poción (Q)" data-testid="btn-potion">
        <ItemIcon itemId="health_potion" size={26} />
        <span className="absolute -top-1 -right-1 text-xs bg-black/80 px-1 border border-stone-600">{potions}</span>
        <kbd className="absolute -top-1 -left-1 text-xs bg-black/80 px-1 border border-stone-600 text-stone-300">Q</kbd>
      </button>
    </div>
  );
}

function hudPos(variant: HudVariant, size: ReturnType<typeof useTouchSize>) {
  return variant === 'desktop' ? { left: 12, top: 12 } : { left: safe('left', TOUCH_CFG.edge[size]), top: safe('top', TOUCH_CFG.edge[size]) };
}

/** Botín y oro encima, en una línea al pie del bloque del jugador. */
function LootLine({ compact = false }: { compact?: boolean }) {
  const exp = useGame((s) => s.expedition)!;
  if (compact) {
    return (
      <span className="hud-loot-mini" title="Botín (valor) y oro encima: se pierde si mueres">
        <span className="text-gold flex items-center gap-1"><HudIcon name="loot" px={12} /><span data-testid="hud-loot-value">{gridValue(exp.backpack)}</span></span>
        <GoldAmount value={gridGold(exp.backpack)} />
      </span>
    );
  }
  return (
    <div className="hud-row3">
      <span className="text-gold flex items-center gap-1" title="Botín: valor de lo que llevas"><HudIcon name="loot" px={12} /><span data-testid="hud-loot-value">{gridValue(exp.backpack)}</span></span>
      <span title="Oro que llevas encima: se pierde si mueres"><GoldAmount value={gridGold(exp.backpack)} /></span>
      <HudLoad />
    </div>
  );
}

/** Escritorio y tableta: un solo bloque arriba a la izquierda con todo lo del jugador. */
function PlayerPanel({ variant }: { variant: HudVariant }) {
  const s = useGame((x) => x);
  const size = useTouchSize();
  const exp = s.expedition!;
  const ch = s.profile!.character;
  const stats = computeStats(ch.classId, ch.level, exp.equipment);
  const needs = needsOf(exp.needs);
  return (
    <div className="absolute z-10 panel p-3" style={{ ...hudPos(variant, size), width: 296 }} data-testid="hud-player">
      <div className="flex items-center gap-2 mb-2">
        <div className="hud-bust" aria-hidden><PlayerSprite scale={3} animate={false} /></div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate">{ch.name}</div>
          <div className="text-xs text-stone-300 truncate">{className(ch.classId, ch.appearance.sex)} · Nv {ch.level}</div>
        </div>
        <BodyFigure body={exp.body} unit={3} onClick={() => actions.openModal({ type: 'body' })} testId="hud-body" />
      </div>
      <Bar value={exp.hp} max={stats.maxHp} color="#c4283b" label="Vida" testId="hud-hp" />
      <div className="h-1" />
      <Bar value={exp.mp} max={effectiveMaxMp(stats.maxMp, needs, getPact(exp.pact)?.mpLoss ?? 0)} color={CLASSES[ch.classId].resource === 'impetus' ? '#e08a3d' : '#3d7be0'} label={CLASSES[ch.classId].resourceName} />
      <NeedsStrip needs={needs} />
      <LootLine />
      {!s.tutorial && <PactChip />}
    </div>
  );
}

/** Móvil: tira de 44 px con figura del cuerpo, vida y recurso con número, necesidades en iconos y botín. */
function PhoneStrip() {
  const s = useGame((x) => x);
  const size = useTouchSize();
  const exp = s.expedition!;
  const ch = s.profile!.character;
  const stats = computeStats(ch.classId, ch.level, exp.equipment);
  const needs = needsOf(exp.needs);
  const maxMp = effectiveMaxMp(stats.maxMp, needs, getPact(exp.pact)?.mpLoss ?? 0);
  return (
    <div className="absolute z-10 flex flex-col items-start gap-1.5" style={hudPos('phone', size)}>
      <div className="panel hud-strip" data-testid="hud-player">
        <BodyFigure body={exp.body} unit={2} onClick={() => actions.openModal({ type: 'body' })} testId="hud-body" label={`${ch.name} · ${className(ch.classId, ch.appearance.sex)} · Nv ${ch.level} · Heridas`} />
        <div className="hud-strip-bars">
          <ThinBar value={exp.hp} max={stats.maxHp} color="#c4283b" testId="hud-hp" />
          <ThinBar value={exp.mp} max={maxMp} color={CLASSES[ch.classId].resource === 'impetus' ? '#e08a3d' : '#3d7be0'} />
        </div>
        <NeedsDots needs={needs} />
        <LootLine compact />
      </div>
      {!s.tutorial && <OverloadChip />}{!s.tutorial && <PactChip />}
      <AllyIcons />
    </div>
  );
}

/** Barra fina con el número a la derecha (móvil). */
function ThinBar({ value, max, color, testId }: { value: number; max: number; color: string; testId?: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="hud-thin" data-testid={testId}>
      <div className="hud-thin-bar"><div style={{ width: `${pct}%`, background: color }} /></div>
      <span className="hud-thin-num">{Math.ceil(value)}</span>
    </div>
  );
}

/** Reloj arriba en el centro. En el móvil la sala sale solo 3 s al entrar, al tocar el reloj o si un aviso la señala. */
function HudClock({ variant }: { variant: HudVariant }) {
  const s = useGame((x) => x);
  const size = useTouchSize();
  const room = s.hud.room;
  const tipRoom = useGame((x) => { const m = currentMini(x.miniQueue); return !!m && m.steps.some((st) => st.target === 'hud-room'); });
  const [peek, setPeek] = useState(true);
  useEffect(() => { setPeek(true); const t = window.setTimeout(() => setPeek(false), 3000); return () => window.clearTimeout(t); }, [room]);
  const exp = s.expedition!;
  const left = timeLeft(exp, s.now);
  const urgent = left < 120000;
  const phone = variant === 'phone';
  const showRoom = !phone || peek || tipRoom || !!s.tutorial;
  const top = variant === 'desktop' ? 12 : safe('top', TOUCH_CFG.edge[size]);
  return (
    <div className="absolute left-1/2 -translate-x-1/2 z-10 text-center flex flex-col items-center" style={{ top }}>
      <button className={`panel font-display ${phone ? 'px-3 text-xl' : variant === 'tablet' ? 'px-4 py-0.5 text-2xl' : 'px-5 py-1 text-3xl'} ${urgent ? 'text-blood animate-pulse' : 'text-parchment'}`}
        style={{ minHeight: variant === 'desktop' ? undefined : 44, cursor: phone ? 'pointer' : 'default' }} onClick={phone ? () => setPeek((v) => !v) : undefined} aria-label="Tiempo restante" data-testid="hud-timer">{s.tutorial ? 'Tutorial' : formatTime(left)}</button>
      <div className={`mt-1 text-stone-300 tracking-widest uppercase font-display pointer-events-none hud-room ${phone ? 'text-xs' : 'text-sm'} ${showRoom ? '' : 'is-hidden'}`} data-testid="hud-room">{room}</div>
      {variant === 'desktop' && s.dungeon && <div className="text-xs text-stone-300 mt-0.5 pointer-events-none" data-testid="hud-dungeon">{s.dungeon.name}{s.dungeon.seed !== undefined ? ` · mapa ${s.dungeon.seed}` : ''}</div>}
    </div>
  );
}

/** Inventario, menú y pantalla completa: iconos en todos los formatos. Escritorio: la tecla debajo; tableta: el nombre. */
function HudButtons({ variant }: { variant: HudVariant }) {
  const cap = (desk: string, tab: string) => variant === 'desktop' ? <kbd className="hud-ibtn-cap">{desk}</kbd> : variant === 'tablet' ? <span className="hud-ibtn-cap">{tab}</span> : null;
  return (
    <div className="flex gap-2 items-start">
      <div className="hud-ibtn">
        <button className="btn hud-ibtn-b" onClick={() => actions.openModal({ type: 'inventory' })} aria-label="Inventario" title="Inventario" data-testid="btn-inventory"><HudIcon name="bag" px={24} /></button>
        {cap('I', 'Mochila')}
      </div>
      <div className="hud-ibtn">
        <button className="btn hud-ibtn-b" onClick={() => actions.openModal({ type: 'pause' })} aria-label="Menú" title="Menú" data-testid="btn-menu"><HudIcon name="menu" px={24} /></button>
        {cap('Esc', 'Menú')}
      </div>
      <div className="hud-ibtn">
        <FullscreenButton className="hud-ibtn-b" />
        {cap('F', 'Pantalla')}
      </div>
    </div>
  );
}

/** Móvil, derecha: misiones fijadas y avisos del errante (el aliado va a la izquierda, bajo la tira). */
function PhoneRight() {
  const rival = useGame((s) => s.rival);
  return (
    <>
      <PinnedQuestsHud width="w-40" />
      {rival.disposition === 'hostile' && <div className="panel px-3 py-1 text-sm text-blood border-blood" data-testid="hud-rival-hostile">{getWanderer(rival.who).name.split(' ')[0]} es hostil</div>}
      {rival.disposition === 'fleeing' && <div className="panel px-3 py-1 text-sm text-ember border-blood" data-testid="hud-rival-fleeing">¡{getWanderer(rival.who).name.split(' ')[0]} huye con tu botín!</div>}
    </>
  );
}

/** Móvil: aliado como icono de 44 px con su vida; al tocarlo, su tarjeta completa. */
function AllyIcons() {
  const rival = useGame((s) => s.rival);
  const merc = useGame((s) => s.merc);
  return (
    <div className="flex gap-1.5">
      {rival.disposition === 'allied' && (() => {
        const w = getWanderer(rival.who);
        return (
          <button className="panel hud-ally-ico" onClick={() => actions.interactRival()} aria-label={`Aliado: ${w.name} · ${RISK[rival.risk].label}`} data-testid="hud-ally">
            <span className="hud-ally-spr"><MonsterSprite sprite={w.sprite} scale={1} /></span>
            <span className="hud-ally-risk"><RiskBadge risk={rival.risk} size={14} /></span>
            <span className="hud-ally-hp"><span style={{ width: `${Math.max(0, Math.min(100, rival.hp / w.stats.maxHp * 100))}%` }} /></span>
          </button>
        );
      })()}
      {merc?.alive && (() => {
        const m = getMerc(merc.id);
        return (
          <button className="panel hud-ally-ico" onClick={() => actions.interactMerc()} aria-label={`Aliado: ${m.name}`} data-testid="hud-merc">
            <span className="hud-ally-spr"><MonsterSprite sprite={m.sprite} scale={1} /></span>
            <span className="hud-ally-hp"><span style={{ width: `${Math.max(0, Math.min(100, merc.hp / mercBaseStats(m).maxHp * 100))}%` }} /></span>
          </button>
        );
      })()}
    </div>
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

/** Botín en el móvil (23/11): ventana flotante sobre la mazmorra, saco | tuyo, y una barra abajo que cambia
 *  según lo tocado: sin nada, «Coger el oro» y «Cogerlo todo»; un montón, cuántos coger (− n + · Mitad · Todo). */
function PhoneLoot({ sel, setSel }: { sel: Loc | null; setSel: (l: Loc | null) => void }) {
  const s = useGame((x) => x);
  const [amt, setAmt] = useState(1);
  const session = s.modal?.type === 'loot' ? s.modal.session : null;
  const grid = session ? (s.chests[session.id] ?? s.bags[session.id]?.grid ?? []) : [];
  const selStack = sel?.kind === 'grid' && sel.container === 'loot' ? grid[sel.index] : null;
  const qty = selStack?.qty ?? 0;
  useEffect(() => { setAmt(qty > 1 ? Math.max(1, Math.floor(qty / 2)) : 1); }, [sel?.kind === 'grid' ? sel.index : -1, qty > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!session || !s.expedition) return null;
  const share = session.shareAsked && s.rival.disposition === 'allied';
  const who = getWanderer(s.rival.who).name.split(' ')[0];
  const n = Math.min(Math.max(1, amt), Math.max(1, qty));
  const it = selStack ? getItem(selStack.itemId) : null;
  const B = 'btn text-[13px] px-3';
  const H = { minHeight: 44, minWidth: 44 } as const;
  const bagUsed = s.expedition.backpack.filter(Boolean).length;
  return (
    <div className="absolute inset-0 z-50 fade-in" data-testid="loot-modal">
      <div className="absolute inset-0 bg-black/45" onClick={() => actions.closeLoot()} aria-hidden />
      <div className="loot-win" role="dialog" aria-label={session.title}>
        <div className="loot-win-hd">
          <span className="font-display text-gold text-[15px] tracking-[0.06em] truncate flex-1">{session.title}</span>
          <button className="loot-win-x" onClick={() => actions.closeLoot()} aria-label="Cerrar" data-testid="btn-close-loot">✕</button>
        </div>
        {share && <div className="px-3 pt-1"><ShareMeter given={session.givenValue ?? 0} total={session.totalValue ?? 0} single={session.single} name={who} /></div>}
        <div className="loot-win-bd">
          <div className="min-w-0 shrink-0 overflow-y-auto scroll-thin">
            <div className="loot-win-h">Dentro</div>
            <GridView grid={grid} container="loot" cols={3} lootId={session.id} equipment={s.expedition.equipment} mode="dungeon" selected={sel} onSelect={setSel}
              onQuick={(l) => actions.quickMove(l, 'backpack', session.id)} onAlt={(l) => actions.quickMove(l, 'backpack', session.id)} />
            {grid.every((x) => !x) && <p className="text-stone-400 text-[13px] mt-2 italic">Vacío.</p>}
          </div>
          <div className="w-px bg-[#2a2830] shrink-0" />
          <div className="min-w-0 flex-1 overflow-y-auto scroll-thin">
            <div className="loot-win-h">Tuyo · {bagUsed}/{s.expedition.backpack.length}</div>
            <GridView grid={s.expedition.backpack} container="backpack" cols={7} lootId={session.id} equipment={s.expedition.equipment} mode="dungeon"
              onQuick={(l) => actions.quickMove(l, 'loot', session.id)} onAlt={(l) => actions.quickMove(l, 'loot', session.id)} />
          </div>
        </div>
        <div className="loot-win-ft" data-testid="loot-bar">
          {selStack && it ? (<>
            <span className="min-w-0 flex-1 text-[13px] leading-tight truncate"><b style={{ color: RARITY_INFO[it.rarity].color }}>{it.name}</b>{qty > 1 && <span className="text-stone-400"> · hay {qty}</span>}</span>
            {qty > 1 && <>
              <button className={B} style={H} onClick={() => setAmt(n - 1)} disabled={n <= 1} data-testid="loot-amt-menos">−</button>
              <span className="loot-win-val" data-testid="loot-amt">{n}</span>
              <button className={B} style={H} onClick={() => setAmt(n + 1)} disabled={n >= qty} data-testid="loot-amt-mas">+</button>
              <button className={B} style={H} onClick={() => setAmt(Math.max(1, Math.floor(qty / 2)))} data-testid="loot-amt-half">Mitad</button>
              <button className={B} style={H} onClick={() => setAmt(qty)} data-testid="loot-amt-all">Todo</button>
            </>}
            {share && <button className={B} style={H} onClick={() => { actions.giveToRival(session.id, (sel as { index: number }).index, qty > 1 ? n : undefined); setSel(null); }} data-testid="btn-give">Dar{qty > 1 ? ` ${n}` : ''}</button>}
            <button className={`${B} btn-gold`} style={H} onClick={() => { actions.takeSome(sel!, n, session.id); setSel(null); }} data-testid="btn-take-some">Coger{qty > 1 ? ` ${n}` : ''}</button>
          </>) : (<>
            <span className="min-w-0 flex-1 text-[12px] text-stone-400 leading-tight">{share ? `${who} espera su parte: toca algo y «Dar».` : 'Toca algo para elegir cuántos coger.'}</span>
            {grid.some((x) => x?.itemId === 'gold_coins') && <button className={B} style={H} onClick={() => actions.takeGold(session.id)} data-testid="btn-take-gold">Coger el oro ({gridGold(grid)})</button>}
            <button className={`${B} btn-gold`} style={H} onClick={() => actions.takeAll(session.id)} data-testid="btn-take-all">Cogerlo todo</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

function LootModal() {
  const s = useGame((x) => x);
  const layout = useLayout();
  const [sel, setSel] = useState<Loc | null>(null);
  const [splitGive, setSplitGive] = useState(false);
  useClearOnDrop(useCallback(() => setSel(null), []));
  if (s.modal?.type !== 'loot' || !s.expedition) return null;
  const session = s.modal.session;
  const grid = s.chests[session.id] ?? s.bags[session.id]?.grid ?? [];
  const share = session.shareAsked && s.rival.disposition === 'allied';
  const selStack = sel?.kind === 'grid' && sel.container === 'loot' ? grid[sel.index] : null;
  if (layout === 'phone') return <PhoneLoot sel={sel} setSel={setSel} />;
  if (layout !== 'desktop') {
    // Fase 3 (tableta y móvil): «Del saco» | «Tuyo» | ficha, y «Cogerlo todo» como acción principal abajo
    const phone = false;
    const who = getWanderer(s.rival.who).name.split(' ')[0];
    return (
      <div className="absolute inset-0 z-50 flex fade-in inv-full" data-testid="loot-modal">
        <Panel className="min-h-0 shrink-0 loot-from" bodyClassName="overflow-y-auto scroll-thin">
          <div className="panel-title mb-2">{session.title}</div>
          <GridView grid={grid} container="loot" cols={phone ? 4 : 6} lootId={session.id} equipment={s.expedition.equipment} mode="dungeon" selected={sel} onSelect={setSel}
            onQuick={(l) => actions.quickMove(l, 'backpack', session.id)} onAlt={(l) => actions.quickMove(l, 'backpack', session.id)} />
          {grid.every((x) => !x) && <p className="text-muted text-sm mt-2">Vacío.</p>}
        </Panel>
        <Panel className="min-h-0 shrink-0" bodyClassName="overflow-y-auto scroll-thin">
          <div className="panel-title mb-2">Tuyo · {s.expedition.backpack.filter(Boolean).length}/{s.expedition.backpack.length}</div>
          <GridView grid={s.expedition.backpack} container="backpack" cols={6} lootId={session.id} equipment={s.expedition.equipment} mode="dungeon"
            onQuick={(l) => actions.quickMove(l, 'loot', session.id)} onAlt={(l) => actions.quickMove(l, 'loot', session.id)} />
          {!s.tutorial && <CarryBar className="mt-2" />}
        </Panel>
        <Panel className="min-h-0 flex-1 min-w-0" bodyClassName="min-h-0 h-full flex flex-col">
          <div className="flex justify-end mb-2"><button className="btn" onClick={() => actions.closeLoot()} data-testid="btn-close-loot">Cerrar ✕</button></div>
          <div className="flex-1 min-h-0 overflow-y-auto scroll-thin">
            {share && <div className="text-sm mb-2"><b className="text-heal">{who} espera su parte.</b> Elige algo y pulsa «Dar».<ShareMeter given={session.givenValue ?? 0} total={session.totalValue ?? 0} single={session.single} name={who} /></div>}
            {selStack ? (
              <div className="flex flex-col gap-2 items-start">
                <ItemIcon itemId={selStack.itemId} size={44} />
                <span className="font-display" style={{ color: RARITY_INFO[getItem(selStack.itemId).rarity].color }}>{getItem(selStack.itemId).name}{selStack.qty > 1 ? ` · ${selStack.qty}` : ''}</span>
                <div className="flex gap-2 flex-wrap">
                  <button className="btn" onClick={() => { actions.quickMove(sel!, 'backpack', session.id); setSel(null); }}>Coger</button>
                  {share && <button className="btn" onClick={() => { actions.giveToRival(session.id, (sel as { index: number }).index); setSel(null); }} data-testid="btn-give">Dar a {who}</button>}
                </div>
              </div>
            ) : <div className="text-muted text-sm">Toca un objeto del saco para verlo, o cógelo todo.</div>}
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {grid.some((x) => x?.itemId === 'gold_coins') && <button className="btn" onClick={() => actions.takeGold(session.id)} data-testid="btn-take-gold">Coger el oro ({gridGold(grid)})</button>}
            <button className="btn btn-gold" style={{ minHeight: 52 }} onClick={() => actions.takeAll(session.id)} data-testid="btn-take-all">Cogerlo todo</button>
          </div>
        </Panel>
      </div>
    );
  }
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
              {share && <button className="btn text-sm" onClick={() => { actions.giveToRival(session.id, (sel as { index: number }).index); setSel(null); }} data-testid="btn-give">Dar a {getWanderer(s.rival.who).name.split(' ')[0]}{selStack.qty > 1 ? ' (todo)' : ''}</button>}
              {share && selStack.qty > 1 && !selStack.gold && <button className="btn text-sm" onClick={() => setSplitGive(true)} data-testid="btn-give-split">Dividir…</button>}
            </div>
          )}
          {splitGive && selStack && sel?.kind === 'grid' && (
            <GoldAmountPicker title={`Dar a ${getWanderer(s.rival.who).name.split(' ')[0]}`} max={selStack.qty} initial={Math.max(1, Math.floor(selStack.qty / 2))} onClose={() => setSplitGive(false)}
              from={<><ItemIcon itemId={selStack.itemId} size={36} /><span className="font-body text-lg">{getItem(selStack.itemId).name} · <b className="text-gold">{selStack.qty}</b></span></>}
              confirm={(n) => `Dar ${n}`} note="El resto se queda en el cofre."
              onConfirm={(n) => { actions.giveToRival(session.id, sel.index, n); setSel(null); }} />
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
  const busy = useGame((s) => !!s.merc?.alive || s.rival.disposition === 'allied');
  const kael = useGame((s) => s.rival.who === 'kael' && s.rival.disposition === 'allied');
  return (
    <Modal onClose={() => actions.closeModal()} testId="captive-modal">
      <div className="flex gap-4">
        <div className="shrink-0 w-28 h-36 bg-black/40 border-2 border-stone-700 flex items-end justify-center"><MonsterSprite sprite={m.sprite} scale={5} /></div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-2xl">{m.name}</h2>
          <div className="text-sm text-gold">Prisionero · {m.title}</div>
          <p className="font-body text-lg mt-2 leading-snug">{m.blurb}</p>
          <p className="font-body text-lg mt-2 leading-snug text-parchment">{m.rescueLine}{kael && ' Kael lo mira de reojo: «Dos bocas más que alimentar. Tú decides.»'}</p>
        </div>
      </div>
      {busy ? <AllyChoice target={{ kind: 'captive', name: m.name, mercId }} /> : <>
      <p className="font-body text-base text-stone-300 mt-3">Si rompes sus cadenas, luchará a tu lado gratis en esta expedición. <b className="text-heal">Si extraéis con vida</b>, llegará al refugio y podrás contratar sus servicios con Garra Roja (el primer contrato, a mitad de precio). Si cae en combate o mueres tú, se pierde.</p>
      <div className="flex flex-wrap gap-2 mt-4">
        <button className="btn btn-gold" disabled={busy} onClick={() => actions.freeCaptive(mercId)} data-testid="captive-free">Romper las cadenas</button>
        <button className="btn" onClick={() => actions.closeModal()}>Dejarlo para luego</button>
      </div>
      </>}
    </Modal>
  );
}

function BodyModal() {
  const exp = useGame((s) => s.expedition);
  const profile = useGame((s) => s.profile);
  if (!exp || !profile) return null;
  return (
    <Modal onClose={() => actions.closeModal()} wide testId="body-modal">
      <h2 className="font-display text-2xl mb-2">Heridas y necesidades</h2>
      <BodyPanel body={expBody(exp, profile)} backpack={exp.backpack} surgery={exp.surgery} onTreat={(id, r) => actions.treat(id, r)}
        note="Se muere si la cabeza o el tórax llegan a cero. Tratar fuera de combate no gasta turno; la cirugía tarda dos pulsos.">
        <NeedsPanel needs={needsOf(exp.needs)} body={exp.body} backpack={exp.backpack} onShowFood={(ids) => { actions.openModal({ type: 'inventory' }); window.setTimeout(() => highlightItems(ids), 120); }} />
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
  // En el tutorial, con Osric solo cabe aliarse; ya aliados, no se le puede dejar ni traicionar
  const tut = useGame((s) => !!s.tutorial);
  const onlyAlly = tut && !allied;
  // Ya te acompaña un mercenario y este errante aún no es tu aliado: solo cabe uno
  const conflict = useGame((s) => !!s.merc?.alive) && !allied && !tut && rival.disposition === 'neutral';
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
      {conflict ? <AllyChoice target={{ kind: 'rival', name: w.name, risk: rival.risk }} /> : <>
      <div className={`grid gap-2 mt-4 ${onlyAlly ? '' : 'sm:grid-cols-2'}`}>
        {!onlyAlly && <button className="btn" onClick={() => actions.rivalTalk()} data-testid="rival-talk">Hablar</button>}
        {!allied && <button className="btn btn-gold" onClick={() => actions.rivalPropose()} data-testid="rival-ally">Aliarse</button>}
        {!allied && !onlyAlly && <button className="btn" onClick={() => actions.rivalIgnore()} data-testid="rival-ignore">Seguir tu camino</button>}
        {allied && !tut && <button className="btn" onClick={() => actions.rivalLeave()} data-testid="rival-leave">Separar vuestros caminos</button>}
        {!allied && !onlyAlly && <button className="btn btn-danger" onClick={() => actions.rivalAttack()} data-testid="rival-attack">Atacar</button>}
        {allied && !tut && <button className="btn btn-danger" onClick={() => actions.askBetray()} data-testid="rival-betray">Traicionar…</button>}
      </div>
      <p className="text-stone-400 mt-3 font-body text-sm" data-testid="rival-terms">
        {allied ? `Lucha a tu lado. Quiere su parte de cada cofre y de cada saco de combate, y al llegar al portal te pedirá el ${Math.round(GOLD_SHARE * 100)} % del oro (menos si repartes bien, más si no).` : `Si os aliáis, lucha a tu lado a cambio de su parte del botín y, en el portal, del ${Math.round(GOLD_SHARE * 100)} % del oro. El triángulo indica cuánto puedes fiarte.`}
        {' '}Una traición es a muerte y sin huida.
      </p>
      </>}
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
  const layout = useLayout();
  const [sel, setSel] = useState<Loc | null>(null);
  useClearOnDrop(useCallback(() => setSel(null), []));
  const clear = useCallback(() => setSel(null), []);
  if (!s.expedition || !s.profile) return null;
  const ch = s.profile.character;
  const stats = computeStats(ch.classId, ch.level, s.expedition.equipment);
  if (layout !== 'desktop') {
    // Fase 3 (tableta y móvil): pantalla completa en tres columnas; la ficha a la derecha no tapa nada
    const phone = layout === 'phone';
    return (
      <div className="absolute inset-0 z-50 flex fade-in inv-full" data-testid="dungeon-inventory">
        <Panel className="min-h-0 shrink-0" bodyClassName="overflow-y-auto scroll-thin">
          <EquipmentView equipment={s.expedition.equipment} selected={sel} onSelect={setSel} mode="dungeon" portrait={<PlayerSprite scale={phone ? 2 : 4} />} />
          <div className="mt-3"><StatsList stats={stats} resourceName={CLASSES[ch.classId].resourceName} /></div>
        </Panel>
        <Panel className="min-h-0 shrink-0" bodyClassName="overflow-y-auto scroll-thin">
          <div className="flex items-center justify-between gap-2 mb-2"><span className="panel-title">Mochila · {s.expedition.backpack.filter(Boolean).length}/{s.expedition.backpack.length}</span>
            <span className="flex gap-1"><button className="btn text-sm" onClick={() => actions.groupGold('backpack')} data-testid="group-gold-dungeon">Agrupar oro</button><button className="btn text-sm" onClick={() => actions.sortContainer('backpack')}>Ordenar</button></span></div>
          <GridView grid={s.expedition.backpack} container="backpack" cols={6} equipment={s.expedition.equipment} mode="dungeon" selected={sel} onSelect={setSel}
            onQuick={(l, st) => (getItem(st.itemId).slot ? actions.quickEquip(l) : getItem(st.itemId).use ? actions.useItem(l) : undefined)} />
          {!s.tutorial && <CarryBar className="mt-2" />}
          <div className="mt-3 text-sm text-gold mb-1">Bolsillo seguro · no se pierde al morir</div>
          <GridView grid={s.expedition.pocket} container="pocket" cols={3} equipment={s.expedition.equipment} mode="dungeon" selected={sel} onSelect={setSel} onQuick={(l) => actions.quickMove(l, 'backpack')} />
        </Panel>
        <Panel className="min-h-0 flex-1 min-w-0" bodyClassName="overflow-y-auto scroll-thin flex flex-col">
          <div className="flex justify-end mb-2"><button className="btn" onClick={() => actions.closeModal()} data-testid="btn-close-inventory">Cerrar ✕</button></div>
          {sel ? <ItemCard loc={sel} mode="dungeon" onClear={clear} compact={phone} stacked />
            : <div className="flex-1 flex items-center justify-center text-center text-muted text-sm px-2">Toca un objeto para ver su ficha aquí.</div>}
        </Panel>
      </div>
    );
  }
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
        <div className="pause-sep" />
        {!giveUp ? (
          <button className="btn btn-danger" onClick={() => setGiveUp(true)} data-testid="btn-give-up">Abandonar la expedición…</button>
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
      <div className="mt-4 text-sm text-stone-300">Controles completos en Ajustes › Controles</div>
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
 * Solo cabe un aliado (13/11): con alguien ya contigo, el nuevo (errante o prisionero) se decide aquí.
 * Quedarte con el tuyo, separar caminos o traicionarle; cada opción con su consecuencia en una línea.
 */
function AllyChoice({ target }: { target: { kind: 'rival'; name: string; risk: RiskLevel } | { kind: 'captive'; name: string; mercId: string } }) {
  const merc = useGame((s) => s.merc);
  const rival = useGame((s) => s.rival);
  const curMerc = merc?.alive ? getMerc(merc.id) : null;
  const cur = curMerc ? { name: curMerc.name, sprite: curMerc.sprite, tag: merc!.rescued ? 'Rescatado' : 'Contrato de Grizk' } : { name: getWanderer(rival.who).name, sprite: getWanderer(rival.who).sprite, tag: getWanderer(rival.who).title };
  const first = (n: string) => n.split(' ')[0];
  const newFirst = first(target.name), curFirst = first(cur.name);
  const red = target.kind === 'rival' && (target.risk === 'high' || target.risk === 'hostile');
  const partLine = curMerc
    ? (merc!.rescued ? `${curFirst} sigue su propio camino y no llegará al Bastión.` : `${curFirst} vuelve al Bastión sano. Esta bajada del contrato se pierde, sin enfadar a Grizk.`)
    : `${curFirst} se lleva ya su parte del oro encontrado y se va sin rencor.`;
  const betrayLine = curMerc
    ? `Combate a muerte contra ${curFirst}${target.kind === 'rival' ? `, con ${newFirst} a tu lado` : ''}. Grizk lo sabrá: ${merc!.rescued ? GRIZK_REP.betrayRescued : GRIZK_REP.betrayContract} de reputación.${target.kind === 'rival' ? ` ${newFirst} se fiará menos de ti.` : ''}`
    : `Combate contra ${curFirst} (empieza aturdido) con ${newFirst} a tu lado. Si ganas, te quedas con lo que lleva.${rival.who === 'kael' ? ' La confianza de Kael baja.' : ''}`;
  const opts = [
    { id: 'keep', icon: '⛨', cls: 'btn', label: target.kind === 'captive' ? 'Dejarlo encadenado' : `Quedarte con ${curFirst}`, line: target.kind === 'captive' ? 'Sigue aquí. Si el hueco queda libre, puedes volver a por él.' : `${newFirst} se queda donde estaba. Si ${curFirst} cae, puedes volver a buscarlo.`, run: () => actions.allyKeep() },
    { id: 'part', icon: '⇋', cls: 'btn btn-gold', label: target.kind === 'captive' ? `Despedir a ${curFirst} y liberar a ${newFirst}` : `Despedir a ${curFirst} y aliarte con ${newFirst}`, line: partLine, run: () => actions.allyPart() },
    { id: 'betray', icon: '✕', cls: 'btn btn-danger', label: `Traicionar a ${curFirst}`, line: betrayLine, run: () => actions.allyBetray() },
    ...(target.kind === 'captive' ? [{ id: 'release', icon: '⛓', cls: 'btn', label: 'Romper sus cadenas y dejarle marchar', line: `No se une a ti y huye por su cuenta. Se lo contará a Grizk: +${GRIZK_REP.releaseCaptive} de reputación.`, run: () => actions.releaseCaptive(target.mercId) }] : []),
  ];
  return (
    <div data-testid="ally-choice">
      {red && <div className="panel border-blood text-blood px-3 py-2 mt-3 text-sm font-body">☠ Riesgo muy alto: es muy probable que {newFirst} te traicione.</div>}
      <div className="flex items-center gap-2 mt-3 panel px-3 py-1.5 flex-wrap" data-testid="ally-current">
        <span className="text-xs tracking-[0.2em] uppercase text-stone-400">Ya te acompaña</span>
        <MonsterSprite sprite={cur.sprite} scale={2} />
        <b className="text-heal">{cur.name}</b>
        <span className="text-stone-400 text-sm">· {cur.tag}</span>
        {!curMerc && <RiskBadge risk={rival.risk} size={16} />}
        <span className="text-stone-500 text-xs ml-auto">Solo cabe un aliado</span>
      </div>
      <div className="grid gap-2 mt-3 sm:grid-cols-3">
        {opts.map((o) => (
          <button key={o.id} className={`${o.cls} text-left px-3 py-2 flex flex-col gap-1`} style={{ minHeight: 44 }} onClick={o.run} data-testid={`ally-${o.id}`}>
            <span className="font-display text-sm flex items-center gap-2"><span aria-hidden className="text-lg">{o.icon}</span>{o.label}</span>
            <span className="font-body text-xs leading-snug opacity-80">{o.line}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
