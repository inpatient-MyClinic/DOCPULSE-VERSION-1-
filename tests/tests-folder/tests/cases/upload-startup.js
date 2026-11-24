/* Startup and upload timing, master stored on the server
   (was up1.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1600,height:1000}})).newPage();
  const t00=Date.now();
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  const tl=Date.now();
  for(let i=0;i<60;i++){ await p.waitForTimeout(250); const n=await p.evaluate(()=>{const x=[...document.querySelectorAll('#nav button')].find(x=>/Doctors/.test(x.textContent)); return x&&/\d/.test(x.textContent);}); if(n){ console.log('startup until doctors counted:',((Date.now()-tl)/1000).toFixed(1)+'s'); break; } }
  await p.evaluate(()=>{ window.__gaps=[]; let last=performance.now(); (function tick(){ const n=performance.now(); if(n-last>200) window.__gaps.push(Math.round(n-last)); last=n; requestAnimationFrame(tick); })(); });
  await p.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf('Data')>=0).click(); }); await p.waitForTimeout(1000);
  const t0=Date.now(); await p.setInputFiles('input[data-file="m"]',SP+'back.xlsx');
  for(let i=0;i<120;i++){ await p.waitForTimeout(250); const t=await p.evaluate(()=>document.getElementById('toast').textContent); if(/loaded/i.test(t)){ console.log('master read:',((Date.now()-t0)/1000).toFixed(1)+'s'); break; } }
  for(let i=0;i<120;i++){ await p.waitForTimeout(250); const t=await p.evaluate(()=>document.getElementById('toast').textContent); if(/stored on the server|Could not store/i.test(t)){ console.log('master stored on server:',((Date.now()-t0)/1000).toFixed(1)+'s',t); break; } }
  const g=await p.evaluate(()=>window.__gaps); console.log('freezes',g);
  await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
