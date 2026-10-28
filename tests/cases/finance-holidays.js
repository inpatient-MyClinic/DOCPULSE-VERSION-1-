/* Finance: holidays, KPIs, Holiday column
   (was fin1.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1700,height:1000},deviceScaleFactor:1.2,acceptDownloads:true});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  // holidays: National Day 23 Sep, Eid range 10-12 Sep (pretend), one unnamed
  await nav('Settings'); await p.waitForTimeout(800);
  await p.evaluate(()=>{ [...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Rules').click(); }); await p.waitForTimeout(1000);
  await p.selectOption('#holName','National Day'); await p.fill('#holNew','2026-09-23'); await p.click('#holAdd'); await p.waitForTimeout(1500);
  await p.selectOption('#holName','Eid al-Fitr'); await p.fill('#holNew','2026-09-08'); await p.fill('#holTo','2026-09-10'); await p.click('#holAdd'); await p.waitForTimeout(1500);
  await p.fill('#holNew','2026-09-15'); await p.fill('#holTo',''); await p.selectOption('#holName','Other'); await p.click('#holAdd'); await p.waitForTimeout(1500);
  await p.selectOption('[data-holname="2026-09-15"]',''); await p.waitForTimeout(1500);
  console.log('holidays:',await p.evaluate(()=>[...document.querySelectorAll('.hol-i')].map(x=>x.querySelector('b').textContent+'='+x.querySelector('select').value).join(', ')));
  await p.evaluate(()=>{ const b=document.querySelector('.body'); b.scrollTop=0; }); await p.screenshot({path:T.out('fin-0.png'),clip:{x:300,y:0,width:1400,height:420}});
  await nav('Doctors'); await p.waitForTimeout(1500);
  // doctors page holiday column for Sep for comparison
  await p.selectOption('#f_month','8'); await p.waitForTimeout(1500);
  const hol=await p.evaluate(()=>{ const ths=[...document.querySelectorAll('#pg-summary thead th')].map(x=>x.textContent.trim()); const i=ths.indexOf('Holiday');
    let s=0; [...document.querySelectorAll('#pg-summary tbody tr')].forEach(r=>{ const v=parseFloat((r.querySelectorAll('td')[i]||{}).textContent); if(!isNaN(v)) s+=v; }); return s; });
  await p.click('#sumFin'); await p.waitForTimeout(1500);
  console.log('kpi:',await p.evaluate(()=>[...document.querySelectorAll('.fin-kpi div')].map(x=>x.textContent).join(' | ')));
  console.log('doctors page Holiday column Sep total:',hol);
  console.log('warn:',await p.evaluate(()=>(document.querySelector('.fin-warn')||{}).textContent));
  console.log('FT rows:',await p.evaluate(()=>[...document.querySelectorAll('.fin-t')][0].querySelectorAll('tbody tr').length),'PT rows:',await p.evaluate(()=>[...document.querySelectorAll('.fin-t')][1].querySelectorAll('tbody tr').length));
  console.log('sample:',await p.evaluate(()=>[...document.querySelectorAll('.fin-t tbody tr')].slice(0,4).map(r=>r.textContent).join('\n   ')));
  await p.screenshot({path:T.out('fin-1.png')});
  const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#finX')]);
  await dl.saveAs(SP+'fin.xlsx'); console.log('downloaded',dl.suggestedFilename());
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
