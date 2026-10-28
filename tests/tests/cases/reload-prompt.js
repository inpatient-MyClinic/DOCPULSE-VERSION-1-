/* Leave-page warning only when something is still unsaved
   (was bu1.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext()).newPage(); let dialogs=[]; p.on('dialog',d=>{ dialogs.push(d.type()); d.accept(); });
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  console.log('version pill showing:',await p.evaluate(()=>{ const a=document.getElementById('mvAlarm'); return !!a&&a.style.display!=='none'; }));
  await p.click('body'); await p.reload(); await p.waitForTimeout(3000);
  console.log('reload with nothing pending → warning shown?',dialogs.includes('beforeunload'));
  dialogs=[];
  await p.waitForTimeout(9000);
  await p.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf('Master')>=0).click(); }); await p.waitForTimeout(1200);
  await p.click('[data-mwhole]'); await p.waitForTimeout(100);
  await p.reload().catch(()=>{}); await p.waitForTimeout(2000);
  console.log('reload right after a click (save pending) → warning shown?',dialogs.includes('beforeunload'));
  await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
