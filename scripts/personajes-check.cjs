// Prueba de varios personajes en los tres formatos: crear dos, cambiar desde el lobby, borrar escribiendo el nombre,
// recargar y comprobar que todo sigue; capturas de la selección y del desplegable, botones táctiles de 44 px.
// Uso: node scripts/personajes-check.cjs [url] [carpeta-capturas]
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/personajes-check';
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
  const act = async (id) => { const sel = `[data-testid=${id}]`; await p.waitForSelector(sel, { timeout: 5000 }); if (s.touch) await p.tap(sel); else await p.click(sel); await p.waitForTimeout(300); };
  const st = () => p.evaluate(() => { const G = window.__GRAVEVOW__; const s = G.getState(); return { screen: s.screen, name: s.profile?.character.name, gold: s.profile?.gold, roster: s.roster.map((r) => `${r.slot}:${r.name}`), tut: s.profile?.tutorialDone }; });
  const fail = (m) => { throw new Error(`${s.n}: ${m}`); };
  const small = async () => s.touch ? p.evaluate(() => [...document.querySelectorAll('button, a.btn')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 43.5 || r.height < 43.5); }).map((e) => (e.getAttribute('data-testid') || e.textContent || '').trim().slice(0, 30))) : [];

  await p.goto(URL + '?debug');
  await p.evaluate(() => indexedDB.deleteDatabase('gravevow'));
  await p.reload(); await p.waitForTimeout(700);
  // Primer personaje (con el tutorial ya marcado por ?debug no se juega)
  await act('btn-play');
  await p.evaluate(() => document.fullscreenElement && document.exitFullscreen());
  await p.fill('[data-testid=name-input]', 'Aldric'); await act('btn-create'); 
  await p.evaluate(() => { const G = window.__GRAVEVOW__; const pr = G.getState().profile; G.setState({ profile: { ...pr, gold: 4321, tutorialDone: true } }); });
  await p.waitForTimeout(400);
  // Al menú y a «Elegir personaje»
  await p.evaluate(() => window.__GRAVEVOW__.actions.goto('title')); await p.waitForTimeout(300);
  await act('btn-choose-char');
  await act('btn-new-char-2');
  const skip = await p.$eval('[data-testid=skip-tutorial]', (e) => e.checked).catch(() => null);
  if (skip !== true) fail('el segundo personaje debería poder saltar el tutorial (marcado por defecto)');
  await p.fill('[data-testid=name-input]', 'Mireva'); await act('btn-create');
  
  let x = await st();
  if (x.name !== 'Mireva' || x.roster.join() !== '0:Aldric,2:Mireva') fail('crear en el hueco 3: ' + JSON.stringify(x));
  if (x.gold === 4321) fail('el oro del segundo personaje no debe ser el del primero');
  // Cambiar desde el lobby
  await act('nav-chip');
  await p.screenshot({ path: `${OUT}/${s.n}-cambiar.png` });
  const sm1 = await small();
  await act('switch-char-0');
  x = await st();
  if (x.name !== 'Aldric' || x.gold !== 4321) fail('cambiar de personaje: ' + JSON.stringify(x));
  // Selección y borrado
  await act('nav-chip'); await act('btn-all-chars');
  await p.screenshot({ path: `${OUT}/${s.n}-seleccion.png` });
  const sm2 = await small();
  const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (over) fail('la selección se sale en horizontal');
  await act('btn-delete-char-2');
  await p.fill('[data-testid=delete-name-input]', 'Mire');
  if (!(await p.$eval('[data-testid=btn-confirm-delete]', (e) => e.disabled))) fail('borrar debería esperar al nombre completo');
  await p.screenshot({ path: `${OUT}/${s.n}-borrar.png` });
  await p.fill('[data-testid=delete-name-input]', 'mireva'); await act('btn-confirm-delete');
  x = await st();
  if (x.roster.join() !== '0:Aldric') fail('borrar: ' + JSON.stringify(x));
  // Recargar: sigue Aldric con su oro
  await p.waitForTimeout(400); await p.reload(); await p.waitForTimeout(800);
  x = await st();
  const btn = await p.textContent('[data-testid=btn-play]');
  if (x.name !== 'Aldric' || x.gold !== 4321 || !/Aldric/.test(btn)) fail('tras recargar: ' + JSON.stringify(x) + ' ' + btn);
  const smalls = [...new Set([...sm1, ...sm2])];
  if (smalls.length) fail('botones táctiles de menos de 44 px: ' + smalls.join(' | '));
  if (errs.length) fail('errores de consola: ' + errs.join(' | '));
  await b.close();
  console.log(`${s.n}: ok`);
}

(async () => {
  let bad = 0;
  for (const s of SIZES) { try { await run(s); } catch (e) { bad++; console.log('FALLO', e.message); } }
  process.exit(bad ? 1 : 0);
})();
