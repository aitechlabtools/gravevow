// ESTADO dentro de la mazmorra (escritorio): abrir con H, curar desde la mochila, cerrar con Escape; inventario sin «Agrupar oro».
// node mockups/estado-simplificado/probar-mazmorra.cjs <url /play/>
const { chromium } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/'; const OUT = path.join(__dirname, 'capturas');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.addInitScript(() => localStorage.setItem('gv-consent', 'denied')); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const ok = (c, m) => console.log(c ? 'OK ' : 'FALLA', m);
  await p.goto(URL + '?debug'); await p.click('[data-testid=btn-play]'); await p.waitForTimeout(800);
  await p.fill('[data-testid=name-input]', 'Beothord'); await p.click('[data-testid=btn-create]'); await p.waitForTimeout(500);
  await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialSeen.dungeon = true; pr.tutorialSeen.lobby = true;
    const bp = [...pr.backpack]; bp[10] = { itemId: 'splint', qty: 1 }; bp[11] = { itemId: 'bandage', qty: 2 }; g.setState({ profile: { ...pr, backpack: bp } }); });
  await p.click('[data-testid=tab-play]'); await p.click('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1500);
  await p.evaluate(() => { const g = window.__GRAVEVOW__, e = g.getState().expedition; const body = structuredClone(e.body); body.parts.armL.fracture = true; body.parts.armL.hp = 5; body.parts.thorax.bleed = 1; g.setState({ expedition: { ...e, body, needs: { ...e.needs, hyd: 24 } } }); });
  await p.keyboard.press('h'); await p.waitForTimeout(400);
  ok(!!(await p.$('[data-testid=body-modal] [data-testid=body-map]')), 'H abre ESTADO con el cuerpo');
  await p.screenshot({ path: `${OUT}/resultado-mazmorra-escritorio.png` });
  await p.click('[data-testid=dungeon-status-bag] [data-item=splint]'); await p.waitForTimeout(200);
  ok(await p.locator('[data-testid=body-row-armL].drop-yes').count() === 1, 'férula: brazo izq. marcado');
  await p.screenshot({ path: `${OUT}/resultado-mazmorra-cura.png` });
  await p.click('[data-testid=body-row-armL]'); await p.waitForTimeout(300);
  let e = await p.evaluate(() => window.__GRAVEVOW__.getState().expedition);
  ok(!e.body.parts.armL.fracture && !e.backpack.some((x) => x?.itemId === 'splint'), 'férula aplicada y gastada');
  await p.click('[data-testid=dungeon-status-bag] [data-item=bandage]'); await p.click('[data-testid=body-row-thorax]'); await p.waitForTimeout(300);
  e = await p.evaluate(() => window.__GRAVEVOW__.getState().expedition);
  ok(e.body.parts.thorax.bleed === 0, 'venda en el tórax corta el sangrado');
  ok(!(await p.$('[data-testid=cure-btn]')), 'sin curación con monedas en la mazmorra');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(!(await p.$('[data-testid=body-modal]')), 'Escape cierra');
  await p.keyboard.press('i'); await p.waitForTimeout(300);
  ok(!(await p.$('[data-testid=group-gold-dungeon]')), 'inventario sin «Agrupar oro»');
  await p.screenshot({ path: `${OUT}/resultado-mazmorra-inventario.png` });
  console.log(errs.length ? errs : 'sin errores de página'); await b.close();
})();
