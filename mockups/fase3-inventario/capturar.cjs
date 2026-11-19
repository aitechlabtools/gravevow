// Fase 3 (inventario): Alijo (Equipo, ficha, Almacén, Heridas), inventario de la expedición y saco de botín, en los tres formatos.
// Uso: node capturar.cjs <url> <carpeta>   (antes: el juego real en :5173 · después: la copia con la maqueta en :5174)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = path.join(__dirname, process.argv[3] || 'antes');
fs.mkdirSync(OUT, { recursive: true });
const SIZES = (process.env.ONLY ? [{ n: 'movil', vp: { width: 844, height: 390 }, touch: true }] : null) || [
  { n: 'escritorio', vp: { width: 1920, height: 1080 }, touch: false },
  { n: 'tableta', vp: { width: 1180, height: 820 }, touch: true },
  { n: 'movil', vp: { width: 844, height: 390 }, touch: true },
];
const BAG = [['health_potion', 3], ['ration', 2], ['water', 2], ['iron_ore', 6], ['bandage', 4], ['gold_coins', 140], ['knight_helm', 1], ['iron_shield', 1], ['copper_ring', 1]];
const STASH = [['dread_blade', 1], ['chainmail', 1], ['mana_potion', 5], ['splint', 2], ['iron_ore', 20], ['gauntlets', 1], ['swift_boots', 1], ['bone_amulet', 1], ['antidote', 3], ['steel_pick', 1]];
(async () => {
  for (const s of SIZES) {
    const b = await chromium.launch();
    const ctx = await b.newContext({ viewport: s.vp, hasTouch: s.touch, isMobile: s.touch, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('gv-consent', '{"analytics":false}'); } catch {} });
    if (process.env.VB) await ctx.addInitScript((v) => { try { localStorage.setItem('mock-vb', v); } catch {} }, process.env.VB);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log('ERROR', e.message));
    const G = (f, a) => p.evaluate(f, a);
    const dismiss = async () => { for (let i = 0; i < 4; i++) { const x = await p.$('[data-testid=btn-class-unlock-later]'); if (!x) break; await x.click().catch(() => {}); await p.waitForTimeout(200); } };
    const tap = async (sel) => { await p.waitForSelector(sel, { timeout: 5000 }); await dismiss(); if (s.touch) await p.tap(sel); else await p.click(sel); await p.waitForTimeout(300); };
    const act = (id) => tap(`[data-testid=${id}]`);
    const shot = async (n) => { await p.waitForTimeout(400); await p.screenshot({ path: path.join(OUT, `${s.n}-${n}.png`) }); console.log(s.n, n); };
    const tryShot = async (n, fn) => { try { await fn(); await shot(n); } catch (e) { console.log(s.n, n, 'NO SALE:', e.message.split('\n').slice(0,6).join(' | ')); await p.screenshot({ path: path.join(OUT, `${s.n}-${n}-ERROR.png`) }); } };
    await p.goto(URL + '?debug');
    await G(() => indexedDB.deleteDatabase('gravevow'));
    await p.reload(); await p.waitForTimeout(700);
    await act('btn-play'); await p.fill('[data-testid=name-input]', 'Aldric'); await act('btn-create');
    await p.waitForSelector('[data-testid=tab-play]');
    await G(([bag, stash]) => {
      const g = window.__GRAVEVOW__, pr = g.getState().profile;
      let n = 0; const st = (id, q) => ({ uid: 'm' + (n++), itemId: id, qty: q });
      const fill = (grid, list) => { const out = [...grid]; for (const [id, q] of list) { const i = out.findIndex((x) => !x); if (i >= 0) out[i] = st(id, q); } return out; };
      pr.gold = 4860; pr.stats.expeditions = 3; pr.character.level = 45; pr.tutorialDone = true;
      pr.backpack = fill(pr.backpack, bag); pr.stash = fill(pr.stash, stash); pr.pocket = fill(pr.pocket, [['gold_coins', 60]]);
      pr.wounds = { pct: { armL: 45, legR: 20, thorax: 10 }, fractures: ['armL'] };
      pr.needs = { sat: 55, hyd: 30, rest: 80 };
      g.setState({ tutorial: null, profile: { ...pr } });
    }, [BAG, STASH]);
    await dismiss();
    await tryShot('1-equipo', () => act('tab-stash'));
    await tryShot('2-ficha', async () => { const c = await p.$('[data-testid=alijo-backpack] .slot[data-item=knight_helm], [data-testid=alijo-backpack] [data-item=knight_helm]'); if (!c) throw new Error('sin casilla'); if (s.touch) await c.tap(); else await c.click(); });
    await act('tab-play').catch(() => {}); await act('tab-stash').catch(() => {});
    if (s.n === 'movil') { await tryShot('3-almacen', () => act('seg-storage')); await tryShot('3b-almacen-ficha', async () => { await p.tap('[data-item=dread_blade]', { force: true }); }); }
    await tryShot('4-heridas', () => act('seg-status'));
    await tryShot('5-expedicion-inventario', async () => {
      await G(async () => { await window.__GRAVEVOW__.actions.enterDungeon('afueras'); });
      await p.waitForTimeout(1800);
      await G(() => { const g = window.__GRAVEVOW__, e = g.getState().expedition; const bp = [...e.backpack]; const put = (id, q) => { const i = bp.findIndex((x) => !x); if (i >= 0) bp[i] = { uid: 'x' + i, itemId: id, qty: q }; };
        put('health_potion', 2); put('ration', 1); put('gold_coins', 85); put('iron_ore', 4); g.setState({ expedition: { ...e, backpack: bp } }); });
      await act('btn-inventory');
    });
    await tryShot('5b-expedicion-ficha', async () => { const c = await p.$('[data-testid=dungeon-inventory] [data-item=knight_helm]'); if (!c) throw new Error('sin casilla'); if (s.touch) await c.tap(); else await c.click(); });
    { const x = await p.$('[data-testid=btn-close-inventory]'); if (x) await x.click(); else await p.keyboard.press('Escape'); } await p.waitForTimeout(300);
    const ci = await p.$('[data-testid=dungeon-inventory]'); if (ci) { await p.keyboard.press('i'); await p.waitForTimeout(300); }
    await tryShot('6-saco', async () => {
      await G(() => { const g = window.__GRAVEVOW__; const grid = Array(24).fill(null);
        [['gold_coins', 37], ['iron_sword', 1], ['health_potion', 1], ['bone_dagger', 1], ['bandage', 2], ['water', 1]].forEach(([id, q], i) => { grid[i] = { uid: 'l' + i, itemId: id, qty: q }; });
        g.setState({ chests: { c1: grid }, modal: { type: 'loot', session: { id: 'c1', source: 'chest', title: 'Cofre de hierro', initialCount: 6, given: [], shareAsked: false, totalValue: 0, givenValue: 0, givenGold: 0 } } }); });
      await p.waitForSelector('[data-testid=loot-modal]');
    });
    await tryShot('6b-saco-ficha', async () => { const c = await p.$('[data-testid=loot-modal] [data-item=iron_sword]'); if (!c) throw new Error('sin casilla'); if (s.touch) await c.tap(); else await c.click(); });
    await b.close();
  }
})();
