/* OT form keeps focus while typing; totals
   (was ot2.js) */
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
  await p.click('#otAdd'); await p.waitForTimeout(500);
  await p.type('#otf_name','Taha Sam',{delay:40}); await p.waitForTimeout(900);
  console.log('focus kept:',await p.evaluate(()=>document.activeElement&&document.activeElement.id));
  const pick=await p.$('[data-otpickdoc]'); if(pick){ await pick.click(); await p.waitForTimeout(500); }
  console.log('form:',await p.evaluate(()=>['name','id','site'].map(k=>document.getElementById('otf_'+k).value).join(' | ')), await p.evaluate(()=>(document.querySelector('.ot-hint')||{}).textContent));
  await p.click('[data-owtog="Sat|1"]'); await p.click('[data-owtog="Sat|2"]'); await p.waitForTimeout(300);
  await p.click('[data-owadd="Tue"]'); await p.waitForTimeout(200);
  await p.selectOption('[data-owf="Tue|0"]','600'); await p.selectOption('[data-owto="Tue|0"]','960'); await p.waitForTimeout(300);
  console.log('tot:',await p.evaluate(()=>document.getElementById('otTot').textContent));
  await p.screenshot({path:T.out('ot-2.png')});
  await p.click('#otSave'); await p.waitForTimeout(2500);
  await p.screenshot({path:T.out('ot-3.png')});
  console.log('row:',await p.evaluate(()=>[...document.querySelectorAll('#pg-ot tbody tr')].map(r=>r.textContent.replace(/\s+/g,' ')).join('\n')));
  await nav('Doctors'); await p.waitForTimeout(1500);
  console.log('doctors Fixed OT:',await p.evaluate(()=>{ const ths=[...document.querySelectorAll('#pg-summary thead th')].map(x=>x.textContent.trim());
    const r=[...document.querySelectorAll('#pg-summary tbody tr')].find(x=>/Taha Samman/.test(x.textContent));
    return r.querySelectorAll('td')[ths.indexOf('Fixed OT')].textContent; }));
  await nav('OT fixed'); await p.waitForTimeout(800);
  await p.click('[data-otedit="0"]'); await p.waitForTimeout(600);
  console.log('edit opens with:',await p.evaluate(()=>document.getElementById('otTot').textContent));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
