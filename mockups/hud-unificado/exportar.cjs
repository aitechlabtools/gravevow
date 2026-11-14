// node mockups/hud-unificado/exportar.cjs http://localhost:5173/  → escribe los PNG en mockups/hud-unificado/assets
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto((process.argv[2] || 'http://localhost:5173/') + 'mockups/hud-unificado/_export/index.html'); await p.waitForFunction(() => document.title === 'listo', null, { timeout: 30000 });
  const a = await p.evaluate(() => window.__A__); const dir = path.join(__dirname, 'assets'); fs.mkdirSync(dir, { recursive: true });
  for (const [k, v] of Object.entries(a)) { if (k === 'meta') fs.writeFileSync(path.join(dir, 'meta.json'), v); else fs.writeFileSync(path.join(dir, k + '.png'), Buffer.from(v.split(',')[1], 'base64')); }
  console.log(Object.keys(a).length, 'assets'); await b.close(); })();
