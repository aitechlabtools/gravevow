// Misiones: captura con 3 misiones aceptadas (una lista para cobrar). Uso: node capturar.cjs [prefijo]  (SOLO=1920x1080)
const { chromium } = require('playwright');
const PRE = process.argv[2] || 'despues';
const SIZES=(process.env.SOLO||'1920x1080,1366x768,1180x820,844x390').split(',').map(s=>s.split('x').map(Number));
(async()=>{const b=await chromium.launch();
for(const [w,h] of SIZES){const touch=w<1200;
const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:5174/play/?debug');await p.waitForSelector('[data-testid=btn-play]');await p.click('[data-testid=btn-play]');await p.waitForTimeout(500);
if(await p.$('[data-testid=name-input]')){await p.fill('[data-testid=name-input]','Aldric');const c=await p.$('[data-testid=btn-create]');if(c)await c.click();}
await p.waitForSelector('[data-testid=tab-play]');
for(let i=0;i<4;i++){const x=await p.$('[data-testid=btn-class-unlock-later]');if(!x)break;await x.click();await p.waitForTimeout(150);}
await p.click('[data-testid=tab-quests]');await p.waitForTimeout(400);
// acepta hasta 3 encargos del tablón
for(let i=0;i<3;i++){const a=await p.$('[data-testid^=accept-]:not([disabled])');if(!a)break;await a.click();await p.waitForTimeout(200);}
await p.evaluate(()=>{const G=window.__GRAVEVOW__,pr=structuredClone(G.getState().profile);const a=pr.quests.filter(x=>x.accepted&&!x.claimed);if(a.length){a[a.length-1].progress=99;G.setState({profile:pr});}});
await p.waitForTimeout(300);
await p.screenshot({path:`${__dirname}/${PRE}-${w}x${h}.png`});
const ov=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight+1);
console.log(`${w}x${h}`,ov?'DESBORDA':'ok',errs.join('|'));await ctx.close();}
await b.close();})();
