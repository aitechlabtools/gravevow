// Tráiler v5 (alpha, 60 s): graba TODAS las tomas: las 10 subzonas, el combate con la barra nueva, el Alijo con rarezas,
// Kael y su traición, mercaderes, tienda y móvil. Después: node trailer/v5/make.cjs → python3 trailer/v5/render.py → python3 trailer/v5/music.py
// (o todo junto: npm run trailer). Uso: node scripts/trailer5-capture.cjs http://localhost:5173/play/ /tmp/claude-0/t5 [tomas,separadas,por,comas]
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || 'trailer-frames';
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const want = (n) => !ONLY || ONLY.includes(n);

const GEAR = { mainHand: 'hellforged_blade', offHand: 'demonscale_shield', helmet: 'hellsteel_helm', armor: 'hellsteel_plate',
  gloves: 'demon_gauntlets', boots: 'cinder_boots', amulet: 'heart_of_belzar', ring: 'ember_ring' };
// Botín de todas las rarezas, con atributos y legendarias
const LOOT = [['chain_axe', 'epic', ['vampire', 'bleeding']], ['belzar_chain', 'legendary'], ['throne_greatsword', 'epic', ['executioner', 'swift']], ['dukes_rapier', 'rare', ['frost']],
  ['obsidian_sword', 'uncommon', ['stone']], ['war_mace', 'common'], ['belzar_broken_crown', 'legendary'], ['silver_helm', 'rare', ['hermit']], ['grave_boots', 'uncommon', ['swift']], ['chain_shield', 'rare', ['sage']]];

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
        if (!sc) return;
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
    const bp = [...pr.backpack]; LOOT.forEach(([id, rarity, affixes], i) => { bp[i] = { uid: 'bp-' + id, itemId: id, qty: 1, rarity, ...(affixes ? { affixes } : {}) }; });
    bp[LOOT.length] = { uid: 'bp-pot', itemId: 'health_potion', qty: 5 };
    const eq = { ...pr.equipment }; for (const [slot, id] of Object.entries(GEAR)) eq[slot] = { uid: 'eq-' + id, itemId: id, qty: 1 };
    const st = [...pr.stash];
    [['iron_ore', 10], ['silver_ore', 8], ['blessed_silver', 10], ['ancient_bone', 10], ['ectoplasm', 6], ['copper_ore', 10], ['sulfur', 8], ['obsidian_shard', 8]]
      .forEach(([id, q], i) => { st[i] = { uid: 'st' + i, itemId: id, qty: q }; });
    G.setState({ profile: { ...pr, equipment: eq, backpack: bp, stash: st, gold: 21450,
      character: { ...pr.character, level: 95 }, classSkills: { unlocked: ['war_cry', 'bloodthirst', 'last_bastion', 'hold_line', 'steel_whirl'], equipped: 'bloodthirst' }, tutorialSeen: { ...pr.tutorialSeen, lobby: true, dungeon: true },
      stats: { ...pr.stats, expeditions: 64, extractions: 51, kills: 830 }, bossesDefeated: ['ossuary_lord', 'veiled_queen', 'belzar'],
      reputation: { garra: 2600, brand: 2600, orvel: 1800, vesper: 1200 }, skins: { owned: [], equipped: null } } });
  }, [GEAR, LOOT]);
  const cinematic = (on) => ev((on) => { let st = document.getElementById('cine'); if (!st) { st = document.createElement('style'); st.id = 'cine'; document.head.appendChild(st); }
    st.textContent = on ? '[data-testid^=hud-], [data-testid=tutorial-guide], .absolute.right-3.top-3, .absolute.left-3.bottom-3, [aria-live=polite].absolute, .absolute.top-3, .absolute.bottom-3 { display: none !important; }' : ''; }, on);
  const enter = async (sub) => {
    await ev(() => { const D = window.__GRAVEVOW__; if (D.getState().screen === 'dungeon') D.setState({ expedition: null, screen: 'lobby', dungeon: null, merc: null, combat: null }); });
    await wait(300);
    await ev(async (z) => { await window.__GRAVEVOW__.actions.enterDungeon(z); }, sub);
    await wait(1500);
    
    await ev(() => window.__GRAVEVOW__.scene().enemies.forEach((e) => { e.aggro = 0; }));
  };
  // Paseo a cámara: camino largo desde donde estás (BFS), enemigos quietos
  const walk = () => ev(() => {
    const sc = window.__GRAVEVOW__.scene();
    const sx = Math.floor(sc.player.x), sy = Math.floor(sc.player.y); const prev = new Map([[sx + ',' + sy, null]]); const q = [[sx, sy]]; const dist = new Map([[sx + ',' + sy, 0]]); let far = [sx, sy], fd = 0;
    while (q.length) { const [x, y] = q.shift(); const d = dist.get(x + ',' + y); if (d <= 12 && d > fd) { fd = d; far = [x, y]; }
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (prev.has(k) || !sc.walkableTile(nx, ny)) continue; prev.set(k, [x, y]); dist.set(k, d + 1); q.push([nx, ny]); } }
    const path = []; let cur = far; while (cur && !(cur[0] === sx && cur[1] === sy)) { path.unshift(cur); cur = prev.get(cur[0] + ',' + cur[1]); }
    sc.path = path;
  });
  return { b, ctx, page, cdp, wait, ev, act, hover, record, stepRecord, start, advanced, cinematic, enter, walk };
}

(async () => {
  const b = await chromium.launch();
  // ═══ Escritorio: se graba a 1920×1080 y se reduce a 1280×720 ═══
  const s = await session(b, { width: 1920, height: 1080 }, false);
  const { page, wait, ev, act, hover, record } = s;
  await s.start();
  await record('n-crear', async () => {
    await wait(500);
    await act('class-mage', 900); await act('class-warrior', 700);
    await page.click('[data-testid=name-input]');
    await page.keyboard.type('Aldric', { delay: 110 }); await wait(600);
  });
  if (!want('n-crear')) await page.fill('[data-testid=name-input]', 'Aldric');
  await act('btn-create'); 
  await s.advanced(); await wait(300);
  await page.mouse.move(5, 5);

  await act('tab-play', 500);
  await record('n-jugar', async () => {
    await wait(500); await act('btn-zone-map', 900);
    await hover('sub-afueras', 400); await hover('sub-osario', 400); await hover('sub-carmesi', 400); await hover('sub-trono', 500);
  });
  await page.keyboard.press('Escape').catch(() => {});
  await act('tab-stash', 500);
  await record('n-alijo', async () => {
    await wait(400);
    for (const k of [0, 1, 6]) { const el = await page.$(`[data-testid=slot-backpack-${k}]`); if (el) { await el.hover(); await wait(1100); } }
  });
  await page.mouse.move(5, 5);
  await act('tab-merchants', 500);
  await record('n-forja', async () => {
    await wait(400); await act('vendor-brand', 600); await act('vendor-view-station', 800);
    const f = await page.$('[data-testid^=forge-r_]:not([disabled])'); if (f) { await f.hover(); await wait(400); await f.click(); await wait(1100); }
  });
  await act('tab-merchants', 400);
  if (await page.$('[data-testid=vendor-back]')) await act('vendor-back', 400);
  await record('n-contratos', async () => {
    await wait(300); await act('vendor-garra', 600); await act('vendor-view-contracts', 600);
    for (const id of ['ysolde', 'draven', 'nyx']) { const m = await page.$(`[data-testid=merc-${id}]`); if (m) { await m.click(); await wait(500); } }
  });
  await act('tab-shop', 500);
  await record('n-tienda', async () => {
    await wait(600);
    await act('shop-buy-skin_ash_lord', 900); await act('skin-confirm-ok', 1000); await act('skin-bought-equip', 1100);
  });
  await ev(() => { const D = window.__GRAVEVOW__; const p = D.getState().profile; D.setState({ profile: { ...p, skins: { ...p.skins, equipped: null } } }); });

  // ── Las 10 subzonas, paso a paso (2,5 s cada una) ──
  const SUBS = ['afueras', 'castillo', 'calabozos', 'osario', 'catacumbas', 'panteon', 'carmesi', 'puertas', 'rios', 'trono'];
  for (const sub of SUBS) {
    if (!want('z-' + sub)) continue;
    await s.enter(sub);
    await s.cinematic(true);
    await s.walk();
    await s.stepRecord('z-' + sub, 75, 'cam.setZoom(5.2 + i*0.006)');
    await s.cinematic(false);
  }

  // ── Combate con la barra nueva (Ríos de Fuego, contra un élite) y un jefe ──
  const fightShot = async (name, enemy, script) => {
    if (!want(name)) return;
    await s.enter(name === 'j-jefe' ? 'puertas' : 'rios');
    await ev((e) => window.__GRAVEVOW__.actions.startCombat('pve', 'e_' + e, e), enemy);
    await page.waitForSelector('[data-testid=act-attack]:not([disabled])', { timeout: 10000 }).catch(() => {});
    await ev(() => window.__GRAVEVOW__.setState({ toasts: [] }));
    await record(name, script);
  };
  const myTurn = async () => { for (let k = 0; k < 60; k++) { if (await page.$('[data-testid=act-attack]:not([disabled])')) return true; await wait(100); } return false; };
  await fightShot('c-combate', 'chain_warden', async () => {
    await wait(700);
    await act('act-special', 700);
    const sp = await page.$('[data-testid=special-menu] button[data-testid^=skill-]'); if (sp) { await sp.hover(); await wait(700); await sp.click(); }
    await wait(1700); await myTurn();
    await act('act-special', 900); await page.keyboard.press('Escape'); await wait(300);
    await act('act-class', 1700); await myTurn(); await wait(300);
  });
  await fightShot('j-jefe', 'ignaroth', async () => { await wait(800); await act('act-attack', 1600); await myTurn(); await wait(600); });
  await ev(() => window.__GRAVEVOW__.setState({ combat: null }));
  // ── Combates rápidos contra criaturas distintas: un golpe tuyo y la respuesta del enemigo ──
  const VARIOS = [['c-varios1', 'catacumbas', 'water_lady'], ['c-varios2', 'carmesi', 'umbral_priest'], ['c-varios3', 'osario', 'bone_colossus'], ['c-varios4', 'puertas', 'abyss_hound']];
  for (const [name, sub, enemy] of VARIOS) {
    if (!want(name)) continue;
    await s.enter(sub);
    await ev((e) => window.__GRAVEVOW__.actions.startCombat('pve', 'v_' + e, e), enemy);
    await page.waitForSelector('[data-testid=act-attack]:not([disabled])', { timeout: 10000 }).catch(() => {});
    await ev(() => { const s = window.__GRAVEVOW__.getState(); const pl = s.combat.state.combatants.find((c) => c.id === 'player'); pl.stats.maxHp = 9999; pl.hp = 9999; window.__GRAVEVOW__.setState({ toasts: [] }); });
    await record(name, async () => {
      await wait(300);
      const sp = await page.$('[data-testid=act-special]:not([disabled])');
      if (sp) { await sp.click(); await wait(250); const b = await page.$('[data-testid=special-menu] button[data-testid^=skill-]:not(.cd):not([aria-disabled])'); if (b) await b.click(); else await page.keyboard.press('1'); }
      else await act('act-attack');
      await wait(1500); await myTurn(); await wait(200);
    });
    await ev(() => window.__GRAVEVOW__.setState({ combat: null }));
  }
  // ── Duelo continuo: golpe tuyo, golpe suyo, sin pausas. Se apunta cuándo cae cada golpe (para el sonido) ──
  if (want('c-duelo')) {
    await s.enter('rios');
    await ev(() => window.__GRAVEVOW__.actions.startCombat('pve', 'd_hell_knight', 'hell_knight'));
    await page.waitForSelector('[data-testid=act-attack]:not([disabled])', { timeout: 10000 }).catch(() => {});
    await ev(() => {
      const G = window.__GRAVEVOW__; G.setState({ toasts: [] });
      const st = G.getState().combat.state; for (const c of st.combatants) c.stats.eva = 0;
      window.__hits = []; let last = st.step;
      window.__hitTimer = setInterval(() => {
        const c = G.getState().combat; if (!c) return;
        const pl = c.state.combatants.find((x) => x.id === 'player'); if (pl.hp < pl.stats.maxHp * 0.5) pl.hp = pl.stats.maxHp;
        if (c.state.step === last) return; last = c.state.step;
        for (const e of c.state.events) if (e.type === 'damage' && e.source === 'hit') window.__hits.push({ t: Date.now() / 1000, who: e.targetId === 'player' ? 'hero' : 'foe', crit: e.crit });
      }, 10);
    });
    await record('c-duelo', async () => {
      for (let k = 0; k < 6; k++) {
        if (!(await myTurn())) break;
        if (k % 2 === 1 && (await page.$('[data-testid=act-special]:not([disabled])'))) {
          await page.click('[data-testid=act-special]'); await wait(120);
          const b = await page.$('[data-testid=special-menu] button[data-testid^=skill-]:not(.cd):not([aria-disabled])');
          if (b) await b.click(); else await page.keyboard.press('Escape');
          if (!b) await act('act-attack', 50);
        } else await act('act-attack', 50);
        await wait(150);
      }
      await wait(1200);
    });
    const hits = await ev(() => { clearInterval(window.__hitTimer); return window.__hits; });
    fs.writeFileSync(`${OUT}/c-duelo/hits.json`, JSON.stringify(hits));
    console.log('golpes', hits.map((h) => h.who).join(' '));
    await ev(() => window.__GRAVEVOW__.setState({ combat: null }));
  }
  // ── Sal con vida: el personaje llega al portal y lo activa ──
  if (want('d-portal')) {
    await s.enter('puertas');
    await ev(() => {
      const sc = window.__GRAVEVOW__.scene();
      for (const e of sc.enemies) { e.dead = true; e.sprite.destroy(); e.shadow?.destroy(); e.marker?.destroy(); }
      const px = sc.portal.x, py = sc.portal.y;
      const near = [[4, 0], [0, 4], [-4, 0], [0, -4], [3, 1], [1, 3], [3, 0], [0, 3], [2, 0], [0, 2]].map(([dx, dy]) => [px + dx, py + dy]).find(([x, y]) => sc.walkableTile(x, y));
      sc.debugTeleport(near[0], near[1]);
      const path = []; let [x, y] = near; while (x !== px || y !== py) { if (x !== px) x += Math.sign(px - x); else y += Math.sign(py - y); path.push([x, y]); }
      sc.path = path.filter(([x, y]) => sc.walkableTile(x, y));
    });
    await s.cinematic(true);
    await s.stepRecord('d-portal', 140, "cam.setZoom(5.2 + i*0.01); const k = window.__cine; if (!sc.path.length && !sc.player.moving && sc.channel < 0 && !k.started) { k.started = true; sc.startChannel(); } if (k.started && !k.flashed && sc.channel >= 0.97) { k.flashed = true; k.flashAt = i; sc.channel = -1; cam.flash(400, 180, 110, 255); }");
    const fl = await ev(() => window.__cine.flashAt); fs.writeFileSync(`${OUT}/d-portal/marks.json`, JSON.stringify({ flashFrame: fl }));
    await s.cinematic(false);
  }

  // ── Kael en las Afueras: trato y traición ──
  if (want('k-kael') || want('t-traicion')) {
    await ev(() => { window.__GRAVEVOW__.dev.forceKael = true; });
    await s.enter('afueras');
    const r = await ev(() => { const r = window.__GRAVEVOW__.scene().rival; return r ? [Math.floor(r.x), Math.floor(r.y)] : null; });
    if (r) {
      await ev(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x + 1, y), r); await wait(500);
      await record('k-kael', async () => {
        await ev(() => window.__GRAVEVOW__.actions.interactRival()); await wait(1200);
        if (await page.$('[data-testid=rival-talk]')) await act('rival-talk', 900);
        if (await page.$('[data-testid=rival-ally]')) await act('rival-ally', 900);
      });
      await ev(() => window.__GRAVEVOW__.actions.closeModal()); await wait(300);
      await ev(() => window.__GRAVEVOW__.actions.startCombat('betrayal-by-rival', null));
      await page.waitForSelector('[data-testid=combat]', { timeout: 8000 }).catch(() => {});
      await record('t-traicion', async () => { await wait(1600); if (await myTurn()) await act('act-attack', 1500); await wait(600); });
      await ev(() => window.__GRAVEVOW__.setState({ combat: null }));
    }
    await ev(() => { window.__GRAVEVOW__.dev.forceKael = false; });
  }
  await s.ctx.close();

  // ═══ Móvil en horizontal 844×390, con toques reales en el joystick ═══
  if (want('n-movil')) {
    const m = await session(b, { width: 844, height: 390 }, true);
    await m.start();
    await m.page.fill('[data-testid=name-input]', 'Aldric'); await m.act('btn-create'); 
    await m.advanced();
    await m.enter('catacumbas');
    const touch = (type, pts) => m.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
    const zone = await (await m.page.$('[data-testid=touch-stick-zone]')).boundingBox();
    const sx = zone.x + 110, sy = zone.y + zone.height - 100;
    await m.record('n-movil', async () => {
      await m.wait(400);
      await touch('touchStart', [[sx, sy]]);
      const path = [[1, 0], [1, -0.4], [0.6, -1], [0, -1], [-0.7, -0.7], [-1, 0.2], [0, 1]];
      for (const [dx, dy] of path) for (let k = 0; k < 12; k++) { await touch('touchMove', [[sx + dx * 50, sy + dy * 50]]); await m.wait(60); }
      await touch('touchEnd', []); await m.wait(400);
    });
  }
  await b.close();
})().catch((e) => { console.error('FALLO', e); process.exit(1); });
