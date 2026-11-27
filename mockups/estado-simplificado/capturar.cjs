// Capturas de ESTADO (antes / resultado). node mockups/estado-simplificado/capturar.cjs <url /play/> <prefijo>
const { chromium, devices } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/'; const TAG = process.argv[3] || 'antes';
const OUT = path.join(__dirname, 'capturas');
const SIZES = { escritorio: { viewport: { width: 1920, height: 1080 } }, tableta: { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true }, movil: { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } } };
(async () => {
  const b = await chromium.launch();
  for (const [n, opt] of Object.entries(SIZES)) {
    const ctx = await b.newContext(opt); await ctx.addInitScript(() => localStorage.setItem('gv-consent', 'denied')); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const tap = (s) => (opt.hasTouch ? p.tap(s) : p.click(s));
    await p.goto(URL + '?debug'); await tap('[data-testid=btn-play]');
    await p.fill('[data-testid=name-input]', 'Beothord'); await tap('[data-testid=btn-create]'); await p.waitForTimeout(500);
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialSeen.dungeon = true; pr.tutorialSeen.lobby = true;
      const bp = [...pr.backpack]; const put = (id, q) => { const i = bp.findIndex((x) => !x); bp[i] = { itemId: id, qty: q }; };
      put('bandage', 2); put('splint', 1); put('ration', 2); put('water', 3);
      g.setState({ profile: { ...pr, backpack: bp, gold: 40, needs: { sat: 100, hyd: 24, rest: 70 } } }); });
    await tap('[data-testid=tab-estado]'); await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${TAG}-${n}-sano.png` });
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
      g.setState({ profile: { ...pr, wounds: { pct: { thorax: 0.55, armL: 0.4, legR: 0.7 }, fractures: ['armL'] } } }); });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${TAG}-${n}-herido.png` });
    console.log(TAG, n, errs.length ? errs : 'sin errores');
    await ctx.close();
  }
  await b.close();
})();
