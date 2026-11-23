const { chromium, devices } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13 landscape'] }); const p = await c.newPage();
  const tap = async (s) => { await p.waitForSelector(s); await p.tap(s); await p.waitForTimeout(400); };
  await p.goto('http://localhost:5173/play/?debug'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(600);
  await tap('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Pau'); await tap('[data-testid=btn-create]');
  await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialDone = true; pr.tutorialSeen.dungeon = true; g.setState({ tutorial: null, profile: { ...pr } }); });
  await tap('[data-testid=tab-play]'); await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(2500);
  await p.screenshot({ path: path.join(__dirname, 'fondo-movil.png') }); await b.close(); })();
