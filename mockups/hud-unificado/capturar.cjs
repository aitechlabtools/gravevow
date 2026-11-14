// Capturas de las maquetas: node mockups/hud-unificado/capturar.cjs http://localhost:5173/ [dirs] [pantallas]
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const BASE = (process.argv[2] || 'http://localhost:5173/') + 'mockups/hud-unificado/maqueta.html';
const DIRS = (process.argv[3] || 'actual').split(',');
const SCR = (process.argv[4] || 'bastion,garth:garth,garth:grizk,garth:nira,garth:eldrin').split(',');
const OUT = path.join(__dirname, 'capturas'); fs.mkdirSync(OUT, { recursive: true });
const SIZES = { escritorio: [1920, 1080], movil: [844, 390], tableta: [1180, 820] };
(async () => {
  const b = await chromium.launch();
  for (const d of DIRS) for (const [n, [w, h]] of Object.entries(SIZES)) {
     // la tableta, solo de la recomendada
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', (e) => console.log('ERR', e.message));
    for (const s of SCR) { if (n !== 'escritorio' && s === 'componentes') continue;
      const [sc, v] = s.split(':'); await p.goto(`${BASE}?d=${d}&s=${sc}${v ? '&v=' + v : ''}`); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/${n}-${v || sc}.png` }); }
    await p.close();
  }
  await b.close(); console.log('ok');
})();
