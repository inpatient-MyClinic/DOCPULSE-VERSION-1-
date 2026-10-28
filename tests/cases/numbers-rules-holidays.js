/* Same capture as base2, but with rules, holidays and a hybrid allowance set
   in memory first, so the comparison covers the paths that only run when a
   month is really configured. */
/* Numbers snapshot (numbers-rules-holidays)
   (was base3.js) */
const T=require('../lib/ctx');

(async()=>{
  const fs=require('fs');
  const {api,S}=await require('../lib/srv')(T.cookie);
  Object.keys(S.rules).forEach(k=>{ S.rules[k].include='Y'; });
  S.settings.holidays=[{d:'2026-09-23',n:'National Day'},{d:'2026-02-22',n:'Founding Day'},
                       {d:'2026-04-20',n:'Eid'}];
  S.settings.hrs=4; S.settings.schedApply=true;
  api.refresh();
  const r=n=>Math.round((n||0)*1e6)/1e6;
  const out={brk:{},compute:{},paid:{}};
  S.result.rows.forEach(t=>{ out.compute[t.key]={m:t.m.map(x=>[r(x.s),r(x.c),r(x.o),r(x.t)]),yt:r(t.yt)}; });
  for(let m=0;m<12;m++){ S.bk.month=String(m); out.brk[m]={};
    api.bkRows().forEach(x=>{ out.brk[m][x.t.key]=[r(x.fixed),r(x.extra),r(x.blocked),r(x.hol),r(x.net)]; }); }
  S.bk.month=''; S.pd.month='';
  api.pdRows().forEach(t=>{ out.paid[t.key]=[JSON.stringify(t.tot),JSON.stringify(t.otTot),r(t.blk)]; });
  fs.writeFileSync(T.out('snapshot.json'),JSON.stringify(out));
  const R=S.result.rows;
  console.log('  captured',process.argv[2],': doctors',Object.keys(out.compute).length,
    '| rules',Object.keys(S.rules).filter(k=>S.rules[k].include==='Y').length,
    '| holiday loss',r(R.reduce((a,t)=>a+(t.yhol||0),0)),
    '| records',api.SchedStore.rows().length);
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
