// Capturas de la maqueta de creación de personaje: node mockups/creacion-personaje/capturar.cjs [url]
const { chromium } = require('playwright'); const path = require('path');
const base = (process.argv[2] || 'http://localhost:5173') + '/mockups/creacion-personaje/proto.html';
const SIZES = [['escritorio-1920x1080', 1920, 1080], ['tableta-1180x820', 1180, 820], ['movil-844x390', 844, 390]];
const SHOTS = [
  ['1-clase', 'cls=warrior&tab=clase'],
  ['2-aspecto-frente', 'cls=warrior&tab=aspecto&hair=1&style=0&beard=1&name=Aldric'],
  ['3-aspecto-espalda', 'cls=warrior&tab=aspecto&view=back&hair=1&style=2&beard=1&name=Aldric'],
  ['4-mago', 'cls=mage&tab=aspecto&cloak=3&skin=1&hair=5&style=1&beard=2&name=Ithwen'],
  ['4b-guerrera', 'cls=warrior&tab=aspecto&sex=1&hair=4&style=1&beard=0&cloak=1&skin=1&name=Selwen'],
  ['4c-guerrera-espalda', 'cls=warrior&tab=aspecto&sex=1&view=back&hair=4&style=2&cloak=1&skin=1&name=Selwen'],
  ['4d-maga', 'cls=mage&tab=aspecto&sex=1&hair=0&style=1&cloak=2&skin=2&name=Ithra'],
  ['5-yelmo-frente', 'cls=warrior&tab=aspecto&helmet=1&hair=4&style=1&beard=2&cloak=1&name=Torvor'],
  ['7-yelmo-guerrera', 'cls=warrior&tab=aspecto&helmet=1&sex=1&hair=3&style=1&cloak=0&name=Morwen'],
  ['6-yelmo-espalda', 'cls=warrior&tab=aspecto&helmet=1&view=back&hair=4&style=1&beard=2&cloak=1&name=Torvor'],
];
(async () => {
  const b = await chromium.launch();
  const only = process.argv[3];
  for (const [dev, w, h] of SIZES) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: dev.startsWith('movil') || dev.startsWith('tableta') });
    for (const [n, qs] of SHOTS) {
      if (only && !n.startsWith(only)) continue;
      await p.goto(`${base}?${qs}`); await p.waitForTimeout(500);
      const sc = await p.evaluate(() => [...document.querySelectorAll('.overflow-y-auto')].map((e) => e.scrollHeight - e.clientHeight));
      console.log(dev, n, 'desborde paneles', sc.join(','));
      await p.screenshot({ path: path.join(__dirname, 'capturas', `${dev}-${n}.png`) });
    }
    await p.close();
  }
  await b.close();
})();
