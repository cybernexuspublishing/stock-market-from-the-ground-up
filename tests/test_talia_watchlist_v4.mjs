import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=path=>fs.readFileSync(path,'utf8');
const curriculum=read('assets/js/watchlist-talia-research-v4.js');
const workspace=read('assets/js/watchlist-talia-workstation-v4.js');
const css=read('assets/css/watchlist-talia-v4.css');
const free=read('free-watchlist.html'),paid=read('advanced-tool.html');
const freeUi=read('assets/js/free-watchlist-v1.js');
const premium=read('assets/js/watchlist-intelligence-v2.js');
const build=read('scripts/build-pages.sh');
const sandbox={};vm.runInNewContext(curriculum,{globalThis:sandbox});
const C=sandbox.GroundUpTaliaResearchV4;
assert.equal(C.version,'4.0');
assert.equal(C.TOPICS.length,27,'All 20 owner categories and 7 additional specialized research topics are required');
assert.equal(new Set(Array.from(C.TOPICS,x=>x.id)).size,27);
assert.equal(C.STEPS.join(','),'Observe,Explain,Investigate,Interpret,Challenge,Plan,Practice,Review');
assert.equal(C.DIMS.join(','),'Knowledge,Recognition,Decision,Process');
for(const t of C.TOPICS){
 for(const field of ['id','title','dimension','definition','worked','investigate','contradiction','transfer']){
  assert(typeof t[field]==='string'&&t[field].length>=4,t.id+' missing '+field);
 }
 assert(C.DIMS.includes(t.dimension));
 for(const stage of C.STEPS){
  assert(C.stageText(t,stage).length>=125,t.id+' '+stage+' instruction too brief');
  assert(C.prompt(t,stage).length>=25,t.id+' '+stage+' checkpoint missing');
 }
}
for(const id of ['building','sector','pricevolume','rvol','company','catalyst','structure','trends',
 'candles','vwap','averages','indicators','levels','breakout','failure','thesis','risk','spread',
 'compare','reject','maintenance','hindsight','macd','rsi','bollinger','patterns','shorts']){
 assert(C.byId(id).id===id,'Missing requested subject '+id);
}
assert.equal(C.sma([10,12,14],3)[2],12);
const e=C.ema([10,12,14,16],3);assert.equal(e[0],null);assert.equal(e[1],null);assert.equal(e[2],12);assert.equal(e[3],14);
const r=C.rsi(Array.from({length:15},(_,i)=>10+i));assert(r.slice(0,14).every(x=>x===null));assert.equal(r[14],100);
const m=C.macd(Array.from({length:48},(_,i)=>10+i*.1));
assert(m.line.slice(0,25).every(x=>x===null));assert(Number.isFinite(m.line[25]));
assert(m.signal.slice(0,33).every(x=>x===null));assert(Number.isFinite(m.signal[33]));
assert(m.hist.slice(0,33).every(x=>x===null));assert(Number.isFinite(m.hist[33]));
const v=C.vwap([{high:10,low:10,close:10,volume:100},{high:11,low:11,close:11,volume:300}]);
assert(Math.abs(v[1]-10.75)<1e-9);
const b=C.bollinger(Array(20).fill(10));assert(b.slice(0,19).every(x=>x===null));assert.equal(b[19].middle,10);
const risk=C.risk({entry:5,stop:4.8,budget:25});assert.equal(risk.shares,125);
const safer=C.risk({entry:5,stop:4.8,budget:25,slippage:.08,spread:.04});
assert(safer.shares<risk.shares,'Sizing must reflect adverse fill and spread');
for(const name of ['trend','range','failure']){
 const bars=C.fictional(name);assert.equal(bars.length,48);
 for(const bar of bars){
  assert(bar.high>=Math.max(bar.open,bar.close));
  assert(bar.low<=Math.min(bar.open,bar.close));
  assert(bar.volume>0);
 }
}
new vm.Script(workspace,{filename:'watchlist-talia-workstation-v4.js'});
for(const word of ['Play Talia','Teach This in More Depth','Try Another Guided Example','Practice',
 'Review','Observe','Reveal next fictional bar','Not Yet Assessed',
 'Copy research report','No Lumens are spent','No specific problem identified']){
 assert(workspace.includes(word),'Shared member UI missing '+word);
}
assert(workspace.includes("if(currentStep()==='Practice'&&!recent().some(x=>x.cutoff===visible))"),
 'Fictional future bars require new cutoff-specific research checkpoint');
assert(workspace.includes('bars.slice(0,visible)'),'Never render fictional bars past current visible cutoff');
assert(workspace.includes('root.CrownlightECharts?.load?.()'),'Use same-origin ECharts loader');
assert(workspace.includes('ResizeObserver'),'ECharts must resize');
assert(workspace.includes('markLine'),'Direct fictional OHLC guides required');
assert(workspace.includes('root.navigator?.clipboard?.writeText'),'Research report export must be user-initiated');
assert(!/localStorage|sessionStorage|indexedDB|supabase\.from|\/api\/stripe|wallet_spend|gradeAttempt/i.test(workspace+curriculum),
 'Research instruction cannot bypass entitlements, grade or touch money');
assert(free.includes('id="free-watchlist-talia-v4-host"'));
assert(free.includes('assets/js/watchlist-talia-research-v4.js?v=1'));
assert(free.includes('assets/js/watchlist-talia-workstation-v4.js?v=1'));
assert(paid.includes('assets/js/watchlist-talia-research-v4.js?v=1'));
assert(paid.includes('assets/js/watchlist-talia-workstation-v4.js?v=1'));
assert(paid.indexOf('watchlist-talia-research-v4.js')<paid.indexOf('watchlist-talia-workstation-v4.js'));
assert(paid.indexOf('watchlist-talia-workstation-v4.js')<paid.indexOf('watchlist-intelligence-v2.js'));
assert(premium.includes('GroundUpTaliaWorkstationV4?.mount?'));
assert(premium.includes('taliaWork?.setRecords?.(current)'));
assert(freeUi.includes('_groundUpTaliaV4?.reset?.()'),'Free logout must clear private learning report');
assert(freeUi.includes('_groundUpTaliaV4?.setRecords?.(state.entries)'));
assert(css.includes('cl-talia-metrics')&&css.includes('focus-visible'));
assert(build.includes('node tests/test_talia_watchlist_v4.mjs'));
console.log('PASS Talia Watchlist V4: 27 comprehensive topics, 8 guided research actions, ECharts, indicator warm-up, risk, protected member boundaries, and ungraded 4-skill report');
