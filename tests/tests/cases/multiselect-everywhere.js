/* Multi-select filters on every page, pop-over behaviour
   (was ms2.js) */
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
  const rows=pg=>p.evaluate(pg=>document.querySelectorAll('#'+pg+' tbody tr').length,pg);
  // DOCTORS
  await nav('Doctors'); await p.waitForTimeout(1500);
  const sites=await p.evaluate(()=>[...document.querySelectorAll('[data-dsite]')].map(x=>x.getAttribute('data-dsite')).filter(Boolean));
  console.log('doc sites',sites,'rows all',await rows('pg-summary'));
  await p.click(`[data-dsite="${sites[0]}"]`); await p.waitForTimeout(600); const r1=await rows('pg-summary');
  await p.click(`[data-dsite="${sites[1]}"]`); await p.waitForTimeout(600); const r2=await rows('pg-summary');
  console.log('site1',r1,'site1+2',r2);
  await p.click('[data-msb="d|status"]'); await p.waitForTimeout(500);
  console.log('type opts',await p.evaluate(()=>[...document.querySelectorAll('.ms-o')].map(x=>x.textContent).join(' / ')));
  await p.click('.ms-o >> nth=0'); await p.waitForTimeout(600); const r3=await rows('pg-summary');
  console.log('popover still open',await p.evaluate(()=>!!document.querySelector('.ms-pop')),'rows',r3);
  await p.screenshot({path:T.out('ms-d1.png'),clip:{x:240,y:0,width:1460,height:560}});
  await p.click('[data-msdone]'); await p.waitForTimeout(400);
  await p.click('[data-msb="d|dept"]'); await p.waitForTimeout(400);
  await p.fill('#msQ','a'); await p.keyboard.press('Enter'); await p.waitForTimeout(600);
  console.log('dept tokens',await p.evaluate(()=>[...document.querySelectorAll('.ms-tok')].map(x=>x.textContent).join(' | ')),'rows',await rows('pg-summary'));
  await p.mouse.click(1600,950); await p.waitForTimeout(500);
  console.log('closed by outside click',await p.evaluate(()=>!document.querySelector('.ms-pop')));
  await p.screenshot({path:T.out('ms-d2.png'),clip:{x:240,y:0,width:1460,height:420}});
  await p.click('[data-msclr="d"]'); await p.waitForTimeout(600); console.log('after clear all',await rows('pg-summary'));
  // MASTER
  await nav('Master'); await p.waitForTimeout(1500);
  const m0=await rows('pg-master');
  const ms=await p.evaluate(()=>[...document.querySelectorAll('[data-msite]')].map(x=>x.getAttribute('data-msite')).filter(Boolean));
  await p.click(`[data-msite="${ms[0]}"]`); await p.waitForTimeout(600); const m1=await rows('pg-master');
  await p.click(`[data-msite="${ms[1]}"]`); await p.waitForTimeout(600); const m2=await rows('pg-master');
  console.log('master rows all',m0,'site1',m1,'site1+2',m2);
  await p.click('[data-msb="m|day"]'); await p.waitForTimeout(400);
  await p.hover('.ms-o:has-text("Fri")'); await p.click('.ms-o:has-text("Fri") .ms-only'); await p.waitForTimeout(600);
  console.log('Fri only rows',await rows('pg-master'),'tokens',await p.evaluate(()=>[...document.querySelectorAll('.ms-tok')].map(x=>x.textContent).join(' | ')));
  await p.click('[data-msb="m|day"]'); await p.waitForTimeout(400);
  await p.click('.ms-o:has-text("Sat")'); await p.waitForTimeout(600);
  console.log('Fri+Sat rows',await rows('pg-master'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.click('[data-msb="m|dept"]'); await p.waitForTimeout(400);
  await p.screenshot({path:T.out('ms-m1.png'),clip:{x:240,y:0,width:1460,height:700}});
  await p.keyboard.press('Escape');
  await p.click('#mvDay').catch(()=>{}); await p.waitForTimeout(1000);
  console.log('day board ok',await p.evaluate(()=>document.querySelectorAll('#pg-master .db2-card, #pg-master [class*=db2]').length));
  await p.click('#mfClear'); await p.waitForTimeout(600); console.log('master after Clear',await rows('pg-master'));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
