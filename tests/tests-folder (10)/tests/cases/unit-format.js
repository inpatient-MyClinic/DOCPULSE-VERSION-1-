/* fmt() reuses one number formatter instead of building one per cell (speed
   fix). It must print exactly what the old toLocaleString version printed. */
const T=require('../lib/ctx');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','..','public','docpules.html'),'utf8');
const grab=(re)=>{ const m=html.match(re); if(!m) throw new Error('not found: '+re); return m[0]; };
const src=grab(/var FMT_NF=\{\};[\s\S]*?\nfunction fmt\(n,d\)\{[\s\S]*?return fmtNF\(0,6\)\.format\(r\); \}/);
const fmt=new Function(src+'; return fmt;')();
const old=(n,d)=>{ if(n===null||n===undefined||!isFinite(n)) return '—'; if(d!==undefined) return n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}); var r=Math.round(n*1e6)/1e6; return r.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:6}); };
let bad=0, first=''; const vals=[0,-0,1,-1,0.5,1.25,2.345,1234567.891,-0.0000004,1e-7,99.999999,NaN,Infinity,null,undefined,'12.5','abc','',true,1/3,2/3,1e21,-1234.5];
let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
for(let i=0;i<20000;i++) vals.push((rnd()-0.5)*Math.pow(10,Math.floor(rnd()*9)-3));
for(const v of vals) for(const d of [undefined,0,1,2,3]){ let a,b; try{a=old(v,d)}catch(e){a='E'+e.message} try{b=fmt(v,d)}catch(e){b='E'+e.message} if(a!==b){ bad++; if(!first) first=v+' d='+d+': '+a+' vs '+b; } }
T.check('fmt() prints the same as before for '+vals.length*5+' values', bad===0, first);
T.done();
