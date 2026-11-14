// Consentimiento de cookies y Google Tag Manager, común a la web, el juego y las páginas legales.
// GTM solo se carga si el visitante pulsa «Aceptar». La elección se guarda en localStorage
// ('gv-consent') y se puede cambiar con openConsent() (pie de la web, Ajustes del juego y página de cookies).
// Además se usa el modo de consentimiento v2 de Google: todo «denied» por defecto y «granted» al aceptar.

export const GTM_ID = 'GTM-WJNS8GH8';
const KEY = 'gv-consent';
type Choice = 'granted' | 'denied';

declare global {
  interface Window { dataLayer: unknown[]; gtag?: (...a: unknown[]) => void }
}

function read(): Choice | null {
  try { const v = localStorage.getItem(KEY); return v === 'granted' || v === 'denied' ? v : null; } catch { return null; }
}
function write(v: Choice) { try { localStorage.setItem(KEY, v); } catch { /* sin almacenamiento: se volverá a preguntar */ } }

// eslint-disable-next-line prefer-rest-params
function gtag(..._a: unknown[]) { window.dataLayer.push(arguments); }

let loaded = false;
function loadGtm() {
  if (loaded) return;
  loaded = true;
  gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(s);
}

const CSS = `
.gv-cc{position:fixed;z-index:2147483000;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);
width:min(560px,calc(100vw - 24px));box-sizing:border-box;background:#0d0b12;color:#d8cfc0;border:1px solid #4a2a2a;
box-shadow:0 10px 40px #000c;padding:14px 16px;font:14px/1.45 system-ui,sans-serif;display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px}
.gv-cc p{margin:0;flex:1 1 260px}
.gv-cc strong{color:#e8b25a;font-weight:600}
.gv-cc a{color:#c9a46a}
.gv-cc .gv-cc-b{display:flex;gap:8px;flex:0 0 auto}
.gv-cc button{min-height:44px;min-width:104px;padding:0 14px;font:600 14px system-ui,sans-serif;cursor:pointer;border:1px solid #6b3a3a;background:#1a1218;color:#d8cfc0}
.gv-cc button:hover{border-color:#b04545;color:#fff}
.gv-cc button:focus-visible{outline:2px solid #e8b25a;outline-offset:2px}
@media (max-height:500px){.gv-cc{padding:10px 12px;font-size:13px}.gv-cc p{flex-basis:200px}}`;

function cookiesHref() {
  return location.pathname.includes('/play/') ? '../cookies.html' : './cookies.html';
}

function close() { document.getElementById('gv-cc')?.remove(); }

/** Muestra el aviso (también para cambiar una elección ya hecha). */
export function openConsent() {
  if (document.getElementById('gv-cc')) return;
  if (!document.getElementById('gv-cc-css')) {
    const st = document.createElement('style'); st.id = 'gv-cc-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  const box = document.createElement('div');
  box.id = 'gv-cc'; box.className = 'gv-cc'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Aviso de cookies');
  box.dataset.testid = 'cookie-banner';
  box.innerHTML = `<p><strong>Antes de bajar a la cripta…</strong> Usamos cookies de análisis (Google Tag Manager) para saber cómo se juega y mejorar Gravevow. Solo se cargan si aceptas. <a href="${cookiesHref()}" target="_blank" rel="noopener">Más información</a></p>
<div class="gv-cc-b"><button type="button" data-c="denied" data-testid="cookie-reject">Rechazar</button><button type="button" data-c="granted" data-testid="cookie-accept">Aceptar</button></div>`;
  box.addEventListener('click', (e) => {
    const c = (e.target as HTMLElement).closest('button')?.dataset.c as Choice | undefined;
    if (!c) return;
    const before = read();
    write(c); close();
    if (c === 'granted') loadGtm();
    else if (before === 'granted' && loaded) location.reload(); // retirar el consentimiento descarga GTM
  });
  document.body.appendChild(box);
}

/** Llamar una vez al arrancar cada página. */
export function initConsent() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = gtag;
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
  gtag('js', new Date());
  const c = read();
  if (c === 'granted') loadGtm();
  else if (c === null) {
    if (document.body) openConsent(); else window.addEventListener('DOMContentLoaded', openConsent, { once: true });
  }
}
