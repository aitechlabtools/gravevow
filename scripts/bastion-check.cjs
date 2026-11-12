// Bastión con entrada (Mercaderes y Refugio), Refugio con tarjetas como los mercaderes y detalle de estación (12/11).
// Comprueba: entrada con avisos, «◂ Bastión» en las dos partes, las 7 estaciones visibles (bloqueadas hasta pedirlas), «Usar ·
// Dormir» en el Catre, «Detalles», detalle con niveles y coste, arte a escala entera, 44 px y sin desbordes.
// Uso: node scripts/bastion-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'bastion', dev] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1920, height: 1080 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  const fail = (m) => { console.log('FALLO:', m); process.exitCode = 1; };
  const G = (fn, arg) => p.evaluate(fn, arg);
  const check = async (where) => {
    const r = await G(() => ({
      hx: document.documentElement.scrollWidth - innerWidth,
      small: [...document.querySelectorAll('main button, [data-testid^=screen-] button')].filter((e) => { const r = e.getBoundingClientRect(); return r.height && (r.height < 43.5 || r.width < 43.5); }).map((e) => e.textContent.trim().slice(0, 30)),
      art: [...document.querySelectorAll('[data-testid^=screen-] .ui-arch img.pixelated')].map((i) => i.getBoundingClientRect().width / i.naturalWidth).filter((k) => k && Math.abs(k - Math.round(k)) > 0.01),
    }));
    if (r.hx > 1) fail(where + ': desborde horizontal ' + r.hx);
    if (dev && r.small.length) fail(where + ': botones de menos de 44 px: ' + r.small.join(' | '));
    if (r.art.length) fail(where + ': pixel art sin escala entera: ' + r.art.join(', '));
  };
  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); 
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
    const st = pr.stash.slice(); let k = 0; const put = (itemId, qty) => { while (st[k]) k++; st[k] = { uid: 'b' + k, itemId, qty }; };
    put('scrap_metal', 4); put('cave_mushroom', 4); put('leather_scrap', 6); put('water', 2);
    g.setState({ profile: { ...pr, stash: st, gold: 100, reception: [{ uid: 'r1', itemId: 'iron_helm', qty: 1 }] } }); });
  // Entrada
  await tap('[data-testid=tab-merchants]'); await p.waitForSelector('[data-testid=screen-bastion]');
  if (!(await p.$('[data-testid=btn-merchants]')) || !(await p.$('[data-testid=btn-refuge]'))) fail('la entrada no tiene las dos tarjetas');
  if (!/recepción 1/.test(await p.textContent('[data-testid=bastion-refuge]'))) fail('la tarjeta del Refugio no avisa de la recepción');
  await check('Entrada'); await p.screenshot({ path: out + '-1-entrada.png' });
  // Mercaderes
  await tap('[data-testid=btn-merchants]'); await p.waitForSelector('[data-testid=vendor-list]');
  if (await p.$('[data-testid=btn-cot]')) fail('el catre sigue en Mercaderes');
  if (await p.$('[data-testid=bastion-cot]')) fail('los barracones siguen en Mercaderes');
  await check('Mercaderes'); await p.screenshot({ path: out + '-2-mercaderes.png' });
  await tap('[data-testid=vendor-orik]');
  if (await p.$('[data-testid=vendor-view-stations]')) fail('«Encargos del Refugio» sigue dentro del mercader');
  await tap('[data-testid=vendor-back]'); await tap('[data-testid=merchants-back]'); await p.waitForSelector('[data-testid=screen-bastion]');
  // Refugio
  await tap('[data-testid=btn-refuge]'); await p.waitForSelector('[data-testid=station-grid]');
  if ((await p.$$('[data-testid^=module-]:not([data-testid^=module-level-])')).length !== 7) fail('no se ven las 7 estaciones');
  if (!(await p.$('[data-testid=ask-forge]'))) fail('la forja no está bloqueada con «Pedir a Brand»');
  if (!/Usar · Dormir/i.test(await p.textContent('[data-testid=btn-cot]'))) fail('el Catre no dice «Usar · Dormir»');
  if (!(await p.$('[data-testid=btn-reception]'))) fail('no hay botón de recepción');
  await check('Refugio'); await p.screenshot({ path: out + '-3-refugio.png' });
  await tap('[data-testid=btn-reception]'); await p.waitForSelector('[data-testid=reception]'); await p.keyboard.press('Escape').catch(() => {});
  await G(() => { const m = document.querySelector('[data-testid=reception-modal]'); if (m) [...m.querySelectorAll('button')].pop().click(); });
  // Detalle de la cocina
  await tap('[data-testid=details-kitchen]'); await p.waitForSelector('[data-testid=station-detail-kitchen]');
  if ((await p.$$('[data-testid^=station-level-kitchen-]')).length !== 3) fail('el detalle no enseña los tres niveles');
  if (!(await p.$('[data-testid=upgrade-kitchen]'))) fail('el detalle no tiene el botón de pedirla');
  await check('Detalle'); await p.screenshot({ path: out + '-4-detalle.png' });
  await tap('[data-testid=upgrade-kitchen]'); await p.waitForTimeout(150);
  if ((await G(() => window.__GRAVEVOW__.getState().profile.refuge?.kitchen)) !== 1) fail('no se construyó la cocina desde el detalle');
  if (!(await p.$('[data-testid=refuge-dishes]'))) fail('la cocina no ofrece comer platos');
  await tap('[data-testid=detail-back]'); await p.waitForSelector('[data-testid=enter-kitchen]');
  await tap('[data-testid=enter-kitchen]'); await p.waitForSelector('[data-testid=craft-kitchen]');
  await tap('[data-testid=craft-back]'); await tap('[data-testid=refuge-back]'); await p.waitForSelector('[data-testid=screen-bastion]');
  await tap('[data-testid=btn-refuge]'); await p.waitForSelector('[data-testid=module-forge]');
  await check('Refugio completo'); await p.screenshot({ path: out + '-5-refugio-completo.png' });
  console.log(dev || 'escritorio', 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
