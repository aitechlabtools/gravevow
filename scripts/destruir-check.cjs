// 13/11: destruir en el taller de Orik (recluta directo, montón con cantidad, valioso manteniendo pulsado),
// dividir montones con el selector común y dar parte de un montón al aliado, y cuerpo del aliado caído.
// Uso: node scripts/destruir-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const [,, url = 'http://localhost:5173/play/', out = 'destruir', dev] = process.argv;
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok  ' : 'FALLO ') + m); if (!c) { bad++; process.exitCode = 1; } };
  const G = (fn, arg) => p.evaluate(fn, arg);
  const tall = async (sel, what) => { const bb = await (await p.$(sel))?.boundingBox(); ok(!!bb && (!dev || bb.height >= 43.5), `${what} de 44 px o más (${bb && Math.round(bb.height)})`); };
  const count = (id) => G((id) => { const pr = window.__GRAVEVOW__.getState().profile; return [...pr.stash].filter((x) => x && x.itemId === id && !String(x.uid).startsWith('cover')).reduce((t, x) => t + x.qty, 0); }, id);
  const at = (id) => G((id) => window.__GRAVEVOW__.getState().profile.stash.findIndex((x) => x && x.itemId === id), id);

  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]');
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile;
    pr.tutorialSeen.dungeon = true; pr.tutorialDone = true;
    const st = pr.stash.map(() => null); let k = 0; const put = (itemId, qty, extra) => { st[k] = { uid: 'd' + k, itemId, qty, ...extra }; k++; };
    put('recruit_sword', 1); put('health_potion', 5); put('belzar_chain', 1, { rarity: 'legendary' }); put('iron_ore', 6);
    g.setState({ profile: { ...pr, stash: st, character: { ...pr.character, level: 12 } } }); });

  // ── 1. Dividir con el selector común (Intendencia) ──
  await tap('[data-testid=tab-stash]');
  if (await p.$('[data-testid=alijo-seg] [data-testid=seg-storage]')) await tap('[data-testid=alijo-seg] [data-testid=seg-storage]');
  await p.waitForSelector(`[data-testid=slot-stash-${await at('iron_ore')}]`);
  await tap(`[data-testid=slot-stash-${await at('iron_ore')}]`);
  await tap('[data-testid=act-split-stack]');
  await p.waitForSelector('[data-testid=amt-picker]');
  await tall('[data-testid=amt-mas1]', '+1'); await tall('[data-testid=amt-half]', 'Mitad');
  await tap('[data-testid=amt-menos1]'); await tap('[data-testid=amt-menos1]');
  ok((await p.textContent('[data-testid=amt-value]')).trim() === '1', 'el selector baja con −1');
  await p.screenshot({ path: `${out}/dividir.png` });
  await tap('[data-testid=amt-confirm]');
  const piles = await G(() => window.__GRAVEVOW__.getState().profile.stash.filter((x) => x && x.itemId === 'iron_ore').map((x) => x.qty).sort());
  ok(JSON.stringify(piles) === '[1,5]', `dividir separa 1 de 6 sin crear ni perder: ${piles}`);
  ok(!(await p.$('[data-testid=act-destroy]')), 'en la Intendencia no hay botón de destruir');

  // ── 2. Destruir en el taller de Orik ──
  await tap('[data-testid=tab-merchants]'); await p.waitForSelector('[data-testid=vendor-orik]'); await tap('[data-testid=vendor-orik]');
  await tap('[data-testid=vendor-view-scrap]');
  await tap('[data-testid=orik-mode-destroy]'); await p.waitForSelector('[data-testid=destroy]');
  await tall('[data-testid=orik-mode-destroy]', 'Pestaña Destruir');
  // Recluta: sin confirmación extra
  await tap(`[data-testid=destroy-stash-${await at('recruit_sword')}]`);
  await tall('[data-testid=destroy-go]', 'Destruir');
  await tap('[data-testid=destroy-go]');
  ok(await count('recruit_sword') === 0, 'el equipo de recluta se destruye con un toque');
  // Montón: elegir 2 de 5, con confirmación normal (dos toques)
  const pi = await at('health_potion');
  await tap(`[data-testid=destroy-stash-${pi}]`);
  await p.waitForSelector(`[data-testid=destroy-qty-stash-${pi}-picker]`);
  await tap(`[data-testid=destroy-qty-stash-${pi}-half]`);
  ok((await p.textContent(`[data-testid=destroy-qty-stash-${pi}-value]`)).trim() === '2', 'Mitad de 5 = 2');
  await p.screenshot({ path: `${out}/destruir.png` });
  await tap('[data-testid=destroy-go]');
  ok(await count('health_potion') === 5, 'el primer toque solo pide confirmar');
  ok(/¿Seguro\?/.test(await p.textContent('[data-testid=destroy-go]')), 'pide «¿Seguro?»');
  await tap('[data-testid=destroy-go]');
  ok(await count('health_potion') === 3, 'se destruyen 2 y quedan 3');
  // Legendario: mantener pulsado
  await tap(`[data-testid=destroy-stash-${await at('belzar_chain')}]`);
  ok(!!(await p.$('[data-testid=destroy-hold]')), 'lo valioso pide mantener pulsado');
  await tap('[data-testid=destroy-hold]');
  await p.waitForTimeout(300);
  ok(await count('belzar_chain') === 1, 'un toque corto no destruye lo valioso');
  const hb = await (await p.$('[data-testid=destroy-hold]')).boundingBox();
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.mouse.down(); await p.waitForTimeout(1300); await p.mouse.up();
  await p.waitForTimeout(200);
  ok(await count('belzar_chain') === 0, 'manteniendo pulsado 1 s se destruye');
  ok((await G(() => document.documentElement.scrollWidth - innerWidth)) <= 1, 'no se sale de la pantalla');

  // ── 3. Dar parte de un montón a Kael y su cuerpo al caer ──
  await G(async () => { const D = window.__GRAVEVOW__; D.dev.forceKael = true; await D.actions.enterDungeon('afueras'); });
  await p.waitForTimeout(1500);
  await G(() => { const D = window.__GRAVEVOW__; D.setState({ rival: { ...D.getState().rival, disposition: 'allied' } });
    const g = Array.from({ length: 12 }, () => null); g[0] = { uid: 'pp', itemId: 'health_potion', qty: 4 }; g[1] = { uid: 'ax', itemId: 'chain_axe', qty: 1, rarity: 'epic' };
    D.setState({ chests: { ...D.getState().chests, prueba: g } }); D.actions.openChest('prueba', 'common', true); });
  await p.waitForSelector('[data-testid=loot-modal]');
  const shareOn = await G(() => window.__GRAVEVOW__.getState().modal?.session?.shareAsked);
  if (!shareOn) await G(() => { const D = window.__GRAVEVOW__; const m = D.getState().modal; D.setState({ modal: { ...m, session: { ...m.session, shareAsked: true } } }); });
  await tap('[data-testid=loot-modal] [data-testid=slot-loot-0]');
  await tap('[data-testid=btn-give-split]');
  await p.waitForSelector('[data-testid=amt-picker]');
  await tap('[data-testid=amt-half]'); await tap('[data-testid=amt-confirm]');
  const after = await G(() => { const s = window.__GRAVEVOW__.getState(); return { chest: s.chests.prueba.filter(Boolean).map((x) => x.itemId + 'x' + x.qty), given: s.modal.session.given }; });
  ok(after.chest.includes('health_potionx2') && after.given.filter((x) => x === 'health_potion').length === 2, `dar 2 de 4: ${JSON.stringify(after)}`);
  await p.screenshot({ path: `${out}/dar.png` });
  await tap('[data-testid=btn-close-loot]');
  const bagItems = await G(() => window.__GRAVEVOW__.getState().rival.bagItemIds);
  // Kael cae en un combate a tu lado
  await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_bandit', 'bandit'));
  await p.waitForSelector('[data-testid=combat]', { timeout: 8000 }).catch(() => {});
  const bags0 = await G(() => Object.keys(window.__GRAVEVOW__.getState().bags).length);
  await G(() => { const D = window.__GRAVEVOW__; const c = D.getState().combat; const r = c.state.combatants.find((x) => x.id === 'rival');
    for (const x of c.state.combatants) if (x.side === 'B') x.hp = 1;
    if (r) { r.hp = 0; r.potions = 0; } D.setState({ combat: { ...c } }); });
  for (let k = 0; k < 20 && !(await G(() => window.__GRAVEVOW__.getState().combat?.state.outcome)); k++) {
    if (await p.$('[data-testid=act-attack]:not([disabled])')) await tap('[data-testid=act-attack]');
    await p.waitForTimeout(500);
  }
  const res = await G(() => { const s = window.__GRAVEVOW__.getState(); const bodies = Object.values(s.bags).filter((x) => /^Cuerpo de/.test(x.label));
    return { outcome: s.combat?.state.outcome, disp: s.rival.disposition, left: s.rival.bagItemIds.length, bodies: bodies.map((x) => x.grid.filter(Boolean).map((i) => i.itemId + 'x' + i.qty)) }; });
  ok(res.disp === 'dead' && res.bodies.length === 1, `Kael cae y deja un cuerpo: ${JSON.stringify(res)} (antes llevaba ${bagItems})`);
  ok(res.bodies[0]?.some((x) => x.startsWith('health_potion')) && res.left === 0, 'el cuerpo guarda lo que le diste y él queda vacío (sin duplicar)');
  await G(() => window.__GRAVEVOW__.actions.closeCombat()); await p.waitForTimeout(600);
  const bodies2 = await G(() => Object.values(window.__GRAVEVOW__.getState().bags).filter((x) => /^Cuerpo de/.test(x.label)).length);
  ok(bodies2 === 1, 'cerrar el combate no crea un segundo cuerpo');
  await p.screenshot({ path: `${out}/cuerpo.png` });

  ok(!errs.length, 'sin errores en la página: ' + errs.join(' | '));
  console.log(bad ? `${bad} fallos` : 'Todo bien');
  await b.close();
})().catch((e) => { console.error('FALLO', e); process.exit(1); });
