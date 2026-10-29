import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const modules=JSON.parse(read('data/tutor-guided-practice-v1.json'));
const base=JSON.parse(read('data/competency-study-guides-v01499.json'));
const catalogs=[
 'tutor-research-guides-v1.json','tutor-decision-playbooks-v1.json','tutor-advanced-decision-guides-v1.json',
 'tutor-indicator-study-v1.json','tutor-watchlist-study-v1.json','tutor-strategy-study-v1.json'
].map(f=>JSON.parse(read('data/'+f)));
assert.equal(base.guides.length,30);
assert.equal(base.supplementalGuides.length,1);
assert.equal(modules.kind,'talia_guided_practice_original_ungraded_v1');
assert.equal(modules.modules.length,14);
assert.equal(modules.indicatorCount,8);
assert.equal(modules.watchlistCount,6);
assert.deepEqual(Array.from(modules.stages),['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results']);
assert.equal(new Set(modules.modules.map(x=>x.id)).size,14);
const available=new Map([...base.guides,...base.supplementalGuides,...catalogs.flatMap(c=>c.guides)].map(x=>[x.code,x]));
const permitted=/^https:\/\/(?:chartschool\.stockcharts\.com|toslc\.thinkorswim\.com)\//;
for(const unit of modules.modules){
 assert(available.has(unit.guideCode),'Guide must actually exist '+unit.guideCode);
 assert(unit.learn.length>60,'Concept-first teaching '+unit.id);
 assert(unit.question.length>40&&unit.transferQuestion.length>40,'Scaffolded questions '+unit.id);
 assert(unit.options.length===3&&unit.transferOptions.length===3);
 assert(Number.isInteger(unit.correct)&&unit.correct>=0&&unit.correct<=2);
 assert(Number.isInteger(unit.transferCorrect)&&unit.transferCorrect>=0&&unit.transferCorrect<=2);
 assert(unit.feedback.length>50&&unit.scope.startsWith('Fictional'),'Uncertain scenario framing '+unit.id);
 assert(permitted.test(unit.sourceUrl),'Only checked public educational sources '+unit.id);
 for(const [key,answer] of [['choiceFeedback',unit.correct],['transferFeedbackByChoice',unit.transferCorrect]]){
  assert(Array.isArray(unit[key])&&unit[key].length===3,'Separate distractor diagnosis '+unit.id);
  assert.equal(unit[key][answer],null,'Correct choice should not have misconception');
  for(let i=0;i<3;i++)if(i!==answer)
   assert(typeof unit[key][i]==='string'&&unit[key][i].length>=80,'Specific misconception feedback '+unit.id+' '+i);
 }
}
const build=read('scripts/build-pages.sh');
for(const f of ['tutor-research-guides-v1.json','tutor-decision-playbooks-v1.json','tutor-advanced-decision-guides-v1.json',
 'tutor-indicator-study-v1.json','tutor-watchlist-study-v1.json','tutor-strategy-study-v1.json',
 'tutor-guided-practice-v1.json'])assert(build.includes(f),'Public Pages build must publish '+f);
const html=read('market-tutor.html');
assert(html.includes('id="tutor-guided-practice"'));
assert(html.includes('crownlight-indicator-math-v2.js'));
assert(html.includes('tutor-guided-practice-v1.js'));
assert(html.includes('tutor-guided-practice-v1.css'));
const client=read('assets/js/tutor-guided-practice-v1.js');
assert(!/\binnerHTML\b|\blocalStorage\b|\bsessionStorage\b/.test(client),'No untrusted HTML or local persistence');
assert(!/fetch\(['"]https?:/.test(client),'No external client-side data requests');
assert(!/API_KEY|service_role|STRIPE_SECRET/.test(client),'No embedded secrets');
const context={window:{},document:{readyState:'loading',addEventListener(){}},console,
 Date,Number,Math,Array,Object,Set,String,JSON,Intl};
context.globalThis=context.window;
vm.runInNewContext(read('assets/js/crownlight-indicator-math-v2.js'),context,{filename:'indicator-math'});
vm.runInNewContext(client,context,{filename:'tutor-guided-practice'});
const api=context.window.TaliaGuidedPracticeV1;
assert(api&&typeof api.candleData==='function'&&typeof api.metric==='function');
const bars=api.candleData('trend');
assert.equal(bars.length,48);
for(const b of bars){assert(b.low<=Math.min(b.open,b.close)&&b.high>=Math.max(b.open,b.close));assert(b.volume>0)}
assert.equal(api.assessCandidate({spread:0.4,rvol:2.8,verified:true,halted:false,trigger:true}).pass,true);
assert.equal(api.assessCandidate({spread:3.2,rvol:4.1,verified:true,halted:false,trigger:true}).pass,false);
assert.equal(api.assessCandidate({spread:0.4,rvol:3,verified:false,halted:false,trigger:true}).pass,false);
assert.equal(api.assessCandidate({spread:0.4,rvol:3,verified:true,halted:true,trigger:true}).pass,false);
const subset=bars.slice(0,20),closes=subset.map(b=>b.close);
const sma=api.metric(subset,'sma',5);
const expected=closes.slice(-5).reduce((a,b)=>a+b,0)/5;
assert(Math.abs(sma.value-expected)<1e-10,'SMA only uses completed visible bars');
const ema=api.metric(subset,'ema',8);
assert(Number.isFinite(ema.value),'EMA warmup and source math');
const rsi=api.metric(subset,'rsi',14);
assert(rsi.value>=0&&rsi.value<=100,'Wilder RSI bounds');
const atr=api.metric(subset,'atr',10);
assert(atr.value>0,'ATR true-range computed');
const vwap=api.metric(subset,'vwap',5);
assert(vwap.value>0&&vwap.note.includes('BAR PROXY'),'Do not claim tick-exact VWAP');
const rvol=api.metric(subset,'rvol',5);
assert(Math.abs(rvol.value-subset.reduce((v,b)=>v+b.volume,0)/(subset.length*20000))<1e-12);
const warmup=api.metric(bars.slice(0,30),'macd',12);
assert.equal(warmup.value,null,'MACD must not invent value before full 26+9 seed');
const macd=api.metric(bars.slice(0,40),'macd',12);
assert(Number.isFinite(macd.value),'MACD histogram with 40 bars');
const later=api.metric(bars.slice(0,48),'sma',5);
assert.notEqual(later.value,sma.value,'Later fictional prices must not leak into earlier study');
console.log('PASS Talia guided practice v1: 14 authored scenarios, 9 stages, 8 indicators and 6 watchlists, as-of price math, hard vetoes, authored source-ownership, all seven public curricula in Pages build, ungraded privacy boundary.');
