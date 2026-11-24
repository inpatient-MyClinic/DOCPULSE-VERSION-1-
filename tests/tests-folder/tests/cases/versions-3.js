/* Versions mode vs file mode
   (was mv3.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1700,height:1000}});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  const taha=()=>p.evaluate(()=>{ const ths=[...document.querySelectorAll('#pg-summary thead th')].map(x=>x.textContent.trim());
    const r=[...document.querySelectorAll('#pg-summary tbody tr')].find(x=>/Taha Samman/.test(x.textContent));
    return ['Sep','Oct','Nov','Dec','Sess'].map(h=>h+'='+r.querySelectorAll('td')[ths.indexOf(h)].textContent).join(' '); });
  await nav('Doctors'); await p.waitForTimeout(1200); console.log('file mode:',await taha());
  await nav('Master schedule'); await p.waitForTimeout(2500);
  await p.click('#mvSaveBtn'); await p.waitForTimeout(300); await p.fill('#mvDate','2026-01-01'); await p.click('#mvGo'); await p.waitForTimeout(2500);
  await nav('Data'); await p.waitForTimeout(1000);
  await p.check('#dpSrcV'); await p.waitForTimeout(4000);
  console.log('subtitle:',await p.evaluate(()=>document.getElementById('pgSub').textContent));
  await nav('Doctors'); await p.waitForTimeout(1500); console.log('versions mode, one version:',await taha());
  await p.waitForTimeout(1500);
  if(process.argv[2]==='stop'){ await b.close(); return; }
  await nav('Master schedule'); await p.waitForTimeout(1500);
  await p.fill('#mfQ','Taha Samman'); await p.waitForTimeout(800);
  await p.click('table.mgrid tbody tr[data-mkey] .dpg-c',{button:'right'}); await p.waitForTimeout(600);
  await p.click('[data-mgtog="Sun|0"]'); await p.click('[data-mgtog="Sun|1"]'); await p.click('[data-mgtog="Tue|0"]'); await p.click('[data-mgtog="Tue|1"]');
  await p.click('[data-mgsave]'); await p.waitForTimeout(2000);
  await nav('Doctors'); await p.waitForTimeout(1500); console.log('edited, not saved as version:',await taha(), '| alarm:',await p.evaluate(()=>{ const a=document.getElementById('mvAlarm'); return a&&a.style.display!=='none'; }));
  await p.click('#mvAlarm'); await p.waitForTimeout(800); await p.fill('#mvDate','2026-10-12'); await p.click('#mvGo'); await p.waitForTimeout(4000);
  await nav('Doctors'); await p.waitForTimeout(1500); console.log('after V2 from 12 Oct:',await taha(), '| alarm:',await p.evaluate(()=>{ const a=document.getElementById('mvAlarm'); return a&&a.style.display!=='none'; }));
  await nav('Session breakdown'); await p.waitForTimeout(1500);
  console.log('breakdown Oct:',await p.evaluate(()=>{ const m=document.querySelector('#pg-brk select'); return null; }));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
