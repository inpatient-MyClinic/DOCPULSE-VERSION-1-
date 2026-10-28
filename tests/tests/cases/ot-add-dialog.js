/* Adding a fixed OT session from the OT page
   (was ot1.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1700,height:1000},deviceScaleFactor:1.2});
  const p=await ctx.newPage(); p.on('dialog',d=>{ console.log('dialog:',d.message().slice(0,120)); d.accept(); }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  await nav('OT fixed'); await p.waitForTimeout(1200);
  await p.screenshot({path:T.out('ot-0.png')});
  await p.click('#otAdd'); await p.waitForTimeout(500);
  await p.fill('[data-otf="name"]','Taha Samman'); await p.waitForTimeout(800);
  const pick=await p.$('[data-otpickdoc]'); if(pick){ await pick.click(); await p.waitForTimeout(500); }
  console.log('form:',await p.evaluate(()=>['name','id','site'].map(k=>document.querySelector('[data-otf="'+k+'"]').value).join(' | ')));
  await p.click('[data-owadd="Sat"]'); await p.waitForTimeout(400);
  await p.screenshot({path:T.out('ot-1.png')});
  await p.click('#otSave'); await p.waitForTimeout(2500);
  console.log('ot table:',await p.evaluate(()=>[...document.querySelectorAll('#pg-ot tbody tr')].map(r=>r.textContent.replace(/\s+/g,' ').slice(0,160)).join('\n')));
  await nav('Doctors'); await p.waitForTimeout(1500);
  const info=await p.evaluate(()=>{
    const ths=[...document.querySelectorAll('#pg-summary thead th')].map(x=>x.textContent.trim());
    const r=[...document.querySelectorAll('#pg-summary tbody tr')].find(x=>/Taha Samman/.test(x.textContent));
    const tds=[...r.querySelectorAll('td')].map(x=>x.textContent.trim());
    const o={}; ths.forEach((h,i)=>o[h]=tds[i]); return JSON.stringify(o); });
  console.log('doctors row:',info);
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
