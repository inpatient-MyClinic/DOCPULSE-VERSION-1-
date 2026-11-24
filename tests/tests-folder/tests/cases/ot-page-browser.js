/* OT page in the browser: slot choice, day-by-day override, doctor card, survives reload
   (was ot4.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1650,height:1000},deviceScaleFactor:1.1})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.evaluate(async()=>{ await fetch('/api/settings',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({settings:{ot:[{name:'Dr. Hamza Alofi',id:'1244',site:'J1',type:'FT',dept:'Orthopedic',spec:'',year:'',month:'',days:{Mon:[{f:540,t:780,fill:''}],Sat:[{f:1020,t:1260,fill:''}]}}]}})}); });
  await p.reload(); await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  const fixedOT=async()=>{ await nav('Doctors'); await p.waitForTimeout(1200); await p.selectOption('#f_month','9'); await p.waitForTimeout(800); await p.fill('#q','Hamza Alofi'); await p.waitForTimeout(800);
    const v=await p.evaluate(()=>{ const ths=[...document.querySelectorAll('#pg-summary thead th')].map(x=>x.innerText.trim()); const r=document.querySelector('#pg-summary tbody tr'); const i=ths.findIndex(x=>/^(OT Fixed|Fixed OT)$/i.test(x)); return r.querySelectorAll('td')[i].innerText; });
    await p.fill('#q',''); return v; };
  await nav('OT fixed'); await p.waitForTimeout(1500); await p.selectOption('#otMonthSel','9'); await p.waitForTimeout(800);
  const view=()=>p.evaluate(()=>{ const c=document.querySelector('.ot-chk'); return c.querySelector('h3').innerText.replace(/\s+/g,' ')+' || '+[...c.querySelectorAll('tbody tr')].map(r=>r.innerText.replace(/\s+/g,' ')).join(' / '); });
  console.log('default view:',await view());
  await p.screenshot({path:T.out('ot4-a.png')});
  const slot=await p.evaluate(()=>document.querySelector('[data-otrule$="|fixed"]').getAttribute('data-otrule'));
  await p.click(`[data-otrule="${slot}"]`); await p.waitForTimeout(1800);
  console.log('Mon slot = OT fixed:',(await view()).slice(0,260));
  console.log('Fixed OT column, Oct:',await fixedOT());
  await nav('OT fixed'); await p.waitForTimeout(1200);
  await p.click('[data-otview="day"]'); await p.waitForTimeout(800);
  const mon=await p.evaluate(()=>{ const r=[...document.querySelectorAll('.ot-chk tbody tr')].find(x=>/Monday/.test(x.innerText)); return r.querySelector('[data-otpk$="|master"]').getAttribute('data-otpk'); });
  await p.click(`[data-otpk="${mon}"]`); await p.waitForTimeout(1800);
  console.log('one Monday set to Master (day):',await p.evaluate(()=>[...document.querySelectorAll('.ot-chk tbody tr')].filter(x=>/Monday/.test(x.innerText)).map(r=>r.innerText.replace(/\s+/g,' ').slice(-60)).join(' / ')));
  console.log('Fixed OT column, Oct:',await fixedOT());
  // doctor card
  await p.fill('#q','Hamza Alofi'); await p.waitForTimeout(800); await p.click('#pg-summary tbody tr >> nth=0'); await p.waitForTimeout(1500);
  console.log('card:',await p.evaluate(()=>{ const c=[...document.querySelectorAll('#drawer .card')].find(x=>/Fixed OT sessions/.test(x.innerText)); return c.innerText.replace(/\s+/g,' ').slice(0,330); }));
  await p.click('#otDwDays'); await p.waitForTimeout(1000);
  console.log('card days shown:',await p.evaluate(()=>[...document.querySelectorAll('#drawer .ot-mt')].length));
  // reload keeps choices
  await p.reload(); await p.waitForTimeout(12000);
  console.log('after reload, Fixed OT column, Oct:',await fixedOT());
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
