const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();
await p.goto('http://localhost:5174/play/?debug');await p.click('[data-testid=btn-play]');await p.waitForTimeout(500);
if(await p.$('[data-testid=name-input]')){await p.fill('[data-testid=name-input]','Aldric');await p.click('[data-testid=btn-create]');}
await p.waitForSelector('[data-testid=tab-play]');
await p.evaluate(()=>{const g=window.__GRAVEVOW__;const pr=structuredClone(g.getState().profile);pr.tutorialDone=true;for(const k of Object.keys(pr.tutorialSeen||{}))pr.tutorialSeen[k]=true;g.setState({tutorial:null,profile:pr});g.dev.give('chainmail','common',[],1);});
for(let i=0;i<4;i++){const x=await p.$('[data-testid=btn-class-unlock-later]');if(!x)break;await x.click();await p.waitForTimeout(150);}
await p.click('[data-testid=tab-stash]');await p.waitForTimeout(600);
const s=await p.$$('[data-testid^=slot-backpack-]');console.log(s.length);
for(const el of s){await el.click();await p.waitForTimeout(150);if(await p.$('[data-preview]'))break;}
console.log(await p.$$eval('[data-preview]',e=>e.map(x=>x.dataset.stat+x.dataset.preview)));
await p.screenshot({path:'/tmp/gv/mockups/plan-interfaz-2/alijo/v4-comparar-1920x1080.png'});await b.close();})();
