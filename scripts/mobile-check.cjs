// Prueba en móvil (emulado, horizontal, táctil): pantallas, joystick, botón de acción y combate.
// Uso: node scripts/mobile-check.cjs http://localhost:5173/play/ carpeta_capturas
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:5173/play/';
const OUT = process.argv[3] || 'mobile-shots';
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices[process.argv[4] || 'iPhone 13 landscape'] });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  const cdp = await ctx.newCDPSession(p);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
  const vp = p.viewportSize();
  console.log('pantalla', vp);

  await p.goto(BASE + '?debug');
  await p.evaluate(() => indexedDB.deleteDatabase('gravevow'));
  await p.reload();
  await shot('1-titulo');
  await p.tap('[data-testid=btn-play]');
  await p.fill('[data-testid=name-input]', 'Aldric');
  await shot('2-crear');
  await p.tap('[data-testid=btn-create]');
  
  await shot('3-lobby');
  await p.evaluate(() => { const s = window.__GRAVEVOW__.getState(); s.profile.tutorialSeen.dungeon = true; });
  await p.tap('[data-testid=tab-play]');
  await p.tap('[data-testid=btn-enter-dungeon]');
  await p.waitForTimeout(1500);
  await p.evaluate(() => { for (const e of window.__GRAVEVOW__.scene().enemies) { e.dead = true; e.sprite.destroy(); e.shadow.destroy(); e.marker?.destroy(); } });
  await shot('4-mazmorra');
  // Joystick: apoyar el pulgar y arrastrar a la derecha
  const pos0 = await p.evaluate(() => { const pl = window.__GRAVEVOW__.scene().player; return [pl.x, pl.y]; });
  const x0 = 110, y0 = vp.height - 90;
  await touch('touchStart', x0, y0);
  for (let i = 1; i <= 6; i++) { await touch('touchMove', x0 + i * 9, y0); await p.waitForTimeout(30); }
  await p.waitForTimeout(250);
  await shot('5-joystick');
  await p.waitForTimeout(900);
  await touch('touchEnd');
  const pos1 = await p.evaluate(() => { const pl = window.__GRAVEVOW__.scene().player; return [pl.x, pl.y]; });
  console.log('joystick mueve:', pos0.map((v) => v.toFixed(2)), '→', pos1.map((v) => v.toFixed(2)), Math.hypot(pos1[0] - pos0[0], pos1[1] - pos0[1]) > 0.5 ? 'OK' : 'NO SE MUEVE');
  // Botón de acción junto a Kael
  const r = await p.evaluate(() => { const r = window.__GRAVEVOW__.scene().rival; return [r.x, r.y]; });
  await p.evaluate(([x, y]) => window.__GRAVEVOW__.scene().debugTeleport(x, y), [Math.floor(r[0]) + 1, Math.floor(r[1])]);
  await p.waitForTimeout(700);
  await shot('6-accion');
  const ready = await p.$('[data-testid=touch-action]:not([disabled])');
  console.log('botón de acción listo:', !!ready);
  if (ready) { await ready.tap(); await p.waitForTimeout(500); await shot('7-kael'); }
  await p.evaluate(() => window.__GRAVEVOW__.actions.closeModal());
  // Combate: un toque ejecuta (mantener pulsado para la ficha se prueba en touch-check.cjs)
  await p.evaluate(() => window.__GRAVEVOW__.actions.startCombat('pve', 'e_bat_m', 'bat'));
  for (let k = 0; k < 40 && !(await p.$('[data-testid=act-attack]:not([disabled])')); k++) await p.waitForTimeout(150);
  await p.waitForTimeout(300);
  await shot('8-combate');
  await p.tap('[data-testid=act-special]'); await p.waitForTimeout(200);
  const sk = await p.$('[data-testid^=skill-]:not([disabled])');
  await shot('9-habilidades');
  const log0 = await p.evaluate(() => window.__GRAVEVOW__.getState().combat?.state.log.length);
  if (sk) await sk.tap();
  await p.waitForTimeout(600);
  const log1 = await p.evaluate(() => window.__GRAVEVOW__.getState().combat?.state.log.length);
  console.log('un toque ejecuta:', log1 > log0 ? 'OK' : 'NO');
  // Inventario en la mazmorra
  await p.evaluate(() => { const s = window.__GRAVEVOW__.getState(); const c = s.combat?.state.combatants.find((x) => x.id === 'e_bat_m'); if (c) c.hp = 1; });
  for (let i = 0; i < 20; i++) { const o = await p.evaluate(() => { const s = window.__GRAVEVOW__.getState(); return !s.combat || !!s.combat.state.outcome; }); if (o) break; const a = await p.$('[data-testid=act-attack]:not([disabled])'); if (a) await a.tap(); await p.waitForTimeout(400); }
  const cont = await p.$('[data-testid=btn-combat-continue]'); if (cont) await cont.tap();
  await p.waitForTimeout(300);
  // Oro físico: tras ganar se abre el saco del botín; se cierra para seguir
  if (await p.$('[data-testid=btn-close-loot]')) { await p.tap('[data-testid=btn-close-loot]'); await p.waitForTimeout(200); }
  await p.tap('[data-testid=btn-inventory]');
  await p.waitForTimeout(300);
  await shot('10-inventario');
  // Vertical: aviso de girar. «Jugar» en táctil puso pantalla completa: se quita para poder cambiar el tamaño.
  await p.evaluate(() => document.fullscreenElement && document.exitFullscreen());
  await p.waitForTimeout(300);
  await p.setViewportSize({ width: vp.height, height: vp.width });
  await p.waitForTimeout(300);
  await shot('11-vertical');
  console.log('aviso de girar:', !!(await p.$('[data-testid=rotate-notice]')));
  console.log('errores:', errors.length ? errors : 'ninguno');
  await b.close();
})().catch((e) => { console.error('FALLO', e); process.exit(1); });
