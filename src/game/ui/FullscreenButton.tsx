// Botón de pantalla completa en todos los dispositivos que lo admiten (13/11: también escritorio y tableta con ratón). En iPhone, donde no existe, explica cómo instalar el juego
// en la pantalla de inicio, que lo abre sin barras del navegador.
import { useState } from 'react';
import { canFullscreen, isIOS, isIPad, isStandalone, toggleFullscreen, useFullscreen } from '../../shared/fullscreen';
import { toast } from '../state/store';
import { useIsTouch } from '../../shared/device';

function FsIcon({ on }: { on: boolean }) {
  // Cuatro esquinas: hacia fuera para entrar, hacia dentro para salir.
  const d = on
    ? 'M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4'
    : 'M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4';
  return <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" shapeRendering="crispEdges" aria-hidden><path d={d} /></svg>;
}

/** Entra o sale de pantalla completa; con F11 del navegador, avisa de cómo salir. Lo usan el botón, Ajustes y la tecla F. */
export async function toggleFs() {
  const r = await toggleFullscreen();
  if (r === 'f11') toast('Estás en la pantalla completa del navegador: sal con F11.', 'info');
}

export function FullscreenButton({ className = '' }: { className?: string }) {
  const touch = useIsTouch();
  const on = useFullscreen();
  const [help, setHelp] = useState(false);
  // App instalada: ya ocupa toda la pantalla y no hay nada que hacer
  if (isStandalone()) return null;
  // Se decide por lo que admite el navegador, no por el tipo de dispositivo. Sin API: solo iPhone/iPad (instrucciones).
  const supported = canFullscreen();
  if (!supported && !isIOS()) return null;
  const label = on ? 'Salir de pantalla completa' : 'Pantalla completa';
  return (
    <>
      {/* 44 px fijos (no en rem): en móvil la interfaz se reduce, pero el dedo no */}
      <button className={`btn text-sm flex items-center justify-center p-0 ${className}`} style={{ minWidth: 44, minHeight: 44, padding: 0 }}
        onClick={() => { if (!supported) setHelp(true); else void toggleFs(); }}
        aria-label={label} title={touch ? undefined : `${label} (F)`} aria-pressed={on} data-testid="btn-fullscreen" data-on={on ? '1' : '0'}>
        <FsIcon on={on} />
      </button>
      {help && (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4" onClick={() => setHelp(false)} data-testid="fullscreen-help">
          <div className="panel panel-gold p-5 max-w-md font-body text-lg text-stone-200 leading-snug" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-xl text-gold mb-2">Jugar a pantalla completa</h2>
            <p>{isIPad() ? 'Este iPad' : 'El iPhone'} no deja poner una web a pantalla completa, pero puedes instalar Gravevow como una app:</p>
            <ol className="list-decimal pl-6 mt-2 space-y-1">
              <li>Toca el botón <b>Compartir</b> de Safari (el cuadrado con la flecha).</li>
              <li>Elige <b>«Añadir a pantalla de inicio»</b>.</li>
              <li>Abre el juego desde el nuevo icono: se verá sin barras.</li>
            </ol>
            <p className="text-sm text-stone-400 mt-2">Tu partida se guarda en este navegador; la app instalada empieza con su propio guardado.</p>
            <button className="btn btn-gold mt-4 w-full" onClick={() => setHelp(false)}>Entendido</button>
          </div>
        </div>
      )}
    </>
  );
}
