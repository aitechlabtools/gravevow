// Tráiler v4: tomas NUEVAS de los menús rehechos (crear, Jugar, Alijo, Personaje, Mercaderes, Tienda), del atuendo
// en la mazmorra y del juego en el móvil. Las tomas de mazmorra y combate se reutilizan del v3 (trailer3-capture.cjs).
// Uso: node scripts/trailer4-capture.cjs http://localhost:5173/play/ /tmp/claude-0/t3 [tomas,separadas,por,comas]
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || 'trailer-frames';
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const want = (n) => !ONLY || ONLY.includes(n);

const GEAR = { mainHand: 'hellforged_blade', offHand: 'demonscale_shield', helmet: 'hellsteel_helm', armor: 'hellsteel_plate',
  gloves: 'demon_gauntlets', boots: 'cinder_boots', amulet: 'heart_of_belzar', ring: 'ember_ring' };
const LOOT = ['chain_axe', 'obsidian_sword', 'veiled_ring', 'requiem_axe', 'silver_helm', 'grave_boots', 'reliquary_amulet', 'headstone_shield'];

function mk(name) { const dir = `${OUT}/${name}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); return dir; }

async function session(b, vp, touch) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const wait = (ms) => page.waitForTimeout(ms);
  const ev = (fn, a) => page.evaluate(fn, a);
  const act = async (id, ms = 350) => { const sel = `[data-testid=${id}]`; await page.waitForSelector(sel, { timeout: 6000 }); if (touch) await page.tap(sel); else await page.click(sel); await wait(ms); };
  const hover = async (id, ms = 450) => { const sel = `[data-testid=${id}]`; await page.waitForSelector(sel, { timeout: 6000 }); await page.hover(sel); await wait(ms); };
  // Screencast de la interfaz (marca de tiempo real de cada fotograma)
  async function record(name, fn) {
    if (!want(name)) return;
    const dir = mk(name); const frames = [];
    const onFrame = ({ data, metadata, sessionId }) => {
      const f = `${dir}/${String(frames.length).padStart(5, '0')}.jpg`;
      fs.writeFileSync(f, Buffer.from(data, 'base64')); frames.push({ f, t: metadata.timestamp });
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    };
    cdp.on('Page.screencastFrame', onFrame);
    await ev(() => window.__GRAVEVOW__?.setState({ toasts: [] }));
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: Math.min(vp.width, 1280), maxHeight: Math.min(vp.height, 720), everyNthFrame: 1 });
    await fn();
    await cdp.send('Page.stopScreencast'); cdp.off('Page.screencastFrame', onFrame);
    fs.writeFileSync(`${dir}/frames.json`, JSON.stringify(frames));
    console.log(name, frames.length, 'fotogramas', frames.length ? ((frames.at(-1).t - frames[0].t)).toFixed(1) + 's' : '');
  }
  // Fotograma a fotograma (mazmorra): el bucle del juego se detiene y se avanza a 30 fps exactos
  async function stepRecord(name, n, perFrame) {
    if (!want(name)) return;
    const dir = mk(name); const frames = [];
    await ev(() => { const g = window.__GRAVEVOW__.game; g.loop.sleep(); window.__cine = { game: g, t: performance.now() }; });
    for (let i = 0; i < n; i++) {
      await ev(([src, i]) => { const c = window.__cine; const sc = window.__GRAVEVOW__.scene();
        if (src) new Function('i', 'sc', 'cam', src)(i, sc, sc.cameras.main);
        c.t += 1000 / 30; sc.lightTimer = 1000; c.game.step(c.t, 1000 / 30); }, [perFrame || '', i]);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: vp.width, height: vp.height, scale: Math.min(1, 1280 / vp.width) } });
      const f = `${dir}/${String(i).padStart(5, '0')}.jpg`; fs.writeFileSync(f, Buffer.from(data, 'base64')); frames.push({ f, t: i / 30 });
    }
    await ev(() => window.__cine.game.loop.wake());
    fs.writeFileSync(`${dir}/frames.json`, JSON.stringify(frames));
    console.log(name, n, 'fotogramas (paso a paso)');
  }
  const start = async () => {
    await page.goto(BASE + '?debug&noclass');
    await ev(() => indexedDB.deleteDatabase('gravevow'));
    await page.reload(); await wait(700);
    await act('btn-play');
    await ev(() => document.fullscreenElement && document.exitFullscreen());
  };
  const advanced = () => ev(([GEAR, LOOT]) => {
    const G = window.__GRAVEVOW__; const pr = G.getState().profile;
    const bp = [...pr.backpack]; LOOT.forEach((id, i) => { bp[i] = { uid: 'bp-' + id, itemId: id, qty: 1 }; });
    bp[LOOT.length] = { uid: 'bp-pot', itemId: 'health_potion', qty: 5 };
    const eq = { ...pr.equipment }; for (const [slot, id] of Object.entries(GEAR)) eq[slot] = { uid: 'eq-' + id, itemId: id, qty: 1 };
    const st = [...pr.stash];
    [['iron_ore', 10], ['silver_ore', 8], ['blessed_silver', 10], ['ancient_bone', 10], ['ectoplasm', 6], ['copper_ore', 10], ['sulfur', 8], ['obsidian_shard', 8]]
      .forEach(([id, q], i) => { st[i] = { uid: 'st' + i, itemId: id, qty: q }; });
    G.setState({ profile: { ...pr, equipment: eq, backpack: bp, stash: st, gold: 21450,
      character: { ...pr.character, level: 85 }, tutorialSeen: { ...pr.tutorialSeen, lobby: true, dungeon: true },
      stats: { ...pr.stats, expeditions: 64, extractions: 51, kills: 830 }, bossesDefeated: ['ossuary_lord', 'veiled_queen', 'belzar'],
      reputation: { garra: 2600, brand: 2600, orvel: 1800, vesper: 1200 }, skins: { owned: [], equipped: null } } });
  }, [GEAR, LOOT]);
  return { b, ctx, page, cdp, wait, ev, act, hover, record, stepRecord, start, advanced };
}

(async () => {
  const b = await chromium.launch();
  // ═══ Escritorio: se graba a 1920×1080 (diseño de escritorio) y se reduce a 1280×720 ═══
  const s = await session(b, { width: 1920, height: 1080 }, false);
  const { page, wait, ev, act, hover, record } = s;
  await s.start();
  await record('n-crear', async () => {
    await wait(500);
    await act('class-mage', 900); await act('class-warrior', 700);
    await page.click('[data-testid=name-input]');
    await page.keyboard.type('Aldric', { delay: 110 }); await wait(700);
  });
  if (!want('n-crear')) await page.fill('[data-testid=name-input]', 'Aldric');
  await act('btn-create'); 
  await s.advanced(); await wait(300);
  await page.mouse.move(5, 5);

  await act('tab-play', 500);
  await record('n-jugar', async () => {
    await wait(700); await act('btn-zone-map', 900);
    await hover('sub-osario', 450); await hover('sub-puertas', 400);
    await act('sub-rios', 900);
  });
  await act('tab-stash', 500);
  await record('n-alijo', async () => {
    await wait(500);
    for (const id of ['chain_axe', 'veiled_ring', 'requiem_axe']) {
      const el = await page.$(`[data-testid^=slot-backpack][data-item=${id}]`);
      if (el) { await el.click(); await wait(1000); }
    }
    const eq = await page.$('[data-testid=slot-equip-mainHand]'); if (eq) { await eq.click(); await wait(900); }
  });
  await page.mouse.move(5, 5);
  await act('tab-character', 500);
  await record('n-personaje', async () => {
    await wait(400);
    const arcs = await page.$$('[data-testid^=arc-]');
    for (const a of arcs.slice(0, 5)) { await a.hover(); await wait(380); }
  });
  await page.mouse.move(5, 5);
  await act('tab-merchants', 500);
  await record('n-forja', async () => {
    await wait(600); await act('vendor-brand', 700); await act('vendor-view-station', 900);
    const r = await page.$('[data-testid^=recipe-]'); if (r) { await r.hover(); await wait(500); }
    const f = await page.$('[data-testid^=forge-r_]:not([disabled])'); if (f) { await f.click(); await wait(1300); }
  });
  await act('tab-merchants', 400);
  if (await page.$('[data-testid=vendor-back]')) await act('vendor-back', 400);
  await record('n-contratos', async () => {
    await wait(400); await act('vendor-garra', 700); await act('vendor-view-contracts', 700);
    for (const id of ['ysolde', 'draven', 'nyx']) { const m = await page.$(`[data-testid=merc-${id}]`); if (m) { await m.click(); await wait(550); } }
    await act('contract-len-3', 350);
    if (await page.$('[data-testid=merc-hire]:not([disabled])')) await act('merc-hire', 1100);
  });
  await act('tab-shop', 500);
  await record('n-tienda', async () => {
    await wait(700);
    await act('shop-buy-skin_ash_lord', 900); await act('skin-confirm-ok', 1100); await act('skin-bought-equip', 1200);
  });
  // El atuendo también se ve en la mazmorra: paseo por el Infierno, paso a paso
  if (want('n-atuendo')) {
    await ev(async () => { await window.__GRAVEVOW__.actions.enterDungeon('infierno'); });
    await wait(1500);
    
    await ev(() => {
      const sc = window.__GRAVEVOW__.scene();
      for (const e of sc.enemies) { e.dead = true; e.sprite.destroy(); e.shadow?.destroy(); e.marker?.destroy(); }
      // Camino largo desde la posición actual (BFS sobre casillas transitables)
      const sx = Math.floor(sc.player.x), sy = Math.floor(sc.player.y); const prev = new Map([[sx + ',' + sy, null]]); const q = [[sx, sy]]; const dist = new Map([[sx + ',' + sy, 0]]); let far = [sx, sy], fd = 0;
      while (q.length) { const [x, y] = q.shift(); const d = dist.get(x + ',' + y); if (d <= 12 && d > fd) { fd = d; far = [x, y]; }
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (prev.has(k) || !sc.walkableTile(nx, ny)) continue; prev.set(k, [x, y]); dist.set(k, d + 1); q.push([nx, ny]); } }
      const path = []; let cur = far; while (cur && !(cur[0] === sx && cur[1] === sy)) { path.unshift(cur); cur = prev.get(cur[0] + ',' + cur[1]); }
      sc.path = path;
    });
    await ev(() => { let st = document.getElementById('cine'); if (!st) { st = document.createElement('style'); st.id = 'cine'; document.head.appendChild(st); }
      st.textContent = '[data-testid^=hud-], .absolute.right-3.top-3, .absolute.left-3.bottom-3, [aria-live=polite].absolute, .absolute.top-3, .absolute.bottom-3 { display: none !important; }'; });
    await s.stepRecord('n-atuendo', 75, 'cam.setZoom(5.4)');
  }
  await s.ctx.close();

  // ═══ Móvil en horizontal 844×390, con toques reales en el joystick ═══
  if (want('n-movil')) {
    const m = await session(b, { width: 844, height: 390 }, true);
    await m.start();
    await m.page.fill('[data-testid=name-input]', 'Aldric'); await m.act('btn-create'); 
    await m.advanced();
    await m.ev(async () => { await window.__GRAVEVOW__.actions.enterDungeon('cripta'); });
    await m.wait(1500);
    
    await m.ev(() => { const sc = window.__GRAVEVOW__.scene(); sc.enemies.forEach((e) => { e.aggro = 0; }); });
    const touch = (type, pts) => m.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
    const zone = await (await m.page.$('[data-testid=touch-stick-zone]')).boundingBox();
    const sx = zone.x + 110, sy = zone.y + zone.height - 100;
    await m.record('n-movil', async () => {
      await m.wait(500);
      await touch('touchStart', [[sx, sy]]);
      const path = [[1, 0], [1, -0.4], [0.6, -1], [0, -1], [-0.7, -0.7], [-1, 0.2], [0, 1]];
      for (const [dx, dy] of path) for (let k = 0; k < 12; k++) { await touch('touchMove', [[sx + dx * 50, sy + dy * 50]]); await m.wait(60); }
      await touch('touchEnd', []); await m.wait(500);
    });
  }
  await b.close();
})().catch((e) => { console.error('FALLO', e); process.exit(1); });
