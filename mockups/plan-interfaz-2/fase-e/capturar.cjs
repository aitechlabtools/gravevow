// Fase E: captura el mapa de zonas (nivel 30, jefe de la Mazmorra vencido) en 4 tamaños.
// Uso (vite en 5174): node mockups/plan-interfaz-2/fase-e/capturar.cjs carpeta prefijo
const { chromium } = require('playwright');
const OUT = process.argv[2] || __dirname, PRE = process.argv[3] || 'mapa';
(async()=>{const b=await chromium.launch();
for(const [w,h] of [[1920,1080],[1366,768],[1024,768],[844,390],[667,375]]){const touch=w<1200;
const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch});const p=await ctx.newPage();
await p.goto('http://localhost:5174/play/?debug');await p.waitForSelector('[data-testid=btn-play]');await p.click('[data-testid=btn-play]');await p.waitForTimeout(500);
if(await p.$('[data-testid=name-input]')){await p.fill('[data-testid=name-input]','Aldric');const c=await p.$('[data-testid=btn-create]')||await p.$('[data-testid=btn-confirm]');if(c)await c.click();}
await p.waitForSelector('[data-testid=tab-play]');for(let i=0;i<4;i++){const x=await p.$('[data-testid=btn-class-unlock-later]');if(!x)break;await x.click();await p.waitForTimeout(150);}
await p.evaluate(()=>{const G=window.__GRAVEVOW__;G.dev.setLevel(30);const pr=G.getState().profile;G.setState({profile:{...pr,stats:{...pr.stats,expeditions:5}}});});
const bosses=await p.evaluate(()=>window.__GRAVEVOW__.getState().profile.bossesDefeated);
await p.click('[data-testid=tab-play]');await p.waitForTimeout(300);
const m=await p.$('[data-testid=btn-zone-map]');if(!m){console.log(w,'sin botón de mapa');await ctx.close();continue;}
await m.click();await p.waitForTimeout(400);
if(touch)await p.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch'})));
const r=await p.evaluate(()=>{const vw=innerWidth,vh=innerHeight;const cut=[];for(const e of document.querySelectorAll('[data-testid=zone-map] *')){const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)continue;const cs=getComputedStyle(e);if((cs.overflow.includes('hidden')||cs.textOverflow==='ellipsis')&&e.scrollWidth>e.clientWidth+2)cut.push(e.textContent.trim().slice(0,25));}
const close=document.querySelector('[data-testid=btn-zone-map-close]').getBoundingClientRect();return {cut,closeVisible:close.bottom<=vh&&close.top>=0};});
console.log(w+'x'+h,JSON.stringify(r));
await p.screenshot({path:`${OUT}/${PRE}-${w}x${h}.png`});await ctx.close();}await b.close();})();
