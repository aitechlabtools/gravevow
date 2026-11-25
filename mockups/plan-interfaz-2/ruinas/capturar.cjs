// Estaciones en ruinas: captura la pestaña de estación de cada mercader con todo sin reconstruir. Uso: node capturar.cjs [prefijo]  (SOLO=1920x1080, MERC=garth)
const { chromium } = require('playwright');
const PRE = process.argv[2] || 'despues';
const SIZES=(process.env.SOLO||'1920x1080,1366x768,1180x820,844x390').split(',').map(s=>s.split('x').map(Number));
const MERC=(process.env.MERC||'garth').split(',');
(async()=>{const b=await chromium.launch();
for(const [w,h] of SIZES){const touch=w<1200;
const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:5174/play/?debug');await p.waitForSelector('[data-testid=btn-play]');await p.click('[data-testid=btn-play]');await p.waitForTimeout(500);
if(await p.$('[data-testid=name-input]')){await p.fill('[data-testid=name-input]','Aldric');const c=await p.$('[data-testid=btn-create]');if(c)await c.click();}
await p.waitForSelector('[data-testid=tab-play]');
for(let i=0;i<4;i++){const x=await p.$('[data-testid=btn-class-unlock-later]');if(!x)break;await x.click();await p.waitForTimeout(150);}
await p.evaluate(()=>{const G=window.__GRAVEVOW__;const pr=G.getState().profile;G.setState({profile:{...pr,gold:60,refuge:{...(pr.refuge||{}),cot:1,kitchen:0,bench:0,forge:0,armory:0,infirmary:0,tannery:0,alchemy:0}}});});
await p.click('[data-testid=tab-merchants]');
for(const v of MERC){await p.click(`[data-testid=vendor-${v}]`);await p.waitForTimeout(250);
const t=await p.$('[data-testid=vendor-view-station]');if(t){await t.click();await p.waitForTimeout(400);}
await p.screenshot({path:`${__dirname}/${PRE}-${v}-${w}x${h}.png`});
const ov=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
console.log(`${w}x${h} ${v}`,ov?'DESBORDA':'ok',t?'':'(sin pestaña estación)',errs.join('|'));
await p.click('[data-testid=vendor-back]').catch(()=>{});await p.waitForTimeout(150);}
await ctx.close();}
await b.close();})();
