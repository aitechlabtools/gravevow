// Capturas de la selección de ataque y del coste neutro en Habilidades.
// node mockups/habilidades-seleccion/capturar.cjs <url /play/> <prefijo: antes|despues>
const { chromium, devices } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/'; const TAG = process.argv[3] || 'despues';
const OUT = path.join(__dirname, 'capturas');
const SIZES = { escritorio: { viewport: { width: 1920, height: 1080 } }, tableta: { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true }, movil: { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } } };
(async () => {
  const b = await chromium.launch();
  for (const [n, opt] of Object.entries(SIZES)) {
    const ctx = await b.newContext(opt); await ctx.addInitScript(() => localStorage.setItem('gv-consent', 'denied')); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const tap = (s) => (opt.hasTouch ? p.tap(s) : p.click(s));
    await p.goto(URL + '?debug'); await tap('[data-testid=btn-play]');
    await p.fill('[data-testid=name-input]', 'Beothord'); await tap('[data-testid=btn-create]'); await p.waitForTimeout(500);
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialSeen.dungeon = true; pr.tutorialSeen.lobby = true;
      g.setState({ profile: { ...pr, character: { ...pr.character, level: 3 } } }); });
    await tap('[data-testid=tab-character]'); await p.waitForTimeout(400);
    // Elige el segundo ataque de la mano derecha (Tajo desgarrador con espada corta)
    await tap('[data-testid=character-skills] .hb-acard >> nth=1'); await p.waitForTimeout(250);
    await p.screenshot({ path: `${OUT}/${TAG}-${n}-ataques.png` });
    if (await p.$('[data-testid=character-mode-hero]')) {
      await tap('[data-testid=character-mode-hero]'); await p.waitForTimeout(300);
      await p.screenshot({ path: `${OUT}/${TAG}-${n}-atributos.png` });
      await tap('[data-testid=character-mode-skills]'); await p.waitForTimeout(300);
      await p.screenshot({ path: `${OUT}/${TAG}-${n}-vuelta.png` });
    }
    const st = await p.$('[data-testid=character-stats]'); if (st) await st.screenshot({ path: `${OUT}/${TAG}-${n}-panel-atributos.png` });
    console.log(TAG, n, errs.length ? errs : 'sin errores');
    await ctx.close();
  }
  await b.close();
})();
