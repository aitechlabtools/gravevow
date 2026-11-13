// Reparto con el errante aliado: medidor del saco de combate, cobro en el portal (pagar, negarse, atacar).
// Uso: node scripts/reparto-check.cjs http://localhost:5173/play/ [carpeta] [dispositivo de Playwright]
const { leaveSummary, summaryPage } = require('./lib/summary.cjs');
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || 'reparto-shots';
const DEV = process.argv[4];
require('fs').mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(DEV ? devices[DEV] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const tap = (sel) => (DEV ? p.tap(sel) : p.click(sel));
  const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
  const ok = (cond, msg) => { if (!cond) throw new Error(msg); console.log('✓ ' + msg); };
  const G = (fn, arg) => p.evaluate(fn, arg);

  await p.goto(BASE + '?debug');
  await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric');
  await tap('[data-testid=btn-create]');
  
  await G(() => { const s = window.__GRAVEVOW__.getState(); s.profile.tutorialSeen.dungeon = true; });

  // Entra, alía a Kael a la fuerza y lo deja a tu lado
  const enter = async () => {
    await tap('[data-testid=tab-play]'); await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1200);
    await G(() => { const { getState, actions } = window.__GRAVEVOW__; const s = getState();
      Object.assign(s.rival, { who: 'kael', disposition: 'allied', hp: 200, risk: 'kael', chance: 0, traitor: false, goldAtJoin: 0, shareScore: 0, paid: undefined, betrayedBy: null, betrayed: false });
      actions.setHud({}); });
  };
  await enter();

  // 1 · Combate con Kael al lado: el saco espera su parte, con medidor por valor
  await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_x', 'skeleton'));
  for (let i = 0; i < 40 && !(await p.$('[data-testid=act-attack]:not([disabled])')); i++) await p.waitForTimeout(150);
  await G(() => { const s = window.__GRAVEVOW__.getState(); for (const c of s.combat.state.combatants) if (c.side === 'B') c.hp = 1; });
  for (let i = 0; i < 20; i++) { if (await G(() => !!window.__GRAVEVOW__.getState().combat?.state.outcome)) break; const a = await p.$('[data-testid=act-attack]:not([disabled])'); if (a) await a.click(); await p.waitForTimeout(400); }
  await tap('[data-testid=btn-combat-continue]'); await p.waitForTimeout(300);
  const bag = await G(() => { const s = window.__GRAVEVOW__.getState(); const b = Object.values(s.bags)[0]; if (!b) return null;
    // Botín conocido para la prueba: una espada y monedas
    b.grid = b.grid.map(() => null); b.grid[0] = { uid: 't1', itemId: 'knight_sword', qty: 1 }; b.grid[1] = { uid: 't2', itemId: 'gold_coins', qty: 10 }; b.allyShare = true; return b.id; });
  ok(!!bag, 'el combate deja un saco');
  await G((id) => window.__GRAVEVOW__.actions.openBag(id), bag);
  await p.waitForSelector('[data-testid=share-meter]');
  ok((await p.getAttribute('[data-testid=share-meter]', 'data-verdict')) === 'greedy', 'el saco de combate pide reparto (medidor en «te mira mal»)');
  await shot('01-saco-avaro');
  await tap('[data-testid=slot-loot-1]'); await tap('[data-testid=btn-give]');
  const v = await p.getAttribute('[data-testid=share-meter]', 'data-verdict');
  await shot('02-saco-monedas');
  ok(v === 'stingy' || v === 'fair', `dar monedas cuenta por valor (${v})`);
  await tap('[data-testid=btn-close-loot]'); await p.waitForTimeout(200);
  const r1 = await G(() => window.__GRAVEVOW__.getState().rival);
  ok(r1.gold >= 10, 'las monedas dadas van a la bolsa de Kael');

  // 2 · Portal: pide su parte y pagas (con oro también en el bolsillo seguro)
  await G(() => { const s = window.__GRAVEVOW__.getState(); s.expedition.backpack[5] = { uid: 'c1', itemId: 'gold_coins', qty: 10 }; s.expedition.pocket[0] = { uid: 'c2', itemId: 'gold_coins', qty: 10 }; window.__GRAVEVOW__.actions.requestExtract(); });
  await p.waitForSelector('[data-testid=rival-demand]');
  await shot('03-portal-pide');
  const amount = await G(() => window.__GRAVEVOW__.getState().modal.amount);
  ok(amount > 0, `Kael pide ${amount} monedas en el portal (cuenta también el bolsillo seguro)`);
  await tap('[data-testid=rival-pay]');
  await p.waitForSelector('[data-testid=summary]', { timeout: 10000 });
  await shot('04-resumen');
  ok(/Le pagaste su parte/.test(await p.textContent('[data-testid=summary]')), 'el resumen dice lo que le pagaste');

  // 3 · Negarse: combate a muerte sin huida
  await leaveSummary(p);
  await enter();
  await G(() => { const s = window.__GRAVEVOW__.getState(); s.expedition.backpack[5] = { uid: 'c3', itemId: 'gold_coins', qty: 10 }; window.__GRAVEVOW__.actions.requestExtract(); });
  await p.waitForSelector('[data-testid=rival-demand]');
  await tap('[data-testid=rival-refuse]');
  await p.waitForSelector('[data-testid=act-attack]', { timeout: 10000 });
  await p.waitForTimeout(500);
  await shot('05-negarse');
  const c = await G(() => { const s = window.__GRAVEVOW__.getState(); return { flee: s.combat.state.canFlee, title: s.combat.title }; });
  ok(!c.flee && /su parte/.test(c.title), `negarse lleva a un combate sin huida («${c.title}»)`);
  // Gana y vuelve al Bastión: Kael te guarda rencor
  await G(() => { const s = window.__GRAVEVOW__.getState(); for (const x of s.combat.state.combatants) if (x.side === 'B') x.hp = 1; });
  for (let i = 0; i < 30; i++) { if (await G(() => !!window.__GRAVEVOW__.getState().combat?.state.outcome)) break; const a = await p.$('[data-testid=act-attack]:not([disabled])'); if (a) await a.click(); await p.waitForTimeout(400); }
  await tap('[data-testid=btn-combat-continue]'); await p.waitForTimeout(300);
  await G(() => window.__GRAVEVOW__.actions.requestExtract());
  await p.waitForSelector('[data-testid=summary]', { timeout: 10000 });
  ok((await G(() => window.__GRAVEVOW__.getState().profile.kael.grudge)) === 1, 'Kael recuerda que le negaste su parte');

  // 4 · Atacarle primero: empieza aturdido
  await leaveSummary(p);
  await enter();
  await G(() => { const s = window.__GRAVEVOW__.getState(); s.expedition.backpack[5] = { uid: 'c4', itemId: 'gold_coins', qty: 10 }; window.__GRAVEVOW__.actions.requestExtract(); });
  await p.waitForSelector('[data-testid=rival-demand]');
  await tap('[data-testid=rival-strike]');
  await p.waitForSelector('[data-testid=act-attack]', { timeout: 10000 });
  await shot('06-atacar');
  const t = await G(() => window.__GRAVEVOW__.getState().combat.title);
  ok(/por sorpresa/.test(t), `atacarle primero es una traición por sorpresa («${t}»)`);

  console.log('errores', errs.length ? errs : 'ninguno');
  await b.close();
  if (errs.length) process.exit(1);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
