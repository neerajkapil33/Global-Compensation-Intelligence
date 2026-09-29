const D=require('./data'),{K,sb,cb,sm,I,CI,TAX_PROFILE,marketBands,midBase,roleMul,levelMul,mw,countryRules,benefitDefault}=D;
const ROLES=Object.keys(roleMul),LEVELS=Object.keys(levelMul);
const fail=(m,s)=>{const e=new Error(m);e.status=s||400;return e};
const n0=(x,d=0)=>Number.isFinite(+x)?+x:d, avg=a=>a.reduce((s,x)=>s+x,0)/(a.length||1);
const code=c=>{c=String(c||'').toUpperCase();if(!K[c]||c==='XX')throw fail('Unknown country: '+c,404);return c};
const tier=k=>/Global Expansion/.test(k.tag||'')?'indicative':/^Approx\./.test(k.tag||'')?'approximate':'encoded';
const TIERS={encoded:'Encoded statute',approximate:'Approximate model',indicative:'Indicative estimate'};
const info=c=>{const k=K[c];return{code:c,name:k.n,flag:k.f,symbol:k.c,locale:k.l,tier:tier(k),tierLabel:TIERS[tier(k)],
  hasBands:!!marketBands[c],hasBenefits:!!CI[c],hasMinWage:!!mw[c],hasTaxProfile:!!TAX_PROFILE[c]}};
const countries=()=>Object.keys(K).filter(c=>c!=='XX').map(info);
const search=q=>{q=String(q||'').toLowerCase();return countries().filter(c=>(c.name+c.code).toLowerCase().includes(q)).slice(0,40)};

function solve(k,ctc){
  if(k.solve){const r=k.solve(ctc);return{g:r.g,er:r.er,ee:r.ee,sc:r.sc}}
  let lo=0,hi=ctc;for(let i=0;i<60;i++){const m=(lo+hi)/2;m+sm(cb(m,k.er))>ctc?hi=m:lo=m}
  return{g:lo,er:cb(lo,k.er),ee:cb(lo,k.ee)};
}
function ctcOfGross(k,gross){let lo=gross,hi=Math.max(gross*3,1);for(let i=0;i<70;i++){const m=(lo+hi)/2;solve(k,m).g>gross?hi=m:lo=m}return(lo+hi)/2}
const WT={permanent:'Permanent employee',contract:'Fixed-term contract employee',temporary:'Temporary / seasonal employee',thirdparty:'Third-party / agency staff',consultant:'Independent consultant',freelance:'Freelancer (self-employed)'};
const FYS={IN:4,GB:4,NZ:4,HK:4,LK:4,AU:7,PK:7,BD:7,EG:7,KE:7,ZA:3},MON=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fyLabel=(f,Y)=>f===1?'Calendar year '+Y:'FY '+MON[f]+' '+Y+' â '+MON[f-1]+' '+(Y+1);
function positive(v,what){const x=typeof v==='string'?v.replace(/,/g,'').trim():v;if(x===''||x===null||x===undefined||!Number.isFinite(+x)||+x<=0)throw fail('Enter '+what+' greater than zero.');return +x}
function calculate(p){
  const c=code(p.country),k=K[c],mul=p.period==='annual'?1:12,amt=positive(p.amount,'an amount')*mul;
  const wt=WT[p.workerType]?p.workerType:'permanent',non=wt==='consultant'||wt==='freelance',m=wt==='permanent'?12:(+p.months===6?6:12),yf=m/12;
  const regime=['auto','new','old'].includes(p.regime)?p.regime:'auto',ded=Math.max(0,n0(p.deductions)),exp=non?Math.min(90,Math.max(0,n0(p.expensesPct)))/100:0;
  const ctc=(p.basis==='gross'&&!non)?ctcOfGross(k,amt):amt,r=non?{g:ctc,er:[],ee:[],sc:null}:solve(k,ctc);
  const sc=x=>x.map(([l,v])=>[l,v*yf]),er=sc(r.er),ee=sc(r.ee),pg=r.g*yf,eeT=sm(ee),ctcP=ctc*yf,upl=({temporary:.05,thirdparty:.18}[wt]||0)*sm(er);if(upl)er.push([wt==='thirdparty'?'Agency margin (planning assumption: 18% of employer statutory cost)':'Onboarding uplift (planning assumption: 5% of employer statutory cost)',upl]);const erT=sm(er);
  const fyDef=FYS[c]||1,fyS=(+p.fyStart>=1&&+p.fyStart<=12)?Math.round(+p.fyStart):fyDef;
  const s=Math.min(12,Math.max(1,Math.round(n0(p.startMonth,fyS)))),y0=Math.round(n0(p.startYear,2026)),i0=(s-fyS+12)%12;
  const g={};for(let i=0;i<m;i++){const n=Math.floor((i0+i)/12);g[n]=(g[n]||0)+1}
  const taxable=pg*(1-exp),lab=k.tax(taxable,non?0:eeT,regime,ded).map(x=>x[0]),acc=lab.map(()=>0);
  const fy=Object.entries(g).map(([n,mg])=>{const sh=mg/m,t=k.tax(taxable*sh,non?0:eeT*sh,regime,ded*sh);t.forEach((x,i)=>{acc[i]+=x[1]});
    return{label:fyLabel(fyS,y0-(s<fyS?1:0)+(+n)),months:mg,income:pg*sh,tax:sm(t)}});
  const tax=lab.map((l,i)=>[non?'Illustrative income tax on fee (verify status)':l,acc[i]]),tt=sm(tax),take=pg-eeT-pg*exp-tt;
  const pct=x=>Math.round(x/Math.max(1,ctcP)*1000)/10,notes=[];
  if(wt==='contract')notes.push('Fixed-term direct employees carry the same statutory stack as permanent staff; leave and benefits are prorated to the term.');
  if(wt==='temporary')notes.push('Temporary or seasonal employees carry the statutory stack; many benefits depend on minimum service. See the Engagement tab.');if(wt==='thirdparty')notes.push('Agency staff are on the agency or employer-of-record payroll. Margin is a planning assumption; get the real rate card. See the Engagement tab for liabilities.');if(non)notes.push('Non-employee engagement: no employer or employee statutory contributions are modelled. Self-employed social contributions, GST/VAT and local business rules are not included; verify status locally.');
  if(m===6&&wt!=='permanent')notes.push('Six-month term: contributions are prorated and tax is computed on the income of the period as if it were the only income of that fiscal year.');
  if(fy.length>1)notes.push('This engagement spans '+fy.length+' fiscal years (year starts in '+MON[fyS]+'); income is taxed separately in each.');
  const out={country:info(c),worker:{type:wt,label:WT[wt],months:m,nonEmployee:non},months:m,
    input:{amount:amt/mul,period:mul===1?'annual':'monthly',basis:p.basis==='gross'?'gross':'ctc',regime,deductions:ded},
    employer:er.map(([l,x])=>({label:l,period:x})),employee:ee.map(([l,x])=>({label:l,period:x})),tax:tax.map(([l,x])=>({label:l,period:x})),
    structure:(r.sc||[]).map(([l,x])=>({label:l,period:x*yf})),expenses:pg*exp,
    totals:{engagerCost:ctcP+upl,ctc:ctcP,gross:pg,employerCost:erT,employeeContrib:eeT,incomeTax:tt,takeHome:take},
    monthly:{ctc:ctcP/m,gross:pg/m,takeHome:take/m,deductions:(eeT+tt)/m},
    ratios:{takeHomePct:pct(take),taxPct:pct(tt),contribPct:pct(eeT),employerLoadPctGross:Math.round(erT/Math.max(1,pg)*1000)/10,wedgePct:pct(ctcP-take)},
    fiscal:{startsIn:MON[fyS],countryDefault:FYS[c]?MON[FYS[c]]:'Jan',periods:fy,oneYearTax:fy.length>1?sm(k.tax(taxable,non?0:eeT,regime,ded)):null},
    notes,method:k.nt,tag:(k.tag||'').replace(/<br>/g,' Â· ')};
  if(!p._in)out.engagements=Object.keys(WT).map(t=>{const x=calculate({...p,workerType:t,_in:1});return{type:t,label:WT[t],months:x.months,cost:x.totals.engagerCost,takeHome:x.totals.takeHome,tax:x.totals.incomeTax,takePct:x.ratios.takeHomePct}});
  return out;
}
function bandFor(c,role,level){
  const mb=marketBands[c]?.[role]?.[level];
  if(mb)return{min:mb[0],med:mb[1],max:mb[2],conf:'researched'};
  if(!midBase[c])return null; // no anchor: never invent a number
  const m=roleMul[role]||1,q=levelMul[level],b=midBase[c];
  return{min:Math.round(b*m*q[0]),med:Math.round(b*m*q[1]),max:Math.round(b*m*q[2]),conf:'anchored'};
}
function bands(p){
  const c=code(p.country),role=ROLES.includes(p.role)?p.role:'IT',level=LEVELS.includes(p.level)?p.level:'Professional',b=bandFor(c,role,level);
  if(!b)return{country:info(c),role,level,available:false,message:'No pay band is encoded for this country. Bands exist for '+Object.keys({...marketBands,...midBase}).length+' markets.'};
  return{country:info(c),role,level,available:true,conf:b.conf,annual:b,monthly:{min:Math.round(b.min/12),med:Math.round(b.med/12),max:Math.round(b.max/12)},
    ladder:LEVELS.map(l=>({level:l,...bandFor(c,role,l)})),roles:ROLES.map(r=>({role:r,med:bandFor(c,r,level).med}))};
}
// Compare works in ratios so no FX table is needed: each country at its own median band for the role/level.
function compare(p){
  const cs=(p.countries||[]).map(x=>String(x).toUpperCase()).filter(x=>K[x]&&x!=='XX');
  if(cs.length<2||cs.length>12)throw fail('Pick 2 to 12 countries.');
  const role=ROLES.includes(p.role)?p.role:'IT',level=LEVELS.includes(p.level)?p.level:'Professional';
  const rows=cs.map(c=>{const b=bandFor(c,role,level);if(!b)return{country:info(c),available:false};
    const r=calculate({country:c,amount:b.med,period:'annual'});return{country:info(c),available:true,conf:b.conf,medianCtc:b.med,takeHome:r.totals.takeHome,...r.ratios}}
  ).sort((a,b)=>(b.takeHomePct||-1)-(a.takeHomePct||-1));
  return{role,level,rows,note:'Each country is evaluated at its own median CTC for this role and level, in local currency. Ratios are comparable across countries; absolute amounts are not converted.'};
}
function benefits(p){
  const c=code(p.country),d=CI[c]||{},b=benefitDefault(),r=countryRules[c];
  const F=[['Annual leave','annual','leave'],['Sick leave','sick','sick'],['Maternity','maternity','maternity'],['Paternity','paternity','paternity'],['Parental','parental','parental'],
    ['Public holidays','public','public'],['Family leave','family','family'],['Healthcare','health','health'],['Retirement','retirement','retirement'],
    ['Unemployment','unemployment','unemployment'],['Severance','severance','severance'],['Other benefits','other','other'],['Working time','hours','hours'],['Notice period','notice','notice']];
  const cards=F.map(([t,key,def])=>({title:t,text:d[key]||b[def]||'Not encoded',encoded:!!d[key]}));
  return{country:info(c),cards,rules:r||null,coverage:{encoded:cards.filter(x=>x.encoded).length,total:cards.length}};
}
function taxProfile(p){
  const c=code(p.country),k=K[c],g=positive(p.gross,'an annual gross salary'),ded=Math.max(0,n0(p.deductions));
  const eeOf=x=>k.solve?solve(k,ctcOfGross(k,x)).ee:cb(x,k.ee),erOf=x=>k.solve?solve(k,ctcOfGross(k,x)).er:cb(x,k.er);
  const ee=eeOf(g),eeT=sm(ee),tax=k.tax(g,eeT,p.regime||'auto',ded),tt=sm(tax);
  const curve=[.25,.5,.75,1,1.5,2,3,5].map(m=>{const x=g*m,e=sm(eeOf(x)),t=sm(k.tax(x,e,'auto',ded));return{gross:Math.round(x),taxPct:+(t/x*100).toFixed(1),netPct:+((x-e-t)/x*100).toFixed(1)}});
  return{country:info(c),gross:Math.round(g),profile:TAX_PROFILE[c]||{name:k.n+' Tax & Payroll',notes:'No named authority profile encoded. Verify locally.'},
    tax:tax.map(([l,x])=>({label:l,amount:x})),employee:ee.map(([l,x])=>({label:l,amount:x})),employer:erOf(g).map(([l,x])=>({label:l,amount:x})),
    effective:{taxPct:+(tt/g*100).toFixed(1),employeePct:+(eeT/g*100).toFixed(1)},takeHome:Math.round(g-eeT-tt),curve,method:k.nt};
}
function minWage(cc){const c=code(cc),m=mw[c];return{country:info(c),encoded:!!m,...(m||{detail:'No verified statutory minimum is encoded for this country. Check the labour ministry; the app does not guess.'})}}
function quality(){const cs=Object.keys(K).filter(c=>c!=='XX'),t={};cs.forEach(c=>{t[tier(K[c])]=(t[tier(K[c])]||0)+1});
  return{countries:cs.length,tiers:t,coverage:{researchedBands:Object.keys(marketBands).length,anchoredBands:Object.keys(midBase).filter(c=>!marketBands[c]).length,
  benefits:Object.keys(CI).length,minimumWage:Object.keys(mw).length,taxProfiles:Object.keys(TAX_PROFILE).length,contractRules:Object.keys(countryRules).length}}}
// Dashboard: FX baseline (from Geo reference) only for markets that have pay bands.
const FX={IN:88.5,US:1,GB:.75,DE:.86,SG:1.3,AE:3.6725,AU:1.52,CA:1.39,FR:.86,JP:150,NL:.86,IE:.86,NZ:1.75,SA:3.75,MY:4.2,BR:5.4,ZA:17.3,MX:18.4};
const REG={US:'NAM',CA:'NAM',MX:'LAC',BR:'LAC',GB:'EUR',DE:'EUR',FR:'EUR',NL:'EUR',IE:'EUR',AE:'ME',SA:'ME',ZA:'AF',IN:'SAS',SG:'EAP',MY:'EAP',JP:'EAP',AU:'OCE',NZ:'OCE'};
function dashboard(p){
  const pick=(v,all)=>{const a=(Array.isArray(v)?v:[]).filter(x=>all.includes(x));return a.length?a:all};
  const roles=pick(p.roles,ROLES),levels=pick(p.levels,LEVELS),region=Object.values(REG).includes(p.region)?p.region:'ALL';
  const loc=(c,rs,ls,k)=>{const v=rs.flatMap(r=>ls.map(l=>bandFor(c,r,l))).filter(Boolean);return v.length?avg(v.map(b=>b[k])):null};
  const row=c=>{const med=loc(c,roles,levels,'med');if(med===null)return null;const f=FX[c],r=calculate({country:c,amount:med,period:'annual'}).ratios,t=calculate({country:c,amount:med,period:'annual'}).totals;
    return{country:info(c),region:REG[c],conf:marketBands[c]?'researched':'anchored',usd:Math.round(med/f),min:Math.round(loc(c,roles,levels,'min')/f),max:Math.round(loc(c,roles,levels,'max')/f),
      take:r.takeHomePct,tax:r.taxPct,contrib:r.contribPct,employerLoad:r.employerLoadPctGross,takeUsd:Math.round(t.takeHome/f),costUsd:Math.round(t.ctc/f)}};
  const ranked=Object.keys(FX).filter(c=>K[c]&&(region==='ALL'||REG[c]===region)).map(row).filter(Boolean).sort((a,b)=>b.usd-a.usd);
  const sc=FX[String(p.country).toUpperCase()]?String(p.country).toUpperCase():(ranked[0]&&ranked[0].country.code);
  const selected=sc?row(sc):null,usdOf=(c,r,l)=>{const b=bandFor(c,r,l);return b?b.med/FX[c]:null};
  const mean=(c,rs,ls)=>{const v=rs.flatMap(r=>ls.map(l=>usdOf(c,r,l))).filter(x=>x!==null);return v.length?avg(v):null};
  const functions=ROLES.map(r=>({role:r,usd:Math.round(avg(ranked.map(x=>mean(x.country.code,[r],levels)).filter(v=>v!==null))||0)})).filter(x=>x.usd).sort((a,b)=>b.usd-a.usd);
  const regions=[...new Set(ranked.map(x=>x.region))].map(g=>({region:g,usd:Math.round(avg(ranked.filter(x=>x.region===g).map(x=>x.usd))),count:ranked.filter(x=>x.region===g).length})).sort((a,b)=>b.usd-a.usd);
  const ladder=sc?LEVELS.map(l=>{const v=roles.map(r=>bandFor(sc,r,l)).filter(Boolean);return{level:l,usd:Math.round(avg(v.map(b=>b.med))/FX[sc]),min:Math.round(avg(v.map(b=>b.min))/FX[sc]),max:Math.round(avg(v.map(b=>b.max))/FX[sc]),selected:levels.includes(l)}}):[];
  const selFunctions=sc?ROLES.map(r=>({role:r,usd:Math.round(mean(sc,[r],levels)||0)})).sort((a,b)=>b.usd-a.usd):[];
  const matrix=sc?{country:info(sc),roles:ROLES,levels:LEVELS,cells:ROLES.map(r=>LEVELS.map(l=>{const v=usdOf(sc,r,l);return v===null?null:Math.round(v)}))}:null;
  const s=[...ranked].sort((a,b)=>a.usd-b.usd);
  return{region,roles,levels,ranked,selected,selectedRank:ranked.findIndex(x=>x.country.code===sc)+1,median:s.length?(s.length%2?s[s.length>>1].usd:Math.round((s[s.length/2-1].usd+s[s.length/2].usd)/2)):0,
    spread:ranked.length>1?+(ranked[0].usd/ranked[ranked.length-1].usd).toFixed(1):1,avgLoad:+avg(ranked.map(x=>x.employerLoad)).toFixed(1),
    functions,regions,ladder,selFunctions,matrix,tiers:quality().tiers,note:'USD at reference exchange rates for the '+Object.keys(FX).length+' markets that have pay bands.'};
}
// ---- Engagement guide: who employs the worker, and which benefits attach to which model ----
const TYPES=['permanent','contract','temporary','thirdparty','consultant','freelance'];
const TLAB={permanent:'Permanent employee',contract:'Fixed-term contract (direct)',temporary:'Temporary / seasonal (direct)',thirdparty:'Third-party / agency / EOR',consultant:'Consultant (own company)',freelance:'Freelancer (individual)'};
const PAY={
 permanent:{on:true,employer:'You',summary:'On your payroll. You are the legal employer and carry the full statutory stack.'},
 contract:{on:true,employer:'You',summary:'On your payroll for a fixed term. Same statutory stack as permanent staff, with leave and benefits prorated to the term.'},
 temporary:{on:true,employer:'You',summary:'On your payroll for a short or seasonal term. Statutory rules apply from day one, but many benefits depend on minimum service.'},
 thirdparty:{on:false,employer:'Agency or employer of record',summary:'On the agency or EOR payroll. It runs payroll and statutory benefits and recharges you with a margin. You still carry principal-employer and joint-liability duties in many countries.'},
 consultant:{on:false,employer:'The consultant\u2019s own company',summary:'Not on payroll. Paid on invoice under a services agreement. The provider handles their own tax, social security and benefits.'},
 freelance:{on:false,employer:'Self-employed individual',summary:'Not on payroll. Paid on invoice as an individual. The person handles their own tax, social security and benefits.'}};
const BEN=[
 ['Statutory social security and pension','retirement',['yes','yes','yes','agency','self','self'],'Employees are usually covered from day one, though earnings or duration thresholds can apply. Independent workers register and pay themselves.'],
 ['Paid annual leave','annual',['yes','prorated','prorated','agency','no','no'],'Leave accrues with time served. Short terms often get it paid out at exit instead of taken.'],
 ['Public holidays','public',['yes','yes','eligibility','agency','no','no'],'Daily or hourly paid seasonal staff may not be paid for holidays they do not work.'],
 ['Sick leave and sick pay','sick',['yes','eligibility','eligibility','agency','no','no'],'Waiting periods and minimum service often apply.'],
 ['Maternity, paternity and parental leave','maternity',['yes','eligibility','eligibility','agency','no','no'],'Qualifying-service rules can exclude short terms. Some countries give the self-employed state benefits instead.'],
 ['Health insurance','health',['yes','eligibility','eligibility','agency','no','no'],'Statutory cover follows employee status. Employer plans follow plan rules and often exclude short terms.'],
 ['Gratuity, end-of-service and severance','severance',['yes','eligibility','eligibility','agency','no','no'],'Minimum service (often a year or more) is common. Some countries pay out when a fixed term expires.'],
 ['Notice and termination protection','notice',['yes','eligibility','eligibility','agency','no','no'],'A fixed term ends at expiry, but early termination can carry compensation. Consultants and freelancers rely on contract terms only.'],
 ['Unemployment insurance','unemployment',['yes','yes','eligibility','agency','no','no'],'Contribution-history rules can leave short-term staff without cover.'],
 ['Statutory bonus, 13th or 14th month pay',null,['yes','prorated','prorated','agency','no','no'],'Where mandatory (parts of Latin America, Europe and Asia), it is prorated to time served.'],
 ['Working-time and overtime protection','hours',['yes','yes','yes','agency','no','no'],'Applies to employees. Independent workers set their own hours by contract.'],
 ['Workplace injury and accident cover',null,['yes','yes','yes','agency','self','self'],'Employer-funded for employees in most countries. Independent workers must insure themselves.'],
 ['Equity, long-term incentives and perks',null,['eligibility','eligibility','no','no','no','no'],'Plan rules decide. Temporary, agency and independent workers are usually excluded.'],
 ['Tax withheld by the engager',null,['yes','yes','yes','agency','self','self'],'Payroll withholding applies to employees. Independent workers invoice and file their own tax, though some countries require withholding at source.'],
 ['Employer levies (training, skills, housing)',null,['yes','yes','yes','agency','no','no'],'Charged on payroll. The agency recharges them to you inside its fee.']];
const ST_ORDER={yes:'yes',prorated:'yes',eligibility:'verify',agency:'agency',self:'gap',no:'gap'};
const RISK={
 permanent:['Probation and notice rules differ by country; check them before the offer.'],
 contract:['Repeated renewals can convert a fixed-term contract to permanent in many countries. Check renewal limits and maximum cumulative duration.','Early termination before the end date may carry compensation for the remaining term.'],
 temporary:['Seasonal recall rights, holiday-pay rollover and minimum-service thresholds vary by country.','Rehiring the same person each season can build continuous service.'],
 thirdparty:['Joint-employment and principal-employer liability can still reach you, especially for wages, safety and discrimination.','Equal-treatment rules for agency workers apply in many countries after a qualifying period.','Confirm who is the employer of record and who pays statutory contributions.'],
 consultant:['Misclassification: control, integration into your teams, exclusivity, your tools and lack of substitution point to employment.','Permanent-establishment and withholding-tax exposure for cross-border consultants.','Set IP assignment, confidentiality and indemnity terms in the services agreement.'],
 freelance:['Misclassification: long, full-time, exclusive work under your direction looks like employment.','Confirm the person is registered as self-employed and issues valid invoices.','Set IP assignment and confidentiality terms in writing.']};
const CHECK=['Confirm the legal employer: you, an agency or EOR, or the provider.','Check statutory minimums that apply to the term (6 or 12 months) and the worker category.','Check qualifying-service thresholds for leave, sick pay, parental leave and end-of-service.','Confirm who pays statutory contributions, insurance and levies.','Have local counsel review the contract before signing.'];
function engagement(p){
  const c=code(p.country),t=TYPES.includes(p.workerType)?p.workerType:'permanent',ti=TYPES.indexOf(t),m=+p.months===6?6:12,d=CI[c]||{},r=countryRules[c]||null;
  const rows=BEN.map(([title,key,st,note])=>({title,status:st[ti],note,local:key&&d[key]?d[key]:null}));
  const n=k=>rows.filter(x=>ST_ORDER[x.status]===k).length;
  const ruleFields=r?[['Payroll and social',r.social],['Benefits',r.benefits],['Notice',r.notice],['Severance (employer exit)',r.severanceTerm],['Severance (resignation)',r.severanceVol],['Leave',r.leave],t==='consultant'||t==='freelance'?['Classification',r.consultant]:null,t==='thirdparty'?['Agency staff',r.thirdparty]:null,
    (m===12&&r.gratuity12)?['End-of-service',"May apply for a full-year engagement under this country's rules."]:(m===6&&r.gratuity6)?['End-of-service','May apply for a 6-month term.']:null].filter(x=>x&&x[1]):null;
  return{country:info(c),type:t,label:TLAB[t],months:m,payroll:PAY[t],rows,counts:{covered:n('yes'),verify:n('verify'),agency:n('agency'),notCovered:rows.filter(x=>x.status==='no').length,providerHandles:rows.filter(x=>x.status==='self').length},
    matrix:{types:TYPES.map(x=>({id:x,label:TLAB[x]})),rows:BEN.map(([title,,st])=>({title,cells:st}))},risks:RISK[t],checklist:CHECK,rules:ruleFields,
    ruleNote:ruleFields?null:'No country-specific engagement rules are encoded for '+K[c].n+'. The general guide above applies; verify locally.',
    localCoverage:BEN.filter(b=>b[1]&&d[b[1]]).length};
}
module.exports={engagement,dashboard,ROLES,LEVELS,countries,search,calculate,bands,compare,benefits,taxProfile,minWage,quality};
