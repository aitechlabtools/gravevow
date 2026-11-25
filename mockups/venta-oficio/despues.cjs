// Maquetas «después» de la venta por oficio, sobre pantallas reales: node mockups/venta-oficio/despues.cjs [url]
const { chromium } = require('playwright'); const path = require('path'); const base = require('./antes.cjs');
const out = (n) => path.join(__dirname, n + '.png');
// Reparto propuesto (se inyecta en la página; aún no está en el código)
const INJECT = async () => {
  const { VENDORS } = await import('/src/core/data/vendors.ts');
  const { getItem } = await import('/src/core/data/items.ts');
  const { sellPrice } = await import('/src/core/economy.ts');
  for (const v of Object.values(VENDORS)) v.buysItems = true;
  const MAT = { nira: ['leather_scrap','tanned_leather','fireproof_leather','ragged_cloth','woven_cloth','shroud_cloth','ash_silk','strap'],
    vesper: ['bitter_herb'], garth: ['salted_meat','cave_mushroom','flour','goat_milk','sour_wine'],
    orik: ['scrap_metal','copper_ore','iron_ore','silver_ore','blessed_silver','obsidian_shard','old_wood','scrap_bar','copper_ingot','iron_ingot','silver_ingot','obsidian_ingot','hellsteel','grip','haft','ancient_bone'] };
  const heavy = (d) => d.category === 'shield' || (!!d.classes && d.classes.every((c) => c === 'warrior' || c === 'cleric'));
  const buyer = (id) => { const d = getItem(id), c = d.category;
    if (c === 'weapon') return 'brand';
    if (['shield','helmet','armor','gloves','boots'].includes(c)) return heavy(d) ? 'valerius' : 'nira';
    if (['ring','amulet','jewel','key'].includes(c)) return 'grizk';
    if (c === 'relic') return !d.slot ? 'grizk' : d.family === 'dagger' || /dagger/.test(id) ? 'brand' : /torch/.test(id) ? 'orik' : 'eldrin';
    if (c === 'potion') return d.use?.kind === 'need' ? 'garth' : d.use?.kind === 'bomb' ? 'eldrin' : 'vesper';
    if (c === 'tool') return 'orik'; if (c === 'bag') return 'nira';
    if (c === 'material') { for (const [v, l] of Object.entries(MAT)) if (l.includes(id)) return v; return 'eldrin'; }
    return 'nira'; };
  const ST = { nira: 'tannery', vesper: 'infirmary', garth: 'kitchen', orik: 'bench', grizk: null, brand: 'forge', valerius: 'armory', eldrin: 'alchemy' };
  const PLACE = { nira: 'El Mercado', vesper: 'La Enfermería', garth: 'La Cocina', orik: 'El Taller', grizk: 'La Lonja', brand: 'La Forja', valerius: 'La Armería', eldrin: 'El Laboratorio' };
  const WHAT = { nira: 'Pieles, cueros, tela y armaduras ligeras', vesper: 'Hierbas, pociones, vendas y remedios', garth: 'Comida, carne e ingredientes', orik: 'Metal, madera, chatarra y herramientas', grizk: 'Joyas, anillos, amuletos, gemas y tesoros', brand: 'Armas', valerius: 'Armaduras pesadas y escudos', eldrin: 'Pergaminos, esencias, reactivos y objetos mágicos' };
  const open = (v, p) => !ST[v] || (p.refuge?.[ST[v]] ?? 0) >= 1;
  // Quién lo compra hoy: el especialista; si su estación está en ruinas, Nira
  const who = (id, p) => { const b = buyer(id); return open(b, p) ? b : 'nira'; };
  window.__MK = { buyer, who, open, WHAT, PLACE, VENDORS, getItem, sellPrice };
};
const SEAL = '';
(async () => { const b = await chromium.launch();
  for (const sz of Object.keys(base.SIZES)) {
    const { c, p, press } = await base.setup(b, sz); const phone = sz === 'movil';
    await p.evaluate(INJECT);
    await press('[data-testid=tab-merchants]'); await p.waitForTimeout(500);
    const dress = async (v) => p.evaluate(({ v, phone }) => { const M = window.__MK, g = window.__GRAVEVOW__, pr = g.getState().profile;
      const mine = []; let total = 0;
      for (const cont of ['backpack', 'stash']) pr[cont].forEach((s, i) => { if (!s || s.cover || !s.itemId || s.itemId === 'gold_coins') return;
        const el = document.querySelector(`[data-testid=slot-${cont}-${i}]`); if (!el) return;
        const d = M.getItem(s.itemId); if (['coin','gold','container','cover'].includes(d.category) || d.recruit) return;
        const w = M.who(s.itemId, pr);
        if (w === v) { mine.push({ s, cont }); total += M.sellPrice(s.itemId, s) * s.qty; }
        else { el.style.opacity = '0.28'; el.style.filter = 'grayscale(1)'; } });
      // Cajón lateral: qué compra, botón «Vender todo lo que compro»
      const side = document.querySelector('[data-testid=vendor-side]') || document.body;
      const marks = [...document.querySelectorAll('[data-testid^=mark-]')]; const box = marks[0]?.parentElement;
      const closed = !M.open(v, pr);
      const html = `<div data-mk style="border:1px solid #3a3841;background:#151419;padding:10px;margin-top:8px">
        <div style="font:600 13px Cinzel,Georgia,serif;color:#e8b33a;letter-spacing:.05em">LO QUE COMPRO</div>
        <div style="font-size:14px;color:#d6d0c2;margin:2px 0 8px">${M.WHAT[v]}${v === 'nira' ? '. Y lo de quien aún no tiene su taller en pie.' : ''}</div>
        ${closed ? `<div style="font-size:14px;color:#e0a060">Aún no compro nada: reconstruye mi estación. Mientras, lo compra Nira en El Mercado.</div>` :
        `<button class="btn btn-gold w-full font-display" style="min-height:48px" data-mk-all>Vender todo lo que compro · ${mine.length} · ${total} oro</button>
        <div style="font-size:12px;color:#a7a4ae;margin-top:4px">Solo de la mochila. Lo equipado nunca entra.</div>`}</div>`;
      if (box) { box.outerHTML = html; } else side.insertAdjacentHTML('beforeend', html);
      window.__MKmine = { n: mine.length, total, list: mine.map((m) => [M.getItem(m.s.itemId).name, M.sellPrice(m.s.itemId, m.s) * m.s.qty]) };
    }, { v, phone });
    for (const v of ['nira','vesper','garth','orik','grizk','brand','valerius','eldrin']) {
      await press(`[data-testid=vendor-${v}]`); await p.waitForTimeout(500);
      await press('[data-testid=vendor-view-sell]'); await p.waitForTimeout(400);
      if (phone) { const d = await p.$('[data-testid=vendor-side] button, [data-testid=vendor-side]'); }
      await dress(v); await p.waitForTimeout(150);
      await p.screenshot({ path: out(`despues-${v}-${sz}`) });
      if (v === 'grizk') {
        // Confirmación de «Vender todo lo que compro»
        await p.evaluate(({ phone }) => { const m = window.__MKmine;
          document.body.insertAdjacentHTML('beforeend', `<div data-mk style="position:fixed;inset:0;background:rgba(5,4,8,.78);display:grid;place-items:center;z-index:9999">
          <div style="background:#151419;border:2px solid #6b4a12;padding:${phone ? 12 : 20}px;width:${phone ? 520 : 560}px;max-height:${phone ? 360 : 640}px;display:flex;flex-direction:column;gap:8px">
            <div style="font:600 ${phone ? 16 : 20}px Cinzel,Georgia,serif;color:#e8b33a">Vender todo lo que compro</div>
            <div style="font-size:14px;color:#d6d0c2">Grizk se queda con esto de tu mochila:</div>
            <div style="overflow:auto;border:1px solid #3a3841;${phone ? 'display:grid;grid-template-columns:1fr 1fr;column-gap:12px;' : ''}">${m.list.map(([n, g]) => `<div style="display:flex;justify-content:space-between;padding:4px 8px;font-size:14px;color:#e6e0d2;border-bottom:1px solid #26242b"><span>${n}</span><span style="color:#e8b33a">${g}</span></div>`).join('')}</div>
            <div style="display:flex;justify-content:space-between;font:600 16px Cinzel,Georgia,serif;color:#e6e0d2"><span>Total</span><span style="color:#e8b33a">${m.total} oro</span></div>
            <div style="display:flex;gap:8px"><button class="btn btn-gold font-display" style="min-height:48px;flex:1">Vender ${m.n} · ${m.total} oro</button><button class="btn" style="min-height:48px">Cancelar</button></div></div></div>`); }, { phone });
        await p.waitForTimeout(150); await p.screenshot({ path: out(`confirmar-${sz}`) });
        await p.evaluate(() => document.querySelectorAll('body > [data-mk]').forEach((e) => e.remove()));
      }
      if (v === 'brand') {
        // Intento de vender algo al mercader equivocado (arrastrar una joya a Brand)
        await p.evaluate(({ phone }) => document.body.insertAdjacentHTML('beforeend', `<div data-mk style="position:fixed;left:50%;transform:translateX(-50%);bottom:${phone ? 12 : 40}px;z-index:9999;background:#1d1a14;border:1px solid #6b4a12;padding:10px 16px;font-size:15px;color:#e6e0d2;display:flex;gap:10px;align-items:center;min-height:44px">
          <span style="color:#e8b33a;font-size:18px">✋</span><span>Brand solo compra armas. <b style="color:#e8b33a">Las joyas las compra Grizk en La Lonja.</b></span></div>`), { phone });
        await p.waitForTimeout(150); await p.screenshot({ path: out(`equivocado-${sz}`) });
        await p.evaluate(() => document.querySelectorAll('body > [data-mk]').forEach((e) => e.remove()));
      }
      await press('[data-testid=vendor-back]'); await p.waitForTimeout(300); }
    // Indicador de comprador en el inventario (Alijo): ficha del objeto + marca pequeña en cada casilla
    await press('[data-testid=tab-stash]'); await p.waitForTimeout(600);
    await p.evaluate(({ phone }) => { const M = window.__MK, pr = window.__GRAVEVOW__.getState().profile;
      const INI = { nira: 'Ni', vesper: 'Ve', garth: 'Ga', orik: 'Or', grizk: 'Gr', brand: 'Br', valerius: 'Va', eldrin: 'El' };
      pr.backpack.forEach((s, i) => { if (!s || s.cover || !s.itemId) return; const el = document.querySelector(`[data-testid=slot-backpack-${i}]`); if (!el) return;
        const w = M.who(s.itemId, pr); el.style.position = 'relative';
        el.insertAdjacentHTML('beforeend', `<span data-mk style="position:absolute;right:1px;bottom:1px;font:600 12px/1 Georgia,serif;color:${M.VENDORS[w].color};background:#0b0a0f;padding:1px 2px">${INI[w]}</span>`); }); }, { phone });
    const first = await p.$('[data-testid=slot-backpack-14]'); if (first) { await (phone ? first.tap() : first.hover()); await p.waitForTimeout(400);
      if (phone) await first.tap(); }
    await p.evaluate(() => { const M = window.__MK; const v = [...document.querySelectorAll('*')].filter((e) => e.childElementCount === 0 && /^Valor:/.test(e.textContent.trim())).pop(); const tip = v?.parentElement;
      const line = `<div data-mk style="margin-top:6px;padding-top:6px;border-top:1px solid #3a3841;font-size:14px;color:#e6e0d2">Lo compra <b style="color:${M.VENDORS.grizk.color}">Grizk</b> · La Lonja</div>`;
      if (tip) tip.insertAdjacentHTML('beforeend', line); else document.body.insertAdjacentHTML('beforeend', '<div data-mk>NO TIP</div>'); });
    await p.waitForTimeout(150); await p.screenshot({ path: out(`inventario-${sz}`) });
    await c.close(); }
  await b.close(); })();
