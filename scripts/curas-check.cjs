// Bloque 1, fase 6: tocar para curar. Tocas una cura de la mochila (dentro del panel) y el cuerpo resalta dónde sirve;
// tocas la parte y se cura. Al revés: eliges una parte y se resaltan las curas que le sirven. Botones de 44 px en táctil.
// Uso: node scripts/curas-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'curas', dev] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  const fail = (m) => { console.log('FALLO:', m); process.exitCode = 1; };
  const G = (fn, arg) => p.evaluate(fn, arg);
  const cls = (sel) => p.getAttribute(sel, 'class');
  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); await tap('[data-testid=btn-tutorial-ok]');
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
    const bp = pr.backpack.slice(); const free = () => bp.findIndex((x) => !x);
    bp[free()] = { uid: 'sp1', itemId: 'splint', qty: 2 }; bp[free()] = { uid: 'bd1', itemId: 'bandage', qty: 1 };
    g.setState({ profile: { ...pr, backpack: bp, tutorialSeen: { ...pr.tutorialSeen, dungeon: true }, wounds: { pct: { legL: 0.6, armR: 0.7 }, fractures: ['legL'] } } }); });
  await tap('[data-testid=tab-stash]'); await tap('[data-testid=seg-status]');
  await p.waitForSelector('[data-testid=body-kit]');
  const kb = await (await p.$('[data-testid=kit-splint]')).boundingBox();
  if (kb.height < 43.5 || kb.width < 43.5) fail('cura de la mochila menor de 44 px: ' + JSON.stringify(kb));
  // Al revés: elegir la pierna rota resalta la férula y no la venda
  await tap('[data-testid=body-row-legL]');
  if (!(await cls('[data-testid=kit-splint]')).includes('fit')) fail('la férula no se resalta para la pierna rota');
  if ((await cls('[data-testid=kit-bandage]')).includes('fit')) fail('la venda no debería resaltarse sin sangrado');
  // Tocar la férula: la pierna rota se resalta y el brazo no
  await tap('[data-testid=kit-splint]');
  if (!(await cls('[data-testid=body-row-legL]')).includes('drop-yes')) fail('la pierna rota no se resalta con la férula');
  if (!(await cls('[data-testid=body-row-armR]')).includes('drop-no')) fail('el brazo sano de huesos debería apagarse');
  await p.screenshot({ path: out + '-1.png' });
  // Tocar una parte donde no sirve no gasta nada y suelta la elección
  await tap('[data-testid=body-row-armR]');
  const n1 = await G(() => window.__GRAVEVOW__.getState().profile.backpack.find((x) => x && x.itemId === 'splint').qty);
  if (n1 !== 2) fail('tocar donde no sirve gastó la férula');
  if ((await cls('[data-testid=kit-splint]')).includes(' on')) fail('la elección debería soltarse');
  // Férula → pierna: se cura
  await tap('[data-testid=kit-splint]'); await tap('[data-testid=body-row-legL]'); await p.waitForTimeout(150);
  const r = await G(() => { const q = window.__GRAVEVOW__.getState().profile; return { f: q.wounds?.fractures ?? [], n: q.backpack.find((x) => x && x.itemId === 'splint')?.qty }; });
  if (r.f.includes('legL') || r.n !== 1) fail('tocar férula y pierna no curó: ' + JSON.stringify(r));
  await p.screenshot({ path: out + '-2.png' });
  console.log(dev || 'escritorio', JSON.stringify(r), 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
