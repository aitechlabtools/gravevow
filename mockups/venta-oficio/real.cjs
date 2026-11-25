// Venta por oficio, resultado real: node mockups/venta-oficio/real.cjs [url]
const { chromium } = require('playwright'); const path = require('path'); const base = require('./antes.cjs');
const out = (n) => path.join(__dirname, n + '.png');
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
  for (const sz of Object.keys(base.SIZES)) {
    const { c, p, press } = await base.setup(b, sz); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); const wait = (ms = 400) => p.waitForTimeout(ms);
    await press('[data-testid=tab-merchants]'); await wait(500);
    for (const v of ['nira', 'vesper', 'garth', 'orik', 'grizk', 'brand', 'valerius', 'eldrin']) {
      await press(`[data-testid=vendor-${v}]`); await wait(500);
      ok(!!(await p.$('[data-testid=vendor-view-sell]')), `${sz}: ${v} tiene «Vender»`);
      await press('[data-testid=vendor-view-sell]'); await wait(400);
      if (sz === 'movil' && !(await p.$('[data-testid=sell-trade]'))) { const d = await p.$('[data-testid=vendor-side] button'); if (d) { await d.tap(); await wait(300); } }
      await p.screenshot({ path: out(`real-${v}-${sz}`) });
      const closed = !!(await p.$('[data-testid=sell-closed]'));
      ok(['vesper', 'orik', 'eldrin'].includes(v) === closed, `${sz}: ${v} ${closed ? 'sin estación, manda a Nira' : 'compra'}`);
      if (v === 'grizk') {
        const btn = await p.$('[data-testid=btn-sell-all-mine]'); const bb = await btn.boundingBox(); ok(bb.height >= 44, `${sz}: botón de ${Math.round(bb.height)} px`);
        const g0 = await p.evaluate(() => window.__GRAVEVOW__.getState().profile.gold);
        await btn.click(); await wait(300); await p.screenshot({ path: out(`real-confirmar-${sz}`) });
        await press('[data-testid=btn-confirm-sell-all]'); await wait(400);
        const pr = await p.evaluate(() => window.__GRAVEVOW__.getState().profile);
        ok(pr.gold > g0 && !pr.backpack.some((x) => x && ['copper_ring', 'golden_chalice', 'crypt_key', 'bone_amulet'].includes(x.itemId)), `${sz}: Grizk compra sus 4 objetos (+${pr.gold - g0} oro)`);
        if (sz === 'movil') await p.evaluate(() => document.querySelector('[data-testid=vendor-side] button')?.click());
      }
      if (v === 'brand') {
        const i = await p.evaluate(() => window.__GRAVEVOW__.getState().profile.backpack.findIndex((x) => x?.itemId === 'jerky'));
        ok((await p.$eval(`[data-testid=slot-backpack-${i}]`, (e) => e.className)).includes('slot-nobuy'), `${sz}: en Brand la cecina sale apagada`);
        await p.click(`[data-testid=slot-backpack-${i}]`, { force: true }); await wait(300);
        const txt = await p.evaluate(() => document.body.innerText);
        ok(/La comida: Garth en La Cocina/.test(txt), `${sz}: aviso de a quién se vende`);
        await p.screenshot({ path: out(`real-equivocado-${sz}`) });
      }
      const small = await p.evaluate(() => [...document.querySelectorAll('[data-testid=sell-trade] *, .slot-buyer')].filter((e) => e.offsetParent && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).length);
      ok(small === 0, `${sz}: ${v} sin textos de menos de 12 px`);
      await press('[data-testid=vendor-back]'); await wait(300); }
    await press('[data-testid=tab-stash]'); await wait(600);
    ok((await p.$$('[data-testid=slot-buyer]')).length > 5, `${sz}: iniciales del comprador en el inventario`);
    const i = await p.evaluate(() => window.__GRAVEVOW__.getState().profile.backpack.findIndex((x) => x?.itemId === 'iron_ore'));
    if (sz === 'escritorio') await p.hover(`[data-testid=slot-backpack-${i}]`); else await p.tap(`[data-testid=slot-backpack-${i}]`);
    await wait(400); ok(/Lo compra/.test(await p.evaluate(() => document.body.innerText)), `${sz}: la ficha dice quién lo compra`);
    await p.screenshot({ path: out(`real-inventario-${sz}`) });
    ok(!errs.length, `${sz}: sin errores ${errs.join(' | ')}`); await c.close(); }
  await b.close(); })();
