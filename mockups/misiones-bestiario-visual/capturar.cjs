// Capturas de la maqueta: node mockups/misiones-bestiario-visual/capturar.cjs [url]
const { chromium } = require('playwright'); const path = require('path');
const base = (process.argv[2] || 'http://localhost:5173') + '/mockups/misiones-bestiario-visual/proto.html';
const SIZES = [['escritorio', 1920, 1080, false], ['tableta', 1180, 820, true], ['movil', 844, 390, true]];
const SHOTS = [
  ['1-misiones-tablon', 'v=misiones'],
  ['2a-mision-panel-lateral', 'v=misiones&sel=panel'],
  ['2b-mision-nota-ampliada', 'v=misiones&sel=nota'],
  ['3-misiones-disponibles', 'v=disponibles'],
  ['4a-bestiario-marcos', 'v=bestiario'],
  ['4b-bestiario-marcos-rombos', 'v=bestiario&pips=1'],
  ['5a-ficha-a-medias', 'v=ficha&id=__RAT__'],
  ['5b-ficha-completa', 'v=ficha&id=__FULL__'],
];
(async () => {
  const b = await chromium.launch();
  const only = process.argv[3];
  for (const [dev, w, h, touch] of SIZES) {
    const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && dev === 'movil' });
    p.on('pageerror', (e) => console.log('ERR', e.message));
    for (const [n, qs0] of SHOTS) {
      if (only && !n.startsWith(only)) continue;
      const qs = qs0.replace('__RAT__', 'ossuary_rat').replace('__FULL__', 'bandit');
      await p.goto(`${base}?${qs}`); await p.waitForTimeout(900);
      const small = await p.evaluate(() => [...document.querySelectorAll('button, [role=tab]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44) && getComputedStyle(e).visibility !== 'hidden'; }).length);
      console.log(dev, n, 'botones <44px:', small);
      await p.screenshot({ path: path.join(__dirname, 'capturas', 'v2', `${dev}-${n}.png`) });
    }
    await p.close();
  }
  await b.close();
})();
