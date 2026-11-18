// Capturas de la pantalla de estación (Rincón de cura de Vesper) en tres estados y tres tamaños.
// Uso: node mockups/bastion-boton-unico/capturar.cjs http://localhost:5173/play/ carpeta-salida
const { chromium } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'mockups/bastion-boton-unico/capturas/despues'] = process.argv;
const SIZES = { escritorio: [1920, 1080, false], tableta: [1180, 820, true], movil: [844, 390, true] };
(async () => {
  const b = await chromium.launch();
  require('fs').mkdirSync(out, { recursive: true });
  for (const [name, [w, h, touch]] of Object.entries(SIZES)) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => localStorage.setItem('gv-consent', '{"analytics":false}'));
    const p = await ctx.newPage();
    const tap = (s) => p.click(s);
    await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
    await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]');
    const setLeather = (n) => p.evaluate((n) => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
      const st = pr.stash.map((s) => (s && s.itemId === 'leather_scrap') ? null : s); let k = 0;
      const put = (itemId, qty) => { while (st[k]) k++; st[k] = { uid: 'm' + k + itemId, itemId, qty }; };
      if (n) put('leather_scrap', n); put('cave_mushroom', 6); put('water', 6); put('bone_dust', 6); put('scrap_metal', 12);
      g.setState({ profile: { ...pr, stash: st, gold: 400, tutorials: pr.tutorials } }); }, n);
    await setLeather(0);
    await tap('[data-testid=tab-merchants]'); await p.waitForSelector('[data-testid=vendor-list]');
    await tap('[data-testid=vendor-vesper]'); await p.waitForSelector('[data-testid=vendor-interior]');
    await tap('[data-testid=vendor-view-station]'); await p.waitForSelector('[data-testid=station-detail-infirmary]');
    const close = async () => { for (const s of ['[data-testid=mini-skip]']) { const e = await p.$(s); if (e && await e.isVisible()) await e.click().catch(() => {}); } };
    await p.waitForTimeout(400); await close();
    await p.screenshot({ path: `${out}/1-ruinas-falta-${name}.png` });
    await setLeather(10); await p.waitForTimeout(300); await close();
    await p.screenshot({ path: `${out}/2-lista-${name}.png` });
    await tap('[data-testid=upgrade-infirmary]'); await p.waitForTimeout(400); await close();
    const up = await p.$('[data-testid=upgrade-open-infirmary]');
    if (up) { await up.click(); await p.waitForSelector('[data-testid=station-detail-infirmary]'); }
    await p.waitForTimeout(300); await close(); await p.waitForTimeout(4500); await close();
    await p.screenshot({ path: `${out}/3-reconstruida-${name}.png` });
    await ctx.close();
  }
  await b.close();
})();
