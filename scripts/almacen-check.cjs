// Prueba del almacén por páginas en los tres formatos: migración de un almacén antiguo (con el oro devuelto),
// comprar páginas, mover un objeto a otra página tocando la pestaña, «Ordenar» solo la página vista,
// página «Compartido» vista desde otro personaje, 44 px en táctil y nada que se salga de la pantalla.
// En escritorio comprueba además que la página entera (120 casillas) se ve sin desplazar.
// Uso: node scripts/almacen-check.cjs [url] [carpeta-capturas]
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/almacen-check';
fs.mkdirSync(OUT, { recursive: true });
const SIZES = [
  { n: 'escritorio', vp: { width: 1920, height: 1080 }, touch: false },
  { n: 'tableta', vp: { width: 1180, height: 820 }, touch: true },
  { n: 'movil', vp: { width: 844, height: 390 }, touch: true },
];

async function run(s) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: s.vp, hasTouch: s.touch, isMobile: s.touch });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !/favicon|DevTools/.test(m.text()) && errs.push(m.text()));
  const act = async (id) => { const sel = `[data-testid=${id}]`; await p.waitForSelector(sel, { timeout: 5000 }); if (s.touch) await p.tap(sel); else await p.click(sel); await p.waitForTimeout(250); };
  const fail = (m) => { throw new Error(`${s.n}: ${m}`); };
  const prof = () => p.evaluate(() => { const st = window.__GRAVEVOW__.getState(); return { gold: st.profile?.gold, len: st.profile?.stash.length, shared: st.profile?.shared?.filter((y) => y && y.itemId !== 'cover').length ?? null, page: st.stashPage, stash: st.profile?.stash.map((x) => x && x.uid), name: st.profile?.character.name }; });
  const small = async () => s.touch ? p.evaluate(() => [...document.querySelectorAll('button, a.btn')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 43.5 || r.height < 43.5); }).map((e) => (e.getAttribute('data-testid') || e.textContent || '').trim().slice(0, 30))) : [];
  const openStash = async () => { await act('tab-stash'); if (await p.$('[data-testid=seg-storage]')) await act('seg-storage'); };

  // 1 · Partida antigua: un solo perfil con el almacén ampliado 2 veces (56 casillas) y 50 objetos
  await p.goto(URL + '?debug');
  await p.evaluate(() => indexedDB.deleteDatabase('gravevow'));
  await p.reload(); await p.waitForTimeout(600);
  await act('btn-play'); await p.evaluate(() => document.fullscreenElement && document.exitFullscreen());
  await p.fill('[data-testid=name-input]', 'Aldric'); await act('btn-create'); await act('btn-tutorial-ok');
  await p.waitForTimeout(300);
  await p.evaluate(async () => {
    const pr = { ...window.__GRAVEVOW__.getState().profile, gold: 1000 };
    pr.stash = Array.from({ length: 56 }, (_, i) => (i < 50 ? { uid: `s${i}`, itemId: i % 3 ? 'health_potion' : 'iron_sword', qty: 1 } : null));
    delete pr.shared; delete pr.goldPhysical; // partida de antes del oro físico
    const db = await new Promise((r) => { const q = indexedDB.open('gravevow', 1); q.onsuccess = () => r(q.result); });
    await new Promise((r) => { const tx = db.transaction('save', 'readwrite'); const st = tx.objectStore('save'); st.delete('save'); st.put(JSON.parse(JSON.stringify(pr)), 'profile'); tx.oncomplete = r; });
  });
  await p.reload(); await p.waitForTimeout(800);
  const note = await p.textContent('body');
  if (!/El almacén tiene páginas/.test(note) || !/devolvemos/.test(note) || !/El oro ahora pesa/.test(note)) fail('falta el aviso del oro devuelto y del oro físico');
  await p.screenshot({ path: `${OUT}/${s.n}-aviso.png` });
  await p.click('text=Entendido');
  let x = await prof();
  const items = await p.evaluate(() => window.__GRAVEVOW__.getState().profile.stash.filter((y) => y && /sword|potion/.test(y.itemId)).length);
  if (x.gold !== 300 || x.len !== 120 || items !== 50) fail('migración: (1000 + 2000 devueltos) ÷ 10 = 300 monedas: ' + JSON.stringify({ gold: x.gold, len: x.len, items }));
  await act('btn-play');
  await openStash();
  await p.screenshot({ path: `${OUT}/${s.n}-pagina1.png` });
  if (s.n === 'escritorio') {
    const fits = await p.evaluate(() => { const g = document.querySelector('[data-testid=alijo-storage] [data-testid=grid-stash]'); const sc = g.closest('.overflow-y-auto'); return { cells: g.children.length, fits: sc.scrollHeight <= sc.clientHeight + 1 }; });
    if (!fits.fits) fail('en escritorio la página debe verse entera sin desplazar: ' + JSON.stringify(fits));
  }
  // 1b · Saco de 2×2 (Fase 6: abajo, donde quedan casillas libres tras las espadas de 3×1): de la mochila a la página 1 tocándolo y tocando una casilla libre; ocupa 4 casillas
  await p.evaluate(() => { const G = window.__GRAVEVOW__; const pr = G.getState().profile; const bp = pr.backpack.map(() => null);
    bp[0] = { uid: 'SACO', itemId: 'gold_sack', qty: 1 }; for (const k of [1, 6, 7]) bp[k] = { uid: 'cover:SACO', itemId: 'cover', qty: 1 };
    G.setState({ profile: { ...pr, backpack: bp } }); });
  await p.waitForTimeout(200);
  if (await p.$('[data-testid=seg-gear]') && !(await p.$('[data-testid=slot-backpack-0]'))) await act('seg-gear');
  await act('slot-backpack-0');
  // Primer hueco libre de 2×2 en la página 1 (tras la migración, las espadas de 3×1 ocupan sitios distintos)
  const T = await p.evaluate(() => { const s = window.__GRAVEVOW__.getState().profile.stash; for (let i = 0; i < 112; i++) if (i % 8 < 7 && Math.floor(i / 8) % 15 < 14 && [i, i + 1, i + 8, i + 9].every((k) => !s[k])) return i; return -1; });
  // En el móvil la ficha del objeto ocupa la parte de abajo: se sube la casilla de destino antes de tocarla
  // (en el móvil la ficha del objeto tapa la parte de abajo de la pantalla: el toque se manda directamente a la casilla)
  if (s.n === 'movil') { await p.$eval(`[data-testid=slot-stash-${T}]`, (e) => e.click()); await p.waitForTimeout(250); } else await act(`slot-stash-${T}`);
  x = await prof();
  const st60 = await p.evaluate((T) => { const s = window.__GRAVEVOW__.getState().profile.stash; return [T, T + 1, T + 8, T + 9].map((i) => s[i]?.itemId).join(); }, T);
  if (st60 !== 'gold_sack,cover,cover,cover') fail('el saco debe ocupar 2×2 en el almacén: ' + st60);
  // Una casilla suelta y vacía para comparar el tamaño
  const U = await p.evaluate(() => window.__GRAVEVOW__.getState().profile.stash.findIndex((x, i) => !x && i < 120));
  const box = await p.$eval(`[data-testid=slot-stash-${T}]`, (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
  const one = await p.$eval(`[data-testid=slot-stash-${U}]`, (e) => Math.round(e.getBoundingClientRect().width));
  if (box[0] < one * 2 || box[1] < one * 2) fail('el saco debe verse de 2×2: ' + box + ' / ' + one);
  await p.screenshot({ path: `${OUT}/${s.n}-saco.png` });
  if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) fail('el Alijo se sale en horizontal (8 columnas)');
  // 1c · Oro físico: sacar monedas de un saquito con el selector y «Agrupar oro»
  await p.evaluate(() => { const G = window.__GRAVEVOW__; const pr = G.getState().profile; const bp = pr.backpack.map(() => null);
    bp[0] = { uid: 'P1', itemId: 'gold_pouch', qty: 1, gold: 37 }; bp[1] = { uid: 'C1', itemId: 'gold_coins', qty: 7 };
    G.setState({ profile: { ...pr, backpack: bp } }); });
  await p.waitForTimeout(200);
  await act('slot-backpack-0');
  await p.screenshot({ path: `${OUT}/${s.n}-saquito.png` });
  const sheetBtn = async (id) => { const els = await p.$$(`[data-testid=${id}]`); for (const e of els) if (await e.isVisible()) { if (s.touch) await e.tap(); else await e.click(); await p.waitForTimeout(250); return; } fail('no se ve ' + id); };
  await sheetBtn('act-withdraw');
  await act('amt-mas10');
  await p.screenshot({ path: `${OUT}/${s.n}-sacar.png` });
  await act('amt-confirm');
  let gold = await p.evaluate(() => window.__GRAVEVOW__.getState().profile.backpack.map((x) => x ? `${x.itemId}:${x.qty}:${x.gold ?? ''}` : '-').slice(0, 5).join());
  if (!gold.startsWith('gold_pouch:1:17,gold_coins:10:,gold_coins:10:,gold_coins:7:')) fail('sacar 20 monedas: ' + gold);
  await act('group-gold-backpack');
  gold = await p.evaluate(() => window.__GRAVEVOW__.getState().profile.backpack.filter(Boolean).map((x) => `${x.itemId}:${x.gold ?? x.qty}`).join());
  if (gold !== 'gold_pouch:44') fail('agrupar oro: ' + gold);
  await p.evaluate(() => { const G = window.__GRAVEVOW__; const pr = G.getState().profile; G.setState({ profile: { ...pr, backpack: pr.backpack.map(() => null) } }); });
  await act('slot-backpack-5'); // suelta la elección
  // 2 · Comprar la página 2 (250) y la «Compartido» (1500). Con más oro, los sacos (2×2) no cabrían en la página 1 y el juego daría la 2 gratis
  await p.evaluate(() => { const G = window.__GRAVEVOW__; const pr = G.getState().profile; G.setState({ profile: { ...pr, stash: pr.stash.map((x, i) => (i === 0 ? { uid: 's0', itemId: 'iron_sword', qty: 1 } : i < 3 ? { uid: 'cover:s0', itemId: 'cover', qty: 1 } : null)), gold: 1800 } }); });
  await act('stash-page-1');
  await p.screenshot({ path: `${OUT}/${s.n}-comprar.png` });
  await act('btn-buy-page');
  x = await prof();
  if (x.len !== 240 || x.page !== 1 || x.gold !== 1800 - 250) fail('comprar la página 2: ' + JSON.stringify({ len: x.len, page: x.page, gold: x.gold }));
  // 3 · Mover un objeto de la página 1 a la 2 tocando el objeto y luego la pestaña
  await act('stash-page-0');
  await act('slot-stash-0');
  await act('stash-page-1');
  x = await prof();
  if (x.stash[0] !== null || !x.stash.slice(120).includes('s0')) fail('mover a la página 2 tocando la pestaña');
  // 4 · Ordenar solo ordena la página vista (la 1 tiene un hueco al principio y debe seguir teniéndolo)
  await act('stash-page-1'); await act('sort-stash');
  x = await prof();
  if (x.stash[0] !== null || x.stash[120] !== 's0') fail('ordenar solo la página vista');
  // 5 · Página compartida: comprarla, dejar un objeto y verlo con otro personaje
  await act('stash-page-shared'); await act('btn-buy-page');
  x = await prof();
  if (x.shared !== 0 || x.page !== 'shared') fail('comprar Compartido');
  await act('stash-page-1'); await act('slot-stash-120'); await act('stash-page-shared');
  x = await prof();
  if (x.shared !== 1) fail('llevar un objeto a Compartido');
  await act('stash-page-shared');
  await p.screenshot({ path: `${OUT}/${s.n}-compartido.png` });
  const sm = await small();
  if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) fail('el Alijo se sale en horizontal');
  await p.waitForTimeout(400);
  await p.evaluate(() => window.__GRAVEVOW__.actions.openSelect()); await p.waitForTimeout(300);
  await act('btn-new-char-1');
  await p.fill('[data-testid=name-input]', 'Mireva'); await act('btn-create');
  if (await p.$('[data-testid=btn-tutorial-ok]')) await act('btn-tutorial-ok');
  await openStash();
  x = await prof();
  if (x.name !== 'Mireva' || x.shared !== 1) fail('el otro personaje no ve la página Compartido: ' + JSON.stringify({ n: x.name, sh: x.shared }));
  // …y no ve las páginas propias de Aldric
  if (x.len !== 120) fail('las páginas propias son de cada personaje');
  await act('stash-page-shared'); await act('slot-shared-0');
  await p.screenshot({ path: `${OUT}/${s.n}-compartido-otro.png` });
  if (sm.length) fail('botones táctiles de menos de 44 px: ' + [...new Set(sm)].join(' | '));
  if (errs.length) fail('errores de consola: ' + errs.join(' | '));
  await b.close();
  console.log(`${s.n}: ok`);
}

(async () => {
  let bad = 0;
  for (const s of SIZES) { try { await run(s); } catch (e) { bad++; console.log('FALLO', e.message); } }
  process.exit(bad ? 1 : 0);
})();
