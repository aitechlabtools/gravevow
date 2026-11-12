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

  for (const id of ['q_bones', 'q_first_escape', 'q_garra_bandits', 'q_garra_rats', 'q_brand_mine']) await tap(`[data-testid=accept-${id}]`);
  ok((await p.textContent('[data-testid=quests-active]')).includes('5/5'), 'se aceptan 5 misiones');
  ok(await p.isDisabled('[data-testid=accept-q_lord]'), 'con 5 aceptadas no se puede aceptar otra');
  await tap('[data-testid=pin-q_bones]');
  await tap('[data-testid=abandon-q_garra_rats]');
  await tap('[data-testid=abandon-yes-q_garra_rats]');
  ok(!(await p.$('[data-testid=quest-q_garra_rats][data-mode=active]')), 'dejar una la devuelve al tablón');
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
