/* Notes after the schedule: start / last day / change dates read and shown
   (was nt1.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1650,height:1000},deviceScaleFactor:1.1})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  const yr=async(name)=>{ await nav('Doctors'); await p.waitForTimeout(1200); await p.fill('#q',name); await p.waitForTimeout(800);
    await p.click('#metric [data-m="s"]').catch(()=>{}); await p.waitForTimeout(500);
    const v=await p.evaluate(()=>{ const ths=[...document.querySelectorAll('#pg-summary thead th')].map(x=>x.textContent.trim().slice(0,3)); const r=document.querySelector('#pg-summary tbody tr'); if(!r) return '-';
      const td=[...r.querySelectorAll('td')]; return ['Jan','Mar','Apr','Jun','Jul','Aug','Dec'].map(m=>m+':'+(td[ths.indexOf(m)]||{}).innerText).join(' '); });
    await p.fill('#q',''); return v; };
  console.log('BEFORE Khaled Albazli :',await yr('Albazli'));
  console.log('BEFORE Mohamad Arab   :',await yr('Mohamad Arab (Head)'));
  await nav('Master'); await p.waitForTimeout(1500);
  console.log('card:',(await p.evaluate(()=>(document.querySelector('.nt-top')||{}).innerText||'none')).replace(/\s+/g,' '));
  console.log('chips:',await p.evaluate(()=>[...document.querySelectorAll('[data-ntfl]')].map(x=>x.innerText.replace(/\s+/g,' ')).join(' | ')),'| all-clear:',await p.evaluate(()=>(document.getElementById('ntAll')||{}).innerText));
  await p.evaluate(()=>document.querySelector('#ntCard').scrollIntoView());
  await p.screenshot({path:T.out('nt-a.png')});
  const rowOf=async(name)=>p.evaluate(n=>{ const r=[...document.querySelectorAll('.nt-row')].find(x=>x.querySelector('.nt-nm').innerText.indexOf(n)>=0); return r? r.innerText.replace(/\s+/g,' ').slice(0,300) : 'not shown'; },name);
  for(const n of ['Albazli','Mohamad Arab','Ibrahim Hameed','Shorooq','Mahdi Bassi','Eyad Ali']) console.log('  row',n.padEnd(14),':',await rowOf(n));
  // confirm Khaled's last day
  const kk=await p.evaluate(()=>{ const r=[...document.querySelectorAll('.nt-row')].find(x=>/Albazli/.test(x.innerText)); return r&&r.querySelector('[data-ntok]').getAttribute('data-ntok'); });
  await p.click(`[data-ntok="${kk}"]`); await p.waitForTimeout(2000);
  console.log('toast:',await p.evaluate(()=>document.getElementById('toast').textContent));
  // Mohamad Arab: "start?" — confirm as start
  const ka=await p.evaluate(()=>{ const r=[...document.querySelectorAll('.nt-row')].find(x=>/Mohamad Arab \(Head\)/.test(x.innerText)); return r&&r.querySelector('[data-ntok]').getAttribute('data-ntok'); });
  await p.click(`[data-ntok="${ka}"]`); await p.waitForTimeout(2000);
  // Ibrahim Hameed: left, no date → must ask for a date
  const ki=await p.evaluate(()=>{ const r=[...document.querySelectorAll('.nt-row')].find(x=>/Ibrahim Hameed/.test(x.innerText)); return r&&r.querySelector('[data-ntok]').getAttribute('data-ntok'); });
  await p.click(`[data-ntok="${ki}"]`); await p.waitForTimeout(800);
  console.log('no-date confirm toast:',await p.evaluate(()=>document.getElementById('toast').textContent));
  await p.fill(`[data-ntt="${ki}|0"]`,'2026-05-31'); await p.dispatchEvent(`[data-ntt="${ki}|0"]`,'change'); await p.waitForTimeout(1500);
  await p.click(`[data-ntok="${ki}"]`); await p.waitForTimeout(2000);
  console.log('after 3 confirms:',(await p.evaluate(()=>(document.querySelector('.nt-top')||{}).innerText)).replace(/\s+/g,' '));
  // versions card shows the dates
  await p.click('[data-mvm="6"]').catch(()=>{}); await p.waitForTimeout(1200);
  console.log('Versions · Jul:',await p.evaluate(()=>(document.querySelector('.mv-nts')||{}).innerText||'none').then(x=>x.replace(/\s+/g,' ')));
  console.log('month tiles:',await p.evaluate(()=>[...document.querySelectorAll('.mv-m')].map(x=>x.innerText.replace(/\s+/g,' ')).filter(x=>/date/.test(x)).join(' | ')));
  await p.evaluate(()=>{ const x=document.querySelector('[data-mvm="6"]'); if(x&&x.classList.contains('mv-look')) x.click(); });
  await p.waitForTimeout(800);
  console.log('AFTER  Khaled Albazli :',await yr('Albazli'));
  console.log('AFTER  Mohamad Arab   :',await yr('Mohamad Arab (Head)'));
  console.log('AFTER  Ibrahim Hameed :',await yr('Ibrahim Hameed'));
  // undo
  await nav('Master'); await p.waitForTimeout(1200);
  await p.click('[data-ntfl="ok"]'); await p.waitForTimeout(800);
  await p.click(`[data-ntundo="${kk}"]`); await p.waitForTimeout(2000);
  console.log('UNDO   Khaled Albazli :',await yr('Albazli'));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
