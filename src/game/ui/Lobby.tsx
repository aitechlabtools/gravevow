import { Tienda } from './screens/Atuendos';
import { BestiaryTab } from './BestiaryTab';
import { useState, type ReactNode } from 'react';
import { actions, useGame } from '../state/store';
import { CLASSES } from '../../core/data/classes';
import { readyQuestCount } from '../../core/quests';
import { xpForNextLevel } from '../../core/stats';
import { PlayerSprite, HeroSprite, GoldAmount, Modal } from './common';
import { SettingsModal } from './TitleScreen';
import { sfx } from '../audio';
import { FullscreenButton } from './FullscreenButton';
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
  const [settings, setSettings] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  /** Acceso directo a un mercader concreto (p. ej., «Contrato» en Jugar abre los contratos de Grizk). */
  const [vendorTarget, setVendorTarget] = useState<VendorTarget | null>(null);
  const layout = useLayout();
  const ch = profile.character;
  const cls = CLASSES[ch.classId];
  const questsReady = readyQuestCount(profile);
  const tabs: PillTab<LobbyTab>[] = [
    { id: 'play', label: 'Jugar' }, { id: 'character', label: 'Personaje' }, { id: 'stash', label: 'Intendencia' }, { id: 'merchants', label: 'Bastión' },
    { id: 'quests', label: 'Misiones', badge: questsReady }, { id: 'bestiary', label: 'Bestiario' }, { id: 'shop', label: 'Tienda' },
  ];
  const go = (t: LobbyTab) => { setTab(t); sfx('click'); };
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
            <div className="text-[11px] text-stone-300 truncate">{layout === 'phone' ? 'Nv' : `${cls.name} · Nv`} <span data-testid="hero-level">{ch.level}</span></div>
            <div className="h-1 bg-stone-800 mt-1"><div className="h-full bg-arcane" style={{ width: `${xpPct}%` }} /></div>
          </div>
        </button>
        </div>
        <PillBar tabs={tabs} active={tab} onChange={go} />
        <div className={`flex items-center justify-end min-w-0 ${layout === 'phone' ? 'gap-1.5' : 'gap-2.5'}`}>
        <GoldAmount value={profile.gold} className={layout === 'phone' ? 'text-sm' : 'text-lg'} />
        <FullscreenButton className="icon-btn" />
        <button className="btn icon-btn" onClick={() => setSettings(true)} aria-label="Ajustes" title="Ajustes" data-testid="btn-lobby-settings"><GearIcon /></button>
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
      {settings && <SettingsModal onClose={() => setSettings(false)} onExit={() => actions.goto('title')} />}
      {!profile.tutorialSeen.lobby ? <LobbyTutorial /> : <ClassUnlockNotice />}
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
            <div className="flex-1 min-w-0 leading-tight"><div className="font-display text-sm truncate">{r.name}</div><div className="text-[11px] text-stone-300">{CLASSES[r.classId].name} · Nv {r.level}</div></div>
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
  // Rueda dentada provisional (12×12)
  return (
    <svg viewBox="0 0 12 12" width="20" height="20" fill="currentColor" shapeRendering="crispEdges" aria-hidden className="shrink-0">
      <path d="M5 0h2v2H5zM5 10h2v2H5zM0 5h2v2H0zM10 5h2v2h-2zM2 2h2v2H2zM8 2h2v2H8zM2 8h2v2H2zM8 8h2v2H8zM3 3h6v6H3z" />
      <rect x="5" y="5" width="2" height="2" fill="#131118" />
    </svg>
  );
}

function LobbyTutorial() {
  return (
    <Modal onClose={() => actions.markTutorial('lobby')} testId="tutorial">
      <h2 className="panel-title text-xl mb-3">Bienvenido al Bastión de Ceniza</h2>
      <ol className="font-body text-lg space-y-2 list-decimal pl-5">
        <li><b>Intendencia:</b> tu equipo, tu mochila y el almacén; en «Estado», tus heridas, el hambre, la sed y el cansancio. Arrastra los objetos, o tócalos y luego toca la casilla donde los quieres.</li>
        <li><b>Almacén:</b> lo que guardes ahí está a salvo. Lo que lleves a la mazmorra, no.</li>
        <li><b>Bastión:</b> los mercaderes, cada uno en su lugar: compra, vende, acepta encargos y duerme en el catre. Llegan más a medida que bajas.</li>
        <li><b>Jugar:</b> elige zona y pulsa <b>Descender</b>. Saquea, sobrevive y encuentra el portal antes de que acabe el tiempo.</li>
      </ol>
      <p className="font-body italic text-stone-300 mt-3">Y no te fíes de nadie que encuentres ahí abajo. O sí. Tú decides.</p>
      <button className="btn btn-gold mt-4" onClick={() => actions.markTutorial('lobby')} data-testid="btn-tutorial-ok">Entendido</button>
    </Modal>
  );
}
