/* Colour key on/off changes the KPIs
   (was co1.js) */
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
  await p.evaluate(()=>{ const b=document.querySelector('.body'); b.scrollTop=document.querySelectorAll('.card.ru')[1].getBoundingClientRect().top+b.scrollTop-90; });
  await p.screenshot({path:T.out('co-1.png')});
  const before=await p.evaluate(()=>document.querySelector('.card.ru:nth-of-type(n) .ru-kpi')&&[...document.querySelectorAll('.card.ru')][1].querySelector('.ru-kpi').textContent);
  console.log('colours kpi:',before);
  const ck=await p.evaluate(()=>document.querySelector('.co-c [data-crule]').getAttribute('data-crule'));
  await p.click('.co-c [data-crule="'+ck+'"]'); await p.waitForTimeout(1500);
  console.log('after off:',await p.evaluate(()=>[...document.querySelectorAll('.card.ru')][1].querySelector('.ru-kpi').textContent));
  await p.click('#ruColAll'); await p.waitForTimeout(1500);
  console.log('all on:',await p.evaluate(()=>[...document.querySelectorAll('.card.ru')][1].querySelector('.ru-kpi').textContent));
  const inp=await p.$('.co-in[placeholder="Name this colour"]');
  if(inp){ await inp.fill('Test colour'); await inp.press('Enter'); await p.waitForTimeout(800); console.log('named:',await p.evaluate(()=>[...document.querySelectorAll('.co-in')].some(x=>x.value==='Test colour'))); }
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
