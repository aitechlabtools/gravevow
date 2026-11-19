// Maqueta de la fase 1 (base común): paleta «piedra fría», paneles y botones planos, texto secundario legible y pestañas con icono
// (en el móvil, nombre solo en la activa). Mismas 19 pantallas que mockups/plan-interfaz, para comparar antes y después.
// No cambia el código: inyecta los estilos al cargar la página.
// Uso (con «npx vite --port 5173» en marcha): node mockups/fase1-base/capturar.cjs [url] [solo-formato]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const ONLY = process.argv[3];
const OUT = path.join(__dirname, 'despues');
const INJECT = require('./inyectar.cjs');
fs.mkdirSync(OUT, { recursive: true });

const SIZES = [
  { n: 'escritorio', vp: { width: 1920, height: 1080 }, touch: false },
  { n: 'tableta', vp: { width: 1180, height: 820 }, touch: true },
  { n: 'movil', vp: { width: 844, height: 390 }, touch: true },
].filter((s) => !ONLY || s.n === ONLY);

// Revisión automática de lo visible: botones de menos de 44 px (solo táctil), textos de menos de 12 px,
// textos cortados y degradados. Devuelve cajas en % de la pantalla para marcarlas en el índice.
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

async function run(s) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: s.vp, hasTouch: s.touch, isMobile: s.touch, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('gv-consent', '{"analytics":false}'); } catch {} });
  await ctx.addInitScript(INJECT);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const G = (f, a) => p.evaluate(f, a);
  const dismiss = async () => { for (let i = 0; i < 4; i++) { const x = await p.$('[data-testid=btn-class-unlock-later]'); if (!x) break; await x.click().catch(() => {}); await p.waitForTimeout(200); } };
  const act = async (id) => {
    const sel = `[data-testid=${id}]`;
    await p.waitForSelector(sel, { timeout: 5000 });
    await dismiss();
    if (s.touch) await p.tap(sel); else await p.click(sel);
    await p.waitForTimeout(300);
  };
  const report = {};
  const shot = async (name) => {
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(OUT, `${s.n}-${name}.png`) });
    report[name] = await G(audit, s.touch);
    console.log(s.n, name, `· <44: ${report[name].small.length} · <12px: ${report[name].tiny.length} · cortados: ${report[name].cut.length}`);
  };
  const tryShot = async (name, fn) => { try { await fn(); await shot(name); } catch (e) { console.log(s.n, name, 'NO SALE:', e.message.split('\n')[0]); } };

  await p.goto(URL + '?debug');
  await G(() => indexedDB.deleteDatabase('gravevow'));
  await p.reload(); await p.waitForTimeout(700);
  await act('btn-play');
  await p.fill('[data-testid=name-input]', 'Aldric');
  await act('btn-create');
  await p.waitForSelector('[data-testid=tab-play]');
  // Partida de muestra: nivel 45, oro, expediciones y algo en la mochila
  await G(() => {
    const g = window.__GRAVEVOW__, pr = g.getState().profile;
    pr.gold = 4860; pr.stats.expeditions = 3; pr.character.level = 45; pr.tutorialDone = true;
    pr.bossesDefeated = [...new Set([...(pr.bossesDefeated || []), 'ossuary_lord'])];
    g.setState({ tutorial: null, profile: { ...pr } });
  });
  await dismiss();
  await G(() => indexedDB && 0);

  // Menú principal (se vuelve al título y se entra otra vez)
  await tryShot('01-titulo', async () => { await p.goto(URL + '?debug'); await p.waitForSelector('[data-testid=btn-play]'); await p.waitForTimeout(800); });
  await act('btn-play'); await p.waitForSelector('[data-testid=tab-play]'); await dismiss();
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.gold = 4860; pr.character.level = 45; g.setState({ tutorial: null, profile: { ...pr } }); });
  await dismiss();

  const tabs = [
    ['02-jugar', 'play'], ['03-habilidades', 'character'], ['04-alijo', 'stash'],
    ['06-bastion', 'merchants'], ['10-misiones', 'quests'], ['11-bestiario', 'bestiary'], ['12-tienda', 'shop'],
  ];
  for (const [n, t] of tabs) await tryShot(n, () => act(`tab-${t}`));
  await tryShot('05-alijo-heridas', async () => { await act('tab-stash'); await act('seg-status'); });
  await tryShot('07-mercader-nira', async () => { await act('tab-merchants'); await act('vendor-nira'); });
  await tryShot('08-mercader-vender', async () => { await act('vendor-view-sell'); });
  await tryShot('09-estacion-forja', async () => { await act('vendor-back'); await act('vendor-brand'); await act('vendor-view-station'); });
  await tryShot('13-ajustes', async () => { await act('tab-play'); await act('btn-lobby-settings'); });
  await p.keyboard.press('Escape').catch(() => {});
  const closeBtn = await p.$('[data-testid=settings-close]'); if (closeBtn) await closeBtn.click().catch(() => {});

  // Mazmorra: HUD, inventario abierto, combate y menú de ataques especiales
  await tryShot('14-mazmorra', async () => {
    await G(async () => { await window.__GRAVEVOW__.actions.enterDungeon('afueras'); });
    await p.waitForTimeout(1800);
  });
  await tryShot('15-mazmorra-inventario', async () => { await act('btn-inventory'); });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await tryShot('16-combate', async () => {
    await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_x', 'skeleton'));
    for (let i = 0; i < 40 && !(await p.$('[data-testid=act-attack]:not([disabled])')); i++) await p.waitForTimeout(150);
  });
  await tryShot('17-combate-especial', async () => { await act('act-special'); });
  // Resultados: se termina la expedición con botín nuevo
  await tryShot('18-resultados', async () => {
    await G(() => {
      const g = window.__GRAVEVOW__, s = g.getState();
      g.setState({ combat: null });
      const bp = [...s.expedition.backpack]; const free = () => bp.findIndex((x) => !x);
      bp[free()] = { uid: 't1', itemId: 'dread_blade', qty: 1, rarity: 'legendary' };
      bp[free()] = { uid: 't2', itemId: 'iron_ore', qty: 3 };
      g.setState({ expedition: { ...s.expedition, backpack: bp, kills: { starving_wolf: 2 } } });
    });
    await G(() => window.__GRAVEVOW__.actions.trapHit(25));
    await G(() => window.__GRAVEVOW__.actions.finishExpedition('extracted'));
    await p.waitForSelector('[data-testid=summary]');
  });
  await tryShot('19-resultados-botin', async () => { await act('summary-next'); });

  fs.writeFileSync(path.join(OUT, `revision-${s.n}.json`), JSON.stringify({ size: s.vp, report, errors: errs }, null, 1));
  if (errs.length) console.log(s.n, 'errores:', errs);
  await b.close();
}

(async () => { for (const s of SIZES) await run(s); })();
