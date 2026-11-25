// Apartado Estado: capturas reales (sano y herido) y Alijo sin selector. Uso: node capturar.cjs
const { chromium } = require('playwright');
const SIZES=(process.env.SOLO||'1920x1080,1180x820,844x390').split(',').map(s=>s.split('x').map(Number));
(async()=>{const b=await chromium.launch();
for(const [w,h] of SIZES){const touch=w<1200;
const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:5174/play/?debug');await p.click('[data-testid=btn-play]');await p.waitForTimeout(500);
if(await p.$('[data-testid=name-input]')){await p.fill('[data-testid=name-input]','Aldric');await p.click('[data-testid=btn-create]');}
await p.waitForSelector('[data-testid=tab-play]');
await p.evaluate(()=>{const g=window.__GRAVEVOW__;const pr=structuredClone(g.getState().profile);pr.tutorialDone=true;for(const k of Object.keys(pr.tutorialSeen||{}))pr.tutorialSeen[k]=true;g.setState({tutorial:null,profile:pr});g.dev.give('bandage','common',[],3);});
for(let i=0;i<4;i++){const x=await p.$('[data-testid=btn-class-unlock-later]');if(!x)break;await x.click();await p.waitForTimeout(150);}
const shot=async(n)=>{await p.waitForTimeout(400);const t=await p.$('[data-testid=tutorial-skip],[data-testid=btn-tut-skip]');if(t)await t.click().catch(()=>{});await p.screenshot({path:`${__dirname}/${n}-${w}x${h}.png`});};
await p.click('[data-testid=tab-stash]');await shot('alijo');
await p.click('[data-testid=tab-estado]');await shot('estado-sano');
await p.evaluate(()=>{const g=window.__GRAVEVOW__;const pr=structuredClone(g.getState().profile);pr.wounds={pct:{armL:0.4,legR:0.55,thorax:0.8},fractures:['legR']};g.setState({profile:pr});});
await p.click('[data-testid=tab-play]');await p.click('[data-testid=tab-estado]');await shot('estado-herido');
console.log(`${w}x${h}`,errs.join('|')||'ok', await p.$eval('[data-testid=tab-estado]',e=>e.getAttribute('aria-label')));await ctx.close();}
await b.close();})();
