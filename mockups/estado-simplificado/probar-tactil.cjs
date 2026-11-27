// ESTADO en tableta y móvil: cura de la mochila y del almacén con toques, Atributos y capturas.
// node mockups/estado-simplificado/probar-tactil.cjs <url /play/>
const { chromium, devices } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/'; const OUT = path.join(__dirname, 'capturas');
const SIZES = { tableta: { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true }, movil: { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } } };
(async () => {
  const b = await chromium.launch();
  for (const [n, opt] of Object.entries(SIZES)) {
    const ctx = await b.newContext(opt); await ctx.addInitScript(() => localStorage.setItem('gv-consent', 'denied')); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const ok = (c, m) => console.log(n, c ? 'OK ' : 'FALLA', m);
    await p.goto(URL + '?debug'); await p.tap('[data-testid=btn-play]'); await p.waitForTimeout(800);
    await p.fill('[data-testid=name-input]', 'Beothord'); await p.tap('[data-testid=btn-create]'); await p.waitForTimeout(500);
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialSeen.dungeon = true; pr.tutorialSeen.lobby = true;
      const bp = [...pr.backpack]; bp[20] = { itemId: 'splint', qty: 1 }; const st = [...pr.stash]; st[0] = { itemId: 'bandage', qty: 3 }; st[1] = { itemId: 'splint', qty: 2 };
      g.setState({ profile: { ...pr, backpack: bp, stash: st, gold: 40, needs: { sat: 100, hyd: 24, rest: 70 }, prep: { cot: 0.1 }, wounds: { pct: { thorax: 0.55, armL: 0.4, legR: 0.7 }, fractures: ['armL', 'legR'] } } }); });
    await p.tap('[data-testid=tab-estado]'); await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/resultado-${n}-herido.png` });
    await p.tap('[data-testid=alijo-backpack] [data-item=splint]'); await p.waitForTimeout(250);
    ok(await p.locator('[data-testid=body-row-armL].drop-yes').count() === 1, 'férula de la mochila: brazo marcado');
    await p.screenshot({ path: `${OUT}/resultado-${n}-cura-mochila.png` });
    await p.tap('[data-testid=body-row-armL]'); await p.waitForTimeout(300);
    let w = await p.evaluate(() => window.__GRAVEVOW__.getState().profile);
    ok(!w.wounds.fractures.includes('armL'), 'férula de la mochila aplicada');
    await p.tap('[data-testid=estado-src] >> text=Almacén'); await p.waitForTimeout(300);
    await p.tap('[data-item=splint]'); await p.waitForTimeout(250);
    await p.screenshot({ path: `${OUT}/resultado-${n}-cura-almacen.png` });
    await p.tap('[data-testid=body-row-legR]'); await p.waitForTimeout(300);
    w = await p.evaluate(() => window.__GRAVEVOW__.getState().profile);
    ok(!(w.wounds?.fractures ?? []).includes('legR') && w.stash[1]?.qty === 1, 'férula del almacén aplicada');
    if (await p.$('[data-testid=seg-attrs]')) { await p.tap('[data-testid=seg-attrs]'); await p.waitForTimeout(300); ok(!!(await p.$('[data-testid=estado-attrs]')), 'Atributos en el selector vertical'); await p.screenshot({ path: `${OUT}/resultado-${n}-atributos.png` }); }
    const small = await p.evaluate(() => [...document.querySelectorAll('[data-testid^=body-row-], [data-testid=cure-btn], [data-testid=estado-src] button')].map((e) => e.getBoundingClientRect()).filter((r) => r.width && (r.width < 44 || r.height < 30)).length);
    ok(small === 0, `zonas táctiles pequeñas: ${small}`);
    console.log(n, errs.length ? errs : 'sin errores de página'); await ctx.close();
  }
  await b.close();
})();
