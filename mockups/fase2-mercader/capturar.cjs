// Fase 2 (interior del mercader): capturas de Nira (Tienda, ficha, Vender, Reparar, Curtiduría) en los tres formatos.
// Uso: node capturar.cjs <url> <carpeta>   (antes: el juego real en :5173 · después: la copia con la maqueta en :5174)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = path.join(__dirname, process.argv[3] || 'antes');
fs.mkdirSync(OUT, { recursive: true });
const SIZES = [
  { n: 'escritorio', vp: { width: 1920, height: 1080 }, touch: false },
  { n: 'tableta', vp: { width: 1180, height: 820 }, touch: true },
  { n: 'movil', vp: { width: 844, height: 390 }, touch: true },
];
(async () => {
  for (const s of SIZES) {
    const b = await chromium.launch();
    const ctx = await b.newContext({ viewport: s.vp, hasTouch: s.touch, isMobile: s.touch, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('gv-consent', '{"analytics":false}'); } catch {} });
    if (process.env.VB) await ctx.addInitScript((v) => { try { localStorage.setItem('mock-vb', v); } catch {} }, process.env.VB);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log('ERROR', e.message));
    const G = (f) => p.evaluate(f);
    const dismiss = async () => { for (let i = 0; i < 4; i++) { const x = await p.$('[data-testid=btn-class-unlock-later]'); if (!x) break; await x.click().catch(() => {}); await p.waitForTimeout(200); } };
    const act = async (id) => { const sel = `[data-testid=${id}]`; await p.waitForSelector(sel, { timeout: 5000 }); await dismiss(); if (s.touch) await p.tap(sel); else await p.click(sel); await p.waitForTimeout(300); };
    const shot = async (n) => { await p.waitForTimeout(400); await p.screenshot({ path: path.join(OUT, `${s.n}-${n}.png`) }); console.log(s.n, n); };
    const tryShot = async (n, fn) => { try { await fn(); await shot(n); } catch (e) { console.log(s.n, n, 'NO SALE:', e.message.split('\n')[0]); } };
    await p.goto(URL + '?debug');
    await G(() => indexedDB.deleteDatabase('gravevow'));
    await p.reload(); await p.waitForTimeout(700);
    await act('btn-play'); await p.fill('[data-testid=name-input]', 'Aldric'); await act('btn-create');
    await p.waitForSelector('[data-testid=tab-play]');
    await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.gold = 4860; pr.stats.expeditions = 3; pr.character.level = 45; pr.tutorialDone = true; g.setState({ tutorial: null, profile: { ...pr } }); });
    await dismiss();
    await tryShot('1-tienda', async () => { await act('tab-merchants'); await act('vendor-nira'); });
    await tryShot('2-ficha', async () => {
      const row = await p.$('[data-testid=shop-row-iron_sword]') || await p.$('[data-testid^=shop-row-]:nth-child(2)');
      if (!row) throw new Error('sin filas (antes)'); if (s.touch) await row.tap(); else await row.click();
    });
    if (s.n === 'movil') { const c = await p.$('[data-testid=shop-card-close]'); if (c) await c.tap(); }
    await tryShot('3-vender', () => act('vendor-view-sell'));
    await tryShot('4-reparar', () => act('vendor-view-repair'));
    await tryShot('5-curtiduria', () => act('vendor-view-station'));
    await b.close();
  }
})();
