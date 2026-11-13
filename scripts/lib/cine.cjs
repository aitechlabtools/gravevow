// Ayudas comunes para grabar tomas y capturas guionizadas (tráiler v6 y capturas de la landing v4).
const fs = require('fs');
let OUT = 'frames'; let want = () => true; let BASE = 'http://localhost:5173/play/';
function setup(o) { OUT = o.out; want = o.want || want; BASE = o.base || BASE; }
const GEAR = { mainHand: 'hellforged_blade', offHand: 'demonscale_shield', helmet: 'hellsteel_helm', armor: 'hellsteel_plate',
  gloves: 'demon_gauntlets', boots: 'cinder_boots', amulet: 'heart_of_belzar', ring: 'ember_ring' };
// Botín de todas las rarezas, con atributos y legendarias
const LOOT = [['chain_axe', 'epic', ['vampire', 'bleeding']], ['belzar_chain', 'legendary'], ['throne_greatsword', 'epic', ['executioner', 'swift']], ['dukes_rapier', 'rare', ['frost']],
  ['obsidian_sword', 'uncommon', ['stone']], ['war_mace', 'common'], ['belzar_broken_crown', 'legendary'], ['silver_helm', 'rare', ['hermit']], ['grave_boots', 'uncommon', ['swift']], ['chain_shield', 'rare', ['sage']]];

function mk(name) { const dir = `${OUT}/${name}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); return dir; }

async function session(b, vp, touch) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const wait = (ms) => page.waitForTimeout(ms);
  const ev = (fn, a) => page.evaluate(fn, a);
  const act = async (id, ms = 350) => { const sel = `[data-testid=${id}]`; await page.waitForSelector(sel, { timeout: 6000 }); if (touch) await page.tap(sel); else await page.click(sel); await wait(ms); };
  const hover = async (id, ms = 450) => { const sel = `[data-testid=${id}]`; await page.waitForSelector(sel, { timeout: 6000 }); await page.hover(sel); await wait(ms); };
  // Screencast de la interfaz (marca de tiempo real de cada fotograma)
  async function record(name, fn) {
    if (!want(name)) return;
    const dir = mk(name); const frames = [];
    const onFrame = ({ data, metadata, sessionId }) => {
      const f = `${dir}/${String(frames.length).padStart(5, '0')}.jpg`;
      fs.writeFileSync(f, Buffer.from(data, 'base64')); frames.push({ f, t: metadata.timestamp });
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    };
    cdp.on('Page.screencastFrame', onFrame);
    await ev(() => window.__GRAVEVOW__?.setState({ toasts: [] }));
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: Math.min(vp.width, 1280), maxHeight: Math.min(vp.height, 720), everyNthFrame: 1 });
    await fn();
    await cdp.send('Page.stopScreencast'); cdp.off('Page.screencastFrame', onFrame);
    fs.writeFileSync(`${dir}/frames.json`, JSON.stringify(frames));
    console.log(name, frames.length, 'fotogramas', frames.length ? ((frames.at(-1).t - frames[0].t)).toFixed(1) + 's' : '');
  }
  // Fotograma a fotograma (mazmorra): el bucle del juego se detiene y se avanza a 30 fps exactos
  async function stepRecord(name, n, perFrame) {
    if (!want(name)) return;
    const dir = mk(name); const frames = [];
    await ev(() => { const g = window.__GRAVEVOW__.game; g.loop.sleep(); window.__cine = { game: g, t: performance.now() }; });
    for (let i = 0; i < n; i++) {
      await ev(([src, i]) => { const c = window.__cine; const sc = window.__GRAVEVOW__.scene();
        if (!sc) return;
        if (src) new Function('i', 'sc', 'cam', src)(i, sc, sc.cameras.main);
        c.t += 1000 / 30; sc.lightTimer = 1000; c.game.step(c.t, 1000 / 30); }, [perFrame || '', i]);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: vp.width, height: vp.height, scale: Math.min(1, 1280 / vp.width) } });
      const f = `${dir}/${String(i).padStart(5, '0')}.jpg`; fs.writeFileSync(f, Buffer.from(data, 'base64')); frames.push({ f, t: i / 30 });
    }
    await ev(() => window.__cine.game.loop.wake());
    fs.writeFileSync(`${dir}/frames.json`, JSON.stringify(frames));
    console.log(name, n, 'fotogramas (paso a paso)');
  }
  const start = async () => {
    await page.goto(BASE + '?debug&noclass');
    await ev(() => indexedDB.deleteDatabase('gravevow'));
    await page.reload(); await wait(700);
    await act('btn-play');
    await ev(() => document.fullscreenElement && document.exitFullscreen());
  };
  const advanced = () => ev(([GEAR, LOOT]) => {
    const G = window.__GRAVEVOW__; const pr = G.getState().profile;
    const bp = [...pr.backpack]; LOOT.forEach(([id, rarity, affixes], i) => { bp[i] = { uid: 'bp-' + id, itemId: id, qty: 1, rarity, ...(affixes ? { affixes } : {}) }; });
    bp[LOOT.length] = { uid: 'bp-pot', itemId: 'health_potion', qty: 5 };
    const eq = { ...pr.equipment }; for (const [slot, id] of Object.entries(GEAR)) eq[slot] = { uid: 'eq-' + id, itemId: id, qty: 1 };
    const st = [...pr.stash];
    [['iron_ore', 10], ['silver_ore', 8], ['blessed_silver', 10], ['ancient_bone', 10], ['ectoplasm', 6], ['copper_ore', 10], ['sulfur', 8], ['obsidian_shard', 8]]
      .forEach(([id, q], i) => { st[i] = { uid: 'st' + i, itemId: id, qty: q }; });
    G.setState({ profile: { ...pr, equipment: eq, backpack: bp, stash: st, gold: 21450,
      character: { ...pr.character, level: 95 }, classSkills: { unlocked: ['war_cry', 'bloodthirst', 'last_bastion', 'hold_line', 'steel_whirl'], equipped: 'bloodthirst' }, tutorialSeen: { ...pr.tutorialSeen, lobby: true, dungeon: true },
      stats: { ...pr.stats, expeditions: 64, extractions: 51, kills: 830 }, bossesDefeated: ['ossuary_lord', 'veiled_queen', 'belzar'],
      reputation: { garra: 2600, brand: 2600, orvel: 1800, vesper: 1200 }, skins: { owned: [], equipped: null } } });
  }, [GEAR, LOOT]);
  const cinematic = (on) => ev((on) => { let st = document.getElementById('cine'); if (!st) { st = document.createElement('style'); st.id = 'cine'; document.head.appendChild(st); }
    st.textContent = on ? '[data-testid^=hud-], [data-testid=tutorial-guide], .absolute.right-3.top-3, .absolute.left-3.bottom-3, [aria-live=polite].absolute, .absolute.top-3, .absolute.bottom-3 { display: none !important; }' : ''; }, on);
  const enter = async (sub) => {
    await ev(() => { const D = window.__GRAVEVOW__; if (D.getState().screen === 'dungeon') D.setState({ expedition: null, screen: 'lobby', dungeon: null, merc: null, combat: null }); });
    await wait(300);
    await ev(async (z) => { await window.__GRAVEVOW__.actions.enterDungeon(z); }, sub);
    await wait(1500);
    
    await ev(() => window.__GRAVEVOW__.scene().enemies.forEach((e) => { e.aggro = 0; }));
  };
  // Paseo a cámara: camino largo desde donde estás (BFS), enemigos quietos
  const walk = () => ev(() => {
    const sc = window.__GRAVEVOW__.scene();
    const sx = Math.floor(sc.player.x), sy = Math.floor(sc.player.y); const prev = new Map([[sx + ',' + sy, null]]); const q = [[sx, sy]]; const dist = new Map([[sx + ',' + sy, 0]]); let far = [sx, sy], fd = 0;
    while (q.length) { const [x, y] = q.shift(); const d = dist.get(x + ',' + y); if (d <= 12 && d > fd) { fd = d; far = [x, y]; }
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (prev.has(k) || !sc.walkableTile(nx, ny)) continue; prev.set(k, [x, y]); dist.set(k, d + 1); q.push([nx, ny]); } }
    const path = []; let cur = far; while (cur && !(cur[0] === sx && cur[1] === sy)) { path.unshift(cur); cur = prev.get(cur[0] + ',' + cur[1]); }
    sc.path = path;
  });
  return { b, ctx, page, cdp, wait, ev, act, hover, record, stepRecord, start, advanced, cinematic, enter, walk };
}

module.exports = { setup, session, GEAR, LOOT };
