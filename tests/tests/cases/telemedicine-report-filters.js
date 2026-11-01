/* Telemedicine, after Generate: every filter above the report works (they
   were drawn but never connected), search, Clear, Export Excel at the top,
   and "Choose all" picks what the filters show. Uses two small made-up files
   (rt-ax.xlsx, rt-billing.xlsx) — no real names. */
const T=require('../lib/ctx'); const {chromium}=require('playwright-core');
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1600,height:1000},acceptDownloads:true});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>{ errs.push('dialog: '+d.message()); d.accept(); });
  await T.login(p); await p.waitForTimeout(10000);
  await p.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>/Telemedicine/.test(x.textContent)).click(); }); await p.waitForTimeout(1500);
  await p.setInputFiles('input[data-file="rt_ax"]',T.fixture('rt-ax.xlsx')); await p.waitForTimeout(3000);
  await p.setInputFiles('input[data-file="rt_billing"]',T.fixture('rt-billing.xlsx')); await p.waitForTimeout(3000);
  await p.evaluate(()=>{ const m=document.getElementById('rtMonth'); m.value='2026-10'; m.dispatchEvent(new Event('change',{bubbles:true})); }); await p.waitForTimeout(800);
  await p.click('#rtGen'); await p.waitForTimeout(2500);
  await p.screenshot({path:T.out('after-gen.png'),fullPage:false});
  const why=await p.evaluate(()=>{ const n=document.querySelector('#pg-rtm .note'); const c=[...document.querySelectorAll('.card')].find(x=>/^Report/.test(x.querySelector('h3')&&x.querySelector('h3').innerText)); const t=c? c.querySelector('.note') : null; return t? t.innerText.replace(/\s+/g,' ') : ''; });
  T.check('the report says how many appointments were read and why some are missing ('+why.slice(0,90)+')', /60 appointments read/.test(why) && /status other than Checked-in/.test(why), why);
  const rows=()=>p.evaluate(()=>document.querySelectorAll('.rtOut tbody tr').length);
  const all=await rows();
  T.check('Generate gives a report ('+all+' rows)', all>20, all);
  const pickSel=async(k,v)=>{ await p.selectOption('select[data-rtf="'+k+'"]',v); await p.waitForTimeout(700); return rows(); };
  const blank=await pickSel('bill','blank');
  T.check('Billing filter "no billing line" narrows the report ('+blank+' of '+all+')', blank>0&&blank<all);
  await pickSel('bill','');
  const free=await pickSel('pf','FREE');
  const allFree=await p.evaluate(()=>[...document.querySelectorAll('.rtOut tbody tr')].every(r=>/FREE/.test(r.innerText)));
  T.check('PAID/FREE filter keeps only FREE rows ('+free+')', free>0&&free<all&&allFree);
  await pickSel('pf','');
  const rtmNo=await pickSel('rtm','No'); T.check('RTM filter works ('+rtmNo+')', rtmNo>0&&rtmNo<all);
  await pickSel('rtm','');
  const doc=await pickSel('res','Dr. Test Beta');
  const onlyBeta=await p.evaluate(()=>[...document.querySelectorAll('.rtOut tbody tr')].every(r=>/Test Beta/.test(r.innerText)));
  T.check('Doctor filter keeps one doctor ('+doc+')', doc>0&&doc<all&&onlyBeta);
  const dayOpts=await p.evaluate(()=>[...document.querySelectorAll('select[data-rtf="day"] option')].map(o=>o.value).filter(Boolean));
  const day=await pickSel('day',dayOpts[0]);
  T.check('Day filter combines with the doctor filter ('+day+')', day>0&&day<doc);
  await pickSel('day',''); await pickSel('res','');
  await p.click('#rtFq'); await p.keyboard.type('APT01006',{delay:30}); await p.waitForTimeout(900);
  const one=await rows(), foc=await p.evaluate(()=>document.activeElement&&document.activeElement.id);
  T.check('search finds one appointment and keeps the cursor in the box', one===1 && foc==='rtFq', {rows:one,focus:foc});
  await p.click('#rtFclear'); await p.waitForTimeout(700);
  T.check('Clear brings every row back', (await rows())===all);
  await pickSel('res','Dr. Test Gamma');
  await p.click('#rtPickNone'); await p.waitForTimeout(500); await p.click('#rtPickAll'); await p.waitForTimeout(700);
  const chosen=await p.evaluate(()=>{ const t=[...document.querySelectorAll('.card h3')].find(h=>/What you chose/.test(h.innerText)); return t? t.innerText : ''; });
  const gamma=await rows();
  T.check('Choose all picks only what the filter shows ('+gamma+')', new RegExp('\\b'+gamma+' rows','i').test(chosen.replace(/\s+/g,' ')), chosen);
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:8000}).catch(()=>null), p.click('#rtXlsxTop')]);
  T.check('Export Excel at the top downloads the filtered rows', !!dl && /telemedicine/i.test(dl.suggestedFilename()), dl&&dl.suggestedFilename());
  T.noErrors(errs);
  await b.close(); T.done();
})().catch(e=>{console.error(e);process.exit(1);});
