// Capturas de cada subzona: el mapa al entrar y un combate contra su jefe.
// Uso: node scripts/subzone-shots.cjs [url] [carpeta] [subzonas separadas por comas]
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/claude-0/subzonas';
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const ALL = ['afueras', 'castillo', 'calabozos', 'osario', 'catacumbas', 'panteon', 'carmesi', 'puertas', 'rios', 'trono'];
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const errs = [];
  for (const id of ONLY ?? ALL) {
    // Una página nueva por subzona: así no arrastra combates ni escenas de la anterior
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + '?debug');
    await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload();
    await p.click('[data-testid=btn-play]'); await p.evaluate(() => document.fullscreenElement && document.exitFullscreen());
    await p.fill('[data-testid=name-input]', 'Saqueador'); await p.click('[data-testid=btn-create]'); 
    const lv = { afueras: 6, castillo: 15, calabozos: 25, osario: 35, catacumbas: 45, panteon: 55, carmesi: 65, puertas: 75, rios: 85, trono: 95 }[id];
    await p.evaluate(async ([id, lv]) => {
      const d = window.__GRAVEVOW__; const pr = d.getState().profile;
      d.setState({ screen: 'lobby', expedition: null, dungeon: null, combat: null, modal: null, profile: { ...pr, character: { ...pr.character, level: lv }, bossesDefeated: ['ossuary_lord', 'veiled_queen'], stats: { ...pr.stats, expeditions: 5 }, tutorialSeen: { lobby: true, dungeon: true }, tutorialDone: true } });
      await d.actions.enterDungeon(id);
    }, [id, lv]);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/${id}-mapa.png` });
    // Llevar al héroe junto al jefe para ver el combate
    const ok = await p.evaluate(() => { const d = window.__GRAVEVOW__; const sc = d.scene(); const boss = sc.enemies.find((e) => e.boss); if (!boss) return false; sc.debugTeleport(Math.floor(boss.x), Math.floor(boss.y) - 1); return true; });
    if (ok) {
      try { await p.waitForSelector('[data-testid=combat]', { timeout: 6000 }); await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/${id}-jefe.png` }); } catch { console.log(id, 'sin combate'); }
    }
    const st = await p.evaluate(() => { const s = window.__GRAVEVOW__.getState(); return { sub: s.dungeon?.subzone, name: s.dungeon?.name, foe: s.combat?.state?.combatants?.find((c) => c.side === 'B')?.name, hp: s.combat?.state?.combatants?.find((c) => c.side === 'B')?.stats?.maxHp }; });
    console.log(id, JSON.stringify(st));
    await p.close();
  }
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
