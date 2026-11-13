// Panel de Ajustes por secciones (12/11): Sonido, Pantalla, Controles, Partida, Comunidad e Información.
// Escritorio y tableta: lista de secciones a la izquierda y contenido a la derecha. Móvil horizontal: columna de
// iconos a la izquierda y el nombre de la sección en la cabecera (se gasta ancho, que sobra, y no alto).
// El pie con «Cerrar» y «Salir al título» queda siempre fijo. Los cambios se guardan en la cuenta, no en el personaje.
import { useEffect, useState, type ReactNode } from 'react';
import { actions, useGame } from '../state/store';
import { sfx } from '../audio';
import { Segmented } from './kit';
import { useLayout } from '../../config/ui';
import { useIsTouch } from '../../shared/device';
import { canFullscreen, isIOS, isIPad, isStandalone, useFullscreen } from '../../shared/fullscreen';
import { toggleFs } from './FullscreenButton';
import { backupAgoLabel } from '../../core/backup';
import { MailButton } from '../../legal/LegalPage';
import { CommunityLinks } from './TitleScreen';
import { guideEntries, miniTitle, TOPIC_NAME, type TutTopic } from '../../core/data/tutorials';
import { narratorName, rich } from './MiniTutorial';

export type SettingsTab = 'sound' | 'screen' | 'controls' | 'game' | 'community' | 'info';
export const GAME_VERSION = 'Alpha v0.1';

/** Iconos provisionales (glifos en un recuadro discontinuo). Los definitivos, en docs/ASSETS.md. */
const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'sound', label: 'Sonido', icon: '♪' },
  { id: 'screen', label: 'Pantalla', icon: '▣' },
  { id: 'controls', label: 'Controles', icon: '⌨' },
  { id: 'game', label: 'Partida', icon: '⛁' },
  { id: 'community', label: 'Comunidad', icon: '♥' },
  { id: 'info', label: 'Información', icon: 'ℹ' },
];
const isTab = (t: unknown): t is SettingsTab => TABS.some((x) => x.id === t);

/** Sección recordada mientras no haya cuenta (pantalla de título sin partida). */
let lastTabNoProfile: SettingsTab = 'sound';

export function SettingsModal({ onClose, onExit, initialTab }: { onClose: () => void; onExit?: () => void; /** El «?» del menú abre directamente Partida › Guía. */ initialTab?: SettingsTab }) {
  const profile = useGame((s) => s.profile);
  const backup = useGame((s) => s.backup);
  const layout = useLayout();
  const phone = layout === 'phone';
  const saved = profile?.settings.settingsTab;
  const [tab, setTabState] = useState<SettingsTab>(initialTab ?? (isTab(saved) ? saved : lastTabNoProfile));
  // Primera vez que se abre con una partida: el mini tutorial de Ajustes (sale encima de esta ventana)
  useEffect(() => { if (profile && !initialTab) actions.tutorialEvent('screen:settings'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const setTab = (t: SettingsTab) => {
    sfx('click'); setTabState(t); lastTabNoProfile = t;
    if (profile) actions.setSettings({ settingsTab: t });
  };
  // Esc cierra el panel (por encima de cualquier otra tecla de la pantalla de debajo)
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); onClose(); } };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onClose]);
  const cur = TABS.find((t) => t.id === tab)!;
  const remind = !!backup?.remind;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 fade-in set-scrim" data-modal data-testid="settings"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`panel panel-gold set-panel ${phone ? 'is-phone' : ''}`} role="dialog" aria-label="Ajustes">
        <div className="set-head">
          <h2 className="panel-title text-xl">Ajustes</h2>
          {phone && <span className="set-cur" data-testid="settings-current">· {cur.label}</span>}
          <button className="btn icon-btn ml-auto" onClick={onClose} aria-label="Cerrar ajustes" data-testid="settings-x">✕</button>
        </div>
        <div className="set-body">
          <nav className="set-nav scroll-thin" aria-label="Secciones de Ajustes" data-testid="settings-nav">
            {TABS.map((t) => (
              <button key={t.id} className={`set-tab ${t.id === tab ? 'on' : ''}`} onClick={() => setTab(t.id)} aria-current={t.id === tab ? 'page' : undefined}
                aria-label={t.label} title={phone ? t.label : undefined} data-testid={`settings-tab-${t.id}`}>
                <span className="set-ic" aria-hidden>{t.icon}</span>
                {!phone && <span>{t.label}</span>}
                {t.id === 'game' && remind && <span className="set-dot" aria-label="Copia de seguridad recomendada" />}
              </button>
            ))}
          </nav>
          <div className="set-content scroll-thin" data-testid={`settings-section-${tab}`}>
            {tab === 'sound' && <SoundSection />}
            {tab === 'screen' && <ScreenSection />}
            {tab === 'controls' && <ControlsSection />}
            {tab === 'game' && <GameSection onClose={onClose} guide={initialTab === 'game'} />}
            {tab === 'community' && <Block title="Comunidad"><p className="set-note mb-3">Se abre en otra pestaña y tu partida sigue aquí.</p><CommunityLinks testPrefix="settings" /></Block>}
            {tab === 'info' && <InfoSection />}
          </div>
        </div>
        <div className="set-foot">
          <button className="btn" onClick={onClose} data-testid="settings-close">Cerrar</button>
          {onExit && <button className="btn" onClick={() => { onClose(); onExit(); }} data-testid="btn-exit-title">Salir al título</button>}
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="set-block">
      <h3 className="set-h">{title}</h3>
      <div className="set-card">{children}</div>
    </section>
  );
}

function Slider({ label, value, onChange, testId }: { label: string; value: number; onChange: (v: number) => void; testId: string }) {
  return (
    <label className="set-row">
      <span>{label}</span>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(+e.target.value)} className="accent-[#e8b33a]" data-testid={testId} />
      <span className="set-val">{Math.round(value * 100)} %</span>
    </label>
  );
}

function SoundSection() {
  const s = useGame((st) => st.profile?.settings);
  if (!s) return <Block title="Sonido"><p className="set-note">Crea un personaje para ajustar el sonido.</p></Block>;
  return (
    <>
      <Block title="Volumen">
        <Slider label="General" value={s.volume} onChange={(v) => actions.setSettings({ volume: v })} testId="vol-master" />
        <Slider label="Música" value={s.musicVolume ?? 1} onChange={(v) => actions.setSettings({ musicVolume: v })} testId="vol-music" />
        <Slider label="Efectos" value={s.sfxVolume ?? 1} onChange={(v) => { actions.setSettings({ sfxVolume: v }); sfx('click'); }} testId="vol-sfx" />
        <Slider label="Ambiente" value={s.ambientVolume ?? 1} onChange={(v) => actions.setSettings({ ambientVolume: v })} testId="vol-ambient" />
      </Block>
      <Block title="Música">
        <label className="set-toggle">
          <input type="checkbox" checked={s.music} onChange={(e) => actions.setSettings({ music: e.target.checked })} className="accent-[#e8b33a] w-5 h-5" data-testid="music-toggle" />
          <span>Música</span>
        </label>
        <div className="flex items-center gap-3 flex-wrap mt-2" role="group" aria-label="Música en combate">
          <span>Música en combate</span>
          <Segmented options={[{ id: 'normal', label: 'Normal' }, { id: 'low', label: 'Baja' }, { id: 'off', label: 'Sin música' }]} value={s.combatMusic ?? 'normal'}
            onChange={(v) => actions.setSettings({ combatMusic: v as 'normal' | 'low' | 'off' })} testId="combat-music" />
        </div>
        <p className="set-note">Los cambios se oyen al momento y valen para todos tus personajes.</p>
      </Block>
    </>
  );
}

function ScreenSection() {
  const on = useFullscreen();
  const supported = canFullscreen();
  return (
    <Block title="Pantalla completa">
      {isStandalone() ? (
        <p className="set-note">El juego está instalado y ya se abre sin las barras del navegador.</p>
      ) : supported ? (
        <>
          <button className="btn" style={{ minHeight: 44 }} onClick={() => { sfx('click'); void toggleFs(); }} data-testid="settings-fullscreen">
            {on ? 'Salir de pantalla completa' : 'Pantalla completa'}
          </button>
          <p className="set-note">También con la tecla F o el botón de las cuatro esquinas, arriba a la derecha. Para salir: la misma tecla, Esc o el gesto del sistema (si entraste con F11, sal con F11).</p>
        </>
      ) : isIOS() ? (
        <p className="set-note">En {isIPad() ? 'este iPad' : 'iPhone'} no hay pantalla completa: usa «Compartir» › «Añadir a pantalla de inicio» y abre el juego desde ese icono.</p>
      ) : (
        <p className="set-note">Este navegador no permite la pantalla completa.</p>
      )}
    </Block>
  );
}

const KEYS_DUNGEON: [string, string][] = [
  ['WASD, flechas o clic', 'Moverte'], ['E o Espacio', 'Interactuar'], ['1 – 9', 'Elegir una opción al interactuar'],
  ['Q', 'Beber una poción'], ['I', 'Inventario'], ['R', 'Girar el objeto seleccionado'], ['F', 'Pantalla completa (en cualquier pantalla)'], ['Esc', 'Pausa, o cerrar la ventana abierta'],
];
const KEYS_COMBAT: [string, string][] = [
  ['1 – 6', 'Atacar, Especial, Habilidad, Mochila, Huir y Guardia'], ['1 – 4 (en un submenú)', 'Elegir'], ['Flechas y Enter', 'Moverte por las acciones y usar'],
  ['Tab', 'Cambiar de objetivo (en la Mochila, de página)'], ['Esc o Retroceso', 'Volver atrás'], ['Enter o Espacio', 'Cerrar el resultado'],
];
const GESTURES: [string, string][] = [
  ['Joystick y botones', 'Moverte, interactuar, poción e inventario en la mazmorra'], ['Tocar', 'Seleccionar o usar'],
  ['Mantener pulsado', 'Ver la ficha'], ['Arrastrar', 'Mover objetos'], ['Tocar objeto y luego casilla', 'Colocar sin arrastrar'],
];

function KeyTable({ title, rows, testId }: { title: string; rows: [string, string][]; testId: string }) {
  return (
    <Block title={title}>
      <table className="set-keys" data-testid={testId}>
        <tbody>{rows.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody>
      </table>
    </Block>
  );
}

function ControlsSection() {
  const touch = useIsTouch();
  const keys = [<KeyTable key="d" title="Teclado · mazmorra" rows={KEYS_DUNGEON} testId="keys-dungeon" />, <KeyTable key="c" title="Teclado · combate" rows={KEYS_COMBAT} testId="keys-combat" />];
  const touchT = <KeyTable key="t" title="Táctil" rows={GESTURES} testId="keys-touch" />;
  return <>{touch ? [touchT, ...keys] : [...keys, touchT]}</>;
}

function GameSection({ onClose, guide }: { onClose: () => void; guide?: boolean }) {
  const screen = useGame((s) => s.screen);
  const backup = useGame((s) => s.backup);
  const roster = useGame((s) => s.roster);
  const inRun = screen === 'dungeon';
  return (
    <>
      <Block title="Copia de seguridad">
        {backup && <p className={`mb-2 ${backup.remind ? 'text-gold' : ''}`} data-testid="settings-backup-age">{backupAgoLabel(backup)}{backup.remind ? ' · conviene hacer una.' : '.'}</p>}
        {inRun ? <p className="set-note">Disponible en el Bastión, al terminar la expedición.</p> : roster.length > 0 ? (
          <button className={`btn ${backup?.remind ? 'btn-gold' : ''}`} onClick={() => { sfx('click'); onClose(); void actions.openBackup(); }} data-testid="settings-open-backup">Abrir copia de seguridad</button>
        ) : null}
        <p className="set-note">Tu partida se guarda solo en este navegador. Si borras sus datos, se pierde.</p>
      </Block>
      {roster.length > 0 && (
        <Block title="Personajes">
          {inRun ? <p className="set-note">Para cambiar de personaje, vuelve antes al Bastión.</p> : (
            <button className="btn" onClick={() => { sfx('click'); onClose(); void actions.openSelect(); }} data-testid="settings-choose-char">Elegir personaje</button>
          )}
          <p className="set-note">Ahí puedes crear o borrar personajes (hasta 4).</p>
        </Block>
      )}
      {roster.length > 0 && <GuideBlock onClose={onClose} scrollTo={!!guide} />}
    </>
  );
}

/**
 * Guía (fase 6): los mini tutoriales por tema. Los vistos se pueden releer aquí mismo; los que no, «Aún por descubrir».
 * Debajo: repetir el tutorial inicial, desactivar los mini tutoriales y reiniciarlos.
 */
function GuideBlock({ onClose, scrollTo }: { onClose: () => void; scrollTo: boolean }) {
  const screen = useGame((s) => s.screen);
  const profile = useGame((s) => s.profile);
  const t = useGame((s) => s.tutorials);
  const [topic, setTopic] = useState<TutTopic | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const touch = useIsTouch();
  useEffect(() => { if (scrollTo) document.querySelector('[data-testid=settings-guide]')?.scrollIntoView({ block: 'start' }); }, [scrollTo]);
  const groups = guideEntries();
  return (
    <section className="set-block" data-testid="settings-guide">
      <h3 className="set-h">Guía</h3>
      <div className="set-card">
        <p className="set-note mb-2">Lo que te han contado en el Bastión y en la mazmorra. Toca un tema y luego lo que quieras releer.</p>
        <div className="flex flex-col gap-1.5">
          {groups.map((g) => {
            const seen = g.minis.filter((m) => t.seen.includes(m.id)).length;
            const on = topic === g.topic;
            return (
              <div key={g.topic}>
                <button className={`btn w-full flex justify-between items-center text-left ${on ? 'btn-gold' : ''}`} style={{ minHeight: 44 }} aria-expanded={on}
                  onClick={() => { sfx('click'); setTopic(on ? null : g.topic); setOpen(null); }} data-testid={`guide-topic-${g.topic}`}>
                  <span>{TOPIC_NAME[g.topic]}</span><span className="text-xs opacity-80">{seen} / {g.minis.length}</span>
                </button>
                {on && (
                  <ul className="flex flex-col gap-1 mt-1.5 pl-2" data-testid={`guide-list-${g.topic}`}>
                    {g.minis.map((m) => {
                      const known = t.seen.includes(m.id);
                      const isOpen = open === m.id;
                      return (
                        <li key={m.id}>
                          <button className="btn w-full text-left text-sm" style={{ minHeight: 44 }} disabled={!known} aria-expanded={known ? isOpen : undefined}
                            onClick={() => { sfx('click'); setOpen(isOpen ? null : m.id); }} data-testid={`guide-item-${m.id}`}>
                            {known ? miniTitle(m) : <span className="italic text-stone-500">Aún por descubrir</span>}
                          </button>
                          {known && isOpen && (
                            <div className="px-3 py-2 text-sm border-l-2 border-gold/60 bg-black/30" data-testid={`guide-text-${m.id}`}>
                              <div className="font-display text-gold text-[11px] uppercase tracking-wider mb-1">{narratorName(m.narrator ?? 'intendant')}</div>
                              {m.steps.map((st, i) => <p key={i} className="mb-1">{rich(touch && st.touch ? st.touch : st.text)}</p>)}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="set-card mt-2">
        {screen === 'lobby' && profile?.tutorialDone ? (
          <>
            <button className="btn" onClick={() => { onClose(); actions.replayTutorial(); }} data-testid="btn-replay-tutorial">Repetir el tutorial inicial</button>
            <p className="set-note mb-2">Sin recompensas y sin tocar tu inventario.</p>
          </>
        ) : screen === 'lobby' ? null : <p className="set-note mb-2">El tutorial inicial se repite desde el Bastión.</p>}
        <label className="flex items-center gap-3 cursor-pointer" style={{ minHeight: 44 }}>
          <input type="checkbox" checked={t.disabled} onChange={(e) => { sfx('click'); actions.setMinisDisabled(e.target.checked); }} className="accent-[#e8b33a] w-5 h-5" data-testid="minis-disabled" />
          <span>Desactivar los mini tutoriales</span>
        </label>
        <p className="set-note mb-2">Para quien ya conoce el juego. Los avisos de mejora de las estaciones siguen saliendo.</p>
        {confirmReset ? (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm">¿Volver a verlos todos desde el principio?</span>
            <button className="btn btn-gold" onClick={() => { sfx('click'); actions.resetMinis(); setConfirmReset(false); setOpen(null); }} data-testid="minis-reset-yes">Sí, reiniciar</button>
            <button className="btn" onClick={() => setConfirmReset(false)} data-testid="minis-reset-no">No</button>
          </div>
        ) : (
          <button className="btn" onClick={() => { sfx('click'); setConfirmReset(true); }} data-testid="minis-reset">Reiniciar los mini tutoriales</button>
        )}
      </div>
    </section>
  );
}

function InfoSection() {
  return (
    <>
      <Block title="Versión">
        <p data-testid="settings-version">{GAME_VERSION} · en desarrollo: puede tener fallos y cambiar.</p>
      </Block>
      <Block title="Legal">
        <div className="flex flex-wrap gap-2" data-testid="settings-legal">
          <a className="btn" href="../aviso-legal.html" target="_blank" rel="noopener">Aviso legal</a>
          <a className="btn" href="../privacidad.html" target="_blank" rel="noopener">Privacidad</a>
          <a className="btn" href="../cookies.html" target="_blank" rel="noopener">Cookies</a>
        </div>
        <p className="set-note">Se abren en otra pestaña.</p>
      </Block>
      <Block title="Contacto">
        <MailButton />
      </Block>
    </>
  );
}
