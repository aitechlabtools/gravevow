// Capturas de la landing v4 (13/11): escenarios guionizados con ?debug sobre el juego real, en 1920×1080 y móvil 844×390.
// Uso: node scripts/landing4-shots.cjs http://localhost:5173/play/ [carpeta] [g-heridas,g-botin…]
// Salen PNG en la carpeta (por defecto public/screenshots/landing); luego: python3 scripts/landing-webp.py
const { setup, session } = require('./lib/cine.cjs');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || 'public/screenshots/landing';
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const want = (n) => !ONLY || ONLY.includes(n);
setup({ out: '/tmp/claude-0/l4-frames', want: () => false, base: BASE });
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const s = await session(b, { width: 1920, height: 1080 }, false);
  const { page, wait, ev, act } = s;
  const shot = async (name) => { await page.mouse.move(5, 5); await wait(250); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('captura', name); };
  await s.start();
  await page.fill('[data-testid=name-input]', 'Aldric');
  await act('btn-create', 900);
  await s.advanced(); await wait(400);
  // Bastión reconstruido (todas las estaciones al máximo) y botín guardado
  await ev(() => { const G = window.__GRAVEVOW__; const pr = G.getState().profile;
    G.setState({ profile: { ...pr, refuge: { cot: 3, kitchen: 3, bench: 3, infirmary: 3, forge: 3, alchemy: 3, runic: 3, v: 2 } } }); });
  // La escena reajusta la cámara: se fija el zoom durante la espera
  const zoom = async (ms, z = 6) => { for (let t = 0; t < ms; t += 100) { await ev((z) => window.__GRAVEVOW__.scene()?.cameras.main.setZoom(z), z); await wait(100); } };
  const sub = async (name, zone) => {
    if (!want(name)) return;
    await s.enter(zone); await s.cinematic(true); await s.walk();
    await zoom(1600);
    await shot(name); await s.cinematic(false);
  };
  await sub('g-afueras', 'afueras');
  await sub('g-cripta', 'catacumbas');
  await sub('g-infierno', 'rios');
  // Combate y heridas
  const fight = async (name, zone, enemy, prep) => {
    if (!want(name)) return;
    await s.enter(zone);
    await ev((e) => window.__GRAVEVOW__.actions.startCombat('pve', 'e_' + e, e), enemy);
    await page.waitForSelector('[data-testid=act-attack]:not([disabled])', { timeout: 10000 }).catch(() => {});
    await ev(() => window.__GRAVEVOW__.setState({ toasts: [] }));
    await prep(); await shot(name);
    await ev(() => window.__GRAVEVOW__.setState({ combat: null }));
  };
  const myTurn = async () => { for (let k = 0; k < 60; k++) { if (await page.$('[data-testid=act-attack]:not([disabled])')) return true; await wait(100); } return false; };
  await fight('g-combate', 'rios', 'hell_knight', async () => { await wait(600); });
  await fight('g-heridas', 'carmesi', 'umbral_priest', async () => {
    await ev(() => { const G = window.__GRAVEVOW__; const c = G.getState().combat; const pl = c.state.combatants.find((x) => x.id === 'player');
      const b = pl.body; if (b) { const P = b.parts; const hit = (k, f, bl, fr) => { if (P[k]) { P[k].hp = Math.max(1, Math.round(P[k].hp * f)); P[k].bleed = bl; P[k].fracture = fr; } };
        hit('head', 0.7, 1, false); hit('torso', 0.45, 2, false); hit('leftArm', 0.3, 0, true); hit('rightLeg', 0.55, 1, false); }
      G.setState({ combat: { ...c } }); });
    await wait(700);
  });
  // Un errante con su triángulo, en la conversación
  if (want('g-aliado') || want('g-traicion')) {
    await ev(() => { window.__GRAVEVOW__.dev.forceKael = true; });
    await s.enter('afueras');
    const r = await ev(() => { const r = window.__GRAVEVOW__.scene().rival; return r ? [Math.floor(r.x), Math.floor(r.y)] : null; });
    if (r) {
      await ev(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x + 1, y), r);
      await zoom(900);
      if (want('g-aliado')) { await s.cinematic(true); await zoom(600, 7); await shot('g-aliado'); await s.cinematic(false); }
      await ev(() => window.__GRAVEVOW__.actions.interactRival()); await wait(1000);
      if (await page.$('[data-testid=rival-talk]')) await act('rival-talk', 700);
      if (await page.$('[data-testid=rival-ally]')) await act('rival-ally', 700);
      await ev(() => window.__GRAVEVOW__.actions.closeModal()); await wait(300);
      if (want('g-traicion')) {
        await ev(() => window.__GRAVEVOW__.actions.startCombat('betrayal-by-rival', null));
        await page.waitForSelector('[data-testid=combat]', { timeout: 8000 }).catch(() => {});
        await wait(1800); await shot('g-traicion');
        await ev(() => window.__GRAVEVOW__.setState({ combat: null }));
      }
    }
    await ev(() => { window.__GRAVEVOW__.dev.forceKael = false; });
  }
  // Cofre de hierro con legendarias dentro
  if (want('g-botin')) {
    await s.enter('trono');
    await ev(() => { const G = window.__GRAVEVOW__; const g = Array.from({ length: 12 }, () => null);
      [['belzar_chain', 'legendary'], ['chain_axe', 'epic', ['vampire', 'bleeding']], ['throne_greatsword', 'epic', ['executioner']], ['dukes_rapier', 'rare', ['frost']], ['belzar_broken_crown', 'legendary'], ['silver_helm', 'rare', ['hermit']]]
        .forEach(([id, rarity, affixes], i) => { g[i] = { uid: 'ch' + i, itemId: id, qty: 1, rarity, ...(affixes ? { affixes } : {}) }; });
      G.setState({ chests: { ...G.getState().chests, cine: g } }); G.actions.openChest('cine', 'boss', true); });
    await wait(900);
    const sl = await page.$('[data-testid^=slot-chest-]'); if (sl) { await sl.hover(); await wait(700); }
    await page.screenshot({ path: `${OUT}/g-botin.png` }); console.log('captura g-botin');
    await ev(() => window.__GRAVEVOW__.actions.closeModal()); await wait(300);
  }
  // Llegada al portal
  if (want('g-portal')) {
    await s.enter('puertas');
    await ev(() => { const sc = window.__GRAVEVOW__.scene();
      const px = sc.portal.x, py = sc.portal.y;
      const near = [[3, 0], [0, 3], [-3, 0], [0, -3], [2, 1], [1, 2], [2, 0], [0, 2]].map(([dx, dy]) => [px + dx, py + dy]).find(([x, y]) => sc.walkableTile(x, y));
      sc.debugTeleport(near[0], near[1]); });
    await s.cinematic(true); await zoom(1400); await shot('g-portal'); await s.cinematic(false);
  }
  await ev(() => { const D = window.__GRAVEVOW__; D.setState({ expedition: null, screen: 'lobby', dungeon: null, merc: null, combat: null, modal: null }); });
  await wait(600);
  if (want('g-intendencia')) { await act('tab-stash', 900); const el = await page.$('[data-testid=slot-backpack-1]'); await shot('g-intendencia'); if (el) { await el.hover({ force: true, timeout: 2000 }).catch(() => {}); await wait(900); await page.screenshot({ path: `${OUT}/g-intendencia.png` }); } }
  if (want('g-bastion')) { await act('tab-merchants', 700); if (await page.$('[data-testid=btn-refuge]')) await act('btn-refuge', 1000); await shot('g-bastion'); }
  await s.ctx.close();
  // Móvil en horizontal
  if (want('g-movil')) {
    const m = await session(b, { width: 844, height: 390 }, true);
    await m.start(); await m.page.fill('[data-testid=name-input]', 'Aldric'); await m.act('btn-create', 900); await m.advanced();
    await m.enter('rios'); await m.walk(); await m.wait(1500);
    await m.page.screenshot({ path: `${OUT}/g-movil.png` }); console.log('captura g-movil');
  }

  await b.close();
})().catch((e) => { console.error('FALLO', e); process.exit(1); });
