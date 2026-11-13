// Fase 7: exploración. Sala secreta (examinar las marcas), sala cerrada (sin llave no abre; con llave, la gasta),
// trampa (se desarma quieto; la que salta no se rearma), altar (beneficio y precio antes de aceptar; solo un pacto) y atajo (solo desde dentro).
// Uso: node scripts/exploracion-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { leaveSummary, summaryPage } = require('./lib/summary.cjs');
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'exploracion', dev] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  const fail = (m) => { console.log('FALLO:', m); process.exitCode = 1; };
  const G = (fn, arg) => p.evaluate(fn, arg);
  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); 
  await G(() => { const s = window.__GRAVEVOW__.getState(); const pr = s.profile; pr.character.level = 22; pr.tutorialSeen.dungeon = true; pr.tutorialDone = true; pr.stats.expeditions = 3; });
  // Calabozos (S3): secreto, sala con llave, altar y quizá atajo. Se repite hasta tener secreto, sala cerrada y altar.
  let kinds = null;
  for (let k = 0; k < 14; k++) {
    await G(async () => { await window.__GRAVEVOW__.actions.enterDungeon('calabozos'); });
    await p.waitForTimeout(1200);
    kinds = await G(() => { const d = window.__GRAVEVOW__.getState().dungeon; const doors = d.entities.filter((e) => e.kind === 'door' && e.lock).map((e) => e.lock.type); return { doors, altar: d.entities.some((e) => e.kind === 'altar') }; });
    // Se prefiere un mapa con atajo (sale en uno de cada tres o cuatro); si no aparece, vale sin él
    if (kinds.doors.includes('secret') && kinds.doors.includes('key') && kinds.altar && (kinds.doors.includes('gate') || k >= 10)) break;
    await G(() => window.__GRAVEVOW__.actions.finishExpedition('extracted')); await p.waitForTimeout(400);
    if (await p.$('[data-testid=summary]')) await leaveSummary(p);
  }
  if (!kinds.doors.includes('secret')) fail('el mapa no tiene sala secreta: ' + JSON.stringify(kinds));
  // Sin enemigos ni errante, para que nada interrumpa
  await G(() => { const sc = window.__GRAVEVOW__.scene(); sc.enemies.forEach((e) => { e.dead = true; e.sprite.setVisible(false); }); if (sc.rival) { sc.rival.gone = true; sc.rival.sprite.setVisible(false); } });
  // Junto a un acceso, en el lado de fuera (o en el bueno, en el atajo): devuelve las etiquetas de lo que se puede hacer ahí
  const near = (type, sideOk = true) => G(([type, sideOk]) => {
    const sc = window.__GRAVEVOW__.scene(); const d = sc.def;
    const door = d.entities.find((e) => e.kind === 'door' && e.lock && e.lock.type === type);
    const opt = d.rooms.filter((r) => r.id.startsWith('opt_'));
    const inOpt = (x, y) => opt.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    let spot = null;
    if (type === 'gate') { const [sx, sy] = door.lock.side; spot = sideOk ? [door.x + sx, door.y + sy] : [door.x - sx, door.y - sy]; }
    else spot = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [door.x + dx, door.y + dy]).find(([x, y]) => sc.walkableTile(x, y) && !inOpt(x, y));
    sc.debugTeleport(spot[0], spot[1]);
    return { door: [door.x, door.y], labels: sc.interactables().map((i) => i.label) };
  }, [type, sideOk]);
  const run = (prefix) => G((prefix) => { const sc = window.__GRAVEVOW__.scene(); const it = sc.interactables().find((i) => i.label.startsWith(prefix)); if (it) it.run(); return !!it; }, prefix);
  // En el navegador sin pantalla los fotogramas van más lentos que el reloj: se espera a que la tarea acabe
  const waitChannel = async () => { await p.waitForTimeout(200); for (let k = 0; k < 100 && (await G(() => window.__GRAVEVOW__.scene().channel >= 0)); k++) await p.waitForTimeout(200); };
  const isOpen = ([x, y]) => G(([x, y]) => window.__GRAVEVOW__.scene().walkableTile(x, y), [x, y]);

  // 1 · Sala secreta: examinar las marcas abre el paso (quieto un momento)
  let n = await near('secret'); await p.waitForTimeout(300);
  await p.screenshot({ path: out + '-secreto.png' });
  if (!n.labels.some((l) => l.startsWith('Examinar las marcas'))) fail('no se puede examinar el muro: ' + JSON.stringify(n.labels));
  await run('Examinar las marcas'); await waitChannel();
  if (!(await isOpen(n.door))) fail('examinar las marcas no abrió el pasaje');

  // 2 · Sala cerrada: sin llave no se abre; con llave se abre y la gasta
  if (kinds.doors.includes('key')) {
    n = await near('key');
    if (!n.labels.some((l) => l.startsWith('Cerrada: necesitas'))) fail('la puerta cerrada no pide llave: ' + JSON.stringify(n.labels));
    await run('Cerrada'); await p.waitForTimeout(200);
    if (await isOpen(n.door)) fail('se abrió sin llave');
    await G(() => window.__GRAVEVOW__.dev.give('iron_key'));
    const k0 = await G(() => window.__GRAVEVOW__.getState().expedition.backpack.filter((x) => x && x.itemId === 'iron_key').reduce((a, x) => a + x.qty, 0));
    await run('Abrir'); await p.waitForTimeout(500);
    const k1 = await G(() => window.__GRAVEVOW__.getState().expedition.backpack.filter((x) => x && x.itemId === 'iron_key').reduce((a, x) => a + x.qty, 0));
    if (!(await isOpen(n.door)) || k1 !== k0 - 1) fail('la llave no abrió la sala o no se gastó: ' + JSON.stringify({ k0, k1 }));
    await p.screenshot({ path: out + '-llave.png' });
  }

  // 3 · Trampas: una se desarma; otra salta una sola vez
  const traps = await G(() => window.__GRAVEVOW__.scene().traps.map((t) => [t.x, t.y]));
  if (traps.length < 2) fail('faltan trampas: ' + traps.length);
  const stepNext = ([x, y]) => G(([x, y]) => { const sc = window.__GRAVEVOW__.scene(); const s = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).find(([a, c]) => sc.walkableTile(a, c)); sc.debugTeleport(s[0], s[1]); }, [x, y]);
  await stepNext(traps[0]); await p.waitForTimeout(200);
  if (!(await run('Desarmar la trampa'))) fail('no se ofrece desarmar la trampa');
  await waitChannel();
  const hp0 = await G(() => window.__GRAVEVOW__.getState().expedition.hp);
  await G(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x, y), traps[0]); await p.waitForTimeout(400);
  const hp1 = await G(() => window.__GRAVEVOW__.getState().expedition.hp);
  if (hp0 - hp1 > 2) fail('la trampa desarmada hizo daño: ' + hp0 + ' → ' + hp1);
  if ((await G(() => window.__GRAVEVOW__.scene().traps[0].state)) !== 'disarmed') fail('la trampa no quedó desarmada');
  await G(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x, y), traps[1]); await p.waitForTimeout(400);
  const hp2 = await G(() => window.__GRAVEVOW__.getState().expedition.hp);
  await stepNext(traps[1]); await p.waitForTimeout(300);
  await G(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x, y), traps[1]); await p.waitForTimeout(400);
  const hp3 = await G(() => window.__GRAVEVOW__.getState().expedition.hp);
  if (!(hp1 - hp2 >= 5) || hp2 - hp3 > 2) fail('la trampa debe saltar una vez y no rearmarse: ' + JSON.stringify({ hp1, hp2, hp3 }));

  // 4 · Altar: beneficio y precio a la vista; aceptar deja el pacto en el HUD; no cabe un segundo
  if (kinds.altar) {
    await G(() => { const sc = window.__GRAVEVOW__.scene(); const a = sc.altars[0]; const s = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [a.x + dx, a.y + dy]).find(([x, y]) => sc.walkableTile(x, y)); sc.debugTeleport(s[0], s[1]); });
    await p.waitForTimeout(200);
    if (!(await run('Altar:'))) fail('no se ofrece el altar');
    await p.waitForSelector('[data-testid=interact-0]');
    const opt = await p.textContent('[data-testid=interact-0]');
    if (!/Aceptar/.test(opt) || !/precio/.test(opt)) fail('el altar no enseña beneficio y precio: ' + opt);
    const ob = await (await p.$('[data-testid=interact-0]')).boundingBox();
    if (dev && ob.height < 44) fail('opción del altar menor de 44 px: ' + ob.height);
    await p.screenshot({ path: out + '-altar.png' });
    await tap('[data-testid=interact-0]'); await p.waitForTimeout(400);
    const pact = await G(() => window.__GRAVEVOW__.getState().expedition.pact);
    if (!pact) fail('aceptar no dejó el pacto');
    if (!(await p.$('[data-testid=hud-pact]'))) fail('el pacto no se ve en el HUD');
    const twice = await G(() => window.__GRAVEVOW__.actions.acceptPact('blood'));
    if (twice) fail('se aceptó un segundo pacto');
  }

  // 5 · Atajo (si el mapa lo tiene): desde fuera no se levanta; desde dentro sí
  if (kinds.doors.includes('gate')) {
    n = await near('gate', false);
    if (!n.labels.some((l) => l.includes('desde el otro lado'))) fail('el rastrillo se ofrece desde fuera: ' + JSON.stringify(n.labels));
    n = await near('gate', true);
    if (!(await run('Levantar el rastrillo'))) fail('no se puede levantar el rastrillo desde dentro');
    await waitChannel();
    if (!(await isOpen(n.door))) fail('el atajo no se abrió');
  }
  await p.screenshot({ path: out + '-fin.png' });
  console.log(dev || 'escritorio', JSON.stringify(kinds), 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
