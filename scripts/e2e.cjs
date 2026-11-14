// Prueba de extremo a extremo del criterio de éxito de la primera entrega.
// Uso: node scripts/e2e.cjs http://localhost:5173/play/ [carpeta_capturas]
const { leaveSummary, summaryPage } = require('./lib/summary.cjs');
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || 'e2e-shots';
const fs = require('fs');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const st = () => page.evaluate(() => {
    const s = window.__GRAVEVOW__.getState();
    return { screen: s.screen, combat: !!s.combat, outcome: s.combat?.state.outcome ?? null, modal: s.modal?.type ?? null,
      hp: s.expedition?.hp, backpack: (s.expedition?.backpack ?? s.profile?.backpack ?? []).filter(Boolean).map((x) => x.itemId + 'x' + x.qty), gold: s.profile?.gold };
  });
  const step = async (name, fn) => { process.stdout.write(`· ${name}… `); await fn(); console.log('ok'); };
  const tp = (x, y) => page.evaluate(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x, y), [x, y]);
  // Retira los enemigos cercanos a un punto para que las pruebas de cofre/portal no acaben en combate
  const clearNear = (x, y, r = 7) => page.evaluate(([x, y, r]) => { for (const e of window.__GRAVEVOW__.scene().enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < r) { e.dead = true; e.sprite.destroy(); e.shadow.destroy(); } }, [x, y, r]);

  await page.goto(BASE + '?debug');
  await page.waitForSelector('[data-testid=btn-play]');
  await shot('01-title');
  await step('Crear personaje', async () => {
    await page.click('[data-testid=btn-play]');
    await page.fill('[data-testid=name-input]', 'Aldric');
    await page.click('[data-testid=class-warrior]');
    await shot('02-create');
    await page.click('[data-testid=btn-create]');
    
  });
  let goldBefore;
  await step('Comprar una poción', async () => {
    goldBefore = (await st()).gold;
    await page.click('[data-testid=tab-merchants]');
    await page.click('[data-testid=vendor-vesper]');
    await page.click('[data-testid=buy-health_potion]');
    const s = await st();
    if (s.gold !== goldBefore - 2) throw new Error('el oro no bajó: ' + s.gold); // 2 monedas (economía ÷10)
    await shot('03-merchant');
  });
  await step('El aspecto cambia al equiparse un yelmo', async () => {
    await page.click('[data-testid=vendor-back]');
    await page.click('[data-testid=vendor-nira]');
    await page.click('[data-testid=buy-leather_hood]');
    await page.click('[data-testid=tab-stash]');
    const before = await page.$eval('[data-testid=alijo-hero] [data-testid=hero-sprite]', (i) => i.src);
    await page.dblclick('[data-testid^=slot-backpack][data-item=leather_hood]');
    await page.waitForSelector('[data-testid=slot-equip-helmet][data-item=leather_hood]');
    await page.waitForTimeout(300);
    const after = await page.$eval('[data-testid=alijo-hero] [data-testid=hero-sprite]', (i) => i.src);
    if (before === after) throw new Error('el retrato no cambió al equipar el yelmo');
  });
  await step('Equipo e inventario', async () => {
    await page.click('[data-testid=tab-stash]');
    await page.waitForSelector('[data-testid=slot-equip-mainHand][data-item=rusty_sword]');
    await page.hover('[data-testid=slot-equip-mainHand]');
    await page.waitForTimeout(200);
    await shot('04-gear');
  });
  await step('Entrar en la mazmorra', async () => {
    await page.click('[data-testid=tab-play]');
    await shot('05-expedition');
    await page.click('[data-testid=btn-enter-dungeon]');
    
    
    await page.waitForTimeout(800);
    await shot('06-dungeon-start');
  });
  await step('Quitarse el yelmo en la mazmorra cambia el personaje al momento', async () => {
    const t0 = await page.evaluate(() => window.__GRAVEVOW__.scene().player.tex);
    await page.keyboard.press('i');
    await page.waitForSelector('[data-testid=dungeon-inventory]');
    await page.dblclick('[data-testid=slot-equip-helmet]');
    await page.waitForTimeout(300);
    const t1 = await page.evaluate(() => window.__GRAVEVOW__.scene().player.tex);
    if (t0 === t1) throw new Error('la textura del personaje no cambió');
    await page.dblclick('[data-testid^=slot-backpack][data-item=leather_hood]');
    await page.keyboard.press('Escape');
  });
  await step('Caminar con el teclado', async () => {
    const before = await page.evaluate(() => { const p = window.__GRAVEVOW__.scene().player; return [p.x, p.y]; });
    await page.keyboard.down('d'); await page.waitForTimeout(700); await page.keyboard.up('d');
    const after = await page.evaluate(() => { const p = window.__GRAVEVOW__.scene().player; return [p.x, p.y]; });
    if (Math.hypot(after[0] - before[0], after[1] - before[1]) < 0.3) throw new Error('no se movió ' + before + ' → ' + after);
    await page.keyboard.down('w'); await page.waitForTimeout(2500); await page.keyboard.up('w');
    const blocked = await page.evaluate(() => { const p = window.__GRAVEVOW__.scene().player; return [p.x, p.y]; });
    if (blocked[0] < 1 || blocked[1] < 1) throw new Error('atravesó un muro: ' + blocked);
  });
  await step('Encontrar un enemigo y combatir', async () => {
    const pos = await page.evaluate(() => { const e = window.__GRAVEVOW__.scene().enemies.find((x) => x.id === 'e_skel1'); return [e.x, e.y]; });
    await tp(Math.floor(pos[0]), Math.floor(pos[1]) - 1);
    await page.waitForSelector('[data-testid=combat]', { timeout: 8000 });
    await page.waitForTimeout(500);
    await shot('07-combat');
    for (let i = 0; i < 60; i++) {
      const s = await st();
      if (s.outcome) break;
      const myTurn = await page.$('[data-testid=act-attack]:not([disabled])');
      if (myTurn) {
        if (s.hp < 40 && (await page.$('[data-testid=act-bag]:not([disabled])'))) { await page.click('[data-testid=act-bag]'); await page.click('[data-testid=use-health_potion]'); }
        else if (i === 1) {
          await page.click('[data-testid=act-special]');
          await page.waitForSelector('[data-testid=special-menu]');
          await shot('08-special-menu');
          await page.click('[data-testid=skill-rending_slash]');
        }
        else await page.keyboard.press('1');
        
      }
      await page.waitForTimeout(450);
    }
    const s = await st();
    await shot('09-combat-result');
    if (s.outcome !== 'victory') throw new Error('resultado: ' + s.outcome);
    // A veces el enemigo no suelta nada: entonces le damos oro para probar el saco del botín
    const noLoot = !(await page.$('[data-testid=combat-bag-note]'));
    await page.click('[data-testid=btn-combat-continue]');
    if (noLoot) await page.evaluate(() => { const G = window.__GRAVEVOW__; const st = G.getState(); const [x, y] = st.hud.playerTile; const b = { id: 'bag-e2e', x, y, grid: [{ uid: 'c', itemId: 'gold_coins', qty: 5 }, ...Array(11).fill(null)], label: 'Saco del combate' }; G.setState({ bags: { ...st.bags, [b.id]: b } }); G.actions.openBag(b.id); });
  });
  await step('Oro físico: el botín cae en un saco en el suelo y se abre solo', async () => {
    await page.waitForSelector('[data-testid=loot-modal]', { timeout: 4000 });
    await shot('09b-saco-botin');
    const before = await page.evaluate(() => { const s = window.__GRAVEVOW__.getState(); return { bp: s.expedition.backpack.filter(Boolean).length, gold: s.expedition.backpack.reduce((n, x) => n + (x?.itemId === 'gold_coins' ? x.qty : x?.gold ?? 0), 0) }; });
    if (await page.$('[data-testid=btn-take-gold]')) {
      await page.click('[data-testid=btn-take-gold]');
      const g = await page.evaluate(() => window.__GRAVEVOW__.getState().expedition.backpack.reduce((n, x) => n + (x?.itemId === 'gold_coins' ? x.qty : x?.gold ?? 0), 0));
      if (g <= before.gold) throw new Error('«Coger el oro» no metió monedas en la mochila');
    }
    await page.click('[data-testid=btn-take-all]');
    await page.click('[data-testid=btn-close-loot]');
  });
  await step('Abrir un cofre y coger el botín', async () => {
    await clearNear(18, 17);
    await tp(18, 17);
    await page.waitForTimeout(400);
    await shot('10-near-chest');
    await page.keyboard.press('e');
    await page.waitForSelector('[data-testid=loot-modal]');
    await shot('11-chest');
    await page.click('[data-testid=btn-take-all]');
    await page.click('[data-testid=btn-close-loot]');
  });
  const carried = (await st()).backpack;
  console.log('   mochila:', carried.join(', '));
  await step('Hablar con Kael y aliarse', async () => {
    // El esqueleto de la Sala de los Pilares podría interrumpir la prueba
    await page.evaluate(() => { for (const e of window.__GRAVEVOW__.scene().enemies) if (e.id === 'e_skel3' && !e.dead) { e.dead = true; e.sprite.destroy(); e.shadow.destroy(); } });
    const pos = await page.evaluate(() => { const r = window.__GRAVEVOW__.scene().rival; return [r.x, r.y]; });
    await tp(Math.floor(pos[0]) + 1, Math.floor(pos[1]));
    await page.waitForTimeout(300);
    await page.keyboard.press('e');
    if (await page.waitForSelector('[data-testid=interact-menu]', { timeout: 500 }).catch(() => null)) {
      const labels = await page.$$eval('[data-testid^=interact-]:not([data-testid=interact-menu])', (els) => els.map((e) => e.textContent));
      await page.keyboard.press(String(labels.findIndex((l) => /Kael/.test(l)) + 1));
    }
    await page.waitForSelector('[data-testid=rival-modal]');
    await page.click('[data-testid=rival-talk]');
    await page.click('[data-testid=rival-ally]');
    await shot('12-rival');
    const d = await page.evaluate(() => window.__GRAVEVOW__.getState().rival.disposition);
    if (d !== 'allied') throw new Error('Kael no se alió: ' + d);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    await shot('13-ally');
  });
  await step('Elegir entre varias acciones con E (Kael + cofre)', async () => {
    // Retira el esqueleto de esa sala para que la prueba no acabe en combate
    await page.evaluate(() => { for (const e of window.__GRAVEVOW__.scene().enemies) if (e.id === 'e_skel3' && !e.dead) { e.dead = true; e.sprite.destroy(); e.shadow.destroy(); } });
    await tp(3, 19);
    await page.waitForTimeout(2500); // Kael se acerca
    await page.evaluate(() => { const s = window.__GRAVEVOW__.scene(); const r = s.rival; r.x = s.player.x + 0.6; r.y = s.player.y; });
    await page.waitForTimeout(300);
    const prompt = await page.textContent('[data-testid=hud-prompt]');
    if (!/Elegir acción/.test(prompt)) throw new Error('el aviso no indica varias opciones: ' + prompt);
    await page.keyboard.press('e');
    await page.waitForSelector('[data-testid=interact-menu]');
    await shot('13b-interact-menu');
    const labels = await page.$$eval('[data-testid^=interact-]:not([data-testid=interact-menu])', (els) => els.map((e) => e.textContent));
    const idx = labels.findIndex((l) => /cofre|baúl|arca|relicario/i.test(l));
    if (idx < 0) throw new Error('no aparece el cofre: ' + labels);
    // Por si es un cofre con cerradura: una llave de hierro en la mochila
    await page.evaluate(() => { const s = window.__GRAVEVOW__.getState(); const i = s.expedition.backpack.findIndex((x) => !x); s.expedition.backpack[i] = { uid: 'k-test', itemId: 'iron_key', qty: 1 }; });
    await page.keyboard.press(String(idx + 1));
    if (await page.waitForSelector('[data-testid=chest-lock]', { timeout: 3000 }).catch(() => null)) { await shot('13c-chest-lock'); await page.click('[data-testid=btn-unlock]'); }
    if (!(await page.waitForSelector('[data-testid=loot-modal]', { timeout: 3000 }).catch(() => null))) { await shot('13d-debug'); throw new Error('sin botín: ' + JSON.stringify(await page.evaluate(() => { const s = window.__GRAVEVOW__.getState(); return { modal: s.modal, err: s.invError, keys: s.expedition.backpack.filter((x) => x && /key/.test(x.itemId)) }; }))); }
    // Reparto justo: le damos a Kael un objeto del cofre
    const first = await page.$('[data-testid^=slot-loot-][data-item]:not([data-item=""])');
    if (first && (await page.$('text=Kael espera su parte'))) {
      await first.click();
      await page.click('[data-testid=btn-give]');
    }
    await page.click('[data-testid=btn-close-loot]');
  });
  await step('Llegar al portal y extraer', async () => {
    await clearNear(5, 24);
    await tp(5, 24);
    await page.waitForTimeout(400);
    await shot('14-portal');
    await page.keyboard.press('e');
    await page.waitForTimeout(1500);
    await shot('15-channel');
    // Con Kael aliado, en el portal pide su parte del oro: se la pagamos
    const demand = await page.waitForSelector('[data-testid=rival-demand], [data-testid=summary]', { timeout: 30000 });
    if ((await demand.getAttribute('data-testid')) === 'rival-demand') { await shot('15b-rival-demand'); await page.click('[data-testid=rival-pay]'); }
    await page.waitForSelector('[data-testid=summary]', { timeout: 30000 });
    await page.waitForTimeout(400);
    await shot('16-summary');
    const t = await page.textContent('[data-testid=summary-title]');
    if (!/escapado/i.test(t)) throw new Error('resumen: ' + t);
  });
  await step('El botín aparece en el inventario del lobby', async () => {
    await leaveSummary(page);
    await page.click('[data-testid=tab-stash]');
    const lobbyItems = (await st()).backpack;
    console.log('\n   lobby:', lobbyItems.join(', '));
    for (const it of carried) if (!it.startsWith('gold_coins') && !lobbyItems.includes(it)) throw new Error('falta ' + it);
    await shot('17-lobby-after');
  });
  await step('Persistencia tras recargar', async () => {
    await page.reload();
    await page.waitForSelector('[data-testid=btn-play]');
    await page.click('[data-testid=btn-play]');
    await page.click('[data-testid=tab-stash]');
    const again = (await st()).backpack;
    for (const it of carried) if (!it.startsWith('gold_coins') && !again.includes(it)) throw new Error('tras recargar falta ' + it);
  });
  let firstSeed;
  await step('Segunda expedición: mapa procedural y extracción', async () => {
    await page.click('[data-testid=tab-play]');
    await page.click('[data-testid=btn-enter-dungeon]');
    await page.waitForTimeout(1200);
    const info = await page.textContent('[data-testid=hud-dungeon]');
    firstSeed = await page.evaluate(() => window.__GRAVEVOW__.getState().dungeon.seed);
    if (firstSeed === undefined) throw new Error('la segunda expedición no es procedural: ' + info);
    console.log('\n   mapa:', info);
    await shot('20-procedural-start');
    const portal = await page.evaluate(() => window.__GRAVEVOW__.getState().dungeon.entities.find((e) => e.kind === 'portal'));
    // Despeja enemigos junto al portal para que no interrumpan la prueba
    await page.evaluate(([px, py]) => { for (const e of window.__GRAVEVOW__.scene().enemies) if (!e.dead && Math.hypot(e.x - px, e.y - py) < 8) { e.dead = true; e.sprite.destroy(); e.shadow.destroy(); } }, [portal.x, portal.y]);
    await tp(portal.x, portal.y + 1);
    await page.waitForTimeout(600);
    await shot('21-procedural-portal');
    await page.keyboard.press('e');
    if (await page.$('[data-testid=interact-menu]')) {
      const labels = await page.$$eval('[data-testid^=interact-]:not([data-testid=interact-menu])', (els) => els.map((e) => e.textContent));
      await page.keyboard.press(String(labels.findIndex((l) => /portal/i.test(l)) + 1));
    }
    await page.waitForSelector('[data-testid=summary]', { timeout: 30000 });
    await leaveSummary(page);
  });
  await step('Morir pierde lo transportado (otro mapa distinto)', async () => {
    await page.click('[data-testid=tab-play]');
    await page.click('[data-testid=btn-enter-dungeon]');
    await page.waitForTimeout(800);
    const seed2 = await page.evaluate(() => window.__GRAVEVOW__.getState().dungeon.seed);
    if (seed2 === firstSeed) throw new Error('se repitió el mismo mapa');
    await page.evaluate(() => window.__GRAVEVOW__.actions.trapHit(9999));
    await page.waitForSelector('[data-testid=summary]');
    // Se pierde todo lo transportado y el intendente entrega el kit de recluta automáticamente
    await summaryPage(page, 3);
    await page.waitForSelector('[data-testid=recruit-kit]');
    await shot('18-death');
    await leaveSummary(page);
    const s = await st();
    if (s.backpack.join() !== 'bandagex2,stale_breadx1,waterx1') throw new Error('tras morir la mochila debería tener solo el kit de recluta (2 vendas, pan y agua): ' + s.backpack);
    const weapon = await page.evaluate(() => window.__GRAVEVOW__.getState().profile.equipment.mainHand?.itemId);
    if (weapon !== 'recruit_sword') throw new Error('el kit de recluta no equipó el arma: ' + weapon);
    await page.click('[data-testid=tab-stash]');
    await shot('19-lobby-after-death');
  });
  console.log('\nErrores de consola:', errors.length ? errors : 'ninguno');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(async (e) => { console.error('\nFALLO:', e.message); process.exit(2); });
