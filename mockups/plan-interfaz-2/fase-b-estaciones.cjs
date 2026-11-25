// Fase B: estaciones. En 3 tamaños, las 8 estaciones reconstruidas: sin textos cortados ni nada fuera de pantalla;
// en portátil, «Niveles y mejora» se abre y deja ver el botón de mejorar; en el banco se fabrica de verdad a la mochila y al almacén.
// Uso (vite en 5174): node mockups/plan-interfaz-2/fase-b-estaciones.cjs [carpeta-capturas]
const { chromium } = require('playwright');
const OUT = process.argv[2] || __dirname + '/fase-b';
require('fs').mkdirSync(OUT, { recursive: true });
const ST = { nira: 'tannery', vesper: 'infirmary', garth: 'kitchen', orik: 'bench', grizk: 'cot', brand: 'forge', valerius: 'armory', eldrin: 'alchemy' };
const SIZES = [[1920,1080],[1366,768],[1280,720],[1180,820],[844,390]];
(async () => { const b = await chromium.launch(); let fail = 0; const bad = (m) => { fail++; console.log('  FALLO', m); };
for (const [w,h] of SIZES) { const touch = w < 1200;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch }); const p = await ctx.newPage();
  await p.goto('http://localhost:5174/play/?debug'); await p.waitForSelector('[data-testid=btn-play]'); await p.click('[data-testid=btn-play]'); await p.waitForTimeout(500);
  if (await p.$('[data-testid=name-input]')) { await p.fill('[data-testid=name-input]','Aldric'); const c = await p.$('[data-testid=btn-create]') || await p.$('[data-testid=btn-confirm]'); if (c) await c.click(); }
  await p.waitForSelector('[data-testid=tab-play]');
  for (let i=0;i<4;i++){ const x = await p.$('[data-testid=btn-class-unlock-later]'); if(!x) break; await x.click(); await p.waitForTimeout(150); }
  await p.evaluate(() => { const G = window.__GRAVEVOW__; const pr = G.getState().profile; G.setState({ profile: { ...pr, refuge: { ...(pr.refuge||{}), cot:1, kitchen:1, bench:1, forge:1, armory:1, infirmary:1, tannery:1, alchemy:1 } } }); });
  await p.click('[data-testid=tab-merchants]');
  for (const [v, st] of Object.entries(ST)) {
    await p.click(`[data-testid=vendor-${v}]`); await p.waitForTimeout(200);
    const t = await p.$('[data-testid=vendor-view-station]'); if (!t) { bad(`${w} ${v}: sin pestaña de estación`); await p.click('[data-testid=vendor-back]'); continue; }
    await t.click(); await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const vw = innerWidth, cut = []; for (const e of document.querySelectorAll('[data-testid=station-panel] *')) { const own = [...e.childNodes].some(n => n.nodeType===3 && n.textContent.trim()); if (!own) continue; const cs = getComputedStyle(e), q = e.getBoundingClientRect(); if (!q.width) continue; if ((cs.overflow.includes('hidden') || cs.textOverflow==='ellipsis') && e.scrollWidth > e.clientWidth + 2) cut.push(e.textContent.trim().slice(0,25)); if (q.right > vw + 1) cut.push('FUERA ' + e.textContent.trim().slice(0,20)); } return { wide: document.documentElement.scrollWidth > vw + 1, cut }; });
    if (r.wide || r.cut.length) bad(`${w}x${h} ${v}: ${JSON.stringify(r)}`);
    await p.screenshot({ path: `${OUT}/${v}-${w}x${h}.png` });
    // Niveles y mejora: plegado → se abre y aparece el botón
    const fold = await p.$(`button[data-testid=station-upgrade-${st}]`);
    if (fold) { await fold.click(); await p.waitForTimeout(150); if (!(await p.$(`[data-testid=upgrade-${st}], [data-testid=upgrade-max-${st}]`))) bad(`${w} ${v}: no sale la mejora al desplegar`); await fold.click(); }
    else if (!(await p.$(`[data-testid=upgrade-${st}], [data-testid=upgrade-max-${st}], [data-testid=upgrade-open-${st}]`))) bad(`${w} ${v}: no hay mejora visible`);
    await p.click('[data-testid=vendor-back]'); await p.waitForTimeout(150);
  }
  // Fabricar en el banco: Empuñadura a la mochila y al almacén
  await p.evaluate(() => { const G = window.__GRAVEVOW__; G.dev.give('old_wood', undefined, undefined, 4); G.dev.give('leather_scrap', undefined, undefined, 4); });
  await p.click('[data-testid=vendor-orik]'); await p.click('[data-testid=vendor-view-station]'); await p.waitForTimeout(300);
  const count = () => p.evaluate(() => { const pr = window.__GRAVEVOW__.getState().profile; const n = (g, id) => (g||[]).filter(Boolean).filter(s => s.itemId === id).reduce((a,s)=>a+s.qty,0); const all = (id) => n(pr.backpack, id) + n(pr.stash, id); return { bp: n(pr.backpack,'craft_grip') , wood: all('old_wood'), leather: all('leather_scrap'), any: JSON.stringify(pr.backpack).length + JSON.stringify(pr.stash).length }; });
  const c0 = await count();
  const btn = await p.$('[data-testid=craft-to-backpack]'); if (!btn || await btn.isDisabled()) bad(`${w}: no se puede fabricar a la mochila`); else { await btn.click(); await p.waitForTimeout(200); }
  const c1 = await count();
  const btn2 = await p.$('[data-testid=craft-go]'); if (!btn2 || await btn2.isDisabled()) bad(`${w}: no se puede fabricar al almacén`); else { await btn2.click(); await p.waitForTimeout(200); }
  const c2 = await count();
  if (!(c1.wood === c0.wood - 1 && c2.wood === c1.wood - 1 && c2.leather === c0.leather - 2)) bad(`${w}: consumos raros ${JSON.stringify([c0,c1,c2])}`);
  console.log(`${w}x${h}`, 'madera', c0.wood, '→', c1.wood, '→', c2.wood, '· cuero', c0.leather, '→', c2.leather);
  await ctx.close(); }
await b.close(); console.log(fail ? `FALLOS: ${fail}` : 'TODO OK'); })();
