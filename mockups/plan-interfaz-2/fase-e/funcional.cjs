// Fase E: en móvil, tocar un estrato del mapa no elige expedición; tocar una subzona abierta sí (y cierra el mapa); las cerradas no se pueden tocar.
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();let fail=0;
for(const [w,h,touch] of [[844,390,true],[1366,768,false]]){
const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch});const p=await ctx.newPage();
await p.goto('http://localhost:5174/play/?debug');await p.waitForSelector('[data-testid=btn-play]');await p.click('[data-testid=btn-play]');await p.waitForTimeout(500);
if(await p.$('[data-testid=name-input]')){await p.fill('[data-testid=name-input]','Aldric');const c=await p.$('[data-testid=btn-create]')||await p.$('[data-testid=btn-confirm]');if(c)await c.click();}
await p.waitForSelector('[data-testid=tab-play]');for(let i=0;i<4;i++){const x=await p.$('[data-testid=btn-class-unlock-later]');if(!x)break;await x.click();await p.waitForTimeout(150);}
await p.evaluate(()=>{const G=window.__GRAVEVOW__;G.dev.setLevel(30);const pr=G.getState().profile;G.setState({profile:{...pr,stats:{...pr.stats,expeditions:5}}});});
await p.click('[data-testid=tab-play]');await p.waitForTimeout(200);
const zone=()=>p.$eval('[data-testid=zone-name]',e=>e.textContent);
const z0=await zone();await p.click('[data-testid=btn-zone-map]');
if(touch){await p.click('[data-testid=zone-tab-cripta]');await p.waitForTimeout(150);if(!(await p.$('[data-testid=zone-map]')))fail++,console.log('FALLO: el estrato cerró el mapa');
 const lockedDisabled=await p.$eval('[data-testid=zone-cripta] [data-testid^=sub-]',e=>e.disabled);if(!lockedDisabled)fail++,console.log('FALLO: subzona cerrada clicable');
 await p.click('[data-testid=zone-tab-mazmorra]');}
if(await zone()!==z0)fail++,console.log('FALLO: cambió la expedición sin elegir');
const subs=await p.$$('[data-testid=zone-mazmorra] [data-testid^=sub-]:not([disabled])');await subs[2].click();await p.waitForTimeout(200);
const z1=await zone();if(await p.$('[data-testid=zone-map]'))fail++,console.log('FALLO: no se cerró');
console.log(w+'x'+h,'antes:',z0,'· después de elegir la 3:',z1);if(z1===z0)fail++;
if(!touch){await p.click('[data-testid=btn-zone-map]');const ids=await p.$$eval('[data-testid^=map-node-]',es=>es.map(e=>e.dataset.testid));
 await p.click(`[data-testid=${ids[5]}]`);await p.waitForTimeout(150);if(!(await p.$('[data-testid=zone-map]')))fail++,console.log('FALLO: un marcador cerrado cerró el mapa');
 if(await zone()!==z1)fail++,console.log('FALLO: un marcador cerrado cambió la expedición');
 await p.click(`[data-testid=${ids[1]}]`);await p.waitForTimeout(200);const z2=await zone();console.log('  marcador 2 →',z2);if(z2===z1||await p.$('[data-testid=zone-map]'))fail++,console.log('FALLO: el marcador abierto no eligió');}
await ctx.close();}await b.close();console.log(fail?'FALLOS '+fail:'TODO OK');})();
