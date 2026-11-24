/* "Both" on a fixed OT slot at the same time as his clinic counts two sessions
   a day: the clinic stays in Sessions and the OT is added on top — and the card
   says so ("4 clinic + 4 OT = 8 counted"), not just "4 counted". */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const doc=w.document, wait=ms=>new Promise(r=>setTimeout(r,ms)), r=n=>Math.round((n||0)*1e4)/1e4, Y=+S.settings.year, m=9;
  api.refresh();
  const DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  /* a doctor with an evening clinic 5–9 on three or more weekdays (one master line) */
  const t0=S.result.rows.find(t=>!t.hybrid&&t.lines===1&&!S.result.rows.some(x=>x!==t&&x.id===t.id&&x.site===t.site)&&
    [0,1,2,3,4].filter(d=>(t.spans[d]||[]).some(s=>s.f===1020&&s.t===1260)).length>=3);
  T.check('a doctor with clinics 5–9 PM on three weekdays', !!t0);
  const wds=[0,1,2,3,4].filter(d=>(t0.spans[d]||[]).some(s=>s.f===1020&&s.t===1260)).slice(0,3);
  const days={}; wds.forEach(d=>{ days[DN[d]]=[{f:1020,t:1260,fill:''}]; });
  const nDays=wds.reduce((a,d)=>{ let n=0; for(let x=1;x<=31;x++){ const dt=new Date(Date.UTC(Y,m,x)); if(dt.getUTCMonth()===m&&dt.getUTCDay()===d) n++; } return a+n; },0);
  const plain=(()=>{ const t=S.result.rows.find(x=>x.key===t0.key); return {s:r(t.m[m].s),t:r(t.m[m].t)}; })();
  S.settings.ot=[{name:t0.name,id:t0.id,site:t0.site,type:'FT',dept:t0.dept,spec:'',year:'',month:'',days}];
  const run=pick=>{ S.settings.otRule={}; S.settings.otClash={};
    wds.forEach(d=>{ S.settings.otRule[t0.key+'|'+d+'|1020-1260']=pick; }); api.refresh();
    const t=S.result.rows.find(x=>x.key===t0.key); return {s:r(t.m[m].s),c:r(t.m[m].c),o:r(t.m[m].o),ot:r(t.m[m].ot),t:r(t.m[m].t)}; };
  const both=run('both');
  console.log(t0.name,'·',wds.map(d=>DN[d]).join('/'),'5–9 PM ·',nDays,'days in Oct');
  console.log('no OT  ',JSON.stringify(plain),'\nBoth   ',JSON.stringify(both));
  T.check('Both: every clinic stays in Sessions', both.s===plain.s);
  T.check('Both: every OT day is counted on top ('+nDays+')', both.ot===nDays);
  T.check('Both: Total = no-OT Total + '+nDays, both.t===r(plain.t+nDays));
  const fixed=run('fixed'), master=run('master');
  console.log('Fixed  ',JSON.stringify(fixed),'\nMaster ',JSON.stringify(master));
  T.check('OT fixed session: clinics out, OT in (Total unchanged)', fixed.s===r(plain.s-nDays) && fixed.ot===nDays && fixed.t===plain.t);
  T.check('Master schedule: clinics in, OT out (Total unchanged)', master.s===plain.s && master.ot===0 && master.t===plain.t);
  T.check('Both counts exactly '+nDays+' more than either single choice', r(both.t-fixed.t)===nDays && r(both.t-master.t)===nDays);
  /* the card says it */
  run('both'); S.flt.month=String(m); api.openDrawer(t0.key); S.dw.month=m; api.renderDrawer(); await wait(200);
  const dw=doc.getElementById('drawer').textContent;
  const per=wds.map(d=>{ let n=0; for(let x=1;x<=31;x++){ const dt=new Date(Date.UTC(Y,m,x)); if(dt.getUTCMonth()===m&&dt.getUTCDay()===d) n++; } return n; });
  T.check('card: each slot reads "N clinic + N OT = 2N counted"', per.every(n=>dw.indexOf(n+' clinic + '+n+' OT = '+(2*n)+' counted')>=0), per);
  T.check('card header: OT counted and the clinics kept by Both', dw.indexOf(nDays+' OT counted')>=0 && dw.indexOf('+ '+nDays+' clinic kept (Both)')>=0);
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
