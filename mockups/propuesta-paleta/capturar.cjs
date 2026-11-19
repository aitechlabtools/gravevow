// Maqueta de la fase 0 (paleta) y de la propuesta de pestañas con icono y tienda del mercader, sobre el juego real.
// No cambia el código: inyecta estilos y retoques en la página solo para hacer las capturas.
// Uso (con «npx vite --port 5173» en marcha): node mockups/propuesta-paleta/capturar.cjs [url] [solo-formato]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const ONLY = process.argv[3];
const OUT = path.join(__dirname, 'capturas');
fs.mkdirSync(OUT, { recursive: true });

const SIZES = [
  { n: 'escritorio', vp: { width: 1920, height: 1080 }, touch: false },
  { n: 'tableta', vp: { width: 1180, height: 820 }, touch: true },
  { n: 'movil', vp: { width: 844, height: 390 }, touch: true },
].filter((s) => !ONLY || s.n === ONLY);

// ── Paletas ──────────────────────────────────────────────────────────
// Se sustituyen las variables de theme.css y se quitan degradados y sombras de paneles y botones.
const PALETTES = {
  actual: null,
  neutro: { void: '#0a0a0a', crypt: '#101010', s900: '#151515', s800: '#1b1b1b', s700: '#262626', s600: '#3a3a3a', s500: '#808080', s400: '#a6a6a6', s300: '#a6a6a6', parch: '#e4dfd4', bone: '#d8d3c8', hi: '#202020' },
  piedra: { void: '#0a090c', crypt: '#100f13', s900: '#151419', s800: '#1b1a20', s700: '#26242c', s600: '#3a3841', s500: '#82808a', s400: '#a7a4ae', s300: '#a7a4ae', parch: '#e6e0d2', bone: '#d9d3c4', hi: '#201e25' },
};
const paletteCss = (p) => `
:root {
  --color-void:${p.void}; --color-crypt:${p.crypt}; --color-stone-900:${p.s900}; --color-stone-800:${p.s800};
  --color-stone-700:${p.s700}; --color-stone-600:${p.s600}; --color-stone-500:${p.s500}; --color-stone-400:${p.s400};
  --color-stone-300:${p.s300}; --color-parchment:${p.parch}; --color-bone:${p.bone};
}
html, body, #root { background:${p.void} !important; }
[style*="radial-gradient"] { background:${p.void} !important; }
.panel { background:${p.s900} !important; border-color:${p.s600} !important; box-shadow:none !important; }
.panel-gold { border-color:#6b4a12 !important; }
.btn { background:${p.s800} !important; border:2px solid ${p.s600} !important; box-shadow:none !important; }
.btn:hover:not(:disabled) { background:${p.hi} !important; filter:none !important; }
.btn-gold { background:#cf9a2c !important; border-color:#cf9a2c !important; color:#1a1206 !important; }
.btn-danger { background:transparent !important; border-color:#ff6a5a !important; color:#ff6a5a !important; }
.btn:disabled { opacity:1 !important; color:${p.s500} !important; }
.slot { box-shadow:none !important; }
`;

// ── Iconos de pestaña: siluetas de un color en 12×12, como Apoyar y Discord (community.tsx) ──
const ICONS = {
  play: ['...XXXXXX...', '..XXXXXXXX..', '.XXX....XXX.', '.XX......XX.', 'XX........XX', 'XX........XX', 'XX......XXXX', 'XX......XXXX', 'XX....XXXXXX', 'XX....XXXXXX', 'XX..XXXXXXXX', 'XXXXXXXXXXXX'],
  character: ['.....XX.....', '....XXXX....', '...XX..XX...', '..XX....XX..', '.XX..XX..XX.', 'XX..XXXX..XX', 'XX..XXXX..XX', '.XX..XX..XX.', '..XX....XX..', '...XX..XX...', '....XXXX....', '.....XX.....'],
  stash: ['............', '..XXXXXXXX..', '.XX......XX.', 'XX........XX', 'XXXXXXXXXXXX', 'XXXXX..XXXXX', 'XXXXX..XXXXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XX........XX', '............'],
  merchants: ['XX.XX..XX.XX', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '.XXXX..XXXX.', '.XXX....XXX.', '.XXXX..XXXX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XXXX..XXXX.', '.XXX....XXX.', '.XXX....XXX.', 'XXXXXXXXXXXX'],
  quests: ['.....XX.....', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XX......XX.', '.XXXXXXXXXX.', '.XX.....XXX.', '.XXXXXXXXXX.', '.XX......XX.', '.XXXXXXXXXX.', '.XX....XXXX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.'],
  bestiary: ['...XXXXXX...', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XX..XX..XX.', '.XX..XX..XX.', '.XXXXXXXXXX.', '..XXX..XXX..', '...XXXXXX...', '...X.XX.X...', '...XXXXXX...', '............'],
  shop: ['...XX..XX...', '..XXXXXXXX..', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XX.XXXXXX.XX', '...XXXXXX...', '...XXXXXX...', '...XXXXXX...', '..XXXXXXXX..', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XXXXXXXXXX.'],
  lock: ['..XXX..', '.X...X.', '.X...X.', 'XXXXXXX', 'XXXXXXX', 'XXX.XXX', 'XXX.XXX', 'XXXXXXX', 'XXXXXXX'],
  coin: ['.XXXX.', 'XXXXXX', 'XXX.XX', 'XXX.XX', 'XXXXXX', '.XXXX.'],
};
const svg = (rows, px, color) => {
  const w = rows[0].length, h = rows.length; let r = '';
  rows.forEach((row, y) => { let x = 0; while (x < w) { if (row[x] !== 'X') { x++; continue; } let e = x; while (e < w && row[e] === 'X') e++; r += `<rect x="${x}" y="${y}" width="${e - x}" height="1"/>`; x = e; } });
  return `<svg class="pxi" width="${w * px}" height="${h * px}" viewBox="0 0 ${w} ${h}" fill="${color}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
};

const tabsCss = `
.ui-pills .pill { display:inline-flex; align-items:center; gap:8px; }
.ui-pills .pill .pxi { flex:none; }
@media (max-height:520px) {
  .ui-pills { gap:4px !important; }
  .ui-pills .pill { min-width:44px; justify-content:center; padding:0 10px !important; }
  .ui-pills .pill:not(.on) .lbl { display:none; }
  .ui-pills .pill.on { padding:0 12px !important; font-size:12px !important; }
}
`;
// Pestañas con icono (en el móvil, nombre solo en la activa)
async function tabs(p) {
  await p.evaluate(({ ICONS, svgSrc }) => {
    const svg = eval(svgSrc);
    document.querySelectorAll('.ui-pills .pill').forEach((b) => {
      b.querySelector('.pxi')?.remove();
      const id = b.getAttribute('data-testid').replace('tab-', '');
      const t = [...b.childNodes].find((n) => n.nodeType === 3);
      if (t && !b.querySelector('.lbl')) { const s = document.createElement('span'); s.className = 'lbl'; s.textContent = t.textContent; b.replaceChild(s, t); }
      const on = b.classList.contains('on');
      b.insertAdjacentHTML('afterbegin', svg(ICONS[id], 2, on ? '#1a1206' : 'currentColor'));
    });
  }, { ICONS, svgSrc: svg.toString() });
}

// Tienda: precio en texto con moneda, sin botón por fila; tocar una fila la elige y abre su ficha con «Comprar».
const shopCss = (phone) => `
[data-testid=merchant-stock] > div { cursor:pointer; min-height:${phone ? 56 : 60}px; border:2px solid transparent !important; background:var(--color-stone-900) !important; position:relative; }
[data-testid=merchant-stock] > div:hover { background:var(--color-stone-800) !important; }
[data-testid=merchant-stock] > div.sel { border-color:#cf9a2c !important; background:var(--color-stone-800) !important; }
[data-testid=merchant-stock] > div.sel::before { content:''; position:absolute; left:-7px; top:50%; width:10px; height:10px; background:#cf9a2c; transform:translateY(-50%) rotate(45deg); }
[data-testid=merchant-stock] > div.off { opacity:1 !important; }
[data-testid=merchant-stock] > div.off .truncate:first-child { color:var(--color-stone-500) !important; }
.mk-price { display:inline-flex; align-items:center; gap:6px; color:#e8b33a; font-size:${phone ? 15 : 17}px; font-weight:600; white-space:nowrap; padding-right:6px; }
.mk-price.no { color:var(--color-stone-500); }
.mk-lock { display:inline-flex; align-items:center; gap:6px; color:var(--color-stone-400); font-size:13px; white-space:nowrap; padding-right:6px; }
${phone ? `[data-testid=merchant-stock] { grid-template-columns:1fr 1fr !important; }
[data-testid=merchant-stock] .truncate { font-size:13px !important; }
[data-testid=merchant-stock] .text-xs { font-size:12px !important; }` : ''}
.mk-card { padding:14px; display:flex; flex-direction:column; gap:10px; }
.mk-card h3 { margin:0; font-family:var(--font-display); font-size:20px; letter-spacing:.04em; }
.mk-card .row { display:flex; gap:12px; align-items:center; }
.mk-card .stats { font-size:15px; color:var(--color-parchment); line-height:1.5; }
.mk-card .muted { color:var(--color-stone-400); font-size:14px; }
.mk-card .up { color:#5fd19a; }
.mk-buy { min-height:52px; width:100%; font-family:var(--font-display); letter-spacing:.1em; text-transform:uppercase; font-size:16px; }
.mk-overlay { position:fixed; inset:0; z-index:60; background:var(--color-void); display:flex; flex-direction:column; padding:10px max(10px, env(safe-area-inset-left)); }
.mk-back { min-height:44px; align-self:flex-start; background:transparent !important; border-color:transparent !important; font-family:var(--font-display); letter-spacing:.1em; text-transform:uppercase; }
`;
async function shop(p, phone, withCard) {
  await p.evaluate(({ ICONS, svgSrc, phone, withCard }) => {
    const svg = eval(svgSrc);
    // Fuera el título «Tienda de …» (repite la pestaña) y el oro repetido al pie de la mochila
    document.querySelectorAll('.panel-title, h2, h3, div').forEach((e) => { if (/^\s*◆?\s*Tienda de /i.test(e.textContent) && e.children.length <= 3 && e.textContent.length < 40) e.style.display = 'none'; });
    document.querySelectorAll('.panel').forEach((e) => { if (/^Oro\s*[\d.]+$/.test(e.textContent.replace(/\s+/g, ' ').trim())) e.style.display = 'none'; });
    const coin = svg(ICONS.coin, phone ? 2 : 3, 'currentColor');
    const rows = [...document.querySelectorAll('[data-testid=merchant-stock] > div')];
    rows.forEach((r) => {
      const b = r.querySelector('button[data-testid^=buy-]');
      const l = r.querySelector('[data-testid^=locked-]');
      if (b) { const n = (b.textContent.match(/(\d+)\s*oro/) || [])[1]; const no = /insuficiente/.test(b.textContent); b.insertAdjacentHTML('afterend', `<span class="mk-price ${no ? 'no' : ''}">${coin}${n}</span>`); b.style.display = 'none'; }
      if (l) { const t = l.textContent.replace('🔒', '').trim(); l.outerHTML = `<span class="mk-lock">${svg(ICONS.lock, 2, 'currentColor')}${t}</span>`; r.classList.add('off'); }
      if (/otra clase/.test(r.textContent)) r.classList.add('off');
    });
    if (!withCard) return;
    // Fila elegida: la segunda (Espada de hierro)
    const sel = rows[1]; sel.classList.add('sel');
    const name = sel.querySelector('.truncate'); const stats = sel.querySelector('.text-xs');
    const price = (sel.querySelector('.mk-price') || {}).textContent || '';
    const icon = sel.querySelector('.slot').outerHTML;
    const body = `
      <div class="row">${icon.replace('class="slot"', 'class="slot" style="width:64px;height:64px;border-color:' + name.style.color + '"')}<div><h3 style="color:${name.style.color}">${name.textContent}</h3><div class="muted">Arma · mano derecha · ${stats.textContent.split('·')[0].trim()}</div></div></div>
      <div class="stats">${stats.textContent.split('·').slice(1).join('·').trim()}</div>
      <div class="muted">Frente a tu Espada oxidada: <span class="up">▲ +3 atk · ▲ +2 crit</span></div>
      <div class="muted">Ataques: Tajo · Estocada</div>
      <button class="btn btn-gold mk-buy">Comprar · ${price} oro</button>`;
    if (phone) {
      document.body.insertAdjacentHTML('beforeend', `<div class="mk-overlay"><button class="btn mk-back">◂ Volver</button><div class="mk-card panel" style="flex:1;overflow:auto">${body}</div></div>`);
    } else {
      // Escritorio y tableta: la ficha encima de la mochila, en la columna derecha
      const side = document.querySelector('[data-testid=vendor-interior]').lastElementChild;
      side.insertAdjacentHTML('afterbegin', `<div class="panel mk-card" style="margin-bottom:var(--gap)">${body}</div>`);
    }
  }, { ICONS, svgSrc: svg.toString(), phone, withCard });
}

async function run(s) {
  const b = await chromium.launch();
  const phone = s.n === 'movil';
  for (const [pal, pv] of Object.entries(PALETTES)) {
    const ctx = await b.newContext({ viewport: s.vp, hasTouch: s.touch, isMobile: s.touch, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('gv-consent', '{"analytics":false}'); } catch {} });
    const p = await ctx.newPage();
    const G = (f, a) => p.evaluate(f, a);
    const dismiss = async () => { for (let i = 0; i < 4; i++) { const x = await p.$('[data-testid=btn-class-unlock-later]'); if (!x) break; await x.click().catch(() => {}); await p.waitForTimeout(200); } };
    const act = async (id) => { const sel = `[data-testid=${id}]`; await p.waitForSelector(sel, { timeout: 5000 }); await dismiss(); if (s.touch) await p.tap(sel); else await p.click(sel); await p.waitForTimeout(300); };
    const style = async (css) => p.addStyleTag({ content: css });
    const shot = async (name) => { await p.waitForTimeout(350); await p.screenshot({ path: path.join(OUT, `${s.n}-${pal}-${name}.png`) }); console.log(s.n, pal, name); };

    await p.goto(URL + '?debug');
    await G(() => indexedDB.deleteDatabase('gravevow'));
    await p.reload(); await p.waitForTimeout(700);
    await act('btn-play');
    await p.fill('[data-testid=name-input]', 'Aldric');
    await act('btn-create');
    await p.waitForSelector('[data-testid=tab-play]');
    await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.gold = 4860; pr.stats.expeditions = 3; pr.character.level = 45; pr.tutorialDone = true; g.setState({ tutorial: null, profile: { ...pr } }); });
    await dismiss();
    if (pv) await style(paletteCss(pv));

    // 1) Solo paleta (para comparar las tres)
    await act('tab-merchants'); await shot('a-bastion');
    await act('vendor-nira'); await shot('b-tienda');
    await act('tab-stash'); await shot('c-alijo');

    // 2) Propuesta de pestañas y tienda (solo con las paletas nuevas; la «actual» es el antes)
    if (pv) {
      await style(tabsCss + shopCss(phone));
      await act('tab-play'); await tabs(p); await shot('d-pestanas');
      await act('tab-merchants'); await act('vendor-nira'); await tabs(p); await shop(p, phone, false); await shot('e-tienda-nueva');
      await act('tab-stash'); await act('tab-merchants'); await act('vendor-nira'); await tabs(p); await shop(p, phone, true); await shot('f-tienda-ficha');
    } else {
      await act('tab-play'); await shot('d-pestanas');
    }

    // 3) Combate (paleta)
    await p.evaluate(() => document.querySelectorAll('.mk-overlay').forEach((e) => e.remove()));
    await G(async () => { await window.__GRAVEVOW__.actions.enterDungeon('afueras'); });
    await p.waitForTimeout(1500);
    await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_x', 'skeleton'));
    for (let i = 0; i < 40 && !(await p.$('[data-testid=act-attack]:not([disabled])')); i++) await p.waitForTimeout(150);
    await shot('g-combate');
    await ctx.close();
  }
  await b.close();
}

(async () => { for (const s of SIZES) await run(s); })();
