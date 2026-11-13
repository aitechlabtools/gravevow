// Prueba de la fase 6 de los tutoriales: el mini de Ajustes (encima de su ventana), la Guía de Ajustes › Partida (temas,
// releer lo visto, «Aún por descubrir»), el «?» del menú que abre la Guía, desactivar y reiniciar los mini tutoriales y
// repetir el tutorial inicial. Todo lo que se toca mide 44 px.
// Uso: node scripts/e2e-guia.cjs [url] [carpeta] [dispositivo de Playwright]
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || '/tmp/claude-0/guia';
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
  const mini = () => G(() => { const e = document.querySelector('[data-testid=mini-tutorial]'); return e ? e.dataset.mini : null; });
  const waitMini = async (id) => { for (let i = 0; i < 30; i++) { if ((await mini()) === id) return; await page.waitForTimeout(200); } throw new Error(`no sale ${id} (está ${await mini()})`); };
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

  await page.goto(BASE + '?debug&minis');
  await G(() => indexedDB.deleteDatabase('gravevow'));
  await G(() => { try { localStorage.setItem('gravevow.tutorialDone', '1'); } catch {} });
  await page.reload();
  await tap('[data-testid=btn-play]');
  await G(() => document.fullscreenElement && document.exitFullscreen());
  await page.fill('[data-testid=name-input]', 'Guiado');
  if (!(await page.isChecked('[data-testid=skip-tutorial]'))) await tap('[data-testid=skip-tutorial]');
  await tap('[data-testid=btn-create]');
  await waitMini('bienvenida');
  await tap('[data-testid=mini-skip]');

  // 1) El «?» mide 44 px y está junto al engranaje
  ok(await size44('[data-testid=btn-lobby-guide]'), 'el «?» mide 44 px');
  // 2) Primera vez en Ajustes: su mini tutorial, encima de la ventana
  await tap('[data-testid=btn-lobby-settings]');
  await waitMini('screen.settings');
  ok(!!(await page.$('[data-testid=settings]')), 'el mini de Ajustes sale con Ajustes abierto');
  await shot('01-ajustes-mini');
  for (let i = 0; i < 2; i++) { ok(await size44('[data-testid=mini-ok]'), `paso ${i + 1}: el botón mide 44 px`); await tap('[data-testid=mini-ok]'); }
  ok(!(await mini()), 'el mini de Ajustes termina');
  await tap('[data-testid=settings-close]');

  // 3) El «?» abre solo la Guía
  await tap('[data-testid=btn-lobby-guide]');
  await page.waitForSelector('[data-testid=settings-guide]');
  ok(!!(await page.$('[data-testid=settings-section-guide]')) && !(await page.$('[data-testid=settings-nav]')), 'el «?» abre solo la Guía (sin las secciones de Ajustes)');
  ok(!(await mini()), 'el «?» no repite el mini de Ajustes');
  await shot('02-guia');
  ok(await size44('[data-testid=guide-topic-bastion]'), 'los temas miden 44 px');
  await tap('[data-testid=guide-topic-bastion]');
  ok(!(await page.$('[data-testid="guide-item-bienvenida"]:disabled')), 'la bienvenida (saltada) se puede releer');
  await tap('[data-testid="guide-item-bienvenida"]');
  ok(!!(await page.$('[data-testid="guide-text-bienvenida"]')), 'se lee el texto de la bienvenida');
  ok(!!(await page.$('[data-testid="guide-item-tab.refugio"]:disabled')), 'el Refugio sin ver está bloqueado');
  ok((await page.textContent('[data-testid="guide-item-tab.refugio"]')).includes('Aún por descubrir'), 'y dice «Aún por descubrir»');
  ok(await size44('[data-testid="guide-item-tab.refugio"]'), 'las entradas miden 44 px');
  await shot('03-guia-bastion');

  // 4) Desactivar: no sale nada nuevo; volver a activar
  await tap('[data-testid=minis-disabled]');
  ok(await G(() => window.__GRAVEVOW__.getState().tutorials.disabled), 'desactivados');
  await tap('[data-testid=settings-close]');
  await tap('[data-testid=tab-quests]');
  await page.waitForTimeout(600);
  ok(!(await mini()), 'desactivados, Misiones no enseña nada');
  await tap('[data-testid=btn-lobby-guide]');
  await tap('[data-testid=minis-disabled]');
  ok(!(await G(() => window.__GRAVEVOW__.getState().tutorials.disabled)), 'activados otra vez');

  // 5) Reiniciar pide confirmación y lo borra todo
  await tap('[data-testid=minis-reset]');
  ok(await size44('[data-testid=minis-reset-yes]') && await size44('[data-testid=minis-reset-no]'), 'la confirmación mide 44 px');
  await tap('[data-testid=minis-reset-no]');
  ok((await G(() => window.__GRAVEVOW__.getState().tutorials.seen.length)) > 0, '«No» no borra nada');
  await tap('[data-testid=minis-reset]');
  await tap('[data-testid=minis-reset-yes]');
  ok((await G(() => window.__GRAVEVOW__.getState().tutorials.seen.length)) === 0, 'reiniciados');
  await tap('[data-testid=guide-topic-bastion]');
  ok(!!(await page.$('[data-testid="guide-item-bienvenida"]:disabled')), 'tras reiniciar, la bienvenida vuelve a estar por descubrir');
  ok(!!(await page.$('[data-testid=btn-replay-tutorial]')), 'está «Repetir el tutorial inicial»');
  await tap('[data-testid=settings-close]');

  console.log('errores:', errors.length ? errors : 'ninguno');
  await b.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error('FALLO', e.message); process.exit(1); });
