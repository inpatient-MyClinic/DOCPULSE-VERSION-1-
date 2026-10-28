/* Stability check: every past issue + a crawler. Reports JUMP / ERROR / FOCUS. */
/* Every page and safe button clicked: no page errors, no scroll jumps, focus kept while typing
   (was stab.js) */
const T=require('../lib/ctx');

const {chromium}=require('playwright-core');
const SP=T.SP;
const problems=[]; const note=(k,m)=>{ problems.push(k+'  '+m); console.log('  ✗ '+k+'  '+m); };
const ok=m=>console.log('  ✓ '+m);
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1600,height:900}});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
  let errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  // seed fixed OT with a clash, so OT tables have rows
  await p.evaluate(async()=>{ await fetch('/api/settings',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({settings:{ot:[{name:'Dr. Hamza Alofi',id:'1244',site:'J1',type:'FT',dept:'Orthopedic',spec:'',year:'',month:'',
      days:{Mon:[{f:540,t:780,fill:''}],Sat:[{f:1020,t:1260,fill:''}]}},{name:'Dr. Mohammed Saad Abdelkader',id:'1907',site:'J1',type:'FT',dept:'Orthopedic',spec:'',year:'',month:'',
      days:{Sun:[{f:540,t:780,fill:''}],Fri:[{f:1020,t:1260,fill:''}]}}]}})}); });
  await p.reload(); await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  const W=ms=>p.waitForTimeout(ms);
  const bodyTop=()=>p.evaluate(()=>{ const b=document.querySelector('.body'); return b?b.scrollTop:0; });
  const boxTop=(sel)=>p.evaluate(s=>{ const n=document.querySelector(s); return n? {t:n.scrollTop,l:n.scrollLeft} : null; },sel);
  // run an action and check nothing moved
  async function steady(name,act,boxes,sel){
    errs=[];
    if(sel&&sel.indexOf('>>')<0){ await p.evaluate(s=>{ try{ const n=document.querySelector(s); if(n&&!n.closest('.ms-pop,#finBox,#drawer,#mgeBox')) n.scrollIntoView({block:'center'}); }catch(e){} },sel); await W(300); }
    const b0=await bodyTop(), x0={}; for(const s of (boxes||[])) x0[s]=await boxTop(s);
    try{ await act(); }catch(e){ note('FAILED',name+': '+e.message.split('\n')[0]); return; }
    await W(1300);
    const b1=await bodyTop();
    let bad=false;
    const room=await p.evaluate(()=>{ const b=document.querySelector('.body'); return b? b.scrollHeight-b.clientHeight : 0; });
    if(Math.abs(b1-b0)>40&&!(b1<b0&&Math.abs(room-b1)<5)){ note('JUMP',name+': page moved '+b0+' → '+b1+' (room '+room+')'); bad=true; }
    for(const s of (boxes||[])){ const a=x0[s], z=await boxTop(s);
      if(a&&z&&(Math.abs(a.t-z.t)>40||Math.abs(a.l-z.l)>40)){ note('JUMP',name+': '+s+' moved '+JSON.stringify(a)+' → '+JSON.stringify(z)); bad=true; } }
    if(errs.length){ note('ERROR',name+': '+errs.join(' | ')); bad=true; }
    if(!bad) ok(name);
  }
  async function typing(name,sel,text){
    errs=[];
    const elx=await p.$(sel); if(!elx){ note('MISSING',name+' ('+sel+')'); return; }
    await elx.click(); await elx.fill('');
    for(const ch of text){ await p.keyboard.type(ch); await W(250); }
    await W(600);
    const st=await p.evaluate(s=>{ const n=document.querySelector(s); return {focus:document.activeElement===n, val:n&&n.value, caret:n&&n.selectionStart}; },sel);
    if(!st.focus) note('FOCUS',name+': lost focus while typing');
    else if(st.val!==text) note('FOCUS',name+': text became "'+st.val+'"');
    else if(st.caret!==text.length) note('FOCUS',name+': cursor moved to '+st.caret);
    else ok(name+' keeps focus and text');
    if(errs.length) note('ERROR',name+': '+errs.join(' | '));
    await p.fill(sel,'').catch(()=>{}); await W(800);
  }
  const scrollBody=y=>p.evaluate(y=>{ const b=document.querySelector('.body'); if(b) b.scrollTop=y; },y);

  console.log('\n— Master schedule: change panel (the reported issue)');
  await nav('Data'); await W(1200);
  await p.setInputFiles('input[data-file="m"]',SP+'back-new2.xlsx'); await W(9000);
  await nav('Master'); await W(1500);
  await p.evaluate(()=>{ const l=document.querySelector('.sd-list'); if(l) l.scrollTop=l.scrollHeight/2; document.querySelector('.sd').scrollIntoView(); });
  await W(400);
  const vis=async(sel)=>p.evaluate(sel=>{ const l=document.querySelector('.sd-list'), r0=l.getBoundingClientRect();
    const c=[...document.querySelectorAll(sel)].find(b=>{ const r=b.getBoundingClientRect(); return r.top>r0.top+20&&r.bottom<r0.bottom-20; }); return c? c.getAttribute(sel.slice(1,-1)) : null; },sel);
  let k=await vis('[data-sdnew]'); if(k) await steady('Use new on a card half-way down the list',()=>p.click(`[data-sdnew="${k}"]`),['.sd-list']);
  k=await vis('[data-sdkeep]'); if(k) await steady('Keep old on a card half-way down',()=>p.click(`[data-sdkeep="${k}"]`),['.sd-list']);
  k=await vis('[data-sdundo]'); if(k) await steady('Undo a choice',()=>p.click(`[data-sdundo="${k}"]`),['.sd-list']);
  k=await vis('[data-sdkeep]'); if(k) await steady('Keep old again',()=>p.click(`[data-sdkeep="${k}"]`),['.sd-list']);
  await steady('Filter chip "More sessions"',()=>p.click('[data-sdf="more"]'),[],'[data-sdf="more"]');
  await steady('Filter chip "All"',()=>p.click('[data-sdf="all"]'),[],'[data-sdf="all"]');
  await steady('Use new for the rest',()=>p.click('#sdAccept'),[],'#sdAccept');
  if(await p.$('#sdSave')) await steady('Save my decisions',()=>p.click('#sdSave'),[],'#sdSave');

  console.log('\n— Dates in the notes card');
  await nav('Master'); await W(1500);
  await p.evaluate(()=>{ const c=document.getElementById('ntCard'); if(c) c.scrollIntoView(); const l=document.querySelector('.nt-list'); if(l) l.scrollTop=l.scrollHeight/3; });
  await W(400);
  const ntVis=async(attr)=>p.evaluate(attr=>{ const l=document.querySelector('.nt-list'); if(!l) return null; const r0=l.getBoundingClientRect();
    const c=[...l.querySelectorAll('['+attr+']')].find(b=>{ const r=b.getBoundingClientRect(); return r.top>r0.top+20&&r.bottom<r0.bottom-20; }); return c? c.getAttribute(attr) : null; },attr);
  let nk=await ntVis('data-ntok'); if(nk) await steady('Confirm a note date half-way down the list',()=>p.click(`[data-ntok="${nk}"]`),['.nt-list']); else note('MISSING','no visible confirm button in notes card');
  nk=await ntVis('data-ntk'); if(nk) await steady('Change the type of a note date',()=>p.selectOption(`[data-ntk="${nk}"]`,'change'),['.nt-list']);
  nk=await ntVis('data-ntf'); if(nk) await steady('Edit a note date',async()=>{ await p.fill(`[data-ntf="${nk}"]`,'2026-03-15'); await p.dispatchEvent(`[data-ntf="${nk}"]`,'change'); },['.nt-list']);
  nk=await ntVis('data-ntskip'); if(nk) await steady('Skip a note date',()=>p.click(`[data-ntskip="${nk}"]`),['.nt-list']);
  await steady('Notes filter chip "Check"',()=>p.click('[data-ntfl="check"]'),[],'[data-ntfl="check"]');
  await steady('Notes filter chip "To confirm"',()=>p.click('[data-ntfl="todo"]'),[],'[data-ntfl="todo"]');

  console.log('\n— Master schedule: week grid');
  await scrollBody(1800); await W(500);
  const rowKey=await p.evaluate(()=>{ const b=document.querySelector('.body').getBoundingClientRect(); const r=[...document.querySelectorAll('#pg-master tr[data-mkey]')].find(x=>{ const q=x.getBoundingClientRect(); return q.top>b.top+150&&q.bottom<b.bottom-50; }); return r&&r.getAttribute('data-mkey'); });
  await p.evaluate(()=>{ const w=document.querySelector('#pg-master .dpg-tw'); if(w) w.scrollLeft=200; });
  if(rowKey){
    await steady('Active ↔ Inactive on a row low on the page',()=>p.click(`[data-mact="${rowKey}"]`),['#pg-master .dpg-tw']);
    await steady('…and back',()=>p.click(`[data-mact="${rowKey}"]`),['#pg-master .dpg-tw']);
    await steady('Per hour ↔ Per session',()=>p.click(`[data-mwhole="${rowKey}"]`),['#pg-master .dpg-tw']);
    await steady('…and back',()=>p.click(`[data-mwhole="${rowKey}"]`),['#pg-master .dpg-tw']);
    await steady('Open the edit pop-up',()=>p.click(`[data-medit="${rowKey}"]`),[]);
    const sel=await p.$('#mgeBox select[data-mgf]');
    if(sel){ const v=await sel.evaluate(s=>s.options[Math.min(s.options.length-1,s.selectedIndex+2)].value);
      await steady('Change a time in the pop-up',()=>sel.selectOption(v),['#mgeBox']);
      const tog=await p.$('#mgeBox [data-mgtog]'); if(tog) await steady('Click a block chip in the pop-up',()=>tog.click(),['#mgeBox']);
      await steady('Save the pop-up',()=>p.click('#mgeBox [data-mgsave]'),['#pg-master .dpg-tw'],'#mgeBox [data-mgsave]');
    } else note('MISSING','edit pop-up did not open');
  } else note('MISSING','no visible row on master page');
  const hk=await p.evaluate(()=>{ const x=document.querySelector('#pg-master [data-mhyb$="|+"]'); if(x){ x.scrollIntoView({block:'center'}); return x.getAttribute('data-mhyb'); } return null; });
  if(hk){ await W(300); await steady('H allowance + on the master row',()=>p.click(`[data-mhyb="${hk}"]`),[]); }
  await scrollBody(1500); await W(300);
  await steady('Branch chip J2',()=>p.click('[data-msite="J2"]'),[],'[data-msite="J2"]');
  await steady('Branch chip All',()=>p.click('[data-msite=""]'),[],'[data-msite=""]');
  await steady('Open Department pick-list',()=>p.click('[data-msb="m|dept"]'),[],'[data-msb="m|dept"]');
  await steady('Tick an option',()=>p.click('.ms-o >> nth=1'),['.ms-list'],'.ms-o >> nth=1');
  await p.keyboard.press('Escape'); await W(500);
  await steady('Pedia month tile',()=>p.click('[data-pdm="9"]'),[],'[data-pdm="9"]');
  await steady('Pedia month tile again (close)',()=>p.click('[data-pdm="9"]'),[],'[data-pdm="9"]');
  await steady('Day board',()=>p.click('#mvDay'),[],'#mvDay');
  await steady('Day board next day',()=>p.click('#dbNext'),[],'#dbNext');
  await steady('Week grid',()=>p.click('#mvWeek'),[],'#mvWeek');
  await typing('Master search box','#mfQ','Hamza');

  console.log('\n— Doctors page and doctor card');
  await nav('Doctors'); await W(1500);
  await p.selectOption('#f_month','9'); await W(1200);
  await scrollBody(1200); await W(300);
  const hy=await p.evaluate(()=>{ const x=document.querySelector('#pg-summary [data-hyb$="|+"]'); if(x){ x.scrollIntoView({block:'center'}); return x.getAttribute('data-hyb'); } return null; });
  if(hy){ await W(300); await steady('H + on the Doctors page',()=>p.click(`[data-hyb="${hy}"]`),[]); }
  await steady('Open Sub reason list',()=>p.click('[data-msb="d|sub"]'),[],'[data-msb="d|sub"]');
  await steady('Tick a sub reason',()=>p.click('.ms-o >> nth=0'),['.ms-list'],'.ms-o >> nth=0');
  await p.keyboard.press('Escape'); await W(400);
  await p.click('[data-msclr="d"]').catch(()=>{}); await W(1500);
  await typing('Doctors search box','#q','Hamza');
  await p.fill('#q','Hamza Alofi'); await W(800);
  await p.click('#pg-summary tbody tr >> nth=0'); await W(1500);
  await p.evaluate(()=>{ const d=document.querySelector('#drawer .dwb')||document.querySelector('#drawer'); d.scrollTop=600; });
  const dsel=await p.evaluate(()=>{ const d=document.querySelector('#drawer .dwb')? '#drawer .dwb' : '#drawer'; return d; });
  const pk=await p.$('#drawer [data-otrule$="|fixed"]');
  if(pk){ await pk.scrollIntoViewIfNeeded(); await steady('OT choice (all days) inside the doctor card',()=>pk.click(),[dsel]); } else note('MISSING','OT table not in doctor card');
  const dd=await p.$('#otDwDays'); if(dd){ await dd.scrollIntoViewIfNeeded(); await steady('Show day by day in the doctor card',()=>dd.click(),[dsel]);
    const pd=await p.$('#drawer [data-otpk$="|master"]'); if(pd){ await pd.scrollIntoViewIfNeeded(); await steady('Single-day OT choice in the doctor card',()=>pd.click(),[dsel]); } }
  const dm=await p.$('#dwMonths [data-m="10"]'); if(dm){ await dm.scrollIntoViewIfNeeded(); await steady('Month row in the doctor card',()=>dm.click(),[dsel]); }
  await p.keyboard.press('Escape'); await W(600);
  await p.fill('#q',''); await W(800);

  console.log('\n— Finance report');
  await p.click('#sumFin'); await W(1500);
  await p.evaluate(()=>{ const b=document.getElementById('finBox'); if(b) b.scrollTop=300; });
  await steady('Finance: open Status list',()=>p.click('[data-msb="f|status"]'),['#finBox'],'[data-msb="f|status"]');
  await steady('Finance: tick a status',()=>p.click('.ms-o >> nth=0'),['#finBox'],'.ms-o >> nth=0');
  await p.keyboard.press('Escape'); await W(400);
  const stillOpen=await p.evaluate(()=>!!document.getElementById('finBox'));
  if(!stillOpen) note('BUG','Esc on a pick-list closed the finance pop-up'); else ok('Esc closes only the pick-list');
  await typing('Finance search box','#finQ','Al');
  await steady('Finance: change month',()=>p.selectOption('#finM','8'),['#finBox']);
  await p.click('#finClose'); await W(500);

  console.log('\n— OT fixed session page');
  await nav('OT fixed'); await W(1500);
  await p.selectOption('#otMonthSel','9'); await W(1000);
  await scrollBody(900); await W(300);
  const vis2=async(attr)=>p.evaluate(attr=>{ const b=document.querySelector('.body').getBoundingClientRect(); const x=[...document.querySelectorAll('#pg-ot ['+attr+']')].find(q=>{ const r=q.getBoundingClientRect(); return r.top>b.top+100&&r.bottom<b.bottom-50; }); return x&&x.getAttribute(attr); },attr);
  let op=await vis2('data-otrule'); if(op) await steady('OT choice (all days) on the OT page',()=>p.click(`[data-otrule="${op}"]`),['#pg-ot .ot-chk .tw']); else note('MISSING','no visible OT choice on OT page');
  await steady('OT view: Day by day',()=>p.click('[data-otview="day"]'),[],'[data-otview="day"]');
  op=await vis2('data-otpk'); if(op) await steady('Single-day OT choice on the OT page',()=>p.click(`[data-otpk="${op}"]`),['#pg-ot .ot-chk .tw']); else note('MISSING','no visible day choice in Day by day');
  await steady('OT view: By doctor',()=>p.click('[data-otview="doc"]'),[],'[data-otview="doc"]');
  await steady('OT filter "Clashes only"',()=>p.click('[data-otfl="clash"]'),[],'[data-otfl="clash"]');
  await steady('OT rules open',()=>p.click('#otRules summary'),[],'#otRules summary');
  await typing('OT search box','#otQ','Ham');

  console.log('\n— Every page, every safe button (crawler)');
  const pages=await p.evaluate(()=>[...document.querySelectorAll('#nav button')].map(x=>x.textContent.replace(/\s+/g,' ').trim()).filter(Boolean));
  const SKIP=/delete|remove|reset|trash|clear|sign ?out|log ?out|upload|export|download|↓|save|restore|deactivate|confirm|keep old|use new|undo|create|approve|apply|import|backup|classic|new look|العربية|english|users|invite|password|generate|copy|print|add|✕|×|close|cancel|leave|switch/i;
  for(const pg of pages){
    await p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.replace(/\s+/g,' ').trim()===n).click(); },pg); await W(1200);
    const pid=await p.evaluate(()=>{ const x=document.querySelector('.pg.on,[id^="pg-"].on'); return x&&x.id; });
    if(!pid) continue;
    const btns=await p.evaluate(pid=>[...document.querySelectorAll('#'+pid+' button')].filter(b=>b.offsetParent&&!b.disabled).map((b,i)=>({i,t:(b.textContent||b.title||'').replace(/\s+/g,' ').trim().slice(0,40)})),pid);
    let n=0, bad=0;
    for(const bt of btns.slice(0,45)){
      if(!bt.t||SKIP.test(bt.t)) continue;
      errs=[];
      const h=await p.evaluate(({pid,i})=>{ const b=[...document.querySelectorAll('#'+pid+' button')].filter(b=>b.offsetParent&&!b.disabled)[i]; if(!b) return false; b.click(); return true; },{pid,i:bt.i});
      if(!h) continue; n++;
      await W(500);
      if(errs.length){ note('ERROR',pg+' → "'+bt.t+'": '+errs.join(' | ')); bad++; }
      await p.keyboard.press('Escape').catch(()=>{});
      const still=await p.evaluate(pid=>{ const x=document.getElementById(pid); return x&&x.classList.contains('on'); },pid);
      if(!still){ await p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.replace(/\s+/g,' ').trim()===n).click(); },pg); await W(800); }
    }
    if(!bad) ok(pg+': '+n+' buttons clicked, no errors');
  }
  console.log('\nRESULT: '+(problems.length? problems.length+' problem(s)' : 'clean'));
  await b.close();
})().catch(e=>{console.error('CRASH',e.message);process.exit(1);});
