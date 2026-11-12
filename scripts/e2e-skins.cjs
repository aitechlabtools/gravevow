// Prueba de los atuendos (skins): comprar en la Tienda con confirmación, ponérselo, cambiarlo desde la ranura «Atuendo»
// del Alijo, verlo en la mazmorra y en combate, y no perderlo al morir. También: partida antigua con Vestuario.
// Uso: node scripts/e2e-skins.cjs [url] [carpeta] [dispositivo de Playwright]
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/claude-0/skins';
const DEVICE = process.argv[4];
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = DEVICE ? await b.newContext({ ...devices[DEVICE] }) : await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const touch = !!DEVICE;
  const tap = async (sel) => { await page.waitForSelector(sel, { timeout: 8000 }); if (touch) await page.tap(sel); else await page.click(sel); await page.waitForTimeout(150); };
  const G = (fn, a) => page.evaluate(fn, a);
  const ok = (c, msg) => { if (!c) throw new Error(msg); console.log('✓', msg); };

  await page.goto(BASE + '?debug');
  await G(() => indexedDB.deleteDatabase('gravevow'));
  await page.reload();
  await tap('[data-testid=btn-play]');
  await G(() => document.fullscreenElement && document.exitFullscreen());
  await page.fill('[data-testid=name-input]', 'Penitente');
  await tap('[data-testid=btn-create]');
  
  ok(!(await page.$('[data-testid=tab-wardrobe]')), 'ya no hay pestaña Vestuario');
  await G(() => { const d = window.__GRAVEVOW__; const p = d.getState().profile; d.setState({ profile: { ...p, gold: 500 } }); }); // 500 monedas: da para unos atuendos (150, 400) pero no para el de 900

  // Tienda
  await tap('[data-testid=tab-shop]');
  await page.screenshot({ path: `${OUT}/tienda.png` });
  ok(await page.$eval('[data-testid=shop-buy-skin_ash_lord]', (e) => e.disabled), 'sin oro suficiente, el botón está desactivado');
  await tap('[data-testid=shop-buy-skin_penitent]');
  ok(!!(await page.$('[data-testid=skin-confirm]')), 'pide confirmación antes de comprar');
  await tap('[data-testid=skin-confirm-cancel]');
  ok((await G(() => window.__GRAVEVOW__.getState().profile.gold)) === 500, 'cancelar no cobra');
  await tap('[data-testid=shop-buy-skin_penitent]');
  await tap('[data-testid=skin-confirm-ok]');
  ok((await G(() => window.__GRAVEVOW__.getState().profile.gold)) === 350, 'comprar descuenta 150 monedas');
  await tap('[data-testid=skin-bought-equip]');
  ok((await G(() => window.__GRAVEVOW__.getState().profile.skins.equipped)) === 'skin_penitent', 'tras comprar, «Ponérmelo» lo equipa');
  ok(!!(await page.$('[data-testid=skin-equipped-skin_penitent]')), 'la tarjeta pasa a «Equipada»');

  // Alijo: ranura y selector
  await tap('[data-testid=tab-stash]');
  if (await page.$('[data-testid=seg-gear]')) await tap('[data-testid=seg-gear]');
  ok((await page.$eval('[data-testid=slot-skin]', (e) => e.dataset.item)) === 'skin_penitent', 'la ranura Atuendo muestra el puesto');
  const heroSel = (await page.$('[data-testid=alijo-hero]')) ? '[data-testid=alijo-hero] [data-testid=hero-sprite]' : null;
  const withSkin = heroSel ? await page.$eval(heroSel, (i) => i.src) : null;
  await page.screenshot({ path: `${OUT}/alijo.png` });
  await tap('[data-testid=slot-skin]');
  await page.screenshot({ path: `${OUT}/selector.png` });
  await tap('[data-testid=pick-none]');
  ok((await G(() => window.__GRAVEVOW__.getState().profile.skins.equipped)) === null, '«Sin atuendo» lo quita');
  if (heroSel) ok((await page.$eval(heroSel, (i) => i.src)) !== withSkin, 'el retrato del Aventurero cambia al momento');
  await tap('[data-testid=slot-skin]');
  await tap('[data-testid=pick-skin_penitent]');

  // Arrastrar o mover un objeto a la ranura no debe hacer nada
  const before = await G(() => JSON.stringify(window.__GRAVEVOW__.getState().profile.equipment));
  await G(() => window.__GRAVEVOW__.actions.transfer({ kind: 'grid', container: 'backpack', index: 0 }, { kind: 'equip', slot: 'skin' }));
  ok((await G(() => JSON.stringify(window.__GRAVEVOW__.getState().profile.equipment))) === before, 'la ranura no acepta objetos del inventario');

  // Mazmorra y combate
  await tap('[data-testid=tab-play]');
  await tap('[data-testid=btn-enter-dungeon]');
  
  await page.waitForTimeout(900);
  ok((await G(() => window.__GRAVEVOW__.scene().heroLook)).endsWith('|skin_penitent'), 'en la mazmorra se dibuja con el atuendo');
  await page.screenshot({ path: `${OUT}/mazmorra.png` });
  const ep = await G(() => { const e = window.__GRAVEVOW__.scene().enemies[0]; return [e.x, e.y]; });
  await G(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x, y), [Math.floor(ep[0]), Math.floor(ep[1]) - 1]);
  await page.waitForSelector('[data-testid=combat]', { timeout: 8000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/combate.png` });
  // Morir: el atuendo sigue siendo tuyo y puesto
  await G(() => { const d = window.__GRAVEVOW__; d.setState({ combat: null }); return d.actions.finishExpedition('died'); });
  await page.waitForTimeout(800);
  ok((await G(() => window.__GRAVEVOW__.getState().profile.stats.deaths)) === 1, 'la expedición termina con la muerte');
  const sk = await G(() => window.__GRAVEVOW__.getState().profile.skins);
  ok(sk.owned.includes('skin_penitent') && sk.equipped === 'skin_penitent', 'morir no quita el atuendo');

  // Partida antigua con Vestuario
  await G(() => { const d = window.__GRAVEVOW__; const p = d.getState().profile; const old = { ...p, cosmetics: ['cos_ossuary_helm'], wardrobe: { helmet: 'cos_ossuary_helm' } }; delete old.skins; d.setState({ profile: old }); });
  await page.waitForTimeout(800); // se guarda
  await page.reload();
  await tap('[data-testid=btn-play]');
  await page.waitForTimeout(400);
  const loaded = await G(() => { const p = window.__GRAVEVOW__.getState().profile; return { skins: p.skins, cos: 'cosmetics' in p, war: 'wardrobe' in p }; });
  ok(!loaded.cos && !loaded.war && Array.isArray(loaded.skins.owned), 'una partida antigua con Vestuario carga sin errores');
  console.log('errores:', errors.length ? errors : 'ninguno');
  await b.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error('FALLO', e.message); process.exit(1); });
