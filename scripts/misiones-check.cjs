// Misiones: tablón, aceptar (máximo 5), fijar, dejar y recordatorio en Jugar y en la mazmorra.
// Uso: node scripts/misiones-check.cjs http://localhost:5173/play/ [carpeta] [dispositivo de Playwright]
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || 'misiones-shots';
const DEV = process.argv[4];
require('fs').mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(DEV ? devices[DEV] : { viewport: { width: 1440, height: 900 } });
  // Sin el aviso de cookies (en el móvil tapa «Crear»)
  await ctx.addInitScript(() => { try { localStorage.setItem('gv-consent', '{"analytics":false}'); } catch {} });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const tap = (sel) => (DEV ? p.tap(sel) : p.click(sel));
  const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
  const ok = (cond, msg) => { if (!cond) throw new Error(msg); console.log('✓ ' + msg); };
  const G = (fn, arg) => p.evaluate(fn, arg);

  await p.goto(BASE + '?debug');
  await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric');
  await tap('[data-testid=btn-create]');
  
  await tap('[data-testid=tab-quests]');
  await p.waitForSelector('[data-testid=quests-active]');
  ok(!(await p.$('[data-testid=claim-q_bones]')), 'al empezar no llevas misiones aceptadas');
  await shot('01-tablon');

  for (const [v, id] of [['vesper', 'q_bones'], ['nira', 'q_first_escape'], ['garth', 'q_garra_bandits'], ['garth', 'q_garra_rats'], ['brand', 'q_brand_mine']]) { await tap(`[data-testid=quests-${v}]`); await tap(`[data-testid=accept-${id}]`); }
  await tap('[data-testid=quests-vesper]');
  ok((await p.textContent('[data-testid=quests-active]')).includes('5/5'), 'se aceptan 5 misiones');
  ok(await p.isDisabled('[data-testid=accept-q_lord]'), 'con 5 aceptadas no se puede aceptar otra');
  ok(await p.isDisabled('[data-testid=accept-q_lord]') && /Tablón lleno/.test(await p.textContent('[data-testid=accept-q_lord]')), 'el encargo dice «Tablón lleno»');
  ok(!(await p.$('[data-testid=pin-q_bones]')), 'Fijar no se ve sin abrir la nota');
  ok(!(await p.$('[data-testid=quest-empty]')), 'con 5/5 no hay huecos libres');
  await tap('[data-testid=quest-open-q_bones]');
  await p.waitForSelector('[data-testid=quest-detail]'); await p.waitForTimeout(450);
  await shot('03-detalle');
  await tap('[data-testid=pin-q_bones]');
  ok(await p.$eval('[data-testid=quest-q_bones]', (e) => e.classList.contains('pinned')), 'la nota fijada lleva la chincheta');
  await tap('[data-testid=quest-detail-close]');
  await tap('[data-testid=quest-open-q_garra_rats]');
  await tap('[data-testid=abandon-q_garra_rats]');
  await tap('[data-testid=abandon-yes-q_garra_rats]');
  ok(!(await p.$('[data-testid=quest-q_garra_rats][data-mode=active]')), 'dejar una la devuelve al tablón');
  ok(!(await p.$('[data-testid=quest-detail]')), 'al dejarla se cierra el detalle');
  ok(!!(await p.$('[data-testid=quest-empty]')), 'aparece un hueco libre');
  // Lista para cobrar: Cobrar sale en la nota, sin abrirla
  await G(() => { const s = window.__GRAVEVOW__.getState(); const q = s.profile.quests.find((x) => x.id === 'q_brand_mine'); q.progress = 4; window.__GRAVEVOW__.actions.setHud({}); });
  await tap('[data-testid=tab-play]'); await tap('[data-testid=tab-quests]');
  await p.waitForSelector('[data-testid=claim-q_brand_mine]');
  await p.waitForTimeout(400); await shot('03c-lista');
  ok(await p.$eval('[data-testid=quest-q_brand_mine]', (e) => e.classList.contains('ready')), 'la nota cumplida brilla y tiene Cobrar');
  await tap('[data-testid=quests-help]');
  ok(/Si dejas una misión/.test(await p.textContent('[data-testid=quests-help-modal]')), 'el «?» explica cómo funcionan');
  await tap('[data-testid=quests-help-ok]');
  // Hueco libre: lleva al Bastión
  await tap('[data-testid=quest-empty]');
  await p.waitForSelector('[data-testid=screen-merchants]');
  ok(true, '«Ir al Bastión» abre el Bastión');
  // Pestaña Misiones del mercader: las mismas notas
  await tap('[data-testid=vendor-vesper]');
  await tap('[data-testid=vendor-view-quests]');
  await p.waitForSelector('[data-testid=vendor-quests] [data-testid=quest-q_bones][data-mode=active]');
  ok(true, 'el mercader enseña sus misiones con las mismas notas'); await p.waitForTimeout(400);
  await shot('03b-mercader');
  await tap('[data-testid=tab-quests]');
  await p.waitForTimeout(300);
  await shot('02-aceptadas');

  // (Que las de zonas muy bajas pasen a «Encargos antiguos» se prueba en tests/vendors.test.ts)
  await tap('[data-testid=tab-play]');
  await p.waitForSelector('[data-testid=jugar-pinned]');
  ok(/Polvo eres/.test(await p.textContent('[data-testid=jugar-pinned]')), 'la misión fijada se recuerda en Jugar');
  await shot('04-jugar');
  await G(() => { window.__GRAVEVOW__.getState().profile.tutorialSeen.dungeon = true; });
  await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1500);
  await p.waitForSelector('[data-testid=hud-pinned]');
  await G(() => { window.__GRAVEVOW__.getState().expedition.kills = { skeleton: 2 }; window.__GRAVEVOW__.actions.setHud({}); });
  await p.waitForTimeout(200);
  ok(/2\/3/.test(await p.textContent('[data-testid=hud-pinned]')), 'en la mazmorra se ve el progreso con las bajas de esta bajada');
  await shot('05-mazmorra');

  console.log('errores', errs.length ? errs : 'ninguno');
  await b.close();
  if (errs.length) process.exit(1);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
