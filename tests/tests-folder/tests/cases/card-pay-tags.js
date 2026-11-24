/* Doctor card requests: each one shows Paid / Unpaid / None from the log's
   Paid / Unpaid column (or the word itself if it is neither), with counts and
   a filter. */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const doc=w.document, wait=ms=>new Promise(r=>setTimeout(r,ms)), Y=+S.settings.year, m=9;
  S.settings.paidMode='col'; S.settings.paidCol='Paid/Unpaid'; api.refresh();
  const t=S.result.rows.find(x=>x.id==='1244'&&x.site==='J1');
  const rows=S.capacity.rows, tpl=rows.find(x=>x._used&&/open/i.test(x.status)&&!(x._flags||[]).length);
  const mk=(d,v)=>{ const x=Object.assign({},tpl,{id:'1244',site:'J1',name:t.name,date:{y:Y,m,d},from:'06:00',to:'08:00',hours:2,row:93000+d,raw:v===null?{}:{'Paid/Unpaid':v}}); rows.push(x); return x; };
  const a=mk(1,'Paid'), b=mk(2,'Unpaid'), c=mk(3,null), d=mk(4,'N/A');
  S.capacity.seq=(S.capacity.seq||0)+1; api.refresh();
  api.openDrawer(t.key); S.dw.month=m; S.dw.mode='all'; S.dw.pay=''; api.renderDrawer(); await wait(150);
  const rowOf=x=>[...doc.querySelectorAll('#drawer tr.rq')].filter(tr=>tr.textContent.indexOf('row '+x.row)>=0).pop();
  const tag=x=>{ const e=rowOf(x)&&rowOf(x).querySelector('.rq-pay'); return e? e.className.replace('rq-pay ','')+':'+e.textContent.trim() : 'none found'; };
  console.log('tags:',tag(a),'|',tag(b),'|',tag(c),'|',tag(d));
  T.check('Paid row shows "Paid"', /^paid:.*Paid$/.test(tag(a)));
  T.check('Unpaid row shows "Unpaid"', /^unpaid:.*Unpaid$/.test(tag(b)));
  T.check('empty cell shows "None"', tag(c)==='none:None');
  T.check('any other word is shown as written', tag(d)==='other:N/A');
  const bar=doc.querySelector('#drawer .rq-payf');
  T.check('a filter with counts: All / Paid / Unpaid / None / Other', !!bar && /Paid/.test(bar.textContent) && /None/.test(bar.textContent) && /Other/.test(bar.textContent));
  doc.querySelector('#drawer [data-dwpay="unpaid"]').click(); await wait(150);
  const shown=[...doc.querySelectorAll('#drawer tr.rq')].filter(tr=>/row 930/.test(tr.textContent));
  T.check('filter Unpaid: only unpaid requests listed', !!rowOf(b) && !rowOf(a) && !rowOf(c) && [...doc.querySelectorAll('#drawer tr.rq .rq-pay')].every(e=>e.classList.contains('unpaid')));
  doc.querySelector('#drawer [data-dwpay=""]').click(); await wait(150);
  T.check('All brings everyone back', !!rowOf(a)&&!!rowOf(c));
  [a,b,c,d].forEach(x=>rows.splice(rows.indexOf(x),1));
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
