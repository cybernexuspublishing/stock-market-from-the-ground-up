import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseGuides,originalGuides,answerFromGuide} from '../functions/_lib/original-competency-tutor-v014100.js';
import {onRequest} from '../functions/api/market-tutor-v01492.js';

const read=name=>JSON.parse(readFileSync(new URL('../data/'+name,import.meta.url),'utf8'));
const canonical=read('competency-study-guides-v01499.json');
const research=read('tutor-research-guides-v1.json');
const decisions=read('tutor-decision-playbooks-v1.json');
assert.equal(canonical.guides.length,30,'Never alter the 30 official competencies');
assert.equal(canonical.supplementalGuides.length,1,'Keep existing replay discipline');
assert.equal(research.guides.length,32,'Retain 32 previous research lessons');
assert.equal(decisions.kind,'original_public_tutor_decision_playbooks');
assert.equal(decisions.guides.length,18,'Exactly 18 original trade-decision lessons');
assert.equal(new Set(decisions.guides.map(g=>g.code)).size,18,'Unique lesson codes');
const approvedDomain=/^https:\/\/(?:www\.)?(?:cmegroup\.com|fidelity\.com|schwab\.com|investor\.gov|sec\.gov|chartschool\.stockcharts\.com|help\.stockcharts\.com)\//i;
for(const g of decisions.guides){
 assert.equal(g.decisionPlaybook,true);
 assert.equal(g.researchGuide,true);
 assert.equal(g.supplemental,true);
 assert.equal(g.officialCompetency,false);
 assert(g.archiveBasis.includes('STT.zip'));
 for(const k of ['title','concept','watchFor','entryEvidence','holdEvidence','exitEvidence','noTrade','fictionalCase','procedure','limit','invalidation','commonError','selfCheck','reviewExplanation'])
  assert(typeof g[k]==='string'&&g[k].length>=35,g.code+' missing '+k);
 assert(g.fictionalCase.startsWith('FICTIONAL:'));
 assert(g.sourceUrls.length>0&&g.sourceUrls.every(u=>approvedDomain.test(u)),g.code+' unreviewed source URL');
 const explanation=answerFromGuide(g,'explain','');
 assert(explanation.includes('WHY consider entry'));
 assert(explanation.includes('WHY a hold might remain justified'));
 assert(explanation.includes('WHY reassess or exit'));
 assert(explanation.includes('WAIT or NO TRADE'));
 assert(explanation.includes('Ungraded explanation check'));
 assert(explanation.includes('Supporting educational references'));
 assert(!/\b(?:we guarantee profits|this setup guarantees a win|has proven positive expectancy|will always fill at the stop)\b/i.test(explanation));
 assert(answerFromGuide(g,'review','I guessed').includes('cannot issue a grade or mastery credit'));
}
const queries=[
 ['DECISION_FRAMEWORK','Why enter hold exit wait trade decision framework'],
 ['BREAKOUT_CONFIRM','Why enter hold exit breakout confirmation'],
 ['BREAKOUT_RETEST','How trade a breakout retest entry hold exit'],
 ['FAILED_BREAKOUT','Failed breakout why enter exit hold'],
 ['TREND_PULLBACK','Trend pullback why enter hold exit'],
 ['VWAP_RECLAIM','VWAP reclaim why enter hold exit'],
 ['VWAP_REJECTION','VWAP rejection why enter hold exit'],
 ['OPENING_RANGE','Opening range breakout entry hold exit'],
 ['GAP_CONTINUATION','Gap continuation why enter hold exit'],
 ['GAP_FADE','Gap fade when enter hold exit'],
 ['RANGE_BOUNDARY','Range support resistance entry hold exit'],
 ['TREND_CONTINUATION','Higher highs higher lows trend continuation hold'],
 ['REVERSAL_STRUCTURE','Reversal structure enter hold exit'],
 ['SUPPORT_RETEST','Support retest bounce entry hold exit'],
 ['MEAN_REVERSION','Mean reversion enter hold exit'],
 ['SHORT_BREAKDOWN','Short breakdown enter hold exit'],
 ['CATALYST_FOLLOWTHROUGH','Catalyst followthrough when enter hold exit'],
 ['POSITION_MANAGEMENT','Position hold partial exit trailing stop time exit']
];
for(const [code,q] of queries){
 const matches=chooseGuides({...canonical,researchGuides:research.guides,decisionGuides:decisions.guides},q);
 assert(matches.some(g=>g.code===code),'Decision retrieval missed '+code);
}
const route='https://school.example/api/market-tutor-v01492';
const assets={fetch:async req=>{
 const path=new URL(req.url).pathname;
 if(path==='/data/competency-study-guides-v01499.json')return Response.json(canonical);
 if(path==='/data/tutor-research-guides-v1.json')return Response.json(research);
 if(path==='/data/tutor-decision-playbooks-v1.json')return Response.json(decisions);
 return Response.json({error:'unrecognized public file'},{status:404});
}};
const byGuide=await originalGuides({ASSETS:assets},new Request(route),'Failed breakout why enter exit hold');
assert(byGuide.some(g=>g.code==='FAILED_BREAKOUT'));
const failAsset={fetch:async req=>{
 const path=new URL(req.url).pathname;
 return path==='/data/competency-study-guides-v01499.json'?Response.json(canonical):
  Response.json({error:'optional asset unavailable'},{status:503});
}};
const fallback=await originalGuides({ASSETS:failAsset},new Request(route),'candlestick wick candle body');
assert(fallback.some(g=>g.code==='CANDLE_READING'),'Missing optional decision library cannot break canonical lesson');

const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 SUPABASE_SECRET_KEY:'sb_secret_mock',ASSETS:assets,AI_SERVICE_ENABLED:'false'};
const previous=globalThis.fetch;let paidCalls=0;
globalThis.fetch=async(url)=>{
 const u=String(url);
 if(u.endsWith('/auth/v1/user'))return Response.json({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
 if(u.includes('/profiles?'))return Response.json([{account_kind:'member'}]);
 if(u.includes('/admin_user_flags?')||u.includes('/admin_user_roles?'))return Response.json([]);
 if(u.includes('/rpc/user_has_tool_access'))return new Response('true',{headers:{'content-type':'application/json'}});
 if(u.includes('api.openai.com')||u.includes('v01492_consume_tutor_quota')){
  paidCalls++;throw Error('No AI or billable inference is permitted for decision playbooks');
 }
 throw Error('Unexpected external resource in authenticated mock: '+u);
};
try{
 const result=await onRequest({env,request:new Request(route,{method:'POST',
  headers:{authorization:'Bearer synthetic-member','content-type':'application/json'},
  body:JSON.stringify({question:'Failed breakout why enter exit hold',mode:'explain',allowModel:true})})});
 assert.equal(result.status,200,'Authenticated synthetic member receives a lesson');
 const body=await result.json();
 assert.equal(body.generation,'original-competency-guide');
 assert.equal(body.aiReason,'decision_playbook_source_only');
 assert(body.sources.some(x=>x.id==='FAILED_BREAKOUT'&&/decision playbook/.test(x.sourceLabel)));
 assert(body.answer.includes('WHY consider entry'));
 assert(body.answer.includes('WHY a hold might remain justified'));
 assert(body.answer.includes('WAIT or NO TRADE'));
 assert.equal(body.graded,false);
 assert.equal(body.masteryAwarded,false);
 assert.equal(paidCalls,0);
}finally{globalThis.fetch=previous}
console.log('PASS trade-decision Tutor: 18 original entry/hold/exit/wait playbooks, safe retrieval, optional asset fallback, 30 competencies unchanged, authenticated no-charge response.');
