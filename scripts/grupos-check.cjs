// Fase 2: combate 1 contra 2 en escritorio, móvil apaisado y tableta.
// Uso: node scripts/grupos-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'grupos', dev] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  const fail = (m) => { console.log('FALLO:', m); process.exitCode = 1; };
  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); await tap('[data-testid=btn-tutorial-ok]');
  await p.evaluate(() => { const s = window.__GRAVEVOW__.getState(); s.profile.character.level = 5; s.profile.tutorialSeen.dungeon = true; });
  await tap('[data-testid=tab-character]'); await tap('[data-testid=tab-play]'); await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1200);
  const fight = async () => {
    await p.evaluate(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_a', 'bandit', { entityId: 'e_b', enemyId: 'bandit' }));
    for (let k = 0; k < 40 && !(await p.$('[data-testid=act-attack]:not([disabled])')); k++) await p.waitForTimeout(150);
  };
  await fight();
  const n = await p.evaluate(() => window.__GRAVEVOW__.getState().combat.state.combatants.filter((c) => c.side === 'B').map((c) => c.name));
  if (n.length !== 2 || n[0] === n[1]) fail('dos enemigos con nombres distintos: ' + n);
  await p.screenshot({ path: out + '-1.png' });
  // Elegir el segundo como objetivo tocando su ficha
  const box = await (await p.$('[data-testid=info-e_b]')).boundingBox();
  if (box.height < 44) fail('ficha del enemigo menor de 44 px: ' + box.height);
  await tap('[data-testid=info-e_b]');
  if (!(await p.$('[data-testid=target-e_b]'))) fail('la ficha no marca el objetivo');
  await p.screenshot({ path: out + '-2.png' });
  await tap('[data-testid=act-attack]'); await p.waitForTimeout(200);
  const tgt = await p.evaluate(() => window.__GRAVEVOW__.getState().combat.state.log.find((l) => /^Aldric usa .* (contra Bandido saqueador II|Bandido saqueador II lo esquiva)/.test(l) || /pero Bandido saqueador II se desvanece/.test(l)) ?? null);
  if (!tgt) fail('el ataque no fue al objetivo elegido');
  // Matar al segundo y huir: su botín cae y el otro vuelve a su sitio
  await p.evaluate(() => { const c = window.__GRAVEVOW__.getState().combat.state.combatants.find((x) => x.id === 'e_b'); c.hp = 0; });
  for (let i = 0; i < 30; i++) {
    const o = await p.evaluate(() => window.__GRAVEVOW__.getState().combat?.state.outcome ?? null);
    if (o) break;
    const f = await p.$('[data-testid=act-flee]:not([disabled])');
    if (f) await f.click();
    await p.evaluate(() => { const pl = window.__GRAVEVOW__.getState().combat?.state.combatants.find((x) => x.control === 'player'); if (pl) pl.hp = pl.stats.maxHp; });
    await p.waitForTimeout(500);
  }
  const res = await p.evaluate(() => { const c = window.__GRAVEVOW__.getState().combat; return { o: c?.state.outcome, bag: c?.rewards?.bagId ?? null }; });
  if (res.o === 'fled' && !res.bag) fail('huida tras abatir a uno sin saco de botín');
  await p.screenshot({ path: out + '-3.png' });
  const c = await p.$('[data-testid=btn-combat-continue]'); if (c) await c.click(); await p.waitForTimeout(300);
  console.log(dev || 'escritorio', JSON.stringify({ nombres: n, resultado: res.o, saco: !!res.bag, alto: Math.round(box.height) }), 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
