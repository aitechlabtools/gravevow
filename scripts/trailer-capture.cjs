// Graba escenas reales de gameplay para el tráiler (fotogramas JPEG con marca de tiempo).
// Uso: node scripts/trailer-capture.cjs http://localhost:5173/play/ carpeta_salida
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || 'trailer-frames';
const W = 1280, H = 720;

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: W, height: H } });
  const cdp = await page.context().newCDPSession(page);
  const wait = (ms) => page.waitForTimeout(ms);
  const S = () => page.evaluate(() => window.__GRAVEVOW__.getState());
  const tp = (x, y) => page.evaluate(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x, y), [x, y]);

  // Graba mientras se ejecuta fn()
  async function record(name, fn) {
    const dir = `${OUT}/${name}`;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const frames = [];
    const onFrame = async ({ data, metadata, sessionId }) => {
      const t = metadata.timestamp;
      const f = `${dir}/${String(frames.length).padStart(5, '0')}.jpg`;
      fs.writeFileSync(f, Buffer.from(data, 'base64'));
      frames.push({ f, t });
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    };
    cdp.on('Page.screencastFrame', onFrame);
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
    await fn();
    await cdp.send('Page.stopScreencast');
    cdp.off('Page.screencastFrame', onFrame);
    fs.writeFileSync(`${dir}/frames.json`, JSON.stringify(frames));
    console.log(name, frames.length, 'fotogramas', frames.length ? (frames.at(-1).t - frames[0].t).toFixed(1) + 's' : '');
  }

  // Estilo cinematográfico: sin paneles de interfaz en la exploración
  const cinematic = (on) => page.evaluate((on) => {
    let st = document.getElementById('cine');
    if (!st) { st = document.createElement('style'); st.id = 'cine'; document.head.appendChild(st); }
    st.textContent = on ? '[data-testid^=hud-], .absolute.right-3.top-3, .absolute.left-3.bottom-3, [aria-live=polite].absolute { display: none !important; }' : '';
  }, on);

  await page.goto(BASE + '?debug');
  await page.evaluate(() => indexedDB.deleteDatabase('gravevow'));
  await page.reload();
  await page.click('[data-testid=btn-play]');
  await page.fill('[data-testid=name-input]', 'Aldric');
  await page.click('[data-testid=btn-create]');
  
  // Guerrero de nivel 5 con equipo épico, para que luzca
  await page.evaluate(() => {
    const s = window.__GRAVEVOW__.getState();
    s.profile.character.level = 5;
    s.profile.tutorialSeen.dungeon = true;
    const set = (slot, id) => (s.profile.equipment[slot] = { uid: 'tr-' + id, itemId: id, qty: 1 });
    set('mainHand', 'knight_sword'); set('offHand', 'bastion_shield'); set('helmet', 'knight_helm'); set('armor', 'chainmail'); set('gloves', 'gauntlets'); set('boots', 'swift_boots');
    s.profile.backpack[0] = { uid: 'tr-pot', itemId: 'health_potion', qty: 5 };
  });
  await page.click('[data-testid=tab-character]');
  await page.click('[data-testid=tab-play]');
  await wait(400);

  // 1 · Entrar en la mazmorra
  await record('01-entrada', async () => {
    await wait(700);
    await page.click('[data-testid=btn-enter-dungeon]');
    await wait(1200);
    await cinematic(true);
    await page.keyboard.down('d'); await wait(1600); await page.keyboard.up('d');
    await page.keyboard.down('s'); await wait(900); await page.keyboard.up('s');
  });

  // 2 · Explorar: pasillo con antorchas y cofre
  await record('02-explorar', async () => {
    await page.evaluate(() => { for (const e of window.__GRAVEVOW__.scene().enemies) if (['e_skel1', 'e_skel2'].includes(e.id)) { e.dead = true; e.sprite.destroy(); e.shadow.destroy(); } });
    await tp(15, 13);
    await wait(500);
    await page.keyboard.down('s'); await wait(1300); await page.keyboard.up('s');
    await tp(18, 17); await wait(400);
    await page.keyboard.press('e'); await wait(1300);
    await page.keyboard.press('Escape'); await wait(300);
  });

  // 3 · Combate contra el jefe
  await record('03-combate', async () => {
    await page.evaluate(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_boss', 'ossuary_lord'));
    for (let i = 0; i < 4; i++) {
      for (let k = 0; k < 15 && !(await page.$('[data-testid=act-special]')); k++) await wait(200);
      if (await page.$('[data-testid=act-special]')) {
        await page.click('[data-testid=act-special]');
        const id = i === 0 ? 'war_cry' : i === 1 ? 'rending_slash' : 'shield_bash';
        const btn = await page.$(`[data-testid=skill-${id}]:not([disabled])`);
        if (btn) await btn.click(); else { await page.keyboard.press('Escape'); await page.click('[data-testid=act-attack]'); }
      }
      await wait(900);
    }
  });
  // Termina el combate del jefe sin grabar (gana el jugador)
  await page.evaluate(() => { const s = window.__GRAVEVOW__.getState(); s.combat.state.combatants.find((c) => c.id === 'e_boss').hp = 1; });
  for (let i = 0; i < 20; i++) {
    const s = await S();
    if (s.combat?.state.outcome) break;
    if (await page.$('[data-testid=act-attack]')) await page.click('[data-testid=act-attack]');
    await wait(500);
  }
  if (await page.$('[data-testid=btn-combat-continue]')) await page.click('[data-testid=btn-combat-continue]');
  await wait(500);

  // 4 · Otro aventurero: Kael
  await record('04-kael', async () => {
    await page.evaluate(() => { for (const e of window.__GRAVEVOW__.scene().enemies) if (e.id === 'e_skel3' && !e.dead) { e.dead = true; e.sprite.destroy(); e.shadow.destroy(); } });
    const r = await page.evaluate(() => { const r = window.__GRAVEVOW__.scene().rival; return [r.x, r.y]; });
    await tp(Math.floor(r[0]) + 2, Math.floor(r[1]) + 1);
    await wait(600);
    await page.keyboard.down('w'); await wait(500); await page.keyboard.up('w');
    await page.evaluate(() => window.__GRAVEVOW__.actions.interactRival());
    await wait(500);
    await page.click('[data-testid=rival-talk]'); await wait(900);
    await page.click('[data-testid=rival-ally]'); await wait(1400);
  });
  await page.keyboard.press('Escape');
  await wait(300);

  // 5 · La traición
  await record('05-traicion', async () => {
    await page.evaluate(() => { const s = window.__GRAVEVOW__.getState(); s.rival.greed = 100; s.rival.trust = 0; });
    await page.evaluate(() => window.__GRAVEVOW__.actions.checkBetrayal(true));
    for (let i = 0; i < 3; i++) {
      for (let k = 0; k < 15 && !(await page.$('[data-testid=act-attack]')); k++) await wait(200);
      if (await page.$('[data-testid=act-attack]')) await page.click('[data-testid=act-attack]');
      await wait(1000);
    }
  });
  await page.evaluate(() => { const s = window.__GRAVEVOW__.getState(); const r = s.combat?.state.combatants.find((c) => c.id === 'rival'); if (r) r.hp = 1; });
  for (let i = 0; i < 20; i++) {
    const s = await S();
    if (!s.combat || s.combat.state.outcome) break;
    if (await page.$('[data-testid=act-attack]')) await page.click('[data-testid=act-attack]');
    await wait(500);
  }
  if (await page.$('[data-testid=btn-combat-continue]')) await page.click('[data-testid=btn-combat-continue]');
  await wait(600);

  // 6 · Escapar por el portal
  await record('06-portal', async () => {
    await tp(5, 23);
    await wait(500);
    await page.keyboard.down('s'); await wait(500); await page.keyboard.up('s');
    await page.keyboard.press('e');
    await wait(3900);
  });

  await b.close();
})().catch((e) => { console.error('FALLO', e); process.exit(1); });
