/* versions-by-date scenario: Pedia versions saved, notes confirmed, OT rule set */
/* Versions-by-date scenario set-up for numbers-versions
   (was setupv.js) */
const T=require('../lib/ctx');

const {chromium}=require('playwright-core');
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext()).newPage(); p.on('dialog',d=>d.accept());
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  await p.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf('Master')>=0).click(); }); await p.waitForTimeout(2500);
  const sv=await p.$('#pdSaveV'); if(sv){ await sv.click();
    /* wait for all six versions to be saved, however busy the machine is */
    for(let i=0;i<120;i++){ await p.waitForTimeout(500); const t=await p.evaluate(()=>(document.querySelector('.pd-card')||{}).innerText||''); if(i>4&&!/Saving/.test(t)) break; }
    await p.waitForTimeout(1000); }
  await p.click('#ntAll').catch(()=>{}); await p.waitForTimeout(3000);
  await p.evaluate(async()=>{ await fetch('/api/settings',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings:{schedSrc:'versions'}})}); });
  await p.waitForTimeout(2000); await b.close(); console.log('scenario ready');
})().catch(e=>{console.error(e.message);process.exit(1);});
