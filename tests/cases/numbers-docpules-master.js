/* Same capture as base2/base3, but reading the DocPules master: created from the
   upload and switched on, with no dated changes. Must equal the uploaded master. */
/* Numbers snapshot (numbers-docpules-master)
   (was base4.js) */
const T=require('../lib/ctx');

(async()=>{
  const fs=require('fs');
  const {api,S}=await require('../lib/srv')(T.cookie);
  const cfg=process.argv[3]==='cfg';
  if(cfg){ Object.keys(S.rules).forEach(k=>{ S.rules[k].include='Y'; });
    S.settings.holidays=[{d:'2026-09-23',n:'National Day'},{d:'2026-02-22',n:'Founding Day'},{d:'2026-04-20',n:'Eid'}];
    S.settings.hrs=4; S.settings.schedApply=true; }
  if(!api.dpmCreate()) throw new Error('could not create');
  S.settings.schedSrc='portal'; api.schedApplySrc();
  if(!(S.master&&S.master.dpm)) throw new Error('DocPules master not in use');
  api.refresh();
  const r=n=>Math.round((n||0)*1e6)/1e6;
  const out={brk:{},compute:{},paid:{}};
  S.result.rows.forEach(t=>{ out.compute[t.key]={m:t.m.map(x=>[r(x.s),r(x.c),r(x.o),r(x.t)]),yt:r(t.yt)}; });
  for(let m=0;m<12;m++){ S.bk.month=String(m); out.brk[m]={};
    api.bkRows().forEach(x=>{ out.brk[m][x.t.key]=[r(x.fixed),r(x.extra),r(x.blocked),r(x.hol),r(x.net)]; }); }
  S.bk.month=''; S.pd.month='';
  api.pdRows().forEach(t=>{ out.paid[t.key]=[JSON.stringify(t.tot),JSON.stringify(t.otTot),r(t.blk)]; });
  fs.writeFileSync(T.out('snapshot.json'),JSON.stringify(out));
  console.log('  captured DocPules master'+(cfg?' (configured)':'')+': doctors',Object.keys(out.compute).length,'| sheet:',S.master.sheet);
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
