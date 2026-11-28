// Acciones del objeto en la cabecera (escritorio y móvil) y ficha lateral con doble toque (móvil), en Inventario y Estado.
const { chromium, devices } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/'; const OUT = path.join(__dirname, 'capturas');
(async () => {
  const b = await chromium.launch();
  for (const [name, o] of [['escritorio', { viewport: { width: 1920, height: 1080 } }], ['movil', { ...devices['iPhone 13 landscape'], viewport: { width: +(process.env.VW||750), height: +(process.env.VH||340) } }]]) {
    const ctx = await b.newContext(o); await ctx.addInitScript(() => localStorage.setItem('gv-consent', 'denied')); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message)); const ok = (c, m) => console.log(c ? 'OK ' : 'FALLA', name, m);
    await p.goto(URL + '?debug'); await p.click('[data-testid=btn-play]'); await p.waitForTimeout(800);
    await p.fill('[data-testid=name-input]', 'Beothord'); await p.click('[data-testid=btn-create]'); await p.waitForTimeout(500);
    await p.evaluate(() => { const pr = window.__GRAVEVOW__.getState().profile; pr.tutorialSeen.dungeon = true; pr.tutorialSeen.lobby = true; });
    await p.click('[data-testid=tab-play]'); await p.click('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1500);
    for (const [modal, root] of [['inventory', 'dungeon-inventory'], ['body', 'body-modal']]) {
      await p.evaluate((t) => window.__GRAVEVOW__.actions.openModal({ type: t }), modal); await p.waitForTimeout(400);
      const bag = root === 'body-modal' ? '[data-testid=dungeon-status-bag]' : `[data-testid=${root}] .dun-col:nth-child(2)`;
      const slot = (await p.$$(`${bag} .slot`))[1];
      await slot.click(); await p.waitForTimeout(200);
      const a = await p.$(`[data-testid=${root}] .dun-top [data-testid=item-actions]`);
      const ab = a && await a.boundingBox(), cb = await (await p.$(`[data-testid=${root}] button[aria-label^="Cerrar"]`)).boundingBox();
      ok(!!a && Math.abs((ab.y + ab.height / 2) - (cb.y + cb.height / 2)) < 6, `${modal}: acciones en la cabecera, alineadas con ✕`);
      await p.screenshot({ path: `${OUT}/acciones-${name}-${modal}.png` });
      if (name === 'movil') {
        await slot.dblclick(); await p.waitForTimeout(400);
        ok(await p.$eval('[data-testid=item-sheet]', (e) => e.classList.contains('open')), `${modal}: doble toque abre la ficha lateral`);
        await p.screenshot({ path: `${OUT}/acciones-${name}-${modal}-ficha.png` });
        await p.click('[data-testid=item-sheet] button[aria-label="Cerrar la ficha"]'); await p.waitForTimeout(300);
      }
      await p.evaluate(() => window.__GRAVEVOW__.actions.closeModal()); await p.waitForTimeout(300);
    }
    ok(errs.length === 0, 'sin errores ' + errs.join(' | ')); await ctx.close();
  }
  await b.close();
})();
