// 13/11: música que reacciona. Menú → Bastión → tema de la zona con su subzona → combate (y jefe) → vuelta, peligro,
// Ajustes (ambiente y música en combate) y la pantalla de pruebas (?debug&musica).
// Uso: node scripts/musica-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'musica', dev] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok  ' : 'FALLO ') + m); if (!c) { bad++; process.exitCode = 1; } };
  const M = () => p.evaluate(() => ({ cur: window.__MUSIC__.current(), key: window.__MUSIC__.key(), amb: window.__MUSIC__.ambient() }));
  const G = (fn, a) => p.evaluate(fn, a);

  await p.goto(url + '?debug'); await p.waitForTimeout(800);
  // Música apagada en config/music.ts (musicaActivada = false): no suena ninguna pista ni fanfarria; el ambiente sí. Con la música activada: MUSICA_APAGADA=0
  if (process.env.MUSICA_APAGADA !== '0') {
    await tap('[data-testid=btn-play]'); await p.waitForTimeout(400);
    ok(!(await M()).cur, 'menú: sin música');
    await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); await p.waitForTimeout(600);
    let m0 = await M(); ok(!m0.cur && m0.amb.includes('refugio'), `Bastión: sin música, con ambiente (${m0.key})`);
    await p.evaluate(async () => { const D = window.__GRAVEVOW__; const pr = D.getState().profile; D.setState({ profile: { ...pr, stats: { ...pr.stats, expeditions: 5 }, character: { ...pr.character, level: 95 }, bossesDefeated: ['ossuary_lord', 'veiled_queen'] } }); await D.actions.enterDungeon('rios'); }); await p.waitForTimeout(1500);
    m0 = await M(); ok(!m0.cur && m0.amb.includes('lava'), `Ríos de Fuego: sin música, con ambiente de lava (${m0.amb})`);
    await p.evaluate(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_b', 'ignaroth')); await p.waitForTimeout(600);
    m0 = await M(); ok(!m0.cur, 'combate de jefe: sin música');
    await p.evaluate(() => { const D = window.__GRAVEVOW__; D.setState({ combat: null }); const e = D.getState().expedition; D.setState({ expedition: { ...e, hp: 1 } }); }); await p.waitForTimeout(1300);
    ok(!(await M()).cur, 'con poca vida: sin capa de peligro ni música');
    await p.evaluate(() => window.__GRAVEVOW__.actions.finishExpedition('extracted')); await p.waitForTimeout(1500);
    ok(!(await M()).cur, 'extracción: sin fanfarria ni música');
    ok(!errs.length, 'sin errores: ' + errs.join(' | '));
    console.log(bad ? `${bad} fallos` : 'Todo bien');
    await b.close(); return;
  }
  ok(!(await M()).cur, 'no suena nada antes de la primera interacción');
  await tap('[data-testid=btn-play]'); await p.waitForTimeout(400);
  ok((await M()).cur?.id === 'menu', `menú y creación: tema de presentación (${(await M()).key})`);
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); await p.waitForTimeout(600);
  let m = await M(); ok(m.cur?.id === 'bastion' && m.amb.includes('refugio'), `Bastión: ${m.key}`);
  await G(async () => { const D = window.__GRAVEVOW__; const pr = D.getState().profile; D.setState({ profile: { ...pr, stats: { ...pr.stats, expeditions: 5 }, character: { ...pr.character, level: 45 }, bossesDefeated: ['ossuary_lord'] } }); await D.actions.enterDungeon('catacumbas'); }); await p.waitForTimeout(1500);
  m = await M(); ok(m.cur?.id === 'cripta' && m.key.includes('catacumbas') && m.amb.includes('agua'), `Catacumbas: tema de la Cripta con su variación y ambiente (${m.key}, ${m.amb})`);
  await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_x', 'drowned')); await p.waitForTimeout(600);
  m = await M(); ok(m.cur?.id === 'combat' && m.cur.intensity < 0.7, `combate normal (${m.key}, ${m.cur?.intensity})`);
  await G(() => window.__GRAVEVOW__.setState({ combat: null })); await p.waitForTimeout(400);
  m = await M(); ok(m.cur?.id === 'cripta', 'al terminar vuelve el tema de la zona');
  await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_boss', 'veiled_queen')); await p.waitForTimeout(600);
  m = await M(); ok(m.cur?.id === 'combat' && m.cur.intensity >= 1, `jefe: versión intensa (${m.cur?.intensity})`);
  await G(() => window.__GRAVEVOW__.setState({ combat: null }));
  await G(() => { const D = window.__GRAVEVOW__; const e = D.getState().expedition; D.setState({ expedition: { ...e, hp: Math.round(e.body.total * 0.1) } }); }); await p.waitForTimeout(1300);
  ok(await G(() => window.__MUSIC__.danger()), 'con poca vida se activa la capa de peligro');
  // Ajustes
  await G(() => window.__GRAVEVOW__.setState({ expedition: null, dungeon: null, screen: 'lobby' })); await p.waitForTimeout(400);
  await G(() => window.__GRAVEVOW__.actions.setSettings({ combatMusic: 'off', ambientVolume: 0.3 }));
  const st = await G(() => window.__GRAVEVOW__.getState().profile.settings);
  ok(st.combatMusic === 'off' && st.ambientVolume === 0.3, 'Ajustes guarda música en combate y volumen de ambiente');
  ok(!errs.length, 'sin errores: ' + errs.join(' | '));
  // Pantalla de pruebas
  const q = await ctx.newPage(); const e2 = []; q.on('pageerror', (e) => e2.push(e.message));
  await q.goto(url + '?debug&musica'); await q.waitForSelector('[data-testid=music-lab]');
  for (const id of ['lab-track-menu', 'lab-sub-trono', 'lab-boss', 'lab-danger', 'lab-fan-legendary', 'lab-stop']) { await (dev ? q.tap(`[data-testid=${id}]`) : q.click(`[data-testid=${id}]`)); await q.waitForTimeout(250); }
  const bb = await (await q.$('[data-testid=lab-boss]')).boundingBox(); ok(bb.height >= 43.5, 'botones de la pantalla de pruebas de 44 px');
  await q.screenshot({ path: out + '-lab.png' });
  ok(!e2.length, 'pantalla de pruebas sin errores: ' + e2.join(' | '));
  console.log(bad ? `${bad} fallos` : 'Todo bien');
  await b.close();
})().catch((e) => { console.error('FALLO', e); process.exit(1); });
