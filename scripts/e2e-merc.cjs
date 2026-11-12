// Prueba de mercenarios: contrato con Garra Roja, compañero en la mazmorra y en combate, y rescate de un prisionero.
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/claude-0/merc';
const DEVICE = process.argv[4];
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = DEVICE ? await b.newContext({ ...devices[DEVICE] }) : await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const tap = async (sel) => { await page.waitForSelector(sel, { timeout: 8000 }); await page.click(sel); };
  const S = () => page.evaluate(() => { const s = window.__GRAVEVOW__.getState(); return { merc: s.merc, contract: s.profile?.contract, screen: s.screen, combat: !!s.combat, outcome: s.combat?.state.outcome, allies: s.combat?.state.combatants.filter((c) => c.side === 'A').map((c) => c.id), gold: s.profile?.gold, rescued: s.profile?.mercsRescued }; });
  const fight = async () => {
    for (let i = 0; i < 120; i++) {
      const s = await S();
      if (s.outcome || !s.combat) break;
      const a = await page.$('[data-testid=act-attack]:not([disabled])');
      if (a) await a.click().catch(() => {});
      await page.waitForTimeout(300);
    }
  };
  await page.goto(BASE + '?debug');
  await page.evaluate(() => indexedDB.deleteDatabase('gravevow'));
  await page.reload();
  await tap('[data-testid=btn-play]');
  await page.fill('[data-testid=name-input]', 'Brena');
  await tap('[data-testid=class-warrior]');
  await tap('[data-testid=btn-create]');
  
  // Saltamos la cripta tutorial y damos oro para el contrato
  await page.evaluate(() => { const d = window.__GRAVEVOW__; const p = d.getState().profile; d.setState({ profile: { ...p, gold: 3000, character: { ...p.character, level: 25 }, stats: { ...p.stats, expeditions: 1 } } }); });
  // Grizk llega con Las mazmorras del Bastión (nivel 20): subir de nivel abre el aviso de habilidad
  if (await page.waitForSelector('[data-testid=btn-class-unlock-later]', { timeout: 2000 }).catch(() => null)) await tap('[data-testid=btn-class-unlock-later]');
  await tap('[data-testid=tab-merchants]'); await tap('[data-testid=btn-merchants]');
  await tap('[data-testid=vendor-grizk]');
  await tap('[data-testid=vendor-view-contracts]');
  await tap('[data-testid=merc-lysa]');
  console.log('Lysa bloqueada:', await page.$eval('[data-testid=merc-block]', (e) => e.textContent));
  await tap('[data-testid=merc-bram]');
  await tap('[data-testid=contract-len-3]');
  await tap('[data-testid=hire-stance-cautious]');
  await page.screenshot({ path: `${OUT}/contracts.png` });
  await tap('[data-testid=merc-hire]');
  await page.waitForSelector('[data-testid=contract-active]');
  let s = await S();
  console.log('contrato:', JSON.stringify(s.contract), 'oro:', s.gold);
  await page.screenshot({ path: `${OUT}/contract-active.png` });

  await tap('[data-testid=tab-play]');
  console.log('preparación:', await page.$eval('[data-testid=expedition-summary]', (e) => e.textContent));
  await tap('[data-testid=btn-enter-dungeon]');
  
  await page.waitForSelector('[data-testid=hud-merc]');
  await page.waitForTimeout(600);
  s = await S();
  console.log('mercenario en la mazmorra:', s.merc?.id, s.merc?.stance);
  // Cambiar actitud desde el HUD
  await tap('[data-testid=hud-merc]');
  await tap('[data-testid=merc-stance-aggressive]');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if (await page.$('[data-testid=merc-modal]')) await page.click('[data-testid=merc-modal] button:last-child');
  console.log('actitud ahora:', (await S()).merc.stance, '· contrato:', (await S()).contract.stance);
  // Ir hacia un enemigo y pelear
  const en = await page.evaluate(() => { const e = window.__GRAVEVOW__.scene().enemies.find((x) => !x.dead && !x.boss); return [e.x, e.y]; });
  await page.evaluate(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(Math.floor(x), Math.floor(y) + 1), en);
  await page.waitForSelector('[data-testid=combat]', { timeout: 8000 });
  s = await S();
  console.log('combate, aliados:', s.allies.join(','));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/combat-merc.png` });
  await fight();
  s = await S();
  console.log('resultado:', s.outcome, 'merc vivo:', s.merc?.alive, 'vida:', s.merc?.hp);
  if (await page.$('[data-testid=btn-combat-continue]')) await tap('[data-testid=btn-combat-continue]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/dungeon-merc.png` });

  // Rescate: rescindimos el contrato y buscamos un mapa con prisionero
  await page.evaluate(async () => {
    const d = window.__GRAVEVOW__;
    const p = d.getState().profile;
    d.setState({ profile: { ...p, contract: null }, merc: null, combat: null, modal: null, expedition: null, screen: 'lobby' });
  });
  await page.waitForTimeout(300);
  let found = false;
  for (let i = 0; i < 25 && !found; i++) {
    await page.evaluate(() => window.__GRAVEVOW__.actions.enterDungeon('mazmorra'));
    found = await page.evaluate(() => window.__GRAVEVOW__.getState().dungeon.entities.some((e) => e.kind === 'captive'));
    if (!found) await page.evaluate(() => { const d = window.__GRAVEVOW__; d.setState({ expedition: null, screen: 'lobby', dungeon: null }); });
  }
  console.log('mapa con prisionero:', found);
  await page.waitForSelector('[data-testid=game-canvas]');
  await page.waitForTimeout(1200);
  const c = await page.evaluate(() => { const c = window.__GRAVEVOW__.getState().dungeon.entities.find((e) => e.kind === 'captive'); return [c.x, c.y]; });
  // Quitamos enemigos de en medio para que no empiece un combate al llegar
  await page.evaluate(() => window.__GRAVEVOW__.scene().enemies.forEach((e) => { e.dead = true; e.sprite.setVisible(false); }));
  await page.evaluate(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x + 1, y), c);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/captive.png` });
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  if (await page.$('[data-testid=interact-menu]')) { const opt = await page.$('text=/Liberar/'); if (opt) await opt.click(); }
  await page.waitForSelector('[data-testid=captive-modal]', { timeout: 5000 });
  await page.screenshot({ path: `${OUT}/captive-modal.png` });
  await tap('[data-testid=captive-free]');
  await page.waitForTimeout(800);
  s = await S();
  console.log('rescatado:', s.merc?.id, 'rescued:', s.merc?.rescued);
  await page.screenshot({ path: `${OUT}/rescued.png` });
  await page.evaluate(() => window.__GRAVEVOW__.actions.finishExpedition('extracted'));
  await page.waitForSelector('[data-testid=merc-note]');
  console.log('resumen:', await page.$eval('[data-testid=merc-note]', (e) => e.textContent));
  console.log('rescatados:', (await S()).rescued);
  await page.screenshot({ path: `${OUT}/summary.png` });
  console.log('errores:', errors.length ? errors : 'ninguno');
  await b.close();
})().catch((e) => { console.error('FALLO', e); process.exit(1); });
