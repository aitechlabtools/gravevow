// Capturas de la maqueta de diálogo con busto. Uso: node mockups/dialogo-busto/capturar.cjs http://localhost:5173
const { chromium } = require('playwright');
const B = (process.argv[2] || 'http://localhost:5173') + '/mockups/dialogo-busto/maqueta.html?s=';
const out = __dirname + '/capturas/'; require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const [dev, vp] of [['escritorio', { width: 1440, height: 900 }], ['movil', { width: 844, height: 390 }]]) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
    p.on('pageerror', (e) => console.log('ERR', e.message));
    let i = 1;
    for (const s of ['kael', 'sela', 'aliado', 'portal']) { await p.goto(B + s); await p.waitForSelector('body[data-ready]'); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: `${out}${dev}-${i++}-${s}.png` }); }
    await p.close();
  }
  await b.close();
})();
