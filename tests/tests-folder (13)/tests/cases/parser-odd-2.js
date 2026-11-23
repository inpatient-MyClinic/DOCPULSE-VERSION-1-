/* Odd master file: split sessions and bad times flagged in the change panel
   (was odd2.js) */
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
  await nav('Data'); await p.waitForTimeout(1200);
  await p.setInputFiles('input[data-file="m"]',SP+'back-odd.xlsx'); await p.waitForTimeout(9000);
  await nav('Master'); await p.waitForTimeout(1500);
  console.log('change panel:',await p.evaluate(()=>!!document.querySelector('.sd'))? 'shown' : 'none (nothing changed)');
  await p.fill('#mfQ','Alzahrani'); await p.waitForTimeout(800);
  const r=await p.$('#pg-master tr[data-mkey]');
  console.log('Thu chip titles:',await p.evaluate(()=>[...document.querySelectorAll('#pg-master tr[data-mkey] [title^="Thursday"]')].map(x=>x.title).join(' | ')));
  await r.screenshot({path:T.out('odd-b.png')});
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
