// Bloque 2, fase 4: materias nuevas en las tiendas, planos en Brand con reputación (comprar = aprender) y resumen.
// Uso: node scripts/fuentes-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { leaveSummary, summaryPage } = require('./lib/summary.cjs');
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'fuentes', dev] = process.argv;
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

  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); 
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
    pr.tutorialSeen.dungeon = true; pr.tutorialDone = true;
    g.setState({ profile: { ...pr, character: { ...pr.character, level: 12 }, gold: 5000, reputation: { ...pr.reputation, brand: 400 } } }); });
  await tap('[data-testid=tab-merchants]'); // Garth vende harina; Nira, madera
  await p.waitForSelector('[data-testid=vendor-garth]'); await tap('[data-testid=vendor-garth]');
  await p.waitForSelector('[data-testid=buy-flour]'); await small('[data-testid=buy-flour]', 'Comprar harina');
  await tap('[data-testid=buy-flour]'); await p.waitForTimeout(150);
  await tap('[data-testid=vendor-back]');
  await tap('[data-testid=vendor-nira]'); await p.waitForSelector('[data-testid=buy-old_wood]');
  await tap('[data-testid=buy-old_wood]'); await p.waitForTimeout(150);
  const has = await G(() => { const pr = window.__GRAVEVOW__.getState().profile; const all = [...pr.backpack, ...pr.stash]; return ['flour', 'old_wood'].map((id) => all.some((x) => x && x.itemId === id)); });
  if (!has[0] || !has[1]) fail('no se compraron harina y madera: ' + has);
  await tap('[data-testid=vendor-back]');

  // Brand: plano raro con reputación «De confianza»; comprarlo lo aprende
  await tap('[data-testid=vendor-brand]'); await p.waitForSelector('[data-testid=buy-bp_tempered_sword]');
  await p.$eval('[data-testid=buy-bp_tempered_sword]', (e) => e.scrollIntoView({ block: 'center' }));
  await small('[data-testid=buy-bp_tempered_sword]', 'Comprar plano');
  await wide('Tienda de Brand');
  await p.screenshot({ path: out + '-brand.png' });
  await tap('[data-testid=buy-bp_tempered_sword]'); await p.waitForTimeout(150);
  const st = await G(() => { const pr = window.__GRAVEVOW__.getState().profile; return { known: (pr.blueprints || []).includes('bp_tempered_sword'), left: [...pr.backpack, ...pr.stash].some((x) => x && x.itemId === 'bp_tempered_sword') }; });
  if (!st.known || st.left) fail('el plano comprado no se aprendió: ' + JSON.stringify(st));
  await tap('[data-testid=vendor-back]');

  // Resumen: un plano traído de abajo se aprende al volver
  await G(() => { const g = window.__GRAVEVOW__, s = g.getState(); g.setState({ summary: { reason: 'extracted', durationMs: 60000, goldGained: 0, goldLost: 0, xpGained: 0, levelsGained: 0, kills: {}, kept: [], lost: [], found: [], extractedValue: 0, blueprintsLearned: ['bp_knight_helm'] }, screen: 'summary' }); });
  await summaryPage(p, 2);
  await p.waitForSelector('[data-testid=blueprints-note]');
  if (!/Yelmo del caballero/.test(await p.textContent('[data-testid=blueprints-note]'))) fail('el resumen no nombra el plano');
  await wide('Resumen');
  await p.screenshot({ path: out + '-resumen.png' });
  console.log(dev || 'escritorio', 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
