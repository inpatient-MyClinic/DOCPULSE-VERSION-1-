/* Dashboard: how many doctors are new and how many left this year, with
   names, months and how we know. */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const doc=w.document, wait=ms=>new Promise(r=>setTimeout(r,ms)), Y=+S.settings.year;
  S.settings.leftDocs={}; api.refresh();
  const rows=S.result.rows, base=api.staffMove(rows,Y);
  const a=rows.find(t=>!t.hybrid&&!S.result.rows.some(x=>x!==t&&x.name===t.name)&&!base.l.find(x=>x.key===t.key)&&!base.n.find(x=>x.key===t.key));
  const b=rows.find(t=>t!==a&&!base.l.find(x=>x.key===t.key)&&!base.n.find(x=>x.key===t.key)&&t.name!==a.name);
  const c=rows.find(t=>t!==a&&t!==b&&!base.l.find(x=>x.key===t.key)&&!base.n.find(x=>x.key===t.key)&&t.name!==a.name&&t.name!==b.name);
  S.settings.leftDocs[b.key]=1;                                       /* marked inactive */
  S.settings.noteDec=S.settings.noteDec||{};
  S.settings.noteDec[a.key]={sig:'x',st:'ok',at:new Date().toISOString(),by:'Wail',ev:[{kind:'start',from:Y+'-03-01',to:'',out:'none'}]};
  S.settings.chgLog={['j|'+c.key]:{id:'j|'+c.key,kind:'join',key:c.key,n:c.name,s:c.site,d:'join',at:new Date(Date.UTC(Y,6,10)).toISOString(),by:'Albaraa',done:new Date().toISOString()}};
  api.refresh();
  const M=api.staffMove(S.result.rows,Y);
  T.check('new: a confirmed start date in the notes (March)', !!M.n.find(x=>x.key===a.key&&new Date(x.ms).getUTCMonth()===2));
  T.check('new: a doctor saved as new in a master file (July)', !!M.n.find(x=>x.key===c.key&&new Date(x.ms).getUTCMonth()===6));
  T.check('left: a doctor marked inactive', !!M.l.find(x=>x.key===b.key&&/inactive/.test(x.why)));
  T.check('counts add up', M.n.length===base.n.length+2 && M.l.length===base.l.length+1);
  api.go('analysis'); await wait(250);
  const card=doc.querySelector('#pg-analysis .dsh-card.sm'), txt=card? card.textContent : '';
  T.check('Dashboard shows the Staff movement card', !!card && /Staff movement in /.test(txt));
  T.check('…with the new and left totals', txt.indexOf('+'+M.n.length)>=0 && txt.indexOf('−'+M.l.length)>=0);
  T.check('…the names', txt.indexOf(a.name)>=0 && txt.indexOf(b.name)>=0 && txt.indexOf(c.name)>=0);
  const marchBar=card.querySelectorAll('.sm-m')[2].querySelector('.sm-u i');
  T.check('…a bar for March', !!marchBar);
  card.querySelector('[data-dshdoc="'+a.key+'"]').click(); await wait(250);
  T.check('clicking a name opens that doctor', S.dw&&S.dw.key===a.key);
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
