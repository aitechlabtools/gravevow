// Habilidades: Guerrero nivel 22 con 2 habilidades de clase. Uso: node capturar.cjs [prefijo]  (SOLO=1920x1080; NV=40 para un hito por elegir)
const { chromium } = require('playwright');
const PRE = process.argv[2] || 'despues';
const SIZES=(process.env.SOLO||'1920x1080,1366x768,1180x820,844x390').split(',').map(s=>s.split('x').map(Number));
const NV=+(process.env.NV||22); const CLASE=process.env.CLASE||'';
(async()=>{const b=await chromium.launch();
for(const [w,h] of SIZES){const touch=w<1200;
const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:5174/play/?debug');await p.waitForSelector('[data-testid=btn-play]');await p.click('[data-testid=btn-play]');await p.waitForTimeout(500);
if(await p.$('[data-testid=name-input]')){if(CLASE){const c=await p.$(`[data-testid=class-${CLASE}]`);c&&await c.click();}await p.fill('[data-testid=name-input]','Aldric');const c=await p.$('[data-testid=btn-create]');if(c)await c.click();}
await p.waitForSelector('[data-testid=tab-play]');
for(let i=0;i<4;i++){const x=await p.$('[data-testid=btn-class-unlock-later]');if(!x)break;await x.click();await p.waitForTimeout(150);}
await p.evaluate((a)=>{const [NV,CL]=a;const G=window.__GRAVEVOW__,pr=structuredClone(G.getState().profile);pr.character.level=NV;pr.character.xp=0;
  const all=pr.classSkills.unlocked.slice();G.setState({profile:pr});},[NV,CLASE]);
await p.evaluate(()=>{const G=window.__GRAVEVOW__,s=G.getState(),pr=structuredClone(s.profile);const ids=window.__GRAVEVOW__.classSkillsOf?.(pr)||null;G.setState({profile:pr});});
await p.click('[data-testid=tab-character]');await p.waitForTimeout(500);
// Desbloquea una habilidad en el hito 20 si toca elegir (deja el resto como está)
if(NV<40){await p.click('[data-testid=seg-class]');await p.waitForTimeout(200);const c=await p.$('[data-testid=class-choose] [data-state=choose]');if(c){await c.click();await p.click('[data-testid^=btn-unlock-class-]');await p.waitForTimeout(300);}}
if(true){const s=await p.$('[data-testid=seg-atk]');s&&await s.click();await p.waitForTimeout(200);}
await p.screenshot({path:`${__dirname}/${PRE}-${w}x${h}.png`});
if(true){await p.click('[data-testid=seg-class]');await p.waitForTimeout(200);await p.screenshot({path:`${__dirname}/${PRE}-clase-${w}x${h}.png`});}
const ov=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight+1);
console.log(`${w}x${h}`,ov?'DESBORDA':'ok',errs.join('|'));await ctx.close();}
await b.close();})();
