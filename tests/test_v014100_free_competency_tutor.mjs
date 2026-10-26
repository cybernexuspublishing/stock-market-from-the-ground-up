import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseGuides,answerFromGuide} from '../functions/_lib/original-competency-tutor-v014100.js';
import {onRequest} from '../functions/api/market-tutor-v01492.js';
const guides=JSON.parse(readFileSync(new URL('../data/competency-study-guides-v01499.json',import.meta.url),'utf8'));
assert.equal(guides.guides.length,30);
let ranked=chooseGuides(guides,'Explain candlestick wick candle body');
assert(ranked.length>0&&ranked[0].code==='CANDLE_READING');
ranked=chooseGuides(guides,'How does market replay evidence chronology work?');
assert(ranked.some(g=>g.code==='REPLAY_DISCIPLINE'&&g.supplemental===true&&g.officialCompetency===false));
assert(!guides.guides.some(g=>g.code==='REPLAY_DISCIPLINE'));
assert(guides.guides.some(g=>g.code==='LEVEL2_READING'));
assert(answerFromGuide(ranked.find(g=>g.code==='REPLAY_DISCIPLINE'),'explain','').includes('not an official competency'));
ranked=chooseGuides(guides,'Read Level II order book displayed depth');
assert(ranked.some(g=>g.code==='LEVEL2_READING'));
ranked=chooseGuides(guides,'How does market replay evidence chronology work?');
assert(chooseGuides({},'candle').length===0);
assert(answerFromGuide(ranked[0],'question','').includes('Ungraded self-check'));
assert(answerFromGuide(ranked[0],'review','I guessed').includes('no rubric was graded'));
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 SUPABASE_SECRET_KEY:'sb_secret_mock',
 AI_TUTOR_API_KEY:'must-not-use-even-if-accidentally-provisioned',AI_TUTOR_MODEL:'must-not-use',
 ASSETS:{fetch:async req=>{
  assert(String(req.url).endsWith('/data/competency-study-guides-v01499.json'));
  return new Response(JSON.stringify(guides),{status:200,headers:{'content-type':'application/json'}});
 }}};
const old=globalThis.fetch;let providerCalls=0;
globalThis.fetch=async(url,opts={})=>{
 const u=String(url);
 if(u.endsWith('/auth/v1/user'))return new Response(JSON.stringify({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}));
 if(u.includes('/profiles?'))return new Response(JSON.stringify([{account_kind:'member'}]));
 if(u.includes('/admin_user_flags?'))return new Response(JSON.stringify([{status:'active'}]));
 // Production now verifies privileged Showcase roles before Tutor authorization.
 if(u.includes('/admin_user_roles?'))return new Response(JSON.stringify([]));
 if(u.includes('/rpc/user_has_tool_access'))return new Response('true',{headers:{'content-type':'application/json'}});
 if(u.includes('/rpc/v01492_consume_tutor_quota')||u.includes('api.openai.com')){providerCalls++;throw Error('Paid provider forbidden by default')}
 throw Error('Unexpected outbound request '+u);
};
const ask=async(mode='explain')=>{
 const response=await onRequest({env,request:new Request('https://school.example/api/market-tutor-v01492',{
  method:'POST',headers:{authorization:'Bearer session','content-type':'application/json'},
  body:JSON.stringify({question:'Explain candlestick wick candle body',mode})})});
 return [response.status,await response.json()];
};
try{
 const [status,data]=await ask();
 assert.equal(status,200);assert.equal(data.generation,'original-competency-guide');
 assert.equal(data.sources[0].id,'CANDLE_READING');
 assert(data.answer.includes('high and low'));
 assert.equal(data.masteryAwarded,false);
 assert.equal(data.graded,false);
 assert(!JSON.stringify(data).includes('answer_key'));
 const [qStatus,qData]=await ask('question');assert.equal(qStatus,200);
 assert(qData.answer.includes('Ungraded self-check'));
 assert.equal(providerCalls,0,'No paid model or quota requests even if unused credentials exist');
 console.log('PASS v100: free public asset-grounded 30-skill Tutor, 419-Lab navigation, non-grading and paid provider disabled by default.');
}finally{globalThis.fetch=old}
