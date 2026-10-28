/* Large billing file reads without freezing the page
   (was bill1.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
const FILE=process.argv[2]||'bill-big.xlsx';
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1600,height:1000}});
  const p=await ctx.newPage(); p.on('dialog',d=>{console.log('DIALOG',d.message());d.accept()}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(10000);
  await p.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf('Telemedicine')>=0).click(); }); await p.waitForTimeout(1500);
  // track main-thread freezes
  await p.evaluate(()=>{ window.__gaps=[]; let last=performance.now(); (function tick(){ const n=performance.now(); if(n-last>200) window.__gaps.push(Math.round(n-last)); last=n; requestAnimationFrame(tick); })(); });
  const t0=Date.now();
  await p.setInputFiles('input[data-file="rt_billing"]',SP+FILE);
  let done=false;
  for(let i=0;i<600&&!done;i++){ await p.waitForTimeout(500);
    const t=await p.evaluate(()=>document.getElementById('toast').textContent+' || '+((document.getElementById('rtBusy')||{}).textContent||''));
    if(i%10===0) console.log(((Date.now()-t0)/1000).toFixed(1)+'s',t.slice(0,140));
    if(/Billing: kept|No rows matched|Billing loaded|Choose the sheets/.test(t)){ done=true; console.log('DONE',((Date.now()-t0)/1000).toFixed(1)+'s',t.slice(0,160)); } }
  const g=await p.evaluate(()=>window.__gaps); console.log('freezes >200ms:',g.length,'longest',Math.max(0,...g),'ms total',g.reduce((a,b)=>a+b,0));
  console.log('mem MB',await p.evaluate(()=>performance.memory? Math.round(performance.memory.usedJSHeapSize/1e6):'?'));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
