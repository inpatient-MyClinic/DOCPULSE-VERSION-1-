/* The statistics at the top of the pages show whole numbers (exact value on
   hover); the Dashboard keeps its decimals. */
const T=require('../lib/ctx');
(async()=>{
  const {api,S,w}=await require('../lib/srv')(T.cookie);
  const doc=w.document, wait=ms=>new Promise(r=>setTimeout(r,ms));
  S.flt.month='0'; api.refresh(); api.go('summary'); await wait(200);
  const vs=[...doc.querySelectorAll('#pg-summary .rail .st .v')].map(v=>({t:v.textContent,title:v.title}));
  console.log('Doctors strip:',JSON.stringify(vs));
  T.check('Doctors page: every figure in the strip is a whole number', vs.length>=4 && vs.every(v=>!/\d\.\d/.test(v.t)));
  T.check('…and the exact figure is on hover where it was rounded', vs.some(v=>/^Exactly .*\d\.\d/.test(v.title)));
  api.go('brk'); await wait(200);
  const bv=[...doc.querySelectorAll('#pg-brk .rail .st .v')].map(v=>v.textContent);
  T.check('Session breakdown strip: whole numbers', bv.length>0 && bv.every(t=>!/\d\.\d/.test(t)));
  /* the Dashboard is left as it is */
  const el=doc.createElement('div'); el.innerHTML='<div class="rail"><div class="st"><div class="v">12.5</div></div></div>';
  api.kpiRound(el); T.check('the rounding itself: 12.5 → 13', el.querySelector('.v').textContent==='13');
  api.go('analysis'); await wait(200);
  T.check('Dashboard keeps its own figures (no rounding marks)', !doc.querySelector('#pg-analysis .kpi-r'));
  T.done();
})().catch(e=>{console.error(e);process.exit(1);});
