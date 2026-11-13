import { useEffect } from 'react';
import { DragLayer } from './pointerDrag';
import { getState } from '../state/store';
import { RotateNotice } from '../../shared/RotateNotice';
import { actions, useGame } from '../state/store';
import { TitleScreen, CreateScreen } from './TitleScreen';
import { Lobby } from './Lobby';
import { DungeonScreen } from './DungeonScreen';
import { SummaryScreen } from './SummaryScreen';
import { ElegirPersonaje } from './screens/ElegirPersonaje';
import { CopiaSeguridad } from './screens/CopiaSeguridad';
import { Toasts } from './common';
import { MiniTutorialLayer } from './MiniTutorial';
import { exposeDebug } from '../state/store';
import { initMusicDirector, stopMusic } from '../music/director';
import { MusicLab } from './MusicLab';
import { toggleFs } from './FullscreenButton';
import { canFullscreen } from '../../shared/fullscreen';

// Pantalla de pruebas de música: /play/?debug&musica (solo desarrollo)
const MUSIC_LAB = typeof window !== 'undefined' && /[?&]debug\b/.test(window.location.search) && /[?&]musica\b/.test(window.location.search);

export function App() {
  const screen = useGame((s) => s.screen);
  const music = useGame((s) => s.profile?.settings.music);
  useEffect(() => {
    exposeDebug();
    initMusicDirector();
    void actions.boot();
  }, []);
  useEffect(() => {
    if (music === false) stopMusic();
  }, [music]);
  // Tecla F: pantalla completa (en cualquier pantalla; no choca con WASD, E, Q, I, R, 1–9, Tab ni Esc)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.toLowerCase() === 'f' && canFullscreen()) { e.preventDefault(); void toggleFs(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  // Evita que el navegador haga scroll con espacio/flechas mientras se juega
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      // En la mazmorra no: Phaser ignora las teclas con preventDefault (las flechas dejaban de mover al personaje) y él
      // mismo evita el desplazamiento de las teclas que usa. Con un combate o una ventana abiertos, sí se bloquea aquí.
      const st = getState();
      if (st.screen === 'dungeon' && !st.combat && !st.modal) return;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <div className="relative h-full w-full">
      {screen === 'boot' && <div className="h-full flex items-center justify-center font-display text-stone-400 tracking-[0.3em]">CARGANDO…</div>}
      {screen === 'title' && <TitleScreen />}
      {screen === 'select' && <ElegirPersonaje />}
      {screen === 'backup' && <CopiaSeguridad />}
      {screen === 'create' && <CreateScreen />}
      {screen === 'lobby' && <Lobby />}
      {screen === 'dungeon' && <DungeonScreen />}
      {screen === 'summary' && <SummaryScreen />}
      <Toasts />
      <MiniTutorialLayer />
      <DragLayer />
      <RotateNotice onChange={actions.setSuspended} />
      {MUSIC_LAB && <MusicLab />}
    </div>
  );
}
