/* Time labels line up with their blocks
   (was tl1.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const p=await (await b.newContext({viewport:{width:1700,height:1000},deviceScaleFactor:1.5})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  await p.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf('Master')>=0).click(); }); await p.waitForTimeout(1500);
  // put a 9-11 AM on Taha's Sunday through the editor
  await p.fill('#mfQ','Taha'); await p.waitForTimeout(800);
  const r=await p.$('#pg-master tr[data-mkey]'); await r.scrollIntoViewIfNeeded();
  // check alignment: each label sits under its own chip
  const al=await p.evaluate(()=>[...document.querySelectorAll('#pg-master tr[data-mkey] .mg-col')].map(c=>{
     const chip=c.querySelector('.dpg-c'), lab=c.querySelector('small'); const a=chip.getBoundingClientRect(), z=lab.getBoundingClientRect();
     return chip.textContent+':'+lab.textContent+' offset '+Math.round((z.left+z.width/2)-(a.left+a.width/2)); }));
  console.log('labels',al);
  await r.screenshot({path:T.out('tl-1.png')});
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
