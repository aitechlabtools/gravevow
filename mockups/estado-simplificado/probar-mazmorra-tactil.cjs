// Inventario y Estado de la mazmorra en móvil y tableta: pantalla completa, dos columnas, curar tocando cura y parte.
// node mockups/estado-simplificado/probar-mazmorra-tactil.cjs <url /play/>
const { chromium, devices } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/'; const OUT = path.join(__dirname, 'capturas');
(async () => {
  const b = await chromium.launch();
  for (const [name, dev] of [['movil', devices['iPhone 13 landscape'] || { viewport: { width: 750, height: 340 }, hasTouch: true, isMobile: true }], ['tableta', devices['iPad (gen 7) landscape']]]) {
    const ctx = await b.newContext({ ...dev, viewport: name === 'movil' ? { width: 750, height: 340 } : dev.viewport });
    await ctx.addInitScript(() => localStorage.setItem('gv-consent', 'denied')); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const ok = (c, m) => console.log(c ? 'OK ' : 'FALLA', name, m);
    await p.goto(URL + '?debug'); await p.click('[data-testid=btn-play]'); await p.waitForTimeout(800);
    await p.fill('[data-testid=name-input]', 'Beothord'); await p.click('[data-testid=btn-create]'); await p.waitForTimeout(500);
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialSeen.dungeon = true; pr.tutorialSeen.lobby = true;
      const bp = [...pr.backpack]; bp[10] = { itemId: 'splint', qty: 1 }; bp[11] = { itemId: 'bandage', qty: 2 }; g.setState({ profile: { ...pr, backpack: bp } }); });
    await p.click('[data-testid=tab-play]'); await p.click('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1500);
    await p.evaluate(() => { const g = window.__GRAVEVOW__, e = g.getState().expedition; const body = structuredClone(e.body); body.parts.armL.fracture = true; body.parts.armL.hp = 5; g.setState({ expedition: { ...e, body } }); });
    await p.evaluate(() => window.__GRAVEVOW__.actions.openModal({ type: 'inventory' })); await p.waitForTimeout(400);
    const box = await (await p.$('[data-testid=dungeon-inventory]')).boundingBox(); const vp = p.viewportSize();
    ok(!!(await p.$('.dun-win')), 'inventario en ventana');
    ok(!!(await p.$('[data-testid=btn-close-inventory]')) && !!(await p.$('[data-testid=stats]')), 'cabecera y atributos');
    await p.screenshot({ path: `${OUT}/tactil-${name}-inventario.png` });
    await p.tap('[data-testid=btn-close-inventory]'); await p.waitForTimeout(300);
    await p.evaluate(() => window.__GRAVEVOW__.actions.openModal({ type: 'body' })); await p.waitForTimeout(400);
    ok(!!(await p.$('[data-testid=body-modal] [data-testid=dungeon-status-bag]')), 'Estado con la mochila al lado');
    const i = await p.evaluate(() => window.__GRAVEVOW__.getState().expedition.backpack.findIndex((x) => x?.itemId === 'splint'));
    const cells = await p.$$('[data-testid=dungeon-status-bag] .slot'); await cells[i].tap(); await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/tactil-${name}-estado.png` });
    await p.tap('[data-testid=body-row-armL]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => window.__GRAVEVOW__.getState().expedition.body.parts.armL.splinted || !window.__GRAVEVOW__.getState().expedition.backpack.some((x) => x?.itemId === 'splint')), 'férula aplicada tocando');
    await p.tap('[data-testid=body-close]'); await p.waitForTimeout(300);
    ok(!(await p.$('[data-testid=body-modal]')), 'se cierra');
    ok(errs.length === 0, 'sin errores ' + errs.join(' | '));
    await ctx.close();
  }
  await b.close();
})();
