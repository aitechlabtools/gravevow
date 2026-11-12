// Prueba de los mini tutoriales de la expedición (fase 5, data/tutorials.ts): reloj al entrar, necesidades, sangrado,
// fractura, zona vital, pieza rota, mochila llena, triángulo del errante y Kael (encima de su ventana), élite y habilidad
// de clase (en pleno combate), jefe y subzona nueva. Ninguno se repite. Todos los botones del cartel miden 44 px.
// Uso: node scripts/e2e-exp-minis.cjs [url] [carpeta] [dispositivo de Playwright]
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/claude-0/exp-minis';
const DEVICE = process.argv[4];
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = DEVICE ? await b.newContext({ ...devices[DEVICE] }) : await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const touch = !!DEVICE;
  const tap = async (sel) => { await page.waitForSelector(sel, { timeout: 8000 }); if (touch) await page.tap(sel); else await page.click(sel); await page.waitForTimeout(250); };
  const G = (fn, a) => page.evaluate(fn, a);
  const ok = (c, msg) => { if (!c) throw new Error(msg); console.log('✓', msg); };
  const size44 = async (sel) => { const r = await page.$eval(sel, (e) => { const b = e.getBoundingClientRect(); return [b.width, b.height]; }); return r[0] >= 44 && r[1] >= 44; };
  const mini = () => G(() => { const e = document.querySelector('[data-testid=mini-tutorial]'); return e ? { id: e.dataset.mini, step: +e.dataset.step } : null; });
  const waitMini = async (id) => { for (let i = 0; i < 40; i++) { const m = await mini(); if (m && m.id === id) return m; await page.waitForTimeout(200); } throw new Error(`no sale el mini tutorial ${id} (está ${JSON.stringify(await mini())}) ${JSON.stringify(await G(() => { const s = window.__GRAVEVOW__.getState(); const cs = s.combat?.state; return { q: s.miniQueue, turn: cs && cs.order[cs.turnIndex], out: cs && cs.outcome, modal: s.modal, notice: s.notice }; }))}`); };
  const seen = (id) => G((id) => window.__GRAVEVOW__.getState().tutorials.seen.includes(id), id);
  const exp = (fn) => G(`(() => { const g = window.__GRAVEVOW__, e = structuredClone(g.getState().expedition); (${fn})(e); g.setState({ expedition: e }); })()`);
  let shot = 0;
  const walk = async (id) => {
    await waitMini(id);
    ok(await size44('[data-testid=mini-skip]'), `${id}: «Saltar» mide 44 px`);
    for (let i = 0; i < 6; i++) {
      const m = await mini();
      if (!m || m.id !== id) break;
      await page.screenshot({ path: `${OUT}/${String(++shot).padStart(2, '0')}-${id}-${m.step + 1}.png` });
      ok(await size44('[data-testid=mini-ok]'), `${id} paso ${m.step + 1}: el botón mide 44 px`);
      await tap('[data-testid=mini-ok]');
      await page.waitForTimeout(300);
    }
    ok(await seen(id), `${id}: terminado y visto`);
  };

  await page.goto(BASE + '?debug&minis');
  await G(() => indexedDB.deleteDatabase('gravevow'));
  await G(() => { try { localStorage.setItem('gravevow.tutorialDone', '1'); } catch {} });
  await page.reload();
  await tap('[data-testid=btn-play]');
  await G(() => document.fullscreenElement && document.exitFullscreen());
  await page.fill('[data-testid=name-input]', 'Bajada');
  if (!(await page.isChecked('[data-testid=skip-tutorial]'))) await tap('[data-testid=skip-tutorial]');
  await tap('[data-testid=btn-create]');
  await waitMini('bienvenida');
  await tap('[data-testid=mini-skip]');

  // 1) Entrar: el reloj
  await tap('[data-testid=tab-play]');
  await tap('[data-testid=btn-enter-dungeon]');
  await page.waitForSelector('[data-testid=hud-timer]');
  await walk('exp.clock');

  // 2) Cuerpo y necesidades
  await exp((e) => { e.needs = { ...e.needs, sat: 15 }; });
  await walk('exp.need-low');
  await exp((e) => { e.body.parts.armL.bleed = 1; });
  await walk('exp.bleeding');
  await exp((e) => { e.body.parts.armL.bleed = 0; e.body.parts.legR.fracture = true; });
  await walk('exp.fracture');
  const thorax = await G(() => window.__GRAVEVOW__.getState().expedition.body.parts.thorax.hp);
  await exp((e) => { e.body.parts.thorax.hp = 1; });
  await walk('exp.vital-wound');
  await G((hp) => { const g = window.__GRAVEVOW__, e = structuredClone(g.getState().expedition); e.body.parts.thorax.hp = hp; e.body.parts.legR.fracture = false; g.setState({ expedition: e }); }, thorax);

  // 3) Pieza rota y mochila llena
  ok(await G(() => Object.values(window.__GRAVEVOW__.getState().expedition.equipment).some(Boolean)), 'lleva alguna pieza puesta');
  await exp((e) => { const k = Object.keys(e.equipment).find((s) => e.equipment[s]); e.equipment[k] = { ...e.equipment[k], dur: 0 }; });
  await walk('exp.armor-broken');
  await G(() => window.__GRAVEVOW__.setState({ invError: 'No te cabe en la mochila.' }));
  await walk('exp.backpack-full');
  await G(() => window.__GRAVEVOW__.setState({ invError: null }));

  // 4) Errantes: salen encima de su ventana
  await G(() => { const g = window.__GRAVEVOW__; g.setState({ rival: { ...g.getState().rival, who: 'osric', risk: 'mid' } }); g.actions.openModal({ type: 'rival' }); });
  await walk('exp.merc-triangle');
  ok(!!(await page.$('[data-testid=risk-badge]')), 'la ventana del errante sigue abierta debajo');
  await G(() => window.__GRAVEVOW__.actions.closeModal());
  await G(() => { const g = window.__GRAVEVOW__; g.setState({ rival: { ...g.getState().rival, who: 'kael', risk: 'kael' } }); g.actions.openModal({ type: 'rival' }); });
  await walk('exp.kael');
  await G(() => window.__GRAVEVOW__.actions.closeModal());

  // 5) Élite y habilidad de clase, en pleno combate
  await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_elite', 'bandit_captain'));
  await page.waitForSelector('[data-testid=combat]');
  await walk('exp.elite');
  for (let k = 0; k < 40 && !(await page.$('[data-testid=act-attack]:not([disabled])')); k++) await page.waitForTimeout(150);
  await walk('combat.class-skill');
  ok(!!(await page.$('[data-testid=act-class]')), 'la habilidad de clase está a la vista');

  // 6) Jefe
  await G(() => window.__GRAVEVOW__.setState({ combat: null }));
  await G(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_boss', 'mordrek'));
  await walk('exp.boss');
  await G(() => window.__GRAVEVOW__.setState({ combat: null }));

  // 7) Subzona nueva (la primera no tiene)
  ok(!(await seen('exp.subzone.afueras')), 'las Afueras no llevan aviso de subzona');
  await exp((e) => { e.subzone = 'castillo'; });
  await walk('exp.subzone.castillo');

  // 8) Nada se repite
  await exp((e) => { e.body.parts.armR.bleed = 1; e.needs = { ...e.needs, hyd: 10 }; });
  await page.waitForTimeout(800);
  ok(!(await mini()), 'lo ya visto no vuelve a salir');

  console.log('errores:', errors.length ? errors : 'ninguno');
  await b.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error('FALLO', e.message); process.exit(1); });
