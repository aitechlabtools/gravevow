// Estructura elegida en los tres tamaños: node mockups/combate-heridas-barras/estructura.cjs [url]
const { chromium } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5174/play/';
const SIZES = { movil: [844, 390, true], tableta: [1180, 820, true], escritorio: [1920, 1080, false] };
const CSS = (sz) => {
  const k = sz === 'movil' ? 1 : sz === 'tableta' ? 1.5 : 2; const fs = Math.round(12 * (sz === 'movil' ? 1 : sz === 'tableta' ? 1.34 : 1.67));
  return `.combat-bar{grid-template-columns:44% 56%!important;padding:${Math.round(4 * k)}px ${Math.round(8 * k)}px!important;gap:${Math.round(4 * k)}px!important;min-height:0!important}
  .combat-bar [data-testid=combat-log]{position:static!important;transform:none!important;width:auto!important;white-space:normal!important;text-align:left!important;font-size:${fs + 1}px!important;pointer-events:auto!important;padding:${Math.round(3 * k)}px ${Math.round(8 * k)}px!important;line-height:1.3}
  .combat-bar [data-testid=combat-log] > div:not(:last-child){display:block!important;color:#8c8693}
  .combat-bar [data-testid=combat-log] *{font-size:inherit!important}
  .cmdgrid{grid-template-rows:auto auto!important}.cmdgrid,.cmdpair{gap:${Math.round(4 * k)}px!important}
  .cmd{min-height:${Math.round(44 * k)}px!important;height:${Math.round(44 * k)}px;padding:2px 4px 2px ${Math.round(14 * k)}px!important}
  .cmd .cmd-label{font-size:${fs}px!important;letter-spacing:.02em!important;white-space:normal!important;line-height:1.1}
  .cmd .cmd-sub{display:none!important}.cmd.half svg{display:none}
  ${sz === 'escritorio' ? '' : '.cmd kbd{display:none!important}'}
  .fighter-shadow{translate:-50% 15%!important}[data-testid=fighter-e1],[data-testid=fighter-e2]{bottom:41%!important}.fighter-shadow.foe{bottom:41.5%!important}
  .info-stack,.turn-arrow,.dmg-float,.turnbar,.combat-zone{display:none!important}`;
};
(async () => { const b = await chromium.launch();
  for (const [sz, [w, h, touch]] of Object.entries(SIZES)) for (const two of [true, false]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: sz === 'movil' }); const p = await c.newPage();
    await p.goto(URL + '?debug'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(700);
    await p.click('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Pau'); await p.click('[data-testid=btn-create]');
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialDone = true; for (const k of Object.keys(pr.tutorialSeen || {})) pr.tutorialSeen[k] = true; g.setState({ tutorial: null, profile: { ...pr } }); });
    await p.click('[data-testid=tab-play]'); await p.click('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(2000);
    await p.evaluate((two) => { const G = window.__GRAVEVOW__, s = G.getState();
      if (two) G.setState({ rival: { ...s.rival, who: s.rival.who || 'kael', disposition: 'allied', hp: 60, potions: 1 } });
      G.actions.startCombat('pve', 'e1', 'skeleton', two ? { entityId: 'e2', enemyId: 'skeleton' } : undefined); }, two);
    await p.waitForTimeout(2600);
    await p.addStyleTag({ content: CSS(sz) }); await p.waitForTimeout(300);
    await p.evaluate(({ sz, two }) => {
      const k = sz === 'movil' ? 1 : sz === 'tableta' ? 1.5 : 2, px = (n) => Math.round(n * k) + 'px', fs = sz === 'movil' ? 12 : sz === 'tableta' ? 16 : 20;
      const add = (h) => { const d = document.createElement('div'); d.innerHTML = h; document.body.append(d.firstElementChild); };
      const card = `position:fixed;z-index:50;background:#151419f0;border:1px solid;font-family:Grenze,serif;color:#e6e0d2;font-size:${fs}px;padding:${px(4)} ${px(6)}`;
      const bar = (pc, c) => `<div style="height:${px(4)};background:#0b0a0f;border:1px solid #3a3841;margin-top:${px(3)}"><i style="display:block;height:100%;width:${pc}%;background:${c}"></i></div>`;
      const nm = (t, c, n) => `<div style="display:flex;justify-content:space-between;gap:4px"><span style="font-family:Cinzel,serif;color:${c};white-space:nowrap">${t}</span><span>${n}</span></div>`;
      const u = sz === 'movil' ? 2 : sz === 'tableta' ? 4 : 5;
      const fig = `<svg width="${9*u}" height="${15*u}" shape-rendering="crispEdges">` + [[3,0,3,3,'#6fae5a'],[2,3,5,4,'#e8b33a'],[2,7,5,2,'#6fae5a'],[0,3,2,6,'#6fae5a'],[7,3,2,6,'#d23a3a'],[2,9,2,6,'#e8b33a'],[5,9,2,6,'#6fae5a']].map(([x,y,w,h,f]) => `<rect x="${x*u+.5}" y="${y*u+.5}" width="${w*u-1}" height="${h*u-1}" fill="${f}" stroke="#0d0b0c"/>`).join('') + `<rect x="${3*u}" y="${9*u+1}" width="${u}" height="${2*u}" fill="#ff2030"/><line x1="${7*u+1}" y1="${5*u}" x2="${9*u-1}" y2="${7*u}" stroke="#f2ead8"/></svg>`;
      const grid = document.querySelector('.cmdgrid').getBoundingClientRect(), bt = document.querySelector('.combat-bar').getBoundingClientRect().top;
      const L = innerWidth - Math.round(240 * k) - Math.round(8 * k), W = grid.width, bs = Math.max(44, 15 * u + 6), ch = bs + Math.round(6 * k), gap = Math.round(6 * k);
      add(`<div style="${card};left:${L}px;top:${bt - ch - gap}px;width:${Math.round(240 * k)}px;height:${ch}px;padding:${px(2)} ${px(6)} ${px(2)} ${px(2)};border-color:#6b4a12;display:flex;gap:${px(6)};align-items:center"><button style="width:${bs}px;height:${bs}px;background:#0b0a0f;border:1px solid #c4283b;display:grid;place-items:center;padding:0">${fig}</button><div style="flex:1;line-height:1.15">${nm('Pau · Nv 1', '#e9e1cc', '')}<div style="display:flex;gap:4px;align-items:center"><span style="flex:1">${bar(73, '#c4283b')}</span><span>91/125</span></div><div style="display:flex;gap:4px;align-items:center"><span style="flex:1">${bar(100, '#e08a3d')}</span><span>20/20</span></div></div></div>`);
      if (two) add(`<div style="${card};left:${L}px;top:${bt - ch - gap - Math.round(30 * k) - 2}px;width:${Math.round(240 * k)}px;height:${px(28)};padding:${px(2)} ${px(6)};border-color:#2f6b4c;display:flex;gap:${px(6)};align-items:center"><span style="font-family:Cinzel,serif;color:#9fe0bd">Kael</span><span style="flex:1">${bar(57, '#5fd19a')}</span><span>60/105</span></div>`);
      const fw = Math.round(170 * k), foes = two ? [['▶ Esqueleto I', '34/46', 74, '☠ 3', '#7bc043', 1], ['Esqueleto II', '46/46', 100, '✱ 1', '#e8d24a', 0]] : [['Esqueleto guerrero', '34/46', 74, '☠ 3', '#7bc043', 0]];
      foes.forEach(([n, hp, pc, st, sc, tgt], i) => add(`<div style="${card};left:${Math.round(8 * k) + i * (fw + Math.round(6 * k))}px;top:${px(6)};width:${fw}px;min-height:44px;${tgt ? 'border:2px solid #c4283b' : 'border-color:#5a2a2e'}">${nm(n, '#ffb3a8', hp)}${bar(pc, '#c4283b')}<span style="color:${sc};border:1px solid;padding:0 3px;display:inline-block;margin-top:${px(3)}">${st}</span>${tgt && sz !== 'movil' ? `<span style="color:#f8dc7a;border:1px solid;padding:0 3px;display:inline-block;margin:${px(3)} 0 0 4px">⚠ Tajo → ti ≈12</span>` : ''}</div>`));
      if (two) { const e = document.querySelector('[data-testid=fighter-e1] img').getBoundingClientRect(); add(`<div style="position:fixed;z-index:40;left:${e.left + e.width / 2 - 8}px;top:${e.top + e.height * .06 - 22 * k}px;color:#c4283b;font-size:${px(16)}">▼</div>`); }
    }, { sz, two });
    await p.waitForTimeout(200); await p.screenshot({ path: path.join(__dirname, `estructura-${sz}-${two ? '2v2' : '1v1'}.png`) }); await c.close(); }
  await b.close(); })();
