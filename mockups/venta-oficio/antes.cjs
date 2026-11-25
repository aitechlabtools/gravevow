// Capturas «antes» de la venta: node mockups/venta-oficio/antes.cjs [url]
const { chromium } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5174/play/';
const SIZES = { escritorio: [1920, 1080, false], tableta: [1180, 820, true], movil: [844, 390, true] };
const LOOT = ['rusty_sword','iron_shield','chainmail','leather_hood','health_potion','bandage','jerky','salted_meat','copper_ring','bone_amulet','iron_ore','old_wood','tanned_leather','arcane_shard','golden_chalice','nail_bomb','crypt_key','bitter_herb','murky_orb','pitch_torch'];
module.exports.setup = async (b, sz) => {
  const [w, h, touch] = SIZES[sz];
  const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: sz === 'movil' }); const p = await c.newPage();
  const press = (s) => (touch ? p.tap(s) : p.click(s));
  await p.goto(URL + '?debug'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await p.waitForTimeout(700);
  await press('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Pau'); await press('[data-testid=btn-create]');
  await p.evaluate((LOOT) => { const g = window.__GRAVEVOW__, pr = structuredClone(g.getState().profile); pr.tutorialDone = true; for (const k of Object.keys(pr.tutorialSeen || {})) pr.tutorialSeen[k] = true;
    const bp = pr.backpack.slice(); LOOT.forEach((id, i) => { bp[i] = { uid: 'l' + i, itemId: id, qty: 1 }; }); pr.backpack = bp;
    pr.refuge = { ...pr.refuge, forge: 1, armory: 1, tannery: 1, kitchen: 1 };
    g.setState({ tutorial: null, profile: pr }); }, LOOT);
  await p.waitForTimeout(300);
  return { c, p, press, touch };
};
module.exports.SIZES = SIZES;
if (require.main === module) (async () => { const b = await chromium.launch();
  for (const sz of Object.keys(SIZES)) { const { c, p, press } = await module.exports.setup(b, sz);
    await press('[data-testid=tab-merchants]'); await p.waitForTimeout(500);
    for (const v of ['nira','vesper','garth','orik','grizk','brand','valerius','eldrin']) {
      await press(`[data-testid=vendor-${v}]`); await p.waitForTimeout(500);
      if (await p.$('[data-testid=vendor-view-sell]')) { await press('[data-testid=vendor-view-sell]'); await p.waitForTimeout(400); }
      await p.screenshot({ path: path.join(__dirname, `antes-${v}-${sz}.png`) });
      await press('[data-testid=vendor-back]'); await p.waitForTimeout(300); }
    await c.close(); }
  await b.close(); })();
