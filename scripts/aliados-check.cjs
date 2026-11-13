// Un solo aliado (13/11): conversación con aliado ya presente (mantener, separarse, traicionar, soltar prisionero),
// guarda contra un segundo aliado, testigo (👁), reputación con Grizk y confianza de Kael (alta, baja, hostil).
// node scripts/aliados-check.cjs <url>/play/ <carpeta> [dispositivo]
const { chromium, devices } = require('playwright'); const path = require('path'); const fs = require('fs');
const { leaveSummary } = require('./lib/summary.cjs');
const url = process.argv[2] || 'http://localhost:5173/play/'; const out = process.argv[3] || 'out'; const dev = process.argv[4];
fs.mkdirSync(out, { recursive: true });
const ok = (c, m) => { if (!c) { console.error('FALLO:', m); process.exitCode = 1; } else console.log('ok ·', m); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (s) => (dev ? p.tap(s) : p.click(s));
  const G = (f, a) => p.evaluate(f, a);
  const tag = dev ? 'tactil' : 'escritorio';
  await p.goto(url + '?debug&ally=bram&captive=tobias&kael=0'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]');
  await p.waitForSelector('[data-testid=tab-play]');
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; g.setState({ profile: { ...pr, tutorialDone: true, stats: { ...pr.stats, expeditions: 1 }, reputation: { ...pr.reputation, grizk: 300 } } }); });
  const enter = async () => { await G(async () => { await window.__GRAVEVOW__.actions.enterDungeon('afueras'); }); await p.waitForTimeout(900); };
  const st = () => G(() => { const s = window.__GRAVEVOW__.getState(); return { merc: s.merc && { id: s.merc.id, alive: s.merc.alive, left: s.merc.left }, rival: { who: s.rival.who, d: s.rival.disposition, risk: s.rival.risk, w: !!s.rival.witnessed, chance: s.rival.chance }, modal: s.modal?.type ?? null, rep: s.expedition?.grizkRep ?? 0, released: s.expedition?.released ?? [] }; });

  // 1 · Entras con Bram (contrato) y aparece Kael: la conversación ofrece las tres opciones
  await enter();
  let s = await st();
  ok(s.merc?.alive && s.merc.id === 'bram' && s.rival.who === 'kael' && s.rival.d === 'neutral', `contrato con Bram y Kael neutral: ${JSON.stringify(s)}`);
  ok(await p.isVisible('[data-testid=hud-merc]') && !(await p.$('[data-testid=hud-ally]')), 'el HUD enseña un solo aliado');
  await G(() => window.__GRAVEVOW__.actions.interactRival());
  await p.waitForSelector('[data-testid=ally-choice]');
  for (const id of ['ally-keep', 'ally-part', 'ally-betray']) { const bb = await p.locator(`[data-testid=${id}]`).boundingBox(); ok(bb && bb.height >= 43.5 && bb.width >= 43.5, `${id} visible y de 44 px o más`); }
  ok(/Bram/.test(await p.textContent('[data-testid=ally-current]')), '«Ya te acompaña» dice quién');
  await p.screenshot({ path: path.join(out, `aliados-${tag}-1-conversacion.png`) });
  // Guarda: aliarse a la fuerza no añade un segundo aliado
  await G(() => window.__GRAVEVOW__.actions.rivalPropose());
  s = await st();
  ok(s.rival.d === 'neutral' && s.merc.alive, 'rivalPropose con mercenario: no hay segundo aliado');
  await tap('[data-testid=ally-keep]');
  s = await st();
  ok(s.rival.d === 'neutral' && s.merc.alive && !s.modal, 'quedarte con Bram: Kael se queda donde estaba');

  // 2 · El prisionero: soltarle sin que se una (+25 con Grizk)
  await G(() => window.__GRAVEVOW__.actions.interactCaptive('tobias'));
  await p.waitForSelector('[data-testid=ally-release]');
  await p.screenshot({ path: path.join(out, `aliados-${tag}-2-prisionero.png`) });
  await tap('[data-testid=ally-release]');
  s = await st();
  ok(s.released.includes('tobias') && s.rep === 25 && s.merc.alive, `prisionero liberado sin unirse, +25: ${JSON.stringify(s)}`);
  await G(() => window.__GRAVEVOW__.actions.freeCaptive('tobias'));
  ok((await st()).merc.id === 'bram', 'liberarlo a la fuerza no cambia de aliado');

  // 3 · Separar caminos: Bram vuelve, Kael se une
  await G(() => window.__GRAVEVOW__.actions.interactRival());
  await tap('[data-testid=ally-part]');
  s = await st();
  ok(s.merc.left === 'parted' && !s.merc.alive && s.rival.d === 'allied', `separarse: Bram se va, Kael aliado: ${JSON.stringify(s)}`);
  ok(await p.isVisible('[data-testid=hud-ally]') && !(await p.$('[data-testid=hud-merc]')), 'el HUD pasa a Kael, un solo aliado');
  await G(() => window.__GRAVEVOW__.actions.finishExpedition('extracted'));
  await leaveSummary(p);
  const c1 = await G(() => window.__GRAVEVOW__.getState().profile);
  ok(c1.reputation.grizk === 325, `al volver se aplica el +25 (${c1.reputation.grizk})`);

  // 4 · Traicionar a Bram para quedarte con Kael: combate con Kael a tu lado, testigo y −150 con Grizk
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; g.setState({ profile: { ...pr, contract: { mercId: 'bram', left: 2, stance: 'cautious' } } }); });
  await G(() => { window.__GRAVEVOW__.dev.forceCaptive = null; });
  await enter();
  await G(() => window.__GRAVEVOW__.actions.interactRival());
  await tap('[data-testid=ally-betray]');
  await p.waitForTimeout(500);
  await p.waitForSelector('[data-testid=act-attack]', { timeout: 10000 });
  const sides = await G(() => window.__GRAVEVOW__.getState().combat.state.combatants.map((c) => `${c.id}:${c.side}`).join(','));
  ok(/rival:A/.test(sides) && /merc:B/.test(sides), `combate: Kael contigo y Bram enfrente (${sides})`);
  await G(() => { const s = window.__GRAVEVOW__.getState(); for (const x of s.combat.state.combatants) if (x.side === 'B') x.hp = 1; });
  for (let i = 0; i < 30; i++) { if (await G(() => !!window.__GRAVEVOW__.getState().combat?.state.outcome)) break; const a = await p.$('[data-testid=act-attack]:not([disabled])'); if (a) await a.click(); await p.waitForTimeout(350); }
  await tap('[data-testid=btn-combat-continue]'); await p.waitForTimeout(300);
  await G(() => window.__GRAVEVOW__.actions.closeModal());
  s = await st();
  ok(s.merc.left === 'betrayed' && s.rival.d === 'allied' && s.rival.w && s.rep === -150, `traición: testigo y −150 pendiente: ${JSON.stringify(s)}`);
  ok(await p.isVisible('[data-testid=hud-ally-witness]'), 'el triángulo de Kael lleva el ojo');
  await p.screenshot({ path: path.join(out, `aliados-${tag}-3-testigo.png`) });
  await G(() => window.__GRAVEVOW__.actions.finishExpedition('extracted'));
  await leaveSummary(p);
  const c2 = await G(() => window.__GRAVEVOW__.getState().profile);
  ok(c2.reputation.grizk === 175 && !c2.contract, `al volver: −150 con Grizk y contrato roto (${c2.reputation.grizk})`);

  // 5 · Confianza de Kael: baja (naranja) y hostil (ataca al verte)
  await G(() => window.__GRAVEVOW__.dev.kaelTrust(2));
  await enter();
  ok((await st()).rival.risk === 'mid', 'confianza baja: triángulo naranja');
  await G(() => window.__GRAVEVOW__.actions.interactRival());
  ok(/ojo abierto|manos/.test(await p.textContent('[data-testid=rival-line]')), 'saludo receloso');
  await p.screenshot({ path: path.join(out, `aliados-${tag}-4-kael-baja.png`) });
  await G(() => window.__GRAVEVOW__.actions.closeModal());
  await G(() => window.__GRAVEVOW__.actions.finishExpedition('extracted')); await leaveSummary(p);
  await G(() => window.__GRAVEVOW__.dev.kaelTrust(6));
  await enter();
  s = await st();
  ok(s.rival.d === 'hostile' && s.rival.risk === 'hostile', 'tres traiciones: Kael hostil');
  ok(errs.length === 0, 'sin errores de página ' + errs.join(' | '));
  await b.close();
})();
