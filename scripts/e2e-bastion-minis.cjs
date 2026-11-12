// Prueba de los mini tutoriales del Bastión y de las estaciones (fase 4, data/tutorials.ts): el «!» en las tarjetas,
// la entrada de Mercaderes (lleva a Nira), el de Nira, el del Refugio (lleva a Detalles de la cocina), construir la cocina
// con regalo de materiales, el de la cocina con crafteo real, el aviso de subida de nivel aunque estén desactivados, la
// primera venta, Intendencia › Estado y la copia de seguridad. Todos los botones del cartel miden 44 px.
// Uso: node scripts/e2e-bastion-minis.cjs [url] [carpeta] [dispositivo de Playwright]
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/claude-0/bastion-minis';
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
  const tap = async (sel) => { await page.waitForSelector(sel, { timeout: 8000 }); if (touch) await page.tap(sel); else await page.click(sel); await page.waitForTimeout(250); };
  const G = (fn, a) => page.evaluate(fn, a);
  const ok = (c, msg) => { if (!c) throw new Error(msg); console.log('✓', msg); };
  const size44 = async (sel) => { const r = await page.$eval(sel, (e) => { const b = e.getBoundingClientRect(); return [b.width, b.height]; }); return r[0] >= 44 && r[1] >= 44; };
  const mini = () => G(() => { const e = document.querySelector('[data-testid=mini-tutorial]'); return e ? { id: e.dataset.mini, step: +e.dataset.step } : null; });
  const waitMini = async (id) => { for (let i = 0; i < 30; i++) { const m = await mini(); if (m && m.id === id) return m; await page.waitForTimeout(200); } throw new Error(`no sale el mini tutorial ${id} (está ${JSON.stringify(await mini())})`); };
  const count = (id) => G((id) => { const pr = window.__GRAVEVOW__.getState().profile; return [...pr.backpack, ...pr.stash].filter((x) => x && x.itemId === id).reduce((t, x) => t + x.qty, 0); }, id);
  let shot = 0;
  // Recorre un mini tutorial entero: «Siguiente» o tocar el hueco cuando hay acción real
  const walk = async (id) => {
    await waitMini(id);
    ok(await size44('[data-testid=mini-skip]'), `${id}: «Saltar» mide 44 px`);
    for (let i = 0; i < 6; i++) {
      const m = await mini();
      if (!m || m.id !== id) break;
      await page.screenshot({ path: `${OUT}/${String(++shot).padStart(2, '0')}-${id}-${m.step + 1}.png` });
      if (await page.$('[data-testid=mini-wait]')) {
        const hole = await page.$eval('[data-testid=mini-hole]', (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
        if (touch) await page.touchscreen.tap(hole[0], hole[1]); else await page.mouse.click(hole[0], hole[1]);
      } else {
        ok(await size44('[data-testid=mini-ok]'), `${id} paso ${m.step + 1}: el botón mide 44 px`);
        await tap('[data-testid=mini-ok]');
      }
      await page.waitForTimeout(350);
    }
    ok(await G((id) => window.__GRAVEVOW__.getState().tutorials.seen.includes(id), id), `${id}: terminado y visto`);
  };

  await page.goto(BASE + '?debug&minis');
  await G(() => indexedDB.deleteDatabase('gravevow'));
  await G(() => { try { localStorage.setItem('gravevow.tutorialDone', '1'); } catch {} });
  await page.reload();
  await tap('[data-testid=btn-play]');
  await G(() => document.fullscreenElement && document.exitFullscreen());
  await page.fill('[data-testid=name-input]', 'Bastiona');
  if (!(await page.isChecked('[data-testid=skip-tutorial]'))) await tap('[data-testid=skip-tutorial]');
  await tap('[data-testid=btn-create]');
  await waitMini('bienvenida');
  await tap('[data-testid=mini-skip]');
  // Oro y materiales para pedir la cocina (2 chatarra y 2 setas) y luego subirla a nivel 2, y algo que vender
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
    const st = pr.stash.slice(); let k = 0; const put = (itemId, qty) => { while (st[k]) k++; st[k] = { uid: 'm' + k, itemId, qty }; };
    put('scrap_metal', 8); put('cave_mushroom', 2); put('leather_scrap', 4); put('iron_ore', 2); put('bone_dust', 3);
    g.setState({ profile: { ...pr, stash: st, gold: 300 } }); });

  await tap('[data-testid=tab-merchants]');
  await page.waitForSelector('[data-testid=screen-bastion]');
  ok(!!(await page.$('[data-testid=tut-dot-bastion-merchants]')) && !!(await page.$('[data-testid=tut-dot-bastion-refuge]')), 'el «!» sale en Mercaderes y en Refugio');
  await tap('[data-testid=btn-merchants]');
  await walk('screen.bastion-entry');
  ok(!!(await page.$('[data-testid=vendor-interior]')) && (await page.textContent('[data-testid=vendor-name]')).includes('Nira'), 'tocar Hablar te deja dentro de Nira');
  await walk('vendor.nira');

  // Primera venta: marcar materiales y vender
  await tap('[data-testid=vendor-view-sell]');
  await tap('[data-testid=mark-materials]');
  await tap('[data-testid=btn-sell-marked]');
  if (await page.$('[data-testid=btn-confirm-sell]')) await tap('[data-testid=btn-confirm-sell]');
  await walk('bastion.first-sale');
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
    const st = pr.stash.slice(); let k = 0; const put = (itemId, qty) => { while (st[k]) k++; st[k] = { uid: 'n' + k, itemId, qty }; };
    put('scrap_metal', 8); put('cave_mushroom', 2); put('leather_scrap', 4); put('iron_ore', 2);
    g.setState({ profile: { ...pr, stash: st, gold: 300 } }); });

  await tap('[data-testid=vendor-back]');
  await tap('[data-testid=merchants-back]');
  ok(!(await page.$('[data-testid=tut-dot-bastion-merchants]')), 'visto, el «!» de Mercaderes se va');
  await tap('[data-testid=btn-refuge]');
  await walk('tab.refugio');
  ok(!!(await page.$('[data-testid=station-detail-kitchen]')), 'el Refugio acaba en los Detalles de la cocina');

  // Construir la cocina: Garth regala los materiales de la primera receta
  const meat0 = await count('salted_meat');
  await tap('[data-testid=upgrade-kitchen]');
  ok(await G(() => window.__GRAVEVOW__.getState().profile.refuge.kitchen === 1), 'cocina construida');
  ok((await count('salted_meat')) === meat0 + 1, 'Garth regala la carne salada de la primera receta');
  await tap('[data-testid=detail-back]');
  ok(!!(await page.$('[data-testid=tut-dot-module-kitchen]')), 'la cocina construida lleva el «!»');
  await tap('[data-testid=enter-kitchen]');
  const jerky0 = await count('jerky');
  await walk('station.kitchen');
  ok((await count('jerky')) === jerky0 + 1, 'en el mini tutorial se craftea de verdad (cecina al almacén)');

  // Subida a nivel 2 con los mini tutoriales desactivados: el aviso sale igual
  await G(() => window.__GRAVEVOW__.actions.setMinisDisabled(true));
  await tap('[data-testid=craft-back]');
  await tap('[data-testid=details-kitchen]');
  await tap('[data-testid=upgrade-kitchen]');
  ok(await G(() => window.__GRAVEVOW__.getState().profile.refuge.kitchen === 2), 'cocina a nivel 2');
  await walk('station.kitchen.lv2');
  await G(() => window.__GRAVEVOW__.actions.setMinisDisabled(false));

  // Intendencia › Estado
  await tap('[data-testid=tab-stash]');
  const seg = await page.$('[data-testid=alijo-seg] button:has-text("Estado")');
  if (touch) await seg.tap(); else await seg.click();
  await walk('tab.intendencia');

  // Copia de seguridad (desde Ajustes)
  await tap('[data-testid=btn-lobby-settings]');
  await tap('[data-testid=settings-tab-game]');
  await tap('[data-testid=settings-open-backup]');
  await walk('screen.backup');

  console.log('errores:', errors.length ? errors : 'ninguno');
  await b.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error('FALLO', e.message); process.exit(1); });
