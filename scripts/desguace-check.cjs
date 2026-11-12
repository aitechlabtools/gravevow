// Bloque 2, fase 5: desguace nuevo en el taller de Orik. Seguro y posible, recluta bloqueado, confirmación y varios a la vez.
// Uso: node scripts/desguace-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'desguace', dev] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  const fail = (m) => { console.log('FALLO:', m); process.exitCode = 1; };
  const G = (fn, arg) => p.evaluate(fn, arg);
  const small = async (sel, what) => { const bb = await (await p.$(sel))?.boundingBox(); if (!bb) fail('no está: ' + what); else if (dev && bb.height < 43.5) fail(what + ' menor de 44 px: ' + bb.height); };
  const wide = async (where) => { const w = await G(() => document.documentElement.scrollWidth - window.innerWidth); if (w > 1) fail(where + ': se sale de la pantalla por ' + w + ' px'); };
  const count = (id) => G((id) => { const pr = window.__GRAVEVOW__.getState().profile; return [...pr.backpack, ...pr.stash].filter((x) => x && x.itemId === id).reduce((t, x) => t + x.qty, 0); }, id);
  const row = (id) => G((id) => { const pr = window.__GRAVEVOW__.getState().profile; const i = pr.stash.findIndex((x) => x && x.itemId === id && !x.cover); return 'stash-' + i; }, id);

  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); await tap('[data-testid=btn-tutorial-ok]');
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
    pr.tutorialSeen.dungeon = true; pr.tutorialDone = true;
    const st = pr.stash.slice(); let k = 0; const put = (itemId, qty, extra) => { while (st[k]) k++; st[k] = { uid: 'd' + k, itemId, qty, ...extra }; };
    put('chainmail', 1); put('iron_helm', 1); put('bastion_shield', 1); put('recruit_sword', 1);
    g.setState({ profile: { ...pr, stash: st, character: { ...pr.character, level: 12 }, gold: 100 } }); });
  await tap('[data-testid=tab-merchants]');
  await p.waitForSelector('[data-testid=vendor-orik]'); await tap('[data-testid=vendor-orik]');
  await tap('[data-testid=vendor-view-scrap]'); await p.waitForSelector('[data-testid=scrap]');

  // El equipo de recluta no aparece
  if (await p.$(`[data-testid=scrap-${await row('recruit_sword')}]`)) fail('el equipo de recluta sale en el desguace');
  // Cada fila enseña seguro y posible con porcentaje
  const mail = await row('chainmail');
  const txt = await p.textContent(`[data-testid=scrap-${mail}]`);
  if (!/Seguro:/.test(txt) || !/Posible:.*%/.test(txt)) fail('la fila no enseña seguro y posible: ' + txt);
  await small(`[data-testid=scrap-${mail}]`, 'Fila de desguace');

  // Marcar dos (cota y yelmo): el resumen suma; sin confirmación
  await tap(`[data-testid=scrap-${mail}]`); await tap(`[data-testid=scrap-${await row('iron_helm')}]`);
  const sum = await p.textContent('[data-testid=scrap-summary]');
  if (!/Seguro:/.test(sum) || !/hasta/.test(sum)) fail('el resumen no suma: ' + sum);
  if (!/\(2\)/.test(await p.textContent('[data-testid=scrap-go]'))) fail('el botón no cuenta dos');
  await small('[data-testid=scrap-go]', 'Desguazar seleccionados');
  await wide('Desguace');
  await p.screenshot({ path: out + '-seleccion.png' });
  const scrap0 = await count('scrap_metal');
  await tap('[data-testid=scrap-go]'); await p.waitForTimeout(150);
  if ((await count('chainmail')) + (await count('iron_helm')) !== 0) fail('no se desguazaron los dos');
  if (!((await count('scrap_metal')) > scrap0)) fail('no dio la parte segura');

  // Lo raro pide confirmación
  await tap(`[data-testid=scrap-${await row('bastion_shield')}]`); await tap('[data-testid=scrap-go]'); await p.waitForTimeout(100);
  if ((await count('bastion_shield')) !== 1) fail('lo raro se desguazó sin confirmar');
  if (!/raros/.test(await p.textContent('[data-testid=scrap-summary]'))) fail('no avisa de que es raro');
  await p.screenshot({ path: out + '-confirmar.png' });
  await tap('[data-testid=scrap-go]'); await p.waitForTimeout(150);
  if ((await count('bastion_shield')) !== 0) fail('la confirmación no desguazó');
  console.log(dev || 'escritorio', 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
