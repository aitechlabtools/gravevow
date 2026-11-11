// Fase 9: Refugio, desguace y cocina. Bastión → Tu Refugio (mejorar la cocina y el catre, dormir preparado), Garth → Cocina
// (al fogón paso a paso y después por lotes, comer el plato), Orik → Desguace (con confirmación de lo valioso).
// Uso: node scripts/refugio-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'refugio', dev] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  const fail = (m) => { console.log('FALLO:', m); process.exitCode = 1; };
  const G = (fn, arg) => p.evaluate(fn, arg);
  const box = async (sel) => (await p.$(sel))?.boundingBox();
  const small = async (sel, what) => { const bb = await box(sel); if (!bb) fail('no está: ' + what); else if (dev && bb.height < 43.5) fail(what + ' menor de 44 px: ' + bb.height); };
  const wide = async (where) => { const w = await G(() => document.documentElement.scrollWidth - window.innerWidth); if (w > 1) fail(where + ': se sale de la pantalla por ' + w + ' px'); };
  const count = (id) => G((id) => { const pr = window.__GRAVEVOW__.getState().profile; return [...pr.backpack, ...pr.stash].filter((x) => x && x.itemId === id).reduce((t, x) => t + x.qty, 0); }, id);

  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); await tap('[data-testid=btn-tutorial-ok]');
  // Nivel 12 (Orik ya está), materiales, ingredientes, una espada para desguazar y oro
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
    pr.tutorialSeen.dungeon = true; pr.tutorialDone = true;
    const st = pr.stash.slice(); let k = 0; const put = (itemId, qty) => { while (st[k]) k++; st[k] = { uid: 'r' + k, itemId, qty }; };
    put('copper_ore', 4); put('scrap_metal', 10); put('leather_scrap', 10); put('salted_meat', 3); put('cave_mushroom', 6); put('water', 4); put('iron_sword', 1); put('bastion_shield', 1);
    g.setState({ profile: { ...pr, stash: st, character: { ...pr.character, level: 12 }, gold: 400, needs: { sat: 50, hyd: 60, rest: 100 } } }); });

  // 1 · Refugio
  await tap('[data-testid=tab-merchants]'); await p.waitForSelector('[data-testid=btn-refuge]');
  await small('[data-testid=btn-refuge]', 'botón del Refugio');
  await tap('[data-testid=btn-refuge]'); await p.waitForSelector('[data-testid=screen-refuge]');
  if ((await p.$$('[data-testid^=module-]')).length !== 3) fail('el Refugio no enseña sus tres módulos');
  await small('[data-testid=upgrade-kitchen]', 'Mejorar la cocina');
  await wide('Refugio');
  await p.screenshot({ path: out + '-refugio.png' });
  await tap('[data-testid=upgrade-kitchen]'); await p.waitForTimeout(150);
  await tap('[data-testid=upgrade-cot]'); await p.waitForTimeout(150);
  const ref = await G(() => window.__GRAVEVOW__.getState().profile.refuge);
  if (!ref || ref.kitchen !== 1 || ref.cot !== 1) fail('no se mejoraron cocina y catre: ' + JSON.stringify(ref));
  if (!(await p.$('[data-testid=upgrade-block-bench]'))) fail('la siguiente mejora no dice qué falta');
  await tap('[data-testid=btn-cot]'); await p.waitForTimeout(150);
  if (!(await G(() => window.__GRAVEVOW__.getState().profile.prep?.cot))) fail('dormir en el jergón no deja preparado');
  if (!/Descanso/.test(await p.textContent('[data-testid=prep-text]'))) fail('la preparación no se ve');
  await tap('[data-testid=refuge-back]');

  // 2 · Cocina de Garth
  await p.waitForSelector('[data-testid=vendor-garth]'); await tap('[data-testid=vendor-garth]');
  await tap('[data-testid=vendor-view-cook]'); await p.waitForSelector('[data-testid=cook]');
  await small('[data-testid=cook-start-stew]', 'Al fogón');
  await tap('[data-testid=cook-start-stew]'); await p.waitForSelector('[data-testid=cook-stove]');
  if ((await count('salted_meat')) !== 2) fail('los ingredientes no se gastaron al empezar');
  await small('[data-testid=heat-low]', 'botón de fuego');
  await wide('Fogón');
  await p.screenshot({ path: out + '-fogon.png' });
  // Recargar no cambia lo que pasa en el fogón
  const ev = await G(() => JSON.stringify(window.__GRAVEVOW__.getState().profile.cooking.events));
  // Acertar los tres pasos leyendo el suceso
  const heatFor = { 'El fondo empieza a pegarse.': 'low', 'El caldo apenas tiembla.': 'high', 'Hierve a borbotones y salpica.': 'low', 'La carne aún suelta sangre.': 'high', 'Burbujea despacio, como debe.': 'mid', 'El aroma sube, pero el centro sigue frío.': 'mid' };
  for (let i = 0; i < 3; i++) {
    const t = (await p.textContent('[data-testid=cook-event]')).trim();
    if (!heatFor[t]) fail('suceso desconocido: ' + t);
    await tap(`[data-testid=heat-${heatFor[t] || 'mid'}]`); await p.waitForTimeout(120);
  }
  if (await G(() => !!window.__GRAVEVOW__.getState().profile.cooking)) fail('el fogón no se liberó');
  if ((await count('hearty_stew')) !== 1) fail('no salió el guiso');
  if ((await count('cave_mushroom')) !== 6) fail('el plato esmerado no devolvió la seta');
  if (!ev) fail('sin sucesos');
  await p.waitForSelector('[data-testid=cook-batch-stew]');
  await tap('[data-testid=cook-batch-stew]'); await p.waitForTimeout(150);
  if ((await count('hearty_stew')) !== 2) fail('el lote no cocinó');
  await tap('[data-testid=vendor-back]');

  // 3 · Desguace de Orik
  await p.waitForSelector('[data-testid=vendor-orik]'); await tap('[data-testid=vendor-orik]');
  await tap('[data-testid=vendor-view-scrap]'); await p.waitForSelector('[data-testid=scrap]');
  const scrap0 = await count('scrap_metal');
  const sword = await p.$('[data-testid^=scrap-btn-]');
  if (!sword) fail('no hay nada que desguazar');
  await small('[data-testid^=scrap-btn-]', 'Desguazar');
  await wide('Desguace');
  await p.screenshot({ path: out + '-desguace.png' });
  // El escudo del Bastión (raro) pide confirmación
  const shieldRow = await G(() => { const pr = window.__GRAVEVOW__.getState().profile; const i = pr.stash.findIndex((x) => x && x.itemId === 'bastion_shield'); return 'stash-' + i; });
  await tap(`[data-testid=scrap-btn-${shieldRow}]`); await p.waitForTimeout(100);
  if ((await count('bastion_shield')) !== 1) fail('lo valioso se desguazó sin confirmar');
  await tap(`[data-testid=scrap-btn-${shieldRow}]`); await p.waitForTimeout(150);
  if ((await count('bastion_shield')) !== 0) fail('la confirmación no desguazó');
  if (!((await count('scrap_metal')) > scrap0)) fail('el desguace no dio chatarra');
  await tap('[data-testid=vendor-back]');

  // 4 · Comer el guiso en el Refugio
  await tap('[data-testid=btn-refuge]'); await p.waitForSelector('[data-testid=eat-hearty_stew]');
  await small('[data-testid=eat-hearty_stew]', 'Comer');
  await tap('[data-testid=eat-hearty_stew]'); await p.waitForTimeout(150);
  const after = await G(() => { const pr = window.__GRAVEVOW__.getState().profile; return { prep: pr.prep, sat: pr.needs.sat }; });
  if (after.prep?.dish !== 'hearty_stew' || !(after.sat > 50)) fail('comer el guiso no preparó ni sació: ' + JSON.stringify(after));
  await p.screenshot({ path: out + '-preparado.png' });
  console.log(dev || 'escritorio', 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
