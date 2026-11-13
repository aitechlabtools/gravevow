// 13/11 (noche): música de archivo solo en el menú y el Bastión (dos pistas que se alternan con silencio de 5 a 15 s),
// nada en la mazmorra, el combate ni los resultados, y ningún sonido ambiente.
// Uso: node scripts/musica-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'musica', dev] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok  ' : 'FALLO ') + m); if (!c) { bad++; process.exitCode = 1; } };
  const M = () => p.evaluate(() => ({ pl: window.__MUSIC__.playlist(), gen: window.__MUSIC__.current(), amb: window.__MUSIC__.ambient() }));
  const waitTrack = async (ms = 4000) => { for (let t = 0; t < ms; t += 200) { const m = await M(); if (m.pl?.status?.startsWith('sonando')) return m; await p.waitForTimeout(200); } return M(); };

  await p.goto(url + '?debug'); await p.waitForTimeout(800);
  ok(!(await M()).pl?.list, 'nada suena antes de la primera interacción');
  await tap('[data-testid=btn-play]');
  let m = await waitTrack();
  ok(m.pl?.list === 'bastion' && !!m.pl.track && !m.gen, `menú y creación: música de archivo (${m.pl?.track}, ${m.pl?.status})`);
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); await p.waitForTimeout(600);
  m = await M(); ok(m.pl?.list === 'bastion' && m.amb.length === 0, `Bastión: sigue la misma lista, sin ambiente (${m.pl?.track})`);
  const first = m.pl.track;
  // Alternancia: al acabar la pista, silencio de 5 a 15 s y la otra
  await p.evaluate(() => window.__MUSIC__.skip()); await p.waitForTimeout(1500);
  m = await M(); ok(/silencio de (\d+) s/.test(m.pl?.status ?? '') && +RegExp.$1 >= 5 && +RegExp.$1 <= 15, `entre pistas, silencio de 5 a 15 s (${m.pl?.status})`);
  for (let t = 0; t < 17000 && !(await M()).pl?.status?.startsWith('sonando'); t += 500) await p.waitForTimeout(500);
  m = await M(); ok(m.pl?.track && m.pl.track !== first, `después suena la otra pista (${first} → ${m.pl?.track})`);
  // Mazmorra y combate: sin música ni ambiente
  await p.evaluate(async () => { const D = window.__GRAVEVOW__; const pr = D.getState().profile; D.setState({ profile: { ...pr, stats: { ...pr.stats, expeditions: 5 }, character: { ...pr.character, level: 95 }, bossesDefeated: ['ossuary_lord', 'veiled_queen'] } }); await D.actions.enterDungeon('rios'); });
  await p.waitForTimeout(800);
  m = await M(); ok(!m.pl?.list && !m.gen && m.amb.length === 0, 'mazmorra: sin música ni ambiente (la música se apaga con fundido)');
  await p.evaluate(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_b', 'ignaroth')); await p.waitForTimeout(600);
  m = await M(); ok(!m.pl?.list && !m.gen && m.amb.length === 0, 'combate de jefe: silencio');
  await p.evaluate(() => window.__GRAVEVOW__.setState({ combat: null }));
  await p.evaluate(() => window.__GRAVEVOW__.actions.finishExpedition('extracted')); await p.waitForTimeout(1200);
  m = await M(); ok(!m.pl?.list && !m.gen, 'resultados: sin música ni fanfarria');
  // Vuelta al Bastión
  await p.evaluate(() => window.__GRAVEVOW__.actions.backToLobby()); 
  m = await waitTrack(); ok(m.pl?.list === 'bastion', `al volver al Bastión, la música vuelve (${m.pl?.track})`);
  ok(!errs.length, 'sin errores en la consola: ' + errs.join(' | '));
  console.log(bad ? `${bad} fallos` : 'Todo bien');
  await b.close();
})().catch((e) => { console.error('FALLO', e); process.exit(1); });
