/* Telemedicine (remote) page
   (was rt1.js) */
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
  await p.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>/Telemedicine/.test(x.textContent)).click(); });
  await p.waitForTimeout(2000);
  await p.screenshot({path:T.out('rt-1.png')});
  await p.evaluate(()=>{ const b=document.querySelector('.body'); b.scrollTop=document.getElementById('rtStep2').getBoundingClientRect().top+b.scrollTop-90; });
  await p.waitForTimeout(300);
  const row=await p.$('[data-rowpick]'); if(row){ await row.click(); await p.waitForTimeout(800); }
  await p.screenshot({path:T.out('rt-2.png')});
  await p.click('#rtAdv summary'); await p.waitForTimeout(500);
  console.log('adv open:',await p.evaluate(()=>document.getElementById('rtAdv').open),'| has read filter:',await p.evaluate(()=>!!document.querySelector('#rtAdv #rtAddRule')));
  console.log('steps:',await p.evaluate(()=>[...document.querySelectorAll('.rt-step')].map(x=>x.textContent).join(' | ')));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
