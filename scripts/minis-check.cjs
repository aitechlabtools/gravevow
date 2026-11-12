// Sistema de mini tutoriales (bloque 3, fase 1). Con ?debug&minis.
// Comprueba: «!» dorado en las pestañas con mini tutorial pendiente; al abrir Misiones sale el cartel del intendente con
// hueco sobre la pantalla, 2 pasos, «Siguiente»/«Entendido» y «Saltar» de 44 px; queda visto en la cuenta (sin «!» y no se
// repite al volver ni tras recargar); espera mientras hay otra ventana abierta; sin desbordes; retrato a escala entera.
// Uso: node scripts/minis-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'minis', dev] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1920, height: 1080 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  const fail = (m) => { console.log('FALLO:', m); process.exitCode = 1; };
  const G = (fn, arg) => p.evaluate(fn, arg);
  const card = async (where) => {
    const r = await G(() => {
      const box = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, t: r.top, b: r.bottom, l: r.left, r: r.right }; };
      const img = document.querySelector('[data-testid=mini-card] img');
      return { hx: document.documentElement.scrollWidth - innerWidth, vw: innerWidth, vh: innerHeight, card: box('[data-testid=mini-card]'),
        btns: [...document.querySelectorAll('[data-testid=mini-card] button')].map((e) => { const r = e.getBoundingClientRect(); return [e.textContent, r.width, r.height]; }),
        k: img ? img.getBoundingClientRect().width / img.naturalWidth : 0 };
    });
    if (r.hx > 1) fail(where + ': desborde horizontal');
    if (!r.card || r.card.l < 0 || r.card.r > r.vw || r.card.t < 0 || r.card.b > r.vh) fail(where + ': el cartel se sale de la pantalla');
    for (const [t, w, h] of r.btns) if (w < 43.5 || h < 43.5) fail(`${where}: «${t}» mide menos de 44 px`);
    if (!r.k || Math.abs(r.k - Math.round(r.k)) > 0.01) fail(where + ': retrato sin escala entera ' + r.k);
  };
  await p.goto(url + '?debug&minis'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]');
  // La bienvenida del lobby (ventana) está abierta: aún no sale ningún mini tutorial
  await p.waitForSelector('[data-testid=tut-dot-tab-quests]').catch(() => fail('Misiones no tiene el «!» de pendiente'));
  if (!(await p.$('[data-testid=tut-dot-tab-shop]'))) fail('Tienda no tiene el «!»');
  if (await p.$('[data-testid=tut-dot-tab-play]')) fail('Jugar tiene «!» sin mini tutorial');
  await G(() => window.__GRAVEVOW__.actions.tutorialEvent('tab:quests'));
  await p.waitForTimeout(400);
  if (await p.$('[data-testid=mini-tutorial]')) fail('sale encima de otra ventana');
  
  await p.waitForSelector('[data-testid=mini-tutorial]', { timeout: 2000 }).catch(() => fail('no sale al cerrar la ventana'));
  await tap('[data-testid=mini-skip]');
  // Abrir Misiones de verdad (ya visto por el atajo de arriba → no sale): reiniciar y probar el flujo completo
  await G(() => window.__GRAVEVOW__.actions.resetMinis());
  await tap('[data-testid=tab-quests]');
  await p.waitForSelector('[data-testid=mini-tutorial][data-mini="tab.misiones"]').catch(() => fail('no sale al abrir Misiones'));
  if (!(await p.$('[data-testid=mini-hole]'))) fail('no resalta la pantalla de Misiones');
  if (!/intendente/i.test(await p.textContent('[data-testid=mini-narrator]'))) fail('no lo cuenta el intendente');
  if ((await p.textContent('[data-testid=mini-count]')).trim() !== '1/2') fail('no dice 1/2');
  await p.waitForTimeout(350); await card('Paso 1'); await p.screenshot({ path: out + '-1-paso1.png' });
  // El resto de la pantalla no se puede tocar
  await (dev ? p.tap('[data-testid=tab-shop]', { force: true }) : p.click('[data-testid=tab-shop]', { force: true })).catch(() => {});
  if (!(await p.$('[data-testid=screen-quests]'))) fail('se pudo cambiar de pestaña con el tutorial abierto');
  await tap('[data-testid=mini-ok]');
  if (!/Entendido/.test(await p.textContent('[data-testid=mini-ok]'))) fail('el último paso no dice «Entendido»');
  await card('Paso 2'); await p.screenshot({ path: out + '-2-paso2.png' });
  await tap('[data-testid=mini-ok]');
  if (await p.$('[data-testid=mini-tutorial]')) fail('no se cierra tras el último paso');
  if (await p.$('[data-testid=tut-dot-tab-quests]')) fail('el «!» de Misiones sigue tras verlo');
  await tap('[data-testid=tab-play]'); await tap('[data-testid=tab-quests]'); await p.waitForTimeout(300);
  if (await p.$('[data-testid=mini-tutorial]')) fail('se repite al volver a Misiones');
  // Guardado en la cuenta: tras recargar sigue visto
  await p.waitForTimeout(800);
  await p.reload(); await tap('[data-testid=btn-play]');
  await p.waitForSelector('[data-testid=lobby-nav]', { timeout: 5000 }).catch(() => fail('no vuelve al lobby tras recargar'));
  if (await p.$('[data-testid=tut-dot-tab-quests]')) fail('tras recargar, Misiones vuelve a tener «!»');
  if (!(await p.$('[data-testid=tut-dot-tab-shop]'))) fail('tras recargar, Tienda perdió su «!»');
  // Desactivados: sin «!» ni carteles
  await G(() => window.__GRAVEVOW__.actions.setMinisDisabled(true));
  await tap('[data-testid=tab-shop]'); await p.waitForTimeout(300);
  if (await p.$('[data-testid=mini-tutorial]') || await p.$('[data-testid^=tut-dot-]')) fail('desactivados siguen saliendo');
  console.log(dev || 'escritorio', 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
