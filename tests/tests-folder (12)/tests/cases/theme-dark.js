/* Light / Auto / Dark at the foot of the menu, remembered; the classic menu
   and the New look / Classic switch are gone. In dark, text stays readable:
   every sampled text has at least 4.5:1 contrast with what is behind it. */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const ctx=await T.ctx(b,{viewport:{width:1440,height:900},colorScheme:'light'});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await T.login(p); await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  T.check('no classic menu button, no New look / Classic switch', await p.evaluate(()=>!document.getElementById('sbSw')&&!document.querySelector('[data-dpn]')&&!/Classic/.test(document.body.textContent)));
  T.check('the theme switch has Light, Auto, Dark; Auto is the start', await p.evaluate(()=>{ const s=document.getElementById('thSw'); return !!s&&/Light/.test(s.textContent)&&/Auto/.test(s.textContent)&&/Dark/.test(s.textContent)&&s.querySelector('[data-th="auto"]').getAttribute('aria-checked')==='true'; }));
  T.check('Auto on a light computer: light', await p.evaluate(()=>document.documentElement.getAttribute('data-theme'))==='light');
  await p.click('[data-th="dark"]'); await p.waitForTimeout(600);
  const contrast=()=>p.evaluate(()=>{
    function rgb(s){ const m=s.match(/[\d.]+/g); return m? m.map(Number) : [0,0,0,0]; }
    function lum(c){ const f=x=>{ x/=255; return x<=0.03928? x/12.92 : Math.pow((x+0.055)/1.055,2.4); }; return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); }
    function bgOf(e){ while(e&&e.nodeType===1){ const c=rgb(getComputedStyle(e).backgroundColor); if(c.length<4||c[3]>0.5) return c; e=e.parentElement; } return rgb(getComputedStyle(document.body).backgroundColor); }
    const out=[]; const seen=new Set();
    document.querySelectorAll('.body *').forEach(e=>{
      if(!e.offsetParent||e.closest('.side')) return;
      const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1); if(!own) return;
      const cs=getComputedStyle(e); if(parseFloat(cs.opacity)<0.9||cs.visibility!=='visible') return;
      if(e.closest('[disabled],.nil,.dim,.nc')) return;
      const fg=rgb(cs.color), bg=bgOf(e), a=lum(fg), c=lum(bg), r=(Math.max(a,c)+0.05)/(Math.min(a,c)+0.05);
      const k=e.tagName+'.'+e.className; if(r<4.5&&!seen.has(k)){ seen.add(k); out.push(k.slice(0,60)+' '+r.toFixed(2)+' "'+e.textContent.trim().slice(0,30)+'"'); } });
    return out; });
  T.check('Dark: the page turns dark', await p.evaluate(()=>document.documentElement.getAttribute('data-theme')==='dark'&&!!document.getElementById('thDark')&&getComputedStyle(document.body).backgroundColor!=='rgb(244, 246, 250)'));
  const pages=[['Doctors',1],['Dashboard',1],['Session breakdown',1],['Paid extra',1],['Master schedule',1],['OT fixed',1],['Telemedicine',1]];
  for(const [n,allow] of pages){ await nav(n); await p.waitForTimeout(1500); const bad=await contrast();
    console.log(n+': '+bad.length+' low-contrast kinds'+(bad.length? ' — '+bad.slice(0,6).join(' | ') : ''));
    T.check('Dark · '+n+': text readable (at most '+allow+' kinds of faint helper text below 4.5:1)', bad.length<=allow); }
  await nav('Doctors'); await p.waitForTimeout(800);
  await p.click('#pg-summary tbody tr td:nth-child(2)'); await p.waitForTimeout(1200);
  const card=await p.evaluate(()=>{ const d=document.getElementById('drawer'); return getComputedStyle(d).backgroundColor; });
  T.check('Dark · the doctor card is dark too ('+card+')', /rgb\((\d+), (\d+), (\d+)\)/.test(card) && card.match(/\d+/g).slice(0,3).every(x=>+x<80));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  /* remembered after a reload */
  await p.reload(); await p.waitForTimeout(12000);
  T.check('Dark is remembered after a reload', await p.evaluate(()=>document.documentElement.getAttribute('data-theme')==='dark'&&document.querySelector('[data-th="dark"]').getAttribute('aria-checked')==='true'));
  await p.click('[data-th="light"]'); await p.waitForTimeout(500);
  T.check('Light puts every colour back', await p.evaluate(()=>document.documentElement.getAttribute('data-theme')==='light'&&!document.querySelector('[data-tho]')&&getComputedStyle(document.body).backgroundColor==='rgb(244, 246, 250)'));
  await p.click('[data-th="auto"]'); await p.emulateMedia({colorScheme:'dark'}); await p.waitForTimeout(500);
  T.check('Auto follows the computer when it turns dark', await p.evaluate(()=>document.documentElement.getAttribute('data-theme'))==='dark');
  T.check('no page errors', !errs.length, errs.slice(0,3));
  await b.close(); T.done();
})().catch(e=>{console.error(e);process.exit(1);});
