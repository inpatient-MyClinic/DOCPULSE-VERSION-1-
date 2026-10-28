/* OT month check: picks, set-all, rules box
   (was ot3.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1700,height:1000},deviceScaleFactor:1.1})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.evaluate(async()=>{ await fetch('/api/settings',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({settings:{ot:[{name:'Dr. Hamza Alofi',id:'1244',site:'J1',type:'FT',dept:'Orthopedic',spec:'',year:'',month:'',
      days:{Mon:[{f:540,t:780,fill:''}],Sat:[{f:1020,t:1260,fill:''}]}}]}})}); });
  await p.reload(); await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  await nav('OT fixed'); await p.waitForTimeout(1500);
  await p.selectOption('#otMonthSel','9'); await p.waitForTimeout(1000);
  const chk=()=>p.evaluate(()=>{ const c=document.querySelector('.ot-chk'); return c.querySelector('h3').innerText.replace(/\s+/g,' ')+' || '+[...c.querySelectorAll('tbody tr')].map(r=>r.innerText.replace(/\s+/g,' ')).slice(0,4).join(' / '); });
  console.log('Oct check:',await chk());
  await p.click('[data-otview="day"]'); await p.waitForTimeout(800);
  await p.click('.ot-chk [data-otpk$="|fixed"] >> nth=0'); await p.waitForTimeout(2000);
  console.log('after 1 pick:',(await chk()).slice(0,200));
  await p.click('[data-otallm="master"]'); await p.waitForTimeout(2000);
  console.log('after all master:',(await chk()).slice(0,200));
  await p.evaluate(()=>document.querySelector('.ot-chk').scrollIntoView()); await p.screenshot({path:T.out('ot3-a.png')});
  console.log('rules:',await p.evaluate(()=>!!document.getElementById('otRules')));
  // doctor card
  await nav('Doctors'); await p.waitForTimeout(1500);
  await p.selectOption('#f_month','9'); await p.waitForTimeout(1200);
  await p.fill('#q','Hamza Alofi'); await p.waitForTimeout(800);
  console.log('Fixed OT column:',await p.evaluate(()=>{ const ths=[...document.querySelectorAll('#pg-summary thead th')].map(x=>x.innerText.trim()); const r=document.querySelector('#pg-summary tbody tr'); const i=ths.findIndex(x=>/^(OT Fixed|Fixed OT)$/i.test(x)); return i>=0? ths[i]+'='+r.querySelectorAll('td')[i].innerText : 'no column ('+ths.join('|')+')'; }));
  await p.click('#pg-summary tbody tr >> nth=0'); await p.waitForTimeout(1500);
  const card=()=>p.evaluate(()=>{ const c=[...document.querySelectorAll('.card')].find(x=>/Fixed OT sessions/.test(x.innerText)); return c? c.innerText.replace(/\s+/g,' ').slice(0,300) : 'none'; });
  console.log('doctor card:',await card());
  await p.click('#drawer [data-otrule$="|both"] >> nth=0'); await p.waitForTimeout(2000);
  console.log('card after "both":',(await card()).slice(0,140));
  const c=await p.$('text=Fixed OT sessions · October'); if(c) await c.scrollIntoViewIfNeeded();
  await p.screenshot({path:T.out('ot3-b.png')});
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
