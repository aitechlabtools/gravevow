// Ajustes por secciones (12/11): engranaje, seis secciones, pie fijo, volúmenes que se guardan en la cuenta,
// sección recordada, Esc, sin desbordes y nada táctil por debajo de 44 px.
// Uso: node scripts/ajustes-check.cjs http://localhost:5173/play/ salida [dispositivo]
const { chromium, devices } = require('playwright');
const [,, url = 'http://localhost:5173/play/', out = 'ajustes', dev] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(dev ? devices[dev] : { viewport: { width: 1920, height: 1080 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tap = (sel) => dev ? p.tap(sel) : p.click(sel);
  const fail = (m) => { console.log('FALLO:', m); process.exitCode = 1; };
  const G = (fn, arg) => p.evaluate(fn, arg);
  const fits = async (what) => {
    const r = await G(() => {
      const panel = document.querySelector('.set-panel').getBoundingClientRect();
      const foot = document.querySelector('.set-foot').getBoundingClientRect();
      const small = [...document.querySelectorAll('.set-panel button, .set-panel a, .set-panel input[type=range]')].filter((e) => { const r = e.getBoundingClientRect(); return r.height && r.height < 43.5; }).map((e) => e.textContent || e.getAttribute('aria-label') || e.tagName);
      const nav = document.querySelector('.set-nav'); const content = document.querySelector('.set-content');
      return { out: panel.bottom > innerHeight + 1 || panel.right > innerWidth + 1, footVisible: foot.bottom <= innerHeight + 1, hx: document.documentElement.scrollWidth - innerWidth, cx: content.scrollWidth - content.clientWidth, navH: nav.scrollHeight - nav.clientHeight, small };
    });
    if (r.out) fail(what + ': el panel se sale de la pantalla');
    if (!r.footVisible) fail(what + ': el pie no se ve');
    if (r.hx > 1 || r.cx > 1) fail(what + ': desborde horizontal ' + r.hx + '/' + r.cx);
    if (r.navH > 1) fail(what + ': la lista de secciones necesita desplazarse');
    if (dev && r.small.length) fail(what + ': menos de 44 px: ' + r.small.join(', '));
  };
  await p.goto(url + '?debug'); await tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric'); await tap('[data-testid=btn-create]'); 
  // Copia recomendada → punto en el engranaje
  await G(() => { const g = window.__GRAVEVOW__; g.setState({ backup: { lastAt: null, days: null, expeditionsSince: 3, remind: true } }); });
  if (!(await p.$('[data-testid=gear-dot]'))) fail('sin punto de aviso en el engranaje');
  const gear = await (await p.$('[data-testid=btn-lobby-settings]')).boundingBox();
  if (gear.width < 43.5 || gear.height < 43.5) fail('engranaje menor de 44 px: ' + gear.width + '×' + gear.height);
  await tap('[data-testid=btn-lobby-settings]'); await p.waitForSelector('[data-testid=settings-section-sound]');
  await fits('Sonido');
  // Sonido (13/11, noche): solo General, Música y Efectos, y la nota de dónde suena la música
  if (await p.$('[data-testid=vol-ambient]') || await p.$('[data-testid=combat-music]') || await p.$('[data-testid=music-toggle]')) fail('quedan opciones de ambiente o de música en combate');
  if (!(await p.$('[data-testid=music-note]'))) fail('falta la nota «La música suena en el Bastión y el menú.»');
  await p.locator('[data-testid=vol-music]').fill('0.3');
  await p.locator('[data-testid=vol-sfx]').fill('0.45');
  const st = await G(() => window.__GRAVEVOW__.getState().profile.settings);
  if (st.musicVolume !== 0.3 || st.sfxVolume !== 0.45) fail('los volúmenes no se guardan: ' + JSON.stringify(st));
  await p.screenshot({ path: out + '-sonido.png' });
  for (const t of ['screen', 'controls', 'community', 'info', 'game']) { await tap(`[data-testid=settings-tab-${t}]`); await p.waitForSelector(`[data-testid=settings-section-${t}]`); await fits(t); }
  if (!(await p.$('[data-testid=settings-open-backup]'))) fail('Partida sin botón de copia');
  await p.waitForTimeout(600); // el guardado de la sección elegida refresca el estado de la copia: se espera antes de forzarlo
  await G(() => window.__GRAVEVOW__.setState({ backup: { lastAt: null, days: null, expeditionsSince: 3, remind: true } })); await p.waitForTimeout(100);
  if (!(await p.$('.set-dot'))) fail('Partida sin punto de aviso');
  await p.screenshot({ path: out + '-partida.png' });
  // Recuerda la sección: cerrar y volver a abrir
  await tap('[data-testid=settings-close]'); await p.waitForTimeout(200);
  await tap('[data-testid=btn-lobby-settings]');
  if (!(await p.$('[data-testid=settings-section-game]'))) fail('no recuerda la última sección');
  if ((await G(() => window.__GRAVEVOW__.getState().profile.settings.settingsTab)) !== 'game') fail('la sección no se guarda en la cuenta');
  // Ir a la copia de seguridad
  await tap('[data-testid=settings-open-backup]'); await p.waitForTimeout(400);
  if ((await G(() => window.__GRAVEVOW__.getState().screen)) !== 'backup') fail('«Abrir copia de seguridad» no lleva a la pantalla');
  if (!dev) {
    await G(() => window.__GRAVEVOW__.actions.goto('lobby')); await p.waitForTimeout(300);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    if (!(await p.$('[data-testid=settings]'))) fail('Esc no abre Ajustes en el Bastión');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    if (await p.$('[data-testid=settings]')) fail('Esc no cierra Ajustes');
  }
  console.log(dev || 'escritorio', 'errores', errs.length ? errs : 'ninguno');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
