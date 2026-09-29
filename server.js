// Zero-dependency Node server: static frontend + JSON API. Run: node server.js
const http=require('http'),fs=require('fs'),path=require('path'),E=require('./lib/engine');
const PORT=process.env.PORT||3000,PUB=path.join(__dirname,'public');
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
const post={calculate:E.calculate,bands:E.bands,compare:E.compare,benefits:E.benefits,tax:E.taxProfile,dashboard:E.dashboard,engagement:E.engagement};
const send=(res,s,o)=>{res.writeHead(s,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(o))};
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x'),p=u.pathname;
  const run=fn=>{try{send(res,200,fn())}catch(e){send(res,e.status||500,{error:e.message})}};
  if(p.startsWith('/api/')){
    const r=p.slice(5).split('/');
    if(req.method==='POST'&&post[r[0]]){let b='';req.on('data',d=>{b+=d;if(b.length>1e5)req.destroy()});
      return req.on('end',()=>run(()=>{let j;try{j=JSON.parse(b||'{}')}catch(e){const x=new Error('Request body is not valid JSON.');x.status=400;throw x}
        return post[r[0]](j&&typeof j==='object'&&!Array.isArray(j)?j:{})}))}
    if(r[0]==='meta')return run(()=>({roles:E.ROLES,levels:E.LEVELS,countries:E.countries()}));
    if(r[0]==='search')return run(()=>E.search(u.searchParams.get('q')));
    if(r[0]==='minimum-wage')return run(()=>E.minWage(r[1]));
    if(r[0]==='data-quality')return run(E.quality);
    return send(res,404,{error:'Not found'});
  }
  const f=path.join(PUB,p==='/'?'index.html':p);
  if(!f.startsWith(PUB)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('Not found')}
  res.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
}).listen(PORT,()=>console.log('http://localhost:'+PORT));
