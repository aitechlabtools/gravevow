// Estado actual del combate: node mockups/combate-heridas-barras/antes.cjs [url]
const { chromium } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5174/play/';
const SIZES = { escritorio: [1920, 1080, false], tableta: [1180, 820, true], movil: [844, 390, true] };
const CASES = { '1v1': { ally: false, two: false }, '1v2': { ally: false, two: true }, '2v2': { ally: true, two: true } };
(async () => { const b = await chromium.launch();
  for (const [sz, [w, h, touch]] of Object.entries(SIZES)) for (const [cn, cs] of Object.entries(CASES)) {
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && sz === 'movil', deviceScaleFactor: 1 }); const p = await c.newPage();
    await p.goto(URL + '?debug'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(700);
    await p.click('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Pau'); await p.click('[data-testid=btn-create]');
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialDone = true; pr.tutorialSeen.dungeon = true; for (const k of Object.keys(pr.tutorialSeen||{})) pr.tutorialSeen[k]=true; g.setState({ tutorial: null, profile: { ...pr } }); });
    await p.click('[data-testid=tab-play]'); await p.click('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(2000);
    await p.evaluate((cs) => { const G = window.__GRAVEVOW__, s = G.getState(), e = s.expedition, b = structuredClone(e.body);
      b.parts.armL.hp = 1; b.parts.armL.fracture = true; b.parts.legR.bleed = 2; b.parts.legR.hp = Math.floor(b.parts.legR.hp*0.5); b.parts.thorax.hp = Math.floor(b.parts.thorax.hp*0.6); b.parts.abdomen.bleed = 1;
      G.setState({ expedition: { ...e, body: b }, ...(cs.ally ? { rival: { ...s.rival, who: s.rival.who || 'kael', disposition: 'allied', hp: 60, potions: 1 } } : {}) });
      G.actions.startCombat('pve', 'e1', 'skeleton', cs.two ? { entityId: 'e2', enemyId: 'skeleton' } : undefined); }, cs);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(__dirname, `antes-${sz}-${cn}.png`) });
    await c.close(); }
  await b.close(); })();
