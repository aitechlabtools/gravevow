// Prueba de controles táctiles con toques REALES (CDP Input.dispatchTouchEvent), no clics de ratón.
// Uso: node scripts/touch-check.cjs [url] [carpeta-capturas]
// Recorre varios dispositivos en horizontal, incluido uno «híbrido» (pantalla táctil + puntero fino,
// como una tableta con funda-teclado o un portátil táctil) que antes se quedaba sin joystick.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/touch-check';
fs.mkdirSync(OUT, { recursive: true });

const CASES = [
  { name: 'Pixel 7 horizontal', ctx: devices['Pixel 7 landscape'] },
  { name: 'iPhone 13 horizontal', ctx: devices['iPhone 13 landscape'] },
  { name: 'iPad horizontal', ctx: devices['iPad (gen 7) landscape'] },
  { name: 'Galaxy Tab S4 horizontal', ctx: devices['Galaxy Tab S4 landscape'] },
  // Híbrido: táctil pero el navegador dice «puntero fino». Debe pasar a modo táctil al primer toque.
  { name: 'Híbrido táctil + ratón', ctx: { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: false }, hybrid: true },
];

async function run(c) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...c.ctx });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
  const tapAt = async (x, y, hold = 60) => { await touch('touchStart', [[x, y]]); await page.waitForTimeout(hold); await touch('touchEnd', []); };
  const center = async (sel) => { const el = await page.waitForSelector(sel, { timeout: 8000 }); await el.scrollIntoViewIfNeeded(); const bb = await el.boundingBox(); return [bb.x + bb.width / 2, bb.y + bb.height / 2]; };
  const tapSel = async (sel, hold) => { const [x, y] = await center(sel); await tapAt(x, y, hold); await page.waitForTimeout(250); };
  const D = (fn, arg) => page.evaluate(fn, arg);
  const fails = [];
  const check = (ok, msg) => { if (!ok) fails.push(msg); };

  await page.goto(URL + '?debug');
  await D(() => indexedDB.deleteDatabase('gravevow'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  const initial = await D(() => document.documentElement.classList.contains('is-touch'));
  if (!c.hybrid) check(initial, 'no detecta táctil al cargar');

  await tapSel('[data-testid=btn-play]');
  check(await D(() => document.documentElement.classList.contains('is-touch')), 'no pasa a modo táctil tras el primer toque');
  await page.fill('[data-testid=name-input]', 'Toque');
  await tapSel('[data-testid=btn-create]');
  
  await tapSel('[data-testid=tab-play]');
  await tapSel('[data-testid=btn-enter-dungeon]');
  await page.waitForTimeout(1200);
  
  await page.waitForTimeout(400);

  // Joystick visible desde el principio y mueve al personaje
  check(!!(await page.$('[data-testid=touch-stick-base]')), 'no se ve la base del joystick');
  const pos = () => D(() => { const p = window.__GRAVEVOW__.scene().player; return [p.x, p.y]; });
  const before = await pos();
  const zone = await (await page.$('[data-testid=touch-stick-zone]')).boundingBox();
  const sx = zone.x + 110, sy = zone.y + zone.height - 110;
  await touch('touchStart', [[sx, sy]]);
  for (let k = 1; k <= 10; k++) { await touch('touchMove', [[sx + k * 6, sy]]); await page.waitForTimeout(40); }
  await page.waitForTimeout(700);
  check(!!(await page.$('[data-testid=touch-stick]')), 'el joystick no aparece bajo el pulgar');
  // Segundo dedo en la poción mientras el primero sigue en el joystick (multitáctil)
  // Con anatomía, la vida es la suma de las regiones: se hiere el cuerpo, no solo la cifra
  await D(() => { const G = window.__GRAVEVOW__, e = G.getState().expedition, body = structuredClone(e.body); let hp = 0; for (const p of Object.values(body.parts)) { p.hp = Math.max(1, Math.round(p.hp * 0.1)); hp += p.hp; } window.__hp0 = hp; G.setState({ expedition: { ...e, body, hp } }); });
  const [px, py] = await center('[data-testid=touch-potion]');
  await touch('touchMove', [[sx + 60, sy], [px, py]]);
  await page.waitForTimeout(80);
  await touch('touchMove', [[sx + 60, sy]]);
  await page.waitForTimeout(80);
  await touch('touchEnd', []);
  await page.waitForTimeout(300);
  const after = await pos();
  check(Math.hypot(after[0] - before[0], after[1] - before[1]) > 0.5, `el joystick no mueve (${before} → ${after})`);
  check(!(await page.$('[data-testid=touch-stick]')), 'el joystick no se suelta al levantar el dedo');
  check(await D(() => window.__GRAVEVOW__.getState().expedition.hp > window.__hp0), 'la poción no se bebe con un segundo dedo');
  // Al quedar parado no debe seguir andando
  const p1 = await pos(); await page.waitForTimeout(400); const p2 = await pos();
  check(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) < 0.05, 'el personaje sigue andando sin tocar nada');
  // Botón «Usar» siempre visible (aunque no haya nada cerca)
  check(await D(() => document.querySelector('[data-testid=touch-action]')?.textContent === 'Usar'), 'el botón de acción no dice «Usar»');
  await page.screenshot({ path: `${OUT}/${c.name.replace(/\W+/g, '_')}-mazmorra.png` });
  // Fase 3 · Medidas del HUD táctil
  const hud = await D(() => {
    const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
    return { vw: innerWidth, vh: innerHeight, base: r('[data-testid=touch-stick-base]'), use: r('[data-testid=touch-action]'), pot: r('[data-testid=touch-potion]'),
      inv: r('[data-testid=btn-inventory]'), menu: r('[data-testid=btn-menu]'), fs: r('[data-testid=btn-fullscreen]'), card: r('[data-testid=hud-player]'), timer: r('[data-testid=hud-timer]') };
  });
  const phone = hud.vh <= 520;
  const near = (a, b) => Math.abs(a - b) <= 1;
  check(hud.base && near(hud.base.w, phone ? 120 : 150), `base del joystick de ${hud.base?.w} px (esperado ${phone ? 120 : 150})`);
  check(hud.use && near(hud.use.w, 72), `botón Usar de ${hud.use?.w} px (esperado 72)`);
  check(hud.pot && near(hud.pot.w, 52), `botón Poción de ${hud.pot?.w} px (esperado 52)`);
  check(hud.use && hud.pot && near(hud.use.x - hud.pot.r, 12), `Usar y Poción separados ${hud.use && hud.pot ? Math.round(hud.use.x - hud.pot.r) : '?'} px (esperado 12)`);
  for (const [k, n] of [['inv', 'Inventario'], ['menu', 'Menú'], ['fs', 'Pantalla completa']]) check(hud[k] && hud[k].w >= 44 && hud[k].h >= 44, `${n} mide menos de 44 px`);
  for (const [k, n] of [['base', 'joystick'], ['use', 'Usar'], ['pot', 'Poción'], ['inv', 'Inventario'], ['card', 'ficha del personaje']])
    check(hud[k] && hud[k].x >= 0 && hud[k].y >= 0 && hud[k].r <= hud.vw && hud[k].b <= hud.vh, `${n} se sale de la pantalla`);
  check(hud.card && hud.timer && hud.card.r < hud.timer.x, 'la ficha del personaje tapa el reloj');
  check(hud.inv && hud.timer && hud.timer.r < hud.inv.x, 'los botones de arriba tapan el reloj');
  // Pantalla completa: botón visible en la mazmorra
  check(!!(await page.$('[data-testid=btn-fullscreen]')), 'no hay botón de pantalla completa');
  // «Jugar» en táctil pone pantalla completa; el botón ⛶ debe seguir ahí y quitarla
  const fsOn = () => D(() => !!(document.fullscreenElement || document.webkitFullscreenElement));
  if (await fsOn()) {
    if (await page.$('[data-testid=btn-fullscreen]')) await tapSel('[data-testid=btn-fullscreen]');
    check(!(await fsOn()), 'el botón ⛶ no quita la pantalla completa');
  } else if (!c.noFullscreen) fails.push('«Jugar» no puso la pantalla completa');
  // Girar a vertical (solo móviles): aviso + escena congelada; al volver, se puede seguir
  const vp = page.viewportSize();
  if (vp.width < 1000) {
    await page.setViewportSize({ width: vp.height, height: vp.width });
    await page.waitForTimeout(400);
    check(!!(await page.$('[data-testid=rotate-notice]')), 'no sale el aviso de girar en vertical');
    check(await D(() => window.__GRAVEVOW__.getState().suspended === true), 'la partida no se pausa en vertical');
    check(!(await page.$('[data-testid=touch-stick-zone]')), 'el joystick sigue activo en vertical');
    await page.screenshot({ path: `${OUT}/${c.name.replace(/\W+/g, '_')}-vertical.png` });
    await page.setViewportSize(vp);
    await page.waitForTimeout(400);
    check(!(await page.$('[data-testid=rotate-notice]')), 'el aviso de girar no se quita al volver a horizontal');
    check(await D(() => window.__GRAVEVOW__.getState().suspended === false), 'la partida no se reanuda al girar');
    check(!!(await page.$('[data-testid=touch-stick-zone]')), 'el joystick no vuelve tras girar');
  }

  // Combate: un toque ejecuta, mantener pulsado enseña la ficha
  const ep = await D(() => { const e = window.__GRAVEVOW__.scene().enemies[0]; return [e.x, e.y]; });
  await D(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x, y), [Math.floor(ep[0]), Math.floor(ep[1]) - 1]);
  await page.waitForSelector('[data-testid=combat]', { timeout: 8000 });
  await page.waitForSelector('[data-testid=act-attack]:not([disabled])', { timeout: 8000 }).catch(() => null);
  check(!(await page.$('[data-testid=touch-stick-zone]')), 'el joystick sigue en pantalla durante el combate');
  // Las órdenes de combate miden al menos 44 px de alto
  const cmdMin = await D(() => Math.min(...[...document.querySelectorAll('.cmd')].map((b) => b.getBoundingClientRect().height)));
  check(cmdMin >= 44, `órdenes de combate de ${Math.round(cmdMin)} px de alto (mínimo 44)`);
  // Un toque abre Habilidades a la primera
  await tapSel('[data-testid=act-special]');
  check(await D(() => !!document.querySelector('[data-testid=special-menu]')), 'un toque en Habilidades no abre el menú');
  // Mantener pulsado una habilidad: enseña su ficha y NO la usa
  const log0 = await D(() => window.__GRAVEVOW__.getState().combat.state.log.length);
  const skillSel = await D(() => { const b = document.querySelector('[data-testid=special-menu] [data-testid^=skill-]:not([disabled])'); return b ? `[data-testid=${b.dataset.testid}]` : null; });
  if (skillSel) {
    await tapSel(skillSel, 650);
    await page.waitForTimeout(300);
    check(await D(() => window.__GRAVEVOW__.getState().combat.state.log.length) === log0, 'mantener pulsado ejecutó la habilidad');
    check(!!(await page.$('[data-testid=entry-info]')), 'mantener pulsado no enseña la ficha');
    await page.screenshot({ path: `${OUT}/${c.name.replace(/\W+/g, '_')}-ficha.png` });
    // Un toque la usa
    await tapSel(skillSel);
    await page.waitForTimeout(500);
    check(await D(() => (window.__GRAVEVOW__.getState().combat?.state.log.length ?? 999)) > log0, 'un toque en la habilidad no la usa');
  } else fails.push('no hay habilidades disponibles para probar');
  await page.screenshot({ path: `${OUT}/${c.name.replace(/\W+/g, '_')}-combate.png` });

  await b.close();
  const errors = errs.filter((e) => !/favicon|DevTools/.test(e));
  if (errors.length) fails.push('errores en consola: ' + errors.slice(0, 3).join(' | '));
  return fails;
}

(async () => {
  let bad = 0;
  for (const c of CASES) {
    try {
      const f = await run(c);
      console.log(`${f.length ? '✗' : '✓'} ${c.name}${f.length ? '\n   - ' + f.join('\n   - ') : ''}`);
      if (f.length) bad++;
    } catch (e) { bad++; console.log(`✗ ${c.name}: ${e.message.split('\n')[0]}`); }
  }
  console.log(bad ? `\n${bad} dispositivo(s) con fallos` : '\nTodo bien');
  process.exit(bad ? 1 : 0);
})();
