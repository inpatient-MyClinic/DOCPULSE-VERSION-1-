/* Rules page on/off
   (was ru1.js) */
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
  await p.waitForTimeout(1000);
  await p.evaluate(()=>{ [...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Rules').click(); });
  await p.waitForTimeout(1200);
  const kpi=()=>p.evaluate(()=>[...document.querySelectorAll('.ru-kpi div')].map(x=>x.textContent).join(' | '));
  console.log('kpi:',await kpi(), 'rows:',await p.evaluate(()=>document.querySelectorAll('.ru-r').length));
  await p.evaluate(()=>{ const b=document.querySelector('.body'); b.scrollTop=document.querySelector('.card.ru').getBoundingClientRect().top+b.scrollTop-90; });
  await p.screenshot({path:T.out('ru-1.png')});
  const k=await p.evaluate(()=>{ const r=[...document.querySelectorAll('.ru-r')].find(x=>/External Commitments/.test(x.textContent)); return r.querySelector('[data-rtog]').getAttribute('data-rtog'); });
  await p.click('[data-rtog="'+k+'"]'); await p.waitForTimeout(1500); console.log('after off:',await kpi());
  await p.click('[data-rtog="'+k+'"]'); await p.waitForTimeout(1500); console.log('after on:',await kpi());
  await p.click('[data-ruf="o"]'); await p.waitForTimeout(500); console.log('opens:',await p.evaluate(()=>[...document.querySelectorAll('.ru-t')].map(x=>x.firstChild.textContent).join(', ')));
  await p.click('[data-ruf=""]'); await p.fill('#ruQ','leave'); await p.waitForTimeout(500); console.log('search leave:',await p.evaluate(()=>document.querySelectorAll('.ru-r').length));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
