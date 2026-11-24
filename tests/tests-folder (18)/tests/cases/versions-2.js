/* Versions: second scenario
   (was mv2.js) */
const T=require('../lib/ctx');
const {chromium}=require('playwright-core');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1.3});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
  await p.goto(T.base+'/login.html');
  await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
  await p.waitForTimeout(12000);
  const nav=n=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  await nav('Master schedule'); await p.waitForTimeout(2500);
  await p.click('#mvSaveBtn'); await p.waitForTimeout(300); await p.click('#mvGo'); await p.waitForTimeout(2500);
  await p.fill('#mfQ','Taha Samman'); await p.waitForTimeout(800);
  await p.click('table.mgrid tbody tr[data-mkey] .dpg-c',{button:'right'}); await p.waitForTimeout(600);
  await p.click('[data-mgtog="Mon|0"]'); await p.click('[data-mgsave]'); await p.waitForTimeout(2000);
  await nav('Doctors'); await p.waitForTimeout(1500);
  await p.screenshot({path:T.out('alarm-1.png'),clip:{x:0,y:0,width:1600,height:330}});
  await nav('Master schedule'); await p.waitForTimeout(1500);
  await p.screenshot({path:T.out('alarm-2.png'),clip:{x:0,y:0,width:1600,height:420}});
  await p.click('#mvAlarm'); await p.waitForTimeout(700);
  await p.screenshot({path:T.out('alarm-3.png')});
  await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
