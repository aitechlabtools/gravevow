// Resultados en páginas: expedición, botín conseguido (solo lo nuevo) y tu cuerpo; saltar, teclado, deslizar, curar y «Ahora no»; muerte.
// node scripts/resultados-check.cjs <url>/play/ <carpeta> [dispositivo]
const { chromium, devices } = require('playwright'); const path = require('path'); const fs = require('fs');
const url = process.argv[2] || 'http://localhost:5173/play/'; const out = process.argv[3] || 'out'; const dev = process.argv[4];
fs.mkdirSync(out, { recursive: true });
const ok = (c, m) => { if (!c) { console.error('FALLO:', m); process.exitCode = 1; } else console.log('ok ·', m); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (s) => (dev ? p.tap(s) : p.click(s));
  const G = (f, a) => p.evaluate(f, a);
  const page = () => p.getAttribute('[data-testid=summary]', 'data-page').then(Number);
  const tag = dev ? 'tactil' : 'escritorio';
  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]');
  await p.waitForSelector('[data-testid=tab-play]');
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; g.setState({ tutorial: null, profile: { ...pr, tutorialDone: true, stats: { ...pr.stats, expeditions: 1 } } }); });
  // Bajar, coger botín nuevo y oro, recibir un golpe y extraer
  const enter = async () => { await G(async () => { await window.__GRAVEVOW__.actions.enterDungeon('afueras'); }); await p.waitForTimeout(900); };
  await enter();
  await G(() => {
    const g = window.__GRAVEVOW__, s = g.getState(), bp = [...s.expedition.backpack];
    const free = () => bp.findIndex((x) => !x);
    bp[free()] = { uid: 't1', itemId: 'dread_blade', qty: 1, rarity: 'legendary' };
    bp[free()] = { uid: 't2', itemId: 'iron_ore', qty: 3 };
    bp[free()] = { uid: 't3', itemId: 'gold_coins', qty: 17 };
    g.setState({ expedition: { ...s.expedition, backpack: bp, kills: { starving_wolf: 2 } } });
  });
  await G(() => window.__GRAVEVOW__.actions.trapHit(25));
  await G(() => window.__GRAVEVOW__.actions.finishExpedition('extracted'));
  await p.waitForSelector('[data-testid=summary]');
  ok(await page() === 1 && Number(await p.getAttribute('[data-testid=summary]', 'data-pages')) === 3, 'herido: tres páginas, empieza en la 1');
  ok(/escapado/i.test(await p.textContent('[data-testid=summary-title]')), 'título «Has escapado»');
  ok(await p.isVisible('[data-testid=summary-kills]'), 'criaturas abatidas con miniatura');
  await p.screenshot({ path: path.join(out, `resultados-${tag}-1.png`) });
  if (dev) {
    const bb = await p.locator('[data-testid=summary]').boundingBox();
    await p.mouse.move(bb.x + bb.width * 0.8, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * 0.2, bb.y + bb.height / 2, { steps: 5 }); await p.mouse.up();
    await p.waitForTimeout(200);
    ok(await page() === 2, 'deslizar pasa de página');
  } else {
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
    ok(await page() === 2, 'la flecha pasa de página');
  }
  const loot = await p.$$eval('[data-testid=summary-loot] [data-item]', (els) => els.map((e) => e.getAttribute('data-item')));
  ok(loot[0] === 'dread_blade' && loot.includes('iron_ore') && !loot.includes('gold_coins'), `solo lo nuevo, por rareza, sin monedas: ${loot}`);
  const kit = await G(() => window.__GRAVEVOW__.getState().profile.equipment.mainHand?.itemId);
  ok(!loot.includes(kit), 'no sale el equipo con el que bajaste');
  ok(/17/.test(await p.textContent('[data-testid=summary-gold]')), 'oro conseguido: solo el de más');
  await p.click('[data-testid=summary-loot] [data-item=dread_blade]', { force: true });
  await p.hover('[data-testid=summary-loot] [data-item=iron_ore]', { force: true }).catch(() => {});
  ok(!(await p.$('[data-testid=summary-item-card]')) && !(await p.$('[data-testid=tooltip-carry]')), 'tocar o pasar por encima no abre ninguna ficha');
  await p.screenshot({ path: path.join(out, `resultados-${tag}-2.png`) });
  await tap('[data-testid=summary-prev]'); ok(await page() === 1, '◂ Atrás vuelve');
  await tap('[data-testid=summary-skip]'); await p.waitForTimeout(150);
  ok(await page() === 3, 'Saltar, herido, lleva a «Tu cuerpo»');
  for (const id of ['cure-btn', 'cure-later', 'summary-prev']) { const bb = await p.locator(`[data-testid=${id}]`).boundingBox(); ok(bb.height >= 43.5 && bb.width >= 43.5, `${id} mide 44 px o más`); }
  await p.screenshot({ path: path.join(out, `resultados-${tag}-3.png`) });
  const over = await p.evaluate(() => { const e = document.querySelector('[data-testid=summary] .overflow-y-auto'); return e.scrollHeight - e.clientHeight; });
  ok(over <= 2, `«Tu cuerpo» cabe sin desplazar (${over})`);
  const g0 = await G(() => window.__GRAVEVOW__.getState().profile.gold);
  await tap('[data-testid=cure-btn]'); await p.waitForTimeout(300);
  const cured = await G(() => window.__GRAVEVOW__.getState().profile.wounds);
  ok(!cured && await p.isVisible('[data-testid=summary-cured]'), 'curarse deja entero y lo dice');
  ok(await G(() => window.__GRAVEVOW__.getState().profile.gold) < g0, 'se paga del almacén');
  await tap('[data-testid=btn-back-lobby]');
  await p.waitForSelector('[data-testid=tab-play]');
  // Sano y sin botín: dos páginas y «Ahora no» no existe
  await enter();
  await G(() => window.__GRAVEVOW__.actions.finishExpedition('extracted'));
  await p.waitForSelector('[data-testid=summary]');
  ok(Number(await p.getAttribute('[data-testid=summary]', 'data-pages')) === 2, 'sano: dos páginas');
  await tap('[data-testid=summary-next]');
  ok(await p.isVisible('[data-testid=summary-empty]'), 'sin botín: «Vuelves con las manos vacías…»');
  await tap('[data-testid=btn-back-lobby]');
  // Morir: lo perdido, el bolsillo y la cura por 1 de oro
  await enter();
  await G(() => { const g = window.__GRAVEVOW__, s = g.getState(), pk = [...s.expedition.pocket]; pk[0] = { uid: 'pk', itemId: 'iron_ore', qty: 1 }; g.setState({ expedition: { ...s.expedition, pocket: pk } }); });
  await G(() => window.__GRAVEVOW__.actions.trapHit(9999));
  await p.waitForSelector('[data-testid=summary]');
  ok(/muerto/i.test(await p.textContent('[data-testid=summary-title]')), 'muerte: «Has muerto»');
  await tap('[data-testid=summary-next]');
  ok(await p.isVisible('[data-testid=summary-saved]'), 'muerte: lo que salvó el bolsillo');
  await p.screenshot({ path: path.join(out, `resultados-${tag}-muerte-2.png`) });
  await tap('[data-testid=summary-next]');
  ok(/1 de oro|gratis/.test(await p.textContent('[data-testid=cure-btn]')), 'muerte: cura por 1 de oro (o gratis)');
  await p.screenshot({ path: path.join(out, `resultados-${tag}-muerte-3.png`) });
  await tap('[data-testid=cure-later]');
  await p.waitForSelector('[data-testid=tab-play]');
  ok(await G(() => !!window.__GRAVEVOW__.getState().profile.fallen), '«Ahora no» vuelve sin curarse');
  ok(errs.length === 0, 'sin errores de página ' + errs.join(' | '));
  await b.close();
})();
