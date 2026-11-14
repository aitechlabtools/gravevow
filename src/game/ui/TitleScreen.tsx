import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Diorama } from '../../landing/Diorama';
import { CLASSES } from '../../core/data/classes';
import { actions, useGame } from '../state/store';
import { Modal } from './common';
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

/** Menú principal (14/11): logo arriba y menú de juego abajo en la columna izquierda; el diorama de la landing a la derecha,
 *  flotando en el mismo negro de la página. Las entradas son texto grabado y el rombo del juramento marca la elegida
 *  (ratón, toque o flechas y Enter). Apoyar, Discord y Volver a la web van en una fila discreta al pie. Maqueta: mockups/menu-principal. */
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
  type Item = { id: string; label: ReactNode; go: () => void; main?: boolean };
  const items: Item[] = [{ id: 'btn-play', label: profile ? 'Continuar' : 'Nuevo personaje', go: start, main: true }];
  // Primera vez (sin partida en este navegador): se puede cargar una copia hecha en otro dispositivo
  if (!profile) items.push({ id: 'btn-have-backup', label: 'Tengo una copia', go: () => { sfx('click'); void actions.openBackup('load'); } });
  if (roster.length > 0) {
    items.push({ id: 'btn-choose-char', label: 'Elegir personaje', go: () => { sfx('click'); void actions.openSelect(); } });
    items.push({ id: 'btn-backup', go: () => { sfx('click'); void actions.openBackup(); }, label: <>Copia de seguridad{backup?.remind && <span className="tm-remind" data-testid="backup-reminder">· {backup.lastAt === null ? 'sin copia' : (backup.days ?? 0) >= 7 ? `hace ${backup.days} días` : `${backup.expeditionsSince} expediciones sin copia`}</span>}</> });
  }
  items.push({ id: 'btn-settings', label: 'Ajustes', go: () => { sfx('click'); setSettings(true); } });
  const [sel, setSel] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (notice || settings) return;
    const k = (e: KeyboardEvent) => {
      const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      setSel((i) => { const n = (i + d + items.length) % items.length; refs.current[n]?.focus(); return n; });
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [items.length, notice, settings]);
  const cls = profile ? CLASSES[profile.character.classId] : null;
  return (
    <div className="tm" data-testid="screen-title">
      <div className="tm-art" aria-hidden><Diorama className="tm-dio" fill="#040308" ax={0.5} ay={0.47} /></div>
      <div className="tm-fs"><FullscreenButton /></div>
      <div className="tm-col fade-in">
        <div className="tm-head">
          <Logo />
          <p className="tm-tag font-body italic">Confía en tu espada. En nadie más.</p>
        </div>
        <nav className="gm" aria-label="Menú principal">
          {profile && cls && (
            <div className="gm-save" data-testid="title-save">
              <span className="gm-who">{profile.character.name}</span>
              <span>{cls.name} · Nv {profile.character.level} · {profile.stats.expeditions} {profile.stats.expeditions === 1 ? 'expedición' : 'expediciones'}</span>
            </div>
          )}
          <ul>
            {items.map((it, i) => (
              <li key={it.id}>
                <button ref={(el) => { refs.current[i] = el; }} className={`gm-it${i === sel ? ' on' : ''}${it.main ? ' main' : ''}`}
                  onMouseEnter={() => setSel(i)} onFocus={() => setSel(i)} onClick={it.go} data-testid={it.id} autoFocus={i === 0}
                  aria-label={it.main && profile ? `Continuar como ${profile.character.name}` : undefined}>
                  <i className="gm-rb" aria-hidden />{it.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="gm-links" data-testid="title-community">
            <a href={SUPPORT_URL} {...EXTERNAL} title={SUPPORT_HINT} aria-label={`${SUPPORT_HINT} (se abre en una pestaña nueva)`} onClick={() => sfx('click')} data-testid="title-kofi"><HeartIcon size={14} /> Apoyar</a>
            <a href={DISCORD_URL} {...EXTERNAL} title={DISCORD_HINT} aria-label={`${DISCORD_HINT} (se abre en una pestaña nueva)`} onClick={() => sfx('click')} data-testid="title-discord"><DiscordIcon size={16} /> Discord</a>
            <a href="../" data-testid="title-web">Volver a la web</a>
          </div>
        </nav>
        <p className="tm-foot">Alpha v0.1 · Tu progreso se guarda en este navegador: haz copias de seguridad.</p>
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

/** Crear personaje: la pantalla vive en screens/CrearPersonaje.tsx (opción D, tres columnas). */
export { CrearPersonaje as CreateScreen } from './screens/CrearPersonaje';
