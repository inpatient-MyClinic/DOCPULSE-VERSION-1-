/* Paid extra takes fixed OT from the OT fixed page (the days the Doctors page
   counts as OT Fixed, after the clash choices) — not from the master file's
   OT sheet, which read a 1 PM–9 PM Saturday as one session. */
const T=require('../lib/ctx');
(async()=>{
  const {api,S}=await require('../lib/srv')(T.cookie);
  const r=n=>Math.round((n||0)*100)/100;
  S.settings.otOn=true;
  S.settings.ot=[{name:'Dr. Mohamed Elsherife',id:'2037',site:'J3',type:'FT',dept:'',spec:'',year:'',month:'',days:{Sat:[{f:780,t:1020,fill:''},{f:1020,t:1260,fill:''}]}}];
  S.settings.otRule={'2037|J3|drmohamedelsherife|6|780-1020':'both','2037|J3|drmohamedelsherife|6|1020-1260':'both'};
  api.refresh();
  S.pd.month=''; S.pd.src='all';
  const rows=api.pdRows();
  const el=rows.find(x=>x.id==='2037'), t=S.result.rows.find(x=>x.id==='2037'&&x.site==='J3');
  const oct=el&&el.otM&&el.otM[9]? r(el.otM[9].s) : null;
  console.log('Elsherife Oct: Paid extra OT',oct,'| Doctors page OT Fixed',r(t.m[9].ot));
  T.check('Elsherife October: Paid extra fixed OT = 10 sessions, the same as the Doctors page', oct===10 && r(t.m[9].ot)===10, oct);
  let same=true, bad='';
  for(let m=0;m<12;m++){ const a=el&&el.otM&&el.otM[m]? r(el.otM[m].s):0, b=r(t.m[m].ot); if(a>b+1e-9){ same=false; bad='month '+m+': '+a+' > '+b; } }
  T.check('no month pays more fixed OT than the Doctors page counts', same, bad);
  const sheetOnly=rows.filter(x=>['46','703','1553','661','1288','1161'].indexOf(String(x.id))>=0&&x.otTot&&x.otTot.n>0);
  T.check('doctors only in the master file\'s OT sheet get no fixed OT in Paid extra', !sheetOnly.length, sheetOnly.map(x=>x.name));
  /* a clinic-time clash left on "Master schedule" is not paid as OT */
  S.settings.otRule={'2037|J3|drmohamedelsherife|6|780-1020':'master','2037|J3|drmohamedelsherife|6|1020-1260':'master'};
  api.refresh(); const el2=api.pdRows().find(x=>x.id==='2037');
  T.check('a clash set to "Master schedule" is not paid as fixed OT', !el2||!el2.otM||!el2.otM[9]||r(el2.otM[9].s)===0, el2&&el2.otM&&el2.otM[9]);
  S.settings.otOn=false; api.refresh(); const el3=api.pdRows().find(x=>x.id==='2037');
  T.check('"count them" off: no fixed OT in Paid extra', !el3||!el3.otTot||!(el3.otTot.n>0));
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
