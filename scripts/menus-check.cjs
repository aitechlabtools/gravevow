// Prueba de los menús del refugio en los tres formatos (escritorio, tableta y móvil en horizontal).
// Crea un personaje, recorre todas las pestañas (y algunas vistas internas), hace capturas y comprueba:
//   · que nada se sale de la pantalla en horizontal,
//   · que en táctil los botones visibles miden al menos 44×44 px,
//   · que no hay errores en la consola.
// Uso: node scripts/menus-check.cjs [url] [carpeta-capturas] [solo-formato]
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/menus-check';
const ONLY = process.argv[4];
fs.mkdirSync(OUT, { recursive: true });

const SIZES = [
  { n: 'escritorio', vp: { width: 1920, height: 1080 }, touch: false },
  { n: 'tableta', vp: { width: 1180, height: 820 }, touch: true },
  { n: 'movil', vp: { width: 844, height: 390 }, touch: true },
].filter((s) => !ONLY || s.n === ONLY);

// Pestaña y, opcionalmente, pasos dentro de ella (testids que se pulsan en orden) para capturar vistas internas.
const VIEWS = [
  { name: 'jugar', tab: 'play' },
  { name: 'jugar-mapa', tab: 'play', steps: ['btn-zone-map'], close: true },
  { name: 'personaje', tab: 'character' },
  { name: 'personaje-ficha', tab: 'character', steps: ['arc-basic'] },
  { name: 'personaje-atributos', tab: 'character', steps: ['seg-attrs'], optional: true },
  { name: 'alijo', tab: 'stash' },
  { name: 'alijo-almacen', tab: 'stash', steps: ['seg-storage'], optional: true },
  { name: 'mercaderes', tab: 'merchants' },
  { name: 'mercader-nira', tab: 'merchants', steps: ['vendor-nira'] },
  { name: 'mercader-vender', tab: 'merchants', steps: ['vendor-nira', 'vendor-view-sell'] },
  { name: 'mercader-forja', tab: 'merchants', steps: ['vendor-brand', 'vendor-view-station'] },
  { name: 'mercader-grizk', tab: 'merchants', steps: ['vendor-grizk'] },
  { name: 'grizk-vender', tab: 'merchants', steps: ['vendor-grizk', 'vendor-view-sell'] },
  { name: 'intendencia-estado', tab: 'stash', steps: ['seg-status'] },
  { name: 'mercader-contratos', tab: 'merchants', steps: ['vendor-grizk', 'vendor-view-contracts'] },
  { name: 'misiones', tab: 'quests' },
  { name: 'bestiario', tab: 'bestiary' },
  { name: 'alijo-atuendo', tab: 'stash', steps: ['slot-skin'], close: true },
  { name: 'tienda', tab: 'shop' },
];

async function run(s) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: s.vp, hasTouch: s.touch, isMobile: s.touch, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !/favicon|DevTools/.test(m.text()) && errs.push(m.text()));
  const act = async (id) => { const sel = `[data-testid=${id}]`; await p.waitForSelector(sel, { timeout: 5000 }); if (s.touch) await p.tap(sel); else await p.click(sel); await p.waitForTimeout(250); };
  const fails = [];
  await p.goto(URL + '?debug');
  await p.evaluate(() => indexedDB.deleteDatabase('gravevow'));
  await p.reload(); await p.waitForTimeout(600);
  await act('btn-play');
  await p.evaluate(() => document.fullscreenElement && document.exitFullscreen());
  await p.screenshot({ path: `${OUT}/${s.n}-00-crear.png` });
  await p.fill('[data-testid=name-input]', 'Aldric');
  await act('btn-create');
  
  // Un poco de todo para que las pantallas no salgan vacías
  await p.evaluate(() => { const G = window.__GRAVEVOW__; const pr = G.getState().profile; pr.gold = 4860; pr.stats.expeditions = 3; pr.character.level = 45; pr.bossesDefeated = [...new Set([...(pr.bossesDefeated || []), 'ossuary_lord'])]; G.setState({ profile: { ...pr } }); });
  // Nivel 45 (para ver a todos los mercaderes del Bastión): cerrar el aviso de habilidad nueva
  for (let i = 0; i < 4; i++) { const b = await p.waitForSelector('[data-testid=btn-class-unlock-later]', { timeout: 1500 }).catch(() => null); if (!b) break; await b.click(); await p.waitForTimeout(200); }
  for (const v of VIEWS) {
    try {
      await act(`tab-${v.tab}`);
      for (const st of v.steps ?? []) {
        if (v.optional && !(await p.$(`[data-testid=${st}]`))) throw new Error('skip');
        // Entrada del Bastión: si ya está en las tarjetas de mercaderes, no hace falta
        if (st === 'btn-merchants' && !(await p.$('[data-testid=btn-merchants]')) && (await p.$('[data-testid^=vendor-]'))) continue;
        await act(st);
      }
      await p.waitForTimeout(300);
      await p.screenshot({ path: `${OUT}/${s.n}-${v.name}.png` });
      const r = await p.evaluate((touch) => {
        const vw = innerWidth, vh = innerHeight;
        const out = [];
        if (document.documentElement.scrollWidth > vw + 1) out.push(`la página es más ancha que la pantalla (${document.documentElement.scrollWidth} > ${vw})`);
        if (touch) {
          for (const el of document.querySelectorAll('button, a.btn, [role=tab]')) {
            const bb = el.getBoundingClientRect();
            if (!bb.width || !bb.height || el.closest('[aria-hidden=true]')) continue;
            if (bb.right < 0 || bb.left > vw || bb.bottom < 0 || bb.top > vh) continue; // fuera de vista (desplazable)
            if (bb.height < 43.5 || bb.width < 43.5) out.push(`botón pequeño (${Math.round(bb.width)}×${Math.round(bb.height)}): «${(el.textContent || el.getAttribute('aria-label') || el.dataset.testid || '').trim().slice(0, 30)}»`);
          }
        }
        return out;
      }, s.touch);
      for (const x of [...new Set(r)].slice(0, 6)) fails.push(`${v.name}: ${x}`);
      if (await p.$('[data-testid=vendor-back]')) await act('vendor-back'); // volver a las tarjetas de mercaderes
      if (v.close) await p.keyboard.press('Escape').catch(() => {});
      if (v.close && (await p.$('[data-testid=zone-map]'))) await act('btn-zone-map-close');
      if (v.close && (await p.$('[data-testid=skin-picker]'))) await act('pick-none');
    } catch (e) { if (e.message !== 'skip') fails.push(`${v.name}: ${e.message.split('\n')[0]}`); }
  }
  await b.close();
  if (errs.length) fails.push('errores en consola: ' + [...new Set(errs)].slice(0, 3).join(' | '));
  return fails;
}

(async () => {
  let bad = 0;
  for (const s of SIZES) {
    const f = await run(s);
    console.log(`${f.length ? '✗' : '✓'} ${s.n} ${s.vp.width}×${s.vp.height}${f.length ? '\n   - ' + f.join('\n   - ') : ''}`);
    if (f.length) bad++;
  }
  console.log(bad ? `\n${bad} formato(s) con fallos` : '\nTodo bien');
  process.exit(bad ? 1 : 0);
})();
