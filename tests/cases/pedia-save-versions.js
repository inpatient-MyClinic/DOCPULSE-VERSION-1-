/* Pedia Format months saved to Versions
   (was pv1.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1700,height:1000},deviceScaleFactor:1.1})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  await nav('Master'); await p.waitForTimeout(2500);
  const card=()=>p.evaluate(()=>(document.querySelector('.pd-card')||{}).innerText||'').then(x=>x.replace(/\s+/g,' ').slice(0,420));
  console.log('before:',await card());
  await p.click('#pdSaveV'); await p.waitForTimeout(9000);
  console.log('after :',await card());
  console.log('versions card:',await p.evaluate(()=>[...document.querySelectorAll('.mv-m')].map(x=>x.innerText.replace(/\s+/g,' ')).join(' | ')));
  await p.click('#pdSaveV').catch(()=>console.log('  (no save button — all saved)'));
  await p.waitForTimeout(1500);
  console.log('2nd press toast:',await p.evaluate(()=>document.getElementById('toast').textContent));
  // month view of Oct shows the version
  await p.selectOption('#mfMonth','9'); await p.waitForTimeout(3000);
  console.log('Oct banner:',await p.evaluate(()=>[...document.querySelectorAll('.mv-prev,.pd-note')].map(x=>x.innerText.replace(/\s+/g,' ')).join(' || ')));
  await p.fill('#mfQ','Mervat'); await p.waitForTimeout(800);
  console.log('Mervat Oct row:',await p.evaluate(()=>[...document.querySelectorAll('#pg-master tr[data-mkey]')].map(r=>r.innerText.replace(/\s+/g,' ').slice(0,160)).join(' / ')));
  // switch Pedia off: pop-up should explain and fall back to the Oct version
  await p.selectOption('#mfMonth',''); await p.fill('#mfQ',''); await p.waitForTimeout(800);
  await p.click('.pd-sw'); await p.waitForTimeout(2500);
  await nav('Doctors'); await p.waitForTimeout(1500);
  await p.selectOption('#f_month','9'); await p.waitForTimeout(1200);
  await p.fill('#q','Mervat'); await p.waitForTimeout(800);
  await p.click('#pg-summary tbody tr >> nth=0'); await p.waitForTimeout(3000);
  console.log('pop-up (Pedia off):',await p.evaluate(()=>(document.querySelector('.pdw')||{}).innerText||'none').then(x=>x.replace(/\s+/g,' ').slice(0,420)));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
