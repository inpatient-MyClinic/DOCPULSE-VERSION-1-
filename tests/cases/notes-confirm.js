/* Confirming a note date changes the count from that day
   (was nt2.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1650,height:1000}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  const yr=async(name)=>{ await nav('Doctors'); await p.waitForTimeout(1200); await p.fill('#q',name); await p.waitForTimeout(800);
    await p.click('#metric [data-m="s"]').catch(()=>{}); await p.waitForTimeout(500);
    const v=await p.evaluate(()=>{ const ths=[...document.querySelectorAll('#pg-summary thead th')].map(x=>x.textContent.trim().slice(0,3)); const r=document.querySelector('#pg-summary tbody tr');
      const td=[...r.querySelectorAll('td')]; return ['Jan','Mar','Apr','May','Dec'].map(m=>m+':'+(td[ths.indexOf(m)]||{}).innerText).join(' '); });
    await p.fill('#q',''); return v; };
  console.log('start            :',await yr('Ahmed Hashish'));
  // 1) save a version dated 1 Jan 2026 (the schedule as it was)
  await nav('Master'); await p.waitForTimeout(1500);
  await p.click('#mvSaveBtn'); await p.waitForTimeout(600);
  await p.fill('#mvDate','2026-01-01'); await p.click('#mvGo'); await p.waitForTimeout(4000);
  // 2) change his schedule: remove one session in the edit pop-up
  await p.fill('#mfQ','Ahmed Hashish'); await p.waitForTimeout(800);
  const k=await p.evaluate(()=>document.querySelector('#pg-master tr[data-mkey]').getAttribute('data-mkey'));
  await p.click(`[data-medit="${k}"]`); await p.waitForTimeout(800);
  const on=await p.$$('#mgeBox .dpg-c.on[data-mgtog]'); await on[0].click(); await p.waitForTimeout(500);
  await p.click('#mgeBox [data-mgsave]'); await p.waitForTimeout(2500);
  await p.fill('#mfQ',''); await p.waitForTimeout(500);
  console.log('after the edit   :',await yr('Ahmed Hashish'));
  // 3) confirm "Master Clinic Changes started April 5, 2026"
  await nav('Master'); await p.waitForTimeout(1500);
  const row=await p.evaluate(()=>{ const r=[...document.querySelectorAll('.nt-row')].find(x=>/Ahmed Hashish/.test(x.innerText)); return r&&{t:r.innerText.replace(/\s+/g,' ').slice(0,330),k:r.querySelector('[data-ntok]').getAttribute('data-ntok')}; });
  console.log('row:',row.t);
  await p.click(`[data-ntok="${row.k}"]`); await p.waitForTimeout(2500);
  console.log('change confirmed :',await yr('Ahmed Hashish'));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
