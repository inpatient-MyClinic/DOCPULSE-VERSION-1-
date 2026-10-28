/* Pedia on/off, month rows in the card
   (was pd1.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1700,height:1000},deviceScaleFactor:1.2})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  const docRow=async(name)=>p.evaluate(n=>{ const ths=[...document.querySelectorAll('#pg-summary thead th')].map(x=>x.textContent.trim().slice(0,3));
    const r=[...document.querySelectorAll('#pg-summary tbody tr')].find(x=>x.innerText.indexOf(n)>=0); if(!r) return '-';
    const tds=[...r.querySelectorAll('td')]; const out={}; ['Jun','Jul','Aug','Sep','Oct','Nov','Dec'].forEach(m=>{const i=ths.indexOf(m); if(i>=0) out[m]=tds[i]&&tds[i].innerText.trim();}); return JSON.stringify(out); },name);
  await nav('Doctors'); await p.waitForTimeout(1500);
  await p.click('#metric [data-m="s"]').catch(()=>{}); await p.waitForTimeout(800);
  for(const n of ['Mervat','Hasnaa Ali','Turki Alahmadi','Taha Samman']) console.log('ON ',n.padEnd(16),await docRow(n));
  await nav('Master'); await p.waitForTimeout(1500);
  console.log('card:',(await p.evaluate(()=>(document.querySelector('.pd-card')||{}).innerText||'none')).replace(/\s+/g,' ').slice(0,400));
  await p.click('[data-pdm="9"]'); await p.waitForTimeout(800);
  console.log('oct rows:',await p.evaluate(()=>document.querySelectorAll('.pd-t tbody tr').length));
  await p.evaluate(()=>document.querySelector('.pd-card').scrollIntoView());
  await p.screenshot({path:T.out('pd-1.png')});
  await p.click('.pd-sw'); await p.waitForTimeout(2500);
  await nav('Doctors'); await p.waitForTimeout(1500);
  for(const n of ['Mervat','Hasnaa Ali','Turki Alahmadi']) console.log('OFF',n.padEnd(16),await docRow(n));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
