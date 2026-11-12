// Capturas de la landing con una partida avanzada (guerrero de nivel alto, buen equipo, Infierno).
// Uso: node scripts/landing-shots.cjs [url del juego] [carpeta]   (por defecto public/screenshots)
// Saca PNG; después scripts/landing-webp.py hace las WebP. Escala 1: el pixel art sale nítido.
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || 'public/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const GEAR = { mainHand: 'hellforged_blade', offHand: 'demonscale_shield', helmet: 'hellsteel_helm', armor: 'hellsteel_plate',
  gloves: 'demon_gauntlets', boots: 'cinder_boots', amulet: 'heart_of_belzar', ring: 'ember_ring' };
const LOOT = ['chain_axe', 'obsidian_sword', 'veiled_ring', 'requiem_axe', 'silver_helm', 'grave_boots', 'reliquary_amulet', 'headstone_shield'];

async function session(vp, touch) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const wait = (ms) => p.waitForTimeout(ms);
  const ev = (fn, arg) => p.evaluate(fn, arg);
  const act = async (id) => { const sel = `[data-testid=${id}]`; await p.waitForSelector(sel, { timeout: 6000 }); if (touch) await p.tap(sel); else await p.click(sel); await wait(300); };
  await p.goto(URL + '?debug');
  await ev(() => indexedDB.deleteDatabase('gravevow'));
  await p.reload(); await wait(700);
  await act('btn-play');
  await ev(() => document.fullscreenElement && document.exitFullscreen());
  await p.fill('[data-testid=name-input]', 'Aldric');
  await act('btn-create');
  
  // Partida avanzada: nivel 85, equipo del Infierno, botín en la mochila, materiales, jefes vencidos y reputación.
  await ev(([GEAR, LOOT]) => {
    const G = window.__GRAVEVOW__; const pr = G.getState().profile;
    const eq = { ...pr.equipment }; for (const [slot, id] of Object.entries(GEAR)) eq[slot] = { uid: 'eq-' + id, itemId: id, qty: 1 };
    const bp = [...pr.backpack]; LOOT.forEach((id, i) => { bp[i] = { uid: 'bp-' + id, itemId: id, qty: 1 }; });
    bp[LOOT.length] = { uid: 'bp-pot', itemId: 'health_potion', qty: 5 };
    const st = [...pr.stash];
    [['iron_ore', 10], ['silver_ore', 8], ['blessed_silver', 10], ['ancient_bone', 10], ['ectoplasm', 6], ['copper_ore', 10]].forEach(([id, q], i) => { st[i] = { uid: 'st' + i, itemId: id, qty: q }; });
    G.setState({ profile: { ...pr, equipment: eq, backpack: bp, stash: st, gold: 1845, // en monedas físicas: unos pocos sacos, no un almacén lleno
      character: { ...pr.character, level: 85 }, tutorialSeen: { ...pr.tutorialSeen, lobby: true, dungeon: true },
      stats: { ...pr.stats, expeditions: 64, extractions: 51, kills: 830 }, bossesDefeated: ['ossuary_lord', 'veiled_queen', 'belzar'],
      reputation: { garra: 2600, brand: 2600, orvel: 1800, vesper: 1200 },
      skins: { owned: ['skin_penitent'], equipped: null } } });
  }, [GEAR, LOOT]);
  await wait(300);
  // Al nivel 85 sale el aviso de habilidades por elegir: se deja para más tarde
  for (let k = 0; k < 3 && (await p.$('[data-testid=btn-class-unlock-later]')); k++) { await p.click('[data-testid=btn-class-unlock-later]'); await wait(200); }
  return { b, p, ev, act, wait, errs };
}

async function dungeon(s, zone, zoom = 1.45) {
  await s.ev(async (z) => { const G = window.__GRAVEVOW__; await G.actions.enterDungeon(z); }, zone);
  await s.wait(1500);
  
  // Que nadie ataque durante la foto, y colocarse junto a un cofre con algún enemigo cerca
  await s.ev((zoom) => {
    const sc = window.__GRAVEVOW__.scene();
    sc.enemies.forEach((e) => { e.aggro = 0; });
    const near = (c, f, r) => sc.enemies.some((e) => !e.dead && f(e) && Math.hypot(e.x - c.x, e.y - c.y) < r);
    const ch = sc.chests.find((c) => !near(c, (e) => e.boss, 10) && near(c, (e) => !e.boss, 6)) ?? sc.chests.find((c) => !near(c, (e) => e.boss, 10)) ?? sc.chests[0];
    const free = (x, y) => sc.dungeon.tiles[y]?.[x] && sc.dungeon.tiles[y][x] !== 'wall';
    const spot = [[2, 1], [1, 2], [-2, 1], [1, -2], [2, 0], [0, 2]].map(([dx, dy]) => [ch.x + dx, ch.y + dy]).find(([x, y]) => free(x, y));
    if (spot) sc.debugTeleport(spot[0], spot[1]);
    sc.cameras.main.setZoom(sc.cameras.main.zoom * zoom);
  }, zoom);
  await s.wait(900);
  await s.ev(() => window.__GRAVEVOW__.setState({ toasts: [] }));
}

(async () => {
  // ── Escritorio 1920×1080 ──
  const d = await session({ width: 1920, height: 1080 }, false);
  const shot = (n) => d.p.screenshot({ path: `${OUT}/${n}.png` });
  await d.act('tab-play'); await d.act('btn-zone-map'); await d.act('zone-infierno'); await d.wait(500); await shot('jugar');
  await d.act('tab-stash'); await d.wait(400); await shot('alijo');
  await d.act('tab-merchants'); await d.act('btn-merchants'); await d.act('vendor-brand'); await d.act('vendor-view-forge'); await d.wait(300); await shot('forja');
  await d.act('tab-shop'); await d.wait(400); await shot('tienda');
  // Infierno: exploración y combate contra Belzar
  await dungeon(d, 'infierno');
  await shot('infierno');
  await d.ev(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_shot', 'belzar'));
  await d.p.waitForSelector('[data-testid=act-attack]:not([disabled])', { timeout: 10000 }).catch(() => {});
  await d.wait(3500); await d.ev(() => window.__GRAVEVOW__.setState({ toasts: [] })); await d.wait(300); await shot('combate');
  // Imagen para compartir (1200×630): el mismo combate
  await d.p.setViewportSize({ width: 1200, height: 630 }); await d.wait(700);
  await d.p.screenshot({ path: `${OUT}/compartir.png` });
  await d.p.setViewportSize({ width: 1920, height: 1080 });
  await d.ev(() => window.__GRAVEVOW__.setState({ combat: null, expedition: null, screen: 'lobby', dungeon: null, merc: null }));
  // Cripta
  await d.wait(400);
  await dungeon(d, 'cripta');
  await d.wait(400); await shot('cripta');
  if (d.errs.length) console.log('errores escritorio:', d.errs.slice(0, 3));
  await d.b.close();

  // ── Móvil en horizontal 844×390 ──
  const m = await session({ width: 844, height: 390 }, true);
  await dungeon(m, 'infierno', 1.25);
  await m.wait(500);
  await m.p.screenshot({ path: `${OUT}/movil-infierno.png` });
  if (m.errs.length) console.log('errores móvil:', m.errs.slice(0, 3));
  await m.b.close();
  console.log('hecho:', fs.readdirSync(OUT).filter((f) => f.endsWith('.png')).join(', '));
})().catch((e) => { console.error('FALLO', e.message); process.exit(1); });
