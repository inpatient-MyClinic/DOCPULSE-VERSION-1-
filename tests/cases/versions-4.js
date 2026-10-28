/* Versions: look back at a month
   (was mv4.js) */
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
  await nav('Master schedule'); await p.waitForTimeout(2500);
  await p.click('#mvSaveBtn'); await p.waitForTimeout(300); await p.fill('#mvDate','2026-01-01'); await p.click('#mvGo'); await p.waitForTimeout(2500);
  await p.fill('#mfQ','Taha Samman'); await p.waitForTimeout(800);
  await p.click('table.mgrid tbody tr[data-mkey] .dpg-c',{button:'right'}); await p.waitForTimeout(600);
  await p.click('[data-mgtog="Sun|0"]'); await p.click('[data-mgtog="Sun|1"]'); await p.click('[data-mgtog="Tue|0"]'); await p.click('[data-mgtog="Tue|1"]');
  await p.click('[data-mgsave]'); await p.waitForTimeout(1500);
  await p.click('#mvAlarm'); await p.waitForTimeout(600); await p.fill('#mvDate','2026-10-12'); await p.click('#mvGo'); await p.waitForTimeout(3000);
  const days=()=>p.evaluate(()=>{ const r=document.querySelector('table.mgrid tbody tr[data-mkey]'); const tds=[...r.querySelectorAll('td.dpg-dy')];
    return ['Sun','Mon','Tue','Wed','Thu'].map((d,i)=>d+':'+[...tds[i].querySelectorAll('.dpg-c.on')].map(x=>x.textContent).join('')).join(' ')+' | sessions '+r.querySelector('.dpg-ss').textContent; });
  console.log('current:',await days());
  await p.click('[data-mvm="6"]'); await p.waitForTimeout(1500);
  console.log('July:',await days(),'| banner:',await p.evaluate(()=>document.querySelector('.mv-prev').textContent.slice(0,90)));
  console.log('edit hidden:',await p.evaluate(()=>!document.querySelector('table.mgrid [data-medit]')));
  await p.evaluate(()=>{ const b=document.querySelector('.body'); b.scrollTop=document.querySelector('.mv-months').getBoundingClientRect().top+b.scrollTop-90; });
  await p.screenshot({path:T.out('mvp-1.png')});
  await p.click('[data-mvm="10"]'); await p.waitForTimeout(1500); console.log('Nov:',await days());
  await p.click('#mvPrevX'); await p.waitForTimeout(800); console.log('back:',await days(),'| banner gone:',await p.evaluate(()=>!document.querySelector('.mv-prev')));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
