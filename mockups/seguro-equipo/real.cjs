// Seguro por bajada, resultado real: node mockups/seguro-equipo/real.cjs [url]
const { chromium } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5174/play/';
const SIZES = { escritorio: [1920, 1080, false], tableta: [1180, 820, true], movil: [844, 390, true] };
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
const shot = (p, n) => p.screenshot({ path: path.join(__dirname, `real-${n}.png`) });
(async () => { const b = await chromium.launch();
  for (const [sz, [w, h, touch]] of Object.entries(SIZES)) {
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: sz === 'movil' }); const p = await c.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const press = (s) => (touch ? p.tap(s) : p.click(s)); const wait = (ms = 400) => p.waitForTimeout(ms);
    await p.goto(URL + '?debug'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await wait(700);
    await press('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Pau'); await press('[data-testid=btn-create]');
    await p.evaluate(() => { const g = window.__GRAVEVOW__, s = g.getState(), pr = structuredClone(s.profile); pr.tutorialDone = true; for (const k of Object.keys(pr.tutorialSeen || {})) pr.tutorialSeen[k] = true;
      const it = (itemId, extra = {}) => ({ uid: 'u_' + itemId, itemId, qty: 1, ...extra });
      pr.stats.expeditions = 3; pr.refuge = { cot: 1, kitchen: 0, bench: 0, infirmary: 0, forge: 1, alchemy: 0, tannery: 0, armory: 1, v: 3 };
      pr.equipment = { ...pr.equipment, mainHand: it('ash_wand', { rarity: 'rare', affixes: ['vampire'] }), helmet: it('belzar_broken_crown'), boots: it('courtyard_boots'), ring: it('ring_of_embers'), armor: it('chainmail') };
      // Oro en el almacén y la Guía con todo visto salvo el seguro
      const t = s.tutorials ? { ...s.tutorials, seen: (s.tutorials.seen || []).filter((x) => x !== 'insure.first') } : s.tutorials;
      g.setState({ tutorial: null, profile: pr, tutorials: t }); });
    await p.evaluate(() => { const D = window.__GRAVEVOW__; D.dev?.setGold ? D.dev.setGold(64) : null; });
    await p.evaluate(() => { const G = window.__GRAVEVOW__, pr = G.getState().profile; const st = pr.stash.slice(); const i = st.findIndex((x) => !x); st[i] = { uid: 'gold', itemId: 'gold_coins', qty: 64 }; G.setState({ profile: { ...pr, stash: st, gold: 64 + (pr.gold || 0) } }); });
    await wait(300);
    // 1 · «Descender» abre la ventana del seguro
    await press('[data-testid=tab-play]'); await wait();
    await p.evaluate(() => { const G = window.__GRAVEVOW__; G.dev.skipMinis = false; G.setState({ miniQueue: [] }); });
    await press('[data-testid=btn-enter-dungeon]'); await wait(900);
    ok(!!(await p.$('[data-mini="insure.first"]')), `${sz}: sale el mini tutorial del seguro`);
    ok(!!(await p.$('[data-testid=insure-modal]')), `${sz}: «Descender» pregunta por el seguro`);
    await shot(p, `tutorial-${sz}`);
    // Cierra el mini tutorial si sale
    for (let i = 0; i < 4; i++) { const b2 = await p.$('[data-testid=mini-ok]'); if (!b2) break; await b2.click(); await wait(300); }
    await p.evaluate(() => { window.__GRAVEVOW__.dev.skipMinis = true; });
    await shot(p, `descender-${sz}`);
    const amulet = await p.$('[data-testid=insure-amulet]');
    ok(!!amulet && (await amulet.isDisabled()), `${sz}: ranura vacía apagada`);
    const box = await (await p.$('[data-testid=insure-mainHand]')).boundingBox();
    ok(box.width >= 44 && box.height >= 44, `${sz}: casilla de ${Math.round(box.width)}×${Math.round(box.height)}`);
    const md = await (await p.$('[data-testid=insure-modal] .panel')).boundingBox();
    ok(md.height <= h && md.width <= w, `${sz}: la ventana cabe (${Math.round(md.width)}×${Math.round(md.height)})`);
    // Quita las botas y baja asegurado
    const total0 = await p.textContent('[data-testid=insure-total]');
    const bootsOn = await p.getAttribute('[data-testid=insure-boots]', 'aria-pressed');
    if (bootsOn === 'true') await press('[data-testid=insure-boots]');
    await wait(200);
    const marked = (await p.$$('[data-testid=insure-modal] .ins-slot[aria-pressed=true]')).length;
    const gold0 = await p.evaluate(() => window.__GRAVEVOW__.getState().profile.gold);
    await press('[data-testid=insure-go]'); await wait(2500);
    const st = await p.evaluate(() => { const s = window.__GRAVEVOW__.getState(); return { ins: s.expedition?.insured ?? [], gold: s.profile.gold }; });
    ok(st.ins.length === marked && marked > 0, `${sz}: baja con las ${marked} piezas marcadas (${st.ins.length}); sin las botas`);
    ok(st.gold < gold0, `${sz}: se cobra (${gold0} → ${st.gold})`);
    // 2 · Sello en el inventario
    await p.evaluate(() => window.__GRAVEVOW__.actions.openModal({ type: 'inventory' })); await wait(700);
    ok((await p.$$('[data-testid=equipment] [data-testid=seal]')).length === marked, `${sz}: ${marked} sellos en el equipo`);
    await shot(p, `sellos-${sz}`);
    // 3 · Morir
    await p.evaluate(() => { const G = window.__GRAVEVOW__; G.setState({ modal: null }); G.actions.finishExpedition('died'); }); await wait(1500);
    ok(!!(await p.$('[data-testid=summary-reforged]')), `${sz}: el resumen avisa de las piezas reforjadas`);
    await shot(p, `resumen-${sz}`);
    ok((await p.evaluate(() => window.__GRAVEVOW__.getState().profile.reforged?.length)) === marked, `${sz}: ${marked} pendientes`);
    // 4 · Bastión: aviso y marca
    await p.evaluate(() => window.__GRAVEVOW__.actions.backToLobby()); await wait(600);
    await press('[data-testid=tab-merchants]'); await wait(600);
    ok(!!(await p.$('[data-testid=vendor-pending-valerius] [data-testid=seal]')), `${sz}: Valerius lleva la marca`);
    await shot(p, `bastion-${sz}`);
    // 5 · Recogida
    await press('[data-testid=vendor-valerius]'); await wait(600);
    ok(!!(await p.$('[data-testid=reforged-list]')), `${sz}: Valerius abre en «Seguro» con las piezas`);
    await shot(p, `recogida-${sz}`);
    await press('[data-testid=reforged-all]'); await wait(400);
    const left = await p.evaluate(() => window.__GRAVEVOW__.getState().profile.reforged.filter((r) => true).length);
    ok(left === 0, `${sz}: recoge todo en Valerius`);
    await shot(p, `seguro-tab-${sz}`);
    ok(!errs.length, `${sz}: sin errores ${errs.join(' | ')}`); await c.close(); }
  await b.close(); })();
