/* The doctor card: an OT Fixed tile right after Opened and before Net total /
   Expected; an OT Fixed column after Opened in Month by month; the month's
   schedule fits the card (Fri and Sat used to be cut off); the weekly template
   is drawn with the Master schedule's AM / AF / PM chips; "Nothing looks off
   in ." had no month. */
const T=require('../lib/ctx'); const {chromium}=require('playwright-core');
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1500,height:950}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await T.login(p);
  await p.evaluate(async()=>{ await fetch('/api/settings',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({settings:{ot:[{name:'Dr. Mohamed Elsherife',id:'2037',site:'J3',type:'FT',dept:'',spec:'',year:'',month:'',days:{Sat:[{f:780,t:1020,fill:''},{f:1020,t:1260,fill:''}]}}],otRule:{'2037|J3|drmohamedelsherife|6|780-1020':'both','2037|J3|drmohamedelsherife|6|1020-1260':'both'}}})}); });
  await p.reload(); await p.waitForTimeout(12000);
  await p.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf('Doctors')>=0).click(); }); await p.waitForTimeout(1200);
  await p.selectOption('#f_month','9'); await p.waitForTimeout(800); await p.fill('#q','2037'); await p.waitForTimeout(900);
  const rowJ3=(await p.$$('#pg-summary tbody tr')).length; 
  await p.evaluate(()=>{ const r=[...document.querySelectorAll('#pg-summary tbody tr')].find(x=>/J3/.test(x.innerText)); r.click(); }); await p.waitForTimeout(1200);
  const info=await p.evaluate(()=>{
    const rail=[...document.querySelectorAll('#drawer .rail .st .k')].map(x=>x.innerText.trim().toUpperCase());
    const otv=[...document.querySelectorAll('#drawer .rail .st')].find(x=>/OT FIXED/i.test(x.querySelector('.k').innerText));
    const mb=[...document.querySelectorAll('#drawer .card')].find(x=>/Month by month/.test(x.innerText));
    const heads=mb? [...mb.querySelectorAll('thead th')].map(x=>x.innerText.trim().toUpperCase()) : [];
    const oct=mb? [...mb.querySelectorAll('tbody tr')][9].innerText.replace(/\s+/g,' ') : '';
    const sch=document.querySelector('#drawer .pdw'), cardR=sch&&sch.getBoundingClientRect();
    const days=sch? [...sch.querySelectorAll('.pdw-d')].map(d=>d.getBoundingClientRect()) : [];
    const wt=[...document.querySelectorAll('#drawer .card')].find(x=>/Weekly template|Main sheet template/.test(x.querySelector('h3').innerText));
    const ent=[...document.querySelectorAll('#drawer .card')].find(x=>/Entries to check/.test(x.innerText));
    return {rail, ot:otv? otv.querySelector('.v').innerText : null, heads, oct,
      fits: days.length===7 && days.every(r=>r.right<=cardR.right+1 && r.width>40),
      chips: wt? wt.querySelectorAll('.dpg-c').length : 0, times: wt? /\d(AM|PM)–/.test(wt.innerText) : null,
      ent: ent? ent.innerText.replace(/\s+/g,' ') : '' }; });
  console.log(JSON.stringify(info).slice(0,600));
  const ix=k=>info.rail.indexOf(k);
  T.check('card tile OT Fixed sits after Opened and before Net total and Expected', ix('OT FIXED')===ix('OPENED')+1 && ix('OT FIXED')<ix('EXPECTED') && ix('OT FIXED')<ix('NET TOTAL'), info.rail);
  T.check('card tile shows 10 OT Fixed for October', info.ot==='10', info.ot);
  const h=info.heads;
  T.check('Month by month: OT Fixed column right after Opened, before Expected', h.indexOf('OT FIXED')===h.indexOf('OPENED')+1 && h.indexOf('EXPECTED')===h.indexOf('OT FIXED')+1, h);
  T.check('Month by month: October row shows the 10', / 10 /.test(' '+info.oct+' '), info.oct);
  T.check('the month\'s schedule shows all seven days inside the card', info.fits);
  T.check('weekly template drawn with AM / AF / PM chips like the Master schedule', info.chips>=12 && info.times===false, {chips:info.chips,times:info.times});
  T.check('"Nothing looks off in …" names the month', !/ in \./.test(info.ent), info.ent);
  T.noErrors(errs);
  await b.close(); T.done();
})().catch(e=>{console.error(e);process.exit(1);});
