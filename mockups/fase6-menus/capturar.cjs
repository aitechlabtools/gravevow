// Fase 6 (menús, fichas, resultados y ajustes): capturas y revisión automática en los tres formatos.
// Uso: node capturar.cjs <url> <carpeta>   (ONLY=movil para un solo formato)
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
function audit(touch) {
  const vw = innerWidth, vh = innerHeight;
  const vis = (r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
  const box = (r) => ({ x: +(r.left / vw * 100).toFixed(2), y: +(r.top / vh * 100).toFixed(2), w: +(r.width / vw * 100).toFixed(2), h: +(r.height / vh * 100).toFixed(2) });
  const label = (e) => (e.getAttribute('data-testid') || e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const small = [], tiny = [], cut = [];
  let gradients = 0;
  if (touch) {
    for (const e of document.querySelectorAll('button, [role=button], a[href], input, select')) {
      const r = e.getBoundingClientRect();
      if (!vis(r) || e.disabled) continue;
      if (r.width < 43.5 || r.height < 43.5) small.push({ ...box(r), t: label(e), s: `${Math.round(r.width)}×${Math.round(r.height)}` });
    }
  }
  const seen = new Set();
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e);
    if (cs.backgroundImage.includes('gradient')) gradients++;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const r = e.getBoundingClientRect();
    if (!vis(r) || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const fs = parseFloat(cs.fontSize);
    if (fs < 12) { const k = Math.round(fs); if (tiny.length < 60) tiny.push({ ...box(r), t: label(e), s: `${fs.toFixed(1)} px` }); seen.add(k); }
    if ((cs.overflow.includes('hidden') || cs.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 2) cut.push({ ...box(r), t: label(e) });
  }
  const wide = document.documentElement.scrollWidth > vw + 1;
  return { small, tiny, cut, gradients, wide };
}

(async () => {
  for (const s of SIZES) {
    const b = await chromium.launch();
    const ctx = await b.newContext({ viewport: s.vp, hasTouch: s.touch, isMobile: s.touch, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('gv-consent', '{"analytics":false}'); } catch {} });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const G = (f, a) => p.evaluate(f, a);
    const dismiss = async () => { for (let i = 0; i < 4; i++) { const x = await p.$('[data-testid=btn-class-unlock-later]'); if (!x) break; await x.click().catch(() => {}); await p.waitForTimeout(200); } };
    const act = async (id) => { const sel = `[data-testid=${id}]`; await p.waitForSelector(sel, { timeout: 5000 }); await dismiss(); if (s.touch) await p.tap(sel); else await p.click(sel); await p.waitForTimeout(300); };
    const report = {};
    const shot = async (n) => { await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, `${s.n}-${n}.png`) }); report[n] = await G(audit, s.touch);
      console.log(s.n, n, `· <44: ${report[n].small.length} · <12px: ${report[n].tiny.length} · cortados: ${report[n].cut.length}`); };
    const tryShot = async (n, fn) => { try { await fn(); await shot(n); } catch (e) { console.log(s.n, n, 'NO SALE:', e.message.split('\n')[0]); } };
    await p.goto(URL + '?debug');
    await G(() => indexedDB.deleteDatabase('gravevow'));
    await p.reload(); await p.waitForTimeout(700);
    await act('btn-play');
    await tryShot('01-crear', async () => {});
    await p.fill('[data-testid=name-input]', 'Aldric');
    await act('btn-create');
    await p.waitForSelector('[data-testid=tab-play]');
    await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
      pr.gold = 4860; pr.stats.expeditions = 3; pr.character.level = 45; pr.tutorialDone = true;
      pr.bossesDefeated = [...new Set([...(pr.bossesDefeated || []), 'ossuary_lord'])];
      g.setState({ tutorial: null, profile: { ...pr } }); });
    await dismiss();
    await tryShot('02-jugar', () => act('tab-play'));
    await tryShot('03-habilidades', () => act('tab-character'));
    await tryShot('04-habilidades-ataques', () => act('seg-atk'));
    await tryShot('05-bestiario', () => act('tab-bestiary'));
    await tryShot('06-tienda', () => act('tab-shop'));
    await tryShot('07-ajustes-sonido', async () => { await act('tab-play'); await act('btn-lobby-settings'); });
    for (const [n, t] of [['08-ajustes-pantalla', 'screen'], ['09-ajustes-controles', 'controls'], ['10-ajustes-partida', 'game'], ['11-ajustes-info', 'info']])
      await tryShot(n, () => act(`settings-tab-${t}`));
    await G(() => { const c = document.querySelector('[data-testid=settings-close]'); c && c.click(); });
    await tryShot('12-titulo', async () => { await G(() => window.__GRAVEVOW__.actions.goto('title')); await p.waitForSelector('[data-testid=btn-play]'); });
    await tryShot('13-elegir', () => act('btn-choose-char'));
    await tryShot('14-copia', async () => { await act('btn-select-back').catch(() => G(() => window.__GRAVEVOW__.actions.goto('title'))); await act('btn-backup'); });
    await tryShot('15-resultados', async () => {
      await G(() => window.__GRAVEVOW__.actions.goto('title')); await act('btn-play'); await p.waitForSelector('[data-testid=tab-play]'); await dismiss();
      await G(async () => { await window.__GRAVEVOW__.actions.enterDungeon('afueras'); }); await p.waitForTimeout(1500);
      await G(() => { const g = window.__GRAVEVOW__, st = g.getState(); g.setState({ combat: null, tutorial: null });
        const bp = [...st.expedition.backpack]; const free = () => bp.findIndex((x) => !x);
        bp[free()] = { uid: 't1', itemId: 'dread_blade', qty: 1, rarity: 'legendary' }; bp[free()] = { uid: 't2', itemId: 'iron_ore', qty: 3 };
        g.setState({ expedition: { ...st.expedition, backpack: bp, kills: { starving_wolf: 2 } } }); });
      await G(() => window.__GRAVEVOW__.actions.trapHit(25));
      await G(() => window.__GRAVEVOW__.actions.finishExpedition('extracted'));
      await p.waitForSelector('[data-testid=summary]');
    });
    await tryShot('16-resultados-botin', () => act('summary-next'));
    fs.writeFileSync(path.join(OUT, `revision-${s.n}.json`), JSON.stringify({ size: s.vp, report, errors: errs }, null, 1));
    if (errs.length) console.log(s.n, 'errores:', errs.slice(0, 3));
    await b.close();
  }
})();
