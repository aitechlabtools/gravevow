const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const sz = { desktop: [1920, 1080], tablet: [1180, 820], phone: [844, 390] };
  for (const [l, [w, h]] of Object.entries(sz)) for (const s of ['sonido', 'partida']) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('file://' + path.join(__dirname, `panel.html?l=${l}&s=${s}`)); await p.waitForTimeout(800);
    const over = await p.evaluate(() => [document.documentElement.scrollWidth - innerWidth, [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().height < 43.5).length]);
    console.log(l, s, 'desborde', over[0], 'botones <44', over[1]);
    await p.screenshot({ path: path.join(__dirname, 'capturas', `${l}-${s}.png`) }); await p.close(); }
  await b.close(); })();
