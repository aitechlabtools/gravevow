// Fase 4: anatomía. Silueta en el HUD, panel de heridas (venda y férula), tratamiento en combate,
// muerte por el tórax y enfermería de Vesper. Uso: node scripts/anatomia-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'anatomia', dev] = process.argv;
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
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); 
  // Heridas que traes de antes (brazo roto, pierna a medias) y tratamientos en la mochila
  await G(() => {
    const g = window.__GRAVEVOW__, pr = g.getState().profile;
    pr.character.level = 5; pr.tutorialSeen.dungeon = true;
    const bp = [...pr.backpack];
    const put = (itemId, qty) => { const i = bp.findIndex((x) => !x); bp[i] = { uid: 'm' + itemId, itemId, qty }; };
    put('bandage', 3); put('splint', 1); put('tourniquet', 1);
    g.setState({ profile: { ...pr, backpack: bp, gold: 900, wounds: { pct: { legL: 0.5 }, fractures: ['armR'] } } });
  });
  // 1) Enfermería de Vesper: muestra las heridas y el precio
  await tap('[data-testid=tab-merchants]'); await tap('[data-testid=btn-merchants]'); await tap('[data-testid=vendor-vesper]'); await tap('[data-testid=vendor-view-infirmary]');
  await p.waitForSelector('[data-testid=infirmary]');
  const vb = await box('[data-testid=vesper-treat]');
  if (!vb || vb.height < 44) fail('botón de Vesper menor de 44 px');
  await tap('[data-testid=body-row-armR]');
  if (!(await p.textContent('[data-testid=body-detail]')).includes('Fractura')) fail('la enfermería no muestra la fractura');
  await p.screenshot({ path: out + '-1.png' });
  // 2) Entrar herido: la silueta del HUD lo enseña y abre el panel
  await tap('[data-testid=vendor-back]'); await tap('[data-testid=tab-play]'); await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1200);
  const st0 = await G(() => { const e = window.__GRAVEVOW__.getState().expedition; return { hp: e.hp, frac: e.body.parts.armR.fracture, leg: e.body.parts.legL.hp }; });
  if (!st0.frac) fail('la fractura no viaja a la incursión');
  const hb = await box('[data-testid=hud-body]');
  if (!hb) fail('no hay silueta en el HUD');
  else if (dev && (hb.width < 44 || hb.height < 44)) fail('silueta del HUD menor de 44 px en táctil: ' + JSON.stringify(hb));
  await tap('[data-testid=hud-body]');
  await p.waitForSelector('[data-testid=body-modal]');
  await G(() => { const g = window.__GRAVEVOW__, e = g.getState().expedition; const body = structuredClone(e.body); body.parts.armL.bleed = 1; g.setState({ expedition: { ...e, body } }); });
  await p.waitForTimeout(150);
  await p.screenshot({ path: out + '-2.png' });
  // Solo se ofrece lo que sirve: no hay torniquete para el abdomen
  if (await p.$('[data-testid=treat-tourniquet-abdomen]')) fail('ofrece torniquete en el abdomen');
  await tap('[data-testid=body-quick]'); await p.waitForTimeout(150);
  await tap('[data-testid=body-row-armR]'); await tap('[data-testid=treat-splint-armR]'); await p.waitForTimeout(150);
  const st1 = await G(() => { const e = window.__GRAVEVOW__.getState().expedition; const n = (id) => e.backpack.filter((x) => x && x.itemId === id).reduce((a, x) => a + x.qty, 0); return { bleed: e.body.parts.armL.bleed, frac: e.body.parts.armR.fracture, bandages: n('bandage'), splints: n('splint') }; });
  if (st1.bleed !== 0 || st1.frac || st1.bandages !== 2 || st1.splints !== 0) fail('los tratamientos no se aplicaron bien: ' + JSON.stringify(st1));
  await tap('[data-testid=body-close]');
  // 3) Combate: el sangrado aparece como remedio en la mochila y gasta el turno
  await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_a', 'bandit'));
  for (let k = 0; k < 40 && !(await p.$('[data-testid=act-attack]:not([disabled])')); k++) await p.waitForTimeout(150);
  await G(() => { const st = window.__GRAVEVOW__.getState().combat.state; const pl = st.combatants.find((c) => c.id === 'player'); pl.body.parts.legR.bleed = 2; });
  await G(() => window.__GRAVEVOW__.setState({ combat: { ...window.__GRAVEVOW__.getState().combat } }));
  if (!(await p.$('[data-testid=body-player]'))) fail('la ficha de combate no enseña la silueta');
  await tap('[data-testid=act-bag]'); await p.waitForTimeout(150);
  await p.screenshot({ path: out + '-3.png' });
  const tq = await p.$('[data-testid=treat-tourniquet-legR]');
  if (!tq) fail('no se ofrece el torniquete para el sangrado grave de la pierna');
  else { await tq.click(); await p.waitForTimeout(400); }
  const st2 = await G(() => { const pl = window.__GRAVEVOW__.getState().combat.state.combatants.find((c) => c.id === 'player'); return { bleed: pl.body.parts.legR.bleed, hp: pl.hp }; });
  if (st2.bleed !== 0) fail('el torniquete no cortó el sangrado en combate');
  // 3b) Cirugía en combate: brazo izquierdo a cero, enemigo aturdido; dos turnos y la región vuelve
  await G(() => {
    const g = window.__GRAVEVOW__, s = g.getState(), bp = [...s.expedition.backpack];
    const i = bp.findIndex((x) => !x); bp[i] = { uid: 'cir1', itemId: 'surgery_kit', qty: 1 };
    const st = s.combat.state, pl = st.combatants.find((c) => c.id === 'player');
    pl.body.parts.armL.hp = 0; pl.body.parts.legL.fracture = true;
    st.combatants.find((c) => c.side === 'B').statuses.push({ id: 'stun', turns: 6 });
    g.setState({ expedition: { ...s.expedition, backpack: bp }, combat: { ...s.combat } });
  });
  for (let k = 0; k < 40 && !(await p.$('[data-testid=act-bag]:not([disabled])')); k++) await p.waitForTimeout(150);
  await tap('[data-testid=act-bag]'); await p.waitForTimeout(150);
  const surg = await p.$('[data-testid=treat-surgery-armL]');
  if (!surg) fail('no se ofrece la cirugía en combate');
  else {
    await surg.click(); await p.waitForTimeout(500);
    for (let k = 0; k < 40 && !(await p.$('[data-testid=act-surgery]:not([disabled])')); k++) await p.waitForTimeout(150);
    await p.screenshot({ path: out + '-3b.png' });
    await tap('[data-testid=act-surgery]'); await p.waitForTimeout(400);
    const arm = await G(() => window.__GRAVEVOW__.getState().combat.state.combatants.find((c) => c.id === 'player').body.parts.armL);
    if (!(arm.hp > 0 && arm.operated)) fail('la cirugía en combate no levantó el brazo: ' + JSON.stringify(arm));
  }
  // 4) El tórax a cero es la muerte aunque quede vida en el resto
  await G(() => { const st = window.__GRAVEVOW__.getState().combat.state; const pl = st.combatants.find((c) => c.id === 'player'); pl.body.parts.thorax.hp = 1; pl.stats.def = 0; pl.stats.eva = 0; for (const c of st.combatants) if (c.side === 'B') c.statuses = []; });
  for (let i = 0; i < 40; i++) {
    const o = await G(() => window.__GRAVEVOW__.getState().combat?.state.outcome ?? null);
    if (o) break;
    await G(() => { const st = window.__GRAVEVOW__.getState().combat?.state; const pl = st?.combatants.find((x) => x.id === 'player'); if (pl && pl.hp > 0) { pl.body.parts.thorax.hp = 1; pl.body.parts.head.hp = 1; } }).catch(() => {});
    const a = await p.$('[data-testid=act-defend]:not([disabled]), [data-testid=act-attack]:not([disabled])'); if (a) await a.click();
    await p.waitForTimeout(300);
  }
  const end = await G(() => { const st = window.__GRAVEVOW__.getState().combat?.state; const pl = st?.combatants.find((x) => x.id === 'player'); const rest = pl ? Object.entries(pl.body.parts).filter(([r]) => r !== 'head' && r !== 'thorax').reduce((n, [, v]) => n + v.hp, 0) : 0; return { outcome: st?.outcome ?? null, hp: pl?.hp, rest }; });
  if (end.outcome === 'defeat' && !(end.hp === 0 && end.rest > 0)) fail('muerte sin vida en el resto (no es por región vital): ' + JSON.stringify(end));
  await p.screenshot({ path: out + '-4.png' });
  console.log(dev || 'escritorio', JSON.stringify({ entrada: st0, tratado: st1, combate: st2, final: end }), 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
