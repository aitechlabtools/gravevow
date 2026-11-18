// Capturas del juego real (Misiones) en los tres tamaños, para comparar con la maqueta v2.
// Uso: node mockups/misiones-bestiario-visual/capturar-juego.cjs [url de /play/]
const { chromium } = require('playwright'); const path = require('path');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const SIZES = [['escritorio', 1920, 1080, false], ['tableta', 1180, 820, true], ['movil', 844, 390, true]];
(async () => {
  const b = await chromium.launch();
  for (const [dev, w, h, touch] of SIZES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: dev === 'movil' });
    await ctx.addInitScript(() => { try { localStorage.setItem('gv-consent', '{"analytics":false}'); } catch {} });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log('ERR', e.message));
    const tap = (s) => (touch ? p.tap(s) : p.click(s));
    const shot = (n) => p.screenshot({ path: path.join(__dirname, 'capturas', 'juego', `${dev}-${n}.png`) });
    await p.goto(BASE + '?debug');
    await tap('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Beothord'); await tap('[data-testid=btn-create]');
    await tap('[data-testid=tab-quests]');
    for (const [v, id] of [['garth', 'q_garra_rats'], ['vesper', 'q_lord'], ['brand', 'q_brand_mine'], ['nira', 'q_orvel_coins']]) { await tap(`[data-testid=quests-${v}]`); await tap(`[data-testid=accept-${id}]`); }
    await p.evaluate(() => {
      const s = window.__GRAVEVOW__.getState(); const qs = s.profile.quests;
      qs.find((x) => x.id === 'q_garra_rats').progress = 6; qs.find((x) => x.id === 'q_brand_mine').progress = 3; qs.find((x) => x.id === 'q_lord').pinned = true;
      document.querySelectorAll('[data-testid^=toast]').forEach((t) => t.remove());
    });
    await tap('[data-testid=tab-play]'); await tap('[data-testid=tab-quests]'); await p.waitForTimeout(700);
    await p.evaluate(() => document.querySelectorAll('.toasts, [data-testid=toasts]').forEach((t) => (t.style.display = 'none')));
    await shot('1-misiones-tablon');
    await tap('[data-testid=quest-open-q_garra_rats]'); await p.waitForTimeout(600); await shot('2-mision-detalle');
    await (touch ? p.tap('[data-testid=quest-detail-close]') : p.click('[data-testid=quest-detail-close]'));
    await p.evaluate(() => document.querySelector('[data-testid=quests-board]').scrollIntoView()); await tap('[data-testid=quests-garth]'); await p.waitForTimeout(400);
    await shot('3-misiones-disponibles');
    await tap('[data-testid=tab-merchants]'); await tap('[data-testid=vendor-garth]'); await tap('[data-testid=vendor-view-quests]'); await p.waitForTimeout(600);
    await shot('4-mercader-misiones');
    console.log(dev, 'ok');
    await ctx.close();
  }
  await b.close();
})();
