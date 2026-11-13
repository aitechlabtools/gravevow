// 13/11: botón de pantalla completa en todos los dispositivos que lo admiten (escritorio, tableta y móvil),
// en título, lobby (Bastión, Intendencia), mazmorra y combate; tecla F; el icono se actualiza al salir por fuera; Ajustes.
// Uso: node scripts/pantalla-completa-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'pantalla-completa', dev] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok  ' : 'FALLO ') + m); if (!c) { bad++; process.exitCode = 1; } };
  const fsOn = () => p.evaluate(() => !!(document.fullscreenElement || document.webkitFullscreenElement));
  const btn = async (where) => { const e = await p.$('[data-testid=btn-fullscreen]'); const bb = e && await e.boundingBox(); ok(!!bb && bb.width >= 43.5 && bb.height >= 43.5, `${where}: botón visible y de 44 px (${bb ? Math.round(bb.width) + '×' + Math.round(bb.height) : 'no está'})`); };
  const exitFs = () => p.evaluate(() => document.fullscreenElement && document.exitFullscreen());

  await p.goto(url + '?debug'); await p.waitForTimeout(600);
  await btn('Título');
  if (!dev) ok((await p.getAttribute('[data-testid=btn-fullscreen]', 'title')) === 'Pantalla completa (F)', 'ayuda del ratón: «Pantalla completa (F)»');
  await tap('[data-testid=btn-play]'); await p.waitForTimeout(800);
  if (await fsOn()) { await exitFs(); await p.waitForTimeout(800); }
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); await p.waitForTimeout(500);
  await btn('Lobby');
  // Entrar y salir con el botón; el icono cambia
  await tap('[data-testid=btn-fullscreen]'); for (let k = 0; k < 15 && !(await fsOn()); k++) await p.waitForTimeout(100); await p.waitForTimeout(200);
  ok(await fsOn(), 'el botón entra en pantalla completa');
  ok((await p.getAttribute('[data-testid=btn-fullscreen]', 'data-on')) === '1', 'el icono pasa a «salir»');
  // Salir por fuera (Esc o gesto del sistema): el icono se entera
  await exitFs(); await p.waitForTimeout(400);
  ok(!(await fsOn()) && (await p.getAttribute('[data-testid=btn-fullscreen]', 'data-on')) === '0', 'al salir con Esc o el gesto, el icono vuelve a «entrar»');
  // Tecla F
  if (!dev) {
    await p.keyboard.press('f'); await p.waitForTimeout(400); ok(await fsOn(), 'la tecla F entra');
    await p.keyboard.press('f'); await p.waitForTimeout(400); ok(!(await fsOn()), 'la tecla F sale');
  }
  // Bastión e Intendencia (pestañas del lobby)
  await tap('[data-testid=tab-merchants]'); await p.waitForTimeout(300); await btn('Bastión');
  await tap('[data-testid=tab-stash]'); await p.waitForTimeout(300); await btn('Intendencia');
  // Mazmorra y combate
  await p.evaluate(async () => { await window.__GRAVEVOW__.actions.enterDungeon('afueras'); }); await p.waitForTimeout(1500);
  if (await fsOn()) await exitFs();
  await btn('Mazmorra');
  await p.evaluate(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_x', 'bandit')); await p.waitForSelector('[data-testid=combat]'); await p.waitForTimeout(500);
  await btn('Combate');
  await tap('[data-testid=combat] [data-testid=btn-fullscreen]'); await p.waitForTimeout(400);
  ok(await fsOn(), 'en combate también funciona');
  const vw = await p.evaluate(() => [innerWidth, innerHeight, document.querySelector('canvas')?.width ?? 0]);
  ok(vw[2] > 0, `el canvas sigue ahí tras entrar (${vw})`);
  await p.screenshot({ path: out + '-combate.png' });
  await exitFs();
  ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, 'no se sale de la pantalla');
  ok(!errs.length, 'sin errores: ' + errs.join(' | '));
  console.log(bad ? `${bad} fallos` : 'Todo bien');
  await b.close();
})().catch((e) => { console.error('FALLO', e); process.exit(1); });
