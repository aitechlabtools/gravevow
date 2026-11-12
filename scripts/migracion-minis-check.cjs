// Tutoriales, fase 8: una partida antigua (sin mini tutoriales guardados) da por visto lo que ya ha usado.
// Veterano con expediciones, reputación con Nira y la cocina construida: sin «!» en las pestañas, en Nira ni en la
// cocina; con «!» en Garth y en el banco (aún sin construir no sale, así que se mira un mercader sin reputación).
// Uso: node scripts/migracion-minis-check.cjs <url>/play/ <carpeta> [dispositivo]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const [,, url = 'http://localhost:5173/play/', out = 'migracion-minis', dev] = process.argv;
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  const fail = (m) => { console.log('FALLO:', m); process.exitCode = 1; };
  const G = (fn, arg) => p.evaluate(fn, arg);
  const has = async (sel) => !!(await p.$(sel));
  const shot = (n) => p.screenshot({ path: `${out}/${n}.png` });
  const origin = new URL(url).origin;

  // Personaje de base para sacar un perfil válido
  await p.goto(url + '?debug');
  await G(() => new Promise((r) => { const q = indexedDB.deleteDatabase('gravevow'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  await p.reload(); await p.waitForSelector('[data-testid=btn-play]');
  await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric');
  await tap('[data-testid=class-warrior]');
  await tap('[data-testid=btn-create]');
  await p.waitForTimeout(500);
  const old = await G(() => {
    const pr = structuredClone(window.__GRAVEVOW__.getState().profile);
    Object.assign(pr, { tutorialDone: true, tutorialSeen: { lobby: true, dungeon: true }, stats: { expeditions: 12, extractions: 9, deaths: 3, kills: 80 },
      reputation: { nira: 150 }, refuge: { cot: 1, kitchen: 1, bench: 0, infirmary: 0, forge: 0, alchemy: 0, runic: 0, v: 2 }, version: 2 });
    return pr;
  });
  // Se escribe en una página del mismo origen sin el juego, para que nada guarde encima
  await p.goto(origin + '/robots.txt');
  await G((old) => new Promise((res, rej) => {
    const q = indexedDB.deleteDatabase('gravevow');
    q.onsuccess = () => { const o = indexedDB.open('gravevow', 1); o.onupgradeneeded = () => o.result.createObjectStore('save');
      o.onsuccess = () => { const tx = o.result.transaction('save', 'readwrite'); tx.objectStore('save').put(old, 'profile'); tx.oncomplete = () => { o.result.close(); res(); }; tx.onerror = () => rej(tx.error); }; };
    q.onerror = () => rej(q.error);
  }), old);

  await p.goto(url + '?debug&minis'); await p.waitForSelector('[data-testid=btn-play]');
  if (await p.waitForSelector('[data-testid=btn-notice-ok]', { timeout: 2000 }).catch(() => null)) await tap('[data-testid=btn-notice-ok]');
  await tap('[data-testid=btn-play]');
  await p.waitForSelector('[data-testid=tab-play]', { timeout: 8000 });
  await p.waitForTimeout(600);
  const seen = await G(() => window.__GRAVEVOW__.getState().tutorials.seen);
  for (const id of ['bienvenida', 'tab.misiones', 'vendor.nira', 'station.kitchen', 'exp.clock']) if (!seen.includes(id)) fail(`no se dio por visto ${id}`);
  for (const id of ['vendor.garth', 'station.forge']) if (seen.includes(id)) fail(`se dio por visto ${id} sin haberlo usado`);
  if (await has('[data-testid=mini-tutorial]')) fail('sale un mini tutorial nada más entrar');
  for (const t of ['quests', 'bestiary', 'shop', 'character']) if (await has(`[data-testid=tut-dot-tab-${t}]`)) fail(`«!» en la pestaña ${t}`);
  await shot('1-bastion');

  await tap('[data-testid=tab-merchants]');
  if (await has('[data-testid=tut-dot-bastion-merchants]')) fail('«!» en Mercaderes');
  await tap('[data-testid=btn-merchants]'); await p.waitForTimeout(300);
  if (await has('[data-testid=tut-dot-vendor-card-nira]')) fail('«!» en Nira, con la que ya ha comerciado');
  if (!(await has('[data-testid=tut-dot-vendor-card-garth]'))) fail('falta el «!» en Garth, al que nunca ha visitado');
  await shot('2-mercaderes');
  if (errs.length) fail('errores: ' + errs.join(' | '));
  console.log(process.exitCode ? 'Con fallos' : 'OK: la partida antigua solo enseña lo que aún no ha usado');
  await b.close();
})();
