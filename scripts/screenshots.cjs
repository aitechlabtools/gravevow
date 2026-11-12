// Genera capturas reales del juego para la web: node scripts/screenshots.cjs http://localhost:5173/play/ public/screenshots
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || 'public/screenshots';
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const tp = (x, y) => page.evaluate(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x, y), [x, y]);
  await page.goto(BASE + '?debug');
  await page.click('[data-testid=btn-play]');
  await page.fill('[data-testid=name-input]', 'Aldric');
  await page.click('[data-testid=btn-create]');
  
  // Algo de equipo para que el inventario luzca
  await page.evaluate(() => {
    const s = window.__GRAVEVOW__.getState();
    s.profile.gold = 600;
    s.profile.character.level = 3;
  });
  await page.click('[data-testid=tab-merchants]'); await page.click('[data-testid=btn-merchants]');
  await page.click('[data-testid=vendor-orvel]');
  for (const id of ['iron_helm', 'gauntlets', 'chainmail', 'iron_sword', 'health_potion', 'copper_ring', 'antidote']) await page.click(`[data-testid=buy-${id}]`);
  await page.click('[data-testid=tab-stash]');
  for (const id of ['iron_helm', 'gauntlets', 'chainmail', 'iron_sword', 'copper_ring']) {
    const el = await page.$(`[data-testid^=slot-backpack][data-item=${id}]`);
    if (el) await el.dblclick();
  }
  await page.hover('[data-testid^=slot-backpack][data-item=rusty_sword]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/inventory.png` });
  await page.click('[data-testid=tab-play]');
  await page.click('[data-testid=btn-enter-dungeon]');
  
  const r = await page.evaluate(() => { const r = window.__GRAVEVOW__.scene().rival; return [r.x, r.y]; });
  await tp(Math.floor(r[0]) + 1, Math.floor(r[1]));
  await page.waitForTimeout(500);
  await page.keyboard.press('e');
  await page.click('[data-testid=rival-talk]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/rival.png` });
  await page.click('[data-testid=rival-ally]');
  await page.keyboard.press('Escape');
  await tp(4, 17);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/dungeon.png` });
  // Jefe
  await page.evaluate(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_boss', 'ossuary_lord'));
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(1100);
    if (await page.$('[data-testid=act-attack]:not([disabled])')) {
      await page.click('[data-testid=act-special]');
      const btn = await page.$('[data-testid=skill-rending_slash]:not([disabled])');
      if (btn) await btn.click(); else await page.keyboard.press('Escape');
    }
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/combat.png` });
  await b.close();
})();
