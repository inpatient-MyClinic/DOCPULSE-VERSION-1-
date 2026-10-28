/* Finance "Fixed sessions" is the OT Fixed the Doctors page counts, for every
   doctor and every month, and its Total = Session − Close + Open + Fixed.
   (Bug: Finance took the master file's OT sheet first, which reads a
   1 PM–9 PM Saturday as one session — Elsherife showed 5, Doctors page 10.) */
const T=require('../lib/ctx');
(async()=>{
  const {api,S}=await require('../lib/srv')(T.cookie);
  const r=n=>Math.round((n||0)*100)/100;
  S.settings.otOn=true;
  S.settings.ot=[
    {name:'Dr. Mohamed Elsherife',id:'2037',site:'J3',type:'FT',dept:'',spec:'',year:'',month:'',days:{Sat:[{f:780,t:1020,fill:''},{f:1020,t:1260,fill:''}]}},
    {name:'Dr. Mohamed Abu ElHasan',id:'661',site:'J1',type:'FT',dept:'',spec:'',year:'',month:'',days:{Thu:[{f:780,t:1020,fill:''}],Sat:[{f:540,t:780,fill:''}],Fri:[{f:1020,t:1260,fill:''}]}}];
  /* his Saturday OT sits on his Saturday clinic in this workbook: he worked both */
  S.settings.otRule={'2037|J3|drmohamedelsherife|6|780-1020':'both','2037|J3|drmohamedelsherife|6|1020-1260':'both'};
  api.refresh();
  const doc=(id,site)=>S.result.rows.find(x=>x.id===id&&x.site===site);
  let bad=[], fixSeen=0;
  for(let m=0;m<12;m++){
    const F=api.finBuild(m);
    F.rows.forEach(row=>{
      const t=row.t; const want=t? r((t.m[m].ot)||0) : 0;
      if(r(row.fix)!==want) bad.push(m+' '+row.name+' fixed '+row.fix+' vs OT Fixed '+want);
      if(r(row.tot)!==r(row.ses-row.cl+row.op+row.fix)) bad.push(m+' '+row.name+' total '+row.tot+' ≠ '+row.ses+'−'+row.cl+'+'+row.op+'+'+row.fix);
      fixSeen+=row.fix;
    });
  }
  T.check('every month, every doctor: Finance Fixed = Doctors page OT Fixed, and Total = Session − Close + Open + Fixed', !bad.length, bad.slice(0,3));
  const Oct=api.finBuild(9), el=Oct.rows.find(x=>x.id==='2037'&&x.site==='J3'), ab=Oct.rows.find(x=>x.id==='661'&&x.site==='J1');
  T.check('Elsherife Oct: Fixed 10 (5 Saturdays × 1 PM–9 PM = 2 sessions each), same as Doctors page', el&&el.fix===10&&r(doc('2037','J3').m[9].ot)===10, el&&el.fix);
  T.check('Abu ElHasan Oct: Fixed = his OT Fixed on the Doctors page ('+(ab&&ab.fix)+')', ab&&r(ab.fix)===r(doc('661','J1').m[9].ot)&&ab.fix>5, ab&&ab.fix);
  T.check('doctors on the master file\'s OT sheet but not on the OT fixed page are listed, not silently dropped ('+(Oct.sheetOnly||[]).length+')',
    (Oct.sheetOnly||[]).length>0 && !(Oct.sheetOnly||[]).some(x=>x.id==='2037'||x.id==='661'), (Oct.sheetOnly||[]).map(x=>x.name));
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
