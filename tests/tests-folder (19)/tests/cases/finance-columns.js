/* Finance: Session / Close / Open / Total columns and filters
   (was fin2.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1700,height:1000},deviceScaleFactor:1.1,acceptDownloads:true});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  await nav('Doctors'); await p.waitForTimeout(1500);
  await p.selectOption('#f_month','8'); await p.waitForTimeout(1500);
  // doctors page values for a sample doctor, Sep: sessions/closed/opened/total
  const docVals=async(name)=>{ const r={}; for(const m of ['s','c','o','t']){ await p.click(`#metric [data-m="${m}"]`).catch(()=>{}); await p.waitForTimeout(500);
      r[m]=await p.evaluate(n=>{ const ths=[...document.querySelectorAll('#pg-summary thead th')].map(x=>x.textContent.trim().slice(0,3)); const i=ths.indexOf('Sep');
        const row=[...document.querySelectorAll('#pg-summary tbody tr')].find(x=>x.innerText.indexOf(n)>=0); return row? row.querySelectorAll('td')[i].innerText.trim() : '-'; },name); } return r; };
  await p.click('#sumFin'); await p.waitForTimeout(1500);
  const heads=await p.evaluate(()=>[...document.querySelectorAll('.fin-t')][0].querySelector('thead').innerText.replace(/\s+/g,' | '));
  console.log('headers:',heads);
  const first=await p.evaluate(()=>{ const r=[...document.querySelectorAll('.fin-t tbody tr')].find(x=>x.querySelectorAll('td').length>5); return [...r.querySelectorAll('td')].map(x=>x.innerText.trim()); });
  console.log('row:',first.join(' | '));
  const tot=await p.evaluate(()=>[...document.querySelectorAll('.fin-t tbody tr')].filter(x=>x.querySelectorAll('td').length>12).map(r=>{ const v=[...r.querySelectorAll('td')].map(x=>parseFloat(x.innerText.replace('−','-').replace('+',''))||0); return Math.abs(v[5]+v[6]+v[7]-v[12])<0.02; }));
  console.log('Total = Session − Close + Open on every row:',tot.every(Boolean),tot.length,'rows');
  await p.screenshot({path:T.out('fin2-a.png')});
  // filters
  const n0=await p.evaluate(()=>document.querySelectorAll('.fin-t tbody tr').length);
  await p.click('[data-msb="f|site"]'); await p.waitForTimeout(400);
  await p.click('.ms-o >> nth=0'); await p.waitForTimeout(600);
  const n1=await p.evaluate(()=>document.querySelectorAll('.fin-t tbody tr').length);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const stillOpen=await p.evaluate(()=>!!document.getElementById('finBox'));
  console.log('rows all',n0,'→ one branch',n1,'| finance pop-up still open after Esc on list:',stillOpen);
  await p.click('[data-msb="f|status"]'); await p.waitForTimeout(400);
  console.log('status options:',await p.evaluate(()=>[...document.querySelectorAll('.ms-o')].map(x=>x.innerText.replace(/\s+/g,' ')).join(' / ')));
  await p.keyboard.press('Escape');
  const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#finX')]);
  await dl.saveAs(SP+'fin2.xlsx'); console.log('downloaded',dl.suggestedFilename());
  await p.click('#finClose').catch(()=>{});
  // sub reason filter on Doctors page
  await p.selectOption('#f_month',''); await p.waitForTimeout(1200);
  const d0=await p.evaluate(()=>document.querySelectorAll('#pg-summary tbody tr').length);
  await p.click('[data-msb="d|sub"]'); await p.waitForTimeout(400);
  const subs=await p.evaluate(()=>[...document.querySelectorAll('.ms-o')].map(x=>x.innerText.replace(/\s+/g,' ')));
  console.log('sub reasons:',subs.length,subs.slice(0,6).join(' / '));
  await p.click('.ms-o >> nth=0'); await p.waitForTimeout(1500);
  await p.click('.ms-o >> nth=1'); await p.waitForTimeout(1500);
  const d1=await p.evaluate(()=>document.querySelectorAll('#pg-summary tbody tr').length);
  console.log('doctors all',d0,'→ with 2 sub reasons',d1,'| tokens',await p.evaluate(()=>[...document.querySelectorAll('#pg-summary .ms-tok')].map(x=>x.innerText.replace(/\s+/g,' ')).join(' ; ')));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.screenshot({path:T.out('fin2-b.png'),clip:{x:250,y:250,width:1450,height:600}});
  await p.click('[data-msclr="d"]'); await p.waitForTimeout(1500);
  console.log('after clear',await p.evaluate(()=>document.querySelectorAll('#pg-summary tbody tr').length));
  // validation sheet filters
  await p.selectOption('#f_month','8'); await p.waitForTimeout(1200);
  await p.click('#genVal'); await p.waitForTimeout(2500);
  const vb=await p.evaluate(()=>[...document.querySelectorAll('[data-msb^="v|"]')].map(x=>x.innerText.replace(/\s+/g,' ')));
  console.log('validation filters:',vb.join(' / '));
  const v0=await p.evaluate(()=>(document.querySelector('#pg-summary .fb .hint')||{}).innerText);
  await p.click('[data-msb="v|status"]'); await p.waitForTimeout(400); await p.click('.ms-o >> nth=0'); await p.waitForTimeout(1500);
  const v1=await p.evaluate(()=>[...document.querySelectorAll('#pg-summary .fb .hint')].map(x=>x.innerText).join(' '));
  console.log('validation',v0,'→',v1);
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
