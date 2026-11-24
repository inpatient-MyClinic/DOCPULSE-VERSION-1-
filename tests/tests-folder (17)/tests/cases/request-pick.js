/* Requests on the doctor card:
   - a request logged under "Dr. X (1)" is his parallel session, not a double
     of the same request under his main name — no "possible double entry";
   - the card shows the name it was logged under, with a "Parallel (1)" badge;
   - any request can be added to the count ("+ Count it") or left out, by you,
     and handed back to the Rules. */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const doc=w.document, wait=ms=>new Promise(r=>setTimeout(r,ms)), r=n=>Math.round((n||0)*1e4)/1e4, Y=+S.settings.year, m=9;
  /* Dr. Asim: main line + "(1)" line, the parallel clinic carried by OT fixed */
  S.settings.ot=[]; api.refresh();
  const par0=S.result.rows.find(t=>t.id==='388'&&t.site==='J1'&&/\(1\)\s*$/.test(t.name));
  const DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], days={};
  par0.spans.forEach((sp,d)=>{ if(sp&&sp.length) days[DN[d]]=sp.map(x=>({f:x.f,t:x.t,fill:''})); });
  S.settings.ot=[{name:par0.name,id:'388',site:'J1',type:'FT',dept:'Family Medicine',spec:'',year:'',month:'',days}];
  api.refresh();
  const main=()=>S.result.rows.find(t=>t.id==='388'&&t.site==='J1');
  const rows=S.capacity.rows, tpl=rows.find(x=>x._used&&/open/i.test(x.status)&&!(x._flags||[]).length);
  const mk=(name,extra)=>{ const x=Object.assign({},tpl,{id:'388',site:'J1',name,empStatus:tpl.empStatus,date:{y:Y,m,d:3},from:'17:00',to:'21:00',hours:4,sheet:'J1 Capacity',row:97000+rows.length,_flags:[]},extra||{}); rows.push(x); return x; };
  const a=mk(main().name,{status:'Open'}), b=mk(par0.name,{status:'Open'});
  S.capacity.seq=(S.capacity.seq||0)+1; api.refresh();
  const dupFlag=x=>(x._flags||[]).some(f=>f.sig==='dup');
  T.check('same day and hours under "(1)": not flagged as a double entry', !dupFlag(a)&&!dupFlag(b));
  T.check('…and both are counted (main + parallel opening)', a._used && b._used);
  const c=mk(main().name,{status:'Open'}); api.refresh();
  T.check('a true copy under the same name is still flagged', dupFlag(c));
  rows.splice(rows.indexOf(c),1);
  /* the card */
  const open=async()=>{ api.openDrawer(main().key); S.dw.month=m; S.dw.mode='all'; api.renderDrawer(); await wait(150); return doc.getElementById('drawer'); };
  let dw=await open();
  /* the Requests list is the last table on the card ("Entries to check" can list a row too) */
  const rowOf=x=>[...dw.querySelectorAll('tr.rq')].filter(tr=>tr.textContent.indexOf('row '+x.row)>=0).pop();
  T.check('the card shows the name it was logged under, with "Parallel (1)"', /Parallel \(1\)/.test(rowOf(b).textContent) && rowOf(b).textContent.indexOf(par0.name)>=0);
  T.check('…and no badge on the main-name request', !/Parallel/.test(rowOf(a).textContent));
  /* add a skipped request to the count */
  const skipK=Object.keys(S.rules).find(k=>S.rules[k].include!=='Y'&&rows.some(x=>x._key===k&&/close/i.test(x.status)));
  const sk=rows.find(x=>x._key===skipK&&/close/i.test(x.status));
  const s0=mk(main().name,{status:'Close',main:sk.main,sub:sk.sub,date:{y:Y,m,d:12},from:'09:00',to:'13:00'});
  api.refresh();
  const c0=r(main().m[m].c);
  T.check('a closure whose reason the Rules skip: not counted', !s0._used && /Skip/.test(s0._why));
  dw=await open();
  let btn=rowOf(s0).querySelector('[data-rqpk$="|in"]');
  T.check('its row offers "+ Count it"', !!btn);
  btn.click(); await wait(500); api.refresh();
  T.check('"+ Count it": it is counted (Closed +1)', s0._used && r(main().m[m].c)===r(c0+1));
  dw=await open();
  T.check('…the row says it was set by you, with "↺ Rules" to undo', /by you/.test(rowOf(s0).textContent) && !!rowOf(s0).querySelector('[data-rqpk$="|clear"]'));
  rowOf(s0).querySelector('[data-rqpk$="|clear"]').click(); await wait(500); api.refresh();
  T.check('"↺ Rules": back to not counted', !s0._used && r(main().m[m].c)===c0);
  /* leave a counted request out */
  const o0=r(main().m[m].o);
  dw=await open(); rowOf(a).querySelector('[data-rqpk$="|out"]').click(); await wait(500); api.refresh();
  T.check('"Leave out": a counted opening is no longer counted (Opened −1)', !a._used && r(main().m[m].o)===r(o0-1) && a._why==='left out by you');
  /* a parallel closure (cancels the OT only) can be counted in Closed too */
  const p1=mk(par0.name,{status:'Close',main:'Personal Need',sub:'Emergency',date:{y:Y,m,d:4},from:'17:00',to:'21:00'});
  api.refresh(); const cP=r(main().m[m].c);
  T.check('closure under "(1)": not in Closed by default', !p1._used && /parallel line/.test(p1._why));
  dw=await open(); rowOf(p1).querySelector('[data-rqpk$="|in"]').click(); await wait(500); api.refresh();
  T.check('…"+ Count it" puts it in Closed as well', p1._used && r(main().m[m].c)===r(cP+1));
  T.check('choices are shared (saved in settings)', Object.keys(S.settings.reqPick||{}).length>=2);
  [a,b,s0,p1].forEach(x=>{ const i=rows.indexOf(x); if(i>=0) rows.splice(i,1); });
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
