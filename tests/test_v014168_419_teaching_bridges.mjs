import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const bridge=JSON.parse(fs.readFileSync('data/lab-teaching-bridges-v014168.json','utf8'));
const labs=JSON.parse(fs.readFileSync('data/competency-lab-paths-v01499.json','utf8'));
const guideData=JSON.parse(fs.readFileSync('data/competency-study-guides-v01499.json','utf8'));
assert.equal(bridge.version,'0.14.0.168');
assert.equal(bridge.canonicalLabCount,419);
assert.equal(bridge.officialCompetencyCount,30);
assert.equal(bridge.independentGradesIncluded,false);
assert.equal(bridge.historicalBarDataIncluded,false);
assert.equal(Object.keys(bridge.entries).length,419);
const guides=new Map(guideData.guides.map(g=>[g.code,g]));
const tags=['understand','recognize','apply','mistake','limits'];
const ctx=vm.createContext({});
new vm.Script(fs.readFileSync('assets/js/lab-v34-interactive-lessons.js','utf8'),
 {filename:'assets/js/lab-v34-interactive-lessons.js'}).runInContext(ctx);
const api=ctx.GroundUpLabV34InteractiveLessons;
for(const [id,m] of Object.entries(labs.byLab)){
 const row=bridge.entries[id];
 assert(row&&row.labId===id&&row.title===m.title);
 assert.equal(row.collection,m.bookCode);
 assert.equal(row.sourceStatus,'CANONICAL_TITLE_PLUS_PROVISIONAL_COMPETENCY_GUIDE_NO_VERIFIED_INTRADAY_DATA');
 assert(guides.has(row.mappedGuideCode));
 assert.deepEqual(Array.from(row.relatedCompetencies),Array.from(m.relatedCompetencies));
 const concepts=[];
 for(const key of tags){
  assert(Array.isArray(row.tabs[key])&&row.tabs[key].length>=3);
  const detail=api.get({type:'general',feature:key,concept:row.title,
   labId:id,bridge:row,guide:guides.get(row.mappedGuideCode)});
  assert(detail.script.includes(row.title),id+' '+key);
  assert.equal(detail.verifiedHistory,false);
  assert.equal(detail.editorialFallback,false);
  assert(!detail.script.includes('purpose is to recognize and explain this exact subject'));
  concepts.push(detail.script);
 }
 assert.equal(new Set(concepts).size,5,id+' must have five separate teaching facets');
}
// Every relevant quantitative competency must show formula, substituted
// simulated values and an explicitly bounded interpretation.
const formulas={
 VWAP_CONTEXT:'$2,600 ÷ 300 shares = $8.666',
 EMA_CONTEXT:'0.50 × $11.00 + 0.50 × $10.00 = $10.50',
 VOLUME_ANALYSIS:'600 shares ÷ 200 average shares = 3.0',
 RISK_PER_SHARE:'$10.00 − $9.70 = $0.30',
 POSITION_SIZING:'Floor($30.00 ÷ $0.30) = 100 shares',
 RISK_REWARD:'$0.60 ÷ $0.30 = 2 to 1',
 SLIPPAGE_SPREAD:'($0.04 ÷ $10.02) × 100',
 FLOAT_SUPPLY:'10,000,000 ÷ 5,000,000 = 2.0',
 MFE_MAE_REVIEW:'$10.70 − $10.00 = $0.70',
 LEVEL2_READING:'$10.03 − $10.00 = $0.03'
};
for(const [code,worked] of Object.entries(formulas)){
 const source=Object.values(bridge.entries).find(b=>b.relatedCompetencies.includes(code));
 assert(source,'The quantitative learning bank should correspond to an existing official competency '+code);
 const plan=api.get({type:'general',feature:'apply',concept:source.title,
  labId:source.labId,bridge:source,guide:guides.get(code)});
 assert(plan.script.includes(worked),'Missing step-formatted quantitative example for '+code);
}
const bull=bridge.entries['F2-C07-L01'];
assert(bull);
const exact=api.get({type:'candle',feature:'apply',concept:'Bullish Candle',
 labId:'F2-C07-L01',bridge:bull,guide:guides.get(bull.mappedGuideCode)});
assert(exact.script.includes('$32.00 (Close) − $31.00 (Open) = $1.00'),
 'Nine-step candle lesson must outrank general bridge');
const boot=api.get({type:'general',feature:'apply',concept:'Scanner Filter Discipline',
 labId:'SITE-033',bridge:bridge.entries['SITE-033'],
 teaching:{what:'Define an evidence-led set of stock scanner criteria.',
  when:'Use comparable market session filters.',how:['Explain price threshold','Check float and volume']},
 guide:guides.get('CANDIDATE_QUALITY')});
assert(boot.script.includes('Explain price threshold'),'Daily Boot Camp teaching overrides unrelated Lab topic');
const build=fs.readFileSync('scripts/build-pages.sh','utf8');
assert(build.includes('lab-teaching-bridges-v014168.json'));
assert(build.includes('bootcamp-academy.html'));
console.log('PASS 419/419 distinct five-facet source-grounded ungraded member study bridges, original candle precedence and Boot Camp scope');
