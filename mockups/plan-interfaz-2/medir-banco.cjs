const { chromium } = require('playwright');
const SIZES=[[1920,1080],[1450,840],[1366,768],[1280,720],[1180,820],[1024,768],[844,390],[667,375]];
(async()=>{const b=await chromium.launch();
for(const [w,h] of SIZES){const touch=w<1200;
const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch});
const p=await ctx.newPage();
await p.goto('http://localhost:5174/play/?debug');await p.waitForSelector('[data-testid=btn-play]');await p.click('[data-testid=btn-play]');
await p.waitForTimeout(500);
if(await p.$('[data-testid=name-input]')){await p.fill('[data-testid=name-input]','Aldric');const c=await p.$('[data-testid=btn-create]')||await p.$('[data-testid=btn-confirm]');if(c)await c.click();}
await p.waitForSelector('[data-testid=tab-play]',{timeout:15000});
for(let i=0;i<4;i++){const x=await p.$('[data-testid=btn-class-unlock-later]');if(!x)break;await x.click();await p.waitForTimeout(150);}
await p.evaluate(()=>{const G=window.__GRAVEVOW__;const s=G.getState();const pr=s.profile;G.setState({profile:{...pr,refuge:{...(pr.refuge||{}),cot:1,kitchen:1,bench:1,forge:1,armory:1,infirmary:1,tannery:1,alchemy:1}}});});
await p.click('[data-testid=tab-merchants]');await p.click('[data-testid=vendor-orik]');await p.click('[data-testid=vendor-view-station]');await p.waitForTimeout(500);
const r=await p.evaluate(()=>{const vw=innerWidth;const wide=document.documentElement.scrollWidth>vw+1;const cut=[];for(const e of document.querySelectorAll('body *')){const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)continue;const cs=getComputedStyle(e);const r=e.getBoundingClientRect();if(r.width&&(cs.overflow.includes('hidden')||cs.textOverflow==='ellipsis')&&e.scrollWidth>e.clientWidth+2)cut.push(e.textContent.trim().slice(0,30));if(r.right>vw+1&&r.width)cut.push('FUERA:'+e.textContent.trim().slice(0,20));}
const panel=document.querySelector('[data-testid=station-panel]')?.getBoundingClientRect();return {wide,cut:cut.slice(0,6),panelW:panel&&Math.round(panel.width)};});
console.log(w+'x'+h,JSON.stringify(r));
await p.screenshot({path:`/tmp/audit/banco-${w}x${h}.png`});await ctx.close();}
await b.close();})();
