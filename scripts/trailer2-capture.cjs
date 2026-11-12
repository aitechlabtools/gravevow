// Tráiler v2: graba gameplay real.
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

  // ═══ PASADA A · Creación (mago) y combates de mago ═══
  await page.goto(BASE + '?debug');
  await ev(() => indexedDB.deleteDatabase('gravevow'));
  await page.reload();
  await page.click('[data-testid=btn-play]');
  await wait(400);
  await page.fill('[data-testid=name-input]', 'Ysolde');
  if (want('c-crear')) await record('c-crear', async () => {
    await wait(300);
    await page.hover('[data-testid=class-warrior]'); await page.click('[data-testid=class-warrior]'); await wait(900);
    await page.hover('[data-testid=class-mage]'); await page.click('[data-testid=class-mage]'); await wait(900);
    await page.hover('[data-testid=class-rogue]'); await wait(500);
    await page.hover('[data-testid=class-mage]'); await wait(300);
  });
  else await page.click('[data-testid=class-mage]');
  await page.click('[data-testid=btn-create]');
  
  await ev(() => {
    const s = window.__GRAVEVOW__.getState();
    s.profile.character.level = 8; s.profile.tutorialSeen.dungeon = true;
    const set = (slot, id) => (s.profile.equipment[slot] = { uid: 'tm-' + id, itemId: id, qty: 1 });
    set('mainHand', 'runic_staff'); set('offHand', 'eclipse_grimoire'); set('armor', 'archmage_robe'); set('amulet', 'heart_of_umbravel');
  });
  await page.click('[data-testid=tab-character]'); await page.click('[data-testid=tab-play]'); await wait(300);
  await page.click('[data-testid=btn-enter-dungeon]'); await wait(1200);
  if (want('m-murcielago')) await record('m-murcielago', async () => {
    await ev(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_bat_tr', 'bat'));
    await useSkill('fireball'); await wait(1500);
    await useSkill('blizzard'); await wait(1500);
  });
  await finishCombat('e_bat_tr');
  if (want('m-jefe')) await record('m-jefe', async () => {
    await ev(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_boss', 'ossuary_lord'));
    await useSkill('dark_nova'); await wait(1600);
    await useSkill('blizzard'); await wait(1500);
  });

  // ═══ PASADA B · Guerrero: equipo, cripta, Kael, traición, portal, mapas ═══
  await page.goto(BASE + '?debug');
  await ev(() => indexedDB.deleteDatabase('gravevow'));
  await page.reload();
  await page.click('[data-testid=btn-play]');
  await page.fill('[data-testid=name-input]', 'Aldric');
  await page.click('[data-testid=btn-create]');
  
  await ev(() => {
    const s = window.__GRAVEVOW__.getState();
    s.profile.character.level = 8; s.profile.tutorialSeen.dungeon = true;
    const ids = ['knight_helm', 'bastion_plate', 'gauntlets', 'swift_boots', 'bastion_shield', 'dread_blade', 'heart_of_umbravel', 'health_potion', 'blood_gem'];
    ids.forEach((id, i) => (s.profile.backpack[i] = { uid: 'tb-' + id, itemId: id, qty: id === 'health_potion' ? 5 : 1 }));
  });
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
  await page.click('[data-testid=tab-play]'); await wait(300);
  await page.click('[data-testid=btn-enter-dungeon]'); await wait(1500);
  await cinematic(true);
  await freeze();

  // Paseo por la cripta con antorchas (cámara cercana)
  if (want('d-cripta')) {
    await clearEnemies(['e_boss']);
    await tp(5, 6);
    await walkTo(15, 13);
    await stepRecord('d-cripta', 105, `if(i===0){cam.setZoom(3.6);} cam.setZoom(3.6 - i*0.006);`);
  }
  // Kael (en tiempo real: diálogo de interfaz)
  await clearEnemies(['e_boss']);
  const r = await ev(() => { const r = window.__GRAVEVOW__.scene().rival; return [r.x, r.y]; });
  await tp(Math.floor(r[0]) + 2, Math.floor(r[1]) + 1);
  await ev(() => window.__cine.game.scene.getScenes(true)[0].cameras.main.setZoom(3));
  await stepRecord('d-kael-cam', 20, 'cam.setZoom(3)');
  await unfreeze();
  if (want('k-kael')) await record('k-kael', async () => {
    await wait(300);
    await ev(() => window.__GRAVEVOW__.actions.interactRival()); await wait(500);
    await page.click('[data-testid=rival-talk]'); await wait(1000);
    await page.click('[data-testid=rival-ally]'); await wait(1300);
  });
  await page.keyboard.press('Escape'); await wait(300);
  // El jefe con Kael de aliado
  if (want('w-jefe')) await record('w-jefe', async () => {
    await ev(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_boss', 'ossuary_lord'));
    await useSkill('war_cry'); await wait(1300);
    await useSkill('dread_cut'); await wait(1500);
    await useSkill('shield_bash'); await wait(1300);
  });
  await finishCombat('e_boss');
  // Traición a muerte
  if (want('t-traicion')) await record('t-traicion', async () => {
    await ev(() => { const s = window.__GRAVEVOW__.getState(); s.rival.greed = 100; s.rival.trust = 0; });
    await ev(() => window.__GRAVEVOW__.actions.checkBetrayal(true));
    await wait(900);
    await useSkill('rending_slash'); await wait(1400);
    if (await waitFor('[data-testid=act-attack]:not([disabled])')) await page.click('[data-testid=act-attack]:not([disabled])');
    await wait(1200);
  });
  await finishCombat('rival');
  await wait(500);
  for (let k = 0; k < 3; k++) { const m = await ev(() => window.__GRAVEVOW__.getState().modal?.type ?? null); if (!m) break; await page.keyboard.press('Escape'); await wait(300); }
  await cinematic(true);
  // Huida por el portal, fotograma a fotograma
  await freeze();
  if (want('d-portal')) {
    const pp = await ev(() => { const p = window.__GRAVEVOW__.scene().portal; return [p.x, p.y]; });
    await tp(pp[0] - 3, pp[1]);
    await walkTo(pp[0], pp[1]);
    await stepRecord('d-portal', 40, 'cam.setZoom(3.2 + i*0.01)');
    await ev(() => { window.__GRAVEVOW__.actions.closeModal(); });
    await page.keyboard.press('e');
    await stepRecord('d-portal2', 86, 'cam.setZoom(3.6 + i*0.012)');
    await unfreeze();
  }
  await wait(4000);

  // Mapas procedurales: tres expediciones, tres mapas
  for (let m = 0; m < 3 && want('p-mapas'); m++) {
    await ev(async () => { const D = window.__GRAVEVOW__; if (D.getState().screen === 'dungeon' && !D.getState().summary) await D.actions.finishExpedition('extracted'); });
    await wait(600);
    await ev(() => window.__GRAVEVOW__.actions.backToLobby());
    await wait(500);
    if (await page.$('[data-testid=btn-back-lobby]')) { await page.click('[data-testid=btn-back-lobby]'); await wait(500); }
    await ev(() => { const s = window.__GRAVEVOW__.getState(); s.profile.stats.expeditions = Math.max(1, s.profile.stats.expeditions); });
    if (await page.$('[data-testid=tab-play]')) await page.click('[data-testid=tab-play]');
    await wait(300);
    await page.click('[data-testid=btn-enter-dungeon]'); await wait(1500);
    
    await cinematic(true);
    await freeze();
    // Plano general: el mapa entero iluminado tenuemente (las salas se revelan), cámara que se aleja
    await ev(() => {
      const sc = window.__GRAVEVOW__.scene(); const cam = sc.cameras.main;
      sc.cineReveal = 0.55;
      cam.stopFollow();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const tv of sc.tiles) { const X = (tv.x - tv.y) * 16, Y = (tv.x + tv.y) * 8; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); }
      cam.centerOn((x0 + x1) / 2, (y0 + y1) / 2 - 10);
      window.__cine.fit = Math.min(1280 / (x1 - x0 + 60), 720 / (y1 - y0 + 90));
      for (const e of sc.enemies) if (!e.dead) { e.sprite.setVisible(true); }
    });
    await stepRecord(`p-mapa${m}`, 50, `cam.setZoom(c.fit*(1.12-i*0.0024));`);
    // Paseo cercano en ese mapa
    if (m === 0) {
      await ev(() => { const sc = window.__GRAVEVOW__.scene(); sc.cineReveal = 0; for (const tv of sc.tiles) tv.explored = false; sc.cameras.main.startFollow(sc.player.sprite, true, 0.15, 0.15, 0, 10); });
      const ok = await ev(() => { const sc = window.__GRAVEVOW__.scene(); const rs = sc.dungeon.def.rooms; let r = rs[0], best = -1; for (const q of rs) { const d = Math.hypot(q.x - sc.player.x, q.y - sc.player.y); if (d > 6 && (best < 0 || d < best)) { best = d; r = q; } } return [r.x + Math.floor(r.w / 2), r.y + Math.floor(r.h / 2)]; });
      await clearEnemies();
      console.log('paseo', await walkTo(-1, -1));
      await stepRecord('p-paseo', 90, `cam.setZoom(3.4)`);
    }
    await unfreeze();
  }
  await b.close();
})().catch((e) => { console.error('FALLO', e); process.exit(1); });
