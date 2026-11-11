// Fase 5: necesidades. Tira en el Jugar y catre; tira del HUD; desgaste por pulso con aviso; beber desde el panel.
// Uso: node scripts/necesidades-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'necesidades', dev] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  const fail = (m) => { console.log('FALLO:', m); process.exitCode = 1; };
  const G = (fn, arg) => p.evaluate(fn, arg);
  const box = async (sel) => (await p.$(sel))?.boundingBox();
  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); await tap('[data-testid=btn-tutorial-ok]');
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialSeen.dungeon = true; g.setState({ profile: { ...pr, needs: { sat: 50, hyd: 40, rest: 20 } } }); });
  await p.waitForSelector('[data-testid=base-needs]');
  const cb = await box('[data-testid=btn-cot]');
  if (dev && (!cb || cb.height < 44)) fail('botón del catre menor de 44 px: ' + JSON.stringify(cb));
  await p.screenshot({ path: out + '-1.png' });
  await tap('[data-testid=btn-cot]'); await p.waitForTimeout(150);
  const n0 = await G(() => window.__GRAVEVOW__.getState().profile.needs);
  if (n0.rest !== 100 || n0.sat !== 50) fail('el catre no repuso solo el descanso: ' + JSON.stringify(n0));
  // En la mazmorra: tira del HUD y desgaste por pulso
  await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1200);
  if (!(await p.$('[data-testid=hud-needs]'))) fail('no hay necesidades en el HUD');
  await G(() => { const g = window.__GRAVEVOW__, e = g.getState().expedition; g.setState({ expedition: { ...e, needs: { sat: 50, hyd: 30.1, rest: 100 } } }); });
  await G(() => { const g = window.__GRAVEVOW__; const c = g.getState().clock.pulses; g.actions.medicalPulse(c); g.actions.medicalPulse(c + 6); });
  await p.waitForTimeout(150);
  const n1 = await G(() => window.__GRAVEVOW__.getState().expedition.needs);
  if (!(n1.hyd < 30 && n1.sat < 50)) fail('el pulso no gastó las necesidades: ' + JSON.stringify(n1));
  const toastTxt = await p.textContent('body');
  if (!toastTxt.includes('Sed')) fail('no avisa de la sed al cruzar 30');
  // Panel: beber
  await tap('[data-testid=hud-body]'); await p.waitForSelector('[data-testid=needs-panel]');
  const wb = await box('[data-testid=need-use-hyd]');
  if (dev && (!wb || wb.height < 44)) fail('botón de beber menor de 44 px');
  await p.screenshot({ path: out + '-2.png' });
  const w0 = await G(() => window.__GRAVEVOW__.getState().expedition.backpack.filter((x) => x && x.itemId === 'water').reduce((a, x) => a + x.qty, 0));
  await tap('[data-testid=need-use-hyd]'); await p.waitForTimeout(150);
  const st = await G(() => { const e = window.__GRAVEVOW__.getState().expedition; return { hyd: e.needs.hyd, water: e.backpack.filter((x) => x && x.itemId === 'water').reduce((a, x) => a + x.qty, 0) }; });
  if (!(st.hyd > 55 && st.water === w0 - 1)) fail('beber no funcionó: ' + JSON.stringify({ w0, ...st }));
  await tap('[data-testid=body-close]');
  // Combate: la ronda gasta y el jugador lleva las necesidades
  await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_a', 'bandit'));
  for (let k = 0; k < 40 && !(await p.$('[data-testid=act-attack]:not([disabled])')); k++) await p.waitForTimeout(150);
  const cn = await G(() => window.__GRAVEVOW__.getState().combat.state.combatants.find((c) => c.id === 'player').needs);
  if (!cn) fail('el combatiente no lleva necesidades');
  console.log(dev || 'escritorio', JSON.stringify({ base: n0, pulso: n1, bebido: st }), 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
