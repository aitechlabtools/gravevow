// Pestaña Jugar con menos texto (12/11): la tarjeta de destino y Expedición sin líneas fijas; la información sale en una
// ficha al pasar el ratón o al mantener pulsado. Mantener pulsado «Descender» no baja; un toque sí.
// Uso: node scripts/jugar-ficha-check.cjs <url>/play/ <carpeta> [dispositivo]
const { chromium, devices } = require('playwright');
const [url, out = 'jugar', dev] = process.argv.slice(2);
const errs = []; const fail = (m) => { errs.push(m); console.log('✗', m); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? { ...devices[dev] } : { viewport: { width: 1920, height: 1080 } });
  const p = await ctx.newPage();
  const touch = !!dev;
  const tap = async (s) => { const e = await p.waitForSelector(s); if (touch) await e.tap(); else await e.click(); };
  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]');
  await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; g.setState({ profile: { ...pr, tutorialSeen: { ...pr.tutorialSeen, dungeon: true }, stats: { ...pr.stats, expeditions: 1 } } }); });
  await tap('[data-testid=tab-play]'); await p.waitForSelector('[data-testid=expedition-panel]');
  const txt = (await p.textContent('[data-testid=screen-play]')) || '';
  const vis = await p.evaluate(() => document.querySelector('[data-testid=screen-play]').innerText);
  for (const t of ['mapa nuevo cada vez', 'de oro en riesgo', 'minutos para encontrar el portal']) if (vis.includes(t)) fail('sigue a la vista: ' + t);
  if (!txt.includes('de oro en riesgo')) fail('la ficha no tiene las pociones y el oro en riesgo');
  if (touch) {
    const btn = await p.$('[data-testid=btn-enter-dungeon]'); const bb = await btn.boundingBox();
    const cdp = await ctx.newCDPSession(p);
    const pt = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, id: 1 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
    await p.waitForTimeout(700);
    if (!(await p.isVisible('[data-testid=expedition-tip]'))) fail('mantener pulsado no enseña la ficha');
    await p.screenshot({ path: out + '-ficha.png' });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(400);
    if (await p.$('[data-testid=hud-timer]')) fail('mantener pulsado ha bajado a la mazmorra');
  } else {
    await p.hover('[data-testid=zone-card]');
    if (!(await p.isVisible('[data-testid=zone-tip]'))) fail('pasar el ratón no enseña la ficha de la zona');
    await p.hover('[data-testid=btn-enter-dungeon]');
    if (!(await p.isVisible('[data-testid=expedition-tip]'))) fail('pasar el ratón no enseña la ficha de la expedición');
    await p.screenshot({ path: out + '-ficha.png' });
  }
  await p.mouse.move(5, 500);
  await p.waitForTimeout(1800);
  await p.screenshot({ path: out + '-jugar.png' });
  await tap('[data-testid=btn-enter-dungeon]');
  if (!(await p.waitForSelector('[data-testid=hud-timer]', { timeout: 8000 }).catch(() => null))) fail('Descender no baja');
  console.log(dev || 'escritorio', 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
