// Mockups v3 de escritorio. node mockups/estado-simplificado/capturar-v3.cjs [url base]
const { chromium } = require('playwright'); const path = require('path');
const BASE = (process.argv[2] || 'http://localhost:5173') + '/mockups/estado-simplificado/escritorio-v3.html';
const CASES = { sano: 'caso=sano', herido: 'caso=herido', 'cura-almacen': 'caso=cura&src=almacen', 'cura-mochila': 'caso=cura', comida: 'caso=comida', 'sin-oro': 'caso=pobre' };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const [n, qs] of Object.entries(CASES)) { await p.goto(`${BASE}?${qs}`); await p.waitForTimeout(300); await p.screenshot({ path: path.join(__dirname, 'capturas', `v3-escritorio-${n}.png`) }); }
  await b.close(); console.log('ok'); })();
