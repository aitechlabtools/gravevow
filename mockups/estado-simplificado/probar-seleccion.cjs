// Inventario de la mazmorra: tras usar o equipar lo elegido, ninguna casilla queda marcada.
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:5173/play/';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.addInitScript(() => localStorage.setItem('gv-consent', 'denied')); const p = await ctx.newPage();
  const ok = (c, m) => console.log(c ? 'OK ' : 'FALLA', m);
  await p.goto(URL + '?debug'); await p.click('[data-testid=btn-play]'); await p.waitForTimeout(800);
  await p.fill('[data-testid=name-input]', 'Beothord'); await p.click('[data-testid=btn-create]'); await p.waitForTimeout(500);
  await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = g.getState().profile; pr.tutorialSeen.dungeon = true; pr.tutorialSeen.lobby = true; });
  await p.click('[data-testid=tab-play]'); await p.click('[data-testid=btn-enter-dungeon]'); await p.waitForTimeout(1500);
  await p.keyboard.press('i'); await p.waitForTimeout(400);
  const n = () => p.$$eval('[data-testid=dungeon-inventory] .slot.selected', (x) => x.length);
  const first = await p.$('[data-testid=dungeon-inventory] [data-testid=equipment] ~ * .slot, [data-testid=dungeon-inventory] .slot');
  // elegir el primer objeto de la mochila
  const idx = await p.evaluate(() => window.__GRAVEVOW__.getState().expedition.backpack.findIndex(Boolean));
  const slots = await p.$$('[data-testid=dungeon-inventory] .slot:not(.slot-big)');
  await p.evaluate((i) => { const s = window.__GRAVEVOW__.getState().expedition.backpack[i]; window.__sel = s.uid; }, idx);
  // pulsar en la casilla con ese objeto: la de la mochila es la que tiene el mismo icono; usamos el orden del DOM tras el equipo (8 ranuras)
  await slots[8 + idx].click(); await p.waitForTimeout(200);
  ok((await n()) === 1, 'elegido: una casilla marcada');
  await p.evaluate((i) => { const g = window.__GRAVEVOW__; g.setState({ expedition: { ...g.getState().expedition, backpack: g.getState().expedition.backpack.map((x, j) => (j === i ? null : x)) } }); }, idx);
  await p.waitForTimeout(200);
  ok((await n()) === 0, 'usado o movido: nada marcado');
  await b.close();
})();
