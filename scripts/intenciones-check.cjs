// Fase 8: ataques anunciados. El enemigo anuncia (chip en su ficha), la Guardia se marca y reduce el golpe, después queda
// expuesto; de un jefe se puede uno retirar y conserva sus heridas en la incursión.
// Uso: node scripts/intenciones-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'intenciones', dev] = process.argv;
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
  await G(() => { const s = window.__GRAVEVOW__.getState(); s.profile.character.level = 8; s.profile.tutorialSeen.dungeon = true; s.profile.tutorialDone = true; });
  await tap('[data-testid=tab-character]'); await tap('[data-testid=tab-play]'); await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1200);
  const myTurn = async () => { for (let k = 0; k < 60 && !(await p.$('[data-testid=act-attack]:not([disabled])')); k++) { if (await G(() => window.__GRAVEVOW__.getState().combat?.state.outcome ?? null)) return false; await p.waitForTimeout(150); } return true; };
  const heal = () => G(() => { const pl = window.__GRAVEVOW__.getState().combat?.state.combatants.find((x) => x.control === 'player'); if (pl && pl.body) { for (const r of Object.values(pl.body.parts)) r.hp = r.max ?? r.hp; } });

  // 1 · Un esqueleto que anuncia en cada turno (patrón forzado para no depender del azar)
  await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_a', 'skeleton'));
  await G(() => { const e = window.__GRAVEVOW__.getState().combat.state.combatants.find((c) => c.id === 'e_a'); e.pattern = { every: 1, moves: ['heavy_blow'] }; e.skillChance = 0; e.stats.eva = 0; e.stats.maxHp *= 6; e.hp = e.stats.maxHp; });
  let chip = null;
  for (let k = 0; k < 8 && !chip; k++) {
    if (!(await myTurn())) break;
    chip = await p.$('[data-testid=intent-e_a]');
    if (!chip) { await tap('[data-testid=act-attack]'); await p.waitForTimeout(300); }
  }
  if (!chip) fail('el enemigo no muestra su intención');
  else {
    const t = await chip.textContent();
    if (!/Golpe pesado/.test(t) || !/ti/.test(t) || !/Guardia/.test(t)) fail('la intención no dice ataque, objetivo y respuesta: ' + t);
    const cb = await chip.boundingBox();
    const vp = p.viewportSize();
    if (cb.x + cb.width > vp.width) fail('el chip de intención se sale de la pantalla');
  }
  const guard = await p.$('[data-testid=act-guard]');
  if (!guard) fail('no hay botón de Guardia');
  else {
    const cls = await guard.getAttribute('class');
    if (!/cmd-alert/.test(cls)) fail('la Guardia no se marca ante el golpe anunciado');
    const gb = await guard.boundingBox();
    if (dev && gb.height < 44) fail('Guardia menor de 44 px: ' + gb.height);
    const sub = await guard.textContent();
    if (!/≈\d+ → ≈\d+/.test(sub)) fail('la Guardia no dice cuánto ahorra: ' + sub);
  }
  const wide = await G(() => document.documentElement.scrollWidth - window.innerWidth);
  if (wide > 1) fail('el combate se sale de la pantalla por ' + wide + ' px');
  await p.screenshot({ path: out + '-anuncio.png' });
  await tap('[data-testid=act-guard]');
  for (let k = 0; k < 40 && !(await p.$('[data-testid=exposed-e_a]')); k++) await p.waitForTimeout(150);
  const log = await G(() => window.__GRAVEVOW__.getState().combat.state.log.join('\n'));
  if (!/Golpe pesado.*\(en guardia\)/.test(log)) fail('el golpe no se recibió en guardia');
  if (!(await p.$('[data-testid=exposed-e_a]'))) fail('el enemigo no queda expuesto');
  await p.screenshot({ path: out + '-expuesto.png' });
  // Acabar el combate
  await G(() => { const e = window.__GRAVEVOW__.getState().combat.state.combatants.find((c) => c.id === 'e_a'); e.hp = 1; e.stats.def = 0; e.exposed = 0; });
  for (let k = 0; k < 10; k++) { if (!(await myTurn())) break; await tap('[data-testid=act-attack]'); await p.waitForTimeout(300); }
  for (let k = 0; k < 30 && !(await G(() => window.__GRAVEVOW__.getState().combat?.state.outcome ?? null)); k++) await p.waitForTimeout(150);
  await G(() => { window.__GRAVEVOW__.actions.closeCombat(); window.__GRAVEVOW__.setState({ modal: null }); });
  await p.waitForTimeout(400);

  // 2 · Jefe: se puede huir y conserva sus heridas
  await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'boss_x', 'ossuary_lord'));
  await myTurn();
  if (!(await p.$('[data-testid=act-flee]:not([disabled])'))) fail('no se puede huir del jefe');
  const wounded = await G(() => { const cs = window.__GRAVEVOW__.getState().combat.state.combatants; cs.find((c) => c.id === 'player').unbreakable = true; const e = cs.find((c) => c.id === 'boss_x'); e.hp = Math.round(e.stats.maxHp * 0.8); return e.hp; });
  for (let i = 0; i < 30; i++) {
    if (await G(() => window.__GRAVEVOW__.getState().combat?.state.outcome ?? null)) break;
    await heal();
    const f = await p.$('[data-testid=act-flee]:not([disabled])');
    if (f) await f.click();
    await p.waitForTimeout(300);
  }
  const outcome = await G(() => window.__GRAVEVOW__.getState().combat?.state.outcome ?? null);
  if (outcome !== 'fled') fail('no se pudo huir del jefe: ' + outcome);
  await G(() => window.__GRAVEVOW__.actions.closeCombat());
  await p.waitForTimeout(300);
  const mem = await G(() => window.__GRAVEVOW__.getState().expedition.bosses?.boss_x ?? null);
  if (!mem || Math.abs(mem.hp - wounded) > 30) fail('el jefe no recuerda sus heridas: ' + JSON.stringify(mem) + ' (tenía ' + wounded + ')');
  await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'boss_x', 'ossuary_lord'));
  await p.waitForTimeout(400);
  const back = await G(() => { const c = window.__GRAVEVOW__.getState().combat.state; return { hp: c.combatants.find((x) => x.id === 'boss_x').hp, log: c.log.join('\n') }; });
  if (!mem || back.hp !== mem.hp) fail('el jefe vuelve con otra vida: ' + back.hp);
  if (!/aún lleva las heridas/.test(back.log)) fail('no se avisa de que el jefe sigue herido');
  await p.screenshot({ path: out + '-jefe.png' });
  console.log(dev || 'escritorio', 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
