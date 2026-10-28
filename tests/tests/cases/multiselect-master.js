/* Multi-select filters on the Master page
   (was ms1.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  async function open(){
    const ctx=await b.newContext({viewport:{width:1700,height:1000}});
    const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
    await p.goto(T.base+'/login.html');
    await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
    await p.waitForTimeout(12000); return p; }
  const nav=(p,n)=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  const row=(p)=>p.evaluate(()=>{ const r=[...document.querySelectorAll('table.mgrid tbody tr[data-mkey]')].find(x=>/Taha Samman/.test(x.textContent));
     return r.querySelector('.dpg-ss').textContent+' sessions, '+r.querySelectorAll('td')[11].textContent+' h, edited='+/edited/.test(r.textContent); });
  const docs=(p)=>p.evaluate(()=>{ const ths=[...document.querySelectorAll('#pg-summary thead th')].map(x=>x.textContent.trim());
     const r=[...document.querySelectorAll('#pg-summary tbody tr')].find(x=>/Taha Samman/.test(x.textContent)); return r.querySelectorAll('td')[ths.indexOf('Sess')].textContent; });
  const p=await open(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await nav(p,'Doctors'); await p.waitForTimeout(1200); console.log('A doctors year sess before:',await docs(p));
  await nav(p,'Master schedule'); await p.waitForTimeout(1200); await p.fill('#mfQ','Taha Samman'); await p.waitForTimeout(800);
  console.log('A before:',await row(p));
  await p.click('table.mgrid tbody tr[data-mkey] .dpg-c',{button:'right'}); await p.waitForTimeout(700);
  await p.click('[data-mgtog="Mon|0"]'); await p.waitForTimeout(200);
  await p.click('[data-mgsave]'); await p.waitForTimeout(2500);
  console.log('A after save:',await row(p));
  await nav(p,'Doctors'); await p.waitForTimeout(1200); console.log('A doctors year sess after:',await docs(p));
  const q=await open();
  await nav(q,'Master schedule'); await q.waitForTimeout(1200); await q.fill('#mfQ','Taha Samman'); await q.waitForTimeout(800);
  console.log('B (second browser):',await row(q));
  await nav(q,'Doctors'); await q.waitForTimeout(1200); console.log('B doctors year sess:',await docs(q));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
