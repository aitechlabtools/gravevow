// Prueba de la bienvenida del intendente en el Bastión (mini tutorial largo «bienvenida», data/tutorials.ts):
// sale al volver de la primera bajada (aquí, con un personaje que salta el tutorial de expedición), recorre
// Intendencia (mochila, Agrupar oro, bolsillo seguro, Vaciar mochila), Bastión, la copia de seguridad y Jugar,
// solo deja tocar lo resaltado, sus botones miden 44 px, no vuelve a salir y «Saltar» también la da por vista.
// Uso: node scripts/e2e-bienvenida.cjs [url] [carpeta] [dispositivo de Playwright]
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/claude-0/bienvenida';
const DEVICE = process.argv[4];
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = DEVICE ? await b.newContext({ ...devices[DEVICE] }) : await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const touch = !!DEVICE;
  const tap = async (sel) => { await page.waitForSelector(sel, { timeout: 8000 }); if (touch) await page.tap(sel); else await page.click(sel); await page.waitForTimeout(250); };
  const G = (fn, a) => page.evaluate(fn, a);
  const ok = (c, msg) => { if (!c) throw new Error(msg); console.log('✓', msg); };
  const size44 = async (sel) => { const r = await page.$eval(sel, (e) => { const b = e.getBoundingClientRect(); return [b.width, b.height]; }); return r[0] >= 44 && r[1] >= 44; };
  const mini = () => G(() => { const e = document.querySelector('[data-testid=mini-tutorial]'); return e ? { id: e.dataset.mini, step: +e.dataset.step } : null; });
  const newChar = async (name) => {
    await tap('[data-testid=btn-play]');
    await G(() => document.fullscreenElement && document.exitFullscreen());
    await page.fill('[data-testid=name-input]', name);
    if (!(await page.isChecked('[data-testid=skip-tutorial]'))) await tap('[data-testid=skip-tutorial]');
    await tap('[data-testid=btn-create]');
  };

  await page.goto(BASE + '?debug&minis');
  await G(() => indexedDB.deleteDatabase('gravevow'));
  await G(() => { try { localStorage.setItem('gravevow.tutorialDone', '1'); } catch {} });
  await page.reload();
  await newChar('Bienvenida');
  await page.waitForSelector('[data-testid=mini-tutorial]', { timeout: 8000 });
  let m = await mini();
  ok(m.id === 'bienvenida' && m.step === 0, 'al llegar al Bastión sale la bienvenida, paso 1');
  ok((await page.textContent('[data-testid=mini-narrator]')).includes('intendente'), 'la cuenta el intendente, con su retrato');
  ok(await size44('[data-testid=mini-ok]') && await size44('[data-testid=mini-skip]'), '«Siguiente» y «Saltar» miden 44 px');
  // Solo se toca lo resaltado: un clic fuera (pestaña Misiones) no hace nada
  await page.mouse.click(5, (await page.viewportSize()).height - 5);
  ok((await mini()).step === 0, 'tocar fuera del hueco no avanza ni cierra');
  const total = await G(() => document.querySelector('[data-testid=mini-count]').textContent.split('/')[1]);
  let shots = 0;
  for (let i = 0; i < 20; i++) {
    m = await mini();
    if (!m) break;
    await page.screenshot({ path: `${OUT}/paso-${String(m.step + 1).padStart(2, '0')}.png` }); shots++;
    if (await page.$('[data-testid=mini-wait]')) {
      ok(!!(await page.$('[data-testid=mini-hole]')), `paso ${m.step + 1}: hay hueco sobre lo que hay que tocar`);
      // El objetivo es el que tiene el hueco encima: se toca en su centro
      const hole = await page.$eval('[data-testid=mini-hole]', (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      if (touch) await page.touchscreen.tap(hole[0], hole[1]); else await page.mouse.click(hole[0], hole[1]);
      await page.waitForTimeout(400);
      if (await page.$('[data-testid=btn-confirm-empty]')) await tap('[data-testid=btn-confirm-empty]');
      const n = await mini();
      ok(!n || n.step === m.step + 1 || n.id !== 'bienvenida', `paso ${m.step + 1}: tocar lo señalado lo da por hecho`);
    } else {
      await tap('[data-testid=mini-ok]');
    }
  }
  ok(shots === +total, `se recorren los ${total} pasos`);
  const s = await G(() => { const s = window.__GRAVEVOW__.getState(); return { seen: s.tutorials.seen, lobby: s.profile.tutorialSeen.lobby, bp: s.profile.backpack.filter(Boolean).length }; });
  ok(s.seen.includes('bienvenida') && s.lobby, 'terminada, queda vista en la cuenta y en el personaje');
  ok(!!(await page.$('[data-testid=screen-play]')), 'acaba en la pestaña Jugar, con Descender a la vista');
  await page.reload();
  await page.waitForTimeout(800);
  if (await page.$('[data-testid=btn-continue]')) await tap('[data-testid=btn-continue]');
  await page.waitForTimeout(800);
  ok((await mini())?.id !== 'bienvenida', 'al recargar no vuelve a salir');

  // Saltar: otra cuenta desde cero
  await G(() => indexedDB.deleteDatabase('gravevow'));
  await page.reload();
  await newChar('Saltadora');
  await page.waitForSelector('[data-testid=mini-tutorial]', { timeout: 8000 });
  await tap('[data-testid=mini-skip]');
  const s2 = await G(() => { const s = window.__GRAVEVOW__.getState(); return { seen: s.tutorials.seen, lobby: s.profile.tutorialSeen.lobby }; });
  ok(s2.seen.includes('bienvenida') && s2.lobby && !(await page.$('[data-testid=mini-tutorial]')), '«Saltar» la da por vista y la cierra');
  console.log('errores:', errors.length ? errors : 'ninguno');
  await b.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error('FALLO', e.message); process.exit(1); });
