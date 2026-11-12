// Capturas de las pantallas con más texto para revisar la legibilidad (ordenador, tableta y móvil).
// Uso: node scripts/legibilidad-shots.cjs http://localhost:5173/play/ <carpeta> [antes]
// «antes» inyecta la letra antigua de los números (solo para comparar).
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || 'legibilidad';
const BEFORE = process.argv[4] === 'antes';
require('fs').mkdirSync(OUT, { recursive: true });

const FORMATS = [
  { name: 'escritorio', ctx: { viewport: { width: 1440, height: 900 } } },
  { name: 'tableta', ctx: devices['iPad (gen 7) landscape'] },
  { name: 'movil', ctx: devices['iPhone 13 landscape'] },
];

(async () => {
  const b = await chromium.launch();
  const errs = [];
  for (const f of FORMATS) {
    const ctx = await b.newContext(f.ctx);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(f.name + ': ' + e.message));
    const touch = !!f.ctx.hasTouch;
    const tap = (sel) => (touch ? p.tap(sel) : p.click(sel));
    const shot = async (n) => { await p.waitForTimeout(350); await p.screenshot({ path: `${OUT}/${f.name}-${n}.png` }); };
    await p.goto(BASE + '?debug');
    if (BEFORE) await p.addStyleTag({ content: ':root{--font-pixel:"Pixelify Sans",monospace}' });
    await tap('[data-testid=btn-play]');
    await p.fill('[data-testid=name-input]', 'Aldric');
    await tap('[data-testid=btn-create]');
    await tap('[data-testid=btn-tutorial-ok]');
    await p.evaluate(() => { const s = window.__GRAVEVOW__.getState(); s.profile.tutorialSeen.dungeon = true; s.profile.reputation.vesper = 50; s.profile.reputation.orvel = 70; });
    await shot('01-jugar');
    for (const [tab, n] of [['character', '02-personaje'], ['stash', '03-alijo'], ['merchants', '04-mercaderes'], ['quests', '05-misiones'], ['bestiary', '06-bestiario'], ['shop', '07-atuendos']]) {
      await tap(`[data-testid=tab-${tab}]`); await shot(n);
    }
    await tap('[data-testid=tab-merchants]'); await tap('[data-testid=btn-merchants]'); await tap('[data-testid=vendor-orvel]'); await shot('08-tienda');
    await tap('[data-testid=tab-play]'); await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1500); await shot('09-mazmorra');
    await p.evaluate(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_x', 'skeleton'));
    for (let i = 0; i < 40 && !(await p.$('[data-testid=act-attack]:not([disabled])')); i++) await p.waitForTimeout(150);
    await shot('10-combate');
    await ctx.close();
  }
  console.log('errores', errs.length ? errs : 'ninguno');
  await b.close();
})();
