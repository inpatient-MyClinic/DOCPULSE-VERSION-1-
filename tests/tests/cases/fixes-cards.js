/* Fix cards: accept and list
   (was fx1.js) */
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
  await p.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>/Settings/.test(x.textContent)).click(); });
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ [...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Fix list').click(); });
  await p.waitForTimeout(1200);
  const cards=()=>p.evaluate(()=>[...document.querySelectorAll('.fx-c')].map(c=>c.querySelector('h3').textContent+' ['+c.querySelector('.hc-n').textContent+']').join('\n'));
  console.log('cards:\n'+await cards());
  await p.click('[data-fxopen]'); await p.waitForTimeout(500);
  await p.evaluate(()=>{ const b=document.querySelector('.body'); b.scrollTop=document.querySelector('.fx-kpi').getBoundingClientRect().top+b.scrollTop-90; });
  await p.screenshot({path:T.out('fx-1.png')});
  await p.click('.fx-c [data-sig]'); await p.waitForTimeout(1500);
  console.log('after accept:\n'+await cards());
  await p.click('[data-fxv="list"]'); await p.waitForTimeout(600);
  console.log('list rows:',await p.evaluate(()=>document.querySelectorAll('#pg-fix tbody tr').length));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
