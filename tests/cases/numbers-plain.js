/* Numbers snapshot (numbers-plain)
   (was base2.js) */
const T=require('../lib/ctx');
(async()=>{
  const fs=require('fs');
  const {w,api,S}=await require('../lib/srv')(T.cookie);
  const r=n=>Math.round((n||0)*1e6)/1e6;
  const out={brk:{},compute:{},paid:{}};
  S.result.rows.forEach(t=>{ out.compute[t.key]={m:t.m.map(x=>[r(x.s),r(x.c),r(x.o),r(x.t)]),yt:r(t.yt)}; });
  for(let m=0;m<12;m++){ S.bk.month=String(m); out.brk[m]={};
    api.bkRows().forEach(x=>{ out.brk[m][x.t.key]=[r(x.fixed),r(x.extra),r(x.blocked),r(x.hol),r(x.net)]; }); }
  S.pd.month=''; api.pdRows().forEach(t=>{ out.paid[t.key]=[JSON.stringify(t.tot),JSON.stringify(t.otTot),r(t.blk)]; });
  fs.writeFileSync(T.out('snapshot.json'),JSON.stringify(out));
  console.log('  captured',process.argv[2],': doctors',Object.keys(out.compute).length,
              '| breakdown rows/mo',Object.keys(out.brk[8]).length,'| paid',Object.keys(out.paid).length);
  process.exit(0);
})().catch(e=>{console.error(e.message);process.exit(1);});
