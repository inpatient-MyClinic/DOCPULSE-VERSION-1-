/* A closure at the time of a fixed OT session: he was not there, so the OT
   session is not counted — whatever the closure's reason (same as Paid extra).
   The clinic at that time keeps following the Rules.
     Both / no clash : OT −1 for any closure; the clinic closure counts only if
                       its reason counts (FT Business Need: clinic still paid).
                       A closure with no clinic under it is the OT's: not taken twice.
     OT fixed session: the OT stands in for the clinic, so it follows the Rules.
     Master schedule : the clashing OT was never counted; nothing changes. */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const r=n=>Math.round((n||0)*1e4)/1e4, Y=+S.settings.year, m=9;
  S.settings.ot=[{name:'Dr. Hamza Alofi',id:'1244',site:'J1',type:'FT',dept:'Orthopedic',spec:'',year:'',month:'',
    days:{Mon:[{f:540,t:780,fill:''}],Sat:[{f:1020,t:1260,fill:''}]}}];
  api.refresh();
  const doc=()=>S.result.rows.find(x=>x.id==='1244'&&x.site==='J1');
  let t=doc(); const slot=t.key+'|1|540-780';
  const rows=S.capacity.rows, tpl=rows.find(x=>x.status&&/close/i.test(x.status));
  const ks=Object.keys(S.rules);
  const counted=ks.find(k=>S.rules[k].include==='Y'&&/ALL/i.test(S.rules[k].filter||'ALL')&&!S.rules[k].noH&&/^personal.*\|.*emergenc/.test(k));
  const skipped=ks.find(k=>S.rules[k].include!=='Y'&&/^business/.test(k)&&rows.some(x=>x._key===k));
  T.check('a counted reason ('+counted+') and a skipped Business Need reason ('+skipped+') to test with', !!counted && !!skipped);
  const why=k=>{ const R=rows.find(x=>x._key===k); return {main:R.main,sub:R.sub}; };
  console.log('counted reason:',JSON.stringify(why(counted)),' skipped reason:',JSON.stringify(why(skipped)));
  let added=[];
  const close=(day,f,to,k)=>{ const x=Object.assign({},tpl,why(k),{id:'1244',site:'J1',name:t.name,empStatus:'FT',status:'Close',
      date:{y:Y,m:m,d:day},from:f,to:to,hours:(parseInt(to)-parseInt(f)),row:99950+added.length,_used:undefined,_why:undefined}); rows.push(x); added.push(x); return x; };
  const clear=()=>{ added.forEach(x=>rows.splice(rows.indexOf(x),1)); added=[]; };
  const run=(pick)=>{ S.settings.otRule={}; if(pick) S.settings.otRule[slot]=pick; S.settings.otClash={}; api.refresh(); t=doc();
    return {s:r(t.m[m].s),c:r(t.m[m].c),ot:r(t.m[m].ot),t:r(t.m[m].t),cut:r(t.m[m].otCut)}; };
  const delta=(a,b)=>({s:r(b.s-a.s),c:r(b.c-a.c),ot:r(b.ot-a.ot),t:r(b.t-a.t)});
  const show=(n,a,b)=>console.log(n.padEnd(46),JSON.stringify(delta(a,b)));
  /* Both: Mon 12 Oct 9–1 is clinic + OT */
  let b0=run('both');
  close(12,'09:00','13:00',counted); let b1=run('both'); clear();
  close(12,'09:00','13:00',skipped); let b2=run('both'); clear();
  show('both · Mon 9–1 · counted reason',b0,b1); show('both · Mon 9–1 · Business Need (skipped)',b0,b2);
  T.check('Both + counted closure: clinic closed AND OT cancelled (Total −2)', JSON.stringify(delta(b0,b1))===JSON.stringify({s:0,c:1,ot:-1,t:-2}));
  T.check('Both + skipped Business Need closure: clinic still paid, OT cancelled (Total −1)', JSON.stringify(delta(b0,b2))===JSON.stringify({s:0,c:0,ot:-1,t:-1}));
  /* no clash: Sat 17 Oct 5–9 is only the OT */
  close(17,'17:00','21:00',counted); const x1=added[0]; let b3=run('both'); clear();
  show('no clash · Sat 5–9 · counted reason',b0,b3);
  T.check('OT with no clinic at that time: OT cancelled, the closure not taken twice (Total −1)', JSON.stringify(delta(b0,b3))===JSON.stringify({s:0,c:0,ot:-1,t:-1}));
  T.check('…and that closure row says why it is not in Closed', x1._used===false && /OT fixed session/.test(x1._why));
  close(17,'17:00','19:00',skipped); let b4=run('both'); clear();
  show('no clash · Sat 5–7 (half) · skipped',b0,b4);
  T.check('a closure over half the OT time cancels half of it', delta(b0,b4).ot===-0.5 && delta(b0,b4).t===-0.5);
  close(17,'09:00','13:00',counted); let b5=run('both'); clear();
  T.check('a closure at another time that day leaves the OT alone', delta(b0,b5).ot===0);
  /* OT fixed session: the OT stands in for the clinic */
  let f0=run('fixed');
  close(12,'09:00','13:00',counted); let f1=run('fixed'); clear();
  close(12,'09:00','13:00',skipped); let f2=run('fixed'); clear();
  show('fixed · Mon 9–1 · counted reason',f0,f1); show('fixed · Mon 9–1 · Business Need (skipped)',f0,f2);
  T.check('OT fixed + counted closure: the session goes once (OT −1, Closed unchanged, Total −1)', JSON.stringify(delta(f0,f1))===JSON.stringify({s:0,c:0,ot:-1,t:-1}));
  T.check('OT fixed + skipped Business Need closure: kept, like a paid clinic (no change)', JSON.stringify(delta(f0,f2))===JSON.stringify({s:0,c:0,ot:0,t:0}));
  /* Master schedule: the clashing OT was never counted */
  let m0=run('master');
  close(12,'09:00','13:00',counted); let m1=run('master'); clear();
  show('master · Mon 9–1 · counted reason',m0,m1);
  T.check('Master schedule + closure: clinic closed as always, OT untouched', JSON.stringify(delta(m0,m1))===JSON.stringify({s:0,c:1,ot:0,t:-1}));
  /* Total still adds up, Paid extra agrees */
  close(12,'09:00','13:00',skipped); close(17,'17:00','21:00',counted); run('both');
  const adds=x=>{ for(let k=0;k<12;k++){ const y=x.m[k]; if(r(y.t)!==r(y.s-y.c+y.o+(y.ot||0))) return 'month '+k; } return ''; };
  T.check('Total = Sessions − Close + Open + OT Fixed, every doctor, every month', S.result.rows.every(x=>!adds(x)));
  const paid=api.pdItems().filter(x=>x.ot&&x.id==='1244'&&x.date&&x.date.m===m&&!x.blocked&&!x.dup).length;
  T.check('Paid extra pays the same OT sessions the Doctors page counts ('+paid+' = '+t.m[m].ot+')', paid===r(t.m[m].ot));
  /* the card */
  api.openDrawer(t.key); await new Promise(res=>setTimeout(res,200));
  const dw=w.document.getElementById('drawer').textContent;
  T.check('card: OT Fixed tile says how many a closure cancelled', /2 cancelled by a closure/.test(dw));
  T.check('card: the closure row says it cancels his OT fixed session', /cancels his OT fixed session at 5 PM–9 PM/.test(dw) && /cancels his OT fixed session at 9 AM–1 PM/.test(dw));
  clear(); api.refresh();
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
