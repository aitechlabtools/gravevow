// Móvil: cómo encajar barra de acciones, fichas y esqueleto (opción C). node mockups/combate-heridas-barras/movil.cjs [url]
const { chromium } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5174/play/';
const HALF = `.combat-bar{position:absolute!important;bottom:0;width:50%;background:transparent!important;border:0!important;z-index:5}
  .cmdgrid{grid-template-columns:1fr 1fr!important;grid-template-rows:auto!important}.cmdpair{display:contents!important}
  .combat-bar [data-testid=combat-log]{width:100%!important;left:0!important;transform:none!important;font-size:12px!important}`;
const LAYOUTS = {
  final2: `.combat-bar{grid-template-columns:44% 56%!important;padding-top:4px!important;padding-bottom:4px!important;gap:4px!important}
    .combat-bar [data-testid=combat-log]{position:static!important;transform:none!important;width:auto!important;white-space:normal!important;text-align:left!important;font-size:12px!important;pointer-events:auto!important;padding:3px 8px!important;line-height:1.25}
    .combat-bar [data-testid=combat-log] > div:not(:last-child){display:block!important;color:#8c8693}
    .cmdgrid,.cmdpair{gap:4px!important}.cmd{min-height:44px!important;height:44px;padding:2px 4px 2px 16px!important}.cmd .flex-col{flex-direction:row!important;align-items:baseline;gap:6px}
    .cmd.half .flex-col{flex-direction:column!important;gap:0}.cmd.half svg{display:none}.cmd.half .cmd-label{font-size:12px!important}.cmd.half .cmd-sub{display:none}.cmd .cmd-label{font-size:12px!important;letter-spacing:.02em!important}.cmd .cmd-sub,.cmd kbd{display:none!important}.cmd.half .cmd-label{font-size:12px!important;letter-spacing:0!important;white-space:normal!important;line-height:1.1}.cmd.half{padding-left:12px!important;padding-right:2px!important}.cmd .cmd-sub{font-size:12px!important}
    [data-testid=fighter-e1],[data-testid=fighter-e2]{bottom:50%!important}`,
  final: `.combat-bar{grid-template-columns:44% 56%!important}
    .combat-bar [data-testid=combat-log]{position:static!important;transform:none!important;width:auto!important;white-space:normal!important;text-align:left!important;font-size:13px!important;pointer-events:auto!important;padding:4px 8px!important;line-height:1.3}
    .combat-bar [data-testid=combat-log] > div:not(:last-child){display:block!important;color:#8c8693}
    .cmd.half{padding:4px 4px 4px 14px!important}.cmd.half svg{display:none}.cmd.half .cmd-label{font-size:12px!important}
    [data-testid=fighter-e1],[data-testid=fighter-e2]{bottom:52%!important}`,
  'texto-izq': `.combat-bar{grid-template-columns:44% 56%!important}
    .combat-bar [data-testid=combat-log]{position:static!important;transform:none!important;width:auto!important;white-space:normal!important;text-align:left!important;font-size:13px!important;pointer-events:auto!important;padding:4px 8px!important;line-height:1.3}
    .combat-bar [data-testid=combat-log] > div:not(:last-child){display:block!important;color:#8c8693}
    .cmd.half{padding:4px 4px 4px 14px!important}.cmd.half svg{display:none}.cmd.half .cmd-label{font-size:12px!important}`,
  boceto: `.combat-bar{position:absolute!important;bottom:0;right:0;width:56%;background:transparent!important;border:0!important;z-index:5}
    .combat-bar [data-testid=combat-log]{width:100%!important;left:0!important;transform:none!important;font-size:12px!important}
    .cmd.half{padding:4px 4px 4px 14px!important}.cmd.half svg{display:none}.cmd.half .cmd-label{font-size:12px!important}`,
  ahora: '',
  fila: `.cmdgrid{grid-template-columns:repeat(6,minmax(0,1fr))!important;grid-template-rows:auto!important}.cmdpair{display:contents!important}
    .cmd{padding:4px 4px 4px 16px!important}.cmd-label{font-size:12px!important}.cmd svg{display:none}`,
  'mitad-der': HALF + `.combat-bar{right:0}`,
  'mitad-izq': HALF + `.combat-bar{left:0}[data-testid=fighter-player]{bottom:44%!important;height:40%!important}[data-testid=fighter-rival]{bottom:44%!important;height:30%!important}`,
};
(async () => { const b = await chromium.launch();
  for (const [name, css] of Object.entries(LAYOUTS).filter(([n]) => !process.argv[3] || n === process.argv[3])) {
    const c = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }); const p = await c.newPage();
    await p.goto(URL + '?debug'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(700);
    await p.click('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Pau'); await p.click('[data-testid=btn-create]');
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialDone = true; for (const k of Object.keys(pr.tutorialSeen || {})) pr.tutorialSeen[k] = true; g.setState({ tutorial: null, profile: { ...pr } }); });
    await p.click('[data-testid=tab-play]'); await p.click('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(2000);
    await p.evaluate(() => { const G = window.__GRAVEVOW__, s = G.getState();
      G.setState({ rival: { ...s.rival, who: s.rival.who || 'kael', disposition: 'allied', hp: 60, potions: 1 } });
      G.actions.startCombat('pve', 'e1', 'skeleton', { entityId: 'e2', enemyId: 'skeleton' }); });
    await p.waitForTimeout(2600);
    await p.addStyleTag({ content: css + '.info-stack,.turn-arrow,.dmg-float{display:none!important}' }); await p.waitForTimeout(300);
    await p.evaluate((name) => {
      const R = (id) => { const e = document.querySelector(`[data-testid=fighter-${id}] img`); return e && e.getBoundingClientRect(); };
      const add = (h) => { const d = document.createElement('div'); d.innerHTML = h; document.body.append(d.firstElementChild); };
      const card = 'position:fixed;z-index:50;background:#151419f0;border:1px solid;font-family:Grenze,serif;color:#e6e0d2;font-size:12px;padding:4px 6px;min-height:44px';
      const bar = (pc, c) => `<div style="height:4px;background:#0b0a0f;border:1px solid #3a3841;margin-top:3px"><i style="display:block;height:100%;width:${pc}%;background:${c}"></i></div>`;
      const nm = (t, c, n) => `<div style="display:flex;justify-content:space-between;gap:4px"><span style="font-family:Cinzel,serif;color:${c};white-space:nowrap">${t}</span><span>${n}</span></div>`;
      const figU = (u) => `<svg width="${9*u}" height="${15*u}" shape-rendering="crispEdges">` + [[3,0,3,3,'#6fae5a'],[2,3,5,4,'#e8b33a'],[2,7,5,2,'#6fae5a'],[0,3,2,6,'#6fae5a'],[7,3,2,6,'#d23a3a'],[2,9,2,6,'#e8b33a'],[5,9,2,6,'#6fae5a']].map(([x,y,w,h,f]) => `<rect x="${x*u+.5}" y="${y*u+.5}" width="${w*u-1}" height="${h*u-1}" fill="${f}" stroke="#0d0b0c"/>`).join('') + `<rect x="${3*u}" y="${9*u+1}" width="${u}" height="${2*u}" fill="#ff2030"/><line x1="${7*u+1}" y1="${5*u}" x2="${9*u-1}" y2="${7*u}" stroke="#f2ead8"/></svg>`; const fig = figU(3);
      const F = name.startsWith('final'), F2 = name === 'final2', bt = document.querySelector('.combat-bar').getBoundingClientRect().top;
      if (F2) {
        add(`<div style="${card};left:474px;top:${bt - 52}px;width:362px;min-height:0;height:50px;padding:2px 6px 2px 2px;border-color:#6b4a12;display:flex;gap:6px;align-items:center"><button style="width:44px;height:44px;background:#0b0a0f;border:1px solid #c4283b;display:grid;place-items:center;padding:0">${figU(2)}</button><div style="flex:1;line-height:1.15">${nm('Pau · Nv 1', '#e9e1cc', '')}<div style="display:flex;gap:4px;align-items:center"><span style="flex:1">${bar(73, '#c4283b')}</span><span>91/125</span></div><div style="display:flex;gap:4px;align-items:center"><span style="flex:1">${bar(100, '#e08a3d')}</span><span>20/20</span></div></div></div>`);
        add(`<div style="${card};left:474px;top:${bt - 52 - 30}px;width:180px;min-height:0;height:28px;padding:2px 6px;border-color:#2f6b4c;display:flex;gap:6px;align-items:center"><span style="font-family:Cinzel,serif;color:#9fe0bd">Kael</span><span style="flex:1">${bar(57, '#5fd19a')}</span><span>60/105</span></div>`);
      } else {
      add(`<div style="${card};left:${F ? 474 : 8}px;top:${F ? bt - 62 : 6}px;width:${F ? 362 : 290}px;border-color:#6b4a12;display:flex;gap:6px;align-items:center"><button style="width:44px;height:52px;background:#0b0a0f;border:1px solid #c4283b;display:grid;place-items:center">${fig}</button><div style="flex:1">${nm('Pau · Nv 1', '#e9e1cc', '<span style="color:#ff5a64">◆◆ ✕ ◆</span>')}${bar(73, '#c4283b')}${bar(100, '#e08a3d')}</div></div>`);
      add(`<div style="${card};left:${F ? 474 : 304}px;top:${F ? bt - 110 : 6}px;width:${F ? 180 : 112}px;border-color:#2f6b4c">${nm('Kael', '#9fe0bd', '60/105')}${bar(57, '#5fd19a')}</div>`); }
      add(`<div style="${card};left:${F ? 8 : 432}px;top:6px;width:170px;border:2px solid #c4283b">${nm('▶ Esqueleto I', '#ffb3a8', '34/46')}${bar(74, '#c4283b')}<span style="color:#7bc043;border:1px solid;padding:0 3px;display:inline-block;margin-top:3px">☠ 3</span></div>`);
      add(`<div style="${card};left:${F ? 184 : 608}px;top:6px;width:170px;border-color:#5a2a2e">${nm('Esqueleto II', '#ffb3a8', '46/46')}${bar(100, '#c4283b')}<span style="color:#e8d24a;border:1px solid;padding:0 3px;display:inline-block;margin-top:3px">✱ 1</span></div>`);
      for (const [id, pc, col, tgt] of [['e1', 74, '#c4283b', 1], ['e2', 100, '#c4283b', 0], ['rival', 57, '#5fd19a', 0]]) { const r = R(id); if (!r) continue; const w = r.width * .5;
        if (!name.startsWith('final2')) add(`<div style="position:fixed;z-index:40;left:${r.left + r.width / 2 - w / 2}px;top:${r.top + r.height * .06 - 8}px;width:${w}px;height:5px;background:#0b0a0f;border:1px solid #000;${tgt ? 'outline:2px solid #c4283b;outline-offset:1px' : ''}"><i style="display:block;height:100%;width:${pc}%;background:${col}"></i></div>`);
        if (tgt) add(`<div style="position:fixed;z-index:40;left:${r.left + r.width / 2 - 6}px;top:${r.top + r.height * .06 - (name.startsWith('final2') ? 18 : 30)}px;color:#c4283b;font-size:16px">▼</div>`); }
    }, name);
    await p.waitForTimeout(200); await p.screenshot({ path: path.join(__dirname, `movil-${name}.png`) }); await c.close(); }
  await b.close(); })();
