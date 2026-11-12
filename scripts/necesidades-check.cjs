// Fase 5 y 5b: necesidades. Catre en el Bastión; Intendencia → Estado (beber, férula y poción en la base); tira del HUD; desgaste por pulso con aviso; beber desde el panel.
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
  if (await p.$('[data-testid=base-needs]')) fail('Jugar ya no debe enseñar las necesidades');
  await tap('[data-testid=tab-merchants]'); await p.waitForSelector('[data-testid=bastion-cot]');
  if ((await p.$$('[data-testid^=vendor-card-]')).length !== 8) fail('el Bastión no tiene los 8 mercaderes');
  if (!(await p.$('[data-testid=vendor-lock-eldrin]'))) fail('Eldrin debería estar por llegar');
  const cb = await box('[data-testid=btn-cot]');
  if (dev && (!cb || cb.height < 43.5)) fail('botón del catre menor de 44 px: ' + JSON.stringify(cb));
  await p.screenshot({ path: out + '-1.png' });
  await tap('[data-testid=btn-cot]'); await p.waitForTimeout(150);
  const n0 = await G(() => window.__GRAVEVOW__.getState().profile.needs);
  if (n0.rest !== 100 || n0.sat !== 50) fail('el catre no repuso solo el descanso: ' + JSON.stringify(n0));
  // Intendencia → Estado: beber y curarse con lo propio
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; g.setState({ profile: { ...pr, wounds: { pct: { thorax: 0.5, legL: 0.6 }, fractures: ['legL'] } } }); });
  await tap('[data-testid=tab-stash]'); await tap('[data-testid=seg-status]');
  await p.waitForSelector('[data-testid=screen-stash] [data-testid=needs-panel]');
  if (!(await p.$('[data-testid=alijo-backpack]'))) fail('la mochila no está al lado del Estado');
  // Las necesidades van bajo las estadísticas (en móvil, bajo el cuerpo) y sin botón de comer: se come desde la mochila
  if (await p.$('[data-testid=screen-stash] [data-testid=need-use-hyd]')) fail('en Estado no debería haber botón de beber');
  if (!dev && !(await p.$('[data-testid=alijo-hero] [data-testid=needs-panel]'))) fail('las necesidades no están bajo el aventurero');
  await p.screenshot({ path: out + '-estado.png' });
  // Fase 7: «Beber…» abre la lista con lo que aporta cada bebida
  await tap('[data-testid=screen-stash] [data-testid=need-open-hyd]');
  await p.waitForSelector('[data-testid=need-list-hyd] [data-testid=eat-water]');
  if (!(await p.textContent('[data-testid=need-list-hyd]')).includes('+30 Hid')) fail('la lista no dice lo que aporta el agua');
  await p.screenshot({ path: out + '-lista.png' });
  await tap('[data-testid=need-list-hyd] [data-testid=eat-water]'); await p.waitForTimeout(150);
  const hyd = await G(() => window.__GRAVEVOW__.getState().profile.needs.hyd);
  if (!(hyd > 40)) fail('beber en la base no subió la hidratación: ' + hyd);
  const r = await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
    const bp = pr.backpack.slice(); const free = (k) => bp.findIndex((x, i) => !x && i >= k);
    bp[free(0)] = { uid: 'sp1', itemId: 'splint', qty: 1 }; bp[free(0)] = { uid: 'w2', itemId: 'water', qty: 1 }; bp[free(0)] = { uid: 'hp1', itemId: 'health_potion', qty: 1 };
    g.setState({ profile: { ...pr, backpack: bp } });
    g.actions.baseTreat('splint', 'legL'); g.actions.baseHeal('health_potion');
    const q = g.getState().profile; return { w: q.wounds, sp: q.backpack.some((x) => x && x.itemId === 'splint') }; });
  if (r.sp || (r.w && r.w.fractures.includes('legL'))) fail('la férula de la mochila no soldó la pierna en la base: ' + JSON.stringify(r));
  if (r.w && r.w.pct.thorax === 0.5) fail('la poción en la base no curó: ' + JSON.stringify(r));
  await tap('[data-testid=tab-play]');
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
  // Panel: Beber… y elegir el odre
  await tap('[data-testid=hud-body]'); await p.waitForSelector('[data-testid=needs-panel]');
  await tap('[data-testid=need-open-hyd]');
  const wb = await box('[data-testid=need-list-hyd] [data-testid=eat-water]');
  if (dev && (!wb || wb.height < 43.5)) fail('botón de beber menor de 44 px');
  await p.screenshot({ path: out + '-2.png' });
  const w0 = await G(() => window.__GRAVEVOW__.getState().expedition.backpack.filter((x) => x && x.itemId === 'water').reduce((a, x) => a + x.qty, 0));
  await tap('[data-testid=need-list-hyd] [data-testid=eat-water]'); await p.waitForTimeout(150);
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
