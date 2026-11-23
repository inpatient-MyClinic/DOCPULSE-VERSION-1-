/* H doctors and their capacity rows
   (was hyb1.js) */
const T=require('../lib/ctx');
(async()=>{
  const fs=require('fs');
  const {w,api,S}=await require('../lib/srv')(T.cookie);
  const H=S.result.rows.filter(t=>t.hybrid);
  console.log('H doctors',H.length);
  H.forEach(t=>{ let raw=0; for(let m=0;m<12;m++) raw+=(t.m[m].cRaw!==undefined?t.m[m].cRaw:t.m[m].c);
    if(raw>0||t.allow>0) console.log(' ',t.name.padEnd(30),'allow',t.allow,'closedRaw',raw,'annualLeave',t.yAL,'used',t.allowUsed,'left',t.allowLeft,'counted',t.yc); });
  // capacity rows for H doctors, by sub reason
  const ids=new Set(H.map(t=>t.id+'|'+t.site));
  const by={}; (S.capacity.rows||[]).forEach(r=>{ if(ids.has(r.id+'|'+r.site)) { const k=r.status+' · '+r.sub; by[k]=(by[k]||0)+1; } });
  console.log('H capacity rows by status · sub:',by);
  process.exit(0);
})().catch(e=>{console.error(e.message);process.exit(1);});
