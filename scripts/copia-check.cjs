// Prueba de la copia de seguridad: exportar en el ordenador (archivo y código) e importar en un móvil y una tableta
// (archivo y código pegado), con la confirmación previa, el rechazo de una copia editada a mano y «Deshacer».
// También comprueba 44 px en táctil, que nada se sale de la pantalla y hace capturas de la pantalla en los tres formatos.
// Uso: node scripts/copia-check.cjs [url] [carpeta-capturas]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/copia-check';
fs.mkdirSync(OUT, { recursive: true });

const fail = (m) => { throw new Error(m); };
async function page(b, opts) {
  const ctx = await b.newContext({ acceptDownloads: true, ...opts });
  try { await ctx.grantPermissions(['clipboard-read', 'clipboard-write']); } catch { /* algunos contextos no lo admiten */ }
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', (e) => p.errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !/favicon|DevTools/.test(m.text()) && p.errs.push(m.text()));
  p.touchy = !!opts.hasTouch;
  p.act = async (id) => { const sel = `[data-testid=${id}]`; await p.waitForSelector(sel, { timeout: 6000 }); if (p.touchy) await p.tap(sel); else await p.click(sel); await p.waitForTimeout(300); };
  await p.goto(URL + '?debug');
  await p.evaluate(() => indexedDB.deleteDatabase('gravevow'));
  await p.reload(); await p.waitForTimeout(700);
  return p;
}
async function newHero(p, name, gold) {
  await p.act('btn-play');
  await p.evaluate(() => document.fullscreenElement && document.exitFullscreen());
  await p.fill('[data-testid=name-input]', name); await p.act('btn-create');
  
  await p.evaluate((g) => { const G = window.__GRAVEVOW__; const pr = G.getState().profile; G.setState({ profile: { ...pr, gold: g, stats: { ...pr.stats, expeditions: 4 } } }); }, gold);
  await p.waitForTimeout(400);
  await p.evaluate(() => window.__GRAVEVOW__.actions.goto('title')); await p.waitForTimeout(300);
}
const small = (p) => p.evaluate(() => [...document.querySelectorAll('button, a.btn')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 43.5 || r.height < 43.5); }).map((e) => (e.getAttribute('data-testid') || e.textContent || '').trim().slice(0, 30)));
const st = (p) => p.evaluate(() => { const s = window.__GRAVEVOW__.getState(); return { name: s.profile?.character.name, gold: s.profile?.gold, roster: s.roster.map((r) => r.name), undo: !!s.undoAt }; });

(async () => {
  const b = await chromium.launch();
  let bad = 0;
  try {
    // 1 · Ordenador: Aldric con 7777 de oro. Recordatorio en el menú, exportar archivo y código.
    const pc = await page(b, { viewport: { width: 1920, height: 1080 } });
    await newHero(pc, 'Aldric', 7777);
    if (!(await pc.$('[data-testid=backup-reminder]'))) fail('ordenador: falta el recordatorio de copia en el menú');
    await pc.act('btn-backup');
    await pc.screenshot({ path: `${OUT}/escritorio-copia.png` });
    const [dl] = await Promise.all([pc.waitForEvent('download'), pc.act('btn-export-file')]);
    if (!/^gravevow-copia-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename())) fail('nombre del archivo: ' + dl.suggestedFilename());
    const file = `${OUT}/${dl.suggestedFilename()}`;
    await dl.saveAs(file);
    const last = await pc.textContent('[data-testid=backup-last]');
    if (!/hoy/.test(last)) fail('tras exportar debe decir «Última copia: hoy»: ' + last);
    await pc.act('btn-copy-code'); await pc.act('btn-copy-now');
    const code = await pc.inputValue('[data-testid=code-text]');
    if (!code.startsWith('GV1.')) fail('el código no empieza por GV1.');
    await pc.screenshot({ path: `${OUT}/escritorio-codigo.png` });
    console.log(`ordenador: ok (archivo ${fs.statSync(file).size} bytes, código ${code.length} caracteres)`);

    // 2 · Móvil (otro navegador, sin partida): importar el archivo → confirmar → aparece Aldric con su oro
    const mob = await page(b, { ...devices['iPhone 13 landscape'] });
    await mob.act('btn-have-backup'); // primera vez, sin partida: «Tengo una copia»
    await mob.screenshot({ path: `${OUT}/movil-copia.png` });
    if (!(await mob.$('[data-testid=backup-ios]'))) fail('móvil (iPhone): falta el aviso de Safari');
    await mob.setInputFiles('[data-testid=input-import-file]', file);
    await mob.waitForSelector('[data-testid=confirm-import]');
    const sum = await mob.textContent('[data-testid=import-summary]');
    if (!/Aldric/.test(sum) || !/Guerrero · Nv 1/.test(sum)) fail('resumen de la copia: ' + sum);
    await mob.screenshot({ path: `${OUT}/movil-confirmar.png` });
    const sm1 = await small(mob);
    await mob.act('btn-confirm-import');
    let x = await st(mob);
    if (x.name !== 'Aldric' || x.gold !== 7777) fail('móvil: importar archivo: ' + JSON.stringify(x));
    // Una copia editada a mano se rechaza
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    raw.data.characters[0].gold = 999999;
    fs.writeFileSync(`${OUT}/editada.json`, JSON.stringify(raw));
    await mob.setInputFiles('[data-testid=input-import-file]', `${OUT}/editada.json`);
    await mob.waitForSelector('[data-testid=backup-error]');
    const err = await mob.textContent('[data-testid=backup-error]');
    if (!/dañada|modificado/.test(err)) fail('copia editada: ' + err);
    if (await mob.evaluate(() => document.documentElement.scrollWidth > innerWidth)) fail('móvil: la pantalla se sale en horizontal');
    if (sm1.length) fail('móvil: botones de menos de 44 px: ' + sm1.join(' | '));
    console.log('móvil (iPhone, archivo): ok');

    // 3 · Tableta con otra partida (Kor): pegar el código → confirmar (sustituye) → Deshacer recupera a Kor
    const tab = await page(b, { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true });
    await newHero(tab, 'Kor', 55);
    await tab.act('btn-backup');
    await tab.screenshot({ path: `${OUT}/tableta-copia.png` });
    await tab.act('btn-paste-code');
    await tab.fill('[data-testid=paste-text]', code.match(/.{1,70}/g).join('\n'));
    await tab.act('btn-paste-load');
    await tab.waitForSelector('[data-testid=confirm-import]');
    const warn = await tab.textContent('[data-testid=confirm-import]');
    if (!/Sustituirá tu partida actual/.test(warn) || !/Kor/.test(warn)) fail('tableta: falta el aviso de sustituir: ' + warn);
    await tab.screenshot({ path: `${OUT}/tableta-confirmar.png` });
    await tab.act('btn-confirm-import');
    x = await st(tab);
    if (x.name !== 'Aldric' || x.roster.join() !== 'Aldric' || !x.undo) fail('tableta: pegar código: ' + JSON.stringify(x));
    await tab.act('btn-undo-import');
    x = await st(tab);
    if (x.name !== 'Kor' || x.gold !== 55) fail('tableta: deshacer: ' + JSON.stringify(x));
    const sm2 = await small(tab);
    if (sm2.length) fail('tableta: botones de menos de 44 px: ' + sm2.join(' | '));
    // Recargar: sigue Kor
    await tab.reload(); await tab.waitForTimeout(800);
    x = await st(tab);
    if (x.name !== 'Kor') fail('tableta: tras recargar debe seguir Kor');
    console.log('tableta (código pegado y deshacer): ok');

    const errs = [...pc.errs, ...mob.errs, ...tab.errs];
    if (errs.length) fail('errores de consola: ' + errs.join(' | '));
  } catch (e) { bad++; console.log('FALLO', e.message); }
  await b.close();
  process.exit(bad ? 1 : 0);
})();
