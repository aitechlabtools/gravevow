// Se ejecuta dentro de la página (addInitScript) en cada carga: añade los estilos de la fase 1 y decora las pestañas.
// Lo que aquí es CSS inyectado, en la implementación irá a theme.css, game.css, kit/PillBar.tsx y uiIcons.ts.
module.exports = function inyectar() {
  const P = { void: '#0a090c', crypt: '#100f13', s900: '#151419', s800: '#1b1a20', s700: '#26242c', s600: '#3a3841', s500: '#82808a', s400: '#a7a4ae', s300: '#a7a4ae', parch: '#e6e0d2', bone: '#d9d3c4', hi: '#201e25', gold: '#cf9a2c' };
  const css = `
:root { --color-void:${P.void}; --color-crypt:${P.crypt}; --color-stone-900:${P.s900}; --color-stone-800:${P.s800};
  --color-stone-700:${P.s700}; --color-stone-600:${P.s600}; --color-stone-500:${P.s500}; --color-stone-400:${P.s400};
  --color-stone-300:${P.s300}; --color-parchment:${P.parch}; --color-bone:${P.bone}; }
html, body, #root { background:${P.void} !important; }
[style*="radial-gradient"] { background:${P.void} !important; }
.panel { background:${P.s900} !important; border-color:${P.s600} !important; box-shadow:none !important; }
.panel-gold { border-color:#6b4a12 !important; }
.btn { background:${P.s800} !important; border:2px solid ${P.s600} !important; box-shadow:none !important; }
.btn:not(.btn-gold):not(.btn-danger):not(.btn-arcane):hover:not(:disabled) { background:${P.hi} !important; filter:none !important; }
.btn-gold:hover:not(:disabled) { background:#dcaa3e !important; filter:none !important; }
.btn-gold { background:${P.gold} !important; border-color:${P.gold} !important; color:#1a1206 !important; }
.btn-danger { background:transparent !important; border-color:#ff6a5a !important; color:#ff6a5a !important; }
.btn-arcane { background:transparent !important; border-color:#a35ae0 !important; color:#d6a8ff !important; }
.btn:disabled { opacity:1 !important; color:${P.s500} !important; }
.slot { box-shadow:none !important; }
.ui-pills .pill { display:inline-flex; align-items:center; gap:8px; }
.ui-pills .pill .pxi { flex:none; }
@media (max-height:520px) {
  .ui-nav { display:grid !important; grid-template-columns:minmax(max-content,1fr) minmax(0,max-content) minmax(max-content,1fr) !important; gap:8px !important; }
  .ui-pills { flex:initial !important; gap:4px !important; }
  .ui-pills > .pill:first-child { margin-left:0 !important; }
  .ui-pills .pill { min-width:44px; justify-content:center; padding:0 10px !important; }
  .ui-pills .pill:not(.on) .lbl { display:none; }
  .ui-pills .pill.on { padding:0 12px !important; font-size:12px !important; }
}
@media (max-height:520px) and (max-width:800px) {
  .ui-nav [data-testid=nav-chip] > div:last-child { display:none; }
  .ui-nav > div:last-child > :nth-child(2) { display:none !important; }
}`;
  const ICONS = {
    play: ['...XXXXXX...', '..XXXXXXXX..', '.XXX....XXX.', '.XX......XX.', 'XX........XX', 'XX........XX', 'XX......XXXX', 'XX......XXXX', 'XX....XXXXXX', 'XX....XXXXXX', 'XX..XXXXXXXX', 'XXXXXXXXXXXX'],
    character: ['.....XX.....', '....XXXX....', '...XX..XX...', '..XX....XX..', '.XX..XX..XX.', 'XX..XXXX..XX', 'XX..XXXX..XX', '.XX..XX..XX.', '..XX....XX..', '...XX..XX...', '....XXXX....', '.....XX.....'],
    stash: ['............', '..XXXXXXXX..', '.XX......XX.', 'XX........XX', 'XXXXXXXXXXXX', 'XXXXX..XXXXX', 'XXXXX..XXXXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XX........XX', '............'],
    merchants: ['XX.XX..XX.XX', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '.XXXX..XXXX.', '.XXX....XXX.', '.XXXX..XXXX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XXXX..XXXX.', '.XXX....XXX.', '.XXX....XXX.', 'XXXXXXXXXXXX'],
    quests: ['.....XX.....', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XX......XX.', '.XXXXXXXXXX.', '.XX.....XXX.', '.XXXXXXXXXX.', '.XX......XX.', '.XXXXXXXXXX.', '.XX....XXXX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.'],
    bestiary: ['...XXXXXX...', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XX..XX..XX.', '.XX..XX..XX.', '.XXXXXXXXXX.', '..XXX..XXX..', '...XXXXXX...', '...X.XX.X...', '...XXXXXX...', '............'],
    shop: ['...XX..XX...', '..XXXXXXXX..', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XX.XXXXXX.XX', '...XXXXXX...', '...XXXXXX...', '...XXXXXX...', '..XXXXXXXX..', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XXXXXXXXXX.'],
  };
  const svg = (rows, px, color) => {
    const w = rows[0].length, h = rows.length; let r = '';
    rows.forEach((row, y) => { let x = 0; while (x < w) { if (row[x] !== 'X') { x++; continue; } let e = x; while (e < w && row[e] === 'X') e++; r += `<rect x="${x}" y="${y}" width="${e - x}" height="1"/>`; x = e; } });
    return `<svg class="pxi" width="${w * px}" height="${h * px}" viewBox="0 0 ${w} ${h}" fill="${color}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
  };
  const decorate = () => {
    document.querySelectorAll('.ui-pills .pill').forEach((b) => {
      const id = (b.getAttribute('data-testid') || '').replace('tab-', '');
      if (!ICONS[id]) return;
      const on = b.classList.contains('on');
      const want = on ? 'on' : 'off';
      if (b.dataset.mk === want) return;
      b.dataset.mk = want;
      b.querySelector('.pxi')?.remove();
      const t = [...b.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      if (t) { const s = document.createElement('span'); s.className = 'lbl'; s.textContent = t.textContent; b.replaceChild(s, t); }
      b.insertAdjacentHTML('afterbegin', svg(ICONS[id], 2, on ? '#1a1206' : 'currentColor'));
    });
  };
  const start = () => {
    const st = document.createElement('style'); st.textContent = css; document.head.append(st);
    new MutationObserver(decorate).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    decorate();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
};
