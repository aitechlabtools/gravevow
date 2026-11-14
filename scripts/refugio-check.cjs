// Fase 9 y bloque 2 (parte 2.1): Refugio con 7 estaciones (encargados, desbloqueo, forja y atril con crafteo y runas),
// entrada del Bastión, tarjetas y detalle (12/11), dormir preparado, Garth → Cocina
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
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); 
  // Nivel 12 (Orik ya está), materiales, ingredientes, una espada para desguazar y oro
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
    pr.tutorialSeen.dungeon = true; pr.tutorialDone = true;
    const st = pr.stash.slice(); let k = 0; const put = (itemId, qty) => { while (st[k]) k++; st[k] = { uid: 'r' + k, itemId, qty }; };
    put('copper_ore', 4); put('scrap_metal', 20); put('leather_scrap', 10); put('salted_meat', 3); put('cave_mushroom', 6); put('water', 4); put('iron_sword', 1); put('bastion_shield', 1); put('bone_dust', 4); put('arcane_shard', 4); put('rune_stone', 1);
    g.setState({ profile: { ...pr, stash: st, character: { ...pr.character, level: 12 }, gold: 400, needs: { sat: 50, hyd: 60, rest: 100 } } }); });

  // 1 · Bastión unificado: cada estación en la pestaña de su mercader
  const open = async (v) => { await p.waitForSelector(`[data-testid=vendor-${v}]`); await tap(`[data-testid=vendor-${v}]`); await tap('[data-testid=vendor-view-station]'); await p.waitForSelector('[data-testid=station-panel]'); };
  const back = async () => { await tap('[data-testid=vendor-back]'); await p.waitForSelector('[data-testid=vendor-list]'); };
  await tap('[data-testid=tab-merchants]'); await p.waitForSelector('[data-testid=vendor-list]');
  if (!/En ruinas/.test(await p.textContent('[data-testid=vendor-brand]')) && !dev) fail('la forja no se ve en ruinas desde el principio');
  if (!(await p.$('[data-testid=vendor-pending-garth]'))) fail('Garth no avisa de que la cocina ya se puede reconstruir');
  await wide('Bastión');
  await p.screenshot({ path: out + '-bastion.png' });
  // Cocina en ruinas: se reconstruye dentro de la pestaña de Garth
  await open('garth'); await p.waitForSelector('[data-testid=station-detail-kitchen]');
  await small('[data-testid=upgrade-kitchen]', 'Reconstruir la cocina');
  await tap('[data-testid=upgrade-kitchen]'); await p.waitForSelector('[data-testid=craft-kitchen]');
  await back();
  // Catre de Grizk: mejora, qué falta y dónde conseguirlo
  await open('grizk'); await tap('[data-testid=upgrade-open-cot]'); await p.waitForSelector('[data-testid=station-detail-cot]');
  await small('[data-testid=upgrade-cot]', 'Mejorar el catre');
  await wide('Detalle');
  await p.screenshot({ path: out + '-detalle.png' });
  await tap('[data-testid=upgrade-cot]'); await p.waitForTimeout(150);
  const ref = await G(() => window.__GRAVEVOW__.getState().profile.refuge);
  if (!ref || ref.kitchen !== 1 || ref.cot !== 2) fail('no se mejoraron cocina y catre: ' + JSON.stringify(ref));
  if (!(await p.$('[data-testid=upgrade-block-cot]'))) fail('la siguiente mejora no dice qué falta');
  if (!(await p.$('[data-testid^=source-cot-]'))) fail('no dice dónde conseguir lo que falta');
  await tap('[data-testid=detail-back]'); await back();
  // Forja ya construida: se usa en la pestaña de Brand
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; g.setState({ profile: { ...pr, refuge: { ...pr.refuge, forge: 1, alchemy: 3 } } }); });
  await open('brand'); await p.waitForSelector('[data-testid=craft-forge]');
  await small('[data-testid=craft-go]', 'Craftear');
  await wide('Forja');
  await p.screenshot({ path: out + '-forja.png' });
  await tap('[data-testid=recipe-c_scrap_bar]'); await tap('[data-testid=craft-go]'); await p.waitForTimeout(150);
  if ((await count('scrap_bar')) !== 1) fail('la forja no fabricó la barra de chatarra');
  await back();
  // Runas en el Laboratorio de Eldrin (nivel 3)
  await open('eldrin'); await tap('[data-testid=runic-runes]'); await p.waitForSelector('[data-testid=runes]');
  await tap('[data-testid^=rune-target-]'); await small('[data-testid=rune-hole-0]', 'Hueco de runa');
  await tap('[data-testid=rune-apply-rune_stone]'); await p.waitForTimeout(150);
  if (!(await G(() => [...window.__GRAVEVOW__.getState().profile.stash, ...Object.values(window.__GRAVEVOW__.getState().profile.equipment)].some((x) => x && (x.runes || []).includes('rune_stone'))))) fail('no se grabó la runa');
  await wide('Runas');
  await p.screenshot({ path: out + '-runas.png' });
  await tap('[data-testid=runes-back]'); await p.waitForSelector('[data-testid=craft-alchemy]');
  await back();
  // Dormir en el jergón (Grizk cobra) deja preparado
  await open('grizk'); await tap('[data-testid=btn-cot]'); await p.waitForTimeout(150);
  if (!(await G(() => window.__GRAVEVOW__.getState().profile.prep?.cot))) fail('dormir en el jergón no deja preparado');
  await back();
  if (!dev && !/Descanso/.test(await p.textContent('[data-testid=prep-text]'))) fail('la preparación no se ve');
  // 2 · Cocina de Garth: el menú de crafteo común, sin fogón ni primera vez
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; g.setState({ profile: { ...pr, refuge: { ...pr.refuge, kitchen: 2 } } }); });
  await p.waitForSelector('[data-testid=vendor-garth]'); await tap('[data-testid=vendor-garth]');
  await tap('[data-testid=vendor-view-station]'); await p.waitForSelector('[data-testid=craft-kitchen]');
  if (await p.$('[data-testid^=heat-]')) fail('sigue el minijuego del fogón');
  await tap('[data-testid=recipe-c_hearty_stew]'); await tap('[data-testid=craft-more]');
  if ((await p.textContent('[data-testid=craft-qty]')).trim() !== '2') fail('la cantidad no sube');
  await small('[data-testid=craft-go]', 'Craftear');
  await small('[data-testid=craft-more]', 'Más');
  await wide('Cocina');
  await p.screenshot({ path: out + '-cocina.png' });
  await tap('[data-testid=craft-go]'); await p.waitForTimeout(150);
  if ((await count('hearty_stew')) !== 2) fail('la cocina no hizo los dos guisos');
  // 3 de partida + 1 que regala Garth al construir la cocina − 2 guisos
  if ((await count('salted_meat')) !== 2) fail('no se gastó la carne');
  await tap('[data-testid=vendor-back]');

  // 3 · Desguace de Orik (sus estaciones ya no están dentro del mercader)
  await p.waitForSelector('[data-testid=vendor-orik]'); await tap('[data-testid=vendor-orik]');
  if (await p.$('[data-testid=vendor-view-stations]')) fail('los mercaderes no deben tener «Encargos del Refugio»');
  await tap('[data-testid=vendor-view-scrap]'); await p.waitForSelector('[data-testid=scrap]');
  const scrap0 = await count('scrap_metal');
  if (!(await p.$('[data-testid^=scrap-stash-]'))) fail('no hay nada que desguazar');
  await wide('Desguace');
  await p.screenshot({ path: out + '-desguace.png' });
  // El escudo del Bastión (raro) pide confirmación (el detalle está en desguace-check)
  const shieldRow = await G(() => { const pr = window.__GRAVEVOW__.getState().profile; const i = pr.stash.findIndex((x) => x && x.itemId === 'bastion_shield'); return 'stash-' + i; });
  await tap(`[data-testid=scrap-${shieldRow}]`); await tap('[data-testid=scrap-go]'); await p.waitForTimeout(100);
  if ((await count('bastion_shield')) !== 1) fail('lo valioso se desguazó sin confirmar');
  await tap('[data-testid=scrap-go]'); await p.waitForTimeout(150);
  if ((await count('bastion_shield')) !== 0) fail('la confirmación no desguazó');
  if (!((await count('scrap_metal')) > scrap0)) fail('el desguace no dio chatarra');
  await tap('[data-testid=vendor-back]');

  // 4 · Comer el guiso en la Cocina del Bastión
  await open('garth'); await p.waitForSelector('[data-testid=eat-hearty_stew]');
  await small('[data-testid=eat-hearty_stew]', 'Comer');
  await tap('[data-testid=eat-hearty_stew]'); await p.waitForTimeout(150);
  const after = await G(() => { const pr = window.__GRAVEVOW__.getState().profile; return { prep: pr.prep, sat: pr.needs.sat }; });
  if (after.prep?.dish !== 'hearty_stew' || !(after.sat > 50)) fail('comer el guiso no preparó ni sació: ' + JSON.stringify(after));
  await p.screenshot({ path: out + '-preparado.png' });
  console.log(dev || 'escritorio', 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
