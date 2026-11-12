const { chromium, devices } = require('playwright');
const [,, url, out, dev] = process.argv;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  await p.goto(url + '?debug'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload();
  await tap('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); 
  await p.evaluate(() => { const s = window.__GRAVEVOW__.getState(); s.profile.character.level = 45; s.profile.stats.expeditions = 3; s.profile.bossesDefeated = ['ossuary_lord']; s.profile.tutorialSeen.dungeon = true;
    const set = (sl, id) => (s.profile.equipment[sl] = { uid: 'x' + id, itemId: id, qty: 1 }); set('mainHand', 'gravewarden_blade'); set('offHand', 'headstone_shield'); set('helmet', 'silver_helm'); set('armor', 'silver_plate'); });
  await tap('[data-testid=tab-character]'); await tap('[data-testid=tab-play]'); await p.waitForTimeout(300);
  await tap('[data-testid=btn-zone-map]'); await tap('[data-testid=sub-osario]'); await p.waitForTimeout(200); await p.screenshot({ path: out + '-picker.png' });
  await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1800); await p.screenshot({ path: out + '-map.png' });
  for (const [id, en] of [['e_g', 'ghoul'], ['e_w', 'wraith'], ['e_q', 'veiled_queen']]) {
    await p.evaluate(([i, e]) => window.__GRAVEVOW__.actions.startCombat('pve', i, e), [id, en]);
    for (let k = 0; k < 40 && !(await p.$('[data-testid=act-attack]:not([disabled])')); k++) await p.waitForTimeout(150);
    await p.waitForTimeout(300); await p.screenshot({ path: `${out}-${en}.png` });
    await p.evaluate((i) => { const s = window.__GRAVEVOW__.getState(); const c = s.combat?.state.combatants.find((x) => x.id === i); if (c) c.hp = 1; }, id);
    for (let i = 0; i < 20; i++) { const o = await p.evaluate(() => { const s = window.__GRAVEVOW__.getState(); return !s.combat || !!s.combat.state.outcome; }); if (o) break; const a = await p.$('[data-testid=act-attack]:not([disabled])'); if (a) await a.click(); await p.waitForTimeout(400); }
    const c = await p.$('[data-testid=btn-combat-continue]'); if (c) await c.click(); await p.waitForTimeout(300);
  }
  const bd = await p.evaluate(() => window.__GRAVEVOW__.getState().profile.bossesDefeated);
  console.log('jefes', bd, 'errores', errs.length ? errs : 'ninguno');
  await b.close();
})();
