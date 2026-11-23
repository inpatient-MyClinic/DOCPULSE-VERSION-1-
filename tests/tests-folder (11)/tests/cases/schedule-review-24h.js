/* A decision in the new-master review, or on a note date, stays in its list
   for 24 hours, then it is saved for good and leaves the list. It lands in
   Settings → Change history with the date, the hours and who decided. */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const doc=w.document, wait=ms=>new Promise(r=>setTimeout(r,ms));
  S.fold={sd:true,nt:true};
  api.refresh();
  const ago=h=>new Date(Date.now()-h*3600e3).toISOString();
  const lineOf=key=>S.settings.schedSave.lines.find(l=>(l.i+'|'+l.s+'|'+api.nameKey(l.n))===key);
  /* three doctors, each with an extra Wednesday 9–1 in the saved file */
  const docs=S.result.rows.filter(x=>x.fromMaster&&!x.hybrid&&!x.week[3]&&x.week.reduce((a,b)=>a+b,0)>=3&&lineOf(x.key)&&S.result.rows.filter(y=>y.key===x.key).length===1).slice(0,3);
  T.check('three doctors to test with', docs.length===3);
  docs.forEach(t=>{ const l=lineOf(t.key); l.c[3]=[[540,780,(l.c.flat().find(x=>x&&x[2])||[0,0,''])[2]]]; });
  api.refresh();
  const D=()=>S.pendingDiff, inList=k=>!!(D()&&D().changed.find(c=>c.key===k));
  T.check('all three are in the review', docs.every(t=>inList(t.key)));
  const [A,B,C]=docs.map(t=>D().changed.find(c=>c.key===t.key));
  api.sdPut(A,'new'); api.sdPut(B,'keep'); api.sdPut(C,'new');
  /* B: Keep old writes the old week as an edit, the way the button does */
  const t0=S.result.rows.find(x=>x.key===B.key);
  S.settings.mstEdit=S.settings.mstEdit||{}; const days={}; ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((n,d)=>{ days[n]=(B.old.raw[d]||[]).map(x=>({f:x.f,t:x.t,fill:x.fill||''})); });
  S.settings.mstEdit[B.key]={days};
  S.settings.sdDec[A.key].at=ago(25); S.settings.sdDec[B.key].at=ago(30); S.settings.sdDec[C.key].at=ago(1);
  S.settings.sdDec[A.key].by='Wail'; S.settings.sdDec[B.key].by='Albaraa';
  api.refresh();
  T.check('decided 25 h ago (Use new): saved and gone from the review', !inList(A.key));
  T.check('decided 30 h ago (Keep old): saved and gone from the review', !inList(B.key));
  T.check('decided 1 h ago: still in the review', inList(C.key));
  T.check('the saved schedule now holds the new file for those two', !lineOf(A.key).c[3].length && !lineOf(B.key).c[3].length && lineOf(C.key).c[3].length===1);
  const tb=S.result.rows.find(x=>x.key===B.key), ta=S.result.rows.find(x=>x.key===A.key);
  T.check('Keep old still counts the old week (Wednesday kept)', tb.week[3]===1 && ta.week[3]===0);
  T.check('their decisions are cleared, the recent one stays', !S.settings.sdDec[A.key] && !S.settings.sdDec[B.key] && !!S.settings.sdDec[C.key]);
  const H=api.chgAll(), ha=H.find(e=>e.key===A.key), hb=H.find(e=>e.key===B.key);
  T.check('history: one entry each, with who decided', ha&&hb&&ha.by==='Wail'&&hb.by==='Albaraa'&&!H.find(e=>e.key===C.key));
  T.check('history keeps the hours that changed', ha.days.length===1 && ha.days[0].d==='Wed' && /9AM–1PM/.test(ha.days[0].a) && !ha.days[0].b);
  T.check('history keeps the decision and the date', ha.d==='new' && hb.d==='keep' && Math.abs(Date.parse(ha.at)-Date.now()+25*3600e3)<60e3);
  /* the review shows the countdown on the one still there */
  api.go('master'); await wait(250);
  const sd=doc.querySelector('#pg-master .sd');
  T.check('the review says when it moves to history', /moves to history in 2[23]h/.test(sd.textContent));
  /* notes: a confirmed note date leaves the list after 24 hours */
  const its=api.ntItems().filter(it=>it.ev.length&&it.ev.every(e=>e.from||e.to));
  const n1=its[0], n2=its[1];
  api.ntSaveDec(n1,n1.ev,'ok'); api.ntSaveDec(n2,n2.ev,'ok');
  S.settings.noteDec[n1.key].at=ago(26); S.settings.noteDec[n1.key].by='Wail';
  api.refresh(); api.go('master'); await wait(250);
  doc.querySelector('[data-ntfl="all"]')&&doc.querySelector('[data-ntfl="all"]').click(); await wait(250);
  const nt=doc.getElementById('ntCard').textContent;
  const rowOf=k=>[...doc.querySelectorAll('#ntCard [data-ntundo],#ntCard [data-ntok]')].some(x=>(x.getAttribute('data-ntundo')||x.getAttribute('data-ntok'))===k);
  T.check('note confirmed 26 h ago: gone from the notes list', !rowOf(n1.key));
  T.check('note confirmed just now: still in the list, with its countdown', rowOf(n2.key) && /moves to history in/.test(nt));
  T.check('…and it still counts (the decision is kept)', S.settings.noteDec[n1.key].st==='ok');
  const hn=api.chgAll().find(e=>e.kind==='note'&&e.key===n1.key);
  T.check('history has the note date, who and when', hn && hn.by==='Wail' && hn.ev.length>0);
  /* Settings → Change history */
  api.go('settings'); api.setSub('chglog'); await wait(250);
  const pg=doc.getElementById('pg-chglog');
  const txt=pg.textContent;
  T.check('Settings has a Change history tab with the three decisions', !!doc.querySelector('[data-set="chglog"]') && pg.querySelectorAll('.chg-e').length===3);
  T.check('each shows who decided', /Wail/.test(txt) && /Albaraa/.test(txt));
  T.check('…the hours (Wed 9AM–1PM)', /Wed/.test(txt) && /9AM–1PM/.test(txt));
  T.check('…and the decision', /Took the new file/.test(txt) && /Kept the old schedule/.test(txt) && /Note date confirmed/.test(txt));
  doc.getElementById('chgU').value='Albaraa'; doc.getElementById('chgU').dispatchEvent(new w.Event('change')); await wait(150);
  T.check('filter by user', doc.querySelectorAll('#pg-chglog .chg-e').length===1);
  doc.getElementById('chgU').value=''; doc.getElementById('chgU').dispatchEvent(new w.Event('change')); await wait(150);
  doc.querySelector('[data-chf="note"]').click(); await wait(150);
  T.check('filter by kind', doc.querySelectorAll('#pg-chglog .chg-e').length===1);
  doc.querySelector('[data-chgre]').click(); await wait(200);
  T.check('Reopen puts the note back in the review', !S.settings.noteDec[n1.key] && !api.chgAll().find(e=>e.kind==='note'&&e.key===n1.key));
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
