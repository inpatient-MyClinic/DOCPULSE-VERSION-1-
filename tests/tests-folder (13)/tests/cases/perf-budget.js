/* Speed budget with the 6,000-row capacity log. Generous limits: they catch a
   slowdown that matters (the doctor card was once 750 ms per click), not noise. */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const BUDGET={ 'open doctor card':200, 'OT choice: button lights':60, 'open Doctors page':2500, 'open Master page':2500, 'H allowance +':2500, 'Master: Per hour':3000 };
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage(); p.on('dialog',d=>d.accept());
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await T.login(p);
  await p.evaluate(async()=>{ await fetch('/api/settings',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({settings:{ot:[{name:'Dr. Hamza Alofi',id:'1244',site:'J1',type:'FT',dept:'Orthopedic',spec:'',year:'',month:'',days:{Mon:[{f:540,t:780,fill:''}],Sat:[{f:1020,t:1260,fill:''}]}}]}})}); });
  await p.reload(); await p.waitForTimeout(15000);
  const clickTime=(sel)=>p.evaluate((sel)=>{ const n=document.querySelector(sel); if(!n) return -1; const t=performance.now(); n.click(); return Math.round(performance.now()-t); },sel);
  const med=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];
  const res={};
  const nav=(n)=>`#nav button:nth-child(${n})`;
  const t1=[],t2=[];
  for(let i=0;i<3;i++){ t1.push(await clickTime(nav(2))); await p.waitForTimeout(400); t2.push(await clickTime(nav(3))); await p.waitForTimeout(400); }
  res['open Doctors page']=med(t1); res['open Master page']=med(t2);
  const ph=[]; for(let i=0;i<3;i++){ ph.push(await clickTime('[data-mwhole]')); await p.waitForTimeout(400); }
  res['Master: Per hour']=med(ph);
  await p.click(nav(2)); await p.waitForTimeout(1200);
  const ha=[]; for(let i=0;i<3;i++){ ha.push(await clickTime('#pg-summary [data-hyb$="|+"]')); await p.waitForTimeout(400); }
  res['H allowance +']=med(ha);
  await p.selectOption('#f_month','9'); await p.waitForTimeout(900); await p.fill('#q','Hamza Alofi'); await p.waitForTimeout(900);
  const oc=[], ob=[];
  for(let i=0;i<3;i++){
    oc.push(await clickTime('#pg-summary tbody tr')); await p.waitForTimeout(400);
    ob.push(await clickTime(`#drawer [data-otrule$="|${i%2?'both':'fixed'}"]`)); await p.waitForTimeout(700);
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  }
  res['open doctor card']=med(oc); res['OT choice: button lights']=med(ob);
  Object.keys(BUDGET).forEach(k=>{ const v=res[k]; T.check(k+': '+v+' ms (limit '+BUDGET[k]+' ms)', v>=0&&v<=BUDGET[k]); });
  T.noErrors(errs);
  await b.close(); T.done();
})().catch(e=>{console.error(e);process.exit(1);});
