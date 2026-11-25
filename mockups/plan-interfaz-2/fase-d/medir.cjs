// Fase D: recorre todas las vistas de los 8 mercaderes (tienda, vender, servicios, estación) en 6 tamaños, con estaciones en
// ruinas y reconstruidas, y anota: textos cortados, cosas fuera de pantalla, botones < 44 px (táctil), textos < 12 px.
// Uso (vite en 5174): node mockups/plan-interfaz-2/fase-d/medir.cjs [carpeta-capturas]
const { chromium } = require('playwright');
const OUT = process.argv[2] || __dirname + '/capturas';
require('fs').mkdirSync(OUT, { recursive: true });
const V = ['nira','vesper','garth','orik','grizk','brand','valerius','eldrin'];
const VIEWS = ['shop','sell','repair','contracts','infirmary','scrap','station','insure'];
const SIZES = [[1920,1080],[1366,768],[1280,720],[1180,820],[1024,768],[844,390],[667,375]].filter(([w]) => !process.env.SOLO || process.env.SOLO.split(',').includes(String(w)));
function audit(touch) {
  const vw = innerWidth, vh = innerHeight, out = { cut: [], off: [], small: [], tiny: [] };
  const vis = (r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh;
  const lbl = (e) => (e.getAttribute('data-testid') || e.textContent || '').trim().replace(/\s+/g,' ').slice(0, 30);
  for (const e of document.querySelectorAll('main *')) {
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const r = e.getBoundingClientRect(); if (!vis(r)) continue; const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    if (own && (cs.overflow.includes('hidden') || cs.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 2) out.cut.push(lbl(e));
    if (own && r.right > vw + 1) out.off.push(lbl(e));
    if (own && parseFloat(cs.fontSize) < 12) out.tiny.push(lbl(e) + ' ' + cs.fontSize);
    if (touch && e.matches('button,[role=button],input,select') && !e.disabled && (r.width < 43.5 || r.height < 43.5)) out.small.push(lbl(e) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  out.wide = document.documentElement.scrollWidth > vw + 1;
  return out;
}
(async () => { const b = await chromium.launch(); const all = {};
for (const built of [0, 1]) for (const [w,h] of SIZES) { const touch = w < 1200;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch }); const p = await ctx.newPage();
  await p.goto('http://localhost:5174/play/?debug'); await p.waitForSelector('[data-testid=btn-play]'); await p.click('[data-testid=btn-play]'); await p.waitForTimeout(500);
  if (await p.$('[data-testid=name-input]')) { await p.fill('[data-testid=name-input]','Aldric'); const c = await p.$('[data-testid=btn-create]') || await p.$('[data-testid=btn-confirm]'); if (c) await c.click(); }
  await p.waitForSelector('[data-testid=tab-play]');
  for (let i=0;i<4;i++){ const x = await p.$('[data-testid=btn-class-unlock-later]'); if(!x) break; await x.click(); await p.waitForTimeout(150); }
  await p.evaluate((built) => { const G = window.__GRAVEVOW__; G.dev.setLevel(30); const pr = G.getState().profile; const L = built ? 1 : 0;
    G.setState({ profile: { ...pr, gold: 5000, refuge: { ...(pr.refuge||{}), cot:L, kitchen:L, bench:L, forge:L, armory:L, infirmary:L, tannery:L, alchemy:L } } });
    for (const id of ['old_wood','leather_scrap']) G.dev.give(id, undefined, undefined, 5); }, built);
  await p.click('[data-testid=tab-merchants]');
  for (const v of V) {
    await p.click(`[data-testid=vendor-${v}]`); await p.waitForTimeout(200);
    for (const x of VIEWS) {
      const t = await p.$(`[data-testid=vendor-view-${x}]`); if (!t) continue;
      if (built === 0 && x !== 'station') { if (w !== 1920 && w !== 844) continue; }
      await t.click(); await p.waitForTimeout(250);
      const key = `${built ? 'hecha' : 'ruinas'} ${w}x${h} ${v} ${x}`;
      // Los clics de Playwright llegan como ratón y quitan el modo táctil: se simula un toque antes de medir
      if (touch) { await p.evaluate(() => window.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch' }))); await p.waitForTimeout(120); }
      const r = await p.evaluate(audit, touch);
      const n = r.cut.length + r.off.length + r.small.length + r.tiny.length + (r.wide ? 1 : 0);
      if (n) { all[key] = r; console.log(key, JSON.stringify(r).slice(0, 300)); }
      if (n || w === 1366) await p.screenshot({ path: `${OUT}/${key.replace(/ /g,'_')}.png` });
    }
    await p.click('[data-testid=vendor-back]'); await p.waitForTimeout(150);
  }
  await ctx.close(); }
require('fs').writeFileSync(OUT + '/hallazgos.json', JSON.stringify(all, null, 1));
await b.close(); console.log('pantallas con hallazgos:', Object.keys(all).length); })();
