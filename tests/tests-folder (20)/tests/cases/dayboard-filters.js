/* Master schedule → day view: four filter buttons (Show, Request, Sessions,
   Specialty). The choices stay hidden until a button is pressed; picking one
   applies it, closes the panel and shows it on the button. */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const doc=w.document, wait=ms=>new Promise(r=>setTimeout(r,ms));
  S.fold={sd:false,nt:false,mv:false,pd:false};
  /* the day with the most requests in the log */
  const Y=+S.settings.year, cnt={}; S.capacity.rows.forEach(r=>{ if(r.date&&r.date.y===Y){ const k=Y+'-'+String(r.date.m+1).padStart(2,'0')+'-'+String(r.date.d).padStart(2,'0'); cnt[k]=(cnt[k]||0)+1; } });
  const best=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
  S.mView='day'; S.mDate=best; S.mf.state=''; S.mf.why=''; S.mf.nses=''; S.mf.dspec='';
  api.go('master'); await wait(300);
  const q=s=>doc.querySelector('#pg-master '+s), qa=s=>[...doc.querySelectorAll('#pg-master '+s)];
  const btns=qa('[data-dbopen]').map(b=>b.querySelector('.dbf-t').textContent);
  T.check('four filter buttons: Show, Request, Sessions, Specialty', JSON.stringify(btns)==='["Show","Request","Sessions","Specialty"]', btns);
  T.check('no chips on show until a button is pressed', !q('#dbfPanel') && !q('[data-dbst]'));
  const total=+q('.dbf-cnt b').textContent;
  q('[data-dbopen="st"]').click(); await wait(200);
  T.check('Show opens its panel with the choices and counts', !!q('#dbfPanel') && qa('[data-dbst]').length===5 && q('[data-dbopen="st"]').getAttribute('aria-expanded')==='true');
  q('[data-dbst="closed"]').click(); await wait(200);
  T.check('picking "Closed" applies it and closes the panel', S.mf.state==='closed' && !q('#dbfPanel'));
  T.check('the button now reads Closed, and a clear link appears', /Closed/.test(q('[data-dbopen="st"]').textContent) && q('[data-dbopen="st"]').classList.contains('on') && !!q('[data-dbclr]'));
  q('[data-dbopen="why"]').click(); await wait(200);
  const heads=qa('#dbfPanel .dbf-ch').map(x=>x.textContent);
  T.check('Request panel groups the reasons (Closed for / Extra / To check)', heads.length>0 && heads.every(x=>/Closed for|Extra opened for|To check/.test(x)), heads);
  q('[data-dbopen="why"]').click(); await wait(200);
  T.check('pressing the same button again closes it', !q('#dbfPanel'));
  q('[data-dbclr]').click(); await wait(200);
  /* Specialty */
  q('[data-dbopen="spec"]').click(); await wait(200);
  const sps=qa('[data-dbsp]').map(b=>b.getAttribute('data-dbsp')).filter(Boolean);
  T.check('Specialty lists the specialties of the day, with a search box', sps.length>3 && !!q('#dbfSpecQ'));
  const pick=sps[0], n=+[...qa('[data-dbsp]')].find(b=>b.getAttribute('data-dbsp')===pick).querySelector('b').textContent;
  const sq=q('#dbfSpecQ'); sq.value=pick.slice(0,5); sq.dispatchEvent(new w.Event('input')); await wait(50);
  T.check('the search narrows the list', qa('[data-dbsp]').filter(b=>b.style.display!=='none').length<=sps.length+1 && [...qa('[data-dbsp]')].find(b=>b.getAttribute('data-dbsp')===pick).style.display!=='none');
  [...qa('[data-dbsp]')].find(b=>b.getAttribute('data-dbsp')===pick).click(); await wait(250);
  const shown=+q('.dbf-cnt b').textContent;
  console.log('specialty',pick,'→',shown,'of',total,'doctors (panel said',n+')');
  T.check('choosing a specialty shows only those doctors', S.mf.dspec===pick && shown===n && shown<total);
  /* Escape closes an open panel */
  q('[data-dbopen="ns"]').click(); await wait(150);
  doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true})); await wait(150);
  T.check('Escape closes the panel', !q('#dbfPanel') && S.dbOpen==='');
  q('[data-dbclr]').click(); await wait(200);
  T.check('Clear puts every filter back', !S.mf.dspec && !S.mf.state && +q('.dbf-cnt b').textContent===total);
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
