// Prueba de los mercenarios errantes y de Kael: aparición, triángulo de riesgo, alianza, aviso y traición,
// robo y huida en el Infierno, errantes hostiles, parte del oro al extraer y huida de un combate normal.
// Usa las ayudas de desarrollo (?debug → __GRAVEVOW__.dev). Uso: node scripts/e2e-social.cjs [url] [carpeta]
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/claude-0/social';
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const ok = (c, msg) => { if (!c) throw new Error(msg); console.log('✓', msg); };
  const G = (fn, a) => page.evaluate(fn, a);
  const S = () => G(() => { const s = window.__GRAVEVOW__.getState(); return { who: s.rival.who, rival: s.rival.disposition, risk: s.rival.risk, combat: s.combat?.kind, outcome: s.combat?.state.outcome, flee: s.combat?.state.canFlee, screen: s.screen, bags: Object.values(s.bags).map((x) => x.label) }; });
  const fight = async () => {
    for (let i = 0; i < 120; i++) {
      const s = await S();
      if (s.outcome || !s.combat) break;
      // Para no depender de la suerte: el jugador pega muy fuerte en esta prueba
      await G(() => { const d = window.__GRAVEVOW__; const c = d.getState().combat; const pl = c.state.combatants.find((x) => x.id === 'player'); if (pl) { pl.stats.atk = 999; pl.stats.mag = 999; pl.hp = pl.stats.maxHp; } });
      if (await page.$('[data-testid=act-attack]:not([disabled])')) await page.click('[data-testid=act-attack]:not([disabled])');
      await page.waitForTimeout(300);
    }
  };
  const enter = async (sub, level, dev) => {
    await G(async ([sub, level, dev]) => {
      const d = window.__GRAVEVOW__;
      Object.assign(d.dev, { forceKael: false, forceWanderer: null, forceHostile: false, forceBetrayal: false }, dev);
      const pr = d.getState().profile;
      d.setState({ screen: 'lobby', expedition: null, dungeon: null, combat: null, modal: null, summary: null, profile: { ...pr, character: { ...pr.character, level }, bossesDefeated: ['ossuary_lord', 'veiled_queen'], stats: { ...pr.stats, expeditions: 3 }, tutorialSeen: { lobby: true, dungeon: true }, tutorialDone: true } });
      // Deja que se desmonte la escena anterior antes de bajar otra vez
      await new Promise((r) => setTimeout(r, 400));
      await d.actions.enterDungeon(sub);
    }, [sub, level, dev]);
    await page.waitForTimeout(1200);
  };
  const toRival = async () => {
    const r = await G(() => { const r = window.__GRAVEVOW__.scene().rival; return [r.x, r.y]; });
    await G(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x, y), [Math.floor(r[0]) + 1, Math.floor(r[1])]);
    await page.waitForTimeout(500);
  };

  await page.goto(BASE + '?debug');
  await G(() => indexedDB.deleteDatabase('gravevow'));
  await page.reload();
  await page.click('[data-testid=btn-play]');
  await G(() => document.fullscreenElement && document.exitFullscreen());
  await page.fill('[data-testid=name-input]', 'Morgana');
  await page.click('[data-testid=class-mage]');
  await page.click('[data-testid=btn-create]');
  await page.click('[data-testid=btn-tutorial-ok]');

  // 1 · Kael en el castillo: triángulo verde, aviso especial, presentación, alianza (sin duelo)
  await enter('castillo', 15, { forceKael: true, forceBetrayal: true });
  ok((await S()).who === 'kael' && (await S()).risk === 'kael', 'Kael aparece en la Mazmorra con triángulo verde');
  ok(await G(() => window.__GRAVEVOW__.scene().rival.marker.texture.key === 'risk_kael'), 'sobre su cabeza se ve el triángulo de riesgo bajo');
  await toRival();
  await page.waitForTimeout(400);
  ok(await G(() => window.__GRAVEVOW__.scene().kaelAnnounced), 'al acercarte salta el aviso de encuentro especial');
  await page.keyboard.press('e');
  await page.waitForSelector('[data-testid=rival-modal]');
  ok(!(await page.$('[data-testid=rival-duel]')), 'ya no hay duelo amistoso');
  ok((await page.textContent('[data-testid=rival-line]')).includes('Kael'), 'Kael se presenta');
  await page.screenshot({ path: `${OUT}/kael-dialogo.png` });
  await page.click('[data-testid=rival-ally]');
  ok((await S()).rival === 'allied', 'alianza aceptada');
  await page.click('[data-testid=rival-line]').catch(() => {});
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  ok(!!(await page.$('[data-testid=hud-ally]')), 'aparece en el HUD como aliado');
  // Traidor forzado: en el primer minuto no hace nada; luego avisa y después traiciona
  await G(() => window.__GRAVEVOW__.actions.checkBetrayal(true));
  ok((await S()).rival === 'allied', 'en el primer minuto de alianza no traiciona');
  await G(() => { const d = window.__GRAVEVOW__; d.setState({ rival: { ...d.getState().rival, alliedAt: Date.now() - 70000 } }); d.actions.checkBetrayal(true); });
  ok(await G(() => window.__GRAVEVOW__.getState().rival.warned), 'antes de traicionar, avisa');
  await G(() => window.__GRAVEVOW__.actions.checkBetrayal(true));
  await page.waitForSelector('[data-testid=combat]');
  const tb = await S();
  ok(tb.combat === 'betrayal-by-rival' && tb.flee === false, 'traición: combate a muerte sin huida');
  await page.screenshot({ path: `${OUT}/kael-traicion.png` });
  await fight();
  ok((await S()).outcome === 'victory', 'se le puede vencer');
  await page.click('[data-testid=btn-combat-continue]');
  await page.waitForTimeout(400);
  ok((await S()).bags.some((x) => x.includes('Kael')), 'deja una bolsa con sus pertenencias');

  // 2 · Iskra en el Infierno: roba y huye; si la alcanzas, combate y recuperas lo robado
  await enter('carmesi', 65, { forceWanderer: 'iskra', forceBetrayal: true });
  ok((await S()).risk === 'high', 'en el Infierno el triángulo es rojo (riesgo muy alto)');
  await G(() => { const d = window.__GRAVEVOW__; const s = d.getState(); d.setState({ expedition: { ...s.expedition, backpack: s.expedition.backpack.map((x, i) => x ?? (i < 4 ? { uid: 'u' + i, itemId: 'old_coin', qty: 1 } : null)) } }); });
  await toRival();
  await G(() => { const d = window.__GRAVEVOW__; d.actions.interactRival(); d.actions.rivalPropose(); d.actions.closeModal(); });
  let robbed = false;
  for (let i = 0; i < 30 && !robbed; i++) {
    await G(() => { const d = window.__GRAVEVOW__; const r = d.getState().rival; if (r.disposition !== 'allied') return; d.setState({ rival: { ...r, warned: true, alliedAt: Date.now() - 70000 } }); d.actions.checkBetrayal(true); });
    const s = await S();
    if (s.rival === 'fleeing') robbed = true;
    else if (s.combat) { await fight(); await page.click('[data-testid=btn-combat-continue]'); await enter('carmesi', 65, { forceWanderer: 'iskra', forceBetrayal: true }); await toRival(); await G(() => { const d = window.__GRAVEVOW__; d.actions.interactRival(); d.actions.rivalPropose(); d.actions.closeModal(); }); }
  }
  ok(robbed, 'a veces roba y huye hacia el portal');
  ok((await G(() => window.__GRAVEVOW__.getState().rival.bagItemIds.length)) > 2, 'se lleva objetos de tu mochila');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/iskra-huye.png` });
  // Alcanzarla: el jugador se planta en su casilla
  for (let i = 0; i < 20 && !(await S()).combat; i++) {
    await G(() => { const sc = window.__GRAVEVOW__.scene(); const r = sc.rival; sc.debugTeleport(Math.floor(r.x), Math.floor(r.y)); });
    await page.waitForTimeout(250);
  }
  await page.waitForSelector('[data-testid=combat]', { timeout: 8000 });
  ok((await S()).combat === 'betrayal-by-rival', 'si la alcanzas, combate');
  await fight();
  await page.click('[data-testid=btn-combat-continue]');

  // 3 · Hostil en los Ríos de Fuego: triángulo de espadas y ataca al verte (se puede huir)
  await enter('rios', 85, { forceWanderer: 'malek', forceHostile: true });
  ok((await S()).rival === 'hostile' && (await S()).risk === 'hostile', 'un errante hostil empieza hostil con su triángulo propio');
  await toRival();
  await page.waitForSelector('[data-testid=combat]', { timeout: 8000 });
  ok((await S()).combat === 'hostile' && (await S()).flee === true, 'te ataca al verte y se puede huir');
  await page.screenshot({ path: `${OUT}/malek-hostil.png` });
  await fight();
  await page.click('[data-testid=btn-combat-continue]');

  // 4 · Extraer con un aliado: se despide y se lleva su parte del oro
  await enter('osario', 35, { forceWanderer: 'odo' });
  await toRival();
  await G(() => { const d = window.__GRAVEVOW__; d.actions.interactRival(); d.actions.rivalPropose(); d.actions.closeModal(); const s = d.getState(); const bp = [...s.expedition.backpack]; for (let k = 0; k < 5; k++) { const i = bp.indexOf(null); bp[i] = { uid: 'oro' + k, itemId: 'gold_coins', qty: 10 }; } d.setState({ expedition: { ...s.expedition, backpack: bp } }); }); // 50 monedas cogidas tras aliaros
  // En el portal te pide su parte; se la pagas y luego extraes
  await G(() => { const a = window.__GRAVEVOW__.actions; a.requestExtract(); a.payRival(); });
  await G(() => window.__GRAVEVOW__.actions.finishExpedition('extracted'));
  await page.waitForSelector('[data-testid=wanderer-note]');
  ok((await page.textContent('[data-testid=wanderer-note]')).includes('de oro'), 'al extraer se despide y se lleva su parte del oro');
  await page.screenshot({ path: `${OUT}/extraccion.png` });
  await page.click('[data-testid=btn-back-lobby]');

  // 5 · Huir de un combate normal sigue funcionando
  await enter('afueras', 5, {});
  const foe = await G(() => window.__GRAVEVOW__.getState().dungeon.entities.find((e) => e.kind === 'enemy' && e.id !== 'e_boss' && e.id !== 'e_elite'));
  await G(([id, en]) => window.__GRAVEVOW__.actions.startCombat('pve', id, en), [foe.id, foe.enemyId]);
  for (let i = 0; i < 25; i++) {
    const s = await S();
    if (s.outcome) break;
    if (await page.$('[data-testid=act-flee]:not([disabled])')) await page.click('[data-testid=act-flee]:not([disabled])');
    await page.waitForTimeout(400);
  }
  console.log('huida:', (await S()).outcome);
  await page.click('[data-testid=btn-combat-continue]');
  console.log('pantalla final:', (await S()).screen);
  console.log('Errores de consola:', errors.length ? errors : 'ninguno');
  await b.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error('FALLO', e.message); process.exit(2); });
