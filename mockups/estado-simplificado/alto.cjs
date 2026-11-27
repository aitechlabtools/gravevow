// Comprueba que en ESTADO (escritorio) el cuerpo no tapa el resumen ni las barras a varias alturas. node mockups/estado-simplificado/alto.cjs
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
  for (const [w, h] of [[1920, 875], [1366, 768], [1920, 1080]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); await ctx.addInitScript(() => localStorage.setItem('gv-consent', 'denied')); const p = await ctx.newPage();
    await p.goto('http://localhost:5173/play/?debug'); await p.click('[data-testid=btn-play]'); await p.waitForTimeout(800);
    await p.fill('[data-testid=name-input]', 'Beothord'); await p.click('[data-testid=btn-create]'); await p.waitForTimeout(500);
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialSeen.lobby = true; g.setState({ profile: { ...pr, needs: { sat: 65, hyd: 24, rest: 100 }, wounds: { pct: { thorax: 0.55, armL: 0.4 }, fractures: ['armL'] } } }); });
    await p.click('[data-testid=tab-estado]'); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const d = document.querySelector('[data-testid=body-map]').getBoundingClientRect(), n = document.querySelector('[data-testid=estado-needs]').getBoundingClientRect(), t = document.querySelector('[data-testid=estado-top]').getBoundingClientRect(); return { dollTop: d.top, dollBottom: d.bottom, topBottom: t.bottom, needsTop: n.top }; });
    console.log(w, h, JSON.stringify(r), r.dollBottom <= r.needsTop && r.dollTop >= r.topBottom ? 'OK sin solapes' : 'SOLAPA');
    await p.screenshot({ path: `${__dirname}/capturas/resultado-escritorio-${w}x${h}.png` }); await ctx.close(); }
  await b.close(); })();
