// Capturas: Habilidades, Alijo con el desglose, Elegir personaje con la trayectoria y Bestiario con los contadores.
// Uso: node mockups/reorganizacion-habilidades/capturar.cjs [http://localhost:5173/play/]
const { chromium, devices } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = path.join(__dirname, 'capturas');
const SIZES = { escritorio: { viewport: { width: 1920, height: 1080 } }, tableta: { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true }, movil: { ...devices['iPhone 13 landscape'] } };
(async () => {
  const b = await chromium.launch();
  for (const [n, opt] of Object.entries(SIZES)) {
    const ctx = await b.newContext(opt); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const tap = (s) => (opt.hasTouch ? p.tap(s) : p.click(s));
    const shot = (s) => p.screenshot({ path: `${OUT}/${n}-${s}.png` });
    await p.goto(URL + '?debug'); await p.evaluate(() => new Promise((r) => { try { localStorage.clear(); } catch {} const q = indexedDB.deleteDatabase('gravevow'); q.onsuccess = q.onerror = q.onblocked = () => r(); })); await p.reload(); await p.waitForSelector('[data-testid=btn-play]');
    for (const [name, cls] of [['Pau', 'warrior'], ['Neria', 'mage']]) {
      if (await p.$('[data-testid=btn-play]')) await tap('[data-testid=btn-play]');
      else { await tap('[data-testid=tab-play]').catch(() => {}); }
      await p.fill('[data-testid=name-input]', name); await tap(`[data-testid=class-${cls}]`).catch(() => {}); await tap('[data-testid=btn-create]'); await p.waitForTimeout(400);
      await p.evaluate((name) => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialSeen.dungeon = true; pr.tutorialSeen.lobby = true;
        const rich = name === 'Pau';
        g.setState({ profile: { ...pr, character: { ...pr.character, level: rich ? 5 : 2, xp: rich ? 204 : 40 }, stats: rich ? { expeditions: 3, extractions: 2, deaths: 1, kills: 11 } : pr.stats,
          bestiary: rich ? { rat: { seen: 3, kills: 7 }, skeleton: { seen: 2, kills: 3 }, bandit: { seen: 1, kills: 1 }, ossuary_lord: { seen: 1, kills: 0 } } : {} } });
        g.actions.save?.(); }, name);
      if (name === 'Pau') {
        await tap('[data-testid=tab-character]'); await p.waitForTimeout(400); await p.click('[data-testid=atk-basic]').catch(() => {}); await shot('1-habilidades');
        await tap('[data-testid=tab-stash]'); await p.waitForTimeout(400);
        const row = '[data-testid=alijo-hero] [data-stat=maxHp]';
        if (opt.hasTouch) await p.tap(row); else await p.hover(row);
        await p.waitForTimeout(200); await shot('2-alijo-desglose');
        await tap('[data-testid=tab-bestiary]'); await p.waitForTimeout(400); await shot('4-bestiario');
        await p.evaluate(() => window.__GRAVEVOW__.actions.openSelect?.()); await p.waitForTimeout(300);
        if (await p.$('[data-testid^=btn-new-char-]')) await tap('[data-testid^=btn-new-char-]');
      }
    }
    await p.evaluate(() => window.__GRAVEVOW__.actions.openSelect()); await p.waitForTimeout(500); await shot('3-elegir-personaje');
    console.log(n, errs.length ? errs : 'sin errores'); await ctx.close();
  }
  await b.close();
})();
