// Rótulos del tráiler v6 (landing v4, 30 s): PNG transparentes 1280×720. Sin cifras exactas: como mucho «más de X».
// Los textos y tiempos del montaje están en guion.json (los usa render.py).
const { chromium } = require('playwright');
const low = (big, sub, cls = '') => `<div class="grad"></div><div class="c low"><div class="big2 ${cls}">${big}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
const top = (big, sub, cls = '') => `<div class="gradt"></div><div class="c" style="justify-content:flex-start;padding-top:46px"><div class="big2 ${cls}" style="font-size:48px">${big}</div>${sub ? `<div class="sub" style="margin-top:6px">${sub}</div>` : ''}</div>`;
const cards = {
  oro: '<div class="c"><div class="mid">¿Te atreves a bajar?</div></div>',
  mazmorra: top('LA MAZMORRA', 'el Bastión de Ceniza y sus mazmorras'),
  cripta: top('LA CRIPTA', 'las criptas de Umbravel'),
  infierno: top('EL INFIERNO', 'hasta el Trono de las Cadenas', 'red'),
  combate: low('CADA GOLPE DEJA MARCA', 'combate por turnos · heridas por zonas', 'red'),
  equipo: low('BOTÍN LEGENDARIO', 'cuanto más bajas, mejor', 'gold'),
  intendencia: low('ELIGE QUÉ ARRIESGAS', 'si caes, lo pierdes'),
  aliado: low('¿ALIADO…', 'otros saqueadores también buscan el oro'),
  traidor: low('…O TRAIDOR?', 'y tú también puedes traicionar', 'red'),
  sal: low('SAL CON VIDA', 'y quédatelo todo'),
  final: '<div class="c"><div class="logo" style="font-size:96px">GRAVEVOW</div><div style="display:flex;align-items:center;width:560px;margin-top:14px;filter:drop-shadow(0 0 8px rgba(196,40,59,.6))"><span style="flex:1;height:3px;background:linear-gradient(90deg,transparent,#c4283b)"></span><i style="width:18px;height:18px;margin:0 9px;transform:rotate(45deg);border:3px solid #c4283b;box-shadow:inset 0 0 0 3px #07060a,inset 0 0 0 6px #c4283b"></i><span style="flex:1;height:3px;background:linear-gradient(270deg,transparent,#c4283b)"></span></div><div class="mid gold" style="font-size:40px;margin-top:18px">Juega la alpha gratis</div><div class="sub" style="margin-top:22px;font-size:30px">gravevow.com</div></div>',
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
  await p.goto('file://' + __dirname + '/../cards.html');
  await p.addStyleTag({ content: '.big2{font-family:Cinzel;font-weight:800;font-size:60px;letter-spacing:.12em;text-shadow:0 0 30px rgba(196,40,59,.55),0 4px 0 #000}.grad{position:absolute;left:0;right:0;bottom:0;height:300px;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.78))}.gradt{position:absolute;left:0;right:0;top:0;height:240px;background:linear-gradient(0deg,rgba(0,0,0,0),rgba(0,0,0,.78))}.low{padding-bottom:56px}' });
  await p.evaluate(() => document.fonts.ready);
  for (const [k, html] of Object.entries(cards)) {
    await p.evaluate((h) => { document.getElementById('root').innerHTML = h; }, html);
    await p.waitForTimeout(150);
    await p.screenshot({ path: `${__dirname}/${k}.png`, omitBackground: true });
  }
  await b.close();
})();
