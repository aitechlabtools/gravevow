// Maquetas del seguro por bajada sobre pantallas reales: node mockups/seguro-equipo/capturar.cjs [url]
const { chromium } = require('playwright'); const path = require('path'); const base = require('./base.cjs');
const out = (n) => path.join(__dirname, n + '.png');
// Sello: escudo con marca, 12×12, se dibuja a escala entera
const SEAL = ['..########..', '.#oooooooo#.', '#oooooooooo#', '#ooooooo#oo#', '#oooooo##oo#', '#o#oooo#ooo#', '#o##oo##ooo#', '#oo####oooo#', '.#oo##oooo#.', '..#oooooo#..', '...#oooo#...', '....####....'];
const sealSvg = (k) => `<svg width="${12 * k}" height="${12 * k}" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-label="Asegurada">${SEAL.flatMap((r, y) => [...r].map((ch, x) => ch === '.' ? '' : `<rect x="${x}" y="${y}" width="1" height="1" fill="${ch === '#' ? '#0b0a0f' : '#e8b33a'}"/>`)).join('')}${SEAL.flatMap((r, y) => [...r].map((ch, x) => ch === '#' && ((y === 3 && x === 8) || (y === 4 && (x === 7 || x === 8)) || (y === 5 && (x === 2 || x === 7)) || (y === 6 && [2, 3, 6, 7].includes(x)) || (y === 7 && [3, 4, 5, 6].includes(x)) || (y === 8 && [4, 5].includes(x))) ? `<rect x="${x}" y="${y}" width="1" height="1" fill="#1a1206"/>` : '')).join('')}</svg>`;
const PIECES = [
  ['mainHand', 'Varita de ceniza', 'Rara · 1 atributo', 'Maese Brand', 6, true],
  ['helmet', 'Corona rota de Belzar', 'Legendaria', 'Valerius', 17, true],
  ['armor', 'Cota de malla', 'Poco común', 'Valerius', 2, true],
  ['boots', 'Botas de patio', 'Poco común', 'Valerius', 1, false],
  ['ring', 'Anillo de ascuas', 'Raro', 'Maese Brand', 4, true],
  ['bp0', 'Espada oxidada', 'Común · mochila', 'Maese Brand', 1, false],
  ['bp1', 'Escudo de hierro', 'Común · mochila', 'Valerius', 1, false],
];
(async () => { const b = await chromium.launch();
  for (const sz of Object.keys(base.SIZES)) {
    const { c, p, press } = await base.setup(b, sz); const phone = sz === 'movil', k = sz === 'escritorio' ? 2 : 1;
    // Iconos reales de las piezas, sacados del Alijo
    await press('[data-testid=tab-stash]'); await p.waitForTimeout(600);
    const icons = await p.evaluate(() => { const g = (s) => document.querySelector(s)?.querySelector('img,canvas'); const o = {};
      for (const k of ['mainHand', 'helmet', 'armor', 'boots', 'ring', 'offHand', 'gloves', 'amulet']) { const e = g(`[data-testid=slot-equip-${k}]`); o[k] = e?.src || e?.toDataURL?.() || ''; }
      for (const i of [0, 1]) { const e = g(`[data-testid=slot-backpack-${i}]`); o['bp' + i] = e?.src || e?.toDataURL?.() || ''; } return o; });
    // 1 · Alijo: así seguirá (en el Bastión no hay sellos)
    // 2 · Ventana al pulsar «Descender»
    await press('[data-testid=tab-play]'); await p.waitForTimeout(500);
    await p.evaluate(({ PIECES, icons, phone, k }) => {
      const total = PIECES.filter((x) => x[5]).reduce((n, x) => n + x[4], 0);
      const rows = PIECES.map(([id, n, r, who, cost, on]) => `<label style="display:flex;align-items:center;gap:${phone ? 8 : 12}px;min-height:44px;padding:${phone ? '2px 8px' : '6px 10px'};border:1px solid ${on ? '#6b4a12' : '#3a3841'};background:${on ? '#201a10' : '#151419'};cursor:pointer">
        <span style="width:22px;height:22px;flex:none;border:2px solid ${on ? '#e8b33a' : '#82808a'};display:grid;place-items:center;color:#e8b33a;font-size:16px;line-height:1">${on ? '✔' : ''}</span>
        <img src="${icons[id]}" style="width:${phone ? 28 : 40}px;height:${phone ? 28 : 40}px;image-rendering:pixelated;flex:none">
        <span style="flex:1;min-width:0"><span class="font-display" style="display:block;color:#e6e0d2;font-size:${phone ? 13 : 17}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n}</span>${phone ? '' : `<span style="display:block;color:#a7a4ae;font-size:14px">${r} · la reforja ${who}</span>`}</span>
        <span style="color:#e8b33a;font-size:${phone ? 13 : 16}px;white-space:nowrap;flex:none">${cost} ●</span></label>`).join('');
      const d = document.createElement('div');
      d.innerHTML = `<div class="absolute inset-0 z-50 flex items-center justify-center bg-black/70" data-testid="insure-modal">
        <div class="panel panel-gold" style="width:${phone ? 'min(800px,calc(100% - 16px))' : 'min(720px,calc(100% - 2rem))'};max-height:${phone ? '374px' : '90vh'};padding:${phone ? '8px 10px' : '20px'};display:flex;flex-direction:column;gap:${phone ? 6 : 12}px">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px"><h2 class="font-display" style="font-size:${phone ? 17 : 26}px;color:#e8b33a;margin:0">¿Aseguras tu equipo?</h2>
            <span style="display:flex;gap:6px"><button class="btn" style="min-height:44px;min-width:60px">Todo</button><button class="btn" style="min-height:44px;min-width:60px">Nada</button></span></div>
          <p style="margin:0;color:#a7a4ae;font-size:${phone ? 12 : 16}px">Solo para esta bajada. Si caes, quien lo fabricó te lo reforja: lo recoges en el Bastión.</p>
          <div style="display:${phone ? 'grid' : 'flex'};${phone ? 'grid-template-columns:1fr 1fr;' : 'flex-direction:column;'}gap:${phone ? 4 : 6}px;overflow-y:auto;min-height:0">${rows}</div>
          <div style="display:flex;align-items:center;gap:${phone ? 8 : 12}px;justify-content:flex-end;border-top:1px solid #3a3841;padding-top:${phone ? 6 : 12}px">
            <span style="margin-right:auto;color:#e6e0d2;font-size:${phone ? 13 : 17}px">${PIECES.filter((x) => x[5]).length} piezas · <b style="color:#e8b33a">${total} ●</b> <span style="color:#a7a4ae">(tienes 64)</span></span>
            <button class="btn" style="min-height:44px">Bajar sin asegurar</button>
            <button class="btn btn-gold" style="min-height:44px">Asegurar y bajar · ${total}</button></div>
          <label style="display:flex;align-items:center;gap:8px;color:#a7a4ae;font-size:${phone ? 12 : 14}px;min-height:${phone ? 24 : 32}px"><span style="width:18px;height:18px;border:2px solid #82808a;display:inline-block"></span>No volver a preguntar (se cambia en Ajustes)</label>
        </div></div>`;
      document.body.append(d.firstElementChild);
    }, { PIECES, icons, phone, k });
    await p.waitForTimeout(300); await p.screenshot({ path: out(`descender-${sz}`) });
    await p.evaluate(() => document.querySelector('[data-testid=insure-modal]')?.remove());
    // 2b · Versión visual: muñeco de equipo + recibo. Escritorio y tableta: muñeco 3×4 y recibo al lado (cuadrado). Móvil: casillas en 4×2 y recibo al lado (horizontal)
    await p.evaluate(({ icons, phone, seal, sealS }) => {
      const S = { mainHand: ['Arma', 'Varita de ceniza', 6, 1, 'big'], helmet: ['Cabeza', 'Corona rota de Belzar', 17, 1], offHand: ['Secundaria', '', 0, 0, 'big'], armor: ['Torso', 'Cota de malla', 2, 1], gloves: ['Manos', '', 0, 0], amulet: ['Amuleto', '', 0, 0], boots: ['Pies', 'Botas de patio', 1, 0], ring: ['Anillo', 'Anillo de ascuas', 4, 1] };
      const u = phone ? 50 : 72, gap = phone ? 6 : 10;
      const cell = (id) => { const [lbl, , cost, on, big] = S[id]; const has = cost > 0; const h = u;
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <button style="position:relative;width:${u}px;height:${h}px;background:${on ? '#201a10' : '#0b0a0f'};border:${on ? '2px solid #e8b33a' : '1px solid #3a3841'};display:grid;place-items:center;${has ? 'cursor:pointer' : ''}">
            ${has ? `<img src="${icons[id]}" style="width:${phone ? 34 : 48}px;height:${phone ? 34 : 48}px;image-rendering:pixelated">` : '<span style="color:#82808a;font-size:12px">—</span>'}
            ${on ? `<span style="position:absolute;right:2px;bottom:2px;line-height:0">${seal}</span>` : ''}
            ${has ? `<span style="position:absolute;left:3px;top:1px;font-size:12px;color:${on ? '#e8b33a' : '#a7a4ae'}">${cost}</span>` : ''}</button>
          <span style="font-size:12px;color:${on ? '#e8b33a' : '#a7a4ae'};white-space:nowrap">${lbl}</span></div>`; };
      const ids = ['mainHand', 'helmet', 'offHand', 'armor', 'gloves', 'boots', 'amulet', 'ring'];
      const doll = true
        ? `<div style="display:grid;grid-template-columns:repeat(4,${u}px);align-content:center;gap:${gap}px ${gap + 2}px">${['mainHand', 'offHand', 'helmet', 'armor', 'gloves', 'boots', 'ring', 'amulet'].map(cell).join('')}</div>`
        : `<div style="display:grid;grid-template-columns:repeat(3,${u}px);grid-template-areas:'mainHand helmet offHand' 'mainHand armor offHand' 'gloves boots amulet' 'ring . .';gap:${gap}px ${gap + 6}px">${ids.map(cell).join('')}</div>`;
      const sel = ids.filter((id) => S[id][3]);
      const receipt = `<div style="display:flex;flex-direction:column;gap:${phone ? 4 : 8}px;width:${phone ? 300 : 300}px;min-width:0">
        <div style="display:flex;align-items:center;justify-content:space-between"><span class="font-display" style="font-size:${phone ? 12 : 14}px;letter-spacing:.1em;color:#a7a4ae;text-transform:uppercase">Asegurado</span><button class="btn" style="min-height:44px;min-width:${phone ? 70 : 84}px">Todo</button></div>
        <div style="display:flex;flex-direction:column;gap:${phone ? 1 : 4}px;font-size:${phone ? 12 : 15}px">${sel.map((id) => `<div style="display:flex;align-items:center;gap:6px;color:#e6e0d2">${seal}<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${S[id][1]}</span><span style="color:#e8b33a">${S[id][2]} ●</span></div>`).join('')}</div>
        <div style="margin-top:auto;border-top:1px solid #3a3841;padding-top:${phone ? 4 : 8}px;display:flex;justify-content:space-between;align-items:baseline;font-size:${phone ? 13 : 17}px"><span style="color:#a7a4ae;font-size:${phone ? 12 : 14}px">Tienes 64</span><span style="color:#e8b33a">Total ${sel.reduce((n, id) => n + S[id][2], 0)} ●</span></div>
        <button class="btn btn-gold" style="min-height:44px">Asegurar y bajar</button>
        <button class="btn" style="min-height:44px">Bajar sin asegurar</button></div>`;
      const d = document.createElement('div');
      d.innerHTML = `<div class="absolute inset-0 z-50 flex items-center justify-center bg-black/70" data-testid="insure-modal2"><div class="panel panel-gold" style="padding:${phone ? '8px 14px 10px' : '22px 24px'};display:flex;flex-direction:column;gap:${phone ? 6 : 14}px;width:auto;max-width:calc(100% - 16px)">
        <h2 class="font-display" style="margin:0;color:#e8b33a;font-size:${phone ? 17 : 24}px">¿Aseguras tu equipo?</h2>
        <div style="display:flex;gap:${phone ? 18 : 28}px;align-items:stretch">${doll}${receipt}</div></div></div>`;
      document.body.append(d.firstElementChild);
    }, { icons, phone, seal: sealSvg(phone ? 1 : 2), sealS: sealSvg(2) });
    await p.waitForTimeout(300); await p.screenshot({ path: out(`descender2-${sz}`) });
    await p.evaluate(() => document.querySelector('[data-testid=insure-modal2]')?.remove());
    // 3 · Sellos en la mochila y el equipo durante la bajada
    await press('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(2500);
    await p.evaluate(() => window.__GRAVEVOW__.actions.openModal({ type: 'inventory' })); await p.waitForTimeout(700);
    await p.evaluate(({ seal, ids }) => { for (const id of ids) { const el = document.querySelector(`[data-testid=${id}]`); if (!el) continue;
      const s = document.createElement('span'); s.innerHTML = seal; s.title = 'Asegurada esta bajada'; Object.assign(s.style, { position: 'absolute', right: '1px', bottom: '1px', lineHeight: '0', zIndex: 3, pointerEvents: 'none' });
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; el.append(s); } },
      { seal: sealSvg(k), ids: ['slot-equip-mainHand', 'slot-equip-helmet', 'slot-equip-armor', 'slot-equip-ring'] });
    await p.waitForTimeout(200); await p.screenshot({ path: out(`sellos-${sz}`) });
    // 4 · Morir: resumen con la nota de las piezas reforjadas
    await p.evaluate(() => { const G = window.__GRAVEVOW__; G.actions.closeModal?.(); G.setState({ modal: null }); G.actions.finishExpedition('died'); }); await p.waitForTimeout(1500);
    await p.evaluate(({ seal, phone }) => { const root = document.querySelector('[data-testid=summary]') || document.body; const d = document.createElement('div');
      d.innerHTML = `<div class="panel" style="display:flex;align-items:center;gap:10px;padding:${phone ? '6px 10px' : '10px 14px'};border:1px solid #e8b33a;margin:8px 0;min-height:44px;font-size:${phone ? 13 : 17}px;color:#e6e0d2;position:${root === document.body ? 'fixed' : 'static'};${root === document.body ? 'left:50%;bottom:12px;transform:translateX(-50%);z-index:60' : ''}" data-testid="reforge-note">${seal}<span><b style="color:#e8b33a">Te esperan 4 piezas reforjadas</b> en el Bastión: Maese Brand (Varita de ceniza, Anillo de ascuas) y Valerius (Corona rota de Belzar, Cota de malla).</span></div>`;
      const anchor = root.querySelector('[data-testid=summary-lost]') || root.querySelector('h1,h2'); if (anchor && root !== document.body) anchor.after(d.firstElementChild); else root.append(d.firstElementChild); }, { seal: sealSvg(phone ? 2 : 2), phone });
    await p.waitForTimeout(200); await p.screenshot({ path: out(`resumen-${sz}`) });
    // 5 · Bastión: aviso y marca en los mercaderes
    await p.evaluate(() => { const G = window.__GRAVEVOW__; G.actions.closeSummary ? G.actions.closeSummary() : G.setState({ screen: 'lobby', summary: null }); }); await p.waitForTimeout(800);
    await press('[data-testid=tab-merchants]').catch(() => {}); await p.waitForTimeout(600);
    await p.evaluate(({ seal, phone }) => { for (const id of ['brand', 'valerius']) { const t = document.querySelector(`[data-testid=vendor-${id}]`); if (!t) continue; t.style.position = 'relative'; t.style.outline = '2px solid #e8b33a';
        const s = document.createElement('span'); s.innerHTML = `${seal}${phone ? '' : '<span style="margin-left:6px">Pieza reforjada</span>'}`; Object.assign(s.style, { position: 'absolute', right: '6px', top: '6px', display: 'flex', alignItems: 'center', background: '#e8b33a', color: '#1a1206', padding: '2px 6px', fontSize: phone ? '12px' : '14px', zIndex: 5 }); t.append(s); }
      const tst = document.createElement('div'); tst.innerHTML = `<div style="position:fixed;left:50%;transform:translateX(-50%);top:${phone ? 50 : 70}px;z-index:60;display:flex;align-items:center;gap:10px;background:#151419;border:1px solid #e8b33a;padding:${phone ? '6px 10px' : '10px 16px'};color:#e6e0d2;font-size:${phone ? 13 : 17}px">${seal}<span>Maese Brand y Valerius te han reforjado 4 piezas. Pasa a recogerlas.</span></div>`; document.body.append(tst.firstElementChild); },
      { seal: sealSvg(2), phone });
    await p.waitForTimeout(200); await p.screenshot({ path: out(`bastion-${sz}`) });
    // 6 · Recogida en Maese Brand
    await p.evaluate(() => document.querySelectorAll('body > div[style*="position:fixed"]').forEach((e) => e.remove()));
    await press('[data-testid=vendor-brand]'); await p.waitForTimeout(600);
    await p.evaluate(({ seal, icons, phone }) => { const rows = [['mainHand', 'Varita de ceniza', 'Rara · 1 atributo · durabilidad entera'], ['ring', 'Anillo de ascuas', 'Raro']].map(([id, n, d]) => `<div style="display:flex;align-items:center;gap:12px;min-height:${phone ? 48 : 64}px;padding:6px 10px;border:1px solid #3a3841;background:#151419">
        <img src="${icons[id]}" style="width:${phone ? 32 : 48}px;height:${phone ? 32 : 48}px;image-rendering:pixelated"><span style="flex:1;min-width:0"><span class="font-display" style="display:block;font-size:${phone ? 14 : 18}px">${n}</span><span style="color:#a7a4ae;font-size:${phone ? 12 : 14}px">${d}</span></span>
        <button class="btn" style="min-height:44px;min-width:${phone ? 90 : 120}px">Recoger</button></div>`).join('');
      const d = document.createElement('div'); d.innerHTML = `<div class="absolute inset-0 z-50 flex items-center justify-center bg-black/70" data-testid="reforge-modal"><div class="panel panel-gold" style="width:min(640px,calc(100% - 16px));padding:${phone ? '10px' : '20px'};display:flex;flex-direction:column;gap:${phone ? 6 : 12}px">
        <div style="display:flex;align-items:center;gap:10px">${seal}<h2 class="font-display" style="margin:0;color:#e8b33a;font-size:${phone ? 18 : 26}px">Piezas reforjadas</h2></div>
        <p style="margin:0;color:#a7a4ae;font-size:${phone ? 12 : 16}px">«Lo que el fondo se queda, la forja lo devuelve.» Vuelven como las bajaste, sin seguro.</p>${rows}
        <div style="display:flex;justify-content:flex-end;gap:10px"><button class="btn" style="min-height:44px">Más tarde</button><button class="btn btn-gold" style="min-height:44px">Recoger todo</button></div></div></div>`;
      document.body.append(d.firstElementChild); }, { seal: sealSvg(phone ? 2 : 3), icons, phone });
    await p.waitForTimeout(200); await p.screenshot({ path: out(`recogida-${sz}`) });
    await c.close(); }
  await b.close(); })();
