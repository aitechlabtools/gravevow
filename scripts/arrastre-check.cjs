// Prueba de arrastrar y soltar en el Alijo (pointerDrag.tsx) con ratón y con dedo (toques reales por CDP).
// Uso: node scripts/arrastre-check.cjs <url>/play/ <carpeta de capturas>. Comprueba: equipar arrastrando, mover a un hueco,
// pasar al almacén, soltar fuera (vuelve), tocar y luego tocar ranura, y que un gesto rápido con el dedo no arrastra.
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || 'arrastre-shots'; require('fs').mkdirSync(OUT, { recursive: true });
const LOOT = [['knight_sword', 'rare'], ['war_mace', 'common'], ['silver_helm', 'rare'], ['health_potion', null, 4], ['iron_ore', null, 6]];
async function setup(b, vp, touch) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch && vp.height < 500, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const act = async (id) => { const s = `[data-testid=${id}]`; await p.waitForSelector(s, { timeout: 6000 }); touch ? await p.tap(s) : await p.click(s); await p.waitForTimeout(250); };
  await p.goto('' + URL + '?debug&noclass'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(700);
  await act('btn-play'); await p.evaluate(() => document.fullscreenElement && document.exitFullscreen());
  await p.fill('[data-testid=name-input]', 'Beohtord'); await act('btn-create'); 
  await p.evaluate((LOOT) => { const G = window.__GRAVEVOW__; const pr = G.getState().profile; const bp = [...pr.backpack];
    LOOT.forEach(([id, rarity, qty], i) => { bp[i] = { uid: 'bp' + i, itemId: id, qty: qty ?? 1, ...(rarity ? { rarity } : {}) }; });
    G.setState({ profile: { ...pr, backpack: bp, character: { ...pr.character, level: 14 }, tutorialSeen: { ...pr.tutorialSeen, lobby: true, stash: true } } }); }, LOOT);
  await act('tab-stash'); await p.waitForTimeout(400);
  return { ctx, p, errs, act };
}
const center = async (p, sel) => { const r = await (await p.$(sel)).boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
const st = (p) => p.evaluate(() => { const pr = window.__GRAVEVOW__.getState().profile; return { main: pr.equipment.mainHand?.itemId, bp: pr.backpack.slice(0, 8).map((x) => x?.itemId ?? '·').join(' '), stash: pr.stash.slice(0, 4).map((x) => x?.itemId ?? '·').join(' ') }; });

async function touchDrag(p, cdp, a, b, hold = 320, steps = 10, shot) {
  const pt = (x, y) => [{ x, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(a.x, a.y) });
  await p.waitForTimeout(hold);
  for (let i = 1; i <= steps; i++) { const x = a.x + (b.x - a.x) * i / steps, y = a.y + (b.y - a.y) * i / steps; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x, y + 46) }); await p.waitForTimeout(25); }
  if (shot) await p.screenshot({ path: shot });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(350);
}
(async () => {
  const b = await chromium.launch();
  // ── Ordenador: ratón ──
  { const { ctx, p, errs } = await setup(b, { width: 1920, height: 1080 }, false);
    console.log('inicio', await st(p));
    let a = await center(p, '[data-testid=slot-backpack-0]'), m = await center(p, '[data-testid=slot-equip-mainHand]');
    await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(a.x + 20, a.y, { steps: 3 }); await p.mouse.move(m.x, m.y, { steps: 12 });
    await p.screenshot({ path: `${OUT}/raton-arrastre.png` });
    await p.mouse.up(); await p.waitForTimeout(300);
    console.log('ratón: espada → ranura arma', await st(p));
    a = await center(p, '[data-testid=slot-backpack-1]'); const e = await center(p, '[data-testid=slot-backpack-7]');
    await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(e.x, e.y, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(300);
    console.log('ratón: maza → casilla 8 (hueco)', await st(p));
    a = await center(p, '[data-testid=slot-backpack-3]'); const s0 = await center(p, '[data-testid=slot-stash-0]');
    await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(s0.x, s0.y, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(300);
    console.log('ratón: poción → almacén', await st(p));
    a = await center(p, '[data-testid=slot-backpack-2]');
    await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(5, 500, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400);
    console.log('ratón: casco soltado fuera (vuelve)', await st(p));
    // tocar y luego tocar: casco elegido → ranura cabeza vacía; luego maza elegida → ranura arma ocupada
    await p.click('[data-testid=slot-backpack-2]'); await p.waitForTimeout(200); await p.mouse.move(5, 500); await p.screenshot({ path: `${OUT}/raton-elegido.png` });
    await p.click('[data-testid=slot-equip-helmet]'); await p.waitForTimeout(250);
    await p.click('[data-testid=slot-backpack-7]'); await p.click('[data-testid=slot-equip-mainHand]'); await p.waitForTimeout(250);
    console.log('clic y clic: casco → cabeza, maza → arma', await st(p), errs.length ? errs : 'sin errores');
    await ctx.close(); }
  // ── Móvil: dedo ──
  { const { ctx, p, errs, act } = await setup(b, { width: 844, height: 390 }, true);
    const cdp = await ctx.newCDPSession(p);
    let a = await center(p, '[data-testid=slot-backpack-0]'), m = await center(p, '[data-testid=slot-equip-mainHand]');
    await touchDrag(p, cdp, a, m, 320, 10, `${OUT}/dedo-arrastre.png`);
    console.log('dedo: espada → arma', await st(p));
    // desplazamiento rápido sin mantener: no debe arrastrar
    a = await center(p, '[data-testid=slot-backpack-1]'); const e = await center(p, '[data-testid=slot-backpack-7]');
    await touchDrag(p, cdp, a, e, 30, 6);
    console.log('dedo rápido (desplazamiento, no mueve)', await st(p));
    await touchDrag(p, cdp, a, e, 320, 10);
    console.log('dedo: maza → casilla 8', await st(p));
    // mantener pulsado sin mover: no hace la acción de clic derecho
    a = await center(p, '[data-testid=slot-backpack-2]');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y, id: 1 }] }); await p.waitForTimeout(900);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(300);
    console.log('dedo: mantener sin mover (no mueve)', await st(p), errs.length ? errs : 'sin errores');
    await ctx.close(); }
  await b.close();
})();
