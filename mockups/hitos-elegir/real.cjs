// Captura la pestaña Personaje real a nivel 20 (hito por elegir): node mockups/hitos-elegir/real.cjs
const { chromium, devices } = require('playwright'); const path = require('path');
const URL = 'http://localhost:5173/play/'; const OUT = path.join(__dirname, 'real');
require('fs').mkdirSync(OUT, { recursive: true });
const SIZES = { escritorio: { viewport: { width: 1920, height: 1080 } }, tableta: { viewport: { width: 1180, height: 820 }, hasTouch: true }, movil: { ...devices['iPhone 13 landscape'] } };
(async () => {
  const b = await chromium.launch();
  for (const [n, opt] of Object.entries(SIZES)) {
    const ctx = await b.newContext(opt); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const tap = (s) => (opt.hasTouch ? p.tap(s) : p.click(s));
    const dismiss = async () => { for (let i = 0; i < 4; i++) { const x = await p.$('[data-testid=btn-class-unlock-later]'); if (!x) break; await x.click().catch(() => {}); await p.waitForTimeout(200); } };
    await p.goto(URL + '?debug'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(600);
    await tap('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Pau'); await tap('[data-testid=btn-create]'); await p.waitForTimeout(400);
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialDone = true;
      g.setState({ tutorial: null, profile: { ...pr, character: { ...pr.character, level: 20, xp: 0 } } }); });
    await dismiss(); await tap('[data-testid=tab-character]'); await p.waitForTimeout(400); await dismiss();
    await p.screenshot({ path: `${OUT}/${n}.png` });
    const c = await p.$('[data-testid=class-path] [data-state=choose]');
    if (c) { await c.scrollIntoViewIfNeeded(); opt.hasTouch ? await c.tap() : await c.click(); await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/${n}-elegida.png` }); }
    const btn = await p.$('[data-testid^=btn-unlock-class-]'); if (btn) { await btn.click(); await p.waitForTimeout(300); }
    console.log(n, 'elegida:', !!c, 'confirmada:', !!btn, 'pendientes tras elegir:', await p.$$eval('[data-state=choose]', (e) => e.length), errs);
    await ctx.close();
  }
  await b.close();
})();
