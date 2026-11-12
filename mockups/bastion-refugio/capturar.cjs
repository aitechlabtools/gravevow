// Maquetas «Bastión: Mercaderes y Refugio». Se abre el juego real en la pestaña Bastión y se monta encima la propuesta
// con las mismas clases de las tarjetas de mercaderes. Las imágenes de estación son marcadores de 20×26 px (como los retratos).
// Uso: node mockups/bastion-refugio/capturar.cjs [url]
const { chromium } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5173/play/';
const OUT = path.join(__dirname, 'capturas');
const SIZES = { desktop: { viewport: { width: 1920, height: 1080 } }, tablet: { viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true }, phone: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };

function build(view) {
  const screen = document.querySelector('[data-testid=screen-merchants]');
  const garth = document.querySelector('[data-testid=vendor-card-garth] img');
  const scale = Math.max(1, Math.round(garth.getBoundingClientRect().width / 20));
  const phone = innerWidth < 900;
  // Marcadores pixel art 20×26
  const art = (id) => {
    const c = document.createElement('canvas'); c.width = 20; c.height = 26; const g = c.getContext('2d');
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const W = '#5a3a1e', W2 = '#7a5230', ST = '#5d5a66', ST2 = '#8a8794', FI = '#f2a23a', FI2 = '#ffe08a';
    ({
      refuge: () => { R(2, 12, 16, 12, W); R(3, 13, 14, 10, W2); R(1, 10, 18, 3, '#3a2a18'); R(4, 7, 12, 3, '#3a2a18'); R(7, 4, 6, 3, '#3a2a18'); R(8, 17, 4, 7, '#2a1a0e'); R(13, 15, 3, 3, FI); R(14, 16, 1, 1, FI2); R(15, 1, 2, 6, ST); R(15, 0, 2, 1, '#8c8693'); },
      cot: () => { R(1, 18, 18, 2, W); R(1, 20, 2, 4, W); R(17, 20, 2, 4, W); R(2, 14, 16, 4, '#c9b27a'); R(2, 13, 5, 3, '#e9e1cc'); R(8, 14, 10, 3, '#6b4a8a'); },
      kitchen: () => { R(3, 18, 14, 6, ST); R(4, 19, 12, 4, ST2); R(6, 15, 8, 4, '#2a2830'); R(5, 14, 10, 2, '#3a3741'); R(7, 19, 6, 3, FI); R(8, 20, 4, 1, FI2); R(8, 10, 1, 3, '#cfcfd8'); R(11, 8, 1, 4, '#cfcfd8'); },
      bench: () => { R(1, 14, 18, 3, W2); R(2, 17, 2, 7, W); R(16, 17, 2, 7, W); R(4, 11, 4, 3, ST2); R(10, 12, 7, 2, '#b8b8c4'); R(14, 9, 2, 3, W); },
      infirmary: () => { R(4, 10, 12, 14, '#e9e1cc'); R(5, 11, 10, 12, '#d8cfb6'); R(9, 13, 2, 8, '#b02a2a'); R(6, 16, 8, 2, '#b02a2a'); R(6, 7, 8, 3, W); },
      forge: () => { R(4, 16, 12, 3, ST); R(7, 19, 6, 5, ST); R(3, 15, 14, 1, ST2); R(6, 11, 8, 2, '#3a3741'); R(13, 6, 2, 6, W); R(11, 5, 6, 2, ST2); R(2, 21, 3, 3, FI); },
      alchemy: () => { R(1, 18, 18, 2, W2); R(2, 20, 2, 4, W); R(16, 20, 2, 4, W); R(4, 11, 4, 7, '#5ab08a'); R(5, 9, 2, 2, '#cfe'); R(10, 13, 4, 5, '#b58cff'); R(11, 11, 2, 2, '#cfe'); R(15, 14, 2, 4, '#e8b33a'); },
      runic: () => { R(9, 12, 2, 12, W); R(5, 22, 10, 2, W); R(4, 8, 12, 5, W2); R(5, 9, 10, 3, '#e9e1cc'); R(7, 10, 1, 1, '#b58cff'); R(10, 10, 1, 1, '#b58cff'); R(12, 10, 1, 1, '#b58cff'); },
    })[id]();
    const img = document.createElement('img'); img.src = c.toDataURL(); img.className = 'pixelated'; img.style.width = 20 * scale + 'px'; img.style.height = 26 * scale + 'px'; return img;
  };
  const css = document.createElement('style'); css.textContent = `
    .mk-wrap{width:100%;max-width:1200px}
    .mk-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;width:100%;max-width:1200px}
    .mk-bar{display:flex;gap:4px;justify-content:center}.mk-bar i{width:28%;height:8px;background:#2a2830;border:1px solid #07060a}.mk-bar i.on{background:linear-gradient(#f2c75a,#8a5d14)}
    .mk-up{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);white-space:nowrap;font:700 12px Grenze,serif;color:#07060a;background:#7fd65a;padding:2px 6px;letter-spacing:.06em}
    .mk-lock{position:absolute;inset:0;display:grid;place-items:center;font-size:${phone ? 18 : 30}px}
    .mk-big .ui-arch{min-height:${phone ? 150 : 420}px}
    .mk-big h3{font-size:${phone ? 18 : 30}px}
    .mk-dot{position:absolute;bottom:8px;right:10px;min-width:22px;height:22px;line-height:22px;text-align:center;background:#7fd65a;color:#000;font:700 13px Grenze,serif}
    .mk-det{display:grid;grid-template-columns:${phone ? '150px 1fr' : '320px 1fr'};gap:var(--gap);width:100%;max-width:1200px}
    .mk-lv{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.mk-lv div{border:1px solid #3a3741;padding:8px;background:#19171f;font:${phone ? 13 : 15}px "Crimson Pro",serif}
    .mk-lv div.cur{border-color:#e8b33a}.mk-lv b{display:block;font-family:Cinzel,serif;color:#e8b33a;font-size:${phone ? 11 : 13}px}
    .mk-mat{display:flex;align-items:center;gap:8px;min-height:44px;border:1px solid #2a2830;background:#0000004d;padding:0 8px;font:${phone ? 13 : 15}px "Crimson Pro",serif}
    .mk-mat .ok{color:#7fd65a}.mk-mat .no{color:#d0905a}`;
  document.head.appendChild(css);
  const btn = (t, gold, extra = '') => `<button class="btn ${gold ? 'btn-gold' : ''} font-display tracking-[0.12em] uppercase w-full mt-auto" style="min-height:var(--btn-h,44px);min-height:44px" ${extra}>${t}</button>`;
  const back = (t) => `<button class="btn text-xs" style="min-height:44px">◂ ${t}</button>`;
  const card = (o) => {
    const a = document.createElement('article'); a.className = 'panel ui-card ' + (o.big ? 'mk-big' : '');
    a.innerHTML = `<h3 class="font-display text-parchment text-center leading-tight min-h-[1.5em]">${o.title}</h3><div class="ui-arch relative"><div class="pb-2 pt-4 art" style="${o.locked ? 'filter:grayscale(1) brightness(.35)' : ''}"></div>${o.locked ? '<div class="mk-lock">🔒</div>' : ''}${o.up ? '<span class="mk-up">▲ MEJORA</span>' : ''}${o.dot ? `<span class="mk-dot">${o.dot}</span>` : ''}</div>${o.body}`;
    a.querySelector('.art').appendChild(o.img); return a;
  };
  const bar = (n) => `<div class="mk-bar">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;
  const line = (t, cls = 'text-stone-400') => `<div class="text-center text-[12px] ${cls}">${t}</div>`;
  const root = document.createElement('div'); root.className = 'min-h-full flex flex-col items-center justify-center';
  if (view === 'entry') {
    root.innerHTML = `<div class="mk-head"><h2 class="ui-ptitle border-0 !text-[clamp(14px,1.8vw,26px)] !tracking-[0.18em] !m-0">El Bastión</h2></div>`;
    const grid = document.createElement('div'); grid.className = 'grid mk-wrap'; grid.style.cssText = `grid-template-columns:1fr 1fr;gap:var(--gap);max-width:${phone ? 760 : 1100}px`;
    const g = garth.cloneNode(); g.style.width = garth.getBoundingClientRect().width * (phone ? 1 : 2) + 'px'; g.style.height = 'auto';
    const r = art('refuge'); r.style.width = 20 * scale * (phone ? 1 : 2) + 'px'; r.style.height = 26 * scale * (phone ? 1 : 2) + 'px';
    grid.appendChild(card({ big: true, title: 'Mercaderes', img: g, dot: '2', body: line('Comercia, cumple encargos y gana su confianza.', 'text-parchment !text-[16px]') + line('2 encargos listos para entregar', 'text-heal') + btn('Entrar', true) }));
    grid.appendChild(card({ big: true, title: 'Refugio', img: r, dot: '1', body: line('Tu rincón del Bastión: descansa, cocina, cura y fabrica.', 'text-parchment !text-[16px]') + line('1 estación por construir · Descanso 100', 'text-heal') + btn('Entrar', true) }));
    root.appendChild(grid);
  } else if (view === 'refuge') {
    root.innerHTML = `<div class="mk-head"><h2 class="ui-ptitle border-0 !text-[clamp(14px,1.8vw,26px)] !tracking-[0.18em] !m-0">El Refugio</h2><div class="flex gap-2 items-center"><span class="text-[12px] text-stone-300">Preparación: descansado</span>${back('Bastión')}</div></div>`;
    const grid = document.createElement('div'); grid.className = 'grid mk-wrap'; grid.style.cssText = 'grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--gap)';
    const S = [
      ['cot', 'Catre', 1, 'Orik', 'Dormir recupera el Descanso.', 'Usar · Dormir', true],
      ['kitchen', 'Cocina', 1, 'Garth', 'Platos que llenan y preparan.', 'Usar', true, true],
      ['bench', 'Banco de trabajo', 3, 'Orik', 'Desguazar rinde un 55 % más.', 'Usar', true],
      ['infirmary', 'Rincón de cura', 0, 'Hermana Vesper', 'Vendas, torniquetes y férulas.', 'Pedir a Vesper', true, false, '!'],
      ['forge', 'Forja', 0, 'Maese Brand', 'Forja tus armas y piezas.', 'Pedir a Brand', false],
      ['alchemy', 'Mesa de alquimia', 0, 'Eldrin', 'Antídotos, maná y tónicos.', 'Pedir a Eldrin', false],
      ['runic', 'Atril rúnico', 0, 'Eldrin', 'Equipo mágico y runas.', 'Pedir a Eldrin', false],
    ];
    for (const [id, name, lv, by, what, b, can, up, dot] of S) {
      const lvl = lv === 0 ? 'Bloqueada' : lv === 3 ? 'Nivel 3/3 · máximo' : `Nivel ${lv}/3`;
      grid.appendChild(card({ title: name, img: art(id), locked: lv === 0, up, dot, body:
        line(lvl, `uppercase tracking-[0.12em] !text-[11px] ${lv === 0 ? 'text-stone-500' : 'text-gold'}`) + line(`Encargado: ${by}`, 'text-[#c8a46a]') + (phone ? '' : line(what)) + bar(lv) +
        btn(b, lv > 0 || can, lv === 0 && !can ? 'disabled title="Llega con el Osario"' : '') }));
    }
    root.appendChild(grid);
  } else {
    // Detalle de la Cocina (mejora disponible)
    root.innerHTML = `<div class="mk-head"><div class="flex gap-2 items-center">${back('Refugio')}<h2 class="ui-ptitle border-0 !text-[clamp(14px,1.8vw,26px)] !tracking-[0.18em] !m-0">La Cocina</h2></div>${back('Bastión')}</div>`;
    const det = document.createElement('div'); det.className = 'mk-det';
    const g = garth.cloneNode(); g.style.width = garth.getBoundingClientRect().width * (phone ? 0.6 : 1) + 'px'; g.style.height = 'auto';
    const left = card({ title: 'Cocina', img: art('kitchen'), up: true, body: line('Nivel 1/3 · Fogón', 'text-gold uppercase tracking-[0.12em] !text-[11px]') + bar(1) + btn('Usar', true) });
    const right = document.createElement('div'); right.className = 'panel p-3 flex flex-col gap-2 min-w-0';
    right.innerHTML = `<div class="flex gap-3 items-center"><div class="ui-arch" style="width:${phone ? 56 : 90}px;height:${phone ? 64 : 110}px" id="pt"></div><div><div class="font-display text-parchment">Encargado: Garth</div><div class="text-[13px] text-stone-300 italic">«Lo que da más saciedad y te deja preparado antes de bajar.»</div><div class="text-[12px] text-stone-500">Mientras no la tengas: solo el rancho comunitario.</div></div></div>
      <div class="mk-lv"><div class="cur"><b>Nivel 1 · Fogón ✓</b>Guiso del Bastión. Lotes de 5.</div><div><b>Nivel 2 · Despensa de especias</b>Caldo especiado. Lotes de 10.</div><div><b>Nivel 3 · Cocina de regimiento</b>Lotes de 20; los platos preparan un 15 %.</div></div>
      <div class="font-display text-gold text-[13px] tracking-[0.12em] uppercase">Siguiente mejora · 100 de oro</div>
      <div class="mk-mat"><span class="ok">✓</span>Chatarra 6/6</div><div class="mk-mat"><span class="ok">✓</span>Retales de cuero 4/4</div><div class="mk-mat"><span class="ok">✓</span>Mineral de hierro 2/2</div>
      <div class="flex gap-2 mt-auto"><button class="btn btn-gold" style="min-height:44px;flex:1">Pedir a Garth que la mejore</button><button class="btn" style="min-height:44px">Usar la cocina</button></div>`;
    right.querySelector('#pt').appendChild(g);
    det.append(left, right); root.appendChild(det);
  }
  screen.innerHTML = ''; screen.appendChild(root);
}
function mercaderes() {
  const c = document.querySelector('[data-testid=bastion-cot]'); c.innerHTML = '<button class="btn text-xs" style="min-height:44px">◂ Bastión</button>';
}

(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of Object.entries(SIZES)) {
    const ctx = await b.newContext(opts); const p = await ctx.newPage(); const G = (f, a) => p.evaluate(f, a);
    await p.goto(URL + '?debug'); await G(() => indexedDB.deleteDatabase('gravevow')); await G(() => { try { localStorage.clear(); localStorage.setItem('gravevow.tutorialDone', '1'); } catch {} }); await p.reload();
    await p.click('[data-testid=btn-play]'); await G(() => document.fullscreenElement && document.exitFullscreen());
    await p.fill('[data-testid=name-input]', 'Aldric'); await p.click('[data-testid=btn-create]'); await p.waitForTimeout(400);
    await G(() => document.querySelectorAll('[data-testid=btn-tutorial-ok]').forEach((x) => x.click()));
    const goB = async () => { await G(() => [...document.querySelectorAll('[data-testid=lobby-nav] button')].find((x) => x.textContent.trim().startsWith('Bastión')).click()); await p.waitForTimeout(700); };
    await goB(); await p.screenshot({ path: path.join(OUT, `${dev}-0-actual-mercaderes.png`) });
    await G(mercaderes); await p.waitForTimeout(150); await p.screenshot({ path: path.join(OUT, `${dev}-2-mercaderes.png`) });
    for (const [i, v] of [[1, 'entry'], [3, 'refuge'], [4, 'detail']]) {
      await goB(); await G(() => [...document.querySelectorAll('[data-testid=lobby-nav] button')].find((x) => x.textContent.trim().startsWith('Jugar')).click()); await goB();
      await G(build, v); await p.waitForTimeout(250);
      const small = await G(() => [...document.querySelectorAll('[data-testid=screen-merchants] button')].filter((e) => e.getBoundingClientRect().height < 43.5).length);
      const ov = await G(() => document.documentElement.scrollWidth - innerWidth);
      console.log(dev, v, 'botones<44', small, 'desborde', ov);
      await p.screenshot({ path: path.join(OUT, `${dev}-${i}-${v}.png`) });
    }
    await ctx.close();
  }
  await b.close();
})();
