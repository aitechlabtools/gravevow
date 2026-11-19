// Capturas de la Forja (en ruinas y reconstruida) en los tres formatos.
// Uso: node mockups/forja-reconstruir/capturar.cjs <url> <carpeta>
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const URL = process.argv[2]; const OUT = path.join(__dirname, process.argv[3]); fs.mkdirSync(OUT, { recursive: true });
const SIZES = [{ n: 'escritorio', w: 1920, h: 1080, t: false }, { n: 'tableta', w: 1180, h: 820, t: true }, { n: 'movil', w: 844, h: 390, t: true }];
(async () => {
  const b = await chromium.launch();
  for (const s of SIZES) {
    const c = await b.newContext({ viewport: { width: s.w, height: s.h }, hasTouch: s.t, isMobile: s.t });
    const p = await c.newPage();
    const G = (f, a) => p.evaluate(f, a);
    const act = async (id) => { const sel = `[data-testid=${id}]`; await p.waitForSelector(sel, { timeout: 6000 }); for (let i = 0; i < 4; i++) { const x = await p.$('[data-testid=btn-class-unlock-later]'); if (!x) break; await x.click().catch(() => {}); await p.waitForTimeout(200); } s.t ? await p.tap(sel) : await p.click(sel); await p.waitForTimeout(350); };
    await p.goto(URL + '?debug'); await G(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(700);
    await act('btn-play'); await p.fill('[data-testid=name-input]', 'Aldric'); await act('btn-create'); await p.waitForSelector('[data-testid=tab-play]');
    const set = (forge) => G((forge) => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.gold = 4860; pr.character.level = 45; pr.tutorialDone = true; pr.refuge = { ...(pr.refuge || {}), v: 3, forge }; g.setState({ tutorial: null, profile: { ...pr } }); }, forge);
    await set(0);
    await act('tab-merchants'); await act('vendor-brand'); await act('vendor-view-station');
    await p.screenshot({ path: path.join(OUT, `${s.n}-1-en-ruinas.png`) });
    await set(1); await act('vendor-back'); await act('vendor-brand'); await act('vendor-view-station');
    const det = await p.$('[data-testid^=upgrade-open-]'); if (det) { await det.click(); await p.waitForTimeout(400); }
    await p.screenshot({ path: path.join(OUT, `${s.n}-2-reconstruida.png`) });
    await c.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
