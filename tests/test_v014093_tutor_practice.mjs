// v0.14.0.93 — Premium Tutor practical integration, zero model or real database calls.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/market-tutor-v01492.js';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 SUPABASE_SECRET_KEY:'sb_secret_mock',AI_TUTOR_API_KEY:'must-not-be-used',AI_TUTOR_MODEL:'mock'};
let allow=true,kind='member',account='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 marketCalls=0,privateCalls=0,failPrivate=false;
const original=globalThis.fetch,urls=[];
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(u,o={})=>{
 const url=String(u);urls.push({url,opts:o});
 if(url.endsWith('/auth/v1/user'))return json({id:account});
 if(url.includes('/profiles?'))return json([{account_kind:kind}]);
 if(url.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(url.includes('/admin_user_roles?'))return json([]);
 if(url.includes('/rpc/user_has_tool_access'))return json(allow);
 if(url.includes('/decision_journal?')){
  privateCalls++;
  if(failPrivate)return json({error:'unavailable'},503);
  return json([{mistakes:['Chased entry','No invalidation']},{mistakes:['Chased entry']},{mistakes:['Chased entry','Chased entry']}]);
 }
 if(url.includes('/lab_attempts?')){
  privateCalls++;
  if(failPrivate)return json({error:'unavailable'},503);
  return json([{mistakes:['No invalidation'],skill_code:'RISK'},{mistakes:['Missing participation'],skill_code:'CHART'}]);
 }
 if(url.includes('api.openai.com')){marketCalls++;throw Error('User journal MUST NEVER be sent to model');}
 if(url.includes('/rpc/v01492_consume_tutor_quota'))throw Error('Practice must not consume AI usage quota');
 throw Error('Unexpected service '+url);
};
const path='https://site.example/api/market-tutor-v01492';
const request=(body,auth=true)=>new Request(path,{method:'POST',headers:{
 'content-type':'application/json',...(auth?{authorization:'Bearer authenticated'}:{})},body:JSON.stringify(body)});
try{
 let r=await onRequest({request:request({question:'What should I practice next?',mode:'practice'}),env});
 assert.equal(r.status,200);
 const x=await r.json();
 assert.equal(x.mode,'practice');assert.equal(x.graded,false);assert.equal(x.masteryAwarded,false);
 assert.equal(x.recordsReviewed,5);
 assert.deepEqual(x.recommendations.map(x=>[x.topic,x.mentions]),[['Chased entry',3],['No invalidation',2],['Missing participation',1]]);
 assert.equal(x.skillSignals.length,2);
 assert(!JSON.stringify(x).includes('aaaaaaaa'));
 assert.equal(marketCalls,0);
 assert.equal(privateCalls,2);
 assert(urls.filter(x=>x.url.includes('/decision_journal?')||x.url.includes('/lab_attempts?')).every(x=>x.url.includes('user_id=eq.'+account)));
 assert(!urls.some(x=>x.url.includes('answer_key')||x.url.includes('portfolio')));
 const headers=urls.find(x=>x.url.includes('/decision_journal?'))?.opts.headers;
 assert.equal(headers.apikey,env.SUPABASE_SECRET_KEY);
 assert.equal(headers.authorization,undefined,'Modern sb_secret cannot be Bearer');
 allow=false;r=await onRequest({request:request({question:'What should I practice?',mode:'practice'}),env});assert.equal(r.status,403);
 allow=true;kind='showcase';r=await onRequest({request:request({question:'What should I practice?',mode:'practice'}),env});assert.equal(r.status,403);
 kind='member';failPrivate=true;r=await onRequest({request:request({question:'What should I practice?',mode:'practice'}),env});assert.equal(r.status,503);
 r=await onRequest({request:request({question:'What should I practice?',mode:'practice'},false),env});assert.equal(r.status,401);
 assert.equal(marketCalls,0);
 const ui=readFileSync(new URL('../assets/js/market-tutor.js',import.meta.url),'utf8'),
  html=readFileSync(new URL('../market-tutor.html',import.meta.url),'utf8');
 assert(html.includes('<option value="practice">'));
 assert(ui.includes("data.mode==='practice'"));
 assert(ui.includes("mode=chosen==='practice'"));
 console.log('PASS v93 Tutor: authenticated Journal/Lab study signals, raw-data isolation, no model calls or false grading, denied role and storage failures.');
}finally{globalThis.fetch=original}
