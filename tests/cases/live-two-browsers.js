/* two people, two browsers: what one does shows for the other */
/* Live sync: B sees A's change, same-second edits both kept, typing never interrupted
   (was live1.js) */
const T=require('../lib/ctx');

const {chromium}=require('playwright-core');
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const mk=async(tag)=>{ const c=await b.newContext({viewport:{width:1500,height:900}}); const p=await c.newPage(); p.on('dialog',d=>d.accept());
    p.errs=[]; p.on('pageerror',e=>p.errs.push(tag+': '+e.message));
    p.toasts=[]; await p.exposeFunction('__toast',t=>p.toasts.push(t));
    await p.goto(T.base+'/login.html'); await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
    return p; };
  const A=await mk('A');
  await A.evaluate(async()=>{ await fetch('/api/settings',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({settings:{ot:[{name:'Dr. Hamza Alofi',id:'1244',site:'J1',type:'FT',dept:'Orthopedic',spec:'',year:'',month:'',days:{Mon:[{f:540,t:780,fill:''}],Sat:[{f:1020,t:1260,fill:''}]}}]}})}); });
  await A.reload();
  const B=await mk('B');
  await Promise.all([A.waitForTimeout(12000)]);
  for(const p of [A,B]) await p.evaluate(()=>{ const t=document.getElementById('toast'); new MutationObserver(()=>{ if(t.classList.contains('on')) window.__toast(t.textContent); }).observe(t,{attributes:true,childList:true}); });
  const nav=(p,n)=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  const row=async p=>p.evaluate(()=>{ const r=document.querySelector('#pg-summary tbody tr'); return r? r.innerText.replace(/\s+/g,' ').slice(0,140) : '-'; });
  for(const p of [A,B]){ await nav(p,'Doctors'); await p.waitForTimeout(1200); await p.selectOption('#f_month','9'); await p.waitForTimeout(700); await p.fill('#q','Hamza Alofi'); await p.waitForTimeout(800); }
  const ok=(n,c)=>console.log((c?'  ✓ ':'  ✗ ')+n);
  const b0=await row(B);
  console.log('B before :',b0);
  // 1. A sets the Monday clash to "OT fixed session" in the doctor card
  await A.evaluate(()=>document.querySelector('#pg-summary tbody tr').click()); await A.waitForTimeout(600);
  await A.evaluate(()=>document.querySelector('#drawer [data-otrule$="|fixed"]').click());
  const t0=Date.now(); let b1=b0;
  while(Date.now()-t0<12000){ await B.waitForTimeout(500); b1=await row(B); if(b1!==b0) break; }
  console.log('B after  :',b1,' ('+((Date.now()-t0)/1000).toFixed(1)+' s)');
  ok('B sees A\'s OT choice without reloading', b1!==b0);
  ok('B is told who changed it', B.toasts.some(t=>/Updated by/.test(t)));
  ok('A is not "updated" by its own click', !A.toasts.some(t=>/Updated by/.test(t)));
  await A.keyboard.press('Escape');
  // 2. both change different entries of the same setting at the same moment
  const slots=await A.evaluate(async()=>{ const j=await (await fetch('/api/settings')).json(); return Object.keys(j.settings.otRule||{}); });
  await nav(A,'OT fixed'); await nav(B,'OT fixed'); await A.waitForTimeout(1500);
  await A.evaluate(()=>{ const s=document.querySelector('#otMonthSel'); if(s){ s.value='9'; s.dispatchEvent(new Event('change',{bubbles:true})); } });
  await B.evaluate(()=>{ const s=document.querySelector('#otMonthSel'); if(s){ s.value='9'; s.dispatchEvent(new Event('change',{bubbles:true})); } });
  await A.waitForTimeout(1200);
  await B.evaluate(()=>document.querySelector('[data-otview="day"]').click()); await B.waitForTimeout(800);
  // A: Monday slot → Both ; B: one Monday day → Master, same second
  await Promise.all([
    A.evaluate(()=>document.querySelector('[data-otrule$="|both"]').click()),
    B.evaluate(()=>{ const r=[...document.querySelectorAll('.ot-chk tbody tr')].find(x=>/Monday/.test(x.innerText)); r.querySelector('[data-otpk$="|master"]').click(); })
  ]);
  await A.waitForTimeout(9000);
  const srv=await A.evaluate(async()=>{ const j=await (await fetch('/api/settings')).json(); return {rule:j.settings.otRule,clash:j.settings.otClash}; });
  console.log('server now:',JSON.stringify(srv));
  ok('A\'s slot choice kept', Object.values(srv.rule||{}).includes('both'));
  ok('B\'s day choice kept', Object.values(srv.clash||{}).includes('master'));
  const aView=await A.evaluate(()=>document.querySelector('.ot-chk').innerText.replace(/\s+/g,' ').slice(0,400));
  const bView=await B.evaluate(()=>document.querySelector('.ot-chk').innerText.replace(/\s+/g,' ').slice(0,400));
  console.log('A view:',aView.slice(0,300)); console.log('B view:',bView.slice(0,300));
  const cnt=v=>(v.match(/(\d+) COUNTED/)||[])[1];
  ok('both screens agree with the server after the same-second edits (A '+cnt(aView)+', B '+cnt(bView)+' counted)', cnt(aView)==='8'&&cnt(bView)==='8');
  // 3. a schedule change record made elsewhere (another user) reaches both
  const before=await B.evaluate(()=>document.querySelector('.ot-chk').innerText.length);
  await A.evaluate(async()=>{ await fetch('/api/changes',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-DP-Client':'someone-else'},
    body:JSON.stringify([{id:'cLIVE1',key:'x',kind:'day',day:1,sessions:0,from:'2026-10-01',to:'',note:'live test'}])}); });
  const t1=Date.now(); let gotA=false,gotB=false;
  while(Date.now()-t1<10000){ await A.waitForTimeout(500); gotA=A.toasts.filter(t=>/schedule changes/.test(t)).length>0; gotB=B.toasts.filter(t=>/schedule changes/.test(t)).length>0; if(gotA&&gotB) break; }
  ok('a change record from another person reaches both screens', gotA&&gotB);
  console.log('A toasts',A.toasts,'\nB toasts',B.toasts);
  // 4. typing is never interrupted
  await nav(B,'Doctors'); await B.waitForTimeout(800);
  await B.fill('#q',''); await B.click('#q'); await B.keyboard.type('Ham',{delay:200});
  await A.evaluate(async()=>{ await fetch('/api/settings',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json','X-DP-Client':'someone-else'},body:JSON.stringify({settings:{hrs:4}})}); });
  for(let i=0;i<10;i++){ await B.keyboard.type(['z','a','m','x','y'][i%5],{delay:0}); await B.waitForTimeout(450); }
  const typed=await B.evaluate(()=>({v:document.getElementById('q').value,f:document.activeElement&&document.activeElement.id}));
  ok('B kept typing with focus in the box ('+typed.v+')', typed.f==='q'&&typed.v.length===13);
  // 5. errors
  console.log('errors',A.errs.concat(B.errs));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
