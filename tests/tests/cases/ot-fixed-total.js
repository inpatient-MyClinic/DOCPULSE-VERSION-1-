/* OT Fixed is an extra session: its own column right after Open, added to
   Total (Total = Sessions − Close + Open + OT Fixed), shown in the doctor card
   and the Excel export. With a clash:
     OT fixed session → the clinic leaves Sessions, the OT counts
     Both             → the clinic and the OT both count
     Master schedule  → the clinic counts, the OT does not */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const r=n=>Math.round((n||0)*1e4)/1e4; const fmtN=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:6}).format(r(n));
  S.settings.ot=[{name:'Dr. Hamza Alofi',id:'1244',site:'J1',type:'FT',dept:'Orthopedic',spec:'',year:'',month:'',days:{Mon:[{f:540,t:780,fill:''}],Sat:[{f:1020,t:1260,fill:''}]}}];
  api.refresh();
  const doc=()=>S.result.rows.find(x=>x.id==='1244'&&x.site==='J1');
  const m=9, Y=S.settings.year;
  let t=doc();
  const slot=t.key+'|1|540-780';
  const adds=t=>{ for(let k=0;k<12;k++){ const x=t.m[k]; if(r(x.t)!==r(x.s-x.c+x.o+(x.ot||0))) return 'month '+k+': '+JSON.stringify(x); }
    let ys=0,yc=0,yo=0,yot=0; for(let k=0;k<12;k++){ ys+=t.m[k].s; yc+=t.m[k].c; yo+=t.m[k].o; yot+=t.m[k].ot||0; }
    return r(t.yt)===r(ys-yc+yo+yot)? '' : 'year: '+t.yt+' vs '+(ys-yc+yo+yot); };
  const set=(pick,day)=>{ S.settings.otRule={}; if(pick) S.settings.otRule[slot]=pick; S.settings.otClash={};
    if(day) S.settings.otClash[t.key+'|'+Y+'-'+m+'-'+day[0]]=day[1]; api.refresh(); t=doc(); return {s:r(t.m[m].s),ot:r(t.m[m].ot),t:r(t.m[m].t)}; };
  const none=set(''), master=set('master'), fixed=set('fixed'), both=set('both');
  console.log('Oct  none  ',JSON.stringify(none),'\nOct  master',JSON.stringify(master),'\nOct  fixed ',JSON.stringify(fixed),'\nOct  both  ',JSON.stringify(both));
  T.check('Total = Sessions − Close + Open + OT Fixed, every month and the year (every doctor)', S.result.rows.every(x=>!adds(x)), S.result.rows.map(adds).filter(Boolean)[0]);
  T.check('no choice yet: clashing OT waits, Total = clinic + the OT that does not clash', none.t===r(none.s+none.ot) && none.ot===5);
  T.check('Master schedule: clinic counted, clashing OT not', master.s===none.s && master.ot===5 && master.t===r(master.s+5));
  T.check('OT fixed session: the replaced clinics leave Sessions ('+none.s+' → '+fixed.s+')', fixed.s===r(none.s-4));
  T.check('OT fixed session: those days count as OT Fixed instead (5 → '+fixed.ot+')', fixed.ot===9);
  T.check('OT fixed session: Total = remaining clinic + OT Fixed', fixed.t===r(fixed.s+fixed.ot));
  T.check('Both: clinic and OT both count (Total '+both.t+' = '+both.s+' + '+both.ot+')', both.s===none.s && both.ot===9 && both.t===r(both.s+both.ot));
  T.check('Both is higher than OT fixed by exactly the clinics kept', r(both.t-fixed.t)===4);
  const day=set('fixed',[5,'master']);
  T.check('a single day set back to Master: that clinic returns, its OT goes', day.s===r(fixed.s+1) && day.ot===r(fixed.ot-1) && day.t===r(day.s+day.ot));
  // the Doctors page: OT Fixed right after Open
  set('both');
  S.page='summary'; w.document.querySelector('#nav button:nth-child(2)').click();
  await new Promise(r=>setTimeout(r,300));
  const heads=[...w.document.querySelectorAll('#pg-summary thead th')].map(x=>x.textContent.trim());
  const io=heads.indexOf('Open');
  T.check('Doctors page: "OT Fixed" is the column right after "Open"', io>=0 && heads[io+1]==='OT Fixed', heads.slice(io-2,io+4));
  // the doctor card: an OT Fixed tile, and the Total says it is included
  w.document.getElementById('q').value='Hamza Alofi'; w.document.getElementById('q').dispatchEvent(new w.Event('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,300));
  const tr=[...w.document.querySelectorAll('#pg-summary tbody tr')].find(x=>/Hamza Alofi/.test(x.textContent)); if(tr) tr.click();
  await new Promise(r=>setTimeout(r,300));
  const rail=(w.document.querySelector('#drawer .rail')||{}).textContent||'';
  T.check('doctor card shows an OT Fixed tile ('+r(t.yot)+') and Total says "+ OT fixed"', rail.indexOf('OT Fixed'+fmtN(t.yot))>=0 && /\+ opened \+ OT fixed/.test(rail), rail.replace(/\s+/g,' ').slice(0,300));
  w.document.getElementById('dwX')&&w.document.getElementById('dwX').click();
  w.document.getElementById('q').value=''; w.document.getElementById('q').dispatchEvent(new w.Event('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,300));
  // the export
  w.__dl=null; api.S.flt.month=''; w.document.getElementById('btnXlsx').click();
  await new Promise(r=>setTimeout(r,300));
  const XLSX=w.XLSX, blob=w.__dl&&w.__dl.blob;
  let ok=false, why='no download';
  if(blob){ const wb=XLSX.read(blob.__parts[0],{type:'array'}); const a=XLSX.utils.sheet_to_json(wb.Sheets.Summary,{header:1});
    const h=a[0], row=a.find(x=>x[0]==='1244'&&x[5]==='J1');
    const c=k=>row[h.indexOf(k)];
    ok=h.indexOf('Oct OT Fixed')===h.indexOf('Oct Open')+1 && r(c('Oct Total'))===r(c('Oct Sessions')-c('Oct Close')+c('Oct Open')+c('Oct OT Fixed'))
      && r(c('Year Total'))===r(c('Year Sessions')-c('Year Close')+c('Year Open')+c('Year OT Fixed'));
    const tot=a[a.length-1]; ok=ok&&r(tot[h.indexOf('Year Total')])===r(S.result.rows.reduce((s,x)=>s+x.yt,0));
    why=JSON.stringify({open:c('Oct Open'),ot:c('Oct OT Fixed'),total:c('Oct Total')}); }
  T.check('Excel export: OT Fixed after Open, Total adds up, totals row lines up', ok, why);
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
