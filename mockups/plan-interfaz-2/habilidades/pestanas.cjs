// Habilidades: elegir en el hito 20, equipar desde el detalle y marcar atributos. node pestanas.cjs
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();
await p.goto('http://localhost:5174/play/?debug');await p.click('[data-testid=btn-play]');await p.waitForTimeout(500);
await p.fill('[data-testid=name-input]','Aldric');await p.click('[data-testid=btn-create]');await p.waitForSelector('[data-testid=tab-play]');
for(let i=0;i<4;i++){const x=await p.$('[data-testid=btn-class-unlock-later]');if(!x)break;await x.click();await p.waitForTimeout(150);}
await p.evaluate(()=>{const G=window.__GRAVEVOW__,pr=structuredClone(G.getState().profile);pr.character.level=22;G.setState({profile:pr});});
await p.click('[data-testid=tab-character]');await p.waitForTimeout(400);
await p.click('[data-testid=class-choose] [data-state=choose]');await p.click('[data-testid^=btn-unlock-class-]');await p.waitForTimeout(300);
console.log('desbloqueadas:',await p.$$eval('[data-testid=class-path] [data-state=owned],[data-testid=class-path] [data-state=equipped]',e=>e.length));
await p.click('[data-testid=class-path] [data-state=owned]');await p.waitForTimeout(200);
const eq=await p.$('[data-testid^=equip-class-]');const id=(await eq.getAttribute('data-testid')).slice(12);await eq.click();await p.waitForTimeout(200);
console.log('equipada ahora:',id===await p.evaluate(()=>window.__GRAVEVOW__.getState().profile.classSkills.equipped));
console.log('atributos marcados:',await p.$$eval('[data-testid=skill-stats] .hb-stat.up,[data-testid=skill-stats] .hb-stat.down',e=>e.length));
await b.close();})();
