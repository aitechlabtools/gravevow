// Capturas de la pestaña Habilidades y de «Ver detalles»: node mockups/habilidades/capturar.cjs [http://localhost:5173/play/]
const { chromium, devices } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = path.join(__dirname, 'capturas');
const SIZES = { escritorio: { viewport: { width: 1920, height: 1080 } }, tableta: { viewport: { width: 1180, height: 820 }, hasTouch: true }, movil: { ...devices['iPhone 13 landscape'] } };
(async () => {
  const b = await chromium.launch();
  for (const [n, opt] of Object.entries(SIZES)) {
    const ctx = await b.newContext(opt); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const tap = (s) => (opt.hasTouch ? p.tap(s) : p.click(s));
    await p.goto(URL + '?debug'); await tap('[data-testid=btn-play]');
    await p.fill('[data-testid=name-input]', 'Pau'); await tap('[data-testid=btn-create]'); await p.waitForTimeout(400);
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialSeen.dungeon = true; pr.tutorialSeen.lobby = true;
      g.setState({ profile: { ...pr, character: { ...pr.character, level: 5, xp: 204 }, stats: { ...pr.stats, expeditions: 3, extractions: 2, kills: 41 } } }); });
    await tap('[data-testid=tab-character]'); await p.waitForTimeout(400);
    await p.click('[data-testid=atk-basic]').catch(() => {});
    await p.screenshot({ path: `${OUT}/${n}-habilidades.png` });
    if (await p.$('[data-testid=character-seg]')) { await tap('[data-testid=character-seg] button:nth-child(2)'); await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/${n}-clase.png` }); }
    await tap('[data-testid=tab-stash]'); await p.waitForTimeout(300);
    if (n === 'movil') await tap('[data-testid=seg-status]').catch(() => {});
    await p.waitForTimeout(200);
    await tap('[data-testid=btn-hero-details]'); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${n}-detalles.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    console.log(n, (await p.$('[data-testid=hero-details]')) ? 'NO cierra con Escape' : 'cierra con Escape', errs);
    await ctx.close();
  }
  await b.close();
})();
