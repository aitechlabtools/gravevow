// Copia de seguridad: guardar la partida fuera del navegador (archivo o código) y cargarla en otro dispositivo.
// Avisos muy claros y sencillos. Antes de cargar se enseña qué contiene la copia y se pide confirmación;
// la partida actual se guarda sola para poder deshacerlo.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { actions, useGame } from '../../state/store';
import { backupAgoLabel, parseBackup, summarize, type BackupSummaryEntry } from '../../../core/backup';
import type { SaveData } from '../../../core/save';
import { Modal } from '../common';
import { Panel } from '../kit';
import { useLayout } from '../../../config/ui';
import { sfx } from '../../audio';
import { FullscreenButton } from '../FullscreenButton';
import { isIosSafari, isStandalone, useIsTouch } from '../../../shared/device';

export function CopiaSeguridad() {
  const layout = useLayout();
  useEffect(() => { actions.tutorialEvent('screen:backup'); }, []);
  const phone = layout === 'phone';
  const status = useGame((s) => s.backup);
  const roster = useGame((s) => s.roster);
  const undoAt = useGame((s) => s.undoAt);
  const persisted = useGame((s) => s.persisted);
  const focus = useGame((s) => s.backupFocus);
  const ios = isIosSafari();
  const [more, setMore] = useState(!phone || ios);
  const [code, setCode] = useState<string | null>(null);
  const [paste, setPaste] = useState(false);
  const [pending, setPending] = useState<{ save: SaveData; summary: BackupSummaryEntry[]; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const hasGame = roster.length > 0;
  // «Compartir» solo en pantallas táctiles: en ordenador el menú de compartir del sistema no sirve para esto y basta «Descargar»
  const isTouchNow = useIsTouch();

  const exportFile = async () => {
    sfx('click');
    const r = await actions.exportBackup();
    if (!r) return;
    downloadText(r.json, r.fileName);
  };
  const shareFile = async () => {
    sfx('click');
    const r = await actions.exportBackup();
    if (!r) return;
    const file = new File([r.json], r.fileName, { type: 'application/json' });
    setInfo(null);
    try { await navigator.share({ files: [file], title: 'Copia de Gravevow' }); }
    catch (e) {
      // Cancelar no es un error. Cualquier otro fallo (p. ej. Windows rechaza los .json aunque el navegador diga que puede
      // compartirlos) se resuelve descargando el archivo, para que el jugador no se quede sin copia.
      if (e instanceof DOMException && e.name === 'AbortError') return;
      downloadText(r.json, r.fileName);
      setInfo('Tu sistema no deja compartir este archivo, así que se ha descargado. Lo tienes en tu carpeta de descargas.');
    }
  };
  const copyCode = async () => {
    sfx('click');
    const r = await actions.exportBackup();
    if (!r) return;
    setCode(r.code);
  };
  const tryLoad = (text: string) => {
    const r = parseBackup(text);
    if (!r.ok) { sfx('error'); setError(r.error); return false; }
    setError(null);
    setPending({ save: r.save, summary: summarize(r.save), at: r.backup.exportedAt });
    return true;
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try { tryLoad(await f.text()); } catch { setError('No se ha podido leer el archivo.'); }
    if (fileInput.current) fileInput.current.value = '';
  };
  const canShare = isTouchNow && typeof navigator !== 'undefined' && !!navigator.canShare && (() => { try { return navigator.canShare({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] }); } catch { return false; } })();

  return (
    <div className="h-full flex flex-col relative" style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a1520 0%, #0d0b11 55%, #07060a 100%)' }} data-testid="screen-backup">
      <header className="ui-nav" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn" style={{ minHeight: 44 }} onClick={() => { sfx('click'); actions.goto('title'); }} data-testid="btn-backup-back">‹ Menú</button>
        <h1 className="font-display text-parchment tracking-[0.14em] uppercase" style={{ fontSize: phone ? 15 : 22 }}>Copia de seguridad</h1>
        <div className="flex justify-end" style={{ minWidth: 96 }}><FullscreenButton className="icon-btn" /></div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto scroll-thin">
        <div className="mx-auto w-full flex flex-col" style={{ maxWidth: 980, padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))', gap: 'var(--gap)' }}>
          {/* Aviso destacado */}
          <div className="panel panel-gold" style={{ padding: phone ? '8px 12px' : '14px 18px' }} data-testid="backup-notice">
            <div className="flex items-center gap-3">
              <IconWarn />
              <p className="font-display text-parchment flex-1" style={{ fontSize: phone ? 14 : 18 }}>Tus datos se guardan solo en este navegador.</p>
              <button className="btn text-sm shrink-0" style={{ minHeight: 44 }} onClick={() => setMore(!more)} aria-expanded={more} data-testid="btn-backup-more">{more ? 'Menos ▴' : 'Más información ▾'}</button>
            </div>
            {more && (
              <ul className="font-body text-stone-200 mt-2 space-y-1 list-disc pl-6" style={{ fontSize: phone ? 14 : 17 }}>
                <li>Si borras los datos del navegador o cambias de dispositivo, <b>pierdes la partida</b>.</li>
                <li>Con una copia la guardas fuera y puedes llevarla a otro ordenador, tableta o móvil.</li>
                <li>La copia es tuya: no se envía a ningún servidor.</li>
                {ios && (
                  <li className="text-ember" data-testid="backup-ios"><b>iPhone y iPad:</b> Safari puede borrar los datos de una web si pasan unos 7 días sin abrirla.
                    {isStandalone() ? ' Ya tienes el juego en la pantalla de inicio, que lo evita; aun así, haz copias de vez en cuando.' : ' Añade el juego a la pantalla de inicio (botón Compartir → «Añadir a pantalla de inicio») y haz copias a menudo.'}</li>
                )}
              </ul>
            )}
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--gap)' }}>
            <Panel title="Guardar mi partida" gold testId="backup-save">
              <div className="flex flex-col gap-2">
                <BigBtn icon={<IconDown />} label="Exportar archivo" sub="Descarga un archivo .json con toda tu partida" gold onClick={exportFile} disabled={!hasGame} testId="btn-export-file" phone={phone} />
                {canShare && <BigBtn icon={<IconShare />} label="Compartir archivo" sub="Envíalo por WhatsApp, correo o a tus archivos" onClick={shareFile} disabled={!hasGame} testId="btn-share-file" phone={phone} />}
                <BigBtn icon={<IconCopy />} label="Copiar código" sub="Un texto para pegar en otro dispositivo" onClick={copyCode} disabled={!hasGame} testId="btn-copy-code" phone={phone} />
              </div>
              <p className="text-xs text-stone-300 mt-3 text-center" data-testid="backup-last">
                {status ? <>{status.remind ? <span className="text-ember">{backupAgoLabel(status)}</span> : backupAgoLabel(status)}{status.lastAt !== null && status.expeditionsSince > 0 ? ` · ${status.expeditionsSince} expediciones desde entonces` : ''}</> : 'Aún no tienes ninguna partida.'}
              </p>
            </Panel>
            <Panel title="Cargar una partida" gold={focus === 'load' || !hasGame} testId="backup-load">
              <div className="flex flex-col gap-2">
                <BigBtn icon={<IconUp />} label="Importar archivo" sub="Elige un archivo de copia (.json)" onClick={() => { sfx('click'); fileInput.current?.click(); }} testId="btn-import-file" phone={phone} />
                <BigBtn icon={<IconPaste />} label="Pegar código" sub="Pega el texto que copiaste en otro dispositivo" onClick={() => { sfx('click'); setError(null); setPaste(true); }} testId="btn-paste-code" phone={phone} />
              </div>
              <input ref={fileInput} type="file" accept=".json,application/json,text/plain" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} data-testid="input-import-file" />
              <p className="text-xs text-stone-400 mt-3 text-center">Antes de cargar te enseñamos qué contiene y guardamos tu partida actual por si quieres deshacerlo.</p>
              {undoAt && (
                <button className="btn w-full mt-2 text-sm" style={{ minHeight: 44 }} onClick={() => { sfx('click'); void actions.undoImport(); }} data-testid="btn-undo-import">
                  Deshacer la última carga (volver a tu partida de antes)
                </button>
              )}
            </Panel>
          </div>
          {info && <p className="panel p-3 text-gold font-body text-lg" role="status" data-testid="backup-info">{info}</p>}
          {error && !paste && <p className="panel p-3 text-blood font-body text-lg" role="alert" data-testid="backup-error">{error}</p>}
          <p className="text-center text-xs text-stone-400">
            {roster.length ? `${roster.length} ${roster.length === 1 ? 'personaje' : 'personajes'}` : 'Sin personajes'} · La copia incluye también los atuendos, la página «Compartido», el tutorial y los ajustes.
            {persisted === true && ' · El navegador conservará los datos.'}
          </p>
        </div>
      </div>

      {code && <CodeModal code={code} onClose={() => setCode(null)} />}
      {paste && <PasteModal error={error} onLoad={(t) => { if (tryLoad(t)) setPaste(false); }} onClose={() => { setPaste(false); setError(null); }} />}
      {pending && <ConfirmImport pending={pending} onClose={() => setPending(null)} />}
    </div>
  );
}

function BigBtn({ icon, label, sub, onClick, gold = false, disabled = false, testId, phone }: { icon: ReactNode; label: string; sub: string; onClick: () => void; gold?: boolean; disabled?: boolean; testId: string; phone: boolean }) {
  return (
    <button className={`btn ${gold ? 'btn-gold' : ''} w-full flex items-center gap-3 text-left`} style={{ minHeight: phone ? 52 : 64, padding: '6px 14px' }} onClick={onClick} disabled={disabled} data-testid={testId}>
      <span className="shrink-0">{icon}</span>
      <span className="leading-tight min-w-0">
        <span className="block font-display">{label}</span>
        {!phone && <span className={`block text-[11px] ${gold ? 'text-[#3a2a08]' : 'text-stone-400'} font-body normal-case tracking-normal`}>{sub}</span>}
      </span>
    </button>
  );
}

function CodeModal({ code, onClose }: { code: string; onClose: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState<boolean | null>(null);
  const copy = async () => {
    const ok = await copyText(code, ref.current);
    setCopied(ok);
    sfx(ok ? 'coin' : 'error');
  };
  return (
    <Modal onClose={onClose} testId="code-modal">
      <h2 className="panel-title text-lg mb-2">Tu código de partida</h2>
      <p className="font-body text-base text-stone-200">Cópialo y pégalo en el otro dispositivo, en <b>Copia de seguridad → Pegar código</b>. Guárdalo donde quieras: un mensaje a ti mismo, una nota o un correo.</p>
      <textarea ref={ref} readOnly value={code} className="mt-3 w-full bg-[#0d0c11] border-2 border-stone-700 p-2 text-[11px] text-stone-300 font-mono break-all" style={{ height: 96, resize: 'none' }} onFocus={(e) => e.target.select()} data-testid="code-text" />
      <p className="text-xs text-stone-400 mt-1">{code.length.toLocaleString('es-ES')} caracteres. Tiene que copiarse entero.</p>
      {copied === true && <p className="text-heal text-sm mt-2" data-testid="code-copied">Copiado. Ya puedes pegarlo donde quieras.</p>}
      {copied === false && <p className="text-ember text-sm mt-2">No se ha podido copiar solo: mantén pulsado el texto, elige «Seleccionar todo» y «Copiar».</p>}
      <div className="flex gap-2 mt-4 flex-wrap">
        <button className="btn btn-gold" style={{ minHeight: 44 }} onClick={() => void copy()} data-testid="btn-copy-now">Copiar el código</button>
        <button className="btn" style={{ minHeight: 44 }} onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  );
}

function PasteModal({ error, onLoad, onClose }: { error: string | null; onLoad: (t: string) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const canRead = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText;
  const fromClipboard = async () => {
    try { const t = await navigator.clipboard.readText(); setText(t); if (t.trim()) onLoad(t); } catch { /* sin permiso: que lo pegue a mano */ }
  };
  return (
    <Modal onClose={onClose} testId="paste-modal">
      <h2 className="panel-title text-lg mb-2">Pegar código</h2>
      <p className="font-body text-base text-stone-200">Pega aquí el código que copiaste (empieza por <b>CR1.</b>). Mantén pulsado el recuadro y elige «Pegar».</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="CR1.…" className="mt-3 w-full bg-[#0d0c11] border-2 border-stone-700 focus:border-gold focus:outline-none p-2 text-[12px] text-parchment font-mono break-all"
        style={{ height: 110, resize: 'none' }} autoCapitalize="off" autoCorrect="off" spellCheck={false} data-testid="paste-text" />
      {error && <p className="text-blood text-sm mt-2" role="alert" data-testid="paste-error">{error}</p>}
      <div className="flex gap-2 mt-3 flex-wrap">
        <button className="btn btn-gold" style={{ minHeight: 44 }} disabled={!text.trim()} onClick={() => onLoad(text)} data-testid="btn-paste-load">Cargar</button>
        {canRead && <button className="btn" style={{ minHeight: 44 }} onClick={() => void fromClipboard()} data-testid="btn-paste-clipboard">Pegar del portapapeles</button>}
        <button className="btn" style={{ minHeight: 44 }} onClick={onClose}>Cancelar</button>
      </div>
    </Modal>
  );
}

function ConfirmImport({ pending, onClose }: { pending: { save: SaveData; summary: BackupSummaryEntry[]; at: number }; onClose: () => void }) {
  const roster = useGame((s) => s.roster);
  const acc = pending.save.account;
  const sharedItems = acc.shared.owned ? acc.shared.grid.filter(Boolean).length : 0;
  const when = new Date(pending.at).toLocaleString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return (
    <Modal onClose={onClose} wide testId="confirm-import">
      <h2 className="panel-title text-lg mb-2">¿Cargar esta copia?</h2>
      <p className="text-sm text-stone-300">Copia del <b className="text-parchment">{when}</b> · comprobada ✓</p>
      <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, pending.summary.length)}, minmax(0, 1fr))` }} data-testid="import-summary">
        {pending.summary.length ? pending.summary.map((c, i) => (
          <div key={i} className="panel p-2 text-center"><div className="font-display truncate">{c.name}</div><div className="text-xs text-stone-300">{c.className} · Nv {c.level}</div></div>
        )) : <div className="panel p-2 text-center text-stone-300">Sin personajes</div>}
      </div>
      <p className="text-xs text-stone-300 mt-2">
        Y además: {acc.skinsOwned.length} {acc.skinsOwned.length === 1 ? 'atuendo' : 'atuendos'}{acc.shared.owned ? `, página «Compartido» con ${sharedItems} ${sharedItems === 1 ? 'objeto' : 'objetos'}` : ''}.
      </p>
      {roster.length > 0 && (
        <div className="panel p-3 mt-3" style={{ borderColor: '#c4283b88' }}>
          <p className="font-body text-lg"><b className="text-blood">Sustituirá tu partida actual</b> ({roster.map((r) => `${r.name} Nv ${r.level}`).join(', ')}).</p>
          <p className="text-sm text-stone-300 mt-1">Antes la guardamos sola: podrás volver a ella con «Deshacer la última carga».</p>
        </div>
      )}
      <div className="flex gap-2 mt-4 flex-wrap">
        <button className="btn btn-gold" style={{ minHeight: 44 }} onClick={() => { sfx('equip'); void actions.importSave(pending.save); onClose(); }} data-testid="btn-confirm-import">Sí, cargar la copia</button>
        <button className="btn" style={{ minHeight: 44 }} onClick={onClose}>Cancelar</button>
      </div>
    </Modal>
  );
}

/** Descarga un texto como archivo (funciona en ordenador, Android y en iPhone/iPad, donde va a «Archivos»). */
function downloadText(text: string, fileName: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Copia al portapapeles; si el navegador no deja, prueba seleccionando el texto (iPhone antiguo, http…). */
async function copyText(text: string, area: HTMLTextAreaElement | null): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* sigue con el otro método */ }
  try {
    if (!area) return false;
    area.focus(); area.select(); area.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch { return false; }
}

const Px = ({ d, c = 'currentColor', s = 24 }: { d: string; c?: string; s?: number }) => <svg width={s} height={s} viewBox="0 0 12 12" shapeRendering="crispEdges" fill={c} aria-hidden><path d={d} /></svg>;
const IconDown = () => <Px d="M5 1h2v6h2v1H8v1H7v1H5V9H4V8H3V7h2zM1 10h1v1h8v-1h1v2H1z" />;
const IconUp = () => <Px d="M5 2h2v1h1v1h1v1H7v5H5V5H3V4h1V3h1zM1 10h1v1h8v-1h1v2H1z" />;
const IconCopy = () => <Px d="M3 1h6v1H4v7H3zM5 3h6v8H5zm1 1v6h4V4z" />;
const IconPaste = () => <Px d="M4 1h4v1h2v10H2V2h2zm1 1v1h2V2zM3 3v8h6V3H8v1H4V3zm1 3h4v1H4zm0 2h4v1H4z" />;
const IconShare = () => <Px d="M8 1h3v3H8V3H6v2H5V2h3zM1 4h3v1H2v5h6V8h1v3H1z" />;
const IconWarn = () => <Px s={30} c="#e8b33a" d="M5 1h2v1h1v2h1v2h1v2h1v3H1V8h1V6h1V4h1V2h1zm0 3v4h2V4zm0 5v1h2V9z" />;
