// Tráiler v6 (landing v4, 30 s): escenarios guionizados sobre el juego real con ?debug. Graba: 5 subzonas, duelo con heridas,
// cofre legendario, un instante de la Intendencia (mochila y almacén), Kael y su traición, y el portal.
// Después: npm run trailer:render (rótulos, montaje, música). Todo junto: npm run trailer.
// Uso: node scripts/trailer6-capture.cjs http://localhost:5173/play/ /tmp/claude-0/t6 [tomas,separadas,por,comas]
const { setup, session } = require('./lib/cine.cjs');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/claude-0/t6';
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const want = (n) => !ONLY || ONLY.includes(n);
setup({ out: OUT, want, base: BASE });

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  // ═══ Escritorio: se graba a 1920×1080 y se reduce a 1280×720 ═══
  const s = await session(b, { width: 1920, height: 1080 }, false);
  const { page, wait, ev, act, hover, record } = s;
  const myTurn = async () => { for (let k = 0; k < 60; k++) { if (await page.$('[data-testid=act-attack]:not([disabled])')) return true; await wait(100); } return false; };
  await s.start();
  await page.fill('[data-testid=name-input]', 'Aldric');
  await act('btn-create', 900); 
  await s.advanced(); await wait(300);
  await page.mouse.move(5, 5);

  await act('tab-stash', 500);
  await record('n-intendencia', async () => {
    await wait(400);
    for (const k of [0, 3, 6]) { const el = await page.$(`[data-testid=slot-backpack-${k}]`); if (el) { await el.hover({ force: true, timeout: 2000 }).catch(() => {}); await wait(900); } }
  });
  // ── Las 10 subzonas, paso a paso (2,5 s cada una) ──
  const SUBS = ['afueras', 'catacumbas', 'carmesi', 'rios', 'trono'];
  for (const sub of SUBS) {
    if (!want('z-' + sub)) continue;
    await s.enter(sub);
    await s.cinematic(true);
    await s.walk();
    await s.stepRecord('z-' + sub, 75, 'cam.setZoom(5.2 + i*0.006)');
    await s.cinematic(false);
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
  // ── Cofre con botín legendario (Trono de las Cadenas) ──
  if (want('b-cofre')) {
    await s.enter('trono');
    await ev(() => { const G = window.__GRAVEVOW__; const g = Array.from({ length: 12 }, () => null);
      [['belzar_chain', 'legendary'], ['chain_axe', 'epic', ['vampire', 'bleeding']], ['throne_greatsword', 'epic', ['executioner']], ['dukes_rapier', 'rare', ['frost']], ['belzar_broken_crown', 'legendary'], ['silver_helm', 'rare', ['hermit']]]
        .forEach(([id, rarity, affixes], i) => { g[i] = { uid: 'ch' + i, itemId: id, qty: 1, rarity, ...(affixes ? { affixes } : {}) }; });
      G.setState({ chests: { ...G.getState().chests, cine: g } }); });
    await record('b-cofre', async () => {
      await wait(300); await ev(() => window.__GRAVEVOW__.actions.openChest('cine', 'boss', true)); await wait(700);
      for (const k of [0, 4]) { const el = await page.$(`[data-testid=slot-chest-${k}]`); if (el) { await el.hover({ force: true, timeout: 2000 }).catch(() => {}); await wait(1000); } }
    });
    await ev(() => window.__GRAVEVOW__.actions.closeModal()); await wait(300);
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

  await b.close();
})().catch((e) => { console.error('FALLO', e); process.exit(1); });
