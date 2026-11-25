// Fondos sin fichas + posiciones de los luchadores, y el menú de heridas real: node mockups/combate-heridas-barras/fondo.cjs [url]
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const URL = process.argv[2] || 'http://localhost:5174/play/';
const SIZES = { escritorio: [1920, 1080, false], tableta: [1180, 820, true], movil: [844, 390, true] };
const CASES = { '1v1': { ally: false, two: false }, '2v2': { ally: true, two: true } };
const geo = {};
(async () => { const b = await chromium.launch();
  for (const [sz, [w, h, touch]] of Object.entries(SIZES)) for (const [cn, cs] of Object.entries(CASES)) {
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && sz === 'movil' }); const p = await c.newPage();
    await p.goto(URL + '?debug'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(700);
    await p.click('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Pau'); await p.click('[data-testid=btn-create]');
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialDone = true; for (const k of Object.keys(pr.tutorialSeen||{})) pr.tutorialSeen[k]=true; pr.tutorialSeen.dungeon = true; g.setState({ tutorial: null, profile: { ...pr } }); });
    await p.click('[data-testid=tab-play]'); await p.click('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(2000);
    await p.evaluate((cs) => { const G = window.__GRAVEVOW__, s = G.getState(), e = s.expedition, b = structuredClone(e.body);
      b.parts.armL.hp = 1; b.parts.armL.fracture = true; b.parts.legR.bleed = 2; b.parts.legR.hp = Math.floor(b.parts.legR.hp*0.5); b.parts.thorax.hp = Math.floor(b.parts.thorax.hp*0.6); b.parts.abdomen.bleed = 1;
      G.setState({ expedition: { ...e, body: b }, ...(cs.ally ? { rival: { ...s.rival, who: s.rival.who || 'kael', disposition: 'allied', hp: 60, potions: 1 } } : {}) });
      G.actions.startCombat('pve', 'e1', 'skeleton', cs.two ? { entityId: 'e2', enemyId: 'skeleton' } : undefined); }, cs);
    await p.waitForTimeout(2600);
    if (cn === '1v1') { await p.click('[data-testid=combat-body]'); await p.waitForTimeout(500); await p.screenshot({ path: path.join(__dirname, `real-menu-${sz}.png`) }); await p.click('[data-testid=combat-body-close]'); await p.waitForTimeout(300); }
    await p.addStyleTag({ content: '.info-stack,.turn-arrow,.dmg-float{display:none!important}' }); await p.waitForTimeout(200);
    geo[`${sz}-${cn}`] = await p.evaluate(() => { const r = (el) => { const q = el.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)]; };
      const f = {}; document.querySelectorAll('[data-testid^=fighter-]').forEach((el) => { const img = el.querySelector('img'); f[el.dataset.testid.slice(8)] = r(img || el); });
      const bar = document.querySelector('.combat-bar'); return { fighters: f, barTop: bar ? Math.round(bar.getBoundingClientRect().top) : 0 }; });
    await p.screenshot({ path: path.join(__dirname, `fondo-${sz}-${cn}.png`) });
    await c.close(); }
  fs.writeFileSync(path.join(__dirname, 'geo.json'), JSON.stringify(geo, null, 1)); await b.close(); })();
