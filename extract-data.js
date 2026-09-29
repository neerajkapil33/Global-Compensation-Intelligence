const fs=require('fs');
const src=fs.readFileSync('/mnt/user-data/uploads/Global_Compensation_Intelligence_Multi_Select_Dashboard.html','utf8').split('\n');
const start=286, sIdx=src.findIndex(l=>l.startsWith("S={k:'IN'"));
let A=src.slice(start+1-1+0,sIdx).join('\n').replace("$=id=>document.getElementById(id),",'').replace(/,\s*$/,';');
A=A.replace(/^<script>\n?/,'');
function grab(name){
  const i=src.findIndex(l=>new RegExp('^\\s*const '+name+'=').test(l));
  const text=src.slice(i).join('\n'); const o=text.indexOf('{'); let d=0,q=null,j=o;
  for(;j<text.length;j++){const c=text[j];
    if(q){ if(c==='\\')j++; else if(c===q)q=null; continue;}
    if(c==="'"||c==='"'||c==='`'){q=c;continue}
    if(c==='/'&&text[j+1]==='/'){j=text.indexOf('\n',j);continue}
    if(c==='{')d++; else if(c==='}'){d--; if(!d)break}}
  return 'const '+name+'='+text.slice(text.indexOf('=')+1,j+1)+';';
}
const names=['countryRules','CI','TAX_PROFILE','levelMul','roleMul','midBase','marketBands','mw'];
const bd=src.find(l=>/function benefitDefault/.test(l)).trim();
fs.writeFileSync('lib/data.js',A+'\n'+names.map(grab).join('\n')+'\n'+bd+
 '\nmodule.exports={I,sb,cb,sm,K,'+names.join(',')+',benefitDefault};\n');
const d=require('./lib/data.js');
console.log('K',Object.keys(d.K).length,'CI',Object.keys(d.CI).length,'TAX',Object.keys(d.TAX_PROFILE).length,'bands',Object.keys(d.marketBands).length,'mw',Object.keys(d.mw).length,'rules',Object.keys(d.countryRules).length);
console.log(Object.keys(d.countryRules.IN), Object.keys(d.CI.US), Object.keys(d.K.US).join());
const k=d.K.IN,r=k.solve(2e6);console.log(r.g,k.tax(r.g,r.ee[0][1],'auto',0));
