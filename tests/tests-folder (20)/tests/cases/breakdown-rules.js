/* Session breakdown rules: a reason switched off there leaves the breakdown
   only (the Doctors page keeps following the Counting rules). The breakdown
   also applies the recent counting changes: a closure at the time of a fixed
   OT session cancels it (Fixed OT column). */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const doc=w.document, wait=ms=>new Promise(r=>setTimeout(r,ms)), r=n=>Math.round((n||0)*1e4)/1e4, Y=+S.settings.year;
  api.refresh();
  const rows=S.capacity.rows;
  /* a doctor with a closure on a clinic day */
  const bk=()=>{ S.bk.month=''; return api.bkRows(); };
  const base=bk(); const withBlk=base.find(x=>x.blocked>0);
  T.check('a doctor the breakdown blocks a session for', !!withBlk);
  const t=withBlk.t, key=t.key;
  const cl=rows.find(x=>x.date&&x.date.y===Y&&/clos/i.test(x.status)&&x.id===t.id&&x.site===t.site);
  const rk=Object.keys(S.rules).find(k=>rows.some(x=>x===cl&&x._key===k));
  const yc0=r(t.yc), b0=r(withBlk.blocked), n0=r(withBlk.net);
  S.settings.brkRule={[rk]:false}; api.refresh();
  const b1=bk().find(x=>x.t.key===key), t1=S.result.rows.find(x=>x.key===key);
  console.log('reason',rk,'blocked',b0,'→',r(b1.blocked),' sessions run',n0,'→',r(b1.net));
  T.check('switched off: the breakdown no longer blocks for that reason', r(b1.blocked)<b0 && r(b1.net)>n0);
  T.check('the Doctors page is not touched', r(t1.yc)===yc0);
  S.settings.brkRule={}; api.refresh();
  T.check('switched back on: as before', r(bk().find(x=>x.t.key===key).blocked)===b0);
  /* the Rules page shows the card and its switch works */
  api.go('settings'); api.setSub('rules'); await wait(250);
  const card=doc.getElementById('brkRules');
  T.check('Settings → Rules has a Session breakdown rules card', !!card && /Session breakdown rules/.test(card.textContent));
  T.check('it lists what else the breakdown applies (OT cancelled by a closure)', /OT fixed session is cancelled by a closure/.test(card.textContent));
  const sw=card.querySelector('[data-brk="'+rk+'"]'); sw.click(); await wait(200);
  T.check('the switch turns a reason off for the breakdown', S.settings.brkRule[rk]===false && r(bk().find(x=>x.t.key===key).blocked)<b0);
  doc.getElementById('bruReset').click(); await wait(200);
  T.check('"Count every reason again" puts it back', !Object.keys(S.settings.brkRule).length);
  /* fixed OT in the breakdown: a closure at its time cancels it */
  S.settings.ot=[{name:'Dr. Hamza Alofi',id:'1244',site:'J1',type:'FT',dept:'Orthopedic',spec:'',year:'',month:'',days:{Sat:[{f:1020,t:1260,fill:''}]}}];
  api.refresh(); const h=S.result.rows.find(x=>x.id==='1244'&&x.site==='J1');
  S.bk.month='9'; const o0=r(api.bkRows().find(x=>x.t.key===h.key).ot);
  const tpl=rows.find(x=>x.status&&/close/i.test(x.status));
  const add=Object.assign({},tpl,{id:'1244',site:'J1',name:h.name,empStatus:'FT',status:'Close',date:{y:Y,m:9,d:17},from:'17:00',to:'21:00',hours:4,row:99990});
  rows.push(add); S.capacity.seq=(S.capacity.seq||0)+1; api.refresh();
  S.bk.month='9'; const o1=r(api.bkRows().find(x=>x.t.key===h.key).ot), d1=r(S.result.rows.find(x=>x.key===h.key).m[9].ot);
  console.log('Fixed OT in Oct: breakdown',o0,'→',o1,' Doctors page',d1);
  T.check('breakdown Fixed OT drops by the cancelled session, same as the Doctors page', o1===o0-1 && o1===d1);
  rows.splice(rows.indexOf(add),1);
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
