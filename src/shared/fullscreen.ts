// Pantalla completa y orientación. Safari usa los nombres con prefijo «webkit»;
// el iPhone no deja poner una web a pantalla completa: allí se instala en la pantalla de inicio.
import { useEffect, useState } from 'react';

type FsDoc = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void>; unlock?: () => void };

const doc = () => document as FsDoc;

/** ¿El navegador deja poner la página a pantalla completa? (no en iPhone) */
export function canFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!(doc().fullscreenEnabled || doc().webkitFullscreenEnabled);
}
export function isFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!(doc().fullscreenElement || doc().webkitFullscreenElement);
}
/** ¿Se abrió como app instalada (desde la pantalla de inicio)? Entonces ya ocupa toda la pantalla.
 *  OJO: Chrome también marca «display-mode: fullscreen» cuando la web entra a pantalla completa con el botón;
 *  eso NO es una app instalada (si no, el botón ⛶ desaparecería y no se podría salir). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true; // iPhone instalada
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // «display-mode: fullscreen» sin elemento a pantalla completa: app instalada en Android… o F11 en el escritorio.
  // Solo es la app instalada si no hay un ratón (en el escritorio, F11 también lo marca).
  return !!window.matchMedia?.('(display-mode: fullscreen)').matches && !isFullscreen() && !hasMouse();
}
const hasMouse = () => !!window.matchMedia?.('(any-pointer: fine)').matches && !window.matchMedia?.('(pointer: coarse)').matches;
/** Pantalla completa del propio navegador (F11 en el escritorio): la página no la puede quitar, solo F11. */
export function isBrowserFullscreen(): boolean {
  if (typeof window === 'undefined') return false;
  if (isFullscreen()) return false;
  if (window.matchMedia?.('(display-mode: fullscreen)').matches && hasMouse()) return true;
  // Firefox no marca display-mode con F11: la ventana ocupa toda la pantalla (solo se mira en Firefox)
  return /Firefox\//.test(navigator.userAgent) && hasMouse() && window.innerHeight >= screen.height - 1 && window.innerWidth >= screen.width - 1;
}
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPod/.test(navigator.userAgent) || (/iPad|Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

/** Pone la página a pantalla completa y, si se puede (Android), fija la horizontal. */
export async function enterFullscreen(): Promise<boolean> {
  const el = document.documentElement as FsEl;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else return false;
  } catch { return false; }
  await lockLandscape();
  return true;
}
export async function exitFullscreen(): Promise<void> {
  try {
    (screen.orientation as LockableOrientation | undefined)?.unlock?.();
    if (document.exitFullscreen) await document.exitFullscreen();
    else await doc().webkitExitFullscreen?.();
  } catch { /* ya no estaba a pantalla completa */ }
}
// Al salir por fuera (Esc, F11, gesto del sistema) se suelta también la orientación fijada
if (typeof document !== 'undefined') {
  const release = () => { if (!isFullscreen()) { try { (screen.orientation as LockableOrientation | undefined)?.unlock?.(); } catch { /* sin bloqueo */ } } };
  document.addEventListener('fullscreenchange', release);
  document.addEventListener('webkitfullscreenchange', release);
}

/** Fija la orientación horizontal. Solo funciona a pantalla completa o instalada (Android); en iOS no existe. */
export async function lockLandscape(): Promise<boolean> {
  try { await (screen.orientation as LockableOrientation | undefined)?.lock?.('landscape'); return true; } catch { return false; }
}

/** Entra o sale. Con F11 la página no puede salir: devuelve 'f11' para avisar al jugador. */
export async function toggleFullscreen(): Promise<'on' | 'off' | 'f11' | 'no'> {
  if (isFullscreen()) { await exitFullscreen(); return 'off'; }
  if (isBrowserFullscreen()) return 'f11';
  return (await enterFullscreen()) ? 'on' : 'no';
}

/** Hook: true mientras la página está a pantalla completa (API, F11 del navegador o app instalada).
 *  Se actualiza también al salir con Esc, F11 o el gesto del sistema. */
export function useFullscreen(): boolean {
  const now = () => isFullscreen() || isBrowserFullscreen() || isStandalone();
  const [on, setOn] = useState(now);
  useEffect(() => {
    const upd = () => setOn(now());
    const mq = window.matchMedia?.('(display-mode: fullscreen)');
    document.addEventListener('fullscreenchange', upd);
    document.addEventListener('webkitfullscreenchange', upd);
    window.addEventListener('resize', upd);
    mq?.addEventListener?.('change', upd);
    return () => {
      document.removeEventListener('fullscreenchange', upd); document.removeEventListener('webkitfullscreenchange', upd);
      window.removeEventListener('resize', upd); mq?.removeEventListener?.('change', upd);
    };
  }, []);
  return on;
}

/** ¿Es un iPad (también el que se presenta como Mac)? */
export function isIPad(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}
