// Jefes de zona en la última subzona: node mockups/jefes-ultima-subzona/capturar.cjs [carpeta]
const { chromium } = require('playwright'); const path = require('path');
const OUT = path.join(__dirname, process.argv[2] || 'despues'); require('fs').mkdirSync(OUT, { recursive: true });
const SIZES = { escritorio: { viewport: { width: 1920, height: 1080 } }, tableta: { viewport: { width: 1180, height: 820 }, hasTouch: true }, movil: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } };
(async () => { const b = await chromium.launch();
  for (const [n, opt] of Object.entries(SIZES)) { const c = await b.newContext(opt); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const tap = async (s) => { await p.waitForSelector(s); opt.hasTouch ? await p.tap(s) : await p.click(s); await p.waitForTimeout(400); };
    await p.goto('http://localhost:5173/play/?debug'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(600);
    await tap('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Pau'); await tap('[data-testid=btn-create]');
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialDone = true; pr.stats.expeditions = 3; pr.character.level = 35; pr.bossesDefeated = ['ossuary_lord'];
      pr.bestiary = { ...pr.bestiary, ossuary_lord: { seen: 3, kills: 3 }, mordrek: { seen: 2, kills: 2 } }; g.setState({ tutorial: null, profile: { ...pr } }); });
    await tap('[data-testid=tab-play]'); await tap('[data-testid=btn-zone-map]'); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${n}-mapa.png` }); await p.keyboard.press('Escape').catch(() => {});
    await p.goto('http://localhost:5173/play/?debug'); await p.waitForTimeout(800); await tap('[data-testid=btn-play]').catch(() => {});
    await tap('[data-testid=tab-bestiary]'); await tap('[data-testid=beast-ossuary_lord]'); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${n}-bestiario.png` });
    console.log(n, errs); await c.close(); }
  await b.close(); })();
