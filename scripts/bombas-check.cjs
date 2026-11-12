// Bloque 2, fase 6: bombas en combate (mochila → bomba al objetivo marcado, frasco a los dos). Ficha con daño esperado.
// Uso: node scripts/bombas-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'bombas', dev] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  const fail = (m) => { console.log('FALLO:', m); process.exitCode = 1; };
  const G = (fn, arg) => p.evaluate(fn, arg);
  const small = async (sel, what) => { const bb = await (await p.$(sel))?.boundingBox(); if (!bb) fail('no está: ' + what); else if (dev && bb.height < 43.5) fail(what + ' menor de 44 px: ' + bb.height); };
  const hp = () => G(() => Object.fromEntries(window.__GRAVEVOW__.getState().combat.state.combatants.map((c) => [c.id, c.hp])));
  const myTurn = async () => { for (let k = 0; k < 60 && !(await p.$('[data-testid=act-attack]:not([disabled])')); k++) await p.waitForTimeout(150); };
  const count = (id) => G((id) => window.__GRAVEVOW__.getState().expedition.backpack.filter((x) => x && x.itemId === id).reduce((t, x) => t + x.qty, 0), id);

  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); 
  await G(() => { const s = window.__GRAVEVOW__.getState(); s.profile.character.level = 5; s.profile.tutorialSeen.dungeon = true; });
  await tap('[data-testid=tab-character]'); await tap('[data-testid=tab-play]'); await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1200);
  await G(() => { const g = window.__GRAVEVOW__, s = g.getState(); const bp = s.expedition.backpack.slice(); let k = 0;
    const put = (itemId, qty) => { while (bp[k]) k++; bp[k] = { uid: 'b' + k, itemId, qty }; };
    put('nail_bomb', 2); put('pitch_flask', 1); g.setState({ expedition: { ...s.expedition, backpack: bp } }); });
  await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_a', 'bandit', { entityId: 'e_b', enemyId: 'bandit' }));
  await myTurn();
  await G(() => { for (const c of window.__GRAVEVOW__.getState().combat.state.combatants) if (c.side === 'B') { c.stats.maxHp = c.hp = 500; } });

  // Bomba de clavos al segundo enemigo
  await tap('[data-testid=info-e_b]');
  await tap('[data-testid=act-bag]'); await p.waitForSelector('[data-testid=use-nail_bomb]');
  await small('[data-testid=use-nail_bomb]', 'Bomba de clavos');
  if (!/A Bandido saqueador II/.test(await p.textContent('[data-testid=use-nail_bomb]'))) fail('la bomba no dice a quién va');
  await p.screenshot({ path: out + '-mochila.png' });
  const h0 = await hp();
  await tap('[data-testid=use-nail_bomb]'); await p.waitForTimeout(300);
  const h1 = await hp();
  if (!(h1.e_b < h0.e_b) || h1.e_a !== h0.e_a) fail('la bomba no fue solo al objetivo: ' + JSON.stringify([h0, h1]));
  if ((await count('nail_bomb')) !== 1) fail('no se gastó la bomba');

  // Frasco de brea: a los dos
  await myTurn();
  await G(() => { const pl = window.__GRAVEVOW__.getState().combat.state.combatants.find((x) => x.control === 'player'); pl.hp = pl.stats.maxHp; });
  await tap('[data-testid=act-bag]'); await p.waitForSelector('[data-testid=use-pitch_flask]');
  const h2 = await hp();
  await tap('[data-testid=use-pitch_flask]'); await p.waitForTimeout(300);
  const h3 = await hp();
  if (!(h3.e_a < h2.e_a && h3.e_b < h2.e_b)) fail('el frasco no alcanzó a los dos: ' + JSON.stringify([h2, h3]));
  const burn = await G(() => window.__GRAVEVOW__.getState().combat.state.combatants.filter((c) => c.side === 'B' && c.statuses.some((x) => x.id === 'burn')).length);
  if (burn !== 2) fail('no quemó a los dos');
  await p.screenshot({ path: out + '-brea.png' });
  const w = await G(() => document.documentElement.scrollWidth - window.innerWidth); if (w > 1) fail('se sale por ' + w + ' px');
  console.log(dev || 'escritorio', 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
