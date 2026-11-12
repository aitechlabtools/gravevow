// Bloque 1, fase 6: tocar para curar. Tocas una cura de la mochila (dentro del panel) y el cuerpo resalta dónde sirve;
// tocas la parte y se cura. Al revés: eliges una parte y se resaltan las curas que le sirven. Botones de 44 px en táctil.
// Uso: node scripts/curas-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'curas', dev] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  const fail = (m) => { console.log('FALLO:', m); process.exitCode = 1; };
  const G = (fn, arg) => p.evaluate(fn, arg);
  const cls = (sel) => p.getAttribute(sel, 'class');
  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); 
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
    const bp = pr.backpack.slice(); const free = () => bp.findIndex((x) => !x);
    bp[free()] = { uid: 'sp1', itemId: 'splint', qty: 2 }; bp[free()] = { uid: 'bd1', itemId: 'bandage', qty: 1 };
    g.setState({ profile: { ...pr, backpack: bp, tutorialSeen: { ...pr.tutorialSeen, dungeon: true }, wounds: { pct: { legL: 0.6, armR: 0.7 }, fractures: ['legL'] } } }); });
  await tap('[data-testid=tab-stash]'); await tap('[data-testid=seg-status]');
  await p.waitForSelector('[data-testid=body-kit]');
  const kb = await (await p.$('[data-testid=kit-splint]')).boundingBox();
  if (kb.height < 43.5 || kb.width < 43.5) fail('cura de la mochila menor de 44 px: ' + JSON.stringify(kb));
  // Al revés: elegir la pierna rota resalta la férula y no la venda
  await tap('[data-testid=body-row-legL]');
  if (!(await cls('[data-testid=kit-splint]')).includes('fit')) fail('la férula no se resalta para la pierna rota');
  if ((await cls('[data-testid=kit-bandage]')).includes('fit')) fail('la venda no debería resaltarse sin sangrado');
  // Tocar la férula: la pierna rota se resalta y el brazo no
  await tap('[data-testid=kit-splint]');
  if (!(await cls('[data-testid=body-row-legL]')).includes('drop-yes')) fail('la pierna rota no se resalta con la férula');
  if (!(await cls('[data-testid=body-row-armR]')).includes('drop-no')) fail('el brazo sano de huesos debería apagarse');
  await p.screenshot({ path: out + '-1.png' });
  // Tocar una parte donde no sirve no gasta nada y suelta la elección
  await tap('[data-testid=body-row-armR]');
  const n1 = await G(() => window.__GRAVEVOW__.getState().profile.backpack.find((x) => x && x.itemId === 'splint').qty);
  if (n1 !== 2) fail('tocar donde no sirve gastó la férula');
  if ((await cls('[data-testid=kit-splint]')).includes(' on')) fail('la elección debería soltarse');
  // Férula → pierna: se cura
  await tap('[data-testid=kit-splint]'); await tap('[data-testid=body-row-legL]'); await p.waitForTimeout(150);
  const r = await G(() => { const q = window.__GRAVEVOW__.getState().profile; return { f: q.wounds?.fractures ?? [], n: q.backpack.find((x) => x && x.itemId === 'splint')?.qty }; });
  if (r.f.includes('legL') || r.n !== 1) fail('tocar férula y pierna no curó: ' + JSON.stringify(r));
  await p.screenshot({ path: out + '-2.png' });
  // Fase 8: en combate, el 🩸 junto a tu vida abre el mismo panel; curar y beber gastan el turno
  await tap('[data-testid=tab-play]'); await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1200);
  await G(() => { const g = window.__GRAVEVOW__, e = g.getState().expedition; const bp = e.backpack.slice(); const free = () => bp.findIndex((x) => !x);
    bp[free()] = { uid: 'cb1', itemId: 'bandage', qty: 2 }; bp[free()] = { uid: 'cw1', itemId: 'water', qty: 2 }; g.setState({ expedition: { ...e, backpack: bp } }); });
  await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_a', 'bandit'));
  const myTurn = async () => { for (let k = 0; k < 60 && !(await p.$('[data-testid=act-attack]:not([disabled])')); k++) await p.waitForTimeout(150); };
  await myTurn();
  await G(() => { const g = window.__GRAVEVOW__, st = g.getState().combat.state; const pl = st.combatants.find((c) => c.id === 'player'); pl.body.parts.legR.bleed = 1; pl.needs = { ...pl.needs, hyd: 30 };
    for (const c of st.combatants) if (c.side === 'B') c.statuses.push({ id: 'stun', turns: 9 }); g.setState({ combat: { ...g.getState().combat } }); });
  await p.waitForTimeout(150);
  const cb = await (await p.$('[data-testid=combat-body]')).boundingBox();
  if (dev && (cb.width < 43.5 || cb.height < 43.5)) fail('botón 🩸 menor de 44 px: ' + JSON.stringify(cb));
  if (!(await cls('[data-testid=combat-body]')).includes('hurt')) fail('el 🩸 no avisa de la herida');
  await p.screenshot({ path: out + '-3.png' });
  await tap('[data-testid=combat-body]'); await p.waitForSelector('[data-testid=combat-body-modal]');
  await p.screenshot({ path: out + '-4.png' });
  const N = (id) => G((i) => window.__GRAVEVOW__.getState().expedition.backpack.filter((x) => x && x.itemId === i).reduce((a, x) => a + x.qty, 0), id);
  const bd0 = await N('bandage'), w0 = await N('water');
  const log0 = await G(() => window.__GRAVEVOW__.getState().combat.state.log.length);
  await tap('[data-testid=kit-bandage]'); await tap('[data-testid=body-row-legR]'); await p.waitForTimeout(400);
  const c1 = await G(() => { const s = window.__GRAVEVOW__.getState(), pl = s.combat.state.combatants.find((c) => c.id === 'player');
    return { bleed: pl.body.parts.legR.bleed, bd: s.expedition.backpack.filter((x) => x && x.itemId === 'bandage').reduce((a, x) => a + x.qty, 0), log: s.combat.state.log.length }; });
  if (c1.bleed !== 0 || c1.bd !== bd0 - 1 || c1.log <= log0) fail('vendar en combate no funcionó: ' + JSON.stringify(c1));
  if (await p.$('[data-testid=combat-body-modal]')) fail('el panel debería cerrarse al gastar el turno');
  await myTurn();
  await tap('[data-testid=combat-body]'); await p.waitForSelector('[data-testid=combat-body-modal]');
  await tap('[data-testid=need-open-hyd]'); await tap('[data-testid=need-list-hyd] [data-testid=eat-water]'); await p.waitForTimeout(400);
  const c2 = await G(() => { const s = window.__GRAVEVOW__.getState(); return { hyd: s.combat.state.combatants.find((c) => c.id === 'player').needs.hyd, w: s.expedition.backpack.filter((x) => x && x.itemId === 'water').reduce((a, x) => a + x.qty, 0) }; });
  if (c2.hyd < 55 || c2.w !== w0 - 1) fail('beber en combate no funcionó: ' + JSON.stringify(c2));
  Object.assign(r, { combate: c1, beber: c2 });
  console.log(dev || 'escritorio', JSON.stringify(r), 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
