import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseGuides,originalGuides,answerFromGuide} from '../functions/_lib/original-competency-tutor-v014100.js';
import {onRequest} from '../functions/api/market-tutor-v01492.js';

const data=path=>JSON.parse(readFileSync(new URL('../data/'+path,import.meta.url),'utf8'));
const canonical=data('competency-study-guides-v01499.json'),
 research=data('tutor-research-guides-v1.json'),
 playbooks=data('tutor-decision-playbooks-v1.json'),
 advanced=data('tutor-advanced-decision-guides-v1.json');
const masters=[
 ['tutor-indicator-study-v1.json','indicators',61],
 ['tutor-watchlist-study-v1.json','watchlists',22],
 ['tutor-strategy-study-v1.json','strategies',50]
].map(([file,group,count])=>({file,group,count,data:data(file)}));
assert.equal(canonical.guides.length,30,'No scored competency was added');
assert.equal(canonical.supplementalGuides.length,1,'Replay guide retained');
assert.equal(research.guides.length,32,'Research guides preserved');
assert.equal(playbooks.guides.length,18,'Decision playbooks preserved');
assert.equal(advanced.guides.length,13,'Advanced guides preserved');
const all=masters.flatMap(m=>m.data.guides);
assert.equal(all.length,133,'Exactly 133 original new market study briefs');
assert.equal(new Set(all.map(x=>x.code)).size,133,'All new codes are unique');
const allowed=/^https:\/\/(?:www\.)?(?:chartschool\.stockcharts\.com|toslc\.thinkorswim\.com|www\.cmegroup\.com|www\.investor\.gov)\//i;
for(const m of masters){
 assert.equal(m.data.kind,'original_public_tutor_master_study');
 assert.equal(m.data.version,'1.0');
 assert.equal(m.data.count,m.count);
 assert.equal(m.data.group,m.group);
 assert.equal(m.data.guides.length,m.count);
}
for(const g of all){
 assert(g.masterStudy===true&&g.researchGuide===true&&g.supplemental===true&&g.officialCompetency===false);
 assert(/STT\.zip/.test(g.archiveBasis),'Provenance for '+g.code);
 assert(g.sourceUrls.length>=1&&g.sourceUrls.every(u=>allowed.test(u)),'Official source domain '+g.code);
 assert(g.title.length>=4&&g.formula.length>=8,'Accurate concise title and formula '+g.code);
 for(const k of ['concept','whyUse','howToUse','procedure','limit','limits',
  'invalidation','commonError','selfCheck','reviewExplanation','fictionalPrompt'])
  assert(typeof g[k]==='string'&&g[k].length>=18,'Missing teachable dimension '+g.code+':'+k);
 assert(g.fictionalPrompt.startsWith('FICTIONAL:'),'Missing hypothetical boundary '+g.code);
 const answer=answerFromGuide(g,'explain','');
 for(const part of ['WHAT it does:','HOW it works','WHY it helps','HOW to use it','Limits and uncertainty:',
  'Common mistake:','Ungraded understanding check:'])
  assert(answer.includes(part),'Missing instructional output '+g.code+' '+part);
 assert(answerFromGuide(g,'review','I would wait').includes('does not earn mastery'));
 if(g.kind==='strategy'){
  assert(answer.includes('Entry evidence:')&&answer.includes('Conditional HOLD reasoning:'));
  assert(answer.includes('Possible EXIT reasoning:')&&answer.includes('WAIT / NO TRADE:'));
 }
}
const index={...canonical,researchGuides:research.guides,
 decisionGuides:[...playbooks.guides,...advanced.guides],masterStudyGuides:all};
const questions=[
 ['STUDY_RSI','What does Relative Strength Index RSI calculate and how can I use it'],
 ['STUDY_MACD','Explain MACD fast slow averages histogram'],
 ['STUDY_BOLLINGER_BANDS','What do Bollinger Bands tell a learner'],
 ['STUDY_ATR','How is Average True Range calculated including gaps'],
 ['STUDY_OBV','Explain On Balance Volume confirmation'],
 ['STUDY_ICHIMOKU','Explain Ichimoku Cloud trend context'],
 ['STUDY_ADX','What does ADX measure about trend strength'],
 ['STUDY_KELTNER_CHANNELS','How to use Keltner Channels for volatility'],
 ['STUDY_ADVANCE_DECLINE','Explain Advance Decline Line market breadth'],
 ['STUDY_MATCHED_TIME_RVOL','Matched-Time Relative Volume morning scanning'],
 ['STUDY_WATCH_DISCOVERY_FILTERS','How do scanner inclusion exclusion and Boolean groups work'],
 ['STUDY_WATCH_CANDIDATE_STATE','Explain discovery watch qualification execution state machine'],
 ['STUDY_WATCH_CATALYST_SCAN','How do I verify a company catalyst watchlist queue'],
 ['STUDY_WATCH_HALT_SSR_BORROW','Build a halt SSR borrow watchlist risk gate'],
 ['STUDY_WATCH_DYNAMIC_SNAPSHOT','How do I keep dynamic scan snapshots reproducible'],
 ['STUDY_WATCH_NO_TRADE_LEDGER','How to document no trade rejected candidate journal'],
 ['STUDY_STRATEGY_DIP_AND_RIP','Explain Dip and Rip setup and risk'],
 ['STUDY_STRATEGY_FIRST_GREEN_DAY','What is First Green Day and why use it'],
 ['STUDY_STRATEGY_RCT','Explain Red Candle Theory first red reset'],
 ['STUDY_STRATEGY_AFTERNOON_VWAP_HOLD','When to consider Afternoon VWAP Hold'],
 ['STUDY_STRATEGY_ABCD','What is the ABCD Pattern structure'],
 ['STUDY_STRATEGY_ORACLE_SIGNAL','Explain Oracle Signal Workflow limitations'],
 ['STUDY_STRATEGY_NO_TRIGGER_CASH_HOLD','Why no trigger cash hold no trade']
];
for(const [code,question] of questions){
 const r=chooseGuides(index,question);
 assert(r.some(g=>g.code===code),'New study failed retrieval '+code+' '+JSON.stringify(r.map(x=>x.code)));
}
const source={fetch:async req=>{
 const url=new URL(req.url),file=url.pathname.split('/').pop();
 if(file==='competency-study-guides-v01499.json')return Response.json(canonical);
 if(file==='tutor-research-guides-v1.json')return Response.json(research);
 if(file==='tutor-decision-playbooks-v1.json')return Response.json(playbooks);
 if(file==='tutor-advanced-decision-guides-v1.json')return Response.json(advanced);
 const found=masters.find(x=>x.file===file);
 return found?Response.json(found.data):Response.json({error:'unknown'},{status:404});
}};
const req=new Request('https://site.example/api/market-tutor-v01492');
for(const code of ['STUDY_MACD','STUDY_WATCH_CANDIDATE_STATE','STUDY_STRATEGY_RCT']){
 const matching=questions.find(q=>q[0]===code);if(!matching)continue;
 const hits=await originalGuides({ASSETS:source},req,matching[1]);
 assert(hits.some(x=>x.code===code),'Optional source retrieval failed '+code);
}
const missing={fetch:async request=>{
 const file=new URL(request.url).pathname.split('/').pop();
 if(file==='competency-study-guides-v01499.json')return Response.json(canonical);
 return Response.json({error:'unavailable'},{status:503});
}};
const fallback=await originalGuides({ASSETS:missing},req,'candlestick wick candle body');
assert(fallback.some(x=>x.code==='CANDLE_READING'),'Core foundation fails if optional assets disappear');
const prior=globalThis.fetch;
let providerCalls=0;
globalThis.fetch=async u=>{
 const v=String(u);
 if(v.endsWith('/auth/v1/user'))return Response.json({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
 if(v.includes('/profiles?'))return Response.json([{account_kind:'member'}]);
 if(v.includes('/admin_user_flags?')||v.includes('/admin_user_roles?'))return Response.json([]);
 if(v.includes('/rpc/user_has_tool_access'))return new Response('true',{headers:{'content-type':'application/json'}});
 if(v.includes('api.openai.com')||v.includes('v01492_consume_tutor_quota')){providerCalls++;throw Error('Paid inference forbidden by study test')}
 throw Error('Unknown synthetic API call '+v);
};
try{
 const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
  SUPABASE_SECRET_KEY:'sb_secret_mock',AI_SERVICE_ENABLED:'false',ASSETS:source};
 for(const q of ['Explain MACD fast slow averages histogram',
  'How do scanner inclusion exclusion and Boolean groups work',
  'Explain Red Candle Theory first red reset']){
  const response=await onRequest({env,request:new Request(req.url,{method:'POST',
   headers:{authorization:'Bearer synthetic-test','content-type':'application/json'},
   body:JSON.stringify({question:q,mode:'explain',allowModel:true})})});
  assert.equal(response.status,200,'Synthetic auth API '+q);
  const body=await response.json();
  assert.equal(body.generation,'original-competency-guide');
  assert.equal(body.aiReason,'original_market_study_source_only');
  assert(body.sources.some(s=>s.id.startsWith('STUDY_')),'Retrieved new study attribution');
  assert(body.answer.includes('WHY it helps a learner:'));
  assert.equal(body.graded,false);
  assert.equal(body.masteryAwarded,false);
 }
 assert.equal(providerCalls,0,'Source-only guides cannot use paid AI');
}finally{globalThis.fetch=prior}
console.log('PASS 133 Talia study guides (61 indicator,22 watchlist,50 strategy); source constraints, old 94 unchanged, 22 glossary unaffected, retrieval/fallback, synthetic zero-charge authenticated API.');
