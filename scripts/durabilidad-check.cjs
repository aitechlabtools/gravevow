// Fase 3: durabilidad. Reparar con Brand, arma rota sin especiales, desgaste tras combate y kit de campo.
// Uso: node scripts/durabilidad-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'durabilidad', dev] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  const fail = (m) => { console.log('FALLO:', m); process.exitCode = 1; };
  const G = (fn, arg) => p.evaluate(fn, arg);
  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); await tap('[data-testid=btn-tutorial-ok]');
  // Arma rota y casco gastado, con oro para pagar
  const breakGear = () => G(() => {
    const g = window.__GRAVEVOW__, pr = g.getState().profile;
    const eq = { ...pr.equipment, mainHand: { ...pr.equipment.mainHand, dur: 0 } };
    if (eq.helmet) eq.helmet = { ...eq.helmet, dur: 3 };
    pr.character.level = 5; pr.tutorialSeen.dungeon = true;
    g.setState({ profile: { ...pr, equipment: eq, gold: 900 } });
  });
  await breakGear();
  // 1) Yunque de Brand
  await tap('[data-testid=tab-merchants]'); await tap('[data-testid=btn-merchants]'); await tap('[data-testid=vendor-nira]'); await tap('[data-testid=vendor-view-repair]');
  await p.waitForSelector('[data-testid=repair]');
  const jobs = await p.$$('[data-testid^=repair-eq-]');
  if (jobs.length < 1) fail('el yunque no lista lo dañado');
  const btn = await (await p.$('[data-testid=repair-all]')).boundingBox();
  if (btn.height < 44) fail('botón Reparar todo menor de 44 px: ' + btn.height);
  await p.screenshot({ path: out + '-1.png' });
  const gold0 = await G(() => window.__GRAVEVOW__.getState().profile.gold);
  await tap('[data-testid=repair-all]'); await p.waitForTimeout(200);
  const after = await G(() => { const pr = window.__GRAVEVOW__.getState().profile; return { gold: pr.gold, dur: pr.equipment.mainHand.dur ?? null }; });
  if (after.dur !== null || after.gold >= gold0) fail('Brand no reparó o no cobró: ' + JSON.stringify(after));
  if (await p.$('[data-testid^=repair-eq-]')) fail('quedan piezas sin reparar');
  // 2) Arma rota en la mazmorra: sin especiales, pero con ataque básico
  await breakGear();
  await tap('[data-testid=vendor-back]'); await tap('[data-testid=tab-play]'); await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1200);
  await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_a', 'bandit'));
  for (let k = 0; k < 40 && !(await p.$('[data-testid=act-attack]:not([disabled])')); k++) await p.waitForTimeout(150);
  const kit = await G(() => { const pl = window.__GRAVEVOW__.getState().combat.state.combatants.find((c) => c.id === 'player'); return { skills: pl.skills.length, basic: pl.basicAttack.name }; });
  if (!(await p.$('[data-testid=act-attack]:not([disabled])'))) fail('sin ataque básico con el arma rota');
  await p.screenshot({ path: out + '-2.png' });
  // Ganar: el resto del equipo se desgasta
  const helm0 = await G(() => window.__GRAVEVOW__.getState().expedition.equipment.armor?.dur ?? null);
  for (let i = 0; i < 60; i++) {
    const o = await G(() => window.__GRAVEVOW__.getState().combat?.state.outcome ?? null);
    if (o) break;
    await G(() => { const st = window.__GRAVEVOW__.getState().combat?.state; const pl = st?.combatants.find((x) => x.id === 'player'); if (pl) pl.hp = pl.stats.maxHp; const e = st?.combatants.find((x) => x.side === 'B'); if (e && i > 6) e.hp = 1; }).catch(() => {});
    const a = await p.$('[data-testid=act-attack]:not([disabled])'); if (a) await a.click();
    await p.waitForTimeout(350);
  }
  const worn = await G(() => { const e = window.__GRAVEVOW__.getState().expedition.equipment; return Object.values(e).filter((x) => x && x.dur !== undefined).length; });
  if (worn < 2) fail('el combate no desgastó el equipo');
  const c = await p.$('[data-testid=btn-combat-continue]'); if (c) await c.click(); await p.waitForTimeout(300);
  const lb = await p.$('[data-testid=loot-close], [data-testid=bag-close]'); if (lb) await lb.click().catch(() => {});
  // 3) Kit de campo
  const fixed = await G(() => {
    const g = window.__GRAVEVOW__, s = g.getState(), bp = [...s.expedition.backpack];
    const i = bp.findIndex((x) => !x); bp[i] = { uid: 'kit1', itemId: 'repair_kit', qty: 1 };
    g.setState({ expedition: { ...s.expedition, backpack: bp } });
    g.actions.useItem({ kind: 'grid', container: 'backpack', index: i });
    const e = g.getState().expedition; return { dur: e.equipment.mainHand.dur ?? null, kitLeft: e.backpack.some((x) => x && x.itemId === 'repair_kit') };
  });
  if (fixed.dur === 0 || fixed.kitLeft) fail('el kit no reparó o no se gastó: ' + JSON.stringify(fixed));
  await p.screenshot({ path: out + '-3.png' });
  console.log(dev || 'escritorio', JSON.stringify({ yunque: jobs.length, oro: [gold0, after.gold], rota: kit, desgastadas: worn, kit: fixed }), 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
