const http=require('http'),path=require('path'),{spawn}=require('child_process');
const root=path.join(__dirname,'..');
// starts server.js on a free port, resolves {base, stop}
exports.startServer=()=>new Promise((ok,no)=>{
  const port=20000+Math.floor(Math.random()*20000);
  const p=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:port},stdio:['ignore','pipe','inherit']});
  p.stdout.on('data',d=>{if(/localhost/.test(String(d)))ok({base:'http://localhost:'+port,stop:()=>p.kill()})});
  p.on('error',no);setTimeout(()=>no(new Error('server did not start')),8000);
});
exports.sleep=ms=>new Promise(r=>setTimeout(r,ms));
exports.bad=/\bNaN\b|undefined|Infinity|\[object Object\]|null%|Failed to fetch/;
