// Resultado real: node mockups/combate-heridas-barras/real.cjs [url]
const { chromium } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5174/play/';
const SIZES = { movil: [844, 390, true], tableta: [1180, 820, true], escritorio: [1920, 1080, false] };
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
  for (const [sz, [w, h, touch]] of Object.entries(SIZES)) for (const two of [true, false]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: sz === 'movil' }); const p = await c.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(URL + '?debug'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(700);
    const press = (sel) => touch ? p.tap(sel) : p.click(sel);
    await press('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Pau'); await press('[data-testid=btn-create]');
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialDone = true; for (const k of Object.keys(pr.tutorialSeen || {})) pr.tutorialSeen[k] = true; g.setState({ tutorial: null, profile: { ...pr } }); });
    await press('[data-testid=tab-play]'); await press('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(2000);
    await p.evaluate((two) => { const G = window.__GRAVEVOW__, s = G.getState(), e = s.expedition, b = structuredClone(e.body);
      b.parts.armL.hp = 1; b.parts.armL.fracture = true; b.parts.legR.bleed = 2; b.parts.legR.hp = Math.floor(b.parts.legR.hp * 0.5); b.parts.thorax.hp = Math.floor(b.parts.thorax.hp * 0.6); b.parts.abdomen.bleed = 1;
      G.setState({ expedition: { ...e, body: b }, ...(two ? { rival: { ...s.rival, who: s.rival.who || 'kael', disposition: 'allied', hp: 60, potions: 1 } } : {}) });
      G.actions.startCombat('pve', 'e1', 'skeleton', two ? { entityId: 'e2', enemyId: 'skeleton' } : undefined); }, two);
    await p.waitForTimeout(2800);
    // Estados e intención de muestra: veneno y golpe pesado en el primero, congelación en el segundo, sangrado en ti
    await p.evaluate(() => { const G = window.__GRAVEVOW__, s = G.getState(), cs = s.combat.state;
      const cb = cs.combatants.map((x) => x.id === 'e1' ? { ...x, statuses: [{ id: 'poison', turns: 3 }], intent: { move: 'heavy_blow', targetId: 'player', wait: 1, breaks: 0 } }
        : x.id === 'e2' ? { ...x, statuses: [{ id: 'freeze', turns: 2 }] } : x.control === 'player' ? { ...x, statuses: [{ id: 'bleed', turns: 2 }] } : x);
      G.setState({ combat: { ...s.combat, state: { ...cs, combatants: cb } } }); });
    await p.waitForTimeout(300);
    const tag = `${sz}-${two ? '2v2' : '1v1'}`;
    await p.screenshot({ path: path.join(__dirname, `real-${tag}.png`) });
    // Solapes: fichas entre sí, con los sprites y con la barra
    const r = await p.evaluate(() => { const q = (s) => [...document.querySelectorAll(s)].map((e) => e.getBoundingClientRect());
      const cards = q('.cb-card'), sprites = q('[data-testid^=fighter-] img'), bar = document.querySelector('.combat-bar').getBoundingClientRect();
      const hit = (a, b) => a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2;
      let cs = 0, cc = 0; for (const a of cards) { if (hit(a, bar)) cc++; for (const s of sprites) if (hit(a, s)) cs++; }
      const btn = document.querySelector('[data-testid=combat-body]').getBoundingClientRect();
      const small = [...document.querySelectorAll('.cb-card, .combat-bar')].flatMap((e) => [...e.querySelectorAll('*')]).filter((e) => !e.classList.contains('cur') && e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12 && e.offsetParent).length;
      return { cs, cc, btn: [btn.width, btn.height], small }; });
    ok(r.cc === 0, `${tag}: ninguna ficha pisa la barra`); ok(r.cs === 0, `${tag}: ninguna ficha tapa un personaje (${r.cs})`);
    ok(r.btn[0] >= 44 && r.btn[1] >= 44, `${tag}: esqueleto pulsable ${r.btn.map(Math.round).join('×')}`); ok(r.small === 0, `${tag}: sin textos de menos de 12 px (${r.small})`);
    if (!two) { // Menú de heridas desde el esqueleto y vuelta al combate igual
      const before = await p.evaluate(() => JSON.stringify(window.__GRAVEVOW__.getState().combat.state.turnIndex));
      await (touch ? p.tap('[data-testid=combat-body]') : p.click('[data-testid=combat-body]'));
      await p.waitForSelector('[data-testid=combat-body-modal]'); await p.waitForTimeout(300); await p.screenshot({ path: path.join(__dirname, `real-menu-esqueleto-${sz}.png`) });
      await press('[data-testid=combat-body-close]'); await p.waitForTimeout(200);
      const after = await p.evaluate(() => JSON.stringify(window.__GRAVEVOW__.getState().combat.state.turnIndex));
      ok(before === after && !(await p.$('[data-testid=combat-body-modal]')), `${tag}: abrir y cerrar el menú no gasta el turno`);
      // Parpadeo: una herida nueva en el brazo derecho
      await p.evaluate(() => { const G = window.__GRAVEVOW__, s = G.getState(), cs = s.combat.state; const pl = cs.combatants.find((x) => x.control === 'player');
        const body = structuredClone(pl.body); body.parts.armR.bleed = 1; body.parts.armR.hp -= 3;
        G.setState({ combat: { ...s.combat, state: { ...cs, combatants: cs.combatants.map((x) => x === pl ? { ...x, body } : x) } } }); });
      await p.waitForTimeout(80); ok(!!(await p.$('[data-testid=combat-body] .body-flash')), `${tag}: la zona herida parpadea`);
      await p.screenshot({ path: path.join(__dirname, `real-parpadeo-${sz}.png`) });
    }
    ok(!errs.length, `${tag}: sin errores ${errs.join(' | ')}`); await c.close(); }
  await b.close(); })();
