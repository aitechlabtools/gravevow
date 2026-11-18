// Capturas «ahora» para el post de Reddit sobre el HUD. Uso: node mockups/reddit-hud/capturar.cjs <url>/play/
const { chromium } = require('playwright');
const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = path.join(__dirname, 'ahora');
const SIZES = [
  { n: 'escritorio', vp: { width: 1920, height: 1080 }, touch: false },
  { n: 'movil', vp: { width: 844, height: 390 }, touch: true },
];
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  for (const s of SIZES) {
    const b = await chromium.launch();
    const ctx = await b.newContext({ viewport: s.vp, hasTouch: s.touch, isMobile: s.touch, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => localStorage.setItem('gv-consent', '{"analytics":false}'));
    const p = await ctx.newPage();
    const tap = async (id) => { await p.waitForTimeout(500); const l = await p.$('[data-testid=btn-class-unlock-later]'); if (l) { await l.click({ force: true }); await p.waitForTimeout(400); } const sel = `[data-testid=${id}]`; await p.waitForSelector(sel, { timeout: 5000 }); if (s.touch) await p.tap(sel); else await p.click(sel); await p.waitForTimeout(400); };
    const shot = (n) => p.screenshot({ path: `${OUT}/${s.n}-${n}.png` });
    await p.goto(URL + '?debug');
    await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(800);
    await tap('btn-play'); await p.evaluate(() => document.fullscreenElement && document.exitFullscreen());
    await p.fill('[data-testid=name-input]', 'Aldric'); await tap('btn-create');
    await p.evaluate(() => { const s = window.__GRAVEVOW__.getState(); s.profile.character.level = 45; s.profile.gold = 4860;
      for (const k of Object.keys(s.profile.tutorialSeen || {})) s.profile.tutorialSeen[k] = true; s.profile.tutorialsOff = true;
      s.profile.backpack[0] = { uid: 'pp', itemId: 'health_potion', qty: 3 }; });
    const clear = async () => { for (let i = 0; i < 4; i++) { await p.evaluate(() => window.__GRAVEVOW__.actions.closeModal?.()); const l = await p.$('[data-testid=btn-class-unlock-later]'); if (l) await l.click({ force: true }); await p.waitForTimeout(300); } };
    await clear();
    await tap('tab-character'); await tap('tab-merchants'); await p.waitForTimeout(800);

    await clear(); await shot('bastion');
    try { await tap('vendor-nira'); await p.waitForTimeout(600); await shot('nira'); } catch (e) { console.log(s.n, 'nira', e.message); }
    await b.close();
  }
})();
