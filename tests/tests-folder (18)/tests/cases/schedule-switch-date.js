/* New master file, one doctor changed: "Use new" can start on a date and
   "Keep old" can run until a date. Before the switch he is counted on his old
   week, from it on the new one. The card says he has a new schedule, the
   Doctors list shows a badge, and the month template shows the old week for
   months before the switch. */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const doc=w.document, r=n=>Math.round((n||0)*1e4)/1e4, Y=+S.settings.year;
  const wait=ms=>new Promise(res=>setTimeout(res,ms));
  S.fold={oc:true,sd:true,nt:true};   /* panels open: this test is about what is inside them */
  api.refresh();
  T.check('a saved schedule to compare with', !!(S.settings.schedSave&&S.settings.schedSave.lines.length));
  /* the saved (old) schedule had one more clinic: Wednesday 9–1 */
  const t0=S.result.rows.find(x=>x.fromMaster&&!x.hybrid&&!x.week[3]&&x.week.reduce((a,b)=>a+b,0)>=3&&!S.settings.mstEdit?.[x.key]);
  T.check('picked a doctor with no Wednesday clinic', !!t0);
  const key=t0.key, ln=S.settings.schedSave.lines.find(l=>(l.i+'|'+l.s+'|'+api.nameKey(l.n))===key);
  const fill=(ln.c.flat().find(x=>x&&x[2])||[0,0,''])[2];
  ln.c[3]=[[540,780,fill]];
  api.refresh();
  const D=S.pendingDiff, c=D&&D.changed.find(x=>x.key===key);
  T.check('the review lists him as changed (old '+(c&&c.wa)+' → new '+(c&&c.wb)+' a week)', !!c && c.wa===c.wb+1);
  const sess=()=>{ const t=S.result.rows.find(x=>x.key===key); return t.m.map(m=>r(m.s)); };
  const base=sess();                       /* undecided: the new file is counted */
  api.go('master'); await wait(300);
  const q=sel=>doc.querySelector('#pg-master '+sel);
  /* Use new, from a date */
  q(`[data-sdnew="${key}"]`).click(); await wait(300);
  const tg=q(`[data-sdwhen="${key}"]`);
  T.check('Use new shows the "start on a date" switch', !!tg && /on a date/.test(tg.closest('.sd-when').textContent));
  tg.checked=true; tg.dispatchEvent(new w.Event('change',{bubbles:true})); await wait(300);
  const inp=q(`[data-sdwd="${key}"]`);
  T.check('switch on: a date box and quick dates', !!inp && q(`[data-sdwq^="${key}|"]`)!==null);
  inp.value=Y+'-10-01'; inp.dispatchEvent(new w.Event('change',{bubbles:true})); await wait(300);
  const x=api.sdDatedOf(key);
  T.check('saved: new schedule from 1 Oct', x && x.from===Y+'-10-01' && x.side==='new');
  const a=sess();
  console.log('Sessions Jan–Dec  new only',JSON.stringify(base),'\n                  new from Oct',JSON.stringify(a));
  T.check('before October he is counted on the old week (more sessions every month)', [0,1,2,3,4,5,6,7,8].every(m=>a[m]>=base[m]) && a[8]>base[8]);
  T.check('from October on the new week (same as the new file)', [9,10,11].every(m=>a[m]===base[m]));
  T.check('the review says old until 30 Sep, new from 1 Oct', /Old schedule until 30 Sep/.test(q(`[data-sdwd="${key}"]`).closest('.sd-doc').textContent));
  /* the card */
  const t=S.result.rows.find(x=>x.key===key);
  const ch=api.sdChangeOf(t);
  T.check('card notice: waiting to be saved, with the dated choice', ch && ch.kind==='pending' && ch.from===Y+'-10-01');
  const W=api.pdWeekOf(t,Y,8), W2=api.pdWeekOf(t,Y,10);
  T.check('September template is the old week (has Wednesday)', W.src==='old' && W.spans[3].length===1);
  T.check('November template is the new week', W2.src!=='old' && !W2.spans[3].length);
  /* Keep old, until a date = the same split */
  q(`[data-sdkeep="${key}"]`).click(); await wait(300);
  T.check('switching to Keep old drops the date', !api.sdDatedOf(key));
  const k0=sess();
  T.check('Keep old (no date): old week all year', k0.every((v,m)=>v>=base[m]) && k0[10]>base[10]);
  const tk=q(`[data-sdwhen="${key}"]`); tk.checked=true; tk.dispatchEvent(new w.Event('change',{bubbles:true})); await wait(300);
  const ik=q(`[data-sdwd="${key}"]`); ik.value=Y+'-09-30'; ik.dispatchEvent(new w.Event('change',{bubbles:true})); await wait(300);
  const xk=api.sdDatedOf(key);
  T.check('Keep old until 30 Sep = new from 1 Oct', xk && xk.side==='keep' && xk.from===Y+'-10-01');
  T.check('Keep old until 30 Sep counts the same as Use new from 1 Oct', JSON.stringify(sess())===JSON.stringify(a));
  T.check('a dated Keep old does not leave an edit on the master', !(S.settings.mstEdit||{})[key]);
  /* save, then the card and the list */
  const n=D.changed.length; D.changed.forEach(cc=>{ if(cc.key!==key) S.settings.sdDec=Object.assign(S.settings.sdDec||{},{[cc.key]:{h:api.mvHash(JSON.stringify(cc.bits||[])),d:'new'}}); });
  T.check('everything decided, saved', api.sdFinish()===true); api.refresh();
  T.check('after saving: the date stays and counts the same', api.sdDatedOf(key) && JSON.stringify(sess())===JSON.stringify(a));
  const ch2=api.sdChangeOf(S.result.rows.find(x=>x.key===key));
  T.check('card notice after saving: new schedule since 1 Oct', ch2 && ch2.kind==='since' && ch2.from===Y+'-10-01');
  api.openDrawer(key); await wait(200);
  const note=doc.getElementById('sdNote');
  T.check('the doctor card shows the notice with old → new', !!note && /New schedule since 1 Oct/.test(note.textContent) && /Wed/.test(note.textContent));
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
