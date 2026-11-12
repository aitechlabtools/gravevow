// Capturas de las maquetas: node mockups/bastion-reconstruir/capturar.cjs
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch();
  for (const [dev, w, h] of [['desktop', 1920, 1080], ['phone', 844, 390]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dev === 'phone' ? 2 : 1 });
    for (const v of ['entry', 'stations', 'detail', 'use', 'upgrade']) {
      await p.goto('file://' + path.join(__dirname, 'maqueta.html') + '?v=' + v, { waitUntil: 'load', timeout: 8000 }).catch(() => {});
      await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(__dirname, 'capturas', `${dev}-${v}.png`) });
    }
  }
  await b.close();
})();
