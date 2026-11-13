// Capturas de la maqueta de resultados: node mockups/resultados/capturar.cjs [url]
const { chromium } = require('playwright'); const path = require('path');
const base = (process.argv[2] || 'http://localhost:5173') + '/mockups/resultados/proto.html';
const SIZES = [['escritorio-1920x1080', 1920, 1080], ['movil-844x390', 844, 390]];
const SHOTS = [['1-expedicion', 's=extract&page=1'], ['2-botin', 's=extract&page=2'], ['2b-sin-botin', 's=extract&page=2&empty=1'], ['3-cuerpo', 's=extract&page=3'],
  ['4-muerte-1', 's=death&page=1'], ['5-muerte-2-perdido', 's=death&page=2'], ['6-muerte-3-cura', 's=death&page=3']];
(async () => {
  const b = await chromium.launch();
  for (const [dev, w, h] of SIZES) {
    const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: dev.startsWith('movil') });
    p.on('pageerror', (e) => console.log('ERR', e.message));
    for (const [n, qs] of SHOTS) {
      await p.goto(`${base}?${qs}`); await p.waitForTimeout(1100);
      const over = await p.evaluate(() => { const e = document.querySelector('[data-testid=summary]'); return e.scrollHeight - e.clientHeight; });
      console.log(dev, n, 'desborde', over);
      await p.screenshot({ path: path.join(__dirname, 'capturas', `${dev}-${n}.png`) });
    }
    await p.close();
  }
  await b.close();
})();
