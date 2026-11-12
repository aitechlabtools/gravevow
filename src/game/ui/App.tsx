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
import { stopMusic } from '../audio';

export function App() {
  const screen = useGame((s) => s.screen);
  const music = useGame((s) => s.profile?.settings.music);
  useEffect(() => {
    exposeDebug();
    void actions.boot();
  }, []);
  useEffect(() => {
    if (music === false) stopMusic();
  }, [music]);
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
    </div>
  );
}
