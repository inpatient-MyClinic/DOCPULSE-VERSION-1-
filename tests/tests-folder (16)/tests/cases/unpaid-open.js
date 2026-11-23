/* An opening marked Unpaid in the log's Paid / Unpaid column is not counted on
   the Doctors page (a paid one is). Settings → Rules has the switch to count
   them again; one request can still be counted from the doctor card. */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const doc=w.document, wait=ms=>new Promise(r=>setTimeout(r,ms)), r=n=>Math.round((n||0)*1e4)/1e4, Y=+S.settings.year, m=9;
  api.refresh();
  const rows=S.capacity.rows, tpl=rows.find(x=>x._used&&/open/i.test(x.status)&&!(x._flags||[]).length);
  const t0=S.result.rows.find(x=>x.key===rows.find(y=>y===tpl)._tkey);
  const col=api.pdCol()||'Paid/Unpaid';
  console.log('pay column:',api.pdCol()||'(none in the log — using "Paid/Unpaid")');
  const mk=(pay,d,extra)=>{ const x=Object.assign({},tpl,{date:{y:Y,m,d},from:'17:00',to:'21:00',hours:4,row:96000+d,raw:Object.assign({},tpl.raw||{},{[col]:pay})},extra||{}); rows.push(x); return x; };
  const o0=r(S.result.rows.find(x=>x.key===t0.key).m[m].o);
  const plan=api.schedPlanMap(t0,Y,m), free=[]; for(let d=1;d<=31&&free.length<3;d++){ if(new Date(Date.UTC(Y,m,d)).getUTCMonth()===m&&!(plan[d]>0)) free.push(d); }
  const u=mk('Unpaid',free[0]), p=mk('Paid',free[1]), n=mk('Not Paid',free[2]);
  S.capacity.seq=(S.capacity.seq||0)+1; if(!api.pdCol()) S.settings.paidCol=col; api.refresh();
  const doc0=()=>S.result.rows.find(x=>x.key===t0.key);
  console.log(t0.name,'Opened in Oct:',o0,'→',r(doc0().m[m].o));
  T.check('opening marked "Unpaid": not counted', !u._used && /unpaid opening is not counted/.test(u._why));
  T.check('opening marked "Not Paid": not counted', !n._used);
  T.check('opening marked "Paid": counted', p._used);
  T.check('Opened goes up by the paid one only (+1)', r(doc0().m[m].o)===r(o0+1));
  /* Settings → Rules */
  api.go('settings'); api.setSub('rules'); await wait(250);
  const card=doc.getElementById('unpaidRule');
  T.check('Settings → Rules has the Paid / Unpaid openings card', !!card && /Paid \/ Unpaid openings/.test(card.textContent));
  T.check('…it names the column and the words read as unpaid', card.textContent.indexOf(col)>=0 && /Unpaid/.test(card.textContent) && /Not Paid/.test(card.textContent));
  doc.getElementById('unpaidSw').click(); await wait(250);
  T.check('switch off: unpaid openings count again (+3)', S.settings.unpaidOpen==='count' && u._used && n._used && r(doc0().m[m].o)===r(o0+3));
  doc.getElementById('unpaidSw').click(); await wait(250);
  T.check('switch on again: left out', S.settings.unpaidOpen==='skip' && !u._used);
  /* one request counted from the card anyway */
  api.openDrawer(t0.key); S.dw.month=m; S.dw.mode='all'; api.renderDrawer(); await wait(150);
  const tr=[...doc.querySelectorAll('#drawer tr.rq')].filter(x=>x.textContent.indexOf('row '+u.row)>=0).pop();
  T.check('the card says why it is not counted', /unpaid opening is not counted/.test(tr.textContent));
  tr.querySelector('[data-rqpk$="|in"]').click(); await wait(500); api.refresh();
  T.check('"+ Count it" on that one request counts it', u._used && r(doc0().m[m].o)===r(o0+2));
  [u,p,n].forEach(x=>rows.splice(rows.indexOf(x),1));
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
