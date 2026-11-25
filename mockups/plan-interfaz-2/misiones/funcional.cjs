const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1366,height:768}})).newPage();
await p.goto('http://localhost:5174/play/?debug');await p.click('[data-testid=btn-play]');await p.waitForTimeout(500);
await p.fill('[data-testid=name-input]','Aldric');await p.click('[data-testid=btn-create]');await p.waitForSelector('[data-testid=tab-play]');
for(let i=0;i<4;i++){const x=await p.$('[data-testid=btn-class-unlock-later]');if(!x)break;await x.click();await p.waitForTimeout(150);}
await p.click('[data-testid=tab-quests]');await p.waitForTimeout(300);
for(let i=0;i<2;i++){await p.click('[data-testid^=accept-]:not([disabled])');await p.waitForTimeout(200);}
const n=()=>p.textContent('[data-testid=quests-count]');console.log('aceptadas',await n());
await p.evaluate(()=>{const G=window.__GRAVEVOW__,pr=structuredClone(G.getState().profile);const a=pr.quests.filter(x=>x.accepted&&!x.claimed);a[0].progress=99;G.setState({profile:pr});});
await p.waitForTimeout(200);const g0=await p.evaluate(()=>window.__GRAVEVOW__.getState().profile.gold);
await p.click('[data-testid^=claim-]');await p.waitForTimeout(300);
console.log('tras cobrar',await n(),'oro',g0,'→',await p.evaluate(()=>window.__GRAVEVOW__.getState().profile.gold));
await p.click('[data-testid^=abandon-]');await p.click('[data-testid^=abandon-yes-]');await p.waitForTimeout(200);console.log('tras abandonar',await n());
await p.click('[data-testid^=accept-]:not([disabled])');await p.waitForTimeout(200);await p.click('[data-testid^=visit-]');await p.waitForTimeout(400);
console.log('visitar → abre el mercader:', await p.evaluate(()=>!!document.querySelector('[data-testid=screen-quests]')?'sigue en misiones':document.querySelector('[data-testid^=vendor-view-]')?.parentElement?.innerText.slice(0,80)));await b.close();})();
