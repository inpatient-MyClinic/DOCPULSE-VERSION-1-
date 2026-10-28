/* Change panel on a second changed master
   (was sd4.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1700,height:1000},deviceScaleFactor:1.2});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  await nav('Data'); await p.waitForTimeout(1200);
  await p.setInputFiles('input[data-file="m"]',SP+'back-new2.xlsx'); await p.waitForTimeout(9000);
  await nav('Master'); await p.waitForTimeout(1500);
  const fw=()=>p.evaluate(()=>{const r=[...document.querySelectorAll('#pg-master tbody tr')].find(x=>/Faeg/.test(x.innerText)); return r? r.innerText.replace(/\s+/g,' ').replace(/AMAFPM|AFPM|PM /g,'').slice(0,90):'-';});
  const prog=()=>p.evaluate(()=>(document.querySelector('.sd-prog')||{}).innerText||'none').then(t=>t.replace(/\s+/g,' '));
  const keys=await p.evaluate(()=>[...document.querySelectorAll('[data-sdkeep]')].map(x=>x.getAttribute('data-sdkeep')));
  const fk=keys.find(k=>/faeg/i.test(k));
  console.log('A start          ',await fw());
  await p.click(`[data-sdkeep="${fk}"]`); await p.waitForTimeout(2500);
  console.log('B keep (mistake) ',await fw(),'|',await prog());
  await p.click(`[data-sdnew="${fk}"]`); await p.waitForTimeout(2500);
  console.log('C switch to new  ',await fw(),'|',await prog());
  await p.click(`[data-sdkeep="${fk}"]`); await p.waitForTimeout(2500);
  await p.click(`[data-sdundo="${fk}"]`); await p.waitForTimeout(2500);
  console.log('D keep then undo ',await fw(),'|',await prog());
  await p.click(`[data-sdkeep="${fk}"]`); await p.waitForTimeout(2500);
  
  console.log('E rest = new; panel open?',await p.evaluate(()=>!!document.querySelector('.sd')),'ready bar:',await p.evaluate(()=>(document.querySelector('.sd-ready')||{}).innerText));
  await p.evaluate(()=>document.querySelector('.body').scrollTop=0);
  await p.screenshot({path:T.out('sd4-a.png'),clip:{x:330,y:100,width:1370,height:900}});
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
