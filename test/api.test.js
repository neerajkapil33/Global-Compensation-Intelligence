// BACK END: real HTTP server, every endpoint, every country. Run: npm run test:api
const assert=require('assert'),{startServer,bad}=require('./helpers');
const post=(base,p,b)=>fetch(base+'/api/'+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(async r=>({s:r.status,j:await r.json()}));
const get=(base,p)=>fetch(base+'/api/'+p).then(async r=>({s:r.status,j:await r.json()}));
const clean=(o,tag)=>{const t=JSON.stringify(o);assert(!/NaN|Infinity|null,"amount|"amount":null/.test(t)&&!/:null[,}]/.test(t.replace(/"(message|oneYearTax|local|employeeId|certificate|withholding|social|annual|authority|period|tag|detail|value|scope|basis)":null/g,'')),tag+' contains NaN/null: '+t.slice(0,200))};
(async()=>{
  const {base,stop}=await startServer();let n=0;const ok=m=>{n++};
  try{
    const meta=(await get(base,'meta')).j;assert(meta.countries.length>150);
    const codes=meta.countries.map(c=>c.code);
    for(const c of codes){
      for(const wt of ['permanent','contract','temporary','thirdparty','consultant','freelance']){
        for(const basis of ['ctc','gross']){
          const r=await post(base,'calculate',{country:c,workerType:wt,months:wt==='permanent'?12:6,startMonth:4,amount:1500000,period:'annual',basis,regime:'auto',deductions:0,expensesPct:10});
          assert.strictEqual(r.s,200,`calculate ${c}/${wt}/${basis}: ${JSON.stringify(r.j)}`);
          assert(r.j.totals.takeHome>0&&r.j.totals.takeHome<=r.j.totals.gross*1.0001+1||r.j.worker.nonEmployee,`take-home sanity ${c}/${wt}`);
          clean(r.j.totals,`calculate ${c}/${wt}`);ok();
        }
      }
      for(const [ep,body] of [['tax',{country:c,gross:1200000}],['benefits',{country:c}],['engagement',{country:c,workerType:'thirdparty',months:6}],['bands',{country:c,role:meta.roles[0],level:meta.levels[1]}]]){
        const r=await post(base,ep,body);assert.strictEqual(r.s,200,`${ep} ${c}: ${JSON.stringify(r.j)}`);
        if(ep==='tax'){assert(r.j.gross>0&&r.j.curve.length===8&&r.j.effective.taxPct>=0,`tax ${c}`);clean(r.j.curve,'tax curve '+c)}ok();
      }
      const mw=await get(base,'minimum-wage/'+c);assert.strictEqual(mw.s,200,'minimum-wage '+c);ok();
    }
    // compare + dashboard across every role/level
    for(const role of meta.roles)for(const level of meta.levels){
      const r=await post(base,'compare',{countries:['IN','US','GB','DE','SG'],role,level});assert.strictEqual(r.s,200,`compare ${role}/${level}`);
      assert(r.j.rows.some(x=>x.available),'compare has rows '+role+'/'+level);ok();
    }
    for(const region of ['ALL','NAM','LAC','EUR','ME','AF','SAS','EAP','OCE']){
      const r=await post(base,'dashboard',{region,country:'IN'});assert.strictEqual(r.s,200,'dashboard '+region);ok();
    }
    assert.strictEqual((await get(base,'data-quality')).s,200);ok();
    assert.strictEqual((await get(base,'search?q=ind')).s,200);ok();
    // blank / zero input must be rejected (never a silent 'typical' result), with a clean 400 JSON error
    for(const [ep,body] of [['tax',{country:'SA'}],['tax',{country:'SA',gross:0}],['tax',{country:'SA',gross:''}],['calculate',{country:'SA'}],['calculate',{country:'SA',amount:0}],['calculate',{amount:100}]]){
      const r=await post(base,ep,body);assert(r.s===400||r.s===404,`${ep} ${JSON.stringify(body)} should be rejected, got ${r.s}`);assert(r.j.error&&!r.j.totals&&!r.j.curve);ok();
    }
    const badJson=await fetch(base+'/api/tax',{method:'POST',headers:{'Content-Type':'application/json'},body:'{oops'});assert.strictEqual(badJson.status,400);ok();
    // error handling: unknown country -> clean 404 JSON, not a crash
    const e=await post(base,'tax',{country:'ZZ'});assert.strictEqual(e.s,404);assert(e.j.error);ok();
    assert.strictEqual((await get(base,'nope')).s,404);ok();
    // static files
    for(const f of ['/','/Global_Compensation_Dashboard_2026.html','/engine.bundle.js']){const r=await fetch(base+f);assert.strictEqual(r.status,200,f)}ok();
    console.log(`BACKEND: ${n} checks passed across ${codes.length} countries`);
  }finally{stop()}
})().catch(e=>{console.error('BACKEND FAIL:',e.message);process.exit(1)});
