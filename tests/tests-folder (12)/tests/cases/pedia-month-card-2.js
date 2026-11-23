/* Same as pedia-month-card, second scenario
   (was pd3.js) */
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
  // Doctors page, October
  await nav('Doctors'); await p.waitForTimeout(1500);
  await p.selectOption('#f_month','9'); await p.waitForTimeout(1200);
  await p.fill('#q','Mervat'); await p.waitForTimeout(800);
  await p.click('#metric [data-m="s"]').catch(()=>{}); await p.waitForTimeout(600);
  console.log('Doctors page, Oct rows:',await p.evaluate(()=>[...document.querySelectorAll('#pg-summary tbody tr')].map(r=>r.innerText.replace(/\s+/g,' ').slice(0,140)).join('\n   ')));
  await p.click('#pg-summary tbody tr >> nth=0'); await p.waitForTimeout(1200);
  console.log('pop-up schedule:',await p.evaluate(()=>(document.querySelector('.pdw')||{}).innerText||'none').then(x=>x.replace(/\s+/g,' ').slice(0,260)));
  await p.evaluate(()=>document.querySelector('.pdw').scrollIntoView());
  await p.screenshot({path:T.out('pd2-a.png')});
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  // Master, month select Oct
  await nav('Master'); await p.waitForTimeout(1500);
  await p.selectOption('#mfMonth','9'); await p.waitForTimeout(1500);
  console.log('master note:',await p.evaluate(()=>[...document.querySelectorAll('.mv-prev,.pd-note')].map(x=>x.innerText.replace(/\s+/g,' ')).join(' || ')));
  await p.fill('#mfQ','Mervat'); await p.waitForTimeout(800);
  console.log('master Hasnaa row:',await p.evaluate(()=>[...document.querySelectorAll('#pg-master tr[data-mkey]')].map(r=>r.innerText.replace(/\s+/g,' ').slice(0,200)).join('\n   ')));
  await p.evaluate(()=>document.querySelector('.pd-note').scrollIntoView());
  await p.screenshot({path:T.out('pd2-b.png')});
  await p.selectOption('#mfMonth',''); await p.waitForTimeout(1200);
  console.log('current master Hasnaa row:',await p.evaluate(()=>[...document.querySelectorAll('#pg-master tr[data-mkey]')].map(r=>r.innerText.replace(/\s+/g,' ').slice(0,200)).join('\n   ')));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
