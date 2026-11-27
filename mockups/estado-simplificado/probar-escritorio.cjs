// Prueba real de ESTADO en escritorio: cura de la mochila, cura del almacén y curación con monedas.
// node mockups/estado-simplificado/probar-escritorio.cjs <url /play/>
const { chromium } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/'; const OUT = path.join(__dirname, 'capturas');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.addInitScript(() => localStorage.setItem('gv-consent', 'denied')); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?debug'); await p.click('[data-testid=btn-play]'); await p.waitForTimeout(800);
  await p.fill('[data-testid=name-input]', 'Beothord'); await p.click('[data-testid=btn-create]'); await p.waitForTimeout(500);
  await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialSeen.dungeon = true; pr.tutorialSeen.lobby = true;
    const bp = [...pr.backpack]; bp[20] = { itemId: 'splint', qty: 1 }; const st = [...pr.stash]; st[0] = { itemId: 'bandage', qty: 3 }; st[1] = { itemId: 'splint', qty: 2 };
    g.setState({ profile: { ...pr, backpack: bp, stash: st, gold: 40, needs: { sat: 100, hyd: 24, rest: 70 }, prep: { cot: 0.1 }, wounds: { pct: { thorax: 0.55, armL: 0.4, legR: 0.7 }, fractures: ['armL', 'legR'] } } }); });
  await p.click('[data-testid=tab-estado]'); await p.waitForTimeout(500);
  const ok = (c, m) => console.log(c ? 'OK ' : 'FALLA ', m);
  await p.screenshot({ path: `${OUT}/resultado-escritorio-herido.png` });
  // 1) Férula de la mochila: resalta brazo y pierna, se aplica en el brazo
  await p.click('[data-testid=alijo-backpack] [data-item=splint]'); await p.waitForTimeout(200);
  ok(await p.locator('[data-testid=body-row-armL].drop-yes').count() === 1 && await p.locator('[data-testid=body-row-thorax].drop-no').count() === 1, 'férula: brazo izq. marcado, tórax atenuado');
  await p.screenshot({ path: `${OUT}/resultado-escritorio-cura-mochila.png` });
  await p.click('[data-testid=body-row-armL]'); await p.waitForTimeout(300);
  let w = await p.evaluate(() => window.__GRAVEVOW__.getState().profile);
  ok(!w.wounds.fractures.includes('armL') && !w.backpack.some((x) => x?.itemId === 'splint'), 'férula de la mochila aplicada y gastada');
  // 2) Férula del almacén en la pierna derecha
  await p.click('[data-testid=estado-src] >> text=Almacén'); await p.waitForTimeout(300);
  await p.click('[data-testid=alijo-storage] [data-item=splint]').catch(async () => p.click('[data-item=splint]'));
  await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/resultado-escritorio-cura-almacen.png` });
  await p.click('[data-testid=body-row-legR]'); await p.waitForTimeout(300);
  w = await p.evaluate(() => window.__GRAVEVOW__.getState().profile);
  ok(!(w.wounds?.fractures ?? []).includes('legR') && w.stash[1]?.qty === 1, 'férula del almacén aplicada y gastada (quedan 1)');
  // 3) Curación con monedas
  await p.click('[data-testid=cure-btn]'); await p.waitForTimeout(300);
  w = await p.evaluate(() => window.__GRAVEVOW__.getState().profile);
  ok(!w.wounds && (await p.locator('[data-testid=cure-btn]').count()) === 0, 'curar con monedas deja entero y el botón desaparece');
  await p.screenshot({ path: `${OUT}/resultado-escritorio-sano.png` });
  // 4) Sin monedas: botón desactivado con lo que falta
  await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; g.setState({ profile: { ...pr, gold: 0, stash: pr.stash.map((x) => (x?.itemId === 'coin' ? null : x)), wounds: { pct: { thorax: 0.5 }, fractures: ['armL'] } } }); });
  await p.waitForTimeout(300); const btn = p.locator('[data-testid=cure-btn]');
  ok((await btn.isDisabled()) && /te faltan/.test(await btn.innerText()), `sin oro: «${await btn.innerText()}»`);
  await p.screenshot({ path: `${OUT}/resultado-escritorio-sin-oro.png` });
  console.log(errs.length ? errs : 'sin errores de página'); await b.close();
})();
