/* Change panel: upload a changed master, keep / use new
   (was sd2.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1700,height:1000},deviceScaleFactor:1});
  const p=await ctx.newPage(); p.on('dialog',d=>{console.log('DIALOG',d.message());d.accept()}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  await nav('Data'); await p.waitForTimeout(1200);
  await p.setInputFiles('input[data-file="m"]',SP+'back-new.xlsx');
  for(let i=0;i<12;i++){ await p.waitForTimeout(800); const t=await p.evaluate(()=>document.getElementById('toast').textContent); if(t) console.log('toast',i,t); }
  console.log('files',await p.evaluate(async()=>JSON.stringify((await (await fetch('/api/files',{credentials:'same-origin'})).json()).master)));
  await nav('Master'); await p.waitForTimeout(1500);
  const fw=()=>p.evaluate(()=>{const r=[...document.querySelectorAll('#pg-master tbody tr')].find(x=>/Faeg/.test(x.innerText)); return r? r.innerText.replace(/\s+/g,' ').slice(0,120):'-';});
  const keys=await p.evaluate(()=>[...document.querySelectorAll('[data-sdkeep]')].map(x=>x.getAttribute('data-sdkeep')));
  const fk=keys.find(k=>/faeg/i.test(k));
  console.log('1 start',await fw());
  await p.click(`[data-sdkeep="${fk}"]`); await p.waitForTimeout(2500);
  console.log('2 after keep',await fw());
  const card=await p.evaluate(()=>[...document.querySelectorAll('.sd-doc')].map(x=>x.innerText.replace(/\s+/g,' ')).join(' || '));
  console.log('cards',card);
  await p.screenshot({path:T.out('sd2-a.png')});
  await p.click(`[data-sdundo="${fk}"]`); await p.waitForTimeout(2500);
  console.log('3 after undo',await fw(),'| buttons back:',await p.evaluate(k=>!!document.querySelector(`[data-sdkeep="${k}"]`),fk));
  // decide the others as new, then keep faeg last
  for(const k of keys.filter(k=>k!==fk)){ await p.click(`[data-sdnew="${k}"]`); await p.waitForTimeout(1200); }
  await p.click(`[data-sdkeep="${fk}"]`); await p.waitForTimeout(3000);
  console.log('4 kept last one: panel open?',await p.evaluate(()=>!!document.querySelector('.sd')),'row',await fw());
  await p.screenshot({path:T.out('sd2-b.png')});
  await p.reload(); await p.waitForTimeout(12000); await nav('Master'); await p.waitForTimeout(1500);
  console.log('5 top',(await p.evaluate(()=>(document.querySelector('.sd')||{}).innerText||'')).replace(/\s+/g,' ').slice(0,600));
  console.log('5 saved', await p.evaluate(()=>{const x=[...document.querySelectorAll('#pg-master .cb')].find(c=>/Saved schedule/.test(c.innerText)); return x&&x.innerText.replace(/\s+/g,' ');}));
  console.log('5 after reload: panel?',await p.evaluate(()=>!!document.querySelector('.sd')),'row',await fw());
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
