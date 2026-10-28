/* Odd master file reads without errors
   (was odd1.js) */
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
  await nav('Data'); await p.waitForTimeout(1200);
  await p.setInputFiles('input[data-file="m"]',SP+'back-odd.xlsx'); await p.waitForTimeout(9000);
  await nav('Master'); await p.waitForTimeout(1500);
  const fw=()=>p.evaluate(()=>{const r=[...document.querySelectorAll('#pg-master tbody tr')].find(x=>/Faeg/.test(x.innerText)); return r? r.innerText.replace(/\s+/g,' ').replace(/AMAFPM|AFPM|PM /g,'').slice(0,90):'-';});
  const prog=()=>p.evaluate(()=>(document.querySelector('.sd-prog')||{}).innerText||'none').then(t=>t.replace(/\s+/g,' '));
  await p.click('[data-sdf="flag"]').catch(()=>{}); await p.waitForTimeout(600);
  console.log(await p.evaluate(()=>[...document.querySelectorAll('.sd-doc')].map(x=>x.innerText.replace(/\s+/g,' ')).join('\n')));
  const c=await p.$('.sd-doc'); if(c) await c.screenshot({path:T.out('odd-a.png')});
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
