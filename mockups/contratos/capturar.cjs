// Capturas de la maqueta de Contratos. Uso: node mockups/contratos/capturar.cjs http://localhost:5173
const { chromium } = require('playwright');
const B = (process.argv[2] || 'http://localhost:5173') + '/mockups/contratos/maqueta.html?m=';
const out = __dirname + '/capturas/'; require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const [dev, vp] of [['escritorio', { width: 1903, height: 897 }], ['movil', { width: 844, height: 390 }]]) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
    p.on('pageerror', (e) => console.log('ERR', e.message));
    let i = 1;
    for (const m of ['bram', 'lysa']) { await p.goto(B + m); await p.waitForSelector('body[data-ready]'); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: `${out}${dev}-${i++}-${m}.png` }); }
    await p.close();
  }
  await b.close();
})();
