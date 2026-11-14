// Capturas «antes» de las pantallas que no cubre menus-check: entrada del Bastión, estaciones, cocina de Garth,
// HUD de la mazmorra, mochila, conversación y combate. Uso: node mockups/hud-unificado/capturar-antes.cjs <url>/play/
const { chromium } = require('playwright');
const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = path.join(__dirname, 'antes');
const SIZES = [
  { n: 'escritorio', vp: { width: 1920, height: 1080 }, touch: false },
  { n: 'tableta', vp: { width: 1180, height: 820 }, touch: true },
  { n: 'movil', vp: { width: 844, height: 390 }, touch: true },
];
(async () => {
  for (const s of SIZES) {
    const b = await chromium.launch();
    const ctx = await b.newContext({ viewport: s.vp, hasTouch: s.touch, isMobile: s.touch, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const tap = async (id) => { const sel = `[data-testid=${id}]`; await p.waitForSelector(sel, { timeout: 5000 }); if (s.touch) await p.tap(sel); else await p.click(sel); await p.waitForTimeout(300); };
    p.on('pageerror', (e) => console.log('ERR', e.message));
    const shot = (n) => p.screenshot({ path: `${OUT}/${s.n}-${n}.png` });
    await p.goto(URL + '?debug');
    await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(600);
    await tap('btn-play'); await p.evaluate(() => document.fullscreenElement && document.exitFullscreen());
    await p.fill('[data-testid=name-input]', 'Aldric'); await tap('btn-create');
    await p.evaluate(() => { const s = window.__GRAVEVOW__.getState(); s.profile.character.level = 12; s.profile.gold = 900; s.profile.tutorialSeen.dungeon = true;
      const set = (sl, id) => (s.profile.equipment[sl] = { uid: 'x' + id, itemId: id, qty: 1 }); set('mainHand', 'knight_sword'); set('offHand', 'bastion_shield'); set('helmet', 'knight_helm'); set('armor', 'chainmail');
      s.profile.backpack[0] = { uid: 'pp', itemId: 'health_potion', qty: 2 }; });
    await tap('tab-character'); await tap('tab-merchants'); await shot('bastion-entrada');
    try { await tap('btn-refuge'); await shot('bastion-estaciones'); await tap('refuge-back'); } catch (e) { console.log(s.n, 'estaciones', e.message); }
    try { await tap('btn-merchants'); await tap('vendor-garth'); await shot('garth'); await tap('vendor-view-cook'); await shot('garth-cocina'); await tap('vendor-back'); } catch (e) { console.log(s.n, 'garth', e.message); }
    await p.evaluate(() => window.__GRAVEVOW__.actions.closeModal?.()); await p.waitForTimeout(200);
    await tap('tab-play'); await tap('btn-enter-dungeon'); await p.waitForTimeout(1500); await shot('mazmorra');
    try { await tap('btn-inventory'); await shot('mazmorra-mochila'); await p.keyboard.press('Escape'); await p.evaluate(() => window.__GRAVEVOW__.actions.closeModal?.()); await p.waitForTimeout(300); } catch (e) { console.log(s.n, 'mochila', e.message); }
    try {
      const r = await p.evaluate(() => { const r = window.__GRAVEVOW__.scene().rival; return r ? [r.x, r.y] : null; });
      if (r) { await p.evaluate(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x, y), [Math.floor(r[0]) + 1, Math.floor(r[1])]); await p.waitForTimeout(400);
        await p.evaluate(() => window.__GRAVEVOW__.actions.interactRival()); await p.waitForTimeout(300); await tap('rival-talk'); await p.waitForTimeout(300); await shot('conversacion');
        await p.evaluate(() => window.__GRAVEVOW__.actions.closeModal()); await p.waitForTimeout(300); }
    } catch (e) { console.log(s.n, 'conversación', e.message); }
    await p.evaluate(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_sk', 'skeleton'));
    for (let k = 0; k < 40 && !(await p.$('[data-testid=act-attack]:not([disabled])')); k++) await p.waitForTimeout(150);
    await p.waitForTimeout(400); await shot('combate');
    console.log('✓', s.n);
    await b.close();
  }
})();
