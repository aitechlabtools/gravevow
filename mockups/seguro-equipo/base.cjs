// Pantallas reales de partida para las maquetas del seguro: node mockups/seguro-equipo/base.cjs [url] [tamaño]
const { chromium } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5174/play/';
const SIZES = { escritorio: [1920, 1080, false], tableta: [1180, 820, true], movil: [844, 390, true] };
module.exports.setup = async (b, sz) => {
  const [w, h, touch] = SIZES[sz];
  const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: sz === 'movil' }); const p = await c.newPage();
  const press = (s) => (touch ? p.tap(s) : p.click(s));
  await p.goto(URL + '?debug'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(700);
  await press('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Pau'); await press('[data-testid=btn-create]');
  await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = structuredClone(g.getState().profile); pr.tutorialDone = true; for (const k of Object.keys(pr.tutorialSeen || {})) pr.tutorialSeen[k] = true;
    const it = (itemId, extra = {}) => ({ uid: 'u_' + itemId, itemId, qty: 1, ...extra });
    pr.equipment = { ...pr.equipment, mainHand: it('ash_wand', { rarity: 'rare', affixes: ['vampire'] }), helmet: it('belzar_broken_crown'), boots: it('courtyard_boots'), ring: it('ring_of_embers'), armor: it('chainmail') };
    const bp = pr.backpack.slice(); bp[0] = it('rusty_sword'); bp[1] = it('iron_shield'); pr.backpack = bp;
    g.setState({ tutorial: null, profile: pr }); });
  await p.waitForTimeout(300);
  return { c, p, press, touch };
};
module.exports.SIZES = SIZES; module.exports.URL = URL;
if (require.main === module) (async () => { const b = await chromium.launch();
  for (const sz of Object.keys(SIZES)) { const { c, p, press } = await module.exports.setup(b, sz);
    await press('[data-testid=tab-merchants]'); await p.waitForTimeout(500); await p.screenshot({ path: path.join(__dirname, `base-bastion-${sz}.png`) });
    await press('[data-testid=vendor-brand]'); await p.waitForTimeout(500); await p.screenshot({ path: path.join(__dirname, `base-brand-${sz}.png`) });
    await press('[data-testid=vendor-back]'); await press('[data-testid=tab-stash]'); await p.waitForTimeout(500); await p.screenshot({ path: path.join(__dirname, `base-alijo-${sz}.png`) });
    await c.close(); }
  await b.close(); })();
