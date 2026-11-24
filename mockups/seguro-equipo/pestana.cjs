// Pestaña «Seguro» (2.ª versión): node mockups/seguro-equipo/pestana.cjs [url]
const { chromium } = require('playwright'); const path = require('path');
const URL = process.argv[2] || 'http://localhost:5174/play/';
const SIZES = { escritorio: [1920, 1080, false], tableta: [1180, 820, true], movil: [844, 390, true] };
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
  for (const [sz, [w, h, touch]] of Object.entries(SIZES)) {
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: sz === 'movil' }); const p = await c.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const press = (s) => (touch ? p.tap(s) : p.click(s)); const wait = (ms = 400) => p.waitForTimeout(ms);
    await p.goto(URL + '?debug'); await p.evaluate(() => indexedDB.deleteDatabase('gravevow')); await p.reload(); await wait(700);
    await press('[data-testid=btn-play]'); await p.fill('[data-testid=name-input]', 'Pau'); await press('[data-testid=btn-create]');
    await p.evaluate(() => { const g = window.__GRAVEVOW__, pr = structuredClone(g.getState().profile); pr.tutorialDone = true; for (const k of Object.keys(pr.tutorialSeen || {})) pr.tutorialSeen[k] = true;
      const it = (itemId, extra = {}) => ({ uid: 'u_' + itemId, itemId, qty: 1, ...extra });
      pr.refuge = { cot: 1, kitchen: 0, bench: 0, infirmary: 0, forge: 1, alchemy: 0, tannery: 0, armory: 1, v: 3 };
      pr.equipment = { ...pr.equipment, mainHand: it('ash_wand', { rarity: 'rare', affixes: ['vampire'] }), offHand: it('iron_shield'), helmet: it('belzar_broken_crown'), boots: it('courtyard_boots', { dur: 20 }), ring: it('ring_of_embers'), armor: it('chainmail', { rarity: 'uncommon' }), gloves: it('leather_bracers') };
      pr.insurePlan = ['helmet', 'armor'];
      pr.reforged = [{ vendor: 'valerius', item: it('iron_shield', { uid: 'rf1' }) }];
      g.setState({ tutorial: null, profile: pr }); });
    await press('[data-testid=tab-merchants]'); await wait(500);
    await press('[data-testid=vendor-valerius]'); await wait(700);
    ok(!!(await p.$('[data-testid=insure-how]')), `${sz}: sale «cómo funciona»`);
    await p.screenshot({ path: path.join(__dirname, `pestana-valerius-${sz}.png`) });
    const small = await p.evaluate(() => [...document.querySelectorAll('[data-testid=insure-tab] *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12 && e.offsetParent).length);
    ok(small === 0, `${sz}: sin textos de menos de 12 px (${small})`);
    const btn = await (await p.$('[data-testid=insure-boots]')).boundingBox(); ok(btn.height >= 44, `${sz}: botón de ${Math.round(btn.height)} px`);
    await press('[data-testid=insure-boots]'); await wait(200);
    ok((await p.evaluate(() => window.__GRAVEVOW__.getState().profile.insurePlan)).includes('boots'), `${sz}: marcar una pieza la guarda para la próxima bajada`);
    // Una función por mercader: Reparar solo en Brand, Seguro solo en Valerius, Desguace solo en Orik
    const tabs = async (v) => { await press('[data-testid=vendor-back]'); await wait(300); await press(`[data-testid=vendor-${v}]`); await wait(500);
      return p.$$eval('[data-testid^=vendor-view-]', (els) => els.map((e) => e.dataset.testid.slice(12))); };
    const brand = await tabs('brand'); await p.screenshot({ path: path.join(__dirname, `despues-brand-${sz}.png`) });
    ok(brand.includes('repair') && !brand.includes('insure'), `${sz}: Brand repara y no asegura (${brand.join(', ')})`);
    const orik = await tabs('orik'); await p.screenshot({ path: path.join(__dirname, `despues-orik-${sz}.png`) });
    ok(orik.includes('scrap') && !orik.includes('repair'), `${sz}: Orik desguaza y no repara (${orik.join(', ')})`);
    const nira = await tabs('nira');
    ok(!nira.includes('repair'), `${sz}: Nira ya no repara (${nira.join(', ')})`);
    const eld = await tabs('eldrin');
    ok(!eld.includes('insure'), `${sz}: Eldrin ya no asegura (${eld.join(', ')})`);
    const val = await tabs('valerius'); await p.screenshot({ path: path.join(__dirname, `despues-valerius-${sz}.png`) });
    ok(val.includes('insure'), `${sz}: Valerius asegura (${val.join(', ')})`);
    ok(!errs.length, `${sz}: sin errores ${errs.join(' | ')}`); await c.close(); }
  await b.close(); })();
