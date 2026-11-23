const { chromium } = require('playwright'); const p = require('path');
(async () => { const b = await chromium.launch(); for (const q of ['', '?sel=1']) { const pg = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await pg.goto('file://' + p.join(__dirname, 'index.html') + q); await pg.waitForTimeout(300); await pg.screenshot({ path: p.join(__dirname, q ? 'propuesta-dividir.png' : 'propuesta.png') }); } await b.close(); })();
