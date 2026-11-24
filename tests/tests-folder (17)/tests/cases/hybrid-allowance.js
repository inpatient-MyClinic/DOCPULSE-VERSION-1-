/* H allowance 0 / 2 / 5 counts Annual Leave only
   (was hyb2.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1700,height:1000}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  await p.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf('Doctors')>=0).click(); }); await p.waitForTimeout(1500);
  await p.fill('#q','Taha'); await p.waitForTimeout(1000);
  const oct=async()=>{ const r={}; for(const m of ['s','c','t']){ await p.click(`#metric [data-m="${m}"]`); await p.waitForTimeout(500);
     r[m]=await p.evaluate(()=>{ const ths=[...document.querySelectorAll('#pg-summary thead th')].map(x=>x.textContent.trim().slice(0,3)); const i=ths.indexOf('Oct');
       const row=[...document.querySelectorAll('#pg-summary tbody tr')].find(x=>/Taha/.test(x.innerText)); return row.querySelectorAll('td')[i].innerText.trim(); }); }
     r.chip=await p.evaluate(()=>(document.querySelector('#pg-summary .hyb')||{}).innerText||'').then(x=>x.replace(/\s+/g,' ')); return JSON.stringify(r); };
  console.log('allowance 0:',await oct());
  const key=await p.evaluate(()=>document.querySelector('#pg-summary [data-hyb$="|+"]').getAttribute('data-hyb'));
  await p.click(`[data-hyb="${key}"]`); await p.waitForTimeout(1500);
  await p.click(`[data-hyb="${key}"]`); await p.waitForTimeout(1500);
  console.log('allowance 2:',await oct());
  for(let i=0;i<3;i++){ await p.click(`[data-hyb="${key}"]`); await p.waitForTimeout(1200); }
  console.log('allowance 5:',await oct());
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
