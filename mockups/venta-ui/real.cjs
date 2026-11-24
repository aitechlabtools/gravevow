// Rediseño de la venta, resultado real: node mockups/venta-ui/real.cjs [url]
const { chromium } = require('playwright'); const path = require('path'); const base = require('../venta-oficio/antes.cjs');
const out = (n) => path.join(__dirname, n + '.png');
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
  for (const sz of Object.keys(base.SIZES)) {
    const { c, p, press } = await base.setup(b, sz); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); const wait = (ms = 350) => p.waitForTimeout(ms);
    const phone = sz === 'movil';
    // Pilas y un objeto protegido para probar
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = structuredClone(g.getState().profile);
      pr.refuge = { ...pr.refuge, infirmary: 1, kitchen: 1, bench: 1, forge: 1, armory: 1, alchemy: 1, tannery: 1 };
      const i = pr.backpack.findIndex((x) => x?.itemId === 'health_potion'); pr.backpack[i] = { ...pr.backpack[i], qty: 6 };
      const s = pr.stash.findIndex((x) => !x); pr.stash[s] = { uid: 'st1', itemId: 'iron_helm', qty: 1 }; pr.stash[s + 1] = { uid: 'st2', itemId: 'bastion_shield', qty: 1, locked: true };
      g.setState({ profile: pr }); });
    await press('[data-testid=tab-merchants]'); await wait(500);
    await press('[data-testid=vendor-valerius]'); await wait(500); await press('[data-testid=vendor-view-sell]'); await wait(400);
    ok(/Compra:/.test(await p.$eval('[data-testid=vendor-buys]', (e) => e.textContent).catch(() => '')) || phone, `${sz}: «Compra:» en la columna del mercader`);
    // Marcar en la mochila y en el almacén: la selección se mantiene
    const idx = (id, cont = 'backpack') => p.evaluate(([id, cont]) => window.__GRAVEVOW__.getState().profile[cont].findIndex((x) => x?.itemId === id), [id, cont]);
    await p.$eval(`[data-testid=slot-backpack-${await idx('chainmail')}]`, (e) => e.click()); await wait();
    await press('[data-testid=sell-tab-stash]'); await wait(400);
    await p.$eval(`[data-testid=slot-stash-${await idx('iron_helm', 'stash')}]`, (e) => e.click()); await wait();
    await p.$eval(`[data-testid=slot-stash-${await idx('bastion_shield', 'stash')}]`, (e) => e.click()); await wait();
    ok(/protegido/i.test(await p.evaluate(() => document.body.innerText)), `${sz}: lo protegido avisa y no se marca`);
    await press('[data-testid=sell-tab-backpack]'); await wait(300);
    await press('[data-testid=filter-sellable]'); await wait(300);
    const filt = await p.$$eval('.slot-filtered', (e) => e.length); ok(filt > 5, `${sz}: «Vendibles» apaga ${filt} casillas sin moverlas`);
    if (phone) { const d = await p.$('[data-testid=vendor-side] button'); if (d) { await d.tap(); await wait(400); } }
    await p.screenshot({ path: out(`valerius-${sz}`) });
    const rows = await p.$$eval('[data-testid=sale-row]', (e) => e.length); ok(rows === 2, `${sz}: 2 marcados entre mochila y almacén (${rows})`);
    const btn = await (await p.$('[data-testid=btn-sell-marked]')).boundingBox(); ok(btn && btn.height >= 44 && btn.y + btn.height <= base.SIZES[sz][1], `${sz}: botón de vender visible (${btn && Math.round(btn.y)})`);
    const g0 = await p.evaluate(() => window.__GRAVEVOW__.getState().profile.gold);
    await press('[data-testid=btn-sell-marked]'); await wait(200);
    ok(!!(await p.$('[data-testid=sale-pop]')), `${sz}: aviso «+N oro»`);
    await p.screenshot({ path: out(`vendido-${sz}`) }); await wait(400);
    ok((await p.evaluate(() => window.__GRAVEVOW__.getState().profile.gold)) > g0, `${sz}: cobra`);
    if (phone) await p.evaluate(() => document.querySelector('[data-testid=vendor-side] button')?.click());
    // Vesper: vender 2 de 6 pociones
    await press('[data-testid=vendor-back]'); await wait(300); await press('[data-testid=vendor-vesper]'); await wait(500); await press('[data-testid=vendor-view-sell]'); await wait(400);
    await p.$eval(`[data-testid=slot-backpack-${await idx('health_potion')}]`, (e) => e.click()); await wait();
    if (phone) { const d = await p.$('[data-testid=vendor-side] button'); if (d) { await d.tap(); await wait(400); } }
    await p.fill('[data-testid=sale-qty-input]', '2'); await wait(200);
    await p.screenshot({ path: out(`cantidad-${sz}`) });
    await press('[data-testid=btn-sell-marked]'); await wait(400);
    const left = await p.evaluate(() => window.__GRAVEVOW__.getState().profile.backpack.find((x) => x?.itemId === 'health_potion')?.qty);
    ok(left === 4, `${sz}: vende 2 y quedan ${left}`);
    if (!phone) { await p.hover(`[data-testid=slot-backpack-${await idx('jerky')}]`); await wait(300); ok(/no lo compra/.test(await p.evaluate(() => document.body.innerText)), `${sz}: la ventanita dice que no lo compra`); await p.screenshot({ path: out(`ficha-${sz}`) }); }
    ok((await p.$$('[data-testid=slot-buyer]')).length === 0, `${sz}: sin iniciales en la venta`);
    ok(!errs.length, `${sz}: sin errores ${errs.join(' | ')}`); await c.close(); }
  await b.close(); })();
