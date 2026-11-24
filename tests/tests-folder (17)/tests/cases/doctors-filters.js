/* Doctors page filters: site / month / name
   (was tg1.js) */
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
  await nav('Doctors'); await p.waitForTimeout(1500);
  const cnt=()=>p.evaluate(()=>document.querySelectorAll('#pg-summary tbody tr.click').length);
  console.log('doctors all:',await cnt());
  await p.click('[data-dsite="J2"]'); await p.waitForTimeout(800); console.log('J2 only:',await cnt(),'sites:',await p.evaluate(()=>[...new Set([...document.querySelectorAll('#pg-summary tbody .fin-site')].map(x=>x.textContent))].join(',')));
  await p.selectOption('#f_month','8'); await p.waitForTimeout(800);
  await p.fill('#q','Khalid'); await p.waitForTimeout(800); console.log('J2+Sep+Khalid:',await cnt());
  await p.fill('#q',''); await p.waitForTimeout(500);
  await p.click('[data-dsite="J2"]'); await p.waitForTimeout(800); console.log('back to all:',await cnt());
  await p.screenshot({path:T.out('tg-1.png')});
  await nav('Master schedule'); await p.waitForTimeout(2500);
  const mc=()=>p.evaluate(()=>document.querySelectorAll('table.mgrid tbody tr[data-mkey]').length);
  console.log('master all:',await mc());
  await p.click('[data-msite="J3"]'); await p.waitForTimeout(800); console.log('master J3:',await mc());
  await p.click('[data-msite=""]'); await p.waitForTimeout(800);
  await p.evaluate(()=>{ const b=document.querySelector('.body'); b.scrollTop=document.querySelector('.fin-bar-pg').getBoundingClientRect().top+b.scrollTop-200; });
  await p.waitForTimeout(300); await p.screenshot({path:T.out('tg-2.png')});
  await p.selectOption('#mfMonth','6'); await p.waitForTimeout(1200); console.log('month view banner:',await p.evaluate(()=>!!document.querySelector('.mv-prev')));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
