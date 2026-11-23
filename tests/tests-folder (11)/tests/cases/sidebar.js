/* The menu: one look only (the classic menu is gone), grouped, with the theme
   switch at its foot. */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1500,height:900},deviceScaleFactor:1.5});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await T.login(p); await p.waitForTimeout(12000);
  await p.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>/Master schedule/.test(x.textContent)).click(); });
  await p.waitForTimeout(800);
  await p.screenshot({path:T.out('sb-1.png'),clip:{x:0,y:0,width:520,height:900}});
  console.log('nav:',await p.evaluate(()=>document.getElementById('nav').innerText.replace(/\n+/g,' | ')));
  console.log('classic switch:',await p.evaluate(()=>!!document.getElementById('sbSw')),' theme switch:',await p.evaluate(()=>document.getElementById('thSw').innerText.replace(/\s+/g,' ')));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
