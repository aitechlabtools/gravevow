// Prueba del tutorial de la primera expedición (8 pasos): moverse; combate con Atacar y ataque especial (la rata no cae
// antes); la venda en la pierna que muerde la rata; baúl y cofre; recoger y equiparse el arma de la hoguera; comer;
// aliarse con Osric y luchar juntos; su traición (sin temporizador); y extraer. Comprueba los bloqueos (soltar
// objetos, huir, portal antes de tiempo, dejar o traicionar a Osric), que caer no hace perder nada, el cartel
// «Paso N de 8» con «Saltar» (y su confirmación), botones de 44 px, «Repetir el tutorial» y saltarlo de verdad.
// Uso: node scripts/e2e-tutorial.cjs [url] [carpeta] [dispositivo de Playwright]
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/claude-0/tutorial';
const DEVICE = process.argv[4];
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = DEVICE ? await b.newContext({ ...devices[DEVICE] }) : await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const touch = !!DEVICE;
  const tap = async (sel) => { await page.waitForSelector(sel, { timeout: 8000 }); if (touch) await page.tap(sel); else await page.click(sel); await page.waitForTimeout(180); };
  const G = (fn, a) => page.evaluate(fn, a);
  const ok = (c, msg) => { if (!c) throw new Error(msg); console.log('✓', msg); };
  const stepId = () => G(() => { const s = window.__GRAVEVOW__.getState(); return s.tutorial ? document.querySelector('[data-testid=tutorial-guide]')?.dataset.step ?? s.tutorial.step : null; });
  const tstep = () => G(() => window.__GRAVEVOW__.getState().tutorial?.step ?? -1);
  const IDS = ['move', 'attack', 'special', 'wound', 'box', 'rich', 'weapon', 'equip', 'eat', 'ally', 'together', 'betrayal', 'extract'];
  const waitStep = async (id, ms = 7000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (IDS[await tstep()] === id) return true; await page.waitForTimeout(150); } return false; };
  const pulsing = (sel) => G((sel) => !!document.querySelector(sel)?.classList.contains('tut-pulse'), sel);
  const tp = (x, y) => G(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x, y), [x, y]);
  const pos = () => G(() => { const p = window.__GRAVEVOW__.scene().player; return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]; });
  const walk = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(150); };
  const use = async () => { if (touch) await tap('[data-testid=touch-action]'); else await page.keyboard.press('e'); await page.waitForTimeout(350); };
  const frozen = async () => { if (touch) return true; const a = await pos(); await walk('ArrowRight', 600); const c = await pos(); return a[0] === c[0] && a[1] === c[1]; };
  const size44 = async (sel) => { const r = await page.$eval(sel, (e) => { const b = e.getBoundingClientRect(); return [b.width, b.height]; }); return r[0] >= 44 && r[1] >= 44; };
  const toastHas = (re) => G((src) => window.__GRAVEVOW__.getState().toasts.some((t) => new RegExp(src).test(t.text)), re.source);
  const fight = async () => {
    for (let i = 0; i < 90; i++) {
      const s = await G(() => { const c = window.__GRAVEVOW__.getState().combat; return c ? c.state.outcome ?? 'on' : null; });
      if (s === null) break;
      if (s !== 'on') {
        await tap('[data-testid=btn-combat-continue]');
        await page.waitForTimeout(300);
        if (await page.$('[data-testid=loot-modal]')) { await tap('[data-testid=btn-take-all]'); await tap('[data-testid=btn-close-loot]'); }
        break;
      }
      if (await page.$('[data-testid=act-attack]:not([disabled])')) await tap('[data-testid=act-attack]:not([disabled])');
      await page.waitForTimeout(250);
    }
  };
  const room = (i) => [1 + i * 9 + 2, 4];

  await page.goto(BASE + '?debug&tutorial');
  await G(() => indexedDB.deleteDatabase('gravevow'));
  await G(() => { try { localStorage.removeItem('gravevow.tutorialDone'); } catch {} });
  await page.reload();
  await tap('[data-testid=btn-play]');
  await G(() => document.fullscreenElement && document.exitFullscreen());
  ok(!(await page.$('[data-testid=skip-tutorial]')), 'la primera vez no se puede saltar el tutorial al crear el personaje');
  await page.fill('[data-testid=name-input]', 'Novata');
  await tap('[data-testid=btn-create]');
  
  await tap('[data-testid=btn-enter-dungeon]');
  await page.waitForSelector('[data-testid=tutorial-guide]');
  ok((await G(() => window.__GRAVEVOW__.getState().dungeon.id)) === 'tutorial', 'la primera expedición es el tutorial (mapa a mano en las Afueras)');
  ok((await G(() => window.__GRAVEVOW__.getState().rival.who)) === 'osric', 'el mercenario del tutorial es Osric, no Kael');
  ok((await page.textContent('[data-testid=tutorial-count]')).trim() === 'Paso 1 de 8', 'el cartel dice «Paso 1 de 8»');
  const txt = await page.textContent('[data-testid=tutorial-text]');
  ok(touch ? /toca|joystick/i.test(txt) : /WASD|clic/i.test(txt), `las indicaciones se adaptan al dispositivo (${touch ? 'toca' : 'teclado y ratón'})`);
  ok((await page.textContent('[data-testid=hud-timer]')).includes('Tutorial'), 'en el tutorial no corre el reloj');
  ok(!!(await page.$('[data-testid=hud-needs]')), 'las necesidades se ven en el tutorial');
  ok(await size44('[data-testid=tutorial-skip]'), '«Saltar» mide al menos 44 px');
  // Saltar pide confirmación; «Seguir» la cierra sin saltar
  await tap('[data-testid=tutorial-skip]');
  ok(!!(await page.$('[data-testid=tutorial-skip-confirm]')), '«Saltar» pide confirmación');
  ok(/Ajustes › Partida/.test(await page.textContent('[data-testid=tutorial-skip-confirm]')), 'la confirmación dice dónde volver a jugarlo');
  ok(await size44('[data-testid=tutorial-skip-yes]') && await size44('[data-testid=tutorial-skip-no]'), 'los botones de la confirmación miden 44 px');
  await page.screenshot({ path: `${OUT}/00-saltar.png` });
  await tap('[data-testid=tutorial-skip-no]');
  ok(!(await page.$('[data-testid=tutorial-skip-confirm]')) && (await G(() => !!window.__GRAVEVOW__.getState().tutorial)), '«Seguir» vuelve al tutorial');
  await page.screenshot({ path: `${OUT}/01-moverse.png` });

  // Bloqueos fijos: soltar objetos y el portal
  await G(() => { const d = window.__GRAVEVOW__; const i = d.getState().expedition.backpack.findIndex((x) => x?.itemId === 'bandage'); d.actions.dropItem({ kind: 'grid', container: 'backpack', index: i }); });
  await page.waitForTimeout(200);
  ok((await G(() => window.__GRAVEVOW__.getState().expedition.backpack.some((x) => x?.itemId === 'bandage'))) && await toastHas(/Aún no/), 'soltar objetos está bloqueado, con aviso');
  await tp(1 + 63 + 2, 4); await page.waitForTimeout(300); await use();
  ok((await G(() => window.__GRAVEVOW__.scene().channel < 0)) && await toastHas(/portal todavía no responde/), 'el portal no responde antes del paso 8');
  await tp(...room(0)); await page.waitForTimeout(200);

  // 1 · Moverse
  if (!touch) { await page.mouse.click(5, 450); const a = await pos(); await walk('ArrowRight', 500); const c = await pos(); ok(a[0] !== c[0] || a[1] !== c[1], 'el personaje se mueve con el teclado'); }
  await tp(...room(1)); ok(await waitStep('attack'), 'paso 1: moverse');
  // 2 · Combate: Atacar, ataque especial y la herida
  await tp(1 + 9 + 2, 4);
  await page.waitForSelector('[data-testid=combat]', { timeout: 8000 });
  await page.waitForTimeout(400);
  ok(!!(await page.$('[data-testid=tutorial-guide].in-combat')), 'el cartel se ve durante el combate');
  ok((await page.textContent('[data-testid=tutorial-count]')).trim() === 'Paso 2 de 8', 'el combate es el paso 2');
  ok(await pulsing('[data-testid=act-attack]'), '«Atacar» se resalta');
  ok(await page.$eval('[data-testid=act-flee]', (e) => e.disabled), 'no se puede huir');
  await page.screenshot({ path: `${OUT}/02-atacar.png` });
  for (let i = 0; i < 4; i++) {
    await page.waitForSelector('[data-testid=act-attack]:not([disabled])', { timeout: 8000 });
    await tap('[data-testid=act-attack]');
    await page.waitForTimeout(900);
  }
  const rat = await G(() => window.__GRAVEVOW__.getState().combat?.state.combatants.find((c) => c.ref === 'ossuary_rat'));
  ok(rat && rat.hp >= 1 && !(await G(() => window.__GRAVEVOW__.getState().combat.state.outcome)), 'la rata no cae solo con «Atacar»');
  ok(await waitStep('special'), 'paso 2a: atacar');
  ok(await pulsing('[data-testid=act-special]'), '«Ataque especial» se resalta');
  await page.waitForSelector('[data-testid=act-special]:not([disabled])', { timeout: 8000 });
  await tap('[data-testid=act-special]');
  await page.waitForTimeout(300);
  ok(await pulsing('[data-testid=special-menu] [data-testid^="skill-"]:not([disabled])'), 'dentro, se resalta el primer ataque especial listo');
  await page.screenshot({ path: `${OUT}/03-especial.png` });
  await tap('[data-testid=special-menu] [data-testid^="skill-"]:not([disabled])');
  await fight();
  ok(await waitStep('wound'), 'paso 2b: ataque especial y la rata cae');
  await page.waitForTimeout(500);
  const leg = await G(() => window.__GRAVEVOW__.getState().expedition.body.parts.legL);
  ok(leg.bleed > 0, 'la rata deja la pierna sangrando');
  ok(await frozen(), 'herido: no te mueves hasta curarte');
  ok(await pulsing('[data-testid=hud-body]'), 'la silueta se resalta');
  ok(!(await page.$('[data-testid=loot-modal]')), 'la rata no suelta saco (nada interrumpe la cura)');
  await page.screenshot({ path: `${OUT}/04-herida.png` });
  await tap('[data-testid=hud-body]');
  await tap('[data-testid=body-row-legL]');
  ok(await pulsing('[data-testid=treat-bandage-legL]'), 'con la pierna elegida, se resalta la venda');
  await page.screenshot({ path: `${OUT}/05-venda.png` });
  await tap('[data-testid=treat-bandage-legL]');
  await tap('[data-testid=body-close]');
  ok(await waitStep('box'), 'paso 2c: la venda corta el sangrado de la pierna');
  ok((await page.textContent('[data-testid=tutorial-count]')).trim() === 'Paso 3 de 8', 'el cofre es el paso 3');
  // 3 · Baúl con la llave y cofre de hierro
  await tp(1 + 18 + 1, 4); await use();
  await page.waitForSelector('[data-testid=loot-modal]');
  await tap('[data-testid=btn-take-all]'); await tap('[data-testid=btn-close-loot]');
  ok(await waitStep('rich'), 'paso 3a: el baúl da la llave');
  await tp(1 + 18 + 4, 4); await use();
  if (await page.waitForSelector('[data-testid=btn-unlock]', { timeout: 1500 }).catch(() => null)) await tap('[data-testid=btn-unlock]');
  await page.waitForSelector('[data-testid=loot-modal]');
  await tap('[data-testid=btn-take-all]'); await tap('[data-testid=btn-close-loot]');
  ok(await waitStep('weapon'), 'paso 3b: abre el cofre de hierro con la llave');
  const bp = await G(() => window.__GRAVEVOW__.getState().expedition.backpack.filter(Boolean).map((x) => x.itemId));
  ok(bp.includes('gold_pouch') && bp.includes('gold_coins'), 'el cofre da monedas sueltas y un saquito');
  // 4 · Recoger y equiparse el arma de la hoguera
  await tp(1 + 27 + 3, 3); await use();
  await page.waitForSelector('[data-testid=loot-modal]');
  await tap('[data-testid=btn-take-all]'); await tap('[data-testid=btn-close-loot]');
  ok(await waitStep('equip'), 'paso 4a: recoge el arma');
  ok(await pulsing('[data-testid=btn-inventory]'), 'la mochila se resalta');
  ok(await frozen(), 'paso de equipar: no te mueves hasta hacerlo');
  await tap('[data-testid=btn-inventory]');
  await page.waitForTimeout(300);
  const weapon = await G(() => ({ warrior: 'short_sword', mage: 'ash_staff', rogue: 'keen_dagger', cleric: 'iron_mace' })[window.__GRAVEVOW__.getState().profile.character.classId]);
  ok(await pulsing(`[data-testid^="slot-backpack"][data-item="${weapon}"]`), 'dentro, se resalta el arma nueva');
  await page.screenshot({ path: `${OUT}/06-equipar.png` });
  await G((w) => { const d = window.__GRAVEVOW__; const i = d.getState().expedition.backpack.findIndex((x) => x?.itemId === w); d.actions.quickEquip({ kind: 'grid', container: 'backpack', index: i }); }, weapon);
  await G(() => window.__GRAVEVOW__.actions.closeModal());
  ok(await waitStep('eat'), 'paso 4b: equiparse el arma');
  // 5 · Comer
  const sat0 = await G(() => window.__GRAVEVOW__.getState().expedition.needs.sat);
  await tap('[data-testid=hud-body]');
  await tap('[data-testid=need-open-sat]');
  ok(await pulsing('[data-testid=eat-stale_bread]'), 'se resalta el pan');
  await page.screenshot({ path: `${OUT}/07-comer.png` });
  await tap('[data-testid=eat-stale_bread]');
  await tap('[data-testid=body-close]');
  ok(await waitStep('ally'), 'paso 5: comer');
  ok((await G(() => window.__GRAVEVOW__.getState().expedition.needs.sat)) > sat0, 'la Saciedad sube al comer');
  // 6 · Aliarse con Osric y luchar juntos
  const os = await G(() => { const r = window.__GRAVEVOW__.scene().rival; return [Math.floor(r.x), Math.floor(r.y)]; });
  await tp(os[0] - 1, os[1]); await use();
  await page.waitForSelector('[data-testid=rival-modal]');
  ok(await pulsing('[data-testid=rival-ally]'), '«Aliarse» se resalta');
  ok(!(await page.$('[data-testid=rival-attack]')), 'a Osric no se le puede atacar');
  await page.screenshot({ path: `${OUT}/08-osric.png` });
  await tap('[data-testid=rival-ally]');
  ok(!(await page.$('[data-testid=rival-betray]')) && !(await page.$('[data-testid=rival-leave]')), 'ya aliados, no se le puede traicionar ni dejar');
  await G(() => window.__GRAVEVOW__.actions.closeModal());
  ok(await waitStep('together'), 'paso 6a: aliarse');
  for (const id of ['t_band1', 't_band2']) {
    await G((id) => { const d = window.__GRAVEVOW__; const e = d.getState().dungeon.entities.find((x) => x.id === id); d.actions.startCombat('pve', id, e.enemyId); }, id);
    await page.waitForSelector('[data-testid=combat]');
    ok(await G(() => window.__GRAVEVOW__.getState().combat.state.combatants.some((c) => c.id === 'rival' && c.side === 'A')), `Osric lucha a tu lado (${id})`);
    await fight();
    await G((id) => { const sc = window.__GRAVEVOW__.scene(); const e = sc.enemies.find((x) => x.id === id); if (e && !e.dead) { e.dead = true; e.sprite.destroy(); e.shadow.destroy(); } }, id);
  }
  ok(await waitStep('betrayal'), 'paso 6b: combatir juntos');
  // Caer no hace perder nada
  const before = await G(() => JSON.stringify(window.__GRAVEVOW__.getState().expedition.backpack));
  await G(() => window.__GRAVEVOW__.actions.finishExpedition('died'));
  await page.waitForTimeout(500);
  const after = await G(() => { const s = window.__GRAVEVOW__.getState(); return { screen: s.screen, bp: JSON.stringify(s.expedition.backpack) }; });
  ok(after.screen === 'dungeon' && after.bp === before, 'si caes en el tutorial, vuelves al último punto seguro sin perder nada');
  // 7 · Traición: aviso al entrar en la brecha; con un menú abierto, espera
  await tp(1 + 54 + 2, 4);
  await page.waitForTimeout(500);
  ok((await G(() => window.__GRAVEVOW__.getState().tutorial.betrayalWarnAt)) !== undefined, 'Osric avisa al entrar en la brecha');
  await G(() => window.__GRAVEVOW__.actions.openModal({ type: 'body' }));
  await page.waitForTimeout(2500);
  ok(!(await G(() => window.__GRAVEVOW__.getState().combat)), 'con un menú abierto, la traición espera (no hay temporizador que se cuelgue)');
  await G(() => window.__GRAVEVOW__.actions.closeModal());
  await page.waitForSelector('[data-testid=combat]', { timeout: 8000 });
  ok((await G(() => window.__GRAVEVOW__.getState().combat.kind)) === 'betrayal-by-rival', 'paso 7: al cerrar el menú, Osric traiciona');
  ok(await page.$eval('[data-testid=act-flee]', (e) => e.disabled), 'en la traición tampoco se puede huir');
  await page.screenshot({ path: `${OUT}/09-traicion.png` });
  await fight();
  ok(await waitStep('extract'), 'Osric es fácil de vencer');
  ok((await page.textContent('[data-testid=tutorial-count]')).trim() === 'Paso 8 de 8', 'extraer es el paso 8');
  // 8 · Extraer
  await tp(1 + 63 + 2, 4);
  await page.waitForTimeout(400);
  await use();
  await page.waitForSelector('[data-testid=tutorial-note]', { timeout: 15000 });
  ok(/intendente te espera/.test(await page.textContent('[data-testid=tutorial-note]')), 'el resumen dice que el intendente te espera en el Bastión');
  await page.screenshot({ path: `${OUT}/10-resumen.png` });
  const p = await G(() => window.__GRAVEVOW__.getState().profile);
  ok(p.tutorialDone && p.gold >= 10, 'al extraer: tutorial completado, oro y equipo básico');
  ok(p.kael.missStreak === 0, 'el tutorial no cuenta para la aparición de Kael');
  await tap('[data-testid=btn-back-lobby]');

  // Repetir desde Ajustes: sin recompensas ni cambios en el inventario
  const snap = await G(() => JSON.stringify({ g: window.__GRAVEVOW__.getState().profile.gold, bp: window.__GRAVEVOW__.getState().profile.backpack }));
  await G(() => window.__GRAVEVOW__.actions.replayTutorial());
  await page.waitForSelector('[data-testid=tutorial-guide]');
  await G(() => window.__GRAVEVOW__.actions.finishExpedition('extracted'));
  await page.waitForSelector('[data-testid=tutorial-note]');
  const snap2 = await G(() => JSON.stringify({ g: window.__GRAVEVOW__.getState().profile.gold, bp: window.__GRAVEVOW__.getState().profile.backpack }));
  ok(snap === snap2, 'repetir el tutorial no cambia el oro ni el inventario');
  await tap('[data-testid=btn-back-lobby]');
  // Repetido y saltado: vuelves al Bastión con tu personaje igual
  await G(() => window.__GRAVEVOW__.actions.replayTutorial());
  await page.waitForSelector('[data-testid=tutorial-guide]');
  await tap('[data-testid=tutorial-skip]'); await tap('[data-testid=tutorial-skip-yes]');
  await page.waitForTimeout(400);
  const s3 = await G(() => { const s = window.__GRAVEVOW__.getState(); return { screen: s.screen, t: !!s.tutorial, snap: JSON.stringify({ g: s.profile.gold, bp: s.profile.backpack }) }; });
  ok(s3.screen === 'lobby' && !s3.t && s3.snap === snap, 'saltar el tutorial repetido vuelve al Bastión sin cambios');
  // Un personaje nuevo en este navegador ya puede saltarlo
  await G(() => window.__GRAVEVOW__.actions.deleteCharacter());
  await page.waitForTimeout(400);
  await tap('[data-testid=btn-play]');
  await G(() => document.fullscreenElement && document.exitFullscreen());
  ok(!!(await page.$('[data-testid=skip-tutorial]')), 'con el tutorial hecho una vez, un personaje nuevo puede saltarlo');
  console.log('errores:', errors.length ? errors : 'ninguno');
  await b.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error('FALLO', e.message); process.exit(1); });
