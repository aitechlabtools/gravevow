// Capturas de todas las estaciones de fabricar (reconstruidas a nivel 1) en los tres formatos.
// Uso: node mockups/forja-reconstruir/capturar-estaciones.cjs <url> <carpeta>
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const URL = process.argv[2]; const OUT = path.join(__dirname, process.argv[3]); fs.mkdirSync(OUT, { recursive: true });
const SIZES = [{ n: 'escritorio', w: 1920, h: 1080, t: false }, { n: 'tableta', w: 1180, h: 820, t: true }, { n: 'movil', w: 844, h: 390, t: true }];
(async () => {
  const b = await chromium.launch();
  for (const s of SIZES) {
    const c = await b.newContext({ viewport: { width: s.w, height: s.h }, hasTouch: s.t, isMobile: s.t });
    const p = await c.newPage();
    const G = (f, a) => p.evaluate(f, a);
    const dismiss = async () => { for (let i = 0; i < 4; i++) { const x = await p.$('[data-testid=btn-class-unlock-later]'); if (!x) break; await x.click().catch(() => {}); await p.waitForTimeout(200); } };
    const act = async (id) => { const sel = `[data-testid=${id}]`; await p.waitForSelector(sel, { timeout: 6000 }); await dismiss(); s.t ? await p.tap(sel) : await p.click(sel); await p.waitForTimeout(350); };
    await p.goto(URL + '?debug'); await G(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(700);
    await act('btn-play'); await p.fill('[data-testid=name-input]', 'Aldric'); await act('btn-create'); await p.waitForSelector('[data-testid=tab-play]');
    await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.gold = 4860; pr.character.level = 45; pr.tutorialDone = true;
      pr.refuge = { ...(pr.refuge || {}), v: 3, kitchen: 1, bench: 1, infirmary: 1, forge: 1, alchemy: 1, tannery: 1, armory: 1 }; g.setState({ tutorial: null, profile: { ...pr } }); });
    await act('tab-merchants');
    const ids = await G(() => [...document.querySelectorAll('[data-testid^=vendor-]')].map((e) => e.getAttribute('data-testid').slice(7)).filter((x) => !/^(view|back|side|brand-|quests)/.test(x) && !x.includes('-')));
    for (const v of [...new Set(ids)]) {
      try {
        await act(`vendor-${v}`);
        const st = await p.$('[data-testid=vendor-view-station]');
        if (st) { await act('vendor-view-station'); await p.waitForTimeout(400);
          if (await p.$('[data-testid^=craft-]')) await p.screenshot({ path: path.join(OUT, `${s.n}-${v}.png`) }); }
        await act('vendor-back');
      } catch (e) { console.log(s.n, v, e.message.split('\n')[0]); }
    }
    await c.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
