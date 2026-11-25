// Alijo: capturas de la vista Equipo en varios tamaños. Uso: node capturar.cjs [prefijo]
const { chromium } = require('playwright');
const PRE = process.argv[2] || 'despues';
const SIZES=(process.env.SOLO||'1920x1080,1366x768,1180x820,844x390').split(',').map(s=>s.split('x').map(Number));
(async()=>{const b=await chromium.launch();
for(const [w,h] of SIZES){const touch=w<1200;
const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:5174/play/?debug');await p.waitForSelector('[data-testid=btn-play]');await p.click('[data-testid=btn-play]');await p.waitForTimeout(500);
if(await p.$('[data-testid=name-input]')){await p.fill('[data-testid=name-input]','Aldric');const c=await p.$('[data-testid=btn-create]');if(c)await c.click();}
await p.waitForSelector('[data-testid=tab-play]');
await p.evaluate(()=>{const g=window.__GRAVEVOW__;const pr=structuredClone(g.getState().profile);pr.tutorialDone=true;for(const k of Object.keys(pr.tutorialSeen||{}))pr.tutorialSeen[k]=true;g.setState({tutorial:null,profile:pr});
for(const id of ['bandage','ash_wand','chainmail','courtyard_boots'])g.dev.give(id,'common',[],2);});
for(let i=0;i<4;i++){const x=await p.$('[data-testid=btn-class-unlock-later]');if(!x)break;await x.click();await p.waitForTimeout(150);}
await p.click('[data-testid=tab-stash]');await p.waitForTimeout(600);if(process.env.VISTA==='heridas'){await p.click('[data-testid=seg-status]').catch(()=>p.click('text=Heridas'));await p.waitForTimeout(500);}
await p.screenshot({path:`${__dirname}/${PRE}-${w}x${h}.png`});
const ov=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight);
console.log(`${w}x${h}`,ov?'DESBORDA':'ok',errs.join('|'));await ctx.close();}
await b.close();})();
