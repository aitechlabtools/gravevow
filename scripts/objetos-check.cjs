// Prueba del manejo de objetos: comparación con lo puesto, ▲ de mejora, Guardar materiales, Vaciar mochila (con confirmación),
// venta de varios marcados con total y recompra. Uso: node scripts/objetos-check.cjs <url>/play/ <carpeta>
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || 'objetos-shots'; require('fs').mkdirSync(OUT, { recursive: true });
// Fase 6: cada objeto con su casilla (los grandes tapan las de al lado)
const AT = [0, 3, 6, 8, 9, 10, 18];
// Casillas que tapa cada objeto grande (relativas a su ancla, mochila de 6 columnas)
const COV = { 0: [1, 2], 1: [1, 2], 2: [1, 6, 7], 6: [1, 2] };
const LOOT = [['knight_sword', 'rare'], ['war_mace', 'common'], ['iron_shield', 'common'], ['health_potion', null, 4], ['iron_ore', null, 6], ['bone_dust', null, 5], ['chain_axe', 'epic']];
(async () => {
  const b = await chromium.launch();
  for (const [n, vp, touch, dsf] of [['escritorio', { width: 1920, height: 1080 }, false, 1], ['tableta', { width: 1180, height: 820 }, true, 1], ['movil', { width: 844, height: 390 }, true, 2]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: n === 'movil', deviceScaleFactor: dsf });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const act = async (id) => { const s = `[data-testid=${id}]`; await p.waitForSelector(s, { timeout: 6000 }); touch ? await p.tap(s) : await p.click(s); await p.waitForTimeout(300); };
    await p.goto(URL + '?debug&noclass'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(700);
    await act('btn-play'); await p.evaluate(() => document.fullscreenElement && document.exitFullscreen());
    await p.fill('[data-testid=name-input]', 'Beohtord'); await act('btn-create'); 
    await p.evaluate(([LOOT, AT, COV]) => { const G = window.__GRAVEVOW__; const pr = G.getState().profile; const bp = [...pr.backpack];
      const bp0 = bp.map(() => null); bp.splice(0, bp.length, ...bp0); LOOT.forEach(([id, rarity, qty], i) => { bp[AT[i]] = { uid: 'bp' + i, itemId: id, qty: qty ?? 1, ...(rarity ? { rarity } : {}) }; for (const d of COV[i] ?? []) bp[AT[i] + d] = { uid: 'cover:' + 'bp' + i, itemId: 'cover', qty: 1 }; });
      G.setState({ profile: { ...pr, backpack: bp, character: { ...pr.character, level: 14 }, tutorialSeen: { ...pr.tutorialSeen, lobby: true, stash: true, vendors: true } } }); }, [LOOT, AT, COV]);
    const st = () => p.evaluate(() => { const pr = window.__GRAVEVOW__.getState().profile; return { gold: pr.gold, bp: pr.backpack.filter(Boolean).map((x) => x.itemId).join(','), stash: pr.stash.filter(Boolean).map((x) => x.itemId).join(',') }; });
    await act('tab-stash');
    const ups = await p.$$eval('[data-testid=slot-upgrade]', (e) => e.length);
    await act('slot-backpack-0'); if (!touch) await p.mouse.move(5, 600); await p.waitForTimeout(300);
    const cmp = await p.$eval('[data-testid=item-card-compare]', (e) => e.textContent).catch(() => 'sin comparación');
    await p.screenshot({ path: `${OUT}/${n}-1-comparar.png` });
    console.log(n, '| ▲ en casillas:', ups, '|', cmp);
    if (n === 'movil') await act('slot-backpack-0');
    await act('store-materials'); console.log('  guardar materiales →', await st());
    await act('empty-backpack'); await p.waitForTimeout(300);
    const conf = await p.$('[data-testid=confirm-empty]'); if (conf) { await p.screenshot({ path: `${OUT}/${n}-2-confirmar-vaciar.png` }); await act('btn-confirm-empty'); }
    console.log('  vaciar mochila (confirmó:', !!conf, ') →', await st());
    // venta: devolver cosas a la mochila y marcar
    await p.evaluate(([LOOT, AT, COV]) => { const G = window.__GRAVEVOW__; const pr = G.getState().profile; const bp = [...pr.backpack];
      const bp0 = bp.map(() => null); bp.splice(0, bp.length, ...bp0); LOOT.forEach(([id, rarity, qty], i) => { bp[AT[i]] = { uid: 'v' + i, itemId: id, qty: qty ?? 1, ...(rarity ? { rarity } : {}) }; for (const d of COV[i] ?? []) bp[AT[i] + d] = { uid: 'cover:' + 'v' + i, itemId: 'cover', qty: 1 }; });
      G.setState({ profile: { ...pr, backpack: bp } }); }, [LOOT, AT, COV]);
    await act('tab-merchants'); await act('btn-merchants'); await act('vendor-nira'); await act('vendor-view-sell');
    for (const i of [3, 6]) await act(`slot-backpack-${i}`);
    await act('mark-materials');
    if (n === 'movil') { await act('vendor-side').catch(() => {}); }
    await p.waitForTimeout(300);
    const total = await p.$eval('[data-testid=sale-total]', (e) => e.textContent).catch(() => '?');
    await p.screenshot({ path: `${OUT}/${n}-3-venta.png` });
    const g0 = (await st()).gold;
    const btn = await p.$('[data-testid=btn-sell-marked]'); touch ? await btn.tap() : await btn.click(); await p.waitForTimeout(300);
    const conf2 = await p.$('[data-testid=confirm-sell]'); if (conf2) await act('btn-confirm-sell');
    const s1 = await st();
    console.log('  venta marcado total', total, '| oro', g0, '→', s1.gold, '| mochila', s1.bp);
    const bb = await p.$('[data-testid=buyback-0]');
    if (bb) { touch ? await bb.tap() : await bb.click(); await p.waitForTimeout(300); console.log('  recompra →', await st()); }
    await p.screenshot({ path: `${OUT}/${n}-4-recompra.png` });
    console.log(' ', errs.length ? errs : 'sin errores');
    await ctx.close();
  }
  await b.close();
})();
