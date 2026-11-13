// Creación de personaje: pestañas, giro (flechas, arrastre y capa), aspecto, Aleatorio, nombre al azar, género y migración.
// node scripts/creacion-check.cjs <url>/play/ <carpeta> [dispositivo]
const { chromium, devices } = require('playwright'); const path = require('path'); const fs = require('fs');
const url = process.argv[2] || 'http://localhost:5173/play/'; const out = process.argv[3] || 'out'; const dev = process.argv[4];
fs.mkdirSync(out, { recursive: true });
const ok = (c, m) => { if (!c) { console.error('FALLO:', m); process.exitCode = 1; } else console.log('ok ·', m); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (s) => (dev ? p.tap(s) : p.click(s));
  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.waitForSelector('[data-testid=create-screen]');
  ok(await p.textContent('[data-testid=create-class-name]') === 'Guerrero', 'empieza en Guerrero');
  await tap('[data-testid=turn-right]'); await p.waitForTimeout(250);
  ok(await p.getAttribute('[data-testid=create-stage]', 'data-view') === 'back', 'la flecha gira a la espalda');
  ok(await p.isVisible('[data-testid=hero-sprite-back]'), 'se ve de espaldas');
  await tap('[data-testid=turn-left]'); await p.waitForTimeout(250);
  // Arrastre
  const box = await p.locator('[data-testid=create-stage]').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 4 }); await p.mouse.up();
  await p.waitForTimeout(250);
  ok(await p.getAttribute('[data-testid=create-stage]', 'data-view') === 'back', 'arrastrar gira');
  await tap('[data-testid=turn-left]'); await p.waitForTimeout(250);
  await tap('[data-testid=seg-aspecto]');
  for (const id of ['look-random', 'look-sex-1', 'cloak-3', 'skin-2', 'hair-4', 'look-style-2', 'look-beard-1', 'turn-left', 'turn-right', 'name-random']) {
    const bb = await p.locator(`[data-testid=${id}]`).boundingBox();
    ok(bb && bb.width >= 44 && bb.height >= 44, `${id} mide al menos 44 × 44 (${bb && Math.round(bb.width)}×${bb && Math.round(bb.height)})`);
  }
  await tap('[data-testid=look-sex-1]');
  ok(await p.textContent('[data-testid=create-class-name]') === 'Guerrera', 'Mujer → Guerrera');
  await tap('[data-testid=cloak-2]'); await p.waitForTimeout(300);
  ok(await p.getAttribute('[data-testid=create-stage]', 'data-view') === 'back', 'al cambiar la capa enseña la espalda');
  await p.waitForTimeout(1500);
  ok(await p.getAttribute('[data-testid=create-stage]', 'data-view') === 'front', 'y vuelve de frente');
  await tap('[data-testid=hair-4]'); await tap('[data-testid=look-style-1]'); await tap('[data-testid=look-beard-0]');
  await tap('[data-testid=name-random]');
  const nm = await p.inputValue('[data-testid=name-input]');
  ok(nm.length >= 2, `nombre al azar: ${nm}`);
  await p.screenshot({ path: path.join(out, `creacion-${dev ? 'tactil' : 'escritorio'}.png`) });
  const over = await p.evaluate(() => [...document.querySelectorAll('[data-testid=create-screen] .overflow-y-auto')].map((e) => e.scrollHeight - e.clientHeight));
  console.log('desborde de paneles', over.join(','));
  await tap('[data-testid=btn-create]');
  await p.waitForFunction(() => window.__GRAVEVOW__?.getState().profile);
  const ap = await p.evaluate(() => window.__GRAVEVOW__.getState().profile.character.appearance);
  ok(ap.sex === 'f' && ap.cloak === 2 && ap.hair === 4 && ap.style === 1 && ap.beard === 0, `aspecto guardado ${JSON.stringify(ap)}`);
  await p.waitForTimeout(800);
  const body = await p.textContent('body');
  if (!dev || !dev.startsWith('iPhone')) ok(/Guerrera/.test(body), 'el juego dice Guerrera'); // en el móvil el lobby solo enseña el nivel
  ok(errs.length === 0, `sin errores de página ${errs.join(' | ')}`);
  await b.close();
})();
