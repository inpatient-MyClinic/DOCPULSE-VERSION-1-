/* Doctor card → Month by month → "Extra (paid)": his paid Extra and Coverage
   sessions plus his fixed OT; a closure at the time of one takes it off. */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const doc=w.document, wait=ms=>new Promise(r=>setTimeout(r,ms)), r=n=>Math.round((n||0)*1e4)/1e4, Y=+S.settings.year, m=9;
  S.settings.ot=[{name:'Dr. Hamza Alofi',id:'1244',site:'J1',type:'FT',dept:'Orthopedic',spec:'',year:'',month:'',days:{Sat:[{f:1020,t:1260,fill:''}]}}];
  S.settings.paidMode='col'; S.settings.paidCol='Paid/Unpaid'; api.refresh();
  const t=()=>S.result.rows.find(x=>x.id==='1244'&&x.site==='J1');
  const rows=S.capacity.rows, tpl=rows.find(x=>x._used&&/open/i.test(x.status)&&!(x._flags||[]).length);
  const plan=api.schedPlanMap(t(),Y,m), free=[]; for(let d=1;d<=31;d++){ const dt=new Date(Date.UTC(Y,m,d)); if(dt.getUTCMonth()===m&&!(plan[d]>0)&&dt.getUTCDay()!==6) free.push(d); }
  const add=(o)=>{ const x=Object.assign({},tpl,{id:'1244',site:'J1',name:t().name,from:'09:00',to:'13:00',hours:4,row:94000+rows.length,raw:{'Paid/Unpaid':'Paid'}},o); x.date={y:Y,m,d:o.d}; rows.push(x); return x; };
  const ex=add({d:free[0],status:'Open',main:'Business Need',sub:'Extra Sessions'});
  const cv=add({d:free[1],status:'Open',main:'Business Need',sub:'Coverage Sessions'});
  const un=add({d:free[2],status:'Open',main:'Business Need',sub:'Extra Sessions',raw:{'Paid/Unpaid':'Unpaid'}});
  const rp=add({d:free[3],status:'Open',main:'Personal Need',sub:'Replacement Sessions'});
  S.capacity.seq=(S.capacity.seq||0)+1; api.refresh();
  let X=api.dwExtra(t())[m];
  console.log('Oct extra',JSON.stringify(X));
  T.check('5 fixed OT Saturdays + paid Extra + paid Coverage = 7', r(X.n)===7 && r(X.ot)===5 && r(X.log)===2);
  T.check('an unpaid Extra and a Replacement session are not in it', r(X.log)===2);
  /* closures: one on an OT Saturday, one at the time of the paid Extra */
  const c1=add({d:17,status:'Close',main:'Personal Need',sub:'Emergency',from:'17:00',to:'21:00'});
  const c2=add({d:free[0],status:'Close',main:'Personal Need',sub:'Emergency',from:'09:00',to:'13:00'});
  S.capacity.seq++; api.refresh();
  X=api.dwExtra(t())[m];
  console.log('…with two closures',JSON.stringify(X));
  T.check('he closed one OT and the Extra: 7 − 2 = 5, and it says 2 were closed', r(X.n)===5 && r(X.cut)===2);
  T.check('the OT part matches the OT Fixed column', r(X.ot)===r(t().m[m].ot));
  /* on the card */
  api.openDrawer(t().key); S.dw.month=m; api.renderDrawer(); await wait(150);
  const tbl=[...doc.querySelectorAll('#drawer table')].find(x=>/Extra \(paid\)/.test(x.querySelector('thead').textContent));
  T.check('the month table has an "Extra (paid)" column', !!tbl);
  const hd=[...tbl.querySelectorAll('thead th')].map(x=>x.textContent), ci=hd.indexOf('Extra (paid)');
  const oct=[...tbl.querySelectorAll('tbody tr')][m].children[ci].textContent;
  T.check('October reads 5, with "−2 closed"', /^5/.test(oct) && /−2 closed/.test(oct), oct);
  T.check('it sits right after OT Fixed', hd[ci-1]==='OT Fixed');
  [ex,cv,un,rp,c1,c2].forEach(x=>rows.splice(rows.indexOf(x),1));
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
