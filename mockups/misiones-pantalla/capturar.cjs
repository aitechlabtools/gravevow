// Misiones en una pantalla: node mockups/misiones-pantalla/capturar.cjs [url] [carpeta]
const { chromium, devices } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/'; const OUT = path.join(__dirname, process.argv[3] || 'despues');
require('fs').mkdirSync(OUT, { recursive: true });
const SIZES = { escritorio: { viewport: { width: 1920, height: 1080 } }, portatil: { viewport: { width: 1440, height: 900 } }, tableta: { viewport: { width: 1180, height: 820 }, hasTouch: true }, movil: { ...devices['iPhone 13 landscape'] } };
(async () => {
  const b = await chromium.launch();
  for (const [n, opt] of Object.entries(SIZES)) {
    const ctx = await b.newContext(opt); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const tap = (s) => (opt.hasTouch ? p.tap(s) : p.click(s));
    await p.goto(URL + '?debug'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(600);
    await tap('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Pau'); await tap('[data-testid=btn-create]'); await p.waitForTimeout(400);
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialDone = true; g.setState({ tutorial: null, profile: { ...pr } }); });
    await tap('[data-testid=tab-quests]'); await p.waitForTimeout(300);
    for (const [v, id] of [['vesper', 'q_bones'], ['garth', 'q_garra_rats'], ['brand', 'q_brand_mine']]) { await tap(`[data-testid=quests-${v}]`); await tap(`[data-testid=accept-${id}]`).catch(() => {}); }
    await p.evaluate(() => { document.querySelectorAll('[data-testid^=toast], .toast').forEach((e) => e.remove()); });
    await p.waitForTimeout(3500); await p.screenshot({ path: `${OUT}/${n}.png` });
    // Un mercader sin encargos: los de Hermana Vesper se dan por cobrados
    await tap('[data-testid=quests-vesper]'); await p.waitForTimeout(200);
    const ids = await p.$$eval('[data-testid^=accept-]', (e) => e.map((x) => x.dataset.testid.slice(7)));
    await p.evaluate((ids) => { const g = window.__GRAVEVOW__, pr = g.getState().profile; const qs = pr.quests.map((q) => ids.includes(q.id) ? { ...q, claimed: true } : q);
      for (const id of ids) if (!qs.some((q) => q.id === id)) qs.push({ id, progress: 0, claimed: true }); g.setState({ profile: { ...pr, quests: qs } }); }, ids);
    await p.waitForTimeout(200);
    const none = await p.$('[data-testid^=quests-].none'); if (none) { await tap('[data-testid=quests-vesper]'); await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/${n}-sin-encargos.png` }); }
    const sc = await p.$eval('[data-testid=screen-quests]', (e) => e.scrollHeight > e.clientHeight + 2);
    console.log(n, 'scroll en pantalla:', sc, 'mercader vacío:', !!none, errs);
    await ctx.close();
  }
  await b.close();
})();
