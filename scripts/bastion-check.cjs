// Bastión unificado (14/11): la pestaña Bastión enseña los 8 mercaderes (2 filas de 4, retrato de medio pecho); cada uno
// abre su pantalla con pestañas y SU estación dentro (reconstruir, usar y mejorar). Comprueba: 8 tarjetas sin entrada,
// avisos de pendiente, retrato a escala entera, pestañas por mercader, Catre de Grizk que cobra, Curtiduría de Nira,
// Forja de armaduras de Valerius, Laboratorio de Eldrin, recepción, «◂ Bastión», 44 px en táctil y sin desbordes.
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
      small: [...document.querySelectorAll('main button, [data-testid^=screen-] button, [data-testid=vendor-interior] button')].filter((e) => { const r = e.getBoundingClientRect(); return r.height && r.width && (r.height < 43.5 || r.width < 43.5) && getComputedStyle(e).visibility !== 'hidden'; }).map((e) => e.textContent.trim().slice(0, 30)),
      art: [...document.querySelectorAll('.vbust img, [data-testid=vendor-panel] .ui-arch img')].map((i) => i.getBoundingClientRect().width / i.naturalWidth).filter((k) => k && Math.abs(k - Math.round(k)) > 0.01),
    }));
    if (r.hx > 1) fail(where + ': desborde horizontal ' + r.hx);
    if (dev && r.small.length) fail(where + ': botones de menos de 44 px: ' + r.small.join(' | '));
    if (r.art.length) fail(where + ': pixel art sin escala entera: ' + r.art.join(', '));
  };
  const shot = (n) => p.screenshot({ path: `${out}-${n}.png` });
  const rest = () => G(() => Math.round(window.__GRAVEVOW__.getState().profile.needs?.rest ?? 100));
  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]');
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
    const st = pr.stash.slice(); let k = 0; const put = (itemId, qty) => { while (st[k]) k++; st[k] = { uid: 'b' + k, itemId, qty }; };
    put('scrap_metal', 12); put('cave_mushroom', 4); put('leather_scrap', 10); put('water', 3); put('bone_dust', 4); put('iron_ore', 6);
    g.setState({ profile: { ...pr, stash: st, gold: 400, reception: [{ uid: 'r1', itemId: 'iron_helm', qty: 1 }], needs: { ...(pr.needs ?? {}), rest: 40 } } }); });

  // 1. La pestaña Bastión: 8 tarjetas, sin entrada
  await tap('[data-testid=tab-merchants]'); await p.waitForSelector('[data-testid=vendor-list]');
  if (await p.$('[data-testid=btn-merchants]') || await p.$('[data-testid=btn-refuge]')) fail('sigue la entrada con dos tarjetas');
  const cards = await p.$$('[data-testid=vendor-list] > button');
  if (cards.length !== 8) fail(`se ven ${cards.length} mercaderes, no 8`);
  const rows = await G(() => new Set([...document.querySelectorAll('[data-testid=vendor-list] > button')].map((e) => Math.round(e.getBoundingClientRect().top))).size);
  if (rows !== 2) fail(`las tarjetas no van en 2 filas (${rows})`);
  const phoneUi = await G(() => innerHeight <= 520);
  if (!phoneUi && !/Banco de trabajo/.test(await p.textContent('[data-testid=vendor-orik]'))) fail('la tarjeta de Orik no dice su estación');
  if (!phoneUi && !/Catre/.test(await p.textContent('[data-testid=vendor-grizk]'))) fail('la tarjeta de Grizk no tiene el Catre');
  if (!(await p.$('[data-testid=vendor-pending-orik]'))) fail('Orik no avisa de que el banco ya se puede reconstruir');
  if (!dev && !(await p.$('[data-testid=btn-reception]'))) fail('no hay botón de recepción');
  await check('Bastión'); await shot('1-bastion');

  // 2. Grizk: Catre como estación, cobra la noche
  await tap('[data-testid=vendor-grizk]'); await p.waitForSelector('[data-testid=vendor-interior]');
  const gtabs = await G(() => [...document.querySelectorAll('[data-testid=vendor-tabs] button')].map((e) => e.textContent.trim()));
  if (!gtabs.some((t) => /^Catre/.test(t)) || !gtabs.some((t) => /Contratos/.test(t)) || !/Bastión/.test(gtabs.at(-1))) fail('pestañas de Grizk: ' + gtabs.join(' | '));
  await tap('[data-testid=vendor-view-station]'); await p.waitForSelector('[data-testid=cot-panel]');
  if (!/5 oro/.test(await p.textContent('[data-testid=btn-cot]'))) fail('Dormir no dice el precio');
  const g0 = await G(() => window.__GRAVEVOW__.getState().profile.gold);
  await tap('[data-testid=btn-cot]'); await p.waitForTimeout(200);
  const g1 = await G(() => window.__GRAVEVOW__.getState().profile.gold);
  if (g0 - g1 !== 5) fail(`dormir no cobró 5 de oro (${g0} → ${g1})`);
  if ((await rest()) < 100) fail('dormir no llenó el Descanso');
  await check('Grizk · Catre'); await shot('2-grizk-catre');
  await tap('[data-testid=vendor-back]'); await p.waitForSelector('[data-testid=vendor-list]');

  // 3. Orik: Banco en ruinas dentro de su pestaña, se reconstruye ahí
  await tap('[data-testid=vendor-orik]'); await p.waitForSelector('[data-testid=vendor-interior]');
  if (!(await p.$('[data-testid=vendor-pending]')) && !dev) fail('Orik no enseña lo pendiente');
  await tap('[data-testid=vendor-view-station]'); await p.waitForSelector('[data-testid=station-detail-bench]');
  if ((await p.$$('[data-testid^=station-level-bench-]')).length !== 3) fail('el detalle no enseña los tres niveles');
  await tap('[data-testid=upgrade-bench]'); await p.waitForSelector('[data-testid=craft-bench]', { timeout: 4000 }).catch(() => fail('tras reconstruir no se usa el banco'));
  if (!(await p.$('[data-testid=upgrade-open-bench]'))) fail('dentro de la estación no hay «▲ Mejorar»');
  await check('Orik · Banco'); await shot('3-orik-banco');
  await tap('[data-testid=upgrade-open-bench]'); await p.waitForSelector('[data-testid=station-detail-bench]');
  await tap('[data-testid=detail-back]'); await p.waitForSelector('[data-testid=craft-bench]');
  await tap('[data-testid=vendor-back]');

  // 4. Nira: Curtiduría (cuero y tela); Valerius: Forja de armaduras; Eldrin: Laboratorio
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; g.setState({ profile: { ...pr, refuge: { ...pr.refuge, tannery: 1, armory: 1, alchemy: 3, forge: 1 } } }); });
  for (const [v, st, rx, n] of [['nira', 'tannery', /Curtiduría/, '4-nira'], ['valerius', 'armory', /Forja de armaduras/, '5-valerius'], ['eldrin', 'alchemy', /Laboratorio/, '6-eldrin'], ['brand', 'forge', /Forja/, '7-brand']]) {
    await tap(`[data-testid=vendor-${v}]`); await p.waitForSelector('[data-testid=vendor-interior]');
    if (!rx.test(await p.textContent('[data-testid=vendor-view-station]'))) fail(`${v}: la pestaña de estación no se llama bien`);
    await tap('[data-testid=vendor-view-station]'); await p.waitForSelector(`[data-testid=craft-${st}]`);
    const names = await G(() => document.querySelector('[data-testid^=craft-]')?.textContent ?? '');
    if (st === 'tannery' && !/Cuero curtido/i.test(names)) fail('la Curtiduría no tiene el cuero curtido');
    if (st === 'armory' && (!/Cota de malla/i.test(names) || /Espada/i.test(names))) fail('la Forja de armaduras no tiene solo armaduras');
    if (st === 'forge' && /Cota de malla/i.test(names)) fail('la cota de malla sigue en la Forja de Brand');
    if (st === 'alchemy' && !(await p.$('[data-testid=runic-runes]'))) fail('el Laboratorio a nivel 3 no ofrece «Grabar runas»');
    await check(v); await shot(n);
    await tap('[data-testid=vendor-back]'); await p.waitForSelector('[data-testid=vendor-list]');
  }
  if (errs.length) fail('errores: ' + errs.join(' | '));
  console.log(process.exitCode ? 'Con fallos' : 'Todo bien');
  await b.close();
})();
