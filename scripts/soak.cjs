// Prueba de resistencia: varias expediciones seguidas en las tres zonas (cofres, vetas, combates, prisioneros
// y extracción) buscando errores de consola o estados imposibles.
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const RUNS = Number(process.argv[3] || 6);
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const tap = async (sel) => { await page.waitForSelector(sel, { timeout: 8000 }); await page.click(sel); };
  await page.goto(BASE + '?debug');
  await page.evaluate(() => indexedDB.deleteDatabase('gravevow'));
  await page.reload();
  await tap('[data-testid=btn-play]');
  await page.fill('[data-testid=name-input]', 'Soak');
  await tap('[data-testid=class-mage]');
  await tap('[data-testid=btn-create]');
  
  const zones = ['mazmorra', 'cripta', 'infierno'];
  for (let run = 0; run < RUNS; run++) {
    const zone = zones[run % 3];
    await page.evaluate((lvl) => {
      const d = window.__GRAVEVOW__; const p = d.getState().profile;
      let backpack = [...p.backpack];
      const free = backpack.findIndex((x) => !x);
      if (free >= 0 && !backpack.some((x) => x && x.itemId === 'steel_pick')) backpack[free] = { uid: 'pk' + Math.random(), itemId: 'steel_pick', qty: 1 };
      d.setState({ profile: { ...p, backpack, gold: 99999, character: { ...p.character, level: lvl }, bossesDefeated: ['ossuary_lord', 'veiled_queen'], stats: { ...p.stats, expeditions: Math.max(1, p.stats.expeditions) }, tutorialSeen: { lobby: true, dungeon: true } } });
    }, [5, 35, 65][run % 3]);
    if (run === 1) await page.evaluate(() => window.__GRAVEVOW__.actions.hireMerc('bram', 3, 'cautious'));
    await page.evaluate((z) => window.__GRAVEVOW__.actions.enterDungeon(z), zone);
    await page.waitForSelector('[data-testid=game-canvas]');
    await page.waitForTimeout(900);
    const info = await page.evaluate(() => {
      const d = window.__GRAVEVOW__; const sc = d.scene(); const st = d.getState();
      for (const c of sc.chests) { d.actions.openChest(c.id, c.table, true); d.actions.takeAll(c.id); d.actions.closeModal(); }
      for (const v of sc.veins) d.actions.mineVein(v.id, v.vein);
      const cap = st.dungeon.entities.find((e) => e.kind === 'captive');
      if (cap && !d.getState().merc) d.actions.freeCaptive(cap.mercId);
      return { zone: st.dungeon.zone, chests: sc.chests.length, veins: sc.veins.length, captive: cap?.mercId ?? null, merc: d.getState().merc?.id ?? null };
    });
    // Tres combates rápidos con el botón de atacar
    for (let k = 0; k < 3; k++) {
      const ok = await page.evaluate((k) => { const sc = window.__GRAVEVOW__.scene(); const e = sc.enemies.filter((x) => !x.dead && !x.boss)[0]; if (!e) return false; window.__GRAVEVOW__.actions.startCombat('pve', e.id, e.enemyId); return true; }, k);
      if (!ok) break;
      for (let i = 0; i < 200; i++) {
        const s = await page.evaluate(() => { const c = window.__GRAVEVOW__.getState().combat; return c ? (c.state.outcome ?? 'on') : 'none'; });
        if (s !== 'on') break;
        const a = await page.$('[data-testid=act-attack]:not([disabled])');
        if (a) await a.click().catch(() => {});
        await page.waitForTimeout(120);
      }
      const out = await page.evaluate(() => window.__GRAVEVOW__.getState().combat?.state.outcome);
      if (await page.$('[data-testid=btn-combat-continue]')) await page.click('[data-testid=btn-combat-continue]').catch(() => {});
      await page.waitForTimeout(200);
      if (out === 'defeat') break;
    }
    const screen = await page.evaluate(() => window.__GRAVEVOW__.getState().screen);
    if (screen === 'dungeon') await page.evaluate(() => window.__GRAVEVOW__.actions.finishExpedition('extracted'));
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => { const s = window.__GRAVEVOW__.getState(); const p = s.profile; return { screen: s.screen, note: s.summary?.mercNote ?? null, contract: p.contract, rescued: p.mercsRescued, veins: p.quests.find((q) => q.id === 'q_brand_mine').progress, cos: p.cosmetics.length, kills: p.stats.kills }; });
    console.log(`#${run} ${info.zone}: cofres ${info.chests}, vetas ${info.veins}, prisionero ${info.captive}, merc ${info.merc} →`, JSON.stringify(after));
    await page.evaluate(() => window.__GRAVEVOW__.actions.backToLobby());
    await page.waitForTimeout(200);
  }
  console.log('errores:', errors.length ? errors.slice(0, 10) : 'ninguno');
  await b.close();
})().catch((e) => { console.error('FALLO', e); process.exit(1); });
