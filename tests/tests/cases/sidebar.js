/* New and classic sidebar
   (was sb1.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1500,height:900},deviceScaleFactor:1.5});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  await p.evaluate(()=>{ [...document.querySelectorAll('#nav button')].find(x=>/Master schedule/.test(x.textContent)).click(); });
  await p.waitForTimeout(800);
  await p.screenshot({path:T.out('sb-1.png'),clip:{x:0,y:0,width:520,height:900}});
  console.log('nav:',await p.evaluate(()=>document.getElementById('nav').innerText.replace(/\n+/g,' | ')));
  await p.click('#sbSw'); await p.waitForTimeout(500);
  await p.screenshot({path:T.out('sb-2.png'),clip:{x:0,y:0,width:520,height:900}});
  console.log('classic nav:',await p.evaluate(()=>document.getElementById('nav').innerText.replace(/\n+/g,' | ')), await p.evaluate(()=>document.getElementById('sbSw').textContent));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
