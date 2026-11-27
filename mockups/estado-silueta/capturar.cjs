// Mockup de la silueta de ESTADO. node mockups/estado-silueta/capturar.cjs [url base]
const { chromium } = require('playwright'); const path = require('path');
const BASE = (process.argv[2] || 'http://localhost:5173') + '/mockups/estado-silueta/mock.html';
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 760, height: 760 }, deviceScaleFactor: 1 });
  for (const d of ['escritorio', 'movil']) for (const c of ['sano', 'herido', 'cura', 'detalle']) {
    await p.goto(`${BASE}?caso=${c}&disp=${d}`); await p.waitForTimeout(250);
    await (await p.$('.panel')).screenshot({ path: path.join(__dirname, 'capturas', `${d}-${c}.png`) }); }
  await b.close(); console.log('ok'); })();
