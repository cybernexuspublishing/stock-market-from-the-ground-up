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
assert.equal(modules.modules.length,36);
assert.equal(modules.indicatorCount,20);
assert.equal(modules.watchlistCount,16);
assert.deepEqual(Array.from(modules.stages),['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results']);
assert.equal(new Set(modules.modules.map(x=>x.id)).size,36);
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

const mathNew=[
 ['obv',8],['cmf',12],['mfi',12],['roc',10],['donchian',12],['keltner',12]
];
for(const [name,period] of mathNew){
 const m=api.metric(bars.slice(0,40),name,period);
 assert(Number.isFinite(m.value),'Additional indicator must be calculable: '+name);
 assert(api.metric(bars.slice(0,16),name,20).value===null || name==='obv',
  'No fabricated warmup value '+name);
}
const obv=api.metric(subset,'obv',8);
let obvExpected=0;
for(let i=1;i<subset.length;i++){
 if(subset[i].close>subset[i-1].close)obvExpected+=subset[i].volume;
 else if(subset[i].close<subset[i-1].close)obvExpected-=subset[i].volume;
}
assert.equal(obv.value,obvExpected,'OBV signed-volume sum and completed bars');
const roc=api.metric(subset,'roc',10);
assert(Math.abs(roc.value-(subset.at(-1).close/subset[subset.length-11].close-1)*100)<1e-10);
const cmf=api.metric(subset,'cmf',12);
assert(cmf.value>=-1&&cmf.value<=1,'CMF bounded by close location');
const mfi=api.metric(subset,'mfi',12);
assert(mfi.value>=0&&mfi.value<=100,'MFI bounded, no division by zero');
const donchian=api.metric(subset,'donchian',12),window=subset.slice(-12);
assert.equal(donchian.upper,Math.max(...window.map(b=>b.high)));
assert.equal(donchian.lower,Math.min(...window.map(b=>b.low)));
const keltner=api.metric(subset,'keltner',12);
assert(Math.abs(keltner.upper-keltner.value-2*api.metric(subset,'atr',12).value)<1e-9);
for(const name of ['cmf','mfi','roc','keltner','donchian']){
 const paused=api.metric(subset,name,12),future=api.metric(bars.slice(0,48),name,12);
 if(Number.isFinite(paused.value))assert.notEqual(paused.value,future.value,'No future bars in '+name);
}
const fict={
 a:{price:12,allowed:true,relative:1.08,restricted:false,shortable:false,fresh:true},
 b:{price:8,allowed:true,relative:0.90,restricted:false,shortable:true,fresh:true},
 c:{price:4,allowed:true,relative:1.12,restricted:false,shortable:true,fresh:false}
};
assert.equal(api.specialGate(fict.a,'boolean').pass,true);
assert.equal(api.specialGate(fict.c,'boolean').pass,false,'ALL veto precedes ANY');
assert.equal(api.specialGate(fict.c,'freshness').pass,false,'Stale quote must fail');
assert.equal(api.specialGate(fict.b,'sector').pass,false,'Positive absolute return may underperform peers');
assert.equal(api.specialGate(fict.a,'borrow').pass,false,'Short locate must not be presumed');
const newCodes=[
 'STUDY_OBV','STUDY_CMF','STUDY_MFI','STUDY_ROC','STUDY_DONCHIAN_CHANNELS','STUDY_KELTNER_CHANNELS',
 'STUDY_WATCH_DISCOVERY_FILTERS','STUDY_WATCH_DATA_FRESHNESS',
 'STUDY_WATCH_SECTOR_RELATIVE','STUDY_WATCH_HALT_SSR_BORROW'
];
for(const code of newCodes){
 const unit=modules.modules.find(x=>x.guideCode===code);
 assert(unit,'Missing added scenario '+code);
 assert(unit.why.length>50&&unit.method.length>50&&unit.limitation.length>50);
 assert(unit.scaffold.length>70,'Concept-specific corrective scaffold '+code);
}

// Batch 03: independently checked indicator arithmetic, zero denominators and
// source-time gates. None can use future bars or private graded results.
const newUnits=[
 'STUDY_WMA','STUDY_PPO','STUDY_STOCHASTIC','STUDY_WILLIAMS_R','STUDY_ATRP','STUDY_VOLUME_SMA',
 'STUDY_WATCH_UNIVERSE_BUILD','STUDY_WATCH_IDENTITY_CORPORATE','STUDY_WATCH_LEVEL_MAP',
 'STUDY_WATCH_MULTI_TIMEFRAME_WATCH','STUDY_WATCH_RISK_FIRST_SCORE','STUDY_WATCH_DYNAMIC_SNAPSHOT'
];
for(const code of newUnits){
 const unit=modules.modules.find(x=>x.guideCode===code);
 assert(unit,'New interactive lesson must link to real study '+code);
 for(const key of ['learn','why','method','limitation','scaffold'])
  assert(typeof unit[key]==='string'&&unit[key].length>=60,'Subject-specific teaching '+code+' '+key);
 assert.equal(unit.choiceFeedback[unit.correct],null);
 assert.equal(unit.transferFeedbackByChoice[unit.transferCorrect],null);
}
const measure=(name,len,b=bars)=>api.metric(b,name,len);
const latestCloses=bars.slice(0,20).map(b=>b.close),weights=latestCloses.slice(-8).reduce((v,p,i)=>v+p*(i+1),0);
assert(Math.abs(measure('wma',8,bars.slice(0,20)).value-weights/36)<1e-10,'WMA oldest-to-newest weighted mean');
assert.equal(measure('wma',8,bars.slice(0,7)).value,null,'WMA must respect warmup');
assert.equal(measure('ppo',12,bars.slice(0,25)).value,null,'PPO has no complete 26-bar slow seed');
const ppo=measure('ppo',12,bars.slice(0,40)),cl=bars.slice(0,40).map(b=>b.close);
const underlying=context.window.CrownlightIndicatorMath;
const pFast=underlying.ema(cl,12)[39],pSlow=underlying.ema(cl,26)[39];
assert(Math.abs(ppo.value-100*(pFast-pSlow)/pSlow)<1e-10,'PPO is percentage of slow EMA, not MACD dollar line');
for(const name of ['stochastic','williamsr']){
 const v=measure(name,14,bars.slice(0,30)).value;
 assert(Number.isFinite(v),'Range oscillator must calculate '+name);
 assert(name==='stochastic'?v>=0&&v<=100:v>=-100&&v<=0,'Range oscillator proper scale');
 assert.equal(measure(name,14,bars.slice(0,13)).value,null,'Range oscillator warmup '+name);
}
const flat=Array.from({length:14},(_,i)=>({open:10,high:10,low:10,close:10,volume:1000,time:new Date(Date.UTC(2026,9,27,13,30+i)).toISOString()}));
assert.equal(measure('stochastic',14,flat).value,null,'Undefined stochastic zero-range, no invented score');
assert.equal(measure('williamsr',14,flat).value,null,'Undefined Williams zero-range, no invented score');
const oscK=measure('stochastic',14,bars.slice(0,30)).value;
const oscR=measure('williamsr',14,bars.slice(0,30)).value;
assert(Math.abs(oscR-(oscK-100))<1e-10,'Williams %R related to stochastic %K, not independent evidence');
const atrPercent=measure('atrp',10,bars.slice(0,30)),atrRaw=measure('atr',10,bars.slice(0,30));
assert(Math.abs(atrPercent.value-100*atrRaw.value/bars[29].close)<1e-10,'ATRP percent, not raw dollars');
assert.equal(measure('atrp',10,bars.slice(0,9)).value,null);
const completed=bars.slice(0,20),volExpected=completed.slice(-10).reduce((v,b)=>v+b.volume,0)/10;
assert.equal(measure('volumesma',10,completed).value,volExpected,'Mean completed share volume per bar');
assert.equal(measure('volumesma',10,bars.slice(0,9)).value,null,'Incomplete volume lookback');
for(const name of ['wma','ppo','stochastic','williamsr','atrp','volumesma']){
 const earlier=measure(name,name==='ppo'?12:10,bars.slice(0,30)),later=measure(name,name==='ppo'?12:10,bars.slice(0,48));
 if(Number.isFinite(earlier.value))assert.notEqual(earlier.value,later.value,'No later samples used in earlier pause '+name);
}
const complete={price:12,allowed:true,listedCommon:true,identityVerified:true,actionReconciled:true,
 levelsKnown:true,fiveMinuteClosed:true,higherFrameStamped:true,score:79,criticalUnknown:false,snapshotFrozen:true};
const unresolved={...complete,identityVerified:false,actionReconciled:false,levelsKnown:false,
 fiveMinuteClosed:false,score:98,criticalUnknown:true,snapshotFrozen:false};
for(const rule of ['universe','identity','levels','timeframes','riskfirst','snapshot']){
 assert.equal(api.specialGate(complete,rule).pass,true,'Pass populated evidence '+rule);
 assert.equal(api.specialGate(unresolved,rule).pass,false,'No false qualification '+rule);
}
assert.match(api.specialGate(unresolved,'riskfirst').display,/Score 98/,'Show high score with hard risk veto');
assert.match(api.specialGate(unresolved,'snapshot').reason,/reproducible/,'Frozen as-of-time scanner requirement');
assert.equal(api.specialGate({...complete,listedCommon:false},'universe').pass,false,'Wrong instrument cannot pass');
assert.equal(api.specialGate({...complete,higherFrameStamped:false},'timeframes').pass,false,'Incomplete context fails');
console.log('PASS Talia Guided Practice Batch 03: 36 authored modules (20 indicator/16 watchlist), exact calculations, 10 advanced source/risk gates, warmup, no-lookahead, privacy and ungraded boundaries.');
