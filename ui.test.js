// FRONT END + FULL STACK. Drives the real UI in jsdom and clicks every tab and every country.
//   single-file : index.html opened directly (engine inlined)           -> front end only
//   static      : public/index.html with NO backend (fetch fails)       -> falls back to engine.bundle.js
//   fullstack   : public/index.html served by server.js over real HTTP  -> front end + back end
// Run: npm run test:ui
const assert=require('assert'),path=require('path'),{JSDOM}=require('jsdom'),{startServer,sleep,bad}=require('./helpers');
const root=path.join(__dirname,'..');
// jsdom lacks TextDecoder (every real browser has it), so provide it.
const opts=(bp)=>({runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){w.TextDecoder=TextDecoder;bp&&bp(w)}});
const wait=async(pred,ms=6000)=>{const t=Date.now();while(Date.now()-t<ms){if(pred())return true;await sleep(4)}return false};

async function drive(name,dom,expect){
  const w=dom.window,d=w.document,$=s=>d.querySelector(s);let checks=0;
  assert(await wait(()=>d.querySelectorAll('#tabs button').length>=9),name+': tabs never rendered');
  assert(await wait(()=>!$('#main .err')&&$('#main').innerHTML.length>50),name+': first screen empty/error: '+($('#main .err')||{}).textContent);
  const META=w.eval('META'),TABS=w.eval('TABS'),countries=META.countries.map(c=>c.code);
  const tab=async t=>{const b=[...d.querySelectorAll('#tabs button')].find(b=>b.textContent===t);if(b.getAttribute('aria-selected')!=='true')b.click();await wait(()=>$('#tabs button[aria-selected="true"]').textContent===t);await sleep(10)};
  const verify=(label)=>{const o=$('#out');assert(o,label+': no #out');assert(!o.querySelector('.err'),label+': error card: '+(o.querySelector('.err')||{}).textContent);
    const tx=o.textContent;assert(tx.length>60,label+': empty output');assert(!bad.test(tx),label+': bad value in output: '+(tx.match(bad)||[])[0]+' … '+tx.slice(0,160));checks++};
  const go=async(label)=>{await sleep(15);$('#out').innerHTML='';$('.go').click();assert(await wait(()=>$('#out').innerHTML.length>0),label+': no output after click');await sleep(2);verify(label)};
  const setv=(id,v)=>{const e=$('#'+id);e.value=v;e.dispatchEvent(new w.Event('change',{bubbles:true}))};

  // Dashboard tab: iframe present and its content really rendered (KPIs + region chart)
  await tab('Dashboard');const f=$('#dashboard2026Frame');assert(f,name+': dashboard iframe missing');
  if(expect.dashSrc){assert.strictEqual(f.getAttribute('src'),'Global_Compensation_Dashboard_2026.html',name+': dashboard src');
    assert(await wait(()=>{try{const x=f.contentDocument;return x&&x.getElementById('kMarkets')&&/\d/.test(x.getElementById('kMarkets').textContent)}catch(e){return false}},8000),name+': dashboard did not render')}
  else{ // jsdom cannot render srcdoc iframes, so check the embedded copy is exactly the dashboard file (browsers render it natively)
    assert.strictEqual(f.srcdoc,require('fs').readFileSync(path.join(root,'public/Global_Compensation_Dashboard_2026.html'),'utf8'),name+': embedded dashboard differs from public/Global_Compensation_Dashboard_2026.html')}
  checks++;

  // Regression: Tax tab and Calculator must NOT generate anything from blank input (they used to fall back to a
  // "typical" salary / a pre-filled amount, for every country), and must not run before the button is pressed.
  for(const [t,field,cta] of [['Tax','g',/Effective tax/],['Calculator','amt',/take-home/i]]){
    await tab(t);await sleep(20);
    assert.strictEqual($('#'+field).value,'',`${name} ${t}: input must start blank`);
    assert(!cta.test($('#out').textContent),`${name} ${t}: shows results before any input/click`);
    for(const c of ['SA','US','IN','AL']){setv('country',c);$('#out').innerHTML='';$('.go').click();
      assert(await wait(()=>$('#out').innerHTML.length>0),`${name} ${t} ${c}: no feedback for blank input`);await sleep(2);
      const err=$('#out .err');assert(err&&/greater than zero/.test(err.textContent),`${name} ${t} ${c}: blank input must show a validation message, got: ${$('#out').textContent.slice(0,120)}`);
      assert(!cta.test($('#out').textContent),`${name} ${t} ${c}: blank input produced results`);checks++}
    for(const bv of ['0','-5']){setv(field,bv);$('#out').innerHTML='';$('.go').click();assert(await wait(()=>$('#out .err')),`${name} ${t}: "${bv}" must be rejected`);checks++}
    // a valid run, then changing the country must clear the now-stale result
    setv(field,'1200000');setv('country','US');await go(`${name} ${t} valid`);assert(cta.test($('#out').textContent),`${name} ${t}: no results for valid input`);
    setv('country','SA');assert(!cta.test($('#out').textContent),`${name} ${t}: stale result left on screen after changing country`);checks++;
  }

  // every country x every per-country tab
  for(const t of ['Calculator','Tax','Benefits','Pay bands','Minimum wage','Engagement']){
    await tab(t);
    if(t==='Tax')setv('g','1200000');if(t==='Calculator')setv('amt','2000000');
    for(const c of countries){setv('country',c);await go(`${name} ${t} ${c}`)}
  }
  // Calculator: engagement types x basis x period x regime on a spread of countries
  await tab('Calculator');setv('amt','2000000');
  for(const c of ['IN','US','GB','DE','SG','AE','AU','BR','ZA','JP','MX','FR']){setv('country',c);
    for(const wt of ['permanent','contract','temporary','thirdparty','consultant','freelance'])for(const basis of ['ctc','gross'])for(const per of ['annual','monthly']){
      setv('wt',wt);if(!$('#basis').disabled)setv('basis',basis);setv('per',per);setv('mo',wt==='contract'?'6':'12');if(c==='IN')setv('reg',['auto','new','old'][checks%3]);
      await go(`${name} Calculator ${c}/${wt}/${basis}/${per}`)}}
  // Compare: default set, then add countries up to 12, every role and level
  await tab('Compare');await go(name+' Compare default');
  for(const c of ['AE','AU','BR','ZA','JP','MX','FR']){setv('add',c)}
  for(const r of META.roles){setv('role',r);for(const l of META.levels){setv('level',l);await go(`${name} Compare ${r}/${l}`)}}
  await tab('Coverage');verify(name+' Coverage') ;
  // (Coverage renders into #out automatically)
  // mode check
  if(expect.mode!==undefined)assert.strictEqual(w.eval('typeof MODE!=="undefined"?MODE:undefined'),expect.mode,name+': API mode');
  console.log(`${name.toUpperCase()}: ${checks} screens verified across ${countries.length} countries`);
  w.close();return checks;
}

(async()=>{
  const {base,stop}=await startServer();let apiHits=0,total=0;
  try{
    // 1) single file, opened straight from disk
    total+=await drive('single-file',await JSDOM.fromFile(path.join(root,'index.html'),opts()),{});
    // 2) static hosting / file:// with no backend: fetch fails like "Failed to fetch"
    total+=await drive('static-no-backend',await JSDOM.fromFile(path.join(root,'public/index.html'),opts(w=>{w.fetch=()=>Promise.reject(new TypeError('Failed to fetch'))})),{mode:'local',dashSrc:1});
    // 3) full stack: real server, real HTTP
    const bridge=w=>{w.fetch=(u,o)=>{apiHits++;return fetch(new URL(u,base+'/'),o)}};
    total+=await drive('fullstack',await JSDOM.fromURL(base+'/',opts(bridge)),{mode:'server',dashSrc:1});
    assert(apiHits>1000,'full-stack run should hit the API >1000 times, got '+apiHits);
    console.log(`UI TOTAL: ${total} screens verified; ${apiHits} real API calls in full-stack mode`);
  }finally{stop()}
})().catch(e=>{console.error('UI FAIL:',e.message);process.exit(1)});
