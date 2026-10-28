/* H allowance editable from the Doctors page and the master
   (was hyb3.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1700,height:1000},deviceScaleFactor:1.2})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  await nav('Master'); await p.waitForTimeout(1500);
  await p.fill('#mfQ','Taha'); await p.waitForTimeout(800);
  const pill=()=>p.evaluate(()=>{ const m=document.querySelector('#pg-master .hyb-m'); return m? m.innerText.replace(/\s+/g,' ')+' value='+m.querySelector('input').value : 'none'; });
  console.log('start  :',await pill());
  await p.click('[data-mhyb$="|+"]'); await p.waitForTimeout(1500);
  await p.click('[data-mhyb$="|+"]'); await p.waitForTimeout(1500);
  console.log('+ +    :',await pill());
  await p.fill('[data-mhybv]','5'); await p.press('[data-mhybv]','Enter'); await p.waitForTimeout(1800);
  console.log('typed 5:',await p.evaluate(()=>document.querySelector('#pg-master .hyb-m').innerText.replace(/\s+/g,' ')+' value='+document.querySelector('#pg-master [data-mhybv]').value),'| drawer open?',await p.evaluate(()=>!!document.querySelector('.dwb')));
  const r=await p.$('#pg-master tr[data-mkey]'); await r.screenshot({path:T.out('hyb3.png')});
  // the same number on the Doctors page
  await nav('Doctors'); await p.waitForTimeout(1500); await p.fill('#q','Taha'); await p.waitForTimeout(800);
  console.log('Doctors page chip:',await p.evaluate(()=>(document.querySelector('#pg-summary .hyb')||{}).innerText||'none').then(x=>x.replace(/\s+/g,' ')));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
