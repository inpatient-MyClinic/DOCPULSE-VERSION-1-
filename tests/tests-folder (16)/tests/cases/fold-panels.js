/* The long panels above the tables fold to one line, start folded, and
   remember open/closed: the clash warning on Doctors, and the new-master
   review and note dates on Master schedule. The header still says how many. */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const doc=w.document, wait=ms=>new Promise(res=>setTimeout(res,ms));
  try{ w.localStorage.clear(); }catch(e){}
  S.fold={};
  /* a clash, so the warning has something to show */
  const rows=S.capacity.rows, tpl=rows.find(x=>x._used&&/open/i.test(x.status));
  const t0=S.result.rows.find(t=>t.id==='1244'&&t.site==='J1');
  const sp=t0.spans[4][0]||t0.spans.flat()[0];
  let day=1; for(;day<=28;day++){ const wd=new Date(Date.UTC(+S.settings.year,9,day)).getUTCDay(); if((t0.spans[wd]||[]).length&&api.schedPlanMap(t0,+S.settings.year,9)[day]>0) break; }
  const wd=new Date(Date.UTC(+S.settings.year,9,day)).getUTCDay(), s0=t0.spans[wd][0];
  const hh=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  rows.push(Object.assign({},tpl,{id:t0.id,site:t0.site,name:t0.name,date:{y:+S.settings.year,m:9,d:day},from:hh(s0.f),to:hh(s0.t),row:99902}));
  api.go('summary'); api.refresh(); api.renderSummary(); await wait(100);
  let card=doc.getElementById('ocCard');
  T.check('Doctors: the clash warning is there', !!card);
  T.check('Doctors: it starts folded — one line, no rows', card.classList.contains('folded') && !card.querySelector('[data-ocpk]'));
  const N=S.result.openClash.length, Wt=S.result.openClash.filter(c=>!c.pick).length;
  T.check('Doctors: the folded line still says how many ('+N+') and how many wait ('+Wt+')', new RegExp(N+' opened requests? at the same time').test(card.textContent) && new RegExp(Wt+' waiting').test(card.textContent));
  let btn=card.querySelector('.fold-b');
  T.check('Doctors: a Show button, marked closed for screen readers', btn && /Show/.test(btn.textContent) && btn.getAttribute('aria-expanded')==='false');
  btn.click(); await wait(100); card=doc.getElementById('ocCard');
  T.check('Doctors: Show opens it — rows and choices', !card.classList.contains('folded') && card.querySelectorAll('[data-ocpk]').length===2*N);
  T.check('Doctors: remembered on this browser', w.localStorage.getItem('dp.fold.oc')==='1');
  card.querySelector('.fold-b').click(); await wait(100); card=doc.getElementById('ocCard');
  T.check('Doctors: Hide folds it again', card.classList.contains('folded') && w.localStorage.getItem('dp.fold.oc')==='0');
  /* a fresh page reads what was remembered */
  S.fold={}; w.localStorage.setItem('dp.fold.oc','1'); api.renderSummary(); await wait(50);
  T.check('Doctors: after a reload it opens as you left it', !doc.getElementById('ocCard').classList.contains('folded'));
  /* Master schedule: a new file that changes one doctor */
  const key=t0.key, ln=S.settings.schedSave.lines.find(l=>(l.i+'|'+l.s+'|'+api.nameKey(l.n))===key);
  ln.c[3]=(ln.c[3]||[]).concat([[540,780,'']]);
  api.refresh(); api.go('master'); await wait(200);
  let sd=doc.querySelector('#pg-master .sd');
  T.check('Master: the review starts folded — header and progress only', !!sd && sd.classList.contains('folded') && !sd.querySelector('.sd-doc') && !!sd.querySelector('.sd-prog'));
  T.check('Master: the folded review still says how many changed', /changes 1 doctor/.test(sd.textContent) && /0 of 1 decided/.test(sd.textContent));
  sd.querySelector('.fold-b[data-fold="sd"]').click(); await wait(200); sd=doc.querySelector('#pg-master .sd');
  T.check('Master: Show opens the doctors', !sd.classList.contains('folded') && sd.querySelectorAll('.sd-doc').length===1);
  sd.querySelector('.fold-b[data-fold="sd"]').click(); await wait(200);
  T.check('Master: Hide folds it again', doc.querySelector('#pg-master .sd').classList.contains('folded'));
  const nt=doc.getElementById('ntCard');
  if(nt){ T.check('Master: note dates start folded', !nt.querySelector('.nt-list') && !!nt.querySelector('.fold-b[data-fold="nt"]'));
    nt.querySelector('.fold-b').click(); await wait(200);
    T.check('Master: note dates open on Show', !!doc.querySelector('#ntCard .nt-list')); }
  const pd=doc.querySelector('#pg-master .pd-card');
  if(pd) T.check('Master: Pedia starts folded, its Counting switch still there', pd.classList.contains('folded') && !pd.querySelector('[data-pdm]') && !!pd.querySelector('#pdOn'));
  const mvc=doc.getElementById('mvCard');
  if(mvc) T.check('Master: Versions starts folded, Save version still there', mvc.classList.contains('folded') && !mvc.querySelector('[data-mvm]') && !!mvc.querySelector('#mvSaveBtn'));
  const tbl=doc.querySelector('#pg-master table');
  T.check('Master: the schedule table is still on the page', !!tbl);
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
