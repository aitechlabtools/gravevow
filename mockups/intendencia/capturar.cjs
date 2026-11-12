// Capturas de la Intendencia › Equipo: node mockups/intendencia/capturar.cjs <url>/play/
const { chromium } = require('playwright'); const path = require('path');
const url = process.argv[2] || 'http://localhost:5173/play/';
(async () => {
  const b = await chromium.launch();
  for (const [dev, w, h] of [['1920x1080', 1920, 1080], ['1366x768', 1366, 768], ['tableta-1180x820', 1180, 820]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(url + '?debug'); await p.click('[data-testid=btn-play]');
    await p.fill('[data-testid=name-input]', 'Aldric'); await p.click('[data-testid=btn-create]');
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; const bp = pr.backpack.slice();
      bp[0] = { uid: 'a', itemId: 'bandage', qty: 2 }; bp[1] = { uid: 'b', itemId: 'stale_bread', qty: 1 }; bp[2] = { uid: 'c', itemId: 'water', qty: 1 };
      const pk = pr.pocket.slice(); pk[0] = { uid: 'k', itemId: 'iron_key', qty: 1 };
      g.setState({ profile: { ...pr, backpack: bp, pocket: pk, tutorialSeen: { ...pr.tutorialSeen, dungeon: true } } }); });
    await p.click('[data-testid=tab-stash]'); await p.waitForSelector('[data-testid=alijo-backpack]'); await p.waitForTimeout(400);
    const sc = await p.evaluate(() => { const e = document.querySelector('[data-testid=equip-body]'); return e ? e.scrollHeight - e.clientHeight : -1; });
    console.log(dev, 'columnas', await p.getAttribute('[data-testid=equip-body]', 'data-cols'), 'desborde', sc);
    await p.screenshot({ path: path.join(__dirname, 'capturas', `${dev}-1-equipo.png`) });
    await p.click('[data-testid=slot-backpack-1]'); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(__dirname, 'capturas', `${dev}-2-ficha.png`) });
    await p.close();
  }
  await b.close();
})();
