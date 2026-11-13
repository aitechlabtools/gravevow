import { Tienda } from './screens/Atuendos';
import { className } from '../../core/gender';
import { BestiaryTab } from './BestiaryTab';
import { useEffect, useState, type ReactNode } from 'react';
import { actions, dev, useGame } from '../state/store';
import { pendingBadges } from '../../core/tutorials';
import { canCraftSomething } from '../../core/crafting';
import { readyQuestCount } from '../../core/quests';
import { readyStations } from '../../core/refuge';
import { xpForNextLevel } from '../../core/stats';
import { PlayerSprite, HeroSprite, GoldAmount } from './common';
import { SettingsModal } from './TitleScreen';
import { sfx } from '../audio';
import { FullscreenButton } from './FullscreenButton';
import { useIsTouch } from '../../shared/device';
import { Jugar } from './screens/Jugar';
import { Alijo } from './screens/Alijo';
import { Personaje } from './screens/Personaje';
import { Mercaderes } from './screens/Mercaderes';
import { Misiones } from './screens/Misiones';
import type { VendorTarget } from './VendorsTab';
import { PillBar, type PillTab } from './kit';
import { useLayout } from '../../config/ui';
import { ClassUnlockNotice } from './ClassSkills';

export type LobbyTab = 'play' | 'character' | 'stash' | 'merchants' | 'quests' | 'bestiary' | 'shop';

export function Lobby() {
  const profile = useGame((s) => s.profile)!;
  const [tab, setTab] = useState<LobbyTab>('play');
  const [settings, setSettings] = useState<false | 'menu' | 'guide'>(false);
  const backupRemind = useGame((s) => !!s.backup?.remind);
  const touch = useIsTouch();
  // Esc abre Ajustes si no hay otra ventana abierta (el propio panel se cierra con Esc)
  useEffect(() => {
    if (settings) return;
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || (e.target as HTMLElement)?.tagName === 'INPUT' || document.querySelector('[data-modal]')) return;
      e.preventDefault(); setSettings('menu');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [settings]);
  const [switcher, setSwitcher] = useState(false);
  /** Acceso directo a un mercader concreto (p. ej., «Contrato» en Jugar abre los contratos de Grizk). */
  const [vendorTarget, setVendorTarget] = useState<VendorTarget | null>(null);
  const layout = useLayout();
  const ch = profile.character;
  const questsReady = readyQuestCount(profile);
  const stationsReady = readyStations(profile).length;
  const tutBadges = pendingBadges(useGame((s) => s.tutorials));
  const tabs: PillTab<LobbyTab>[] = ([
    { id: 'play', label: 'Jugar' }, { id: 'character', label: 'Personaje' }, { id: 'stash', label: 'Intendencia' }, { id: 'merchants', label: 'Bastión', badge: stationsReady },
    { id: 'quests', label: 'Misiones', badge: questsReady }, { id: 'bestiary', label: 'Bestiario' }, { id: 'shop', label: 'Tienda' },
  ] as PillTab<LobbyTab>[]).map((t) => ({ ...t, dot: !dev.skipMinis && tutBadges.has(`tab-${t.id}`) }));
  // Cada pestaña lanza su disparador de mini tutorial («tab:<id>»): solo sale la primera vez
  const go = (t: LobbyTab) => { setTab(t); sfx('click'); actions.tutorialEvent(`tab:${t}`); };
  // Bienvenida del intendente (data/tutorials.ts, «bienvenida»): una vez por personaje, al volver de la primera bajada
  const welcome = profile.tutorialDone && !profile.tutorialSeen.lobby;
  useEffect(() => { if (welcome) actions.tutorialEvent('lobby:welcome'); }, [welcome]);
  // Mini tutoriales por hechos, cuando ya se ha visto la bienvenida: volver tras caer y volver con algo que fabricar
  const settled = profile.tutorialSeen.lobby;
  useEffect(() => { if (settled && profile.fallen) actions.tutorialEvent('bastion:fallen'); }, [settled, profile.fallen]);
  useEffect(() => { if (settled && canCraftSomething(profile)) actions.tutorialEvent('bastion:can-craft'); }, [settled]); // eslint-disable-line react-hooks/exhaustive-deps
  const xpPct = Math.round((ch.xp / xpForNextLevel(ch.level)) * 100);

  return (
    <div className="h-full flex flex-col relative" style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a1520 0%, #0d0b11 55%, #07060a 100%)' }}>
      {/* Barra superior: quién eres, pestañas en píldora, oro, pantalla completa y ajustes */}
      <header className="ui-nav" data-testid="lobby-nav">
        <div className="flex items-center min-w-0">
        {/* Retrato, nombre y experiencia. Tocarlo abre el cambio de personaje. En el móvil, más compacto */}
        <button className={`flex items-center shrink-0 text-left ${layout === 'phone' ? 'gap-1.5' : 'gap-2'}`} style={{ minHeight: 44 }} data-testid="nav-chip"
          onClick={() => { sfx('click'); setSwitcher(!switcher); }} aria-label="Cambiar de personaje" aria-expanded={switcher}>
          <div className={`${layout === 'phone' ? 'w-8 h-8' : 'w-10 h-10'} flex items-end justify-center overflow-hidden bg-[#0d0c11] border-2 ${switcher ? 'border-gold' : 'border-stone-700'}`}><PlayerSprite scale={layout === 'phone' ? 1 : 2} animate={false} /></div>
          <div className={`min-w-0 ${layout === 'phone' ? 'w-[74px]' : 'w-28'} leading-tight`}>
            <div className={`font-display truncate ${layout === 'phone' ? 'text-xs' : 'text-sm'}`}><span data-testid="hero-name">{ch.name}</span> <span className="text-gold">▾</span></div>
            <div className="text-[11px] text-stone-300 truncate">{layout === 'phone' ? 'Nv' : `${className(ch.classId, ch.appearance.sex)} · Nv`} <span data-testid="hero-level">{ch.level}</span></div>
            <div className="h-1 bg-stone-800 mt-1"><div className="h-full bg-arcane" style={{ width: `${xpPct}%` }} /></div>
          </div>
        </button>
        </div>
        <PillBar tabs={tabs} active={tab} onChange={go} />
        <div className={`flex items-center justify-end min-w-0 ${layout === 'phone' ? 'gap-1.5' : 'gap-2.5'}`}>
        <GoldAmount value={profile.gold} className={layout === 'phone' ? 'text-sm' : 'text-lg'} />
        <FullscreenButton className="icon-btn" />
        <button className="btn icon-btn" onClick={() => { sfx('click'); setSettings('guide'); }} style={{ minWidth: 44, minHeight: 44 }}
          aria-label="Guía" title={touch ? undefined : 'Guía'} data-testid="btn-lobby-guide"><span className="font-display text-lg leading-none" aria-hidden>?</span></button>
        <button className="btn icon-btn relative" onClick={() => { sfx('click'); setSettings('menu'); }} style={{ minWidth: 44, minHeight: 44 }}
          aria-label={backupRemind ? 'Ajustes (copia de seguridad recomendada)' : 'Ajustes'} title={touch ? undefined : 'Ajustes (Esc)'} data-testid="btn-lobby-settings">
          <GearIcon />{backupRemind && <span className="gear-dot" data-testid="gear-dot" />}
        </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 relative">
        <div key={tab} className="fade-in h-full">
          {tab === 'play' && <Jugar onNavigate={(t) => { if (t === 'contracts') setVendorTarget({ vendor: 'grizk', view: 'contracts' }); go(t === 'contracts' ? 'merchants' : t); }} />}
          {tab === 'character' && <Personaje onStash={() => go('stash')} />}
          {tab === 'stash' && <Alijo onDetails={() => go('character')} onShop={() => go('shop')} />}
          {tab === 'merchants' && <Mercaderes target={vendorTarget} onConsumed={() => setVendorTarget(null)} />}
          {tab === 'quests' && <Misiones />}
          {tab === 'shop' && <Tienda />}
          {tab === 'bestiary' && <Legacy><div className="max-w-5xl mx-auto"><BestiaryTab /></div></Legacy>}
        </div>
      </main>
      {switcher && <CharacterSwitcher onClose={() => setSwitcher(false)} />}
      {settings && <SettingsModal onClose={() => setSettings(false)} onExit={() => actions.goto('title')} initialTab={settings === 'guide' ? 'game' : undefined} />}
      {profile.tutorialSeen.lobby && <ClassUnlockNotice />}
    </div>
  );
}

/** Contenedor con desplazamiento para las pantallas que aún no tienen su diseño propio. */
function Legacy({ children }: { children: ReactNode }) {
  return <div className="h-full overflow-y-auto scroll-thin" style={{ padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))' }}>{children}</div>;
}

/** Desplegable de la barra superior: cambiar de personaje sin volver al menú principal. */
function CharacterSwitcher({ onClose }: { onClose: () => void }) {
  const roster = useGame((s) => s.roster);
  const activeId = useGame((s) => s.activeId);
  return (
    <>
      <div className="absolute inset-0 z-30" onClick={onClose} />
      <div className="absolute z-40 panel panel-gold p-2 flex flex-col gap-1 fade-in" data-testid="char-switcher"
        style={{ left: 'max(var(--pad), env(safe-area-inset-left))', top: 'calc(var(--nav-h) - 4px)', width: 280, maxHeight: 'calc(100% - var(--nav-h))', overflowY: 'auto' }}>
        <div className="text-[11px] font-display uppercase tracking-wider text-stone-400 px-1">Cambiar de personaje</div>
        {roster.map((r) => (
          <button key={r.id} className={`flex items-center gap-2 px-2 text-left ${r.id === activeId ? 'bg-[#2a2216]' : 'hover:bg-[#1c1920]'}`} style={{ minHeight: 48 }}
            onClick={() => { onClose(); if (r.id !== activeId) { sfx('click'); void actions.selectCharacter(r.id); } }} data-testid={`switch-char-${r.slot}`}>
            <div className="w-9 h-9 flex items-end justify-center overflow-hidden bg-[#0d0c11] border border-stone-700"><HeroSprite classId={r.classId} appearance={r.appearance} equipment={r.equipment} skin={r.skin} scale={1} animate={false} /></div>
            <div className="flex-1 min-w-0 leading-tight"><div className="font-display text-sm truncate">{r.name}</div><div className="text-[11px] text-stone-300">{className(r.classId, r.appearance.sex)} · Nv {r.level}</div></div>
            {r.id === activeId ? <span className="text-[11px] text-gold">ahora</span> : <span className="text-stone-400">›</span>}
          </button>
        ))}
        <button className="btn text-sm mt-1" style={{ minHeight: 44 }} onClick={() => { onClose(); void actions.openSelect(); }} data-testid="btn-all-chars">
          {roster.length < 4 ? 'Ver todos · Nuevo personaje' : 'Ver todos los personajes'}
        </button>
      </div>
    </>
  );
}

function GearIcon() {
  // Rueda dentada pixel art 16×16 a ×2 (provisional hasta el icono definitivo: docs/ASSETS.md)
  return (
    <svg viewBox="0 0 16 16" width="24" height="24" shapeRendering="crispEdges" aria-hidden className="shrink-0">
      <path fill="#07060a" d="M6 0h4v3H6zM6 13h4v3H6zM0 6h3v4H0zM13 6h3v4h-3zM2 2h3v3H2zM11 2h3v3h-3zM2 11h3v3H2zM11 11h3v3h-3zM3 4h10v8H3zM4 3h8v10H4z" />
      <path fill="#d9d3c1" d="M7 1h2v2H7zM7 13h2v2H7zM1 7h2v2H1zM13 7h2v2h-2zM3 3h2v2H3zM11 3h2v2h-2zM3 11h2v2H3zM11 11h2v2h-2zM5 4h6v1H5zM4 5h8v6H4zM5 11h6v1H5z" />
      <path fill="#8c8693" d="M4 10h8v1H4zM5 11h6v1H5z" />
      <path fill="#131118" d="M6 6h4v4H6z" />
      <path fill="#e8b33a" d="M7 7h2v2H7z" />
    </svg>
  );
}
