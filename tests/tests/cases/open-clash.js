/* An opened request at the same hours as a clinic he already has that day is ONE
   session, not two. Default: counted as the clinic, the opening set aside and
   listed as waiting. Choose "Opened request": the opening counts, the clinic
   comes out of Sessions. Breakdown, warning card, card and health check agree. */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const r=n=>Math.round((n||0)*1e4)/1e4;
  const Y=S.settings.year, m=9;
  const rows=S.capacity.rows;
  const tpl=rows.find(x=>x._used&&/open/i.test(x.status));
  T.check('there is a counted opened request to copy', !!tpl);
  /* a doctor with a timed clinic on an October day with no closure and no holiday */
  const closedDays={}; rows.forEach(x=>{ if(x.date&&/close/i.test(x.status)) closedDays[x.id+'|'+x.site+'|'+x.date.m+'-'+x.date.d]=1; });
  let doc=null, day=null, span=null;
  for(const t of S.result.rows){
    if(!t.fromMaster||!t.spans||t.hybrid) continue;
    const plan=api.schedPlanMap(t,Y,m);
    for(let d=1;d<=28&&!doc;d++){
      const wd=new Date(Date.UTC(Y,m,d)).getUTCDay(), sp=(t.spans[wd]||[])[0];
      if(sp&&sp.t>sp.f&&plan[d]>0&&!closedDays[t.id+'|'+t.site+'|'+m+'-'+d]){ doc=t; day=d; span=sp; }
    }
    if(doc) break;
  }
  T.check('found a doctor with a timed clinic in October', !!doc);
  const hhmm=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  const add=Object.assign({},tpl,{id:doc.id,site:doc.site,name:doc.name,date:{y:Y,m:m,d:day},from:hhmm(span.f),to:hhmm(span.t),row:99901,_used:undefined,_why:undefined});
  const key=doc.key, look=()=>{ const t=S.result.rows.find(x=>x.key===key); return {s:r(t.m[m].s),o:r(t.m[m].o),t:r(t.m[m].t),cl:(t.openClash||[]).length}; };
  const others=()=>JSON.stringify(S.result.rows.filter(x=>x.key!==key).map(x=>[x.key,r(x.yt)]));
  const a0=look(), base=others(), n0=(S.result.openClash||[]).length;
  rows.push(add); api.refresh();
  const a1=look();
  console.log('doctor',doc.name,doc.site,'day',day,'clinic',hhmm(span.f)+'-'+hhmm(span.t),'| before',JSON.stringify(a0),'| with opening',JSON.stringify(a1));
  const c=(S.result.openClash||[]).find(x=>x.key===key&&x.day===day);
  T.check('the opening is listed as a clash, waiting', !!c && c.pick==='' && S.result.openClash.length===n0+1);
  T.check('default: counted once, as the clinic (Opened and Total unchanged)', a1.o===a0.o && a1.t===a0.t && a1.s===a0.s);
  T.check('the opening row says why it is not counted', add._used===false && /same hours as his clinic/.test(add._why||''));
  T.check('other doctors unchanged', others()===base);
  /* the warning card on the Doctors page */
  api.refresh(); api.renderSummary();
  const card=w.document.getElementById('ocCard');
  T.check('warning card shows on the Doctors page', !!card && /same time as a clinic/.test(card.textContent) && /waiting/.test(card.textContent));
  const btn=card&&[...card.querySelectorAll('[data-ocpk]')].find(b=>b.getAttribute('data-ocpk')===c.id+'|open');
  T.check('the card has the two choices', !!btn && card.querySelectorAll('[data-ocpk]').length>=2);
  /* choose the opened request by clicking */
  btn.click(); await new Promise(res=>setTimeout(res,600));
  const a2=look(), c2=S.result.openClash.find(x=>x.id===c.id);
  console.log('choose opened request:',JSON.stringify(a2));
  T.check('click saves the choice', S.settings.openClash[c.id]==='open' && c2.pick==='open');
  T.check('opened request: Opened up, Sessions down by the clinic, Total same as before', a2.o>a0.o && a2.s<a0.s && a2.t===a0.t);
  T.check('opened request: the row now counts', add._used===true && add._openClash==='open');
  S.bk.month=String(m); const bk=api.bkRows().find(x=>x.t.key===key);
  T.check('breakdown agrees with Sessions', bk && r(bk.fixed)===a2.s, bk&&bk.fixed);
  T.check('other doctors unchanged', others()===base);
  /* health check */
  const hc=api.healthChecks().find(x=>/same time as a clinic/i.test(x.title));
  T.check('health check lists it, nothing waiting after the choice', !!hc && hc.n===(S.result.openClash.filter(x=>!x.pick).length));
  /* master schedule choice and clearing */
  S.settings.openClash[c.id]='roster'; api.refresh(); const a3=look();
  T.check('master schedule choice = default numbers', JSON.stringify(a3)===JSON.stringify(a1));
  delete S.settings.openClash[c.id]; rows.pop(); api.refresh();
  T.check('removing the opening restores the start', JSON.stringify(look())===JSON.stringify(a0));
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
