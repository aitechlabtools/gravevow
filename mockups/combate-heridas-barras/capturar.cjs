// Capturas de la maqueta: node mockups/combate-heridas-barras/capturar.cjs [base]
const { chromium } = require('playwright'); const path = require('path');
const BASE = (process.argv[2] || 'http://localhost:5174') + '/mockups/combate-heridas-barras/maqueta.html';
const SIZES = { escritorio: [1920, 1080], tableta: [1180, 820], movil: [844, 390] };
(async () => { const b = await chromium.launch();
  for (const [s, [w, h]] of Object.entries(SIZES)) { const p = await b.newPage({ viewport: { width: w, height: h } });
    for (const o of ['A', 'B', 'C']) for (const c of ['1v1', '2v2']) { await p.goto(`${BASE}?s=${s}&c=${c}&o=${o}`); await p.waitForSelector('body[data-ready]', { state: 'attached' }); await p.waitForTimeout(400); await p.screenshot({ path: path.join(__dirname, `op${o}-${s}-${c}.png`) }); }
    await p.goto(`${BASE}?s=${s}&c=2v2&o=B&f=1`); await p.waitForSelector('body[data-ready]', { state: 'attached' }); await p.waitForTimeout(400); await p.screenshot({ path: path.join(__dirname, `parpadeo-${s}.png`) });
    await p.close(); }
  await b.close(); })();
