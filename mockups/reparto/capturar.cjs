// Capturas de la maqueta de reparto. Uso: node mockups/reparto/capturar.cjs http://localhost:5173
const { chromium } = require('playwright');
const B = (process.argv[2] || 'http://localhost:5173') + '/mockups/reparto/maqueta.html?s=';
const out = __dirname + '/capturas/'; require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const [dev, vp, sts] of [['escritorio', { width: 1440, height: 900 }, ['inicio', 'dividir', 'dado', 'justo', 'portal']], ['movil', { width: 844, height: 390 }, ['inicio', 'dividir', 'dado', 'justo', 'portal']]]) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
    let i = 1;
    for (const s of sts) { await p.goto(B + s); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200); await p.screenshot({ path: `${out}${dev}-${i++}-${s}.png` }); }
    await p.close();
  }
  await b.close();
})();
