// Selección de subzona: tarjeta de Jugar y Mapa de zonas en ordenador, tableta y móvil.
// Uso: node scripts/subzones-check.cjs [url] [carpeta]
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/claude-0/subzonas';
const FORMATS = [
  { name: 'escritorio', ctx: { viewport: { width: 1920, height: 1080 } } },
  { name: 'tableta', ctx: { viewport: { width: 1180, height: 820 }, hasTouch: true } },
  { name: 'movil', ctx: { ...devices['iPhone 13 landscape'] } },
];
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  let bad = 0;
  for (const f of FORMATS) {
    const ctx = await b.newContext(f.ctx); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const touch = !!f.ctx.hasTouch;
    const act = async (id) => { const s = `[data-testid=${id}]`; await p.waitForSelector(s, { timeout: 8000 }); touch ? await p.tap(s) : await p.click(s); await p.waitForTimeout(200); };
    await p.goto(BASE + '?debug');
    await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload();
    await act('btn-play');
    await p.evaluate(() => document.fullscreenElement && document.exitFullscreen());
    await p.fill('[data-testid=name-input]', 'Saqueador'); await act('btn-create'); 
    await p.evaluate(() => { const d = window.__GRAVEVOW__; const pr = d.getState().profile; d.setState({ profile: { ...pr, character: { ...pr.character, level: 45 }, bossesDefeated: ['ossuary_lord'], stats: { ...pr.stats, expeditions: 4 } } }); });
    // Con nivel 45 sale el aviso de desbloqueo de clase: se deja para más tarde
    await p.waitForTimeout(200); { const later = await p.$('[data-testid=btn-class-unlock-later]'); if (later) await later.click(); }
    await act('tab-character'); await act('tab-play');
    const name = await p.textContent('[data-testid=zone-name]');
    console.log(f.name, 'propone:', name);
    await p.screenshot({ path: `${OUT}/${f.name}-jugar.png` });
    await act('btn-zone-map');
    await p.screenshot({ path: `${OUT}/${f.name}-mapa.png` });
    if (f.name === 'movil') { await act('zone-tabs-mazmorra').catch(() => {}); }
    // Elegir una subzona fácil
    if (f.name === 'movil') { const t = await p.$('[data-testid=zone-tabs] button'); if (t) { await t.tap(); await p.waitForTimeout(200); } }
    await act('sub-castillo');
    const easy = await p.$('[data-testid=zone-easy-note]');
    console.log(f.name, 'elige:', await p.textContent('[data-testid=zone-name]'), '· aviso fácil:', !!easy);
    if (!easy) bad++;
    await p.screenshot({ path: `${OUT}/${f.name}-facil.png` });
    // Filas de 44 px o más
    await act('btn-zone-map');
    const small = await p.$$eval('.subzone-row', (els) => els.filter((e) => e.getBoundingClientRect().height < 44).length);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (small || overflow) { bad++; console.log(f.name, 'filas pequeñas:', small, 'desborda:', overflow); }
    if (errs.length) { bad++; console.log(errs); }
    await ctx.close();
  }
  await b.close();
  console.log(bad ? 'FALLOS: ' + bad : 'Todo bien');
  process.exit(bad ? 1 : 0);
})();
