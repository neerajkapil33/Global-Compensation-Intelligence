// Zero-dependency smoke tests. Run: npm test
const assert=require('assert'),fs=require('fs'),path=require('path'),E=require('../lib/engine');
let n=0;const t=(name,fn)=>{fn();n++;console.log('ok -',name)};

t('meta lists countries, roles and levels',()=>{assert(E.countries().length>150);assert(E.ROLES.length&&E.LEVELS.length)});

// Regression: the Tax tab returned an error for India (formula-based PF model, not rate bands).
t('taxProfile works for every country, including India, for an explicit gross',()=>{
  for(const c of E.countries()){const r=E.taxProfile({country:c.code,gross:1200000});
    assert(r.gross===1200000&&Array.isArray(r.employer)&&r.curve.length===8,c.code)}
  const r=E.taxProfile({country:'IN',gross:2000000});
  assert(r.employee.length&&r.employer.length,'India PF/gratuity lines missing');
  assert.strictEqual(Math.round(r.tax[0].amount),192400);
});

// Regression: a blank Tax-tab gross used to fall back to a "typical" salary and produce a full result for every country.
t('taxProfile and calculate refuse blank / zero / negative / non-numeric input',()=>{
  for(const bad of [undefined,null,'',' ',0,'0',-1,'abc',NaN]){
    assert.throws(()=>E.taxProfile({country:'SA',gross:bad}),/greater than zero/,'taxProfile gross='+String(bad));
    assert.throws(()=>E.calculate({country:'SA',amount:bad}),/greater than zero/,'calculate amount='+String(bad));
  }
  assert.throws(()=>E.taxProfile({country:'ZZ',gross:1}),/Unknown country/);
  assert.throws(()=>E.calculate({amount:1}),/Unknown country/,'calculate must not default to India');
  assert.strictEqual(E.taxProfile({country:'SA',gross:'345,489'}).gross,345489,'thousands separators accepted');
});

t('India: 87A marginal relief keeps tax continuous above 12L taxable income; surcharge applies with relief',()=>{
  const tax=g=>E.taxProfile({country:'IN',gross:g,regime:'new'}).tax[0].amount;
  assert.strictEqual(Math.round(tax(1275000)),0,'nil tax at the rebate limit');
  assert(tax(1276000)<=1000*1.04+1e-6,'first rupees above the limit are taxed at most 100%: '+tax(1276000));
  let prev=0;for(let g=1275000;g<=1400000;g+=1000){const t=tax(g);assert(t>=prev-1e-6&&t-prev<=1000*1.04+1e-6,'jump at '+g);prev=t}
  // surcharge above 50L taxable income is phased in with marginal relief: no step, and never more than 100% marginal
  let p2=tax(5060000);for(let g=5060000;g<=5300000;g+=500){const t=tax(g);assert(t>=p2-1e-6&&t-p2<=500*1.04+1e-6,'surcharge step at '+g);p2=t}
});

t('Australia 2026-27 first bracket is 16%; Canada basic personal amount is a 14% credit',()=>{
  assert.strictEqual(Math.round(E.taxProfile({country:'AU',gross:45000}).tax[0].amount),(45000-18200)*.16);
  assert.strictEqual(Math.round(E.taxProfile({country:'CA',gross:16452}).tax[0].amount),0);
  const hi=E.taxProfile({country:'CA',gross:300000}).tax[0].amount,d=E.taxProfile({country:'CA',gross:301000}).tax[0].amount-hi;
  assert(Math.abs(d-330)<1e-6,'top marginal rate 33%');
});

t('engagement comparison shows cost to the engager (with uplift), not bare CTC',()=>{
  const r=E.calculate({country:'US',amount:100000,period:'annual',workerType:'thirdparty'});
  const row=r.engagements.find(x=>x.type==='thirdparty');
  assert.strictEqual(Math.round(row.cost),Math.round(r.totals.engagerCost));
  assert(row.cost>r.totals.ctc);
});

t('calculate + engagement run for India',()=>{
  const r=E.calculate({country:'IN',amount:2000000,basis:'ctc',period:'annual',workerType:'permanent'});
  assert(r.totals.takeHome>0&&r.engagements.length===6);
  assert(E.engagement({country:'IN'}));
});

// Regression: Mexico is listed in both the NAM and LAC groups of the dashboard; the region chart must
// attribute countries to the selected region instead of creating a second region bar.
t('dashboard region chart attributes countries to the selected region',()=>{
  const d=fs.readFileSync(path.join(__dirname,'../public/Global_Compensation_Dashboard_2026.html'),'utf8');
  assert(d.includes("const r=(reg!=='ALL'&&REGIONS[reg])?reg:x.m.reg;"));
});

t('front end works without a backend: hybrid API layer + generated files exist',()=>{
  const idx=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
  assert(idx.includes('/*API-BEGIN*/')&&idx.includes("engine.bundle.js"),'public/index.html must fall back to engine.bundle.js');
  assert(fs.existsSync(path.join(__dirname,'../index.html'))&&fs.existsSync(path.join(__dirname,'../public/engine.bundle.js')),'run npm run build');
  assert(!fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').includes('fetch('),'root index.html must be self-contained');
});

console.log(n+' tests passed');
