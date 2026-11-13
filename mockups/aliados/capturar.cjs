// Capturas de la maqueta de aliados: node mockups/aliados/capturar.cjs [url]
const { chromium } = require('playwright'); const path = require('path');
const base = (process.argv[2] || 'http://localhost:5173') + '/mockups/aliados/proto.html';
const SIZES = [['escritorio-1920x1080', 1920, 1080], ['movil-844x390', 844, 390]];
const SHOTS = ['errante', 'kael-alta', 'kael-baja', 'kael-hostil', 'prisionero', 'rojo', 'hud'];
(async () => {
  const b = await chromium.launch();
  for (const [dev, w, h] of SIZES) {
    const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: dev.startsWith('movil') });
    p.on('pageerror', (e) => console.log('ERR', e.message));
    for (const [i, s] of SHOTS.entries()) {
      await p.goto(`${base}?s=${s}`); await p.waitForTimeout(500);
      const over = await p.evaluate(() => { const e = document.querySelector('.max-h-full'); return e ? e.scrollHeight - e.clientHeight : 0; });
      console.log(dev, s, 'desborde', over);
      await p.screenshot({ path: path.join(__dirname, 'capturas', `${dev}-${i + 1}-${s}.png`) });
    }
    await p.close();
  }
  await b.close();
})();
