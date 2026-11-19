// Fase 5 (combate): normal, especial, mochila, élite y jefe en los tres formatos.
// Uso: node capturar.cjs <url> <carpeta>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = path.join(__dirname, process.argv[3] || 'antes');
fs.mkdirSync(OUT, { recursive: true });
const SIZES = [
  { n: 'escritorio', vp: { width: 1920, height: 1080 }, touch: false },
  { n: 'tableta', vp: { width: 1180, height: 820 }, touch: true },
  { n: 'movil', vp: { width: 844, height: 390 }, touch: true },
].filter((s) => !process.env.ONLY || s.n === process.env.ONLY);
(async () => {
  for (const s of SIZES) {
    const b = await chromium.launch();
    const ctx = await b.newContext({ viewport: s.vp, hasTouch: s.touch, isMobile: s.touch, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('gv-consent', '{"analytics":false}'); } catch {} });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log('ERROR', e.message));
    const G = (f, a) => p.evaluate(f, a);
    const dismiss = async () => { for (let i = 0; i < 4; i++) { const x = await p.$('[data-testid=btn-class-unlock-later]'); if (!x) break; await x.click().catch(() => {}); await p.waitForTimeout(200); } };
    const hit = (sel) => s.touch ? p.tap(sel) : p.click(sel);
    const shot = async (n) => { await p.waitForTimeout(600); await p.screenshot({ path: path.join(OUT, `${s.n}-${n}.png`) }); console.log(s.n, n); };
    const tryShot = async (n, fn) => { try { await fn(); await shot(n); } catch (e) { console.log(s.n, n, 'NO SALE:', e.message.split('\n')[0]); } };
    const ready = async () => { for (let i = 0; i < 60 && !(await p.$('[data-testid=act-attack]:not([disabled])')); i++) await p.waitForTimeout(150); };
    const fight = async (enemy) => {
      await G(() => window.__GRAVEVOW__.setState({ combat: null }));
      await p.waitForTimeout(300);
      await G((en) => window.__GRAVEVOW__.actions.startCombat('pve', 'e_' + en, en), enemy);
      await ready();
    };
    await p.goto(URL + '?debug');
    await G(() => indexedDB.deleteDatabase('gravevow'));
    await p.reload(); await p.waitForTimeout(700);
    await hit('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Aldric'); await hit('[data-testid=btn-create]');
    await p.waitForSelector('[data-testid=tab-play]');
    await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.character.level = 45; pr.tutorialDone = true; g.setState({ tutorial: null, profile: { ...pr } }); });
    await dismiss();
    await G(async () => { await window.__GRAVEVOW__.actions.enterDungeon('afueras'); });
    await p.waitForTimeout(2000);
    await G(() => { const g = window.__GRAVEVOW__, e = g.getState().expedition; const bp = [...e.backpack]; const put = (id, q) => { const i = bp.findIndex((x) => !x); if (i >= 0) bp[i] = { uid: 'x' + i, itemId: id, qty: q }; };
      put('health_potion', 2); put('ration', 1); put('iron_ore', 4);
      g.setState({ tutorial: null, expedition: { ...e, backpack: bp } }); });
    await tryShot('1-normal', () => fight('skeleton'));
    await tryShot('2-especial', () => hit('[data-testid=act-special]'));
    await tryShot('3-mochila', async () => { await hit('[data-testid=btn-menu-back]'); await hit('[data-testid=act-bag]'); });
    await tryShot('4-elite', () => fight('tomb_knight'));
    await tryShot('5-jefe', () => fight('veiled_queen'));
    await b.close();
  }
})();
