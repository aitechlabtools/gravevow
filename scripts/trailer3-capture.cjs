// Tráiler v3: tomas nuevas (zonas, mercenarios, minería, forja, vestuario) con el mismo sistema de captura que el v2.
// - Mazmorra (Phaser): el bucle del juego se detiene y se avanza fotograma a fotograma (30 fps exactos),
//   con una captura por fotograma → movimiento fluido real aunque el navegador sin GPU vaya lento.
// - Pantallas de interfaz (combate, creación, equipo): screencast del navegador.
// Uso: node scripts/trailer2-capture.cjs http://localhost:5173/play/ carpeta_salida
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || 'trailer-frames';
const W = 1280, H = 720;
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: W, height: H } });
  const cdp = await page.context().newCDPSession(page);
  const wait = (ms) => page.waitForTimeout(ms);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const tp = (x, y) => ev(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x, y), [x, y]);

  const mk = (name) => { const dir = `${OUT}/${name}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); return dir; };

  // Screencast (interfaz)
  async function record(name, fn) {
    const dir = mk(name); const frames = [];
    const onFrame = ({ data, metadata, sessionId }) => {
      const f = `${dir}/${String(frames.length).padStart(5, '0')}.jpg`;
      fs.writeFileSync(f, Buffer.from(data, 'base64')); frames.push({ f, t: metadata.timestamp });
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    };
    cdp.on('Page.screencastFrame', onFrame);
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
    await fn();
    await cdp.send('Page.stopScreencast'); cdp.off('Page.screencastFrame', onFrame);
    fs.writeFileSync(`${dir}/frames.json`, JSON.stringify(frames));
    console.log(name, frames.length, 'fotogramas', frames.length ? (frames.at(-1).t - frames[0].t).toFixed(1) + 's' : '');
  }

  // Fotograma a fotograma (mazmorra). perFrame(i) se ejecuta en la página antes de cada paso.
  async function stepRecord(name, n, perFrame, arg) {
    const dir = mk(name); const frames = [];
    for (let i = 0; i < n; i++) {
      await ev(([src, i, arg]) => {
        const c = window.__cine; const sc = window.__GRAVEVOW__.scene();
        if (src) new Function('i', 'sc', 'cam', 'arg', 'c', src)(i, sc, sc.cameras.main, arg, c);
        c.t += 1000 / 30; sc.lightTimer = 1000; c.game.step(c.t, 1000 / 30);
      }, [perFrame || '', i, arg]);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
      const f = `${dir}/${String(i).padStart(5, '0')}.jpg`;
      fs.writeFileSync(f, Buffer.from(data, 'base64')); frames.push({ f, t: i / 30 });
    }
    fs.writeFileSync(`${dir}/frames.json`, JSON.stringify(frames));
    console.log(name, n, 'fotogramas (paso a paso)');
  }
  const freeze = () => ev(() => { const g = window.__GRAVEVOW__.game; g.loop.sleep(); window.__cine = { game: g, t: performance.now() }; });
  const unfreeze = () => ev(() => { const c = window.__cine; if (c) c.game.loop.wake(); });

  const cinematic = (on) => ev((on) => {
    let st = document.getElementById('cine');
    if (!st) { st = document.createElement('style'); st.id = 'cine'; document.head.appendChild(st); }
    st.textContent = on ? '[data-testid^=hud-], .absolute.right-3.top-3, .absolute.left-3.bottom-3, [aria-live=polite].absolute, .absolute.top-3, .absolute.bottom-3 { display: none !important; }' : '';
  }, on);
  // Camino a una casilla (BFS sobre las casillas transitables) para pasear a cámara
  const walkTo = (x, y) => ev(([tx, ty]) => {
    const sc = window.__GRAVEVOW__.scene(); const W = sc.dungeon.def.width, H = sc.dungeon.def.height;
    const sx = Math.floor(sc.player.x), sy = Math.floor(sc.player.y);
    const prev = new Map(); const q = [[sx, sy]]; prev.set(sx + ',' + sy, null);
    let far = null, fd = 0; const dist = new Map([[sx + ',' + sy, 0]]);
    while (q.length) { const [x, y] = q.shift(); if (x === tx && y === ty) break; const dd = dist.get(x + ',' + y); if (dd <= 14 && dd > fd) { fd = dd; far = [x, y]; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev.has(k) || !sc.walkableTile(nx, ny)) continue; prev.set(k, [x, y]); dist.set(k, dist.get(x + ',' + y) + 1); q.push([nx, ny]); } }
    if (tx < 0 && far) { tx = far[0]; ty = far[1]; }
    const path = []; let cur = [tx, ty]; if (!prev.has(tx + ',' + ty)) return 0;
    while (cur && !(cur[0] === sx && cur[1] === sy)) { path.unshift(cur); cur = prev.get(cur[0] + ',' + cur[1]); }
    sc.path = path; return path.length;
  }, [x, y]);
  const clearEnemies = (keep = []) => ev((keep) => { for (const e of window.__GRAVEVOW__.scene().enemies) if (!keep.includes(e.id) && !e.dead) { e.dead = true; e.sprite.destroy(); e.shadow.destroy(); e.marker?.destroy(); } }, keep);
  async function waitFor(sel, ms = 4000) { for (let k = 0; k < ms / 100; k++) { if (await page.$(sel)) return true; await wait(100); } return false; }
  async function useSkill(id) {
    if (!(await waitFor('[data-testid=act-attack]:not([disabled])'))) return;
    await page.click('[data-testid=act-special]'); await wait(120);
    let btn = await page.$(`[data-testid=skill-${id}]:not([disabled])`);
    for (let k = 0; k < 3 && !btn && (await page.$('[data-testid=btn-page-next]:not([disabled])')); k++) { await page.click('[data-testid=btn-page-next]'); btn = await page.$(`[data-testid=skill-${id}]:not([disabled])`); }
    if (btn) await btn.click(); else { await page.keyboard.press('Escape'); await page.click('[data-testid=act-attack]:not([disabled])'); }
  }
  async function finishCombat(id) {
    await ev((id) => { const s = window.__GRAVEVOW__.getState(); const c = s.combat?.state.combatants.find((c) => c.id === id); if (c) c.hp = 1; }, id);
    for (let i = 0; i < 25; i++) {
      const s = await ev(() => { const s = window.__GRAVEVOW__.getState(); return { c: !!s.combat, o: s.combat?.state.outcome }; });
      if (!s.c || s.o) break;
      if (await page.$('[data-testid=act-attack]:not([disabled])')) await page.click('[data-testid=act-attack]:not([disabled])');
      await wait(400);
    }
    if (await waitFor('[data-testid=btn-combat-continue]', 3000)) await page.click('[data-testid=btn-combat-continue]');
    await wait(400);
  }
  const want = (n) => !ONLY || ONLY.includes(n);

  const patch = (fn, arg) => ev(([src, arg]) => { const D = window.__GRAVEVOW__; const p = D.getState().profile; D.setState({ profile: new Function('p', 'arg', src)(p, arg) }); }, [fn, arg]);
  const toLobby = async () => {
    await ev(async () => { const D = window.__GRAVEVOW__; if (D.getState().screen === 'dungeon') await D.actions.finishExpedition('extracted'); });
    await wait(500);
    await ev(() => window.__GRAVEVOW__.actions.backToLobby()); await wait(500);
  };
  const enter = async (zone, wantCaptive = false) => {
    for (let k = 0; k < 30; k++) {
      await ev((z) => window.__GRAVEVOW__.actions.enterDungeon(z), zone);
      await wait(400);
      const ok = await ev(() => window.__GRAVEVOW__.getState().dungeon.entities.some((e) => e.kind === 'captive'));
      if (!wantCaptive || ok) break;
      await ev(() => window.__GRAVEVOW__.setState({ expedition: null, screen: 'lobby', dungeon: null, merc: null }));
      await wait(300);
    }
    await wait(1200);
  };

  // ═══ Guerrero de nivel alto ═══
  await page.goto(BASE + '?debug&noclass');
  await ev(() => indexedDB.deleteDatabase('gravevow'));
  await page.reload();
  await page.click('[data-testid=btn-play]');
  await page.fill('[data-testid=name-input]', 'Aldric');
  await page.click('[data-testid=btn-create]');
  
  await patch(`
    const bp = [...p.backpack];
    ['knight_helm','bastion_plate','gauntlets','swift_boots','bastion_shield','dread_blade','heart_of_umbravel','steel_pick','blood_gem'].forEach((id,i)=> bp[i] = { uid: 'tb-'+id, itemId: id, qty: 1 });
    bp[9] = { uid: 'tb-pot', itemId: 'health_potion', qty: 5 };
    let st = [...p.stash];
    [['iron_ore',10],['bone_dust',10],['copper_ore',10],['silver_ore',10],['blessed_silver',10],['ancient_bone',10],['iron_ore',10]].forEach(([id,q],i)=> st[i] = { uid: 'ts'+i, itemId: id, qty: q });
    return { ...p, backpack: bp, stash: st, gold: 20000, character: { ...p.character, level: 30 }, tutorialSeen: { lobby: true, dungeon: true },
      stats: { ...p.stats, expeditions: 1 }, bossesDefeated: ['ossuary_lord', 'veiled_queen'], reputation: { garra: 1500, brand: 1500, orvel: 300, vesper: 300 },
      skins: { owned: ['skin_penitent', 'skin_hollow_warden', 'skin_ash_lord'], equipped: 'skin_hollow_warden' } };
  `);
  await page.click('[data-testid=tab-character]'); await page.click('[data-testid=tab-stash]'); await wait(500);
  if (want('g-equipo')) await record('g-equipo', async () => {
    await wait(300);
    for (const id of ['knight_helm', 'bastion_plate', 'bastion_shield', 'dread_blade']) {
      const el = await page.$(`[data-testid^=slot-backpack][data-item=${id}]`);
      if (el) { await el.hover(); await wait(200); await el.dblclick(); }
      await wait(380);
    }
    const ep = await page.$('[data-testid^=slot-backpack][data-item=heart_of_umbravel]');
    if (ep) { await ep.hover(); await wait(1300); }
  });
  for (const id of ['gauntlets', 'swift_boots', 'heart_of_umbravel', 'knight_helm', 'bastion_plate', 'bastion_shield', 'dread_blade']) {
    const el = await page.$(`[data-testid^=slot-backpack][data-item=${id}]`); if (el) await el.dblclick();
  }
  await page.mouse.move(5, 5);
  // Forja
  if (want('x-forja')) {
    await page.click('[data-testid=tab-merchants]'); await wait(300);
    await page.click('[data-testid=vendor-brand]'); await wait(200);
    await record('x-forja', async () => {
      await wait(300);
      await page.click('[data-testid=vendor-view-forge]'); await wait(900);
      await page.hover('[data-testid=forge-r_silver_sword]'); await wait(400);
      await page.click('[data-testid=forge-r_silver_sword]'); await wait(1500);
    });
  }
  // Contratos con Garra
  if (want('x-contratos')) {
    await page.click('[data-testid=tab-merchants]'); await wait(300);
    await page.click('[data-testid=vendor-garra]'); await wait(200);
    await record('x-contratos', async () => {
      await page.click('[data-testid=vendor-view-contracts]'); await wait(600);
      for (const id of ['ysolde', 'draven', 'nyx']) { await page.click(`[data-testid=merc-${id}]`); await wait(550); }
      await page.click('[data-testid=contract-len-3]'); await wait(300);
      await page.click('[data-testid=merc-hire]'); await wait(1200);
    });
  }
  // Tienda de atuendos
  if (want('x-vestuario')) {
    await page.click('[data-testid=tab-shop]'); await wait(400);
    await record('x-vestuario', async () => {
      await wait(400);
      for (const id of ['cos_ossuary_helm', 'cos_redclaw_mail', 'cos_umbral_blade', 'cos_gilded_boots', 'cos_spectral_shield']) {
        const el = await page.$(`[data-testid=wear-${id}]`); if (el) { await el.scrollIntoViewIfNeeded(); await el.click(); } await wait(420);
      }
      await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 0)); await wait(800);
    });
    for (const s of ['helmet', 'armor', 'mainHand', 'boots', 'offHand']) await ev((s) => window.__GRAVEVOW__.actions.wearCosmetic(s, null), s);
  }

  // ═══ Cripta: paseo y minería ═══
  await enter('cripta');
  await cinematic(true);
  await freeze();
  if (want('z-cripta')) {
    await clearEnemies();
    console.log('paseo cripta', await walkTo(-1, -1));
    await stepRecord('z-cripta', 70, 'cam.setZoom(3.4)');
  }
  if (want('x-mina')) {
    const v = await ev(() => { const sc = window.__GRAVEVOW__.scene(); const v = sc.veins.find((x) => x.vein === 'silver') ?? sc.veins[0]; return [v.x, v.y]; });
    await ev(([x, y]) => { const sc = window.__GRAVEVOW__.scene(); const north = sc.dungeon.tiles[y - 1]?.[x] === 'wall'; sc.debugTeleport(north ? x : x + 1, north ? y + 1 : y); sc.path = []; }, v);
    await stepRecord('x-mina0', 6, 'cam.setZoom(3.8)');
    await ev(() => { const sc = window.__GRAVEVOW__.scene(); const it = sc.interactables().find((i) => i.label.startsWith('Picar')); it?.run(); });
    await cinematic(false);
    await ev(() => { let st = document.getElementById('cine2'); if (!st) { st = document.createElement('style'); st.id = 'cine2'; document.head.appendChild(st); } st.textContent = '[data-testid=hud-player], .absolute.right-3.top-3, .absolute.left-3.bottom-3, [data-testid=hud-timer], [data-testid=hud-room], [data-testid=hud-dungeon] { display:none !important }'; });
    await stepRecord('x-mina', 75, 'cam.setZoom(3.8 + i*0.004)');
    await ev(() => document.getElementById('cine2')?.remove());
    await cinematic(true);
  }
  await unfreeze();
  await cinematic(false);
  await toLobby();

  // ═══ Infierno: paseo, mercenario en combate ═══
  await patch(`return { ...p, character: { ...p.character, level: 66 } };`);
  await enter('infierno');
  await cinematic(true);
  await freeze();
  if (want('z-infierno')) {
    await clearEnemies();
    console.log('paseo infierno', await walkTo(-1, -1));
    await stepRecord('z-infierno', 70, 'cam.setZoom(3.4)');
  }
  await unfreeze();
  await cinematic(false);
  if (want('x-merc')) await record('x-merc', async () => {
    await ev(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_x', 'abyss_hound'));
    await wait(700);
    await useSkill('dread_cut'); await wait(1700);
    await useSkill('shield_bash'); await wait(1700);
  });
  await finishCombat('e_x');
  await toLobby();

  // ═══ Prisionero en la Mazmorra (sin contrato) ═══
  await patch(`return { ...p, contract: null, character: { ...p.character, level: 20 } };`);
  await enter('mazmorra', true);
  if (want('x-preso')) {
    const c = await ev(() => { const c = window.__GRAVEVOW__.getState().dungeon.entities.find((e) => e.kind === 'captive'); return c ? [c.x, c.y] : null; });
    if (c) {
      await clearEnemies();
      await tp(c[0] + 1, c[1] + 1);
      await cinematic(true);
      await freeze();
      await stepRecord('x-preso0', 30, 'cam.setZoom(3.6 + i*0.01)');
      await unfreeze();
      await cinematic(false);
      await record('x-preso', async () => {
        await wait(200);
        await ev((id) => window.__GRAVEVOW__.actions.interactCaptive(id), await ev(() => window.__GRAVEVOW__.getState().dungeon.entities.find((e) => e.kind === 'captive').mercId));
        await wait(1600);
        await page.click('[data-testid=captive-free]'); await wait(1400);
      });
    }
  }
  await b.close();
})().catch((e) => { console.error('FALLO', e); process.exit(1); });
