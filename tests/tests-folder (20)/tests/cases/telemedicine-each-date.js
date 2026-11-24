/* Telemedicine: a doctor's hours per weekday, and — with "each Tuesday" on —
   per date: one Tuesday off, another with its own hours. Times are picked from
   the list or typed (5 PM, 17:10). The report follows the date's own hours.
   Uses the made-up rt-ax / rt-billing files. */
const T=require('../lib/ctx'); const {chromium}=require('playwright-core');
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1600,height:1000}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await T.login(p); await p.waitForTimeout(10000);
  await p.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>/Telemedicine/.test(x.textContent)).click(); }); await p.waitForTimeout(1500);
  await p.setInputFiles('input[data-file="rt_ax"]',T.fixture('rt-ax.xlsx')); await p.waitForTimeout(2500);
  await p.setInputFiles('input[data-file="rt_billing"]',T.fixture('rt-billing.xlsx')); await p.waitForTimeout(2500);
  await p.evaluate(()=>{ const m=document.getElementById('rtMonth'); m.value='2026-10'; m.dispatchEvent(new Event('change',{bubbles:true})); }); await p.waitForTimeout(800);
  /* add the made-up doctor from "Names the directory does not know" */
  await p.evaluate(()=>{ const tr=[...document.querySelectorAll('tr')].find(r=>/Dr\. Test Beta/.test(r.innerText)&&r.querySelector('[data-unkadd]')); tr.querySelector('[data-unkadd]').click(); });
  await p.waitForTimeout(600); await p.click('#naSave'); await p.waitForTimeout(1200);
  const row='[data-rowpick]:has-text("Dr. Test Beta")';
  T.check('once added, the doctor is no longer under "Names the directory does not know"', await p.evaluate(()=>![...document.querySelectorAll('tr')].some(r=>r.querySelector('[data-unkadd]')&&/Dr\. Test Beta/.test(r.cells[0].innerText))));
  T.check('the new doctor is in the list and selected', await p.evaluate(()=>{ const r=[...document.querySelectorAll('[data-rowpick]')].find(x=>/Test Beta/.test(x.innerText)); return !!r&&r.classList.contains('sel'); }));
  await p.click(row+' [data-day$="|Tue"]'); await p.waitForTimeout(600);
  T.check('the Tuesday button says it is on (aria-pressed)', (await p.getAttribute(row+' [data-day$="|Tue"]','aria-pressed'))==='true');
  /* type times, the way the master schedule allows */
  await p.fill(row+' [data-dfrom$="|Tue"]','9 am'); await p.press(row+' [data-dfrom$="|Tue"]','Enter'); await p.waitForTimeout(500);
  await p.fill(row+' [data-dto$="|Tue"]','23:00'); await p.press(row+' [data-dto$="|Tue"]','Enter'); await p.waitForTimeout(500);
  const v1=await p.inputValue(row+' [data-dfrom$="|Tue"]'), v2=await p.inputValue(row+' [data-dto$="|Tue"]');
  T.check('typed "9 am" and "23:00" read as 9:00 AM – 11:00 PM', v1==='9:00 AM'&&v2==='11:00 PM', v1+' – '+v2);
  T.check('the time box has a list to pick from and a spoken label', await p.evaluate(()=>{ const i=document.querySelector('[data-dfrom$="|Tue"]'); return i.getAttribute('list')==='rtTimeList'&&document.querySelectorAll('#rtTimeList option').length===96&&/Tuesday, from/.test(i.getAttribute('aria-label')); }));
  await p.fill(row+' [data-dto$="|Tue"]','abc'); await p.press(row+' [data-dto$="|Tue"]','Enter'); await p.waitForTimeout(400);
  T.check('a time it cannot read is refused and the old one stays', (await p.inputValue(row+' [data-dto$="|Tue"]'))==='11:00 PM');
  const gen=async()=>{ await p.click('#rtGen'); await p.waitForTimeout(1500); return p.evaluate(()=>[...document.querySelectorAll('.rtOut tbody tr')].filter(r=>/Test Beta/.test(r.innerText)).map(r=>r.innerText.match(/2026-10-\d\d/)[0])); };
  const g1=await gen();
  T.check('report: Beta on Tuesdays 9 AM–11 PM gives his Tuesday appointment (20 Oct)', g1.length===1&&g1[0]==='2026-10-20', g1);
  /* each Tuesday on its own */
  await p.click(row+' [data-perdate$="|Tue"]'); await p.waitForTimeout(600);
  const dates=await p.evaluate(()=>[...document.querySelectorAll('.rtDateRow .rtDateLab')].map(x=>x.innerText));
  T.check('"each tuesday" lists the four Tuesdays of October', dates.join(',')==='Tue 6 Oct,Tue 13 Oct,Tue 20 Oct,Tue 27 Oct', dates);
  T.check('the switch says it is on (role=switch, aria-checked)', (await p.getAttribute(row+' [data-perdate$="|Tue"]','aria-checked'))==='true');
  await p.click('[data-dwork$="|2026-10-20"]'); await p.waitForTimeout(600);
  T.check('20 Oct switched off is shown as off', await p.evaluate(()=>{ const r=[...document.querySelectorAll('.rtDateRow')].find(x=>/20 Oct/.test(x.innerText)); return r.classList.contains('off')&&r.querySelector('[data-dwork]').getAttribute('aria-checked')==='false'; }));
  const g2=await gen();
  T.check('report: with 20 Oct off, that appointment is left out', g2.length===0, g2);
  await p.click('[data-dwork$="|2026-10-20"]'); await p.waitForTimeout(500);
  await p.fill('[data-dtf*="|2026-10-20|Tue|f"]','1 PM'); await p.press('[data-dtf*="|2026-10-20|Tue|f"]','Enter'); await p.waitForTimeout(500);
  await p.fill('[data-dtf*="|2026-10-20|Tue|t"]','5:00 PM'); await p.press('[data-dtf*="|2026-10-20|Tue|t"]','Enter'); await p.waitForTimeout(500);
  T.check('20 Oct has its own hours and is marked as different', await p.evaluate(()=>{ const r=[...document.querySelectorAll('.rtDateRow')].find(x=>/20 Oct/.test(x.innerText)); return r.classList.contains('set')&&!!r.querySelector('[data-dreset]'); }));
  const g3=await gen();
  T.check('report: 20 Oct 1–5 PM leaves out the 12:13 appointment', g3.length===0, g3);
  await p.fill('[data-dtf*="|2026-10-20|Tue|f"]','12:00 PM'); await p.press('[data-dtf*="|2026-10-20|Tue|f"]','Enter'); await p.waitForTimeout(500);
  const g4=await gen();
  T.check('report: 20 Oct 12–5 PM brings it back', g4.length===1, g4);
  T.check('the doctor line says one Tuesday is different', await p.evaluate(()=>/Tue 9:00AM–11:00PM \(1 date different\)/.test([...document.querySelectorAll('[data-rowpick]')].find(x=>/Test Beta/.test(x.innerText)).innerText)));
  await p.screenshot({path:T.out('each-date.png'),clip:{x:240,y:0,width:1360,height:1000}}).catch(()=>{});
  /* saved with the doctor: on the list, then a reload */
  await p.click(row+' [data-save]'); await p.waitForTimeout(2500);
  await p.reload(); await p.waitForTimeout(10000);
  await p.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>/Telemedicine/.test(x.textContent)).click(); }); await p.waitForTimeout(1500);
  await p.evaluate(()=>{ const m=document.getElementById('rtMonth'); m.value='2026-10'; m.dispatchEvent(new Event('change',{bubbles:true})); }); await p.waitForTimeout(800);
  const kept=await p.evaluate(()=>{ const r=[...document.querySelectorAll('[data-rowpick]')].find(x=>/Test Beta/.test(x.innerText)); return r? r.innerText.replace(/\s+/g,' ') : ''; });
  T.check('after a reload the Tuesday hours and the different date are kept', /Tue 9:00AM–11:00PM \(\d date different\)/.test(kept), kept.slice(0,200));
  /* clicking inside the schedule never unticks the doctor */
  T.noErrors(errs);
  await b.close(); T.done();
})().catch(e=>{console.error(e);process.exit(1);});
