/* Settings → Rules → H doctor rules.
   - With nothing changed, Annual Leave alone uses the allowance (numbers as before).
   - Ticking another reason makes its closures come out of the allowance first.
   - Unticking Annual Leave makes those closures count against the doctor.
   - "Counted for H" is the H button of the counting rule: off → H rows of that
     reason stop counting, other staff keep it. */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const r=n=>Math.round((n||0)*1e4)/1e4;
  const docs=()=>S.result.rows.filter(t=>t.hybrid);
  const rows=(S.capacity.rows||[]).filter(x=>x._used&&/close/i.test(x.status));
  const H=docs();
  T.check('there are H doctors in the test log ('+H.length+')', H.length>0);
  /* an H doctor with closures that are not Annual Leave */
  let pick=null, reason=null;
  for(const t of H){ const mine=rows.filter(x=>(x.id+'|'+x.site)===(t.id+'|'+t.site)&&!/annual\s*leave/i.test(x.sub+' '+x.main)); if(mine.length){ pick=t; reason=mine[0]; break; } }
  T.check('found an H doctor with a closure that is not Annual Leave', !!pick);
  const key=pick.key, rk=api.S.rules&&Object.keys(S.rules).find(k=>S.rules[k].main===reason.main&&S.rules[k].sub===reason.sub);
  const look=()=>{ const t=S.result.rows.find(x=>x.key===key); return {yc:r(t.yc),yt:r(t.yt),used:r(t.allowUsed),al:r(t.yAL),allow:r(t.allow)}; };
  /* give him room in the allowance so the effect shows */
  S.settings.hybAllow=Object.assign({},S.settings.hybAllow||{}); S.settings.hybAllow[key]=50; api.refresh();
  const a0=look();
  console.log('reason:',reason.main,'›',reason.sub,'| start',JSON.stringify(a0));
  S.settings.hAllow={}; S.settings.hAllow[rk]=true; api.refresh();
  const a1=look();
  console.log('reason uses the allowance:',JSON.stringify(a1));
  T.check('ticking the reason moves its closures into the allowance (closed '+a0.yc+' → '+a1.yc+')', a1.yc<a0.yc && a1.used>a0.used && r(a1.yt-a0.yt)===r(a0.yc-a1.yc));
  /* Annual Leave unticked */
  const alKeys=Object.keys(S.rules).filter(k=>/annual\s*leave/i.test(S.rules[k].sub+' '+S.rules[k].main));
  S.settings.hAllow={}; alKeys.forEach(k=>S.settings.hAllow[k]=false); api.refresh();
  const allH=docs(), usedAll=allH.reduce((s,t)=>s+(t.allowUsed||0),0);
  T.check('with Annual Leave unticked, no H doctor uses the allowance', r(usedAll)===0, usedAll);
  S.settings.hAllow={}; api.refresh();
  const back=look();
  T.check('back to default: same numbers as at the start', JSON.stringify(back)===JSON.stringify(a0), back);
  /* counted for H off: H rows of that reason stop counting, everyone else keeps it */
  const rule=S.rules[rk], before=JSON.stringify(rule);
  const otherBefore=S.result.rows.filter(t=>!t.hybrid).reduce((s,t)=>s+t.yc,0);
  w.document.querySelector('#nav button:nth-child(2)').click();
  S.page='rules'; 
  const nav=[...w.document.querySelectorAll('#nav button')].find(x=>/Settings/.test(x.textContent)); if(nav) nav.click();
  S.setTab='rules'; api.refresh();
  const sw=[...w.document.querySelectorAll('#pg-rules [data-hcnt]')].find(b=>b.getAttribute('data-hcnt')===rk);
  T.check('the H doctor rules card is on Settings → Rules with a switch per reason', !!w.document.getElementById('hRules') && !!sw);
  if(sw) sw.click();
  const t2=S.result.rows.find(x=>x.key===key), otherAfter=S.result.rows.filter(t=>!t.hybrid).reduce((s,t)=>s+t.yc,0);
  console.log('rule',before,'→',JSON.stringify(S.rules[rk]));
  T.check('"Counted for H" off: the H doctor\'s rows of that reason no longer count', r(t2.yc)<a0.yc || r(t2.yt)>a0.yt, look());
  T.check('"Counted for H" off: other staff are unchanged', r(otherAfter)===r(otherBefore), otherBefore+' → '+otherAfter);
  const sw2=[...w.document.querySelectorAll('#pg-rules [data-hcnt]')].find(b=>b.getAttribute('data-hcnt')===rk); if(sw2) sw2.click();
  T.check('switch back on: the rule is as it was', JSON.stringify(S.rules[rk])===before||(S.rules[rk].include==='Y'&&(api.S.rules[rk].filter==='ALL'||/H/.test(S.rules[rk].filter))), JSON.stringify(S.rules[rk]));
  /* Counting rules: two staff types picked together ("FT,PT") count rows of either — they used to count nobody */
  const cand=Object.keys(S.rules).find(k=>{ const ru=S.rules[k]; if(ru.include!=='Y'||ru.noH) return false;
    return S.capacity.rows.some(x=>x.main===ru.main&&x.sub===ru.sub&&x.date&&/^(FT|PT)$/i.test(x.empStatus)); });
  if(cand){
    const ru=S.rules[cand], keep=ru.filter;
    ru.filter='FT'; api.refresh(); const ft=S.result.ruleHit[cand]||0;
    ru.filter='PT'; api.refresh(); const pt=S.result.ruleHit[cand]||0;
    ru.filter='FT,PT'; api.refresh(); const both=S.result.ruleHit[cand]||0;
    ru.filter=keep; api.refresh();
    T.check('a rule set to FT and PT together counts both ('+ft+' + '+pt+' = '+both+')', both===ft+pt && both>0);
  } else T.check('found a reason with FT or PT rows', false);
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
