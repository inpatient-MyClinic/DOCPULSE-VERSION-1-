/* live: card open, scroll kept, a new workbook, a new version, a server restart */
/* Live sync: scroll kept, open card kept, new workbook, new version, server restart
   (was live2.js) */
const T=require('../lib/ctx');

const {chromium}=require('playwright-core'); const fs=require('fs');
const SP=T.SP;
(async()=>{
  const b=await chromium.launch({executablePath:T.chrome,args:['--no-sandbox']});
  const mk=async(tag)=>{ const c=await b.newContext({viewport:{width:1500,height:900}}); const p=await c.newPage(); p.on('dialog',d=>d.accept());
    p.errs=[]; p.on('pageerror',e=>p.errs.push(tag+': '+e.message)); p.toasts=[]; await p.exposeFunction('__toast',t=>p.toasts.push(t));
    await p.goto(T.base+'/login.html'); await p.fill('#email',T.email); await p.fill('#password',T.password); await p.click('#go'); await p.waitForURL('**/');
    return p; };
  const A=await mk('A'), B=await mk('B');
  await A.waitForTimeout(12000);
  for(const p of [A,B]) await p.evaluate(()=>{ const t=document.getElementById('toast'); new MutationObserver(()=>{ if(t.classList.contains('on')) window.__toast(t.textContent); }).observe(t,{attributes:true,childList:true}); });
  const ok=(n,c)=>console.log((c?'  ✓ ':'  ✗ ')+n);
  const nav=(p,n)=>p.evaluate(n=>{ [...document.querySelectorAll('#nav button')].find(x=>x.textContent.indexOf(n)>=0).click(); },n);
  const other=(p,path,method,body,type)=>p.evaluate(async({path,method,body,type})=>{
    const o={method,credentials:'same-origin',headers:{'Content-Type':type||'application/json','X-DP-Client':'someone-else'}};
    if(type==='application/octet-stream'){ const bin=atob(body); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); o.body=u; } else o.body=JSON.stringify(body);
    const r=await fetch(path,o); return r.status; },{path,method,body,type});
  const waitToast=async(p,re,ms)=>{ const t=Date.now(); while(Date.now()-t<(ms||12000)){ if(p.toasts.some(x=>re.test(x))) return true; await p.waitForTimeout(400); } return false; };
  // 1. B scrolled down the Doctors page: an update must not move it
  await nav(B,'Doctors'); await B.waitForTimeout(1500);
  await B.evaluate(()=>{ document.querySelector('.body').scrollTop=900; }); await B.waitForTimeout(300);
  const s0=await B.evaluate(()=>document.querySelector('.body').scrollTop);
  await other(A,'/api/settings','PUT',{settings:{hrs:4}});
  ok('B updated', await waitToast(B,/settings/));
  const s1=await B.evaluate(()=>document.querySelector('.body').scrollTop);
  ok('B\'s scroll stayed put ('+s0+' → '+s1+')', s0===s1&&s0>0);
  // 2. B has a doctor card open: it stays open and is redrawn
  await B.evaluate(()=>{ document.querySelector('.body').scrollTop=0; });
  await B.fill('#q','Hamza'); await B.waitForTimeout(800);
  await B.evaluate(()=>document.querySelector('#pg-summary tbody tr').click()); await B.waitForTimeout(600);
  B.toasts.length=0;
  await other(A,'/api/settings','PUT',{settings:{hrs:4}});
  ok('B updated with the card open', await waitToast(B,/settings/));
  ok('the card is still open', await B.evaluate(()=>document.getElementById('drawer').classList.contains('on')));
  await B.keyboard.press('Escape'); await B.fill('#q',''); await B.waitForTimeout(500);
  // 3. someone uploads a new master workbook
  await nav(B,'Master'); await B.waitForTimeout(1500);
  B.toasts.length=0;
  const st=await other(A,'/api/files/master?name=Master-v2.xlsx','POST',fs.readFileSync(SP+'back-new.xlsx').toString('base64'),'application/octet-stream');
  ok('upload accepted ('+st+')', st===200);
  ok('B loaded the new workbook', await waitToast(B,/workbook/,20000));
  await B.waitForTimeout(3000);
  await nav(B,'Data'); await B.waitForTimeout(1200);
  ok('B\'s Data page shows the new file name', await B.evaluate(()=>document.body.innerText.indexOf('Master-v2.xlsx')>=0));
  await nav(B,'Master'); await B.waitForTimeout(800);
  // 4. someone saves a schedule version
  B.toasts.length=0;
  const st2=await other(A,'/api/schedule','PUT',{year:72026,schedule:{v:3,at:new Date().toISOString(),by:'x',eff:'2026-11-01',src:'file',file:'v.xlsx',legend:[],lines:[]},note:JSON.stringify({d:'2026-11-01',src:'file',f:'v.xlsx',s:'first'})});
  ok('version saved ('+st2+')', st2===200);
  ok('B told about the master schedule', await waitToast(B,/master schedule/));
  // 5. the server restarts (a deploy): pages carry on and catch up
  await T.restartServer();
  await A.waitForTimeout(9000);
  B.toasts.length=0;
  await other(A,'/api/settings','PUT',{settings:{hrs:4}});
  ok('after the restart B still gets updates', await waitToast(B,/settings/,20000));
  console.log('errors',A.errs.concat(B.errs));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
