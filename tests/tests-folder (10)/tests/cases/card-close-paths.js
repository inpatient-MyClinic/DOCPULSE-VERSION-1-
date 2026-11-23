/* Doctor card: OT choice lights at once; page behind catches up on Esc / X / outside click
   (was perf5.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage(); p.on('dialog',d=>d.accept());
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.evaluate(async()=>{ await fetch('/api/settings',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({settings:{ot:[{name:'Dr. Hamza Alofi',id:'1244',site:'J1',type:'FT',dept:'Orthopedic',spec:'',year:'',month:'',days:{Mon:[{f:540,t:780,fill:''}],Sat:[{f:1020,t:1260,fill:''}]}}]}})}); });
  await p.reload(); await p.waitForTimeout(15000);
  await p.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf('Doctors')>=0).click(); }); await p.waitForTimeout(1500);
  await p.selectOption('#f_month','9'); await p.waitForTimeout(1200);
  const tm=async(name,fn)=>{ const ms=await p.evaluate(fn); await p.waitForTimeout(400); console.log(String(ms).padStart(6)+' ms  '+name); };
  await p.fill('#q','Hamza Alofi'); await p.waitForTimeout(900);
  const row=()=>p.evaluate(()=>document.querySelector('#pg-summary tbody tr').innerText.replace(/\s+/g,' '));
  const before=await row();
  for(const [how,rule] of [['Escape','fixed'],['X button','both'],['scrim','fixed']]){
    await tm('open card',()=>{ const t=performance.now(); document.querySelector('#pg-summary tbody tr').click(); return Math.round(performance.now()-t); });
    await tm('card: OT '+rule+' (button lights)',new Function('const t=performance.now(); document.querySelector(\'#drawer [data-otrule$="|'+rule+'"]\').click(); return Math.round(performance.now()-t);'));
    const rc=await p.evaluate(()=>new Promise(res=>{ const t=performance.now(); requestAnimationFrame(()=>setTimeout(()=>setTimeout(()=>res(Math.round(performance.now()-t)),0),0)); }));
    console.log(String(rc).padStart(6)+' ms  …numbers updated in the card after');
    const on=await p.evaluate(r=>{ const b=document.querySelector('#drawer [data-otrule$="|'+r+'"]'); return b&&/\bon\b|active|sel/.test(b.className); },rule);
    if(how==='Escape') await p.keyboard.press('Escape');
    else if(how==='X button') await p.click('#dwX');
    else await p.evaluate(()=>document.getElementById('scrim').click());
    await p.waitForTimeout(600);
    const afterClose=await row();
    const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
    await nav('Data'); await p.waitForTimeout(500); await nav('Doctors'); await p.waitForTimeout(900);
    const fresh=await row();
    T.check('close via '+how+': chosen button lit', on);
    T.check('close via '+how+': page behind caught up', afterClose===fresh, afterClose+' ≠ '+fresh);
    T.check('close via '+how+': the row changed', afterClose!==before);
  }
  T.noErrors(errs); await b.close(); T.done();
})().catch(e=>{console.error(e.message);process.exit(1);});
