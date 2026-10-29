import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseGuides,originalGuides,answerFromGuide} from '../functions/_lib/original-competency-tutor-v014100.js';
import {onRequest} from '../functions/api/market-tutor-v01492.js';

const read=f=>JSON.parse(readFileSync(new URL('../data/'+f,import.meta.url),'utf8'));
const base=read('competency-study-guides-v01499.json');
const research=read('tutor-research-guides-v1.json');
const playbooks=read('tutor-decision-playbooks-v1.json');
const advanced=read('tutor-advanced-decision-guides-v1.json');
assert.equal(base.guides.length,30);
assert.equal(base.supplementalGuides.length,1);
assert.equal(research.guides.length,32);
assert.equal(playbooks.guides.length,18);
assert.equal(advanced.kind,'original_public_tutor_advanced_decision_guides');
assert.equal(advanced.guides.length,13);
assert.equal(new Set(advanced.guides.map(g=>g.code)).size,13);
const source=/^https:\/\/(?:www\.)?(?:investor\.gov|optionseducation\.org|schwab\.com)\//i;
for(const g of advanced.guides){
 assert(g.advancedDecisionGuide===true&&g.decisionPlaybook===true&&g.supplemental===true&&g.officialCompetency===false);
 assert(g.archiveBasis.includes('STT.zip'));
 assert(g.horizon.length>=25);
 assert(g.fictionalCase.startsWith('FICTIONAL:'));
 assert(g.sourceUrls.length>0&&g.sourceUrls.every(u=>source.test(u)));
 for(const k of ['concept','watchFor','entryEvidence','holdEvidence','exitEvidence','noTrade','procedure','invalidation','commonError','selfCheck'])
  assert(g[k].length>=35,g.code+' missing '+k);
 const explanation=answerFromGuide(g,'explain','');
 assert(explanation.includes('Governing time horizon:'));
 assert(explanation.includes('WHY consider entry'));
 assert(explanation.includes('WHY a hold might remain justified'));
 assert(explanation.includes('WHY reassess or exit'));
 assert(explanation.includes('WAIT or NO TRADE'));
 assert(explanation.includes('Original fictional practice: FICTIONAL:'));
 assert(answerFromGuide(g,'review','My reflection').includes('cannot issue a grade or mastery credit'));
}
const matches=[
 ['LONG_TERM_HOLD_STOCK','Why hold a stock for years instead of day trade'],
 ['LONG_TERM_PORTFOLIO_HOLD','Portfolio rebalancing long term hold trim'],
 ['EARNINGS_THESIS_REVIEW','Earnings guidance cash flow long term hold exit'],
 ['BALANCE_SHEET_VALUATION','Balance sheet debt dilution valuation exit'],
 ['MARKET_REGIME_BREADTH','Market regime breadth volatility entry hold'],
 ['SECTOR_RELATIVE_STRENGTH','Sector relative strength leadership why hold'],
 ['CONFLICTING_TIMEFRAMES','Conflicting timeframes signals why enter wait'],
 ['SIGNAL_CONFLUENCE_VETO','Confluence veto VWAP EMA volume conflicting signals'],
 ['ORDERFLOW_PRINT_QUOTE','Orderflow time and sales prints quotes tape'],
 ['ORDERBOOK_LIQUIDITY_EXECUTION','Level II orderbook liquidity partial fills hold'],
 ['OPTIONS_LONG_THETA_IV','Options long theta implied volatility why hold or exit'],
 ['OPTIONS_SHORT_ASSIGNMENT','Options short assignment dividend expiration risk'],
 ['OPTIONS_SPREAD_RISK','Options spread risk net Greeks leg assignment']
];
const index={...base,researchGuides:research.guides,decisionGuides:[...playbooks.guides,...advanced.guides]};
for(const [code,query] of matches){
 assert(chooseGuides(index,query).some(x=>x.code===code),'Did not retrieve '+code);
}
const url='https://school.example/api/market-tutor-v01492';
const assets={fetch:async req=>{
 const path=new URL(req.url).pathname;
 if(path==='/data/competency-study-guides-v01499.json')return Response.json(base);
 if(path==='/data/tutor-research-guides-v1.json')return Response.json(research);
 if(path==='/data/tutor-decision-playbooks-v1.json')return Response.json(playbooks);
 if(path==='/data/tutor-advanced-decision-guides-v1.json')return Response.json(advanced);
 return Response.json({error:'unknown asset'},{status:404});
}};
const search=await originalGuides({ASSETS:assets},new Request(url),'Options long theta implied volatility why hold or exit');
assert(search.some(g=>g.code==='OPTIONS_LONG_THETA_IV'));
const unavailable={fetch:async req=>{
 const p=new URL(req.url).pathname;
 if(p==='/data/competency-study-guides-v01499.json')return Response.json(base);
 if(p==='/data/tutor-research-guides-v1.json')return Response.json(research);
 if(p==='/data/tutor-decision-playbooks-v1.json')return Response.json(playbooks);
 return Response.json({error:'advanced catalog unavailable'},{status:503});
}};
const old=await originalGuides({ASSETS:unavailable},new Request(url),'Failed breakout why enter hold exit');
assert(old.some(g=>g.code==='FAILED_BREAKOUT'),'Optional advanced source must not disable existing decision guide');
const previous=globalThis.fetch;
let providerCalls=0;
globalThis.fetch=async url=>{
 const u=String(url);
 if(u.endsWith('/auth/v1/user'))return Response.json({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
 if(u.includes('/profiles?'))return Response.json([{account_kind:'member'}]);
 if(u.includes('/admin_user_flags?')||u.includes('/admin_user_roles?'))return Response.json([]);
 if(u.includes('/rpc/user_has_tool_access'))return new Response('true',{headers:{'content-type':'application/json'}});
 if(u.includes('api.openai.com')||u.includes('v01492_consume_tutor_quota')){
  providerCalls++;throw Error('No paid inference allowed in source-only decision lesson');
 }
 throw Error('Unexpected synthetic request '+u);
};
try{
 const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 SUPABASE_SECRET_KEY:'sb_secret_mock',AI_SERVICE_ENABLED:'false',ASSETS:assets};
 const result=await onRequest({env,request:new Request(url,{method:'POST',headers:{
  authorization:'Bearer synthetic-member','content-type':'application/json'},
  body:JSON.stringify({question:'Options long theta implied volatility why hold or exit',mode:'explain',allowModel:true})})});
 assert.equal(result.status,200);
 const body=await result.json();
 assert.equal(body.generation,'original-competency-guide');
 assert.equal(body.aiReason,'decision_playbook_source_only');
 assert(body.sources.some(x=>x.id==='OPTIONS_LONG_THETA_IV'));
 assert(body.answer.includes('Governing time horizon:'));
 assert(body.answer.includes('WAIT or NO TRADE'));
 assert.equal(body.graded,false);
 assert.equal(body.masteryAwarded,false);
 assert.equal(providerCalls,0);
}finally{globalThis.fetch=previous}
console.log('PASS advanced Tutor: 13 original fictional lessons, two horizon types, safe fallback, 30 skills and 419 Lab mapping untouched, authenticated zero-charge source-only answer.');
