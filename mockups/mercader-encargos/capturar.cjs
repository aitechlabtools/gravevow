// Aviso de encargos dentro del mercader: node mockups/mercader-encargos/capturar.cjs
const { chromium, devices } = require('playwright'); const path = require('path');
const OUT = path.join(__dirname, 'propuesta'); require('fs').mkdirSync(OUT, { recursive: true });
const SIZES = { escritorio: { viewport: { width: 1920, height: 1080 } }, tableta: { viewport: { width: 1180, height: 820 }, hasTouch: true }, movil: { ...devices['iPhone 13 landscape'] } };
(async () => {
  const b = await chromium.launch();
  for (const [n, opt] of Object.entries(SIZES)) {
    const ctx = await b.newContext(opt); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const tap = async (s) => { await p.waitForSelector(s); opt.hasTouch ? await p.tap(s) : await p.click(s); await p.waitForTimeout(300); };
    await p.goto('http://localhost:5173/play/?debug'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(600);
    await tap('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Pau'); await tap('[data-testid=btn-create]');
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialDone = true; g.setState({ tutorial: null, profile: { ...pr } }); });
    await tap('[data-testid=tab-quests]'); await tap('[data-testid=quests-garth]'); await tap('[data-testid=accept-q_garra_rats]');
    await tap('[data-testid=tab-merchants]'); await tap('[data-testid=vendor-garth]'); await p.waitForTimeout(3500);
    await p.screenshot({ path: `${OUT}/${n}-garth.png` });
    await tap('[data-testid=vendor-quests-link]'); await p.waitForTimeout(300);
    const sel = await p.$eval('[data-testid=quests-garth]', (e) => e.getAttribute('aria-selected'));
    await p.screenshot({ path: `${OUT}/${n}-misiones.png` });
    console.log(n, 'abre Misiones con Garth elegido:', sel, errs); await ctx.close();
  }
  await b.close();
})();
