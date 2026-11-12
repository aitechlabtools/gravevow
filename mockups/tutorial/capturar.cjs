// Maquetas del bloque 3 (tutoriales): se juega la partida real y se dibuja encima la capa del tutorial propuesta
// (atenuado con hueco, cartel con quién habla, paso N/M, «Saltar»). Uso: node mockups/tutorial/capturar.cjs [url]
const { chromium } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = path.join(__dirname, 'capturas');
const SIZES = { desktop: { viewport: { width: 1920, height: 1080 } }, phone: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };

// Capa del tutorial (se inyecta en la página)
function overlay(o) {
  document.querySelectorAll('.tutx').forEach((e) => e.remove());
  const phone = innerWidth < 900;
  let r = o.rect;
  if (o.sel) { const el = document.querySelector(o.sel); if (el) { const b = el.getBoundingClientRect(); r = { x: b.left, y: b.top, w: b.width, h: b.height }; } }
  const root = document.createElement('div'); root.className = 'tutx';
  root.innerHTML = `<style>
  .tutx{position:fixed;inset:0;z-index:99999;pointer-events:none;font-family:Grenze,Georgia,serif}
  .tutx .hole{position:fixed;box-shadow:0 0 0 9999px rgba(4,3,8,.62);border:3px solid #f2c75a;outline:2px solid #07060a;animation:tp 1.2s ease-in-out infinite}
  .tutx .dim{position:fixed;inset:0;background:rgba(4,3,8,.62)}
  @keyframes tp{50%{box-shadow:0 0 0 9999px rgba(4,3,8,.62),0 0 22px 6px #f2c75a88}}
  .tutx .card{position:fixed;background:#141219;border:2px solid #8a5d14;box-shadow:0 0 0 2px #07060a,0 14px 40px #000;color:#e9e1cc;display:flex;gap:12px;align-items:flex-start;pointer-events:auto}
  .tutx .pt{flex:none;width:${phone ? 56 : 84}px;height:${phone ? 56 : 84}px;border:2px solid #6b4a12;background:#0c0b10 center/contain no-repeat;image-rendering:pixelated}
  .tutx .kick{font-family:Cinzel,serif;color:#e8b33a;font-size:${phone ? 10 : 12}px;letter-spacing:.18em;text-transform:uppercase}
  .tutx .who{font-family:Cinzel,serif;color:#c8a46a;font-size:${phone ? 12 : 14}px}
  .tutx .tx{font:${phone ? 15 : 20}px/1.3 "Crimson Pro",Georgia,serif;margin-top:2px}
  .tutx .tx b{color:#f2c75a}
  .tutx .bt{display:flex;gap:8px;margin-top:${phone ? 4 : 10}px;justify-content:flex-end}
  .tutx button{min-height:44px;min-width:44px;padding:0 14px;font:700 ${phone ? 14 : 16}px Grenze,serif;color:#e9e1cc;background:linear-gradient(#2a2730,#1b1920);border:2px solid #07060a;box-shadow:inset 0 1px 0 #4a4652}
  .tutx button.g{color:#1a1206;background:linear-gradient(#f2c75a,#c48f22 55%,#8a5d14)}
  .tutx .no{position:fixed;background:#2a0f0f;border:2px solid #8a2a2a;color:#ffd9d0;font:${phone ? 14 : 18}px "Crimson Pro",serif;padding:6px 12px}
  .tutx .arrow{position:fixed;font-size:${phone ? 26 : 40}px;color:#f2c75a;text-shadow:0 2px 0 #07060a;animation:ab 1s ease-in-out infinite}
  @keyframes ab{50%{transform:translateY(8px)}}
  </style>`;
  if (r) { const h = document.createElement('div'); h.className = 'hole'; const p = 6; Object.assign(h.style, { left: r.x - p + 'px', top: r.y - p + 'px', width: r.w + 2 * p + 'px', height: r.h + 2 * p + 'px' }); root.appendChild(h);
    if (o.arrow) { const a = document.createElement('div'); a.className = 'arrow'; a.textContent = '▼'; Object.assign(a.style, { left: r.x + r.w / 2 - 14 + 'px', top: r.y - (phone ? 38 : 56) + 'px' }); root.appendChild(a); } }
  else if (o.dim) { const d = document.createElement('div'); d.className = 'dim'; root.appendChild(d); }
  const c = document.createElement('div'); c.className = 'card';
  const W = phone ? Math.min(400, innerWidth - 24) : 560;
  c.style.width = W + 'px'; c.style.padding = phone ? '8px 10px' : '14px 16px';
  let left = o.cardX ?? (r ? Math.min(Math.max(12, r.x + r.w / 2 - W / 2), innerWidth - W - 12) : (innerWidth - W) / 2);
  c.style.left = left + 'px';
  if (o.cardAt === 'top' || (r && r.y > innerHeight / 2 && o.cardAt !== 'bottom')) c.style.top = (o.cardY ?? (phone ? 8 : 24)) + 'px'; else c.style.bottom = (phone ? 8 : 24) + 'px';
  c.innerHTML = (o.portrait ? `<div class="pt" style="background-image:url('${o.portrait}')"></div>` : '') +
    `<div style="flex:1;min-width:0"><div class="kick">${o.kick}</div>${o.who ? `<div class="who">${o.who}</div>` : ''}<div class="tx">${o.text}</div>` +
    `<div class="bt">${o.skip ? '<button>Saltar</button>' : ''}${o.ok ? `<button class="g">${o.ok}</button>` : ''}</div></div>`;
  root.appendChild(c);
  if (o.no) { const n = document.createElement('div'); n.className = 'no'; n.textContent = o.no; Object.assign(n.style, { left: (o.noX ?? 12) + 'px', top: (o.noY ?? innerHeight / 2) + 'px' }); root.appendChild(n); }
  document.body.appendChild(root);
}

// Guía (panel completo, propuesto)
function guide() {
  const phone = innerWidth < 900;
  const g = [['Combate', ['Moverse y atacar', 'Ataques especiales', 'Élites y jefes']], ['Heridas y necesidades', ['Curar una parte del cuerpo', 'Fracturas y sangrado', 'Comer y beber']], ['Objetos y oro', ['El oro ocupa sitio', 'Bolsillo seguro', 'Vaciar mochila']], ['Bastión y Refugio', ['Intendencia', 'La Cocina', 'El Banco de trabajo', '— sin ver —']], ['Mercaderes', ['Comprar y vender', 'Reputación y encargos']], ['Progresión', ['Habilidades de clase', 'Subzonas', '— sin ver —']], ['Cuenta y copia', ['Copia de seguridad', 'Varios personajes']]];
  const el = document.createElement('div'); el.className = 'tutx';
  el.innerHTML = `<style>.tutx{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:${phone ? '6px 10px' : '16px'};font-family:Grenze,serif;color:#e9e1cc}
  .gm{background:#141219;border:2px solid #6b4a12;box-shadow:0 0 0 2px #07060a,0 20px 60px #000;width:min(1000px,100%);height:min(700px,100%);display:grid;grid-template-rows:auto 1fr auto}
  .gh{display:flex;align-items:center;gap:10px;padding:${phone ? '4px 10px' : '14px 18px'};border-bottom:1px solid #3a3741}.gh h2{font-family:Cinzel,serif;color:#e8b33a;letter-spacing:.12em;margin:0;font-size:${phone ? 17 : 22}px}
  .gh span{color:#8c8693;font:${phone ? 13 : 15}px "Crimson Pro",serif}
  .gb{overflow:auto;padding:${phone ? '8px 12px' : '16px 20px'};display:grid;grid-template-columns:repeat(${phone ? 3 : 3},1fr);gap:${phone ? 8 : 14}px;align-content:start}
  .gc{border:1px solid #3a3741;background:#19171f;padding:${phone ? 6 : 12}px}.gc h3{font-family:Cinzel,serif;font-size:${phone ? 11 : 14}px;color:#e8b33a;letter-spacing:.08em;text-transform:uppercase;margin:0 0 6px}
  .gc button{display:flex;width:100%;align-items:center;gap:8px;min-height:44px;margin-top:4px;padding:0 10px;text-align:left;font:600 ${phone ? 14 : 17}px Grenze,serif;color:#e9e1cc;background:#221e28;border:2px solid #07060a}
  .gc button.off{color:#5b5762;background:transparent;border-style:dashed;border-color:#3a3741}
  .gc button i{margin-left:auto;font-style:normal;color:#e8b33a}
  .gf{border-top:1px solid #3a3741;padding:${phone ? '4px 10px' : '10px 18px'};display:flex;gap:10px;justify-content:flex-end}
  .gf button{min-height:44px;padding:0 16px;font:700 16px Grenze,serif;color:#e9e1cc;background:linear-gradient(#2a2730,#1b1920);border:2px solid #07060a}</style>
  <div class="gm"><div class="gh"><h2>GUÍA</h2><span>Lo que ya has aprendido. Tócalo para verlo otra vez.</span><button style="margin-left:auto;min-width:44px;min-height:44px;background:#1b1920;color:#e9e1cc;border:2px solid #07060a">✕</button></div>
  <div class="gb">${g.map(([t, l]) => `<div class="gc"><h3>${t}</h3>${l.map((x) => x.startsWith('—') ? `<button class="off">Aún por descubrir</button>` : `<button>${x}<i>▶</i></button>`).join('')}</div>`).join('')}</div>
  <div class="gf"><button>Repetir el tutorial inicial</button><button>Cerrar</button></div></div>`;
  document.body.appendChild(el);
}

(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of Object.entries(SIZES)) {
    const touch = dev === 'phone';
    const ctx = await b.newContext(opts); const p = await ctx.newPage();
    const G = (fn, a) => p.evaluate(fn, a);
    const tap = async (s) => { await p.waitForSelector(s, { timeout: 8000 }); touch ? await p.tap(s) : await p.click(s); await p.waitForTimeout(250); };
    const shot = async (name, o) => { await G(overlay, o); await p.waitForTimeout(250); await p.screenshot({ path: path.join(OUT, `${dev}-${name}.png`) }); await G(() => document.querySelectorAll('.tutx').forEach((e) => e.remove())); console.log(dev, name); };
    const T = (d, m) => (touch ? m : d);
    await p.goto(URL + '?debug&tutorial'); await G(() => indexedDB.deleteDatabase('gravevow')); await G(() => { try { localStorage.clear(); } catch {} }); await p.reload();
    await tap('[data-testid=btn-play]'); await G(() => document.fullscreenElement && document.exitFullscreen());
    await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); await tap('[data-testid=btn-tutorial-ok]');
    await tap('[data-testid=btn-enter-dungeon]'); await p.waitForSelector('[data-testid=tutorial-guide]'); await p.waitForTimeout(800);
    await G(() => document.querySelectorAll('[data-testid=tutorial-guide]').forEach((e) => e.style.display = 'none'));
    // T1 · Moverse
    const vw = await G(() => [innerWidth, innerHeight]);
    await shot('t1-moverse', { rect: touch ? { x: 20, y: vw[1] - 170, w: 150, h: 150 } : { x: vw[0] * 0.55, y: vw[1] * 0.45, w: 120, h: 120 }, arrow: !touch, cardAt: 'top', kick: 'Paso 1 de 9 · Moverse', who: 'Las Afueras del Bastión',
      text: T('Muévete con <b>WASD</b> o las flechas, o <b>haz clic en el suelo</b>. Ve hacia la luz.', 'Arrastra el pulgar en la <b>zona del joystick</b> o <b>toca el suelo</b>. Ve hacia la luz.'), skip: true });
    // T2 · Combate: ataque especial
    await G(() => window.__GRAVEVOW__.scene().debugTeleport(12, 4)); await p.waitForSelector('[data-testid=combat]', { timeout: 8000 }); await p.waitForTimeout(900);
    await G(() => document.querySelectorAll('[data-testid=tutorial-guide]').forEach((e) => e.style.display = 'none'));
    const spec = await G(() => { const b = [...document.querySelectorAll('[data-testid=combat-actions] button[data-testid]')].find((x) => x.dataset.testid !== 'act-attack' && !x.disabled); if (b) b.setAttribute('data-mk', 'spec'); return !!b; });
    await shot('t2-especial', { sel: spec ? '[data-mk=spec]' : '[data-testid=combat-actions]', kick: 'Paso 2 de 9 · Primer combate', who: 'Ataque especial',
      text: T('Bien. Ahora usa tu <b>ataque especial</b> (tecla <b>2</b>): pega más fuerte, pero gasta energía y tarda en volver.', 'Bien. Ahora toca tu <b>ataque especial</b>: pega más fuerte, pero gasta energía y tarda en volver. Mantén pulsado para leerlo.'), cardAt: 'top' });
    // Termina el combate
    for (let i = 0; i < 60; i++) { const s = await G(() => { const c = window.__GRAVEVOW__.getState().combat; return c ? c.state.outcome ?? 'on' : null; }); if (s === null) break;
      if (s !== 'on') { await tap('[data-testid=btn-combat-continue]'); await p.waitForTimeout(300); if (await p.$('[data-testid=loot-modal]')) { await tap('[data-testid=btn-take-all]'); await tap('[data-testid=btn-close-loot]'); } break; }
      if (await p.$('[data-testid=act-attack]:not([disabled])')) await tap('[data-testid=act-attack]:not([disabled])'); await p.waitForTimeout(250); }
    // T3 · Herida en la pierna: venda sobre la parte del cuerpo
    await p.waitForTimeout(400); await tap('[data-testid=hud-body]'); await p.waitForTimeout(500);
    await G(() => document.querySelectorAll('[data-testid=tutorial-guide]').forEach((e) => e.style.display = 'none'));
    const leg = await G(() => { const e = document.querySelector('[data-testid^=body-row-][data-testid*=leg]') || document.querySelector('[data-testid=body-map]'); if (e) e.setAttribute('data-mk', 'leg'); return !!e; });
    await shot('t3-venda', { sel: leg ? '[data-mk=leg]' : '[data-testid=body-panel]', kick: 'Paso 3 de 9 · Heridas', who: 'Pierna izquierda: herida leve',
      text: T('Los pinchos te han abierto la pierna. <b>Arrastra la venda</b> de tu mochila sobre la <b>pierna</b> (o haz clic en la pierna y elige la venda).', '<b>Toca la pierna</b> y luego <b>la venda</b> (o arrástrala encima). Cada parte se cura por separado.'), cardAt: 'top' });
    await G(() => window.__GRAVEVOW__.actions.closeModal()); await p.waitForTimeout(300);
    // T4 · Mercenario: solo aliarse; atacar y traicionar bloqueados
    await G(() => window.__GRAVEVOW__.actions.openModal({ type: 'rival' })); await p.waitForTimeout(600);
    await G(() => document.querySelectorAll('[data-testid=tutorial-guide]').forEach((e) => e.style.display = 'none'));
    await shot('t7-mercenario', { sel: '[data-testid=rival-ally]', kick: 'Paso 7 de 9 · Mercenario errante', who: 'Osric, espada de alquiler',
      text: T('Osric ofrece su espada a cambio de parte del botín. <b>Alíate con él</b>. Fíjate en el <b>triángulo</b> sobre su cabeza: es cuánto puedes fiarte.', '<b>Toca «Aliarse».</b> El <b>triángulo</b> sobre su cabeza dice cuánto puedes fiarte de él.'),
      no: 'En esta bajada no puedes atacar a Osric: lo necesitas vivo.', noY: touch ? 300 : 860 });
    // Mini tutoriales del Bastión
    await G(() => window.__GRAVEVOW__.actions.closeModal());
    await G(() => window.__GRAVEVOW__.actions.finishExpedition('extracted')); await p.waitForTimeout(800);
    await G(() => window.__GRAVEVOW__.actions.goto('lobby')); await p.waitForTimeout(800);
    await p.evaluate(() => document.querySelectorAll('[data-testid=tutorial] button, [data-testid=btn-tutorial-ok]').forEach((b) => b.click())); await p.waitForTimeout(300);
    const nav = async (label) => { await p.evaluate((l) => { const b = [...document.querySelectorAll('[data-testid=lobby-nav] button')].find((x) => x.textContent.trim().startsWith(l)); b && b.click(); }, label); await p.waitForTimeout(700); };
    await nav('Intendencia');
    await shot('m-intendencia', { sel: '[data-testid=empty-backpack]', kick: 'Intendencia · 2 de 3', who: 'Lo que traes de abajo',
      text: T('Lo que llevas en la mochila <b>se pierde si mueres</b>. Pulsa <b>«Vaciar mochila»</b> para guardarlo todo en el almacén.', 'Lo de la mochila <b>se pierde si mueres</b>. Toca <b>«Vaciar mochila»</b> para guardarlo en el almacén.'), skip: true });
    await nav('Bastión');
    const por = await G(() => { const i = document.querySelector('[data-testid=vendor-garth] img, [data-testid=vendor-garth] canvas'); return i && i.tagName === 'IMG' ? i.src : null; });
    const garth = await G(() => { const e = document.querySelector('[data-testid=btn-refuge]') || document.querySelector('[data-testid=vendor-garth]'); if (e) e.setAttribute('data-mk', 'st'); return !!e; });
    await shot('m-cocina', { sel: garth ? '[data-mk=st]' : null, dim: true, portrait: por, kick: 'Refugio · La Cocina · 1 de 4', who: 'Garth, cocinero y cazador',
      text: '«Ya tienes fogón, que no es poco. Aquí se guisa lo que da <b>más saciedad</b> y te deja <b>preparado</b> antes de bajar. Toma: carne, setas y agua. Vamos a hacer un guiso de verdad.»', ok: 'Vamos', skip: true });
    await G(guide); await p.waitForTimeout(300); await p.screenshot({ path: path.join(OUT, `${dev}-guia.png`) }); console.log(dev, 'guia');
    await ctx.close();
  }
  await b.close();
})();
