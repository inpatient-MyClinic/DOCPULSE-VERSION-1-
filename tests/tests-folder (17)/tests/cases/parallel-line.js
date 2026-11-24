/* A parallel clinic written as a second line "Dr. X (1)" (same ID and branch).
   Once his OT fixed sessions carry it, it is not a doctor of its own: the line
   is not counted (the OT is), a closure filed under "(1)" cancels the OT at that
   time and leaves the main clinic alone; a closure under his main name follows
   the Rules for the clinic and also cancels the OT — once, not twice. */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const doc=w.document, wait=ms=>new Promise(r=>setTimeout(r,ms)), r=n=>Math.round((n||0)*1e4)/1e4, Y=+S.settings.year;
  S.settings.ot=[]; api.refresh();
  const find=re=>S.result.rows.filter(t=>t.id==='388'&&t.site==='J1'&&re.test(t.name));
  const par0=find(/\(1\)\s*$/)[0], main0=find(/HC & IHC/)[0];
  T.check('without OT: "(1)" is a line of its own, beside the main one', !!par0 && !!main0);
  T.check('Health flags it as a parallel line not on the OT page', (S.result.parOpen||[]).some(p=>p.key===par0.key));
  const nDocs0=S.result.rows.length;
  /* his parallel clinic as OT fixed sessions — filed under the "(1)" name, like the file's OT sheet */
  const DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], days={}, slots=[];
  par0.spans.forEach((sp,d)=>{ if(sp&&sp.length){ days[DN[d]]=sp.map(x=>({f:x.f,t:x.t,fill:''})); sp.forEach(x=>slots.push({d,f:x.f,t:x.t})); } });
  T.check('the "(1)" line has clinic times to carry ('+slots.map(s=>DN[s.d]+' '+s.f/60+'–'+s.t/60).join(', ')+')', slots.length>0);
  S.settings.ot=[{name:par0.name,id:'388',site:'J1',type:'FT',dept:'Family Medicine',spec:'',year:'',month:'',days}];
  S.settings.otRule={}; api.refresh();
  let main=find(/HC & IHC/)[0];
  slots.forEach(s=>{ S.settings.otRule[main.key+'|'+s.d+'|'+s.f+'-'+s.t]='both'; });
  api.refresh(); main=find(/HC & IHC/)[0];
  T.check('with OT: the "(1)" doctor is gone from the list', !find(/\(1\)\s*$/).length && S.result.rows.length===nDocs0-1);
  T.check('…merged into the main doctor', (main.parLines||[]).length===1 && (S.result.parMerged||[]).length>=1 && !(S.result.parOpen||[]).some(p=>p.id==='388'));
  T.check('…his OT fixed sessions are counted on him', main.yot>0);
  /* pick an October day with the parallel clinic */
  const m=9, sl=slots[0]; let day=1; for(;day<=28;day++){ if(new Date(Date.UTC(Y,m,day)).getUTCDay()===sl.d&&main.m&&api.schedPlanMap(main,Y,m)[day]>=0) break; }
  const at=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  const rows=S.capacity.rows, tpl=rows.find(x=>x.status&&/close/i.test(x.status));
  const counted=Object.keys(S.rules).find(k=>S.rules[k].include==='Y'&&/ALL/i.test(S.rules[k].filter||'ALL')&&/^personal.*emergenc/.test(k));
  const why=rows.find(x=>x._key===counted);
  const close=(name)=>{ const x=Object.assign({},tpl,{main:why.main,sub:why.sub,id:'388',site:'J1',name,empStatus:'FT',status:'Close',date:{y:Y,m,d:day},from:at(sl.f),to:at(sl.t),hours:(sl.t-sl.f)/60,row:99800+rows.length}); rows.push(x); return x; };
  const snap=()=>{ const t=find(/HC & IHC/)[0]; return {c:r(t.m[m].c),ot:r(t.m[m].ot),t:r(t.m[m].t)}; };
  const bk=()=>{ S.bk.month=String(m); const x=api.bkRows().find(b=>b.t.key===main.key); return {blk:r(x.blocked),ot:r(x.ot)}; };
  const a0=snap(), k0=bk();
  const x1=close(par0.name); api.refresh(); const a1=snap(), k1=bk();
  console.log('Oct',day,DN[sl.d],at(sl.f)+'–'+at(sl.t),'| before',JSON.stringify(a0),'| close under (1)',JSON.stringify(a1),'| breakdown',JSON.stringify(k0),'→',JSON.stringify(k1));
  T.check('closure under "(1)": his OT fixed session at that time is cancelled', a1.ot===r(a0.ot-1));
  T.check('…his main clinic is not taken (Closed unchanged)', a1.c===a0.c && a1.t===r(a0.t-1));
  T.check('…the row says why', x1._used===false && /parallel line/.test(x1._why));
  T.check('…Session breakdown agrees: OT −1, no extra block', k1.ot===r(k0.ot-1) && k1.blk===k0.blk);
  const x2=close(main.name); api.refresh(); const a2=snap();
  console.log('…and a closure under the main name too',JSON.stringify(a2));
  const onMain=(find(/HC & IHC/)[0].spans[sl.d]||[]).some(x=>x.f<sl.t&&sl.f<x.t);
  console.log('his main clinic on '+DN[sl.d]+':',JSON.stringify(find(/HC & IHC/)[0].spans[sl.d]),'overlaps the OT time:',onMain);
  if(onMain) T.check('closure under the main name too: the clinic follows the Rules (Closed +1)', a2.c===r(a0.c+1));
  else T.check('closure under the main name, no main clinic then: only the OT was there, counted once (Closed unchanged)', a2.c===a0.c && /counted once, as the OT/.test(x2._why));
  /* a closure under the main name at his main clinic time: the Rules decide, as always */
  const mc=(()=>{ for(let d2=1;d2<=28;d2++){ const wd=new Date(Date.UTC(Y,m,d2)).getUTCDay(); const sp=(find(/HC & IHC/)[0].spans[wd]||[]).find(x=>!slots.some(s=>s.d===wd&&s.f<x.t&&x.f<s.t)); if(sp&&d2!==day&&api.schedPlanMap(find(/HC & IHC/)[0],Y,m)[d2]>0) return {d2,sp}; } return null; })();
  if(mc){ const x3=Object.assign({},x2,{date:{y:Y,m,d:mc.d2},from:at(mc.sp.f),to:at(mc.sp.t),hours:(mc.sp.t-mc.sp.f)/60,row:99799}); rows.push(x3); api.refresh(); const a3=snap();
    T.check('closure under the main name at his main clinic: Closed +1, OT untouched', a3.c===r(a2.c+1) && a3.ot===a2.ot); rows.splice(rows.indexOf(x3),1); api.refresh(); }
  T.check('…and the OT is cancelled once, not twice', a2.ot===a1.ot);
  /* the card */
  api.openDrawer(main.key); S.dw.month=m; S.dw.mode='all'; api.renderDrawer(); await wait(200);
  const dw=doc.getElementById('drawer').textContent;
  T.check('card: says the "(1)" line is the same doctor, counted through his OT', /Parallel clinic/.test(dw) && dw.indexOf(par0.name)>=0);
  T.check('card: the "(1)" request is listed with what it did', /parallel line/.test(dw) && /cancels his OT fixed session/.test(dw));
  rows.splice(rows.indexOf(x1),1); rows.splice(rows.indexOf(x2),1);
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
