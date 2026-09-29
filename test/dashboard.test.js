// DASHBOARD (public/Global_Compensation_Dashboard_2026.html): every region, focus country, function and level.
// Run: npm run test:dashboard
const assert=require('assert'),path=require('path'),{JSDOM}=require('jsdom'),{sleep,bad}=require('./helpers');
const LABEL={NAM:'North America',LAC:'Latin America',EUR:'Europe',ME:'Middle East',AF:'Africa',SAS:'South Asia',EAP:'East & SE Asia',OCE:'Oceania'};
(async()=>{
  const dom=await JSDOM.fromFile(path.join(__dirname,'../public/Global_Compensation_Dashboard_2026.html'),{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true});
  await sleep(300);const w=dom.window,d=w.document,g=id=>d.getElementById(id);let n=0;
  const run=(label)=>{g('submitBtn').click();const st=g('status');assert(/ok/.test(st.className),`${label}: status "${st.textContent}"`);
    for(const id of ['kMarkets','kMedian','kSpread','kLoad','kTake','kFocus']){const t=g(id).textContent;assert(t&&!bad.test(t),`${label}: KPI ${id}="${t}"`)}
    for(const id of ['chartMarkets','chartRegions','chartTrend','chartLoad','chartHeatFn','chartRange','chartHeatGlobal']){const t=g(id).textContent;assert(t.trim().length>5&&!bad.test(t),`${label}: chart ${id} empty/bad`)}
    n++};
  const labels=()=>[...g('chartRegions').querySelectorAll('*')].filter(e=>!e.children.length).map(e=>e.textContent.trim()).filter(t=>t&&!/^[$€£]?[\d,.]+[KMk]?$/.test(t));
  const regions=[...g('regionSel').options].map(o=>o.value);
  for(const r of regions){
    g('regionSel').value=r;g('regionSel').dispatchEvent(new w.Event('change'));
    const foci=[...g('focusSel').options].map(o=>o.value);assert(foci.length>0,'no focus countries for '+r);
    for(const f of foci){g('focusSel').value=f;run(`region ${r} focus ${f}`)}
    const L=labels();
    if(r==='ALL')assert.strictEqual(new Set(L).size,L.length,'duplicate region bars in World view: '+L);
    else assert.deepStrictEqual(L,[LABEL[r]],`Region chart for ${r} must show only ${LABEL[r]}, got ${L}`);
  }
  // single function x single level, and Clear
  g('regionSel').value='ALL';g('regionSel').dispatchEvent(new w.Event('change'));
  const fn=[...d.querySelectorAll('#fn input[type=checkbox]')],lv=[...d.querySelectorAll('#lv input[type=checkbox]')];
  for(const a of fn)for(const b of lv){fn.forEach(x=>x.checked=x===a);lv.forEach(x=>x.checked=x===b);
    fn[0].dispatchEvent(new w.Event('change',{bubbles:true}));run(`fn ${a.value} lv ${b.value}`)}
  g('clearBtn').click();assert(/ok/.test(g('status').className),'clear resets to a valid view');n++;
  // empty selection must give a clear message, not a crash
  fn.forEach(x=>x.checked=false);g('submitBtn').click();assert(/err/.test(g('status').className)&&/function/i.test(g('status').textContent),'empty function selection message');n++;
  console.log(`DASHBOARD: ${n} views verified (${regions.length} regions, ${fn.length} functions x ${lv.length} levels)`);w.close();
})().catch(e=>{console.error('DASHBOARD FAIL:',e.message);process.exit(1)});
