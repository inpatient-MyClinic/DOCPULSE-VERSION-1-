/* Versions: save, months, alarm on boot
   (was mv1.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  async function open(){
    const ctx=await b.newContext({viewport:{width:1700,height:1000},deviceScaleFactor:1.2});
    const p=await ctx.newPage(); p.on('dialog',d=>{ console.log('  dialog:',d.message().slice(0,90)); d.accept(); });
    await p.goto(T.base+'/login.html');
    await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
    await p.waitForTimeout(12000); return p; }
  const nav=(p,n)=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  const p=await open(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const alarm=()=>p.evaluate(()=>{ const a=document.getElementById('mvAlarm'); return a&&a.style.display!=='none'? a.textContent : '(none)'; });
  console.log('alarm on boot:',await alarm());
  await nav(p,'Master schedule'); await p.waitForTimeout(2500);
  const months=()=>p.evaluate(()=>[...document.querySelectorAll('.mv-m')].map(m=>m.querySelector('.mv-mn').textContent+':'+m.querySelector('b').textContent).join(' '));
  console.log('months before:',await months());
  await p.click('#mvSaveBtn'); await p.waitForTimeout(400);
  await p.fill('#mvDate','2026-10-25'); await p.click('#mvGo'); await p.waitForTimeout(2500);
  console.log('after save months:',await months(),'| alarm:',await alarm());
  // edit a doctor → alarm back
  await p.fill('#mfQ','Taha Samman'); await p.waitForTimeout(800);
  await p.click('table.mgrid tbody tr[data-mkey] .dpg-c',{button:'right'}); await p.waitForTimeout(600);
  await p.click('[data-mgtog="Mon|0"]'); await p.click('[data-mgsave]'); await p.waitForTimeout(2000);
  console.log('after edit alarm:',await alarm(),'| badge:',await p.evaluate(()=>{ const b=document.querySelector('#nav [data-go="master"] .bdg'); return b?b.textContent:'none'; }));
  await p.click('#mvAlarm'); await p.waitForTimeout(800);
  await p.fill('#mvDate','2026-10-25'); await p.click('#mvGo'); await p.waitForTimeout(2500);
  console.log('2nd save:',await months(),'| alarm:',await alarm());
  console.log('oct list:',await p.evaluate(()=>[...document.querySelectorAll('.mv-list .mv-v')].map(v=>v.querySelector('.mv-t').textContent+' | '+v.querySelector('.mv-chips').textContent).join('\n   ')));
  // upload an old file for March
  await p.click('#mvUpBtn'); await p.waitForTimeout(400);
  await p.setInputFiles('#mvFile',SP+'back.xlsx'); await p.fill('#mvDate','2026-03-01'); await p.click('#mvGo'); await p.waitForTimeout(3500);
  console.log('after upload:',await months(),'| alarm:',await alarm());
  await p.evaluate(()=>{ const b=document.querySelector('.body'); b.scrollTop=document.getElementById('mvCard').getBoundingClientRect().top+b.scrollTop-90; });
  await p.screenshot({path:T.out('mv-1.png')});
  // delete March version → trash
  await p.click('[data-mvdel]'); await p.waitForTimeout(800);
  await p.click('#mvTrashBtn'); await p.waitForTimeout(600);
  console.log('trash:',await p.evaluate(()=>[...document.querySelectorAll('.mv-trash .mv-v')].map(v=>v.querySelector('.mv-days').textContent).join(', ')),'| months:',await months());
  await p.screenshot({path:T.out('mv-2.png')});
  // second browser
  const q=await open(); await nav(q,'Master schedule'); await q.waitForTimeout(3000);
  await q.click('[data-mvm="2"]'); await q.waitForTimeout(400);
  console.log('B months:',await q.evaluate(()=>[...document.querySelectorAll('.mv-m')].map(m=>m.querySelector('.mv-mn').textContent+':'+m.querySelector('b').textContent).join(' ')),
    '| B alarm:',await q.evaluate(()=>{ const a=document.getElementById('mvAlarm'); return a&&a.style.display!=='none'? a.textContent : '(none)'; }));
  await q.click('#mvTrashBtn'); await q.waitForTimeout(400); await q.click('[data-mvres]'); await q.waitForTimeout(1200);
  console.log('B after restore months:',await q.evaluate(()=>[...document.querySelectorAll('.mv-m')].map(m=>m.querySelector('.mv-mn').textContent+':'+m.querySelector('b').textContent).join(' ')));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
