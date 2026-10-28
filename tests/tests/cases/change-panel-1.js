/* Change panel: reading changed doctors (Faeg/Ahmed misreads)
   (was sd1.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const fs=require('fs');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1700,height:1000},deviceScaleFactor:1.2});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  
  // upload the new master through the API, then reload
  const nav0=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  await nav0('Data'); await p.waitForTimeout(1200);
  await p.setInputFiles('input[data-file="m"]',SP+'back-new.xlsx'); await p.waitForTimeout(9000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  await nav('Master'); await p.waitForTimeout(1500);
  await p.screenshot({path:T.out('sd-0.png')}); console.log('top',await p.evaluate(()=>(document.querySelector('.sd-top')||{}).innerText));
  console.log('cards',await p.evaluate(()=>[...document.querySelectorAll('.sd-doc')].map(x=>x.innerText.replace(/\s+/g,' ')).join('\n')));
  await p.evaluate(()=>{ document.querySelector('.body').scrollTop=0; });
  await p.screenshot({path:T.out('sd-1.png'),clip:{x:330,y:100,width:1370,height:900}});
  // keep Faeg, use new for Eyad
  const keys=await p.evaluate(()=>[...document.querySelectorAll('[data-sdkeep]')].map(x=>x.getAttribute('data-sdkeep')));
  const fk=keys.find(k=>/faeg/i.test(k)), ek=keys.find(k=>/eyad/i.test(k));
  const fw=()=>p.evaluate(()=>{const r=[...document.querySelectorAll('#pg-master tbody tr')].find(x=>/Faeg/.test(x.innerText)&&!x.closest('.sd')); return r? r.innerText.replace(/\s+/g,' ').slice(0,260):'-';}); const faegBefore=await fw();
  await p.click(`[data-sdkeep="${fk}"]`); await p.waitForTimeout(2500);
  const faegAfter=await fw();
  console.log('Faeg week before keep',faegBefore,'after keep',faegAfter);
  console.log('progress',await p.evaluate(()=>document.querySelector('.sd-prog').innerText));
  await p.click('[data-sdf="flag"]').catch(e=>console.log('no flag filter')); await p.waitForTimeout(600);
  await p.click('[data-sdf="all"]'); await p.waitForTimeout(600);
  await p.click(`[data-sdnew="${ek}"]`); await p.waitForTimeout(800);
  console.log('panel still there',await p.evaluate(()=>!!document.querySelector('.sd')), 'progress',await p.evaluate(()=>(document.querySelector('.sd-prog')||{}).innerText));
  if(await p.evaluate(()=>!!document.querySelector('#sdAccept'))){ await p.click('#sdAccept'); await p.waitForTimeout(3000); }
  console.log('after use new for rest: panel',await p.evaluate(()=>!!document.querySelector('.sd')),'Faeg still kept',await fw());
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
