/* Boot the served page in jsdom against the running server, so the whole path
   is exercised: fetch -> API -> SQLite -> the portal's figures. */
const {JSDOM,VirtualConsole}=require('jsdom');
const http=require('http');
const BASE=process.env.DP_BASE || 'http://localhost:3112';
function req(path,opt){
  return new Promise((res,rej)=>{
    const u=new URL(BASE+path);
    const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname+u.search,
      method:(opt&&opt.method)||'GET',headers:(opt&&opt.headers)||{}},(resp)=>{
      const chunks=[]; resp.on('data',c=>chunks.push(c));
      resp.on('end',()=>res({status:resp.statusCode,headers:resp.headers,body:Buffer.concat(chunks)}));
    });
    r.on('error',rej);
    if(opt&&opt.body) r.write(opt.body);
    r.end();
  });
}
module.exports=async function boot(cookie){
  const page=await req('/',{headers:{Cookie:cookie}});
  let html=page.body.toString('utf8');
  const GUARD="if(typeof module!=='undefined'&&module.exports)\n  module.exports={";
  if(html.indexOf(GUARD)>=0) html=html.replace(GUARD,"window.__api={");
  const vc=new VirtualConsole();
  vc.on('jsdomError',e=>console.log('JSDOM ERROR:',e.message.slice(0,300)));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:BASE+'/',
    virtualConsole:vc,
    beforeParse(w){
      w.alert=m=>{ (w.__alerts=w.__alerts||[]).push(String(m)); };
      w.Blob=function(parts,o){ this.__parts=parts; this.__type=o&&o.type; };
      w.URL.createObjectURL=function(b){ w.__lastBlob=b; return 'blob:x'; };
      w.URL.revokeObjectURL=function(){};
      /* jsdom has no fetch to a live server with cookies, so route it ourselves */
      w.fetch=function(path,opt){
        opt=opt||{};
        const headers=Object.assign({},opt.headers||{},{Cookie:cookie});
        let body=opt.body;
        if(body&&typeof body!=='string'&&!(body instanceof Buffer)){
          try{ body=Buffer.from(body); }catch(e){}
        }
        return req(String(path).replace(BASE,''),{method:opt.method||'GET',headers,body})
          .then(r=>({
            ok:r.status>=200&&r.status<300, status:r.status,
            json:()=>Promise.resolve(JSON.parse(r.body.toString('utf8')||'{}')),
            text:()=>Promise.resolve(r.body.toString('utf8')),
            arrayBuffer:()=>Promise.resolve(r.body.buffer.slice(r.body.byteOffset,r.body.byteOffset+r.body.byteLength))
          }));
      };
    }});
  const w=dom.window;
  await new Promise(r=>w.addEventListener('load',r));
  /* capture downloads instead of navigating */
  w.HTMLAnchorElement.prototype.click=function(){ w.__dl={name:this.download,blob:w.__lastBlob}; };
  /* the boot chain is async: wait for the roster to appear */
  for(let i=0;i<120;i++){
    if(w.__api&&w.__api.S&&w.__api.S.result) break;
    await new Promise(r=>setTimeout(r,100));
  }
  return {w,api:w.__api,S:w.__api&&w.__api.S,req};
};
