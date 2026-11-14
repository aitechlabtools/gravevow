// Capturas de la maqueta del menú principal: node mockups/menu-principal/capturar.cjs [http://localhost:5173/]
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:5173/';
const OUT = path.join(__dirname, 'capturas'); fs.mkdirSync(OUT, { recursive: true });
const SIZES = { escritorio: [1920, 1080], tableta: [1180, 820], movil: [844, 390] };
(async () => {
  const b = await chromium.launch();
  for (const [n, [w, h]] of Object.entries(SIZES)) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', (e) => console.log('ERR', e.message));
    for (const v of ['chevron', 'recta', 'juego', 'negro']) { await p.goto(`${BASE}mockups/menu-principal/maqueta.html?v=${v === 'juego' ? 'chevron&m=juego' : v === 'negro' ? 'chevron&m=juego&f=negro' : v}`); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/${n}-${v}.png` }); }
    await p.goto(`${BASE}play/`); await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/${n}-antes.png` });
    await p.close();
  }
  await b.close(); console.log('ok');
})();
