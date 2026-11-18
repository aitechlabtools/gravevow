// Bestiario (galería de trofeos): marcos por conocimiento, jefes, victorias, desconocidas, ficha con candados,
// pestañas de zona y tamaños táctiles. Uso: node scripts/bestiario-check.cjs <url de /play/> [carpeta] [dispositivo o ANCHOxALTO]
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || 'bestiario-shots';
const DEV = process.argv[4];
require('fs').mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch();
  // DEV: un dispositivo de Playwright o un tamaño «ANCHOxALTO» (táctil si el alto es de tableta o menor)
  const wh = DEV && /^(\d+)x(\d+)$/.exec(DEV);
  const ctx = await b.newContext(wh ? { viewport: { width: +wh[1], height: +wh[2] }, hasTouch: +wh[1] < 1280, isMobile: +wh[2] <= 520 } : DEV ? devices[DEV] : { viewport: { width: 1920, height: 1080 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('gv-consent', '{"analytics":false}'); } catch {} });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const touch = wh ? +wh[1] < 1280 : !!DEV;
  const tap = (sel) => (touch ? p.tap(sel) : p.click(sel));
  const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
  const ok = (cond, msg) => { if (!cond) throw new Error(msg); console.log('✓ ' + msg); };

  await p.goto(BASE + '?debug');
  await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Beothord');
  await tap('[data-testid=btn-create]');
  // Récord de ejemplo: casi toda la Mazmorra, un jefe derrotado y otro visto sin derrotar
  await tap('[data-testid=tab-bestiary]');
  await p.waitForSelector('[data-testid=bestiary-grid]');
  const order = await p.$$eval('[data-testid=bestiary-grid] [data-testid^=beast-]', (es) => es.map((e) => e.dataset.testid.replace('beast-', '')).filter((x) => !x.startsWith('kills-') && !x.startsWith('boss-')));
  const kills = [21, 18, 13, 15, 4, 0, 20, 17, 15, 10, 9, 1, 3, 0, 2, 2, 1];
  await p.evaluate(({ order, kills }) => {
    const s = window.__GRAVEVOW__.getState(); const pr = s.profile;
    order.forEach((id, i) => { if (i < kills.length) pr.bestiary[id] = { seen: Math.max(1, kills[i]), kills: kills[i] }; });
    pr.stats.kills = 155;
  }, { order, kills });
  await tap('[data-testid=tab-play]'); await tap('[data-testid=tab-bestiary]');
  await p.waitForSelector('[data-testid=bestiary-grid]'); await p.waitForTimeout(500);
  await shot('1-bestiario');

  const know = await p.$$eval('[data-testid=bestiary-grid] .btile', (es) => es.map((e) => Number(e.dataset.knowledge)));
  ok([0, 1, 2, 3].every((k) => know.includes(k)), 'hay casillas de los cuatro niveles de conocimiento');
  const borders = await p.$$eval('[data-testid=bestiary-grid] .btile:not(.boss)', (es) => [...new Set(es.map((e) => e.dataset.knowledge + ':' + getComputedStyle(e).borderTopColor))]);
  ok(new Set(borders.map((x) => x.split(':')[1])).size >= 3, 'el borde cambia de color con el conocimiento');
  ok(await p.$$eval('[data-testid=bestiary-grid] .btile', (es) => es.every((e) => !getComputedStyle(e).backgroundImage.includes('gradient'))), 'las casillas no llevan degradado');
  const bosses = await p.$$eval('.btile.boss', (es) => es.map((e) => e.className.includes('down')));
  ok(bosses.includes(true) && bosses.includes(false), 'hay un jefe derrotado y otro por derrotar');
  ok(/Derrotado/.test(await p.textContent('.btile.boss.down')), 'el jefe derrotado lleva «Derrotado»');
  ok(/Por derrotar/.test(await p.textContent('.btile.boss:not(.down)')), 'el jefe sin derrotar lleva «Por derrotar»');
  ok(await p.$eval('.btile.boss', (e) => e.getBoundingClientRect().width > document.querySelector('.btile:not(.boss)').getBoundingClientRect().width * 1.6), 'los jefes ocupan dos casillas');
  ok((await p.textContent(`[data-testid=beast-kills-${order[0]}]`)).trim() === '21', 'las victorias salen en la esquina');
  ok(await p.isDisabled('.btile.unknown') && /\?\?\?/.test(await p.textContent('.btile.unknown')), 'la desconocida es una silueta «???» que no se abre');
  ok(/155/.test(await p.textContent('[data-testid=bestiary-summary]')) && /\/60/.test(await p.textContent('[data-testid=bestiary-progress]')), 'la cabecera resume derrotadas, jefes y conocidas');

  // Ficha a medias (rata de osario, 3 victorias) y completa (primera, 21)
  await tap(`[data-testid=beast-${order[12]}]`);
  await p.waitForSelector('[data-testid=beast-card]'); await p.waitForTimeout(450);
  ok((await p.$$('[data-testid=beast-locked]')).length === 3, 'a medias: habilidades, estadísticas y botín con candado');
  ok(/Derrótala 2 veces más/.test(await p.textContent('[data-testid=beast-card]')), 'el candado dice cuántas veces faltan');
  await shot('2-ficha-a-medias');
  await p.keyboard.press('Escape').catch(() => {});
  if (await p.$('[data-testid=beast-card]')) await tap('[data-testid=beast-close]');
  ok(!(await p.$('[data-testid=beast-card]')), 'la ficha se cierra');
  await tap(`[data-testid=beast-${order[0]}]`);
  await p.waitForSelector('[data-testid=beast-card]'); await p.waitForTimeout(450);
  ok((await p.$$('[data-testid=beast-locked]')).length === 0 && /Estudiada/.test(await p.textContent('[data-testid=beast-knowledge]')), 'completa: todo desbloqueado');
  await shot('3-ficha-completa');
  await tap('[data-testid=beast-close]');

  // Pestañas de zona y tamaños táctiles
  await tap('[data-testid=bestiary-zone-cripta]'); await p.waitForTimeout(300);
  ok((await p.$$('.btile.unknown')).length > 10, 'la Cripta enseña sus siluetas');
  await shot('4-cripta');
  const small = await p.$$eval('[data-testid=bestiary] button', (es) => es.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).length);
  ok(small === 0, 'todo lo que se toca mide 44 px o más');

  console.log('errores', errs.length ? errs : 'ninguno');
  await b.close();
  if (errs.length) process.exit(1);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
