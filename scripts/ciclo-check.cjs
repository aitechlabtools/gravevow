// Fase 10: ciclo completo en S1 (sección 33 del plan maestro), en partida nueva o migrada desde la versión 2.
// Preparar (comprar una venda), entrar en S1, combatir, herirse y tratarse, recoger un objeto de varias casillas,
// desgastar el arma, extraer, recargar, reparar con Nira, bajar otra vez y morir (kit de recluta, bolsillo intacto).
// Uso: node scripts/ciclo-check.cjs <url>/play/ <carpeta> <warrior|mage> <nueva|migrada> [dispositivo]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const [,, url = 'http://localhost:5173/play/', out = 'ciclo', cls = 'warrior', mode = 'nueva', dev] = process.argv;
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  let failed = false;
  const fail = (m) => { console.log('FALLO:', m); failed = true; process.exitCode = 1; };
  const G = (fn, arg) => p.evaluate(fn, arg);
  const shot = (n) => p.screenshot({ path: `${out}/${cls}-${mode}-${n}.png` });
  const step = (n) => console.log('·', n);
  const count = (where, id) => G(([where, id]) => { const s = window.__GRAVEVOW__.getState(); const g = where === 'exp' ? s.expedition.backpack : [...s.profile.backpack, ...s.profile.stash]; return g.filter((x) => x && x.itemId === id).reduce((t, x) => t + x.qty, 0); }, [where, id]);
  const origin = new URL(url).origin;

  // ── Crear el personaje ──
  await p.goto(url + '?debug');
  await G(() => new Promise((r) => { const q = indexedDB.deleteDatabase('gravevow'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  await p.reload(); await p.waitForSelector('[data-testid=btn-play]');
  await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', cls === 'mage' ? 'Ysolde' : 'Aldric');
  await tap(`[data-testid=class-${cls}]`);
  await tap('[data-testid=btn-create]'); 
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; g.setState({ profile: { ...pr, tutorialDone: true, tutorialSeen: { lobby: true, dungeon: true } } }); });
  await p.waitForTimeout(500);

  if (mode === 'migrada') {
    step('Partida antigua (versión 2) en la clave «profile»');
    const old = await G(() => {
      const pr = structuredClone(window.__GRAVEVOW__.getState().profile);
      for (const k of ['goldPhysical', 'needs', 'wounds', 'refuge', 'prep', 'reception', 'workshop', 'crafted', 'cooked', 'cooking', 'playMs']) delete pr[k];
      const noCoins = (g) => g.map((x) => (x && (x.itemId === 'gold_coins' || x.itemId === 'cover' || x.gold) ? null : x));
      pr.backpack = noCoins(pr.backpack); pr.stash = noCoins(pr.stash).slice(0, 72); pr.pocket = noCoins(pr.pocket);
      for (const s of Object.values(pr.equipment)) if (s) delete s.dur;
      pr.version = 2; pr.gold = 3000; // monedas antiguas: pasan a oro físico al migrar
      return pr;
    });
    // En una página del mismo origen sin el juego, para que nada vuelva a guardar encima
    await p.goto(origin + '/robots.txt');
    await G((old) => new Promise((res, rej) => {
      const q = indexedDB.deleteDatabase('gravevow');
      q.onsuccess = () => { const o = indexedDB.open('gravevow', 1); o.onupgradeneeded = () => o.result.createObjectStore('save');
        o.onsuccess = () => { const tx = o.result.transaction('save', 'readwrite'); tx.objectStore('save').put(old, 'profile'); tx.oncomplete = () => { o.result.close(); res(); }; tx.onerror = () => rej(tx.error); }; };
      q.onerror = () => rej(q.error);
    }), old);
    await p.goto(url + '?debug'); await p.waitForSelector('[data-testid=btn-play]');
    // Aviso de una sola vez de la migración (almacén por páginas y oro devuelto)
    if (await p.waitForSelector('[data-testid=btn-notice-ok]', { timeout: 2000 }).catch(() => null)) {
      await shot('0-aviso');
      const nb = await (await p.$('[data-testid=btn-notice-ok]')).boundingBox();
      if (dev && nb.height < 43.5) fail('«Entendido» menor de 44 px: ' + nb.height);
      await tap('[data-testid=btn-notice-ok]');
    }
    await tap('[data-testid=btn-play]');
    await p.waitForSelector('[data-testid=tab-play]', { timeout: 8000 }).catch(() => null);
    const mig = await G(() => { const s = window.__GRAVEVOW__.getState(); return s.profile && { cls: s.profile.character.classId, gold: s.profile.gold, phys: s.profile.goldPhysical, needs: !!s.profile.needs }; });
    if (!mig || mig.cls !== cls || !mig.phys || !(mig.gold > 0)) fail('la partida antigua no se migró: ' + JSON.stringify(mig));
    await shot('0-migrada');
  }

  // ── Preparar: una venda de Vesper y pociones para el combate ──
  step('Preparar');
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; const bp = [...pr.backpack]; const i = bp.findIndex((x) => !x); bp[i] = { uid: 'pots', itemId: 'health_potion', qty: 3 }; g.setState({ profile: { ...pr, backpack: bp } }); });
  const gold0 = await G(() => window.__GRAVEVOW__.getState().profile.gold);
  await tap('[data-testid=tab-merchants]'); await tap('[data-testid=btn-merchants]'); await tap('[data-testid=vendor-vesper]');
  await tap('[data-testid=buy-bandage]'); await p.waitForTimeout(150);
  if (!((await G(() => window.__GRAVEVOW__.getState().profile.gold)) < gold0)) fail('la venda no costó oro');
  if ((await count('base', 'bandage')) < 1) fail('no hay venda tras comprarla');
  await tap('[data-testid=vendor-back]');

  // ── Entrar en S1 ──
  step('Entrar en S1');
  await tap('[data-testid=tab-play]'); await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1200);
  const where = await G(() => { const s = window.__GRAVEVOW__.getState(); return { sub: s.expedition?.subzone ?? s.dungeon?.subzone ?? null, zone: s.expedition?.zone ?? null, seed: s.dungeon?.seed }; });
  // La primera bajada es la cripta hecha a mano (plantilla de respaldo); las siguientes, mapas de S1 con semilla
  if (where.zone !== 'mazmorra') fail('no se entró en la Mazmorra: ' + JSON.stringify(where));
  console.log('  ', JSON.stringify(where));
  await shot('1-dentro');

  // ── Combatir contra un bandido ──
  step('Combate');
  const dur0 = await G(() => { const m = window.__GRAVEVOW__.getState().expedition.equipment.mainHand; return m?.dur ?? null; });
  await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_ciclo', 'bandit'));
  await p.waitForSelector('[data-testid=combat]', { timeout: 8000 });
  for (let i = 0; i < 120; i++) {
    const s = await G(() => { const c = window.__GRAVEVOW__.getState().combat; const pl = c?.state.combatants.find((x) => x.id === 'player'); return { out: c?.state.outcome ?? null, hp: pl ? pl.hp / pl.stats.maxHp : 1 }; });
    if (s.out) break;
    if (await p.$('[data-testid=act-attack]:not([disabled])')) {
      if (s.hp < 0.4 && (await p.$('[data-testid=act-bag]:not([disabled])'))) { await tap('[data-testid=act-bag]'); const u = await p.$('[data-testid=use-health_potion]'); if (u) await u.click(); else await tap('[data-testid=act-attack]'); }
      else await tap('[data-testid=act-attack]');
    }
    await p.waitForTimeout(250);
  }
  const outcome = await G(() => window.__GRAVEVOW__.getState().combat?.state.outcome);
  if (outcome !== 'victory') fail('el combate de S1 no se ganó: ' + outcome);
  await shot('2-combate');
  await tap('[data-testid=btn-combat-continue]'); await p.waitForTimeout(300);
  if (await p.$('[data-testid=loot-modal]')) { await tap('[data-testid=btn-take-all]'); await tap('[data-testid=btn-close-loot]'); }
  const dur1 = await G(() => window.__GRAVEVOW__.getState().expedition.equipment.mainHand?.dur ?? null);
  if (dur1 === null || (dur0 !== null && dur1 >= dur0)) fail('el arma no se desgastó: ' + dur0 + ' → ' + dur1);

  // ── Herida y venda ──
  step('Herida y tratamiento');
  await G(() => { const g = window.__GRAVEVOW__, e = g.getState().expedition; const body = structuredClone(e.body); body.parts.legL.bleed = 1; body.parts.legL.hp = Math.floor(body.parts.legL.hp * 0.6); g.setState({ expedition: { ...e, body } }); });
  await tap('[data-testid=hud-body]'); await p.waitForSelector('[data-testid=body-modal]');
  await tap('[data-testid=body-row-legL]');
  const bandBtn = await p.$('[data-testid=treat-bandage-legL]');
  if (!bandBtn) fail('no se ofrece la venda para la pierna que sangra');
  else await tap('[data-testid=treat-bandage-legL]');
  await p.waitForTimeout(200);
  await shot('3-herida');
  const healed = await G(() => window.__GRAVEVOW__.getState().expedition.body.parts.legL.bleed);
  if (healed !== 0) fail('la venda no cortó el sangrado');
  await tap('[data-testid=body-close]');

  // ── Objeto de varias casillas ──
  step('Recoger una espada (3 casillas)');
  await G(() => { const g = window.__GRAVEVOW__, st = g.getState(); const [x, y] = st.hud.playerTile; const bag = { id: 'bag-ciclo', x, y, grid: [{ uid: 'sw', itemId: 'iron_sword', qty: 1 }, ...Array(11).fill(null)], label: 'Restos' }; g.setState({ bags: { ...st.bags, [bag.id]: bag } }); g.actions.openBag(bag.id); });
  await p.waitForSelector('[data-testid=loot-modal]');
  await tap('[data-testid=btn-take-all]'); await tap('[data-testid=btn-close-loot]');
  if ((await count('exp', 'iron_sword')) !== 1) fail('la espada no entró en la mochila');
  const covers = await G(() => window.__GRAVEVOW__.getState().expedition.backpack.filter((x) => x && x.itemId === 'cover').length);
  if (covers < 2) fail('la espada no ocupa varias casillas: ' + covers);

  // ── Extraer ──
  step('Extraer');
  const portal = await G(() => window.__GRAVEVOW__.getState().dungeon.entities.find((e) => e.kind === 'portal'));
  await G(([px, py]) => { for (const e of window.__GRAVEVOW__.scene().enemies) if (!e.dead && Math.hypot(e.x - px, e.y - py) < 9) { e.dead = true; e.sprite.destroy(); e.shadow.destroy(); } }, [portal.x, portal.y]);
  await G(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x, y), [portal.x, portal.y + 1]);
  await p.waitForTimeout(600);
  await p.keyboard.press('e');
  if (await p.$('[data-testid=interact-menu]')) {
    const labels = await p.$$eval('[data-testid^=interact-]:not([data-testid=interact-menu])', (els) => els.map((e) => e.textContent));
    await p.keyboard.press(String(labels.findIndex((l) => /portal/i.test(l)) + 1));
  }
  await p.waitForSelector('[data-testid=summary]', { timeout: 30000 });
  if (!/escapado/i.test(await p.textContent('[data-testid=summary-title]'))) fail('no fue una extracción');
  await shot('4-extraccion');
  await tap('[data-testid=btn-back-lobby]');
  if ((await count('base', 'iron_sword')) !== 1) fail('la espada no llegó al Bastión');

  // ── Recargar ──
  step('Guardar y cargar');
  await p.waitForTimeout(600);
  await p.reload(); await p.waitForSelector('[data-testid=btn-play]'); await tap('[data-testid=btn-play]');
  await p.waitForSelector('[data-testid=tab-play]');
  const after = await G(() => { const pr = window.__GRAVEVOW__.getState().profile; return { dur: pr.equipment.mainHand?.dur ?? null, wounds: pr.wounds, cls: pr.character.classId }; });
  if ((await count('base', 'iron_sword')) !== 1) fail('tras recargar falta la espada');
  if (after.dur !== dur1) fail('tras recargar el desgaste cambió: ' + dur1 + ' → ' + after.dur);
  if (after.cls !== cls) fail('tras recargar cambió la clase');

  // ── Reparar con Nira ──
  step('Reparar');
  await tap('[data-testid=tab-merchants]'); await tap('[data-testid=btn-merchants]'); await tap('[data-testid=vendor-nira]'); await tap('[data-testid=vendor-view-repair]');
  await p.waitForSelector('[data-testid=repair]');
  if (await p.$('[data-testid=repair-all]')) { await tap('[data-testid=repair-all]'); await p.waitForTimeout(200); }
  if (await p.$('[data-testid^=repair-eq-]')) fail('quedan piezas sin reparar');
  await shot('5-reparar');
  await tap('[data-testid=vendor-back]');

  // ── Bajar otra vez y morir ──
  step('Morir');
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; const pk = [...pr.pocket]; pk[pk.findIndex((x) => !x)] = { uid: 'pk', itemId: 'health_potion', qty: 1 }; g.setState({ profile: { ...pr, pocket: pk } }); });
  await tap('[data-testid=tab-play]'); await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1000);
  const w2 = await G(() => { const s = window.__GRAVEVOW__.getState(); return { sub: s.dungeon?.subzone ?? null, seed: s.dungeon?.seed ?? null }; });
  if (w2.sub !== 'afueras' || w2.seed === null) fail('la segunda bajada no es un mapa de S1 con semilla: ' + JSON.stringify(w2));
  await G(() => window.__GRAVEVOW__.actions.trapHit(9999));
  await p.waitForSelector('[data-testid=summary]');
  const rk = await p.waitForSelector('[data-testid=recruit-kit]', { timeout: 3000 }).catch(() => null);
  if (!rk) fail('al volver sin arma no sale el aviso del equipo de recluta');
  else if (!/Has vuelto sin nada/.test(await rk.textContent())) fail('el aviso de recluta no dice el texto acordado');
  await shot('6-muerte');
  // Curación completa tras caer: 1 moneda (o gratis si no te queda ninguna)
  step('Curarse tras caer');
  const offer = await p.waitForSelector('[data-testid=cure-offer]', { timeout: 3000 }).catch(() => null);
  if (!offer) fail('al caer no se ofrece la curación');
  else {
    const label = (await p.textContent('[data-testid=cure-btn]')).trim();
    const g0 = await G(() => window.__GRAVEVOW__.getState().profile.gold);
    if (!(g0 > 0 ? /por 1 de oro/.test(label) : /gratis/.test(label))) fail('el botón de curar no dice el precio correcto: ' + label + ' (oro ' + g0 + ')');
    const cb = await (await p.$('[data-testid=cure-btn]')).boundingBox();
    if (dev && cb.height < 43.5) fail('«Curarse» menor de 44 px');
    await tap('[data-testid=cure-btn]'); await p.waitForTimeout(200);
    const c = await G(() => { const pr = window.__GRAVEVOW__.getState().profile; return { w: pr.wounds ?? null, fallen: !!pr.fallen, gold: pr.gold }; });
    if (c.w || c.fallen) fail('la curación no dejó entero: ' + JSON.stringify(c));
    if (g0 > 0 && c.gold !== g0 - 1) fail('la curación tras caer no costó 1 moneda: ' + g0 + ' → ' + c.gold);
    if (await p.$('[data-testid=cure-offer]')) fail('el aviso sigue tras curarse');
  }
  await tap('[data-testid=btn-back-lobby]');
  const dead = await G(() => { const pr = window.__GRAVEVOW__.getState().profile; return { weapon: pr.equipment.mainHand?.itemId ?? null, pocket: pr.pocket.filter(Boolean).map((x) => x.itemId), deaths: pr.stats.deaths, ext: pr.stats.extractions }; });
  if (!dead.weapon) fail('tras morir no hay arma (kit de recluta)');
  if (!dead.pocket.includes('health_potion')) fail('el bolsillo seguro se perdió al morir');
  if (dead.deaths < 1 || dead.ext < 1) fail('estadísticas: ' + JSON.stringify(dead));
  // La espada iba en la mochila: se pierde con lo demás que llevabas
  if ((await count('base', 'iron_sword')) !== 0) fail('lo transportado no se perdió al morir');
  if (!/^recruit_/.test(dead.weapon ?? '')) fail('el arma tras morir no es de recluta: ' + dead.weapon);

  // ── Equipo de recluta (fase 9): no se pierde al morir, no se vende y se pide a mano una vez por vuelta ──
  step('Equipo de recluta');
  await tap('[data-testid=tab-play]'); await tap('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1000);
  await G(() => window.__GRAVEVOW__.actions.trapHit(9999));
  await p.waitForSelector('[data-testid=summary]');
  if (await p.$('[data-testid=recruit-kit]')) fail('vuelve a dar el kit aunque el de recluta no se perdió');
  await tap('[data-testid=btn-back-lobby]');
  const rec = await G(() => { const pr = window.__GRAVEVOW__.getState().profile; return { main: pr.equipment.mainHand?.itemId, armor: pr.equipment.armor?.itemId }; });
  if (!/^recruit_/.test(rec.main ?? '') || !/^recruit_/.test(rec.armor ?? '')) fail('el equipo de recluta se perdió al morir: ' + JSON.stringify(rec));
  // Sin armadura: el intendente la ofrece a mano, una sola vez
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; g.setState({ profile: { ...pr, equipment: { ...pr.equipment, armor: null } } }); });
  await tap('[data-testid=tab-stash]'); await tap('[data-testid=seg-gear]');
  const ro = await p.waitForSelector('[data-testid=recruit-claim]', { timeout: 3000 }).catch(() => null);
  if (!ro) fail('el intendente no ofrece el equipo de recluta sin armadura');
  else {
    const bb = await ro.boundingBox();
    if (bb.height < 43.5) fail('«Equipo de recluta» menor de 44 px');
    await shot('6b-recluta');
    await tap('[data-testid=recruit-claim]'); await p.waitForTimeout(200);
    const got = await G(() => window.__GRAVEVOW__.getState().profile.equipment.armor?.itemId ?? null);
    if (!/^recruit_/.test(got ?? '')) fail('pedir el equipo de recluta no puso la armadura: ' + got);
    await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; g.setState({ profile: { ...pr, equipment: { ...pr.equipment, armor: null } } }); });
    await p.waitForTimeout(150);
    if (await p.$('[data-testid=recruit-claim]')) fail('el equipo de recluta se puede pedir en bucle');
    await G(() => window.__GRAVEVOW__.actions.claimRecruitKit());
    if (await G(() => window.__GRAVEVOW__.getState().profile.equipment.armor)) fail('claimRecruitKit dio dos veces en la misma vuelta');
  }
  // No se vende
  const sold = await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; const bp = [...pr.backpack]; const i = bp.findIndex((x) => !x); bp[i] = { uid: 'rv', itemId: 'recruit_doublet', qty: 1 }; g.setState({ profile: { ...pr, backpack: bp } }); const before = g.getState().profile.gold; g.actions.sell?.('backpack', i); const after = g.getState().profile; return { gone: !after.backpack[i], gold: after.gold - before }; });
  if (sold.gone || sold.gold) fail('el equipo de recluta se ha vendido: ' + JSON.stringify(sold));
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; g.setState({ profile: { ...pr, backpack: pr.backpack.map((x) => (x && x.uid === 'rv' ? null : x)) } }); });

  // ── Curar partes desde Intendencia → Estado: tocar la parte y elegir, o arrastrar la férula ──
  step('Curar partes desde Estado');
  await G(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; const bp = [...pr.backpack]; bp[bp.findIndex((x) => !x)] = { uid: 'fer', itemId: 'splint', qty: 2 }; g.setState({ profile: { ...pr, backpack: bp, wounds: { pct: { armR: 0.6 }, fractures: ['armR', 'armL'] } } }); });
  await tap('[data-testid=tab-stash]'); await tap('[data-testid=seg-status]');
  await p.waitForSelector('[data-testid=intendencia-status] [data-testid=body-row-armR]');
  if (!/Rota/.test(await p.textContent('[data-testid=body-state-armR]'))) fail('la parte rota no dice «Rota»');
  if (!/Sana/.test(await p.textContent('[data-testid=body-state-head]'))) fail('la parte sana no dice «Sana»');
  await tap('[data-testid=body-row-armR]');
  if (!(await p.$('[data-testid=treat-splint-armR]'))) fail('al tocar el brazo roto no se ofrece la férula');
  await shot('8-estado');
  await tap('[data-testid=treat-splint-armR]'); await p.waitForTimeout(200);
  const fr1 = await G(() => window.__GRAVEVOW__.getState().profile.wounds?.fractures ?? []);
  if (fr1.includes('armR')) fail('la férula no curó el brazo derecho');
  // Arrastrar la férula al brazo izquierdo (ratón y dedo usan el mismo arrastre por puntero)
  const slot = await p.$('[data-testid^=slot-backpack][data-item=splint]');
  const arm = await p.$('[data-testid=body-row-armL]');
  if (!slot || !arm) fail('no se ve la férula en la mochila o el brazo izquierdo');
  else {
    await slot.scrollIntoViewIfNeeded(); await arm.scrollIntoViewIfNeeded();
    const a = await slot.boundingBox(), t = await arm.boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down();
    await p.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 6, { steps: 4 });
    await p.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 12 });
    const lit = await p.$eval('[data-testid=body-row-armL]', (e) => e.classList.contains('drop-yes'));
    const dim = await p.$eval('[data-testid=body-row-head]', (e) => e.classList.contains('drop-no'));
    if (!lit || !dim) fail('al arrastrar la férula no se resalta dónde sirve (' + lit + ', ' + dim + ')');
    await shot('9-arrastre');
    await p.mouse.up(); await p.waitForTimeout(250);
    const fr2 = await G(() => window.__GRAVEVOW__.getState().profile.wounds?.fractures ?? []);
    if (fr2.includes('armL')) fail('soltar la férula en el brazo no lo curó');
  }
  const ov = await G(() => document.documentElement.scrollWidth - window.innerWidth);
  if (ov > 1) fail('Estado se sale de la pantalla por ' + ov + ' px');

  // ── Y puede volver a bajar ──
  await tap('[data-testid=tab-play]');
  if (!(await p.$('[data-testid=jugar-cure] [data-testid=cure-btn]'))) fail('Jugar no ofrece curarse yendo herido');
  const lock = await G(() => !!document.querySelector('[data-testid=btn-enter-dungeon]')?.disabled);
  if (lock) fail('tras morir no se puede volver a bajar');
  await shot('7-listo');

  console.log(cls, mode, dev || 'escritorio', failed ? 'CON FALLOS' : 'ok', '· errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
