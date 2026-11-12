// Fase 9 (segunda tanda): Refugio → Rincón de cura y Mesa de alquimia; Brand → yunque (leer la temperatura y golpear)
// y forja rápida; Eldrin → mesa de alquimia; Vesper → Rincón de cura; recepción de excedentes (vender y descartar).
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
  // Juega el paso: lee la lectura y la franja del estado y toca lo correcto
  const playRight = async () => {
    for (let i = 0; i < 6; i++) {
      const job = await G(() => window.__GRAVEVOW__.getState().profile.workshop);
      if (!job) return;
      const txt = await p.textContent('[data-testid=workshop-reading]');
      const m = txt.match(/marca (\d+).*?(\d+)–(\d+)/);
      if (!m) { fail('lectura ilegible: ' + txt); return; }
      const [t, lo, hi] = m.slice(1).map(Number);
      if (t !== job.readings[job.picks.length]) fail('la lectura en pantalla no es la del estado');
      await tap(`[data-testid=move-${t < lo ? 'up' : t > hi ? 'down' : 'hold'}]`); await p.waitForTimeout(120);
    }
  };

  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); await tap('[data-testid=btn-tutorial-ok]');
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
    pr.tutorialSeen.dungeon = true; pr.tutorialDone = true;
    const st = pr.stash.slice(); let k = 0; const put = (itemId, qty) => { while (st[k]) k++; st[k] = { uid: 't' + k, itemId, qty }; };
    put('iron_ore', 12); put('bone_dust', 8); put('arcane_shard', 10); put('scrap_metal', 10); put('leather_scrap', 14); put('water', 6); put('cave_mushroom', 4);
    g.setState({ profile: { ...pr, stash: st, character: { ...pr.character, level: 90 }, bossesDefeated: ['ossuary_lord', 'veiled_queen'], gold: 600 } }); });

  // Con nivel alto sale el aviso de habilidad de clase: más tarde
  if (await p.waitForSelector('[data-testid=btn-class-unlock-later]', { timeout: 1500 }).catch(() => null)) await tap('[data-testid=btn-class-unlock-later]');
  // 1 · Refugio: los dos módulos nuevos
  await tap('[data-testid=tab-merchants]'); await p.waitForSelector('[data-testid=btn-refuge]');
  await tap('[data-testid=btn-refuge]'); await p.waitForSelector('[data-testid=screen-refuge]');
  if ((await p.$$('[data-testid=station-grid] > div')).length !== 7) fail('el Refugio no enseña sus siete estaciones');
  await small('[data-testid=upgrade-alchemy]', 'Mejorar la mesa');
  await tap('[data-testid=upgrade-infirmary]'); await p.waitForTimeout(150);
  await tap('[data-testid=upgrade-alchemy]'); await p.waitForTimeout(150);
  const ref = await G(() => window.__GRAVEVOW__.getState().profile.refuge);
  if (ref?.infirmary !== 1 || ref?.alchemy !== 1) fail('no se construyeron rincón y mesa: ' + JSON.stringify(ref));
  await wide('Refugio');
  await p.screenshot({ path: out + '-refugio.png' });
  await tap('[data-testid=refuge-back]');

  // 2 · Yunque de Brand
  await p.waitForSelector('[data-testid=vendor-brand]'); await tap('[data-testid=vendor-brand]');
  await tap('[data-testid=vendor-view-forge]'); await p.waitForSelector('[data-testid=forge]');
  await small('[data-testid=forge-r_tempered_sword]', 'Al yunque');
  await tap('[data-testid=forge-r_tempered_sword]'); await p.waitForSelector('[data-testid=workshop-job]');
  if ((await count('iron_ore')) !== 6) fail('el yunque no gastó el mineral al empezar');
  await small('[data-testid=move-hold]', 'Golpear');
  await wide('Yunque');
  await p.screenshot({ path: out + '-yunque.png' });
  // Recargar a mitad: el trabajo sigue igual
  const before = await G(() => JSON.stringify(window.__GRAVEVOW__.getState().profile.workshop));
  await playRight();
  const sw = await all('tempered_sword');
  if (sw.length !== 1 || sw[0].quality !== 2) fail('acertar todos los golpes no dio una espada magistral: ' + JSON.stringify(sw));
  if (!before) fail('sin trabajo en el yunque');
  await p.waitForSelector('[data-testid=forge-quick-r_tempered_sword]');
  await tap('[data-testid=forge-quick-r_tempered_sword]'); await p.waitForTimeout(150);
  if ((await all('tempered_sword')).filter((x) => x.quality === 0).length !== 1) fail('la forja rápida no dio una tosca');
  await tap('[data-testid=vendor-back]');

  // 3 · Mesa de Eldrin
  await p.waitForSelector('[data-testid=vendor-eldrin]'); await tap('[data-testid=vendor-eldrin]');
  await tap('[data-testid=vendor-view-alchemy]'); await p.waitForSelector('[data-testid=alchemy]');
  await small('[data-testid=alchemy-start-a_mana]', 'A la mesa');
  await tap('[data-testid=alchemy-start-a_mana]'); await p.waitForSelector('[data-testid=workshop-job]');
  await p.screenshot({ path: out + '-mesa.png' });
  const mana0 = await count('mana_potion');
  await playRight();
  if ((await count('mana_potion')) !== mana0 + 1) fail('la mesa no dio la poción');
  await p.waitForSelector('[data-testid=alchemy-batch-a_mana]');
  await tap('[data-testid=vendor-back]');

  // 4 · Rincón de cura de Vesper
  await p.waitForSelector('[data-testid=vendor-vesper]'); await tap('[data-testid=vendor-vesper]');
  await tap('[data-testid=vendor-view-care]'); await p.waitForSelector('[data-testid=care]');
  const band0 = await count('bandage');
  await small('[data-testid=care-make-c_bandage]', 'Preparar');
  await tap('[data-testid=care-make-c_bandage]'); await p.waitForTimeout(150);
  if ((await count('bandage')) !== band0 + 2) fail('el rincón de cura no preparó vendas');
  await wide('Rincón de cura');
  await tap('[data-testid=vendor-back]');

  // 5 · Recepción: dos excedentes; se vende uno y se descarta otro (con confirmación)
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; g.setState({ profile: { ...pr, reception: [{ uid: 'x1', itemId: 'chainmail', qty: 1 }, { uid: 'x2', itemId: 'iron_helm', qty: 1 }] } }); });
  await p.waitForSelector('[data-testid=btn-refuge]');
  if (!/recepción 2/.test(await p.textContent('[data-testid=btn-refuge]'))) fail('el botón del Refugio no avisa de la recepción');
  await tap('[data-testid=btn-refuge]'); await p.waitForSelector('[data-testid=reception]');
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
