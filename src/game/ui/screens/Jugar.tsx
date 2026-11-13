// Pantalla «Jugar» (opción D): héroe grande en el centro bajo un haz de luz, tarjeta de zona arriba a la izquierda,
// panel de expedición con «Descender» abajo a la izquierda y nivel + accesos rápidos abajo a la derecha.
import { g } from '../../../core/gender';
import { useEffect, useState } from 'react';
import { actions, useGame } from '../../state/store';
import { ZONES, ZONE_ORDER, defaultSubzone, subzoneLock, zoneLock, type ZoneId } from '../../../core/data/zones';
import { SUBZONE_ORDER, getSubzone, isSubzoneId, subzonesOf, type SubzoneDef, type SubzoneId } from '../../../core/data/subzones';
import { overlevelPenalty } from '../../../config/subzones';
import { Segmented } from '../kit';
import { getEnemy } from '../../../core/data/enemies';
import { countItem, equippedValue, gridValue } from '../../../core/inventory';
import { EXPEDITION_DURATION_MS } from '../../../core/expedition';
import { xpForNextLevel } from '../../../core/stats';
import { getMerc } from '../../../core/data/mercenaries';
import { pinnedQuests, questDef, questProgress, readyQuestCount } from '../../../core/quests';
import { PlayerSprite, MonsterSprite, Modal } from '../common';
import { zoneBackdrop, zoneFor } from '../combatZones';
import { iconUrl } from '../../../shared/art';
import { usePixelScale } from '../kit';
import { useLayout } from '../../../config/ui';
import { DISCORD_HINT, DISCORD_URL, DiscordIcon, EXTERNAL, HeartIcon, SUPPORT_HINT, SUPPORT_URL } from '../../../shared/community';
import { sfx } from '../../audio';
import { startMusic } from '../../music/director';
import { CureButton, useCure } from '../CureOffer';
import { useLongPress } from '../combatActions';

/** La subzona elegida se recuerda mientras dure la sesión (al cambiar de pestaña y volver). */
let lastPick: SubzoneId | null = null;

export type QuickTarget = 'quests' | 'merchants' | 'bestiary' | 'contracts';

export function Jugar({ onNavigate }: { onNavigate: (t: QuickTarget) => void }) {
  const profile = useGame((s) => s.profile)!;
  const cure = useCure();
  const ch = profile.character;
  const layout = useLayout();
  const phone = layout === 'phone';
  const merc0 = profile.contract ? getMerc(profile.contract.mercId) : null;
  const heroScale = useHeroScale(usePixelScale('hero'), !!merc0, phone);
  const firstTime = profile.stats.expeditions === 0;
  // Subzona propuesta: la elegida en esta sesión, si no la última a la que bajaste, si no la que toca por nivel
  const initial = (): SubzoneId => {
    const open = SUBZONE_ORDER.filter((id) => !subzoneLock(getSubzone(id), ch.level, profile.bossesDefeated));
    const fallback = open[open.length - 1] ?? defaultSubzone('mazmorra', ch.level, profile.bossesDefeated).id;
    if (firstTime) return 'afueras';
    for (const c of [lastPick, profile.lastSubzone]) if (isSubzoneId(c) && !subzoneLock(getSubzone(c), ch.level, profile.bossesDefeated)) return c;
    return fallback;
  };
  const [subId, setSubIdRaw] = useState<SubzoneId>(initial);
  const setSubId = (z: SubzoneId) => { lastPick = z; setSubIdRaw(z); };
  const [map, setMap] = useState(false);
  const sub = getSubzone(subId);
  const zone = ZONES[sub.zone];
  const lock = firstTime ? null : subzoneLock(sub, ch.level, profile.bossesDefeated);
  const easy = !firstTime && overlevelPenalty(sub.levels[1], ch.level);
  const potions = countItem(profile.backpack, 'health_potion');
  const risk = gridValue(profile.backpack) + equippedValue(profile.equipment);
  const merc = profile.contract ? getMerc(profile.contract.mercId) : null;
  const questsReady = readyQuestCount(profile);
  const pins = pinnedQuests(profile);
  const xpPct = Math.round((ch.xp / xpForNextLevel(ch.level)) * 100);
  // El mercenario, un poco más pequeño y detrás: el protagonista eres tú (escala entera)
  const mercScale = Math.max(2, heroScale - Math.max(1, Math.round(heroScale / 4)));

  const descend = () => {
    if (lock) return;
    sfx('portal');
    if (profile.settings.music) startMusic('dungeon');
    void actions.enterDungeon(firstTime ? 'mazmorra' : subId);
  };

  const edge = { left: 'max(var(--pad), env(safe-area-inset-left))', right: 'max(var(--pad), env(safe-area-inset-right))', bottom: 'max(var(--pad), env(safe-area-inset-bottom))' };

  return (
    <div className="relative h-full overflow-hidden" data-testid="screen-play">
      {/* Haz de luz y héroe en el centro; si hay un mercenario contratado, aparece a su lado */}
      <div className="beam" />
      <div className="absolute left-1/2 -translate-x-1/2 flex items-end" style={{ bottom: phone ? '8%' : '9%', gap: merc ? heroScale * 2 : 0 }} data-testid="play-heroes">
        <Figure label={<><span className="text-gold mr-2">Nv {ch.level}</span>{ch.name}</>} scale={heroScale} phone={phone}>
          <PlayerSprite scale={heroScale} />
        </Figure>
        {merc && (
          <Figure label={<span className="text-heal">{merc.name}</span>} scale={mercScale} phone={phone} testId="play-merc">
            <MonsterSprite sprite={merc.sprite} scale={mercScale} className="-scale-x-100" />
          </Figure>
        )}
      </div>

      {/* Abajo a la izquierda: la zona (con el mapa) y, debajo, la expedición con «Descender» */}
      <div className="absolute flex flex-col" style={{ left: edge.left, bottom: edge.bottom, width: phone ? 250 : 324, gap: 'var(--gap)' }}>
      {/* Tarjeta de zona */}
      <HoldTip testId="zone-tip" tip={<><b className="text-parchment">{sub.name}</b> · {zone.name}<br />Niveles {sub.levels[0]}–{sub.levels[1]} · mapa nuevo cada vez.{sub.tagline ? <><br /><i>{sub.tagline}</i></> : null}</>}>
      {(consume) => (
      <section className="panel panel-gold overflow-hidden" data-testid="zone-card" onClickCapture={(e) => { if (consume()) { e.stopPropagation(); e.preventDefault(); } }}>
        <button className="block w-full text-left relative" onClick={() => !firstTime && setMap(true)} aria-label={`Destino: ${sub.name}, ${zone.name}. Abrir el mapa de zonas`} disabled={firstTime}>
          <ZoneArt sub={sub} height={phone ? 44 : 96} />
          {!phone && <span className="absolute top-2 left-2 ui-tag bg-black/70" data-testid="zone-zone">{zone.name} · {sub.index}/10</span>}
        </button>
        <div className={`flex items-center gap-3 ${phone ? 'px-3 py-1.5' : 'p-3'}`}>
          <div className="flex-1 min-w-0">
            <div className={`font-display text-parchment leading-tight ${phone ? 'text-base' : 'text-xl'}`} data-testid="zone-name">{sub.name}</div>
          </div>
          {!firstTime && <button className="btn text-xs shrink-0" onClick={() => { setMap(true); sfx('click'); }} data-testid="btn-zone-map">Mapa de zonas</button>}
        </div>
      </section>
      )}
      </HoldTip>

      {/* Expedición y Descender */}
      <HoldTip testId="expedition-tip" tip={<>
        <span data-testid="expedition-summary">{potions} {potions === 1 ? 'poción' : 'pociones'} · {risk} de oro en riesgo{merc ? ` · ${merc.name} te acompaña` : ''}</span><br />
        {EXPEDITION_DURATION_MS / 60000} minutos para encontrar el portal. Si caes, pierdes lo que llevas.
      </>}>
      {(consume) => (
      <section className="panel panel-gold" data-testid="expedition-panel" onClickCapture={(e) => { if (consume()) { e.stopPropagation(); e.preventDefault(); } }}>
        <div className={phone ? 'p-2.5' : 'p-4'}>
          <h2 className="panel-title text-sm">Expedición</h2>
          <div className="font-body text-parchment leading-tight mt-1">{phone ? sub.name : zone.name} · Nv {sub.levels[0]}–{sub.levels[1]}</div>
          {easy && <div className="text-xs text-ember mt-1" data-testid="zone-easy-note">Demasiado fácil para ti: {Math.round(easy.xp * 100)} % de experiencia y {Math.round(easy.gold * 100)} % de oro.</div>}
          {lock && <div className="text-xs text-blood mt-1" data-testid="zone-lock">{lock}</div>}
          {!profile.equipment.mainHand && <div className="text-xs text-ember mt-1">Vas sin arma. Revisa tu equipo en la Intendencia.</div>}
          {cure && (
            <div className="flex items-center gap-2 mt-2" data-testid="jugar-cure">
              <span className="text-xs text-blood flex-1">{cure.fallen ? 'Caíste en la última incursión.' : g('Vas herid{o|a}.')} {g('Vesper puede dejarte enter{o|a}.')}</span>
              <CureButton className="shrink-0 text-sm" />
            </div>
          )}
          <button className="btn btn-gold cta w-full mt-2" onClick={descend} disabled={!!lock} data-testid="btn-enter-dungeon">Descender</button>
        </div>
      </section>
      )}
      </HoldTip>
      </div>

      {/* Nivel y accesos rápidos */}
      <div className="absolute flex flex-col items-end gap-3" style={{ right: edge.right, bottom: edge.bottom }}>
        {/* Comunidad: enlaces externos en otra pestaña (la partida sigue aquí) */}
        <div className="flex flex-col items-center gap-2" data-testid="jugar-community">
          <QuickLink label="Apoyar" href={SUPPORT_URL} hint={SUPPORT_HINT} icon={<HeartIcon size={22} />} testId="quick-kofi" />
          <QuickLink label="Discord" href={DISCORD_URL} hint={DISCORD_HINT} icon={<DiscordIcon size={24} />} testId="quick-discord" />
        </div>
        <div className="flex flex-col items-center gap-1" title={`Nivel ${ch.level} · experiencia ${xpPct} %`} aria-label={`Nivel ${ch.level}, experiencia ${xpPct} %`} data-testid="level-ring">
          <div className="lvl-ring" style={{ ['--p' as string]: xpPct }}><span>{ch.level}</span></div>
        </div>
        {pins.length > 0 && (
          <button className="panel p-2 text-left border-gold max-w-[260px]" onClick={() => onNavigate('quests')} data-testid="jugar-pinned">
            {pins.map((p) => { const q = questDef(p.id); const n = questProgress(p, profile); return <div key={p.id} className="text-sm flex justify-between gap-3"><span className="truncate text-gold">★ {q.name}</span><span className={n >= q.count ? 'text-heal' : 'text-stone-300'}>{n}/{q.count}</span></div>; })}
          </button>
        )}
        <div className="flex gap-2">
          <Quick label="Misiones" icon="chalice" badge={questsReady} onClick={() => onNavigate('quests')} testId="quick-quests" />
          <Quick label="Reputación" icon="coin" onClick={() => onNavigate('merchants')} testId="quick-rep" />
          <Quick label="Bestiario" icon="tome" onClick={() => onNavigate('bestiary')} testId="quick-bestiary" />
          <Quick label="Contrato" icon="sword" onClick={() => onNavigate('contracts')} testId="quick-contract" />
        </div>
      </div>

      {map && <ZoneMap current={subId} onPick={(z) => { setSubId(z); setMap(false); sfx('click'); }} onClose={() => setMap(false)} />}
    </div>
  );
}

/**
 * Ficha de un bloque del lobby: aparece encima al pasar el ratón (escritorio) o al mantener pulsado (táctil), y se
 * cierra al salir o al soltar. Guarda la información que antes iba en líneas de texto fijas.
 */
function HoldTip({ tip, testId, children }: { tip: React.ReactNode; testId: string; children: (consume: () => boolean) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const lp = useLongPress(() => setOpen(true), () => window.setTimeout(() => setOpen(false), 1600));
  return (
    <div className="relative" {...lp.handlers}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setOpen(true); }} onPointerLeave={(e) => { if (e.pointerType === 'mouse') setOpen(false); }}>
      {children(lp.consume)}
      <div role="tooltip" className={`absolute left-0 right-0 bottom-full mb-2 panel p-2 z-20 text-[13px] leading-snug text-stone-300 pointer-events-none ${open ? '' : 'hidden'}`} data-testid={testId}>{tip}</div>
    </div>
  );
}

/**
 * Escala del héroe según el alto de la pantalla: lo más grande posible (≈80 % del alto libre; 68 % en móvil),
 * siempre entera y nunca menor que la de config/ui.ts. El sprite mide 40 px de alto.
 */
function useHeroScale(min: number, withMerc: boolean, phone: boolean): number {
  const calc = () => {
    if (typeof window === 'undefined') return min;
    // Alto útil bajo la barra superior. El héroe (26 px de alto en su escala 1) llena el foco de luz: de los pies (a un 8–9 %
    // del suelo) hasta cerca del techo, dejando sitio para su nombre.
    const main = window.innerHeight - (phone ? 56 : 70);
    const label = phone ? 18 : 30;
    let s = Math.max(min, Math.floor((main * (phone ? 0.8 : 0.78) - label) / 26));
    // A lo ancho, el grupo tiene que caber entre los paneles de la izquierda y los botones de la derecha
    // (el pedestal puede asomar por debajo de ellos; cuenta el cuerpo, 20 px, más un margen).
    const room = window.innerWidth - 2 * (phone ? 270 : 350);
    const mercOf = (k: number) => Math.max(2, k - Math.max(1, Math.round(k / 4)));
    const widthAt = (k: number) => (withMerc ? 22 * k + 2 * k + 22 * mercOf(k) : 22 * k);
    while (s > min && widthAt(s) > room) s--;
    return s;
  };
  const [s, setS] = useState(calc);
  useEffect(() => {
    const upd = () => setS(calc());
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, [min, withMerc, phone]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setS(calc()), [withMerc, phone]); // eslint-disable-line react-hooks/exhaustive-deps
  return s;
}

function Figure({ label, scale, phone, children, testId }: { label: React.ReactNode; scale: number; phone: boolean; children: React.ReactNode; testId?: string }) {
  return (
    <div className="flex flex-col items-center" data-testid={testId}>
      <div className="font-display text-parchment mb-1 whitespace-nowrap" style={{ fontSize: phone ? 13 : 18 }}>{label}</div>
      <div className="relative flex justify-center">
        <div className="pedestal" style={{ width: 24 * scale, height: 6 * scale, bottom: -3 * scale }} />
        <div className="relative breathe">{children}</div>
      </div>
    </div>
  );
}

function ZoneArt({ sub, height }: { sub: SubzoneDef; height: number }) {
  // Ilustración provisional: el fondo de combate de la subzona (320×180), recortado. La definitiva (240×120) la dibujará el usuario.
  const src = zoneBackdrop(zoneFor(sub.backdrops, '', 0, true));
  return <div className="w-full overflow-hidden bg-black flex justify-center" style={{ height }}><img src={src} alt="" className="pixelated w-[320px] h-[180px] max-w-none" style={{ marginTop: -(180 - height) / 2 }} draggable={false} /></div>;
}

function QuickLink({ label, href, hint, icon, testId }: { label: string; href: string; hint: string; icon: React.ReactNode; testId: string }) {
  return (
    <a className="btn quick" href={href} {...EXTERNAL} title={hint} aria-label={`${hint} (se abre en una pestaña nueva)`} data-testid={testId}
      onClick={() => sfx('click')}>
      {icon}
      <span className="leading-none">{label}</span>
    </a>
  );
}

function Quick({ label, icon, badge, onClick, testId }: { label: string; icon: string; badge?: number; onClick: () => void; testId: string }) {
  return (
    <button className="btn quick" onClick={onClick} aria-label={badge ? `${label} (${badge} listas)` : label} data-testid={testId}>
      <img src={iconUrl(icon, 2)} width={24} height={24} className="pixelated" alt="" />
      <span className="leading-none">{label}</span>
      {!!badge && <span className="nb">{badge}</span>}
    </button>
  );
}

/**
 * Mapa de zonas: las tres zonas en columnas y, dentro de cada una, sus subzonas de 10 niveles.
 * En móvil no caben las tres columnas: una pestaña por zona.
 */
function ZoneMap({ current, onPick, onClose }: { current: SubzoneId; onPick: (z: SubzoneId) => void; onClose: () => void }) {
  const profile = useGame((s) => s.profile)!;
  const phone = useLayout() === 'phone';
  const [tab, setTab] = useState<ZoneId>(getSubzone(current).zone);
  const column = (id: ZoneId) => {
    const z = ZONES[id];
    const zl = zoneLock(z, profile.character.level, profile.bossesDefeated);
    return (
      <section key={id} className="flex flex-col gap-1.5 min-w-0" data-testid={`zone-${id}`}>
        {!phone && (
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <span className="font-display text-lg text-parchment">{z.name}</span>
            <span className="text-[11px] text-gold">Nv {z.levels[0]}–{z.levels[1]}</span>
          </div>
        )}
        {subzonesOf(id).map((s) => <SubzoneRow key={s.id} sub={s} on={s.id === current} onPick={onPick} />)}
        <div className="text-[11px] text-stone-400 leading-snug px-0.5">
          Jefe de la zona: {getEnemy(z.boss).name}{profile.bossesDefeated.includes(z.boss) ? ' ✓' : ''}
          {zl && <span className="block text-blood">{zl}</span>}
        </div>
      </section>
    );
  };
  return (
    <Modal onClose={onClose} wide testId="zone-map">
      <h2 className="panel-title text-xl mb-2">Mapa de zonas</h2>
      {phone && <div className="mb-2"><Segmented options={ZONE_ORDER.map((id) => ({ id, label: ZONES[id].name.replace(/^(La|El) /, '') }))} value={tab} onChange={(v) => { setTab(v); sfx('click'); }} testId="zone-tabs" /></div>}
      <div className={phone ? '' : 'grid grid-cols-3 gap-3'} data-testid="zone-picker">
        {phone ? column(tab) : ZONE_ORDER.map(column)}
      </div>
      <button className="btn mt-3" onClick={onClose} data-testid="btn-zone-map-close">Cerrar</button>
    </Modal>
  );
}

/** Fila de una subzona: nombre, niveles y estado (cerrada, demasiado fácil o elegida). Mide 44 px o más. */
function SubzoneRow({ sub, on, onPick }: { sub: SubzoneDef; on: boolean; onPick: (z: SubzoneId) => void }) {
  const profile = useGame((s) => s.profile)!;
  const l = subzoneLock(sub, profile.character.level, profile.bossesDefeated);
  const easy = overlevelPenalty(sub.levels[1], profile.character.level);
  return (
    <button onClick={() => !l && onPick(sub.id)} disabled={!!l} aria-pressed={on} title={l ?? sub.tagline} data-testid={`sub-${sub.id}`}
      className={`panel subzone-row text-left ${on ? 'border-gold pulse-gold' : 'hover:brightness-125'} ${l ? 'opacity-55 cursor-not-allowed' : ''}`}>
      <span className="subzone-num font-display">{sub.index}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-display text-parchment leading-tight truncate">{sub.name}</span>
        <span className="block text-[11px] leading-tight text-stone-300">
          Nv {sub.levels[0]}–{sub.levels[1]}
          {l ? <span className="text-blood"> · {l.replace(/^Necesitas /, 'necesitas ').replace(/\.$/, '')}</span> : easy ? <span className="text-ember"> · demasiado fácil</span> : null}
        </span>
      </span>
      {l ? <span aria-label="Cerrada" className="text-blood shrink-0">🔒</span> : on ? <span className="text-gold shrink-0" aria-hidden>◆</span> : null}
    </button>
  );
}
