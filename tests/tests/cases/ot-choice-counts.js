/* OT clash choice: master / fixed / both / none — Sessions, Fixed OT, breakdown and validation must agree */
/* OT clash choice Master / OT fixed / Both / day override: Sessions, breakdown and validation agree
   (was ot5.js) */
const T=require('../lib/ctx');

(async()=>{
  const fs=require('fs');
  const {api,S}=await require('../lib/srv')(T.cookie);
  const r=n=>Math.round((n||0)*1e4)/1e4;
  S.settings.ot=[{name:'Dr. Hamza Alofi',id:'1244',site:'J1',type:'FT',dept:'Orthopedic',spec:'',year:'',month:'',days:{Mon:[{f:540,t:780,fill:''}],Sat:[{f:1020,t:1260,fill:''}]}}];
  api.refresh();
  let t=S.result.rows.find(x=>x.id==='1244'&&x.site==='J1');
  const m=9, Y=S.settings.year;
  const others=()=>JSON.stringify(S.result.rows.filter(x=>!(x.id==='1244'&&x.site==='J1')).map(x=>[x.key,x.yt,x.ys]));
  const base=others();
  const snap=lab=>{
    t=S.result.rows.find(x=>x.id==='1244'&&x.site==='J1');
    S.bk.month=String(m); const bk=api.bkRows().find(x=>x.t===t);
    S.flt.month=String(m); const V=api.buildValidation(); S.flt.month=''; const vr=V.rows.find(x=>x.t.id==='1244'&&x.t.site==='J1');
    const cl=t.otClashes.filter(c=>c.month===m);
    console.log(lab.padEnd(16),'| Sessions',r(t.m[m].s),'| Total',r(t.m[m].t),'| Fixed OT',r(t.m[m].ot),'| OT waiting',r(t.otHeldM[m]),
      '| breakdown fixed',r(bk.fixed),'| validation',r(vr.sessions+vr.friExtra),'OT',r(vr.ot),'net',r(bk.net),'| clashes',cl.length,cl.length?('picks '+[...new Set(cl.map(c=>c.pick||'-'))].join('/')+' frac '+[...new Set(cl.map(c=>r(c.frac)))].join('/')):'');
    return {s:t.m[m].s,ot:t.m[m].ot,bk:bk.fixed,cl:cl,v:vr.sessions+vr.friExtra};
  };
  const a=snap('no choice');
  const days=a.cl.map(c=>c.day+'('+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(Date.UTC(Y,m,c.day)).getUTCDay()]+')');
  console.log('  clash days:',days.join(' '));
  const slots=[...new Set(a.cl.map(c=>t.key+'|'+new Date(Date.UTC(Y,m,c.day)).getUTCDay()+'|'+c.otTime.f+'-'+c.otTime.t))];
  const res={};
  for(const pick of ['master','fixed','both']){
    S.settings.otRule={}; slots.forEach(s=>S.settings.otRule[s]=pick); S.settings.otClash={};
    api.refresh(); res[pick]=snap('all days: '+pick);
    if(others()!==base) console.log('  !! OTHER DOCTORS CHANGED');
  }
  // day override: first clash day set to master while the slot rule is fixed
  S.settings.otRule={}; slots.forEach(s=>S.settings.otRule[s]='fixed');
  S.settings.otClash={}; S.settings.otClash[t.key+'|'+Y+'-'+m+'-'+a.cl[0].day]='master'; api.refresh(); const d=snap('fixed + 1 day master');
  S.settings.otRule={}; S.settings.otClash={}; api.refresh(); const z=snap('cleared again');
  const per=a.cl.reduce((x,c)=>x+(c.frac),0);
  console.log('\nCHECKS');
  const ok=(n,c)=>console.log((c?'  ✓ ':'  ✗ ')+n);
  ok('master: Sessions unchanged, OT not counted', r(res.master.s)===r(a.s) && r(res.master.ot)===r(a.ot));
  ok('both: Sessions unchanged, OT counted for every clash', r(res.both.s)===r(a.s) && res.both.ot>a.ot);
  ok('fixed: OT counted same as both', r(res.fixed.ot)===r(res.both.ot));
  ok('fixed: Sessions drop by the replaced clinics ('+r(a.s-res.fixed.s)+')', res.fixed.s<a.s);
  ok('fixed: breakdown agrees with Sessions', r(res.fixed.bk)===r(res.fixed.s) && r(a.bk)===r(a.s));
  ok('validation agrees with Sessions in every case', [a,res.master,res.fixed,res.both].every(x=>r(x.v)===r(x.s)));
  ok('day override puts that one clinic back', d.s>res.fixed.s && d.s<a.s);
  ok('clearing restores the start', r(z.s)===r(a.s) && r(z.ot)===r(a.ot));
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
