import { useState } from 'react';
import { actions, useGame } from '../state/store';
import { MonsterSprite, Modal } from './common';
import { sfx } from '../audio';
import { startMusic } from '../music/director';
import { isTouch } from '../../shared/device';
import { canFullscreen, enterFullscreen, isFullscreen } from '../../shared/fullscreen';
import { FullscreenButton } from './FullscreenButton';
import { GravevowLogo } from '../../shared/GravevowLogo';
import { DISCORD_HINT, DISCORD_URL, DiscordIcon, EXTERNAL, HeartIcon, SUPPORT_HINT, SUPPORT_URL } from '../../shared/community';

export function Logo() {
  return <GravevowLogo className="title-logo" />;
}

/** Apoyar (Ko-fi) y Discord: enlaces externos en una pestaña nueva, para no sacar al jugador de su partida. */
export function CommunityLinks({ testPrefix }: { testPrefix: string }) {
  return (
    <div className="grid grid-cols-2 gap-2" data-testid={`${testPrefix}-community`}>
      <a className="btn flex items-center justify-center gap-2" href={SUPPORT_URL} {...EXTERNAL} title={SUPPORT_HINT}
        aria-label={`${SUPPORT_HINT} (se abre en una pestaña nueva)`} onClick={() => sfx('click')} data-testid={`${testPrefix}-kofi`}>
        <HeartIcon size={16} /> Apoyar
      </a>
      <a className="btn flex items-center justify-center gap-2" href={DISCORD_URL} {...EXTERNAL} title={DISCORD_HINT}
        aria-label={`${DISCORD_HINT} (se abre en una pestaña nueva)`} onClick={() => sfx('click')} data-testid={`${testPrefix}-discord`}>
        <DiscordIcon size={18} /> Discord
      </a>
    </div>
  );
}

import { SettingsModal } from './Settings';
export { SettingsModal };

export function TitleScreen() {
  const profile = useGame((s) => s.profile);
  const notice = useGame((s) => s.notice);
  const noticeTitle = useGame((s) => s.noticeTitle);
  const [settings, setSettings] = useState(false);
  const roster = useGame((s) => s.roster);
  const backup = useGame((s) => s.backup);
  const start = () => {
    sfx('click');
    // En táctil, «Jugar» pone el juego a pantalla completa y en horizontal (Android). El botón ⛶ lo quita.
    if (isTouch() && canFullscreen() && !isFullscreen()) void enterFullscreen();
    if (profile?.settings.music !== false) startMusic('lobby');
    actions.goto(profile ? 'lobby' : 'create');
  };
  return (
    <div className="relative h-full flex flex-col items-center justify-center overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 60%, #1d1424 0%, #0b0910 55%, #050407 100%)' }}>
      <div className="absolute top-3 right-3 z-10"><FullscreenButton /></div>
      <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 50% 110%, rgba(196,40,59,0.35), transparent 50%)' }} />
      <div className="title-side absolute bottom-[12%] left-[8%] hidden md:block opacity-80 breathe"><MonsterSprite sprite="skeleton" scale={7} /></div>
      <div className="title-side absolute bottom-[12%] right-[8%] hidden md:block opacity-80 breathe" style={{ animationDelay: '0.8s' }}><MonsterSprite sprite="rival" scale={7} className="-scale-x-100" /></div>
      <div className="title-wrap relative text-center fade-in px-4">
        <Logo />
        <p className="title-tag font-body italic text-xl md:text-2xl text-stone-300 mt-4">Confía en tu espada. En nadie más.</p>
        <div className="title-menu flex flex-col gap-3 mt-10 w-72 mx-auto">
          <button className="btn btn-gold text-lg py-3" onClick={start} data-testid="btn-play" autoFocus>
            {profile ? `Continuar como ${profile.character.name}` : 'Nuevo personaje'}
          </button>
          {/* Primera vez (sin partida en este navegador): se puede cargar una copia hecha en otro dispositivo */}
          {!profile && (
            <button className="btn flex items-center justify-center gap-2" onClick={() => { sfx('click'); void actions.openBackup('load'); }} data-testid="btn-have-backup">
              <IconUp /> Tengo una copia
            </button>
          )}
          {roster.length > 0 && <button className="btn" onClick={() => { sfx('click'); void actions.openSelect(); }} data-testid="btn-choose-char">Elegir personaje</button>}
          {roster.length > 0 && (
            <button className="btn flex items-center justify-center gap-2" onClick={() => { sfx('click'); void actions.openBackup(); }} data-testid="btn-backup">
              Copia de seguridad{backup?.remind && <span className="text-[11px] text-ember font-display" data-testid="backup-reminder">· {backup.lastAt === null ? 'sin copia' : (backup.days ?? 0) >= 7 ? `hace ${backup.days} días` : `${backup.expeditionsSince} expediciones sin copia`}</span>}
            </button>
          )}
          <button className="btn" onClick={() => setSettings(true)} data-testid="btn-settings">Ajustes</button>
          <a className="btn text-center flex items-center justify-center" href="../">Volver a la web</a>
          <CommunityLinks testPrefix="title" />
        </div>
        <p className="title-foot mt-10 text-xs text-stone-400 max-w-md mx-auto">Alpha v0.1 · En desarrollo: puede tener fallos y cambiar. Tu progreso se guarda en este navegador: haz copias de seguridad.</p>
      </div>
      {notice && (
        <Modal onClose={() => actions.dismissNotice()}>
          <h2 className="panel-title text-lg mb-2">{noticeTitle ?? 'Expedición interrumpida'}</h2>
          <p className="font-body text-lg">{notice}</p>
          <button className="btn btn-gold mt-4" onClick={() => actions.dismissNotice()} data-testid="btn-notice-ok">Entendido</button>
        </Modal>
      )}
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
    </div>
  );
}

function IconUp() {
  return <svg width={18} height={18} viewBox="0 0 12 12" shapeRendering="crispEdges" fill="currentColor" aria-hidden><path d="M5 2h2v1h1v1h1v1H7v5H5V5H3V4h1V3h1zM1 10h1v1h8v-1h1v2H1z" /></svg>;
}

/** Crear personaje: la pantalla vive en screens/CrearPersonaje.tsx (opción D, tres columnas). */
export { CrearPersonaje as CreateScreen } from './screens/CrearPersonaje';
