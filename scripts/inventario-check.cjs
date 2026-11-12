// Fase 6: inventario espacial y peso. Tamaños (espada 3×1), girar con el botón, colocar tocando (sin arrastrar),
// arrastre con vista previa del hueco, barra de carga, límite del 150 % y aviso de sobrecarga en la mazmorra.
// Uso: node scripts/inventario-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'inventario', dev] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  const fail = (m) => { console.log('FALLO:', m); process.exitCode = 1; };
  const G = (fn, arg) => p.evaluate(fn, arg);
  const box = async (sel) => (await p.$(sel))?.boundingBox();
  const bp = () => G(() => window.__GRAVEVOW__.getState().profile.backpack.map((x) => x && (x.itemId === 'cover' ? 'c' : x.itemId + (x.rot ? '@r' : ''))));
  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); 
  // Mochila de prueba: una espada (3×1) arriba a la izquierda y nada más
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; const bpk = pr.backpack.map(() => null);
    bpk[0] = { uid: 'sw', itemId: 'iron_sword', qty: 1 }; bpk[1] = { uid: 'cover:sw', itemId: 'cover', qty: 1 }; bpk[2] = { uid: 'cover:sw', itemId: 'cover', qty: 1 };
    pr.tutorialSeen.dungeon = true; g.setState({ profile: { ...pr, backpack: bpk } }); });
  await tap('[data-testid=tab-stash]');
  if (await p.$('[data-testid=seg-gear]')) await tap('[data-testid=seg-gear]');
  await p.waitForSelector('[data-testid=carry-bar]');
  const sb = await box('[data-testid=slot-backpack-0]'), one = await box('[data-testid=slot-backpack-3]');
  if (!sb || !one || sb.width < one.width * 2.5) fail('la espada no ocupa 3 casillas: ' + JSON.stringify({ sb, one }));
  // Girar con el botón (el objeto elegido)
  await tap('[data-testid=slot-backpack-0]');
  await p.waitForSelector('[data-testid=act-rotate]');
  const rb = await box('[data-testid=act-rotate]');
  if (dev && (!rb || rb.height < 44)) fail('botón Girar menor de 44 px: ' + JSON.stringify(rb));
  await tap('[data-testid=act-rotate]'); await p.waitForTimeout(150);
  let g = await bp();
  if (g[0] !== 'iron_sword@r' || g[6] !== 'c' || g[12] !== 'c' || g[1] !== null) fail('girar no dejó la espada de pie: ' + JSON.stringify(g.slice(0, 18)));
  await p.screenshot({ path: out + '-1.png' });
  // A17: girar contra un objeto no cambia nada
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; const bpk = pr.backpack.slice(); bpk[1] = { uid: 'pot', itemId: 'health_potion', qty: 1 }; g.setState({ profile: { ...pr, backpack: bpk } }); });
  if (await p.$('[data-testid=act-rotate]')) { await tap('[data-testid=act-rotate]'); await p.waitForTimeout(150); }
  else { await tap('[data-testid=slot-backpack-0]'); await tap('[data-testid=act-rotate]'); await p.waitForTimeout(150); }
  g = await bp();
  if (g[0] !== 'iron_sword@r' || g[1] !== 'health_potion') fail('girar contra un objeto cambió algo: ' + JSON.stringify(g.slice(0, 18)));
  // Colocar tocando (alternativa al arrastre): elegir la espada y tocar una casilla vacía
  await p.keyboard.press('Escape').catch(() => {});
  const cur = await G(() => !!document.querySelector('[data-testid=slot-backpack-0].selected'));
  if (!cur) await tap('[data-testid=slot-backpack-0]');
  await tap('[data-testid=slot-backpack-4]'); await p.waitForTimeout(150);
  g = await bp();
  if (g[4] !== 'iron_sword@r' || g[10] !== 'c' || g[16] !== 'c' || g[0] !== null) fail('tocar una casilla no colocó la espada: ' + JSON.stringify(g.slice(0, 18)));
  // Arrastre con ratón: vista previa del hueco antes de soltar
  if (!dev) {
    const s4 = await box('[data-testid=slot-backpack-4]'), s2 = await box('[data-testid=slot-backpack-2]');
    await p.mouse.move(s4.x + s4.width / 2, s4.y + 10); await p.mouse.down(); await p.mouse.move(s2.x + 10, s2.y + 10, { steps: 6 });
    const prev = await G(() => [...document.querySelectorAll('.slot.fit-ok, .slot.fit-bad')].map((e) => e.className.includes('fit-ok') ? 'ok' : 'bad'));
    if (!prev.length || prev.some((x) => x !== 'ok')) fail('no se ve el hueco al arrastrar: ' + JSON.stringify(prev));
    await p.screenshot({ path: out + '-arrastre.png' });
    await p.mouse.up(); await p.waitForTimeout(200);
    g = await bp();
    if (g[2] !== 'iron_sword@r') fail('el arrastre no movió la espada: ' + JSON.stringify(g.slice(0, 18)));
  }
  // Peso: la barra cuenta lo que llevas; por encima del 150 % no se puede coger más (A21)
  const w0 = await G(() => document.querySelector('[data-testid=carry-weight]').textContent);
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; const bpk = pr.backpack.map(() => null); const st = pr.stash.slice();
    // 3 cotas de malla (12 cada una) y una espada, más lo puesto: por encima del 120 % para el Guerrero (40)
    [0, 2, 4].forEach((k, n) => { bpk[k] = { uid: 'cm' + n, itemId: 'chainmail', qty: 1 }; for (const d of [1, 6, 7, 12, 13].map((x) => k + x)) bpk[d] = { uid: 'cover:cm' + n, itemId: 'cover', qty: 1 }; });
    [18].forEach((k, n) => { bpk[k] = { uid: 'sw' + n, itemId: 'iron_sword', qty: 1 }; bpk[k + 1] = bpk[k + 2] = { uid: 'cover:sw' + n, itemId: 'cover', qty: 1 }; });
    // Hay casillas libres (21–23) y la cota puesta deja la carga por encima del 150 %: lo que impide coger la espada es el peso
    st[40] = { uid: 'axe', itemId: 'iron_sword', qty: 1 }; st[41] = st[42] = { uid: 'cover:axe', itemId: 'cover', qty: 1 };
    g.setState({ profile: { ...pr, backpack: bpk, stash: st, equipment: { ...pr.equipment, armor: { uid: 'cm9', itemId: 'chainmail', qty: 1 } } } }); });
  await p.waitForTimeout(150);
  const tier = await G(() => document.querySelector('[data-testid=carry-bar]').dataset.tier);
  if (tier !== '2') fail('la barra no marca sobrecarga: tramo ' + tier + ' (antes ' + w0 + ')');
  await p.screenshot({ path: out + '-peso.png' });
  const moved = await G(() => { const g = window.__GRAVEVOW__; g.actions.quickMove({ kind: 'grid', container: 'stash', index: 40 }, 'backpack'); return g.getState().profile.stash[40]?.uid; });
  if (moved !== 'axe') fail('se pudo coger algo por encima del 150 %');
  if (!(await p.textContent('body')).includes('Demasiado peso')) fail('no avisa del exceso de peso');
  // En la mazmorra: aviso de sobrecarga en el HUD y paso más corto
  await tap('[data-testid=tab-play]'); await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1200);
  if (!(await p.$('[data-testid=hud-overload]'))) fail('no hay aviso de sobrecarga en el HUD');
  await p.screenshot({ path: out + '-hud.png' });
  console.log(dev || 'escritorio', JSON.stringify({ peso: w0, tramo: tier }), 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
