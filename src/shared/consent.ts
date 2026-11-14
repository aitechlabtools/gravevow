// Consentimiento de cookies y Google Tag Manager, común a la web, el juego y las páginas legales.
// Aviso con «Rechazar», «Configurar» y «Aceptar»; «Configurar» abre un panel por finalidades.
// GTM solo se carga si se acepta alguna finalidad opcional. La elección se guarda en localStorage
// ('gv-consent', JSON) y se cambia con openConsent() (pie de la web, Ajustes del juego y página de cookies).
// Modo de consentimiento v2 de Google: todo «denied» por defecto; se concede solo lo que se acepta.
//
// Para añadir publicidad en el futuro: añade { id: 'ads', … } a CATEGORIES (con sus señales
// ad_storage, ad_user_data y ad_personalization) y actualiza las políticas de cookies y privacidad.

export const GTM_ID = 'GTM-WJNS8GH8';
const KEY = 'gv-consent';

type CatId = 'analytics' | 'ads';
type Category = { id: CatId; title: string; desc: string; signals: string[] };

const CATEGORIES: Category[] = [
  { id: 'analytics', title: 'Análisis', desc: 'Google Analytics, a través de Google Tag Manager: cuántas personas visitan la web y cómo se juega, de forma agregada.', signals: ['analytics_storage'] },
];
const ALL_SIGNALS = ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization'];

type Choice = Partial<Record<CatId, boolean>>;

declare global {
  interface Window { dataLayer: unknown[]; gtag?: (...a: unknown[]) => void }
}

function read(): Choice | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v === null) return null;
    if (v === 'granted') return { analytics: true };   // formato del primer día
    if (v === 'denied') return { analytics: false };
    const o = JSON.parse(v) as Choice;
    // Si aparece una finalidad nueva sin respuesta, se vuelve a preguntar.
    return CATEGORIES.every((c) => typeof o[c.id] === 'boolean') ? o : null;
  } catch { return null; }
}
function write(v: Choice) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* sin almacenamiento: se volverá a preguntar */ } }

// eslint-disable-next-line prefer-rest-params
function gtag(..._a: unknown[]) { window.dataLayer.push(arguments); }

const anyOn = (c: Choice) => CATEGORIES.some((k) => c[k.id]);

let loaded = false;
let applied: Choice = {};
function apply(c: Choice) {
  applied = c;
  if (!anyOn(c)) return;
  const upd: Record<string, string> = {};
  for (const k of CATEGORIES) if (c[k.id]) for (const s of k.signals) upd[s] = 'granted';
  gtag('consent', 'update', upd);
  if (loaded) return;
  loaded = true;
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(s);
}

function save(c: Choice) {
  const revoked = loaded && CATEGORIES.some((k) => applied[k.id] && !c[k.id]);
  write(c); close();
  if (revoked) location.reload(); // retirar un permiso: recargar para descargar GTM
  else apply(c);
}

const CSS = `
.gv-cc{position:fixed;z-index:2147483000;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);
width:min(600px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;box-sizing:border-box;background:#0d0b12;color:#d8cfc0;
border:1px solid #4a2a2a;box-shadow:0 10px 40px #000c;padding:14px 16px;font:14px/1.45 system-ui,sans-serif}
.gv-cc p{margin:0}
.gv-cc strong{color:#e8b25a;font-weight:600}
.gv-cc a{color:#c9a46a}
.gv-cc-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px}
.gv-cc-row>p{flex:1 1 260px}
.gv-cc-b{display:flex;flex-wrap:wrap;gap:8px;flex:0 0 auto}
.gv-cc button{min-height:44px;min-width:100px;padding:0 14px;font:600 14px system-ui,sans-serif;cursor:pointer;border:1px solid #6b3a3a;background:#1a1218;color:#d8cfc0}
.gv-cc button:hover{border-color:#b04545;color:#fff}
.gv-cc button:focus-visible,.gv-cc input:focus-visible+span{outline:2px solid #e8b25a;outline-offset:2px}
.gv-cc-cat{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid #2a1c22}
.gv-cc-cat div{flex:1}
.gv-cc-cat small{display:block;color:#a99f90;font-size:12.5px}
.gv-cc-sw{position:relative;display:inline-flex;align-items:center;min-height:44px;min-width:56px;justify-content:center;cursor:pointer}
.gv-cc-sw input{position:absolute;opacity:0;width:1px;height:1px}
.gv-cc-sw span{width:44px;height:24px;border-radius:12px;background:#2a2026;border:1px solid #6b3a3a;position:relative;transition:background .15s}
.gv-cc-sw span::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#a99f90;transition:left .15s}
.gv-cc-sw input:checked+span{background:#7a2a2a}
.gv-cc-sw input:checked+span::after{left:23px;background:#f1e6d4}
.gv-cc-sw input:disabled+span{opacity:.6;cursor:default}
.gv-cc-foot{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:8px}
@media (max-height:500px){.gv-cc{padding:10px 12px;font-size:13px}.gv-cc-row>p{flex-basis:200px}.gv-cc-cat{padding:4px 0}}`;

function cookiesHref() {
  return location.pathname.includes('/play/') ? '../cookies.html' : './cookies.html';
}

function close() { document.getElementById('gv-cc')?.remove(); }

function mainView() {
  return `<div class="gv-cc-row"><p><strong>Antes de bajar a la cripta…</strong> Usamos cookies de análisis (Google Analytics) para saber cómo se juega y mejorar Gravevow. Solo se cargan si aceptas. <a href="${cookiesHref()}" target="_blank" rel="noopener">Más información</a></p>
<div class="gv-cc-b"><button type="button" data-a="reject" data-testid="cookie-reject">Rechazar</button><button type="button" data-a="config" data-testid="cookie-config">Configurar</button><button type="button" data-a="accept" data-testid="cookie-accept">Aceptar</button></div></div>`;
}

function sw(id: string, on: boolean, disabled = false, label = '') {
  return `<label class="gv-cc-sw"><input type="checkbox" ${id ? `data-cat="${id}" data-testid="cookie-cat-${id}"` : ''} ${on ? 'checked' : ''} ${disabled ? 'disabled' : ''} aria-label="${label}"><span></span></label>`;
}

function configView() {
  const cur = read() ?? {};
  const cats = CATEGORIES.map((c) => `<div class="gv-cc-cat"><div><strong>${c.title}</strong><small>${c.desc}</small></div>${sw(c.id, !!cur[c.id], false, c.title)}</div>`).join('');
  return `<p style="margin-bottom:6px"><strong>Configurar cookies</strong> · <a href="${cookiesHref()}" target="_blank" rel="noopener">Política de cookies</a></p>
<div class="gv-cc-cat"><div><strong>Técnicas</strong><small>Tu partida y esta elección. Necesarias para jugar: siempre activas.</small></div>${sw('', true, true, 'Técnicas, siempre activas')}</div>
${cats}
<div class="gv-cc-foot"><button type="button" data-a="reject" data-testid="cookie-reject">Rechazar todo</button><button type="button" data-a="save" data-testid="cookie-save">Guardar</button><button type="button" data-a="accept" data-testid="cookie-accept">Aceptar todo</button></div>`;
}

const all = (v: boolean): Choice => Object.fromEntries(CATEGORIES.map((c) => [c.id, v]));

/** Muestra el aviso. Con config=true abre directamente el panel por finalidades. */
export function openConsent(config = false) {
  close();
  if (!document.getElementById('gv-cc-css')) {
    const st = document.createElement('style'); st.id = 'gv-cc-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  const box = document.createElement('div');
  box.id = 'gv-cc'; box.className = 'gv-cc'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Aviso de cookies');
  box.dataset.testid = 'cookie-banner';
  box.innerHTML = config === true ? configView() : mainView();
  box.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('button')?.dataset.a;
    if (a === 'accept') save(all(true));
    else if (a === 'reject') save(all(false));
    else if (a === 'config') { box.innerHTML = configView(); box.querySelector<HTMLInputElement>('input[data-cat]')?.focus(); }
    else if (a === 'save') {
      const c: Choice = {};
      box.querySelectorAll<HTMLInputElement>('input[data-cat]').forEach((i) => { c[i.dataset.cat as CatId] = i.checked; });
      save(c);
    }
  });
  document.body.appendChild(box);
}

/** Abre el panel de configuración (botones «Configurar cookies»). */
export function openConsentSettings() { openConsent(true); }

/** Llamar una vez al arrancar cada página. */
export function initConsent() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = gtag;
  gtag('consent', 'default', Object.fromEntries(ALL_SIGNALS.map((s) => [s, 'denied'])));
  gtag('js', new Date());
  const c = read();
  if (c) apply(c);
  else if (document.body) openConsent(); else window.addEventListener('DOMContentLoaded', () => openConsent(), { once: true });
}
