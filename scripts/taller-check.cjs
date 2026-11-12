// Bloque 2, fase 3: Refugio → Rincón de cura y Mesa de alquimia; Brand → Forja cerrada (se pide desde su servicio) y
// menú común; Eldrin → Mesa; Vesper → Rincón de cura; ningún minijuego; recepción de excedentes (vender y descartar).
// 12/11: el Bastión va con tarjetas como los mercaderes; «Reconstruir» en la tarjeta y la recepción en su propio panel.
// Uso: node scripts/taller-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'taller', dev] = process.argv;
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
  const all = (id) => G((id) => { const pr = window.__GRAVEVOW__.getState().profile; return [...pr.backpack, ...pr.stash].filter((x) => x && x.itemId === id); }, id);
  const count = async (id) => (await all(id)).reduce((t, x) => t + x.qty, 0);

  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); 
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
    pr.tutorialSeen.dungeon = true; pr.tutorialDone = true;
    const st = pr.stash.slice(); let k = 0; const put = (itemId, qty) => { while (st[k]) k++; st[k] = { uid: 't' + k, itemId, qty }; };
    put('iron_ore', 12); put('bone_dust', 8); put('arcane_shard', 10); put('scrap_metal', 10); put('leather_scrap', 14); put('water', 6); put('cave_mushroom', 4); put('ragged_cloth', 4);
    g.setState({ profile: { ...pr, stash: st, character: { ...pr.character, level: 90 }, bossesDefeated: ['ossuary_lord', 'veiled_queen'], gold: 600 } }); });

  // Con nivel alto sale el aviso de habilidad de clase: más tarde
  if (await p.waitForSelector('[data-testid=btn-class-unlock-later]', { timeout: 1500 }).catch(() => null)) await tap('[data-testid=btn-class-unlock-later]');
  // 1 · Bastión: los dos módulos nuevos
  await tap('[data-testid=tab-merchants]'); await p.waitForSelector('[data-testid=btn-refuge]');
  await tap('[data-testid=btn-refuge]'); await p.waitForSelector('[data-testid=screen-refuge]');
  if ((await p.$$('[data-testid=station-grid] > article')).length !== 7) fail('el Bastión no enseña sus siete estaciones');
  await small('[data-testid=ask-alchemy]', 'Reconstruir la mesa');
  await tap('[data-testid=ask-infirmary]'); await p.waitForTimeout(150);
  await tap('[data-testid=ask-alchemy]'); await p.waitForTimeout(150);
  const ref = await G(() => window.__GRAVEVOW__.getState().profile.refuge);
  if (ref?.infirmary !== 1 || ref?.alchemy !== 1) fail('no se construyeron rincón y mesa: ' + JSON.stringify(ref));
  await wide('Bastión');
  await p.screenshot({ path: out + '-bastion.png' });
  await tap('[data-testid=refuge-back]'); await tap('[data-testid=btn-merchants]');

  // 2 · Forja de Brand: en ruinas, «Ir al Bastión» lleva a reconstruirla; reconstruida, menú común sin yunque
  await p.waitForSelector('[data-testid=vendor-brand]'); await tap('[data-testid=vendor-brand]');
  await tap('[data-testid=vendor-view-forge]'); await p.waitForSelector('[data-testid=craft-locked-forge]');
  await small('[data-testid=go-station-forge]', 'Ir al Bastión');
  await wide('Forja en ruinas');
  await p.screenshot({ path: out + '-forja-cerrada.png' });
  await tap('[data-testid=go-station-forge]'); await p.waitForSelector('[data-testid=station-detail-forge]');
  await tap('[data-testid=upgrade-forge]'); await p.waitForTimeout(150);
  await tap('[data-testid=detail-back]'); await tap('[data-testid=refuge-back]'); await tap('[data-testid=btn-merchants]');
  await p.waitForSelector('[data-testid=vendor-brand]'); await tap('[data-testid=vendor-brand]');
  await tap('[data-testid=vendor-view-forge]'); await p.waitForSelector('[data-testid=craft-forge]');
  if (await p.$('[data-testid=workshop-job], [data-testid^=move-]')) fail('sigue el yunque');
  if (await p.$('[data-testid=craft-back]')) fail('el menú del mercader no debe llevar «◂ Volver» del Bastión');
  await tap('[data-testid=recipe-c_scrap_bar]'); await tap('[data-testid=craft-go]'); await p.waitForTimeout(150);
  if ((await count('scrap_bar')) !== 1) fail('la forja no hizo la barra');
  await wide('Forja');
  await p.screenshot({ path: out + '-forja.png' });
  await tap('[data-testid=vendor-back]');

  // 3 · Mesa de Eldrin
  await p.waitForSelector('[data-testid=vendor-eldrin]'); await tap('[data-testid=vendor-eldrin]');
  await tap('[data-testid=vendor-view-alchemy]'); await p.waitForSelector('[data-testid=craft-alchemy]');
  const mana0 = await count('mana_potion');
  await tap('[data-testid=recipe-c_mana_potion]'); await small('[data-testid=craft-to-backpack]', 'A la mochila');
  await tap('[data-testid=craft-to-backpack]'); await p.waitForTimeout(150);
  if ((await count('mana_potion')) !== mana0 + 1) fail('la mesa no dio la poción');
  await p.screenshot({ path: out + '-mesa.png' });
  await tap('[data-testid=vendor-back]');

  // 4 · Rincón de cura de Vesper
  await p.waitForSelector('[data-testid=vendor-vesper]'); await tap('[data-testid=vendor-vesper]');
  await tap('[data-testid=vendor-view-care]'); await p.waitForSelector('[data-testid=craft-infirmary]');
  const band0 = await count('bandage');
  await tap('[data-testid=recipe-c_bandage]'); await tap('[data-testid=craft-go]'); await p.waitForTimeout(150);
  if ((await count('bandage')) !== band0 + 2) fail('el rincón de cura no preparó vendas');
  await wide('Rincón de cura');
  await tap('[data-testid=vendor-back]');

  // 5 · Recepción: dos excedentes; se vende uno y se descarta otro (con confirmación)
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; g.setState({ profile: { ...pr, reception: [{ uid: 'x1', itemId: 'chainmail', qty: 1 }, { uid: 'x2', itemId: 'iron_helm', qty: 1 }] } }); });
  await tap('[data-testid=merchants-back]'); await p.waitForSelector('[data-testid=btn-refuge]');
  if (!/recepción 2/.test(await p.textContent('[data-testid=bastion-refuge]'))) fail('la tarjeta del Refugio no avisa de la recepción');
  await tap('[data-testid=btn-refuge]'); await tap('[data-testid=btn-reception]'); await p.waitForSelector('[data-testid=reception]');
  await small('[data-testid=reception-sell-0]', 'Vender desde recepción');
  await wide('Recepción');
  await p.screenshot({ path: out + '-recepcion.png' });
  const gold0 = await G(() => window.__GRAVEVOW__.getState().profile.gold);
  await tap('[data-testid=reception-sell-0]'); await p.waitForTimeout(150);
  if (!((await G(() => window.__GRAVEVOW__.getState().profile.gold)) > gold0)) fail('vender desde recepción no dio oro');
  await tap('[data-testid=reception-discard-0]'); await p.waitForTimeout(100);
  if ((await G(() => window.__GRAVEVOW__.getState().profile.reception.length)) !== 1) fail('se descartó sin confirmar');
  await tap('[data-testid=reception-discard-0]'); await p.waitForTimeout(150);
  if ((await G(() => window.__GRAVEVOW__.getState().profile.reception.length)) !== 0) fail('la recepción no se vació');
  if (await p.$('[data-testid=reception]')) fail('la recepción vacía sigue a la vista');
  console.log(dev || 'escritorio', 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
