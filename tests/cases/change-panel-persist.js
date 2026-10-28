/* Change panel decisions survive a reload and show in a second browser
   (was sd5.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1650,height:1000}});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  await nav('Data'); await p.waitForTimeout(1200);
  await p.setInputFiles('input[data-file="m"]',SP+'back-new2.xlsx'); await p.waitForTimeout(9000);
  await nav('Master'); await p.waitForTimeout(1500);
  const state=()=>p.evaluate(()=>({prog:(document.querySelector('.sd-prog')||{}).innerText, decided:[...document.querySelectorAll('.sd-doc')].map(d=>{ const on=d.querySelector('.sd-seg button.on'); return on? d.querySelector('.sd-nm b').innerText+'='+on.innerText.replace('✓ ','') : null; }).filter(Boolean)}));
  const keys=await p.evaluate(()=>[...document.querySelectorAll('[data-sdnew]')].map(x=>x.getAttribute('data-sdnew')));
  for(const k of keys.slice(0,4)){ await p.click(`[data-sdnew="${k}"]`); await p.waitForTimeout(700); }
  await p.click(`[data-sdkeep="${keys[5]}"]`); await p.waitForTimeout(2500);
  const before=await state(); console.log('before reload:',before.prog.replace(/\s+/g,' ').slice(0,40),JSON.stringify(before.decided));
  await p.reload(); await p.waitForTimeout(13000); await nav('Master'); await p.waitForTimeout(2000);
  const after=await state(); console.log('after reload :',(after.prog||'no panel').replace(/\s+/g,' ').slice(0,40),JSON.stringify(after.decided));
  console.log('same?',JSON.stringify(before.decided.sort())===JSON.stringify(after.decided.sort()));
  // a second browser (another person) sees the same decisions
  const p2=await (await b.newContext({viewport:{width:1650,height:1000}})).newPage();
  await p2.goto(T.base+'/login.html'); await p2.fill('#email',T.email); await p2.fill('#password',T.password); await p2.click('#go'); await p2.waitForURL('**/');
  await p2.waitForTimeout(13000);
  await p2.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf('Master')>=0).click(); }); await p2.waitForTimeout(2000);
  console.log('2nd browser  :',await p2.evaluate(()=>(document.querySelector('.sd-prog')||{}).innerText||'no panel').then(x=>x.replace(/\s+/g,' ').slice(0,40)));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
