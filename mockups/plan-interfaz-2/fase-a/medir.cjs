// Fase A: barra superior. Comprueba en 9 tamaños que las 7 pestañas se ven enteras y no se pisan con el oro.
// Uso (vite en 5174): node mockups/plan-interfaz-2/fase-a/medir.cjs [carpeta-salida]
const { chromium } = require('playwright');
const OUT = process.argv[2] || __dirname;
const SIZES=[[1920,1080],[1600,900],[1450,840],[1366,768],[1280,720],[1180,820],[1024,768],[844,390],[667,375]];
(async()=>{const b=await chromium.launch();let fail=0;
for(const [w,h] of SIZES){const touch=w<1200;
const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch});const p=await ctx.newPage();
await p.goto('http://localhost:5174/play/?debug');await p.waitForSelector('[data-testid=btn-play]');await p.click('[data-testid=btn-play]');await p.waitForTimeout(500);
if(await p.$('[data-testid=name-input]')){await p.fill('[data-testid=name-input]','Aldric');const c=await p.$('[data-testid=btn-create]')||await p.$('[data-testid=btn-confirm]');if(c)await c.click();}
await p.waitForSelector('[data-testid=tab-play]');
for(let i=0;i<4;i++){const x=await p.$('[data-testid=btn-class-unlock-later]');if(!x)break;await x.click();await p.waitForTimeout(150);}
await p.click('[data-testid=tab-merchants]');await p.waitForTimeout(400);
const r=await p.evaluate(()=>{const vw=innerWidth;const gold=document.querySelector('[data-testid=lobby-nav] > div:last-child').getBoundingClientRect();
const nav=document.querySelector('.ui-pills').getBoundingClientRect();
const pills=[...document.querySelectorAll('.ui-pills .pill')].map(e=>{const r=e.getBoundingClientRect();return {id:e.dataset.testid,ok:r.left>=nav.left-1&&r.right<=nav.right+1&&r.right<=gold.left+1&&r.right<=vw,w:Math.round(r.width),h:Math.round(r.height)}});
return {tight:document.querySelector('.ui-pills').classList.contains('tight'),bad:pills.filter(x=>!x.ok).map(x=>x.id),small:pills.filter(x=>x.w<44||x.h<40).map(x=>x.id+' '+x.w+'x'+x.h)};});
if(r.bad.length)fail++;console.log(`${w}x${h}`,JSON.stringify(r));
await p.screenshot({path:`${OUT}/barra-${w}x${h}.png`,clip:{x:0,y:0,width:w,height:Math.min(h,90)}});
if(w===1280){await p.setViewportSize({width:1920,height:1080});await p.waitForTimeout(300);const t=await p.evaluate(()=>document.querySelector('.ui-pills').classList.contains('tight'));console.log('  1280→1920 vuelve a nombres:',!t);if(t)fail++;}
await ctx.close();}
await b.close();console.log(fail?'FALLOS: '+fail:'TODO OK');})();
