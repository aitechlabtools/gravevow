// Mochilas de 24, 30 y 36 casillas en el móvil: casillas del mismo tamaño; con más de 4 filas, la mochila se desplaza (scroll) y lo demás cabe.
const { chromium, devices } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/'; const OUT = path.join(__dirname, 'capturas');
(async () => {
  const b = await chromium.launch();
  for (const size of [24, 30, 36]) {
    const ctx = await b.newContext({ ...devices['iPhone 13 landscape'], viewport: { width: 750, height: 340 } });
    await ctx.addInitScript(() => localStorage.setItem('gv-consent', 'denied')); const p = await ctx.newPage();
    await p.goto(URL + '?debug'); await p.click('[data-testid=btn-play]'); await p.waitForTimeout(800);
    await p.fill('[data-testid=name-input]', 'Beothord'); await p.click('[data-testid=btn-create]'); await p.waitForTimeout(500);
    await p.evaluate(() => { const pr = window.__GRAVEVOW__.getState().profile; pr.tutorialSeen.dungeon = true; pr.tutorialSeen.lobby = true; });
    await p.click('[data-testid=tab-play]'); await p.click('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1500);
    await p.evaluate((n) => { const g = window.__GRAVEVOW__, e = g.getState().expedition; const bp = [...e.backpack]; while (bp.length < n) bp.push(null); g.setState({ expedition: { ...e, backpack: bp } }); }, size);
    for (const m of ['inventory', 'body']) {
      await p.evaluate((t) => window.__GRAVEVOW__.actions.openModal({ type: t }), m); await p.waitForTimeout(500);
      const r = await p.evaluate(() => { const sl = [...document.querySelectorAll('[data-testid=bag-grid] .slot')]; const bot = document.querySelector('[data-testid=bag-grid]').getBoundingClientRect().bottom; const car = document.querySelector('[data-testid=carry-bar]').getBoundingClientRect().bottom; return { n: sl.length, w: Math.round(sl[0].getBoundingClientRect().width), fits: car <= innerHeight - 4 && bot <= innerHeight }; });
      console.log(r.fits && r.n === size && r.w >= 43 ? 'OK ' : 'FALLA', `${size} casillas · ${m}: casilla ${r.w}px, cabe ${r.fits}`);
      await p.screenshot({ path: `${OUT}/mochila-${size}-${m}.png` });
      await p.evaluate(() => window.__GRAVEVOW__.actions.closeModal()); await p.waitForTimeout(300);
    }
    await ctx.close();
  }
  await b.close();
})();
