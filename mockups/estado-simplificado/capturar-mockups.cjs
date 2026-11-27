// Capturas de los mockups. node mockups/estado-simplificado/capturar-mockups.cjs [url base del servidor]
const { chromium } = require('playwright'); const path = require('path');
const BASE = (process.argv[2] || 'http://localhost:5173') + '/mockups/estado-simplificado/mock.html';
const SIZES = { escritorio: [1920, 1080], tableta: [1180, 820], movil: [844, 390] };
const CASES = ['sano', 'herido', 'cura', 'comida', 'barras', 'mazmorra', 'detalle', 'herido&pobre=1'];
(async () => { const b = await chromium.launch();
  for (const [n, [w, h]] of Object.entries(SIZES)) { const p = await b.newPage({ viewport: { width: w, height: h } });
    for (const c of CASES) { if (c === 'detalle' && n !== 'movil') continue; await p.goto(`${BASE}?caso=${c}`); await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(__dirname, 'capturas', `mock-${n}-${c.replace('&pobre=1', '-sin-oro')}.png`) }); }
    await p.close(); }
  await b.close(); console.log('ok'); })();
