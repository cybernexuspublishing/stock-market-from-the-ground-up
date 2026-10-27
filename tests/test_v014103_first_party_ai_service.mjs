// First-party paid Market Tutor AI v0.14.0.103 — no live DB or provider call.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest as tutor} from '../functions/api/market-tutor-v01492.js';
import {onRequest as status} from '../functions/api/member-ai-service-v014103.js';
import {aiServiceConfig,reserveAiRequest,aiServiceMemberStatus} from '../functions/_lib/first-party-ai-service-v014103.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const requestId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const env={SUPABASE_URL:'https://example.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_testing',SUPABASE_SECRET_KEY:'sb_secret_testing',
 AI_SERVICE_ENABLED:'true',AI_SERVICE_MEMBER_DAILY_LIMIT:'3',
 AI_SERVICE_GLOBAL_DAILY_LIMIT:'9',AI_SERVICE_GLOBAL_MONTHLY_LIMIT:'50',
 AI_TUTOR_API_KEY:'mock-provider-key-not-real',AI_TUTOR_MODEL:'test-model',AI_PAID_PROVIDER_OWNER_APPROVED:'true',AI_TUTOR_APPROVED_MODELS:'test-model'};
let allow=true,kind='member',meterStatus=true,reserved=true,permission='reserved';
let providerCalls=0,meterCalls=0,rows=[],requests=[];
const savedFetch=globalThis.fetch;
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opts={})=>{
 const u=String(url);requests.push({u,opts});
 if(u.endsWith('/auth/v1/user'))return json({id:uid,user_metadata:{market_tutor_ai_enabled:true}});
 if(u.includes('/profiles?'))return json([{account_kind:kind}]);
 if(u.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(u.includes('/admin_user_roles?'))return json([]);
 if(u.includes('/rpc/user_has_tool_access'))return json(allow);
 if(u.includes('/gu_ai_service_requests_v014103?')){
  return meterStatus?new Response(JSON.stringify(rows),{status:200,headers:{'content-type':'application/json','content-range':'0-0/0'}}):json({error:'missing table'},404);
 }
 if(u.includes('/rpc/gu_v014103_reserve_ai_request')){
  meterCalls++;
  return meterStatus?json({accepted:reserved,reason:permission,remainingMemberToday:2}):json({error:'not installed'},404);
 }
 if(u==='https://api.openai.com/v1/responses'){
  providerCalls++;
  return json({output:[{content:[{type:'output_text',
   text:'VWAP is weighted average price context and is not a complete entry trigger [1]. A separate risk and invalidation plan remains essential.'}]}]});
 }
 throw Error('Unexpected network call: '+u);
};
const auth={authorization:'Bearer member-test'};
const request=(allowModel,requestIdOverride=requestId)=>new Request('https://example.org/api/market-tutor-v01492',{
 method:'POST',headers:{...auth,'content-type':'application/json'},
 body:JSON.stringify({question:'Explain VWAP context',mode:'review',learnerAnswer:'I noticed a level but my evidence is uncertain.',
  allowModel,requestId:requestIdOverride})
});
const statusReq=()=>new Request('https://example.org/api/member-ai-service-v014103',{headers:auth});
try{
 assert.equal(aiServiceConfig({...env,AI_SERVICE_GLOBAL_DAILY_LIMIT:undefined}).enabled,false,'No default surprise provider spend');
 assert.equal(aiServiceConfig({...env,AI_SERVICE_ENABLED:'false'}).enabled,false);
 assert.equal(aiServiceConfig({...env,AI_SERVICE_MEMBER_DAILY_LIMIT:'10000'}).enabled,false);
 let result=await tutor({request:request(false),env});let body=await result.json();
 assert.equal(result.status,200);assert.equal(body.generation,'reviewed-glossary-logic');
 assert(body.answer.includes('Reflection-writing check'));assert.equal(providerCalls,0);assert.equal(meterCalls,0);
 result=await status({request:statusReq(),env});body=await result.json();
 assert.equal(body.ok,true);assert.equal(body.enabled,true);
 assert.equal(body.memberDailyLimit,3);assert.equal(body.remainingToday,3);
 assert(!JSON.stringify(body).includes('test-model')&&!JSON.stringify(body).includes('mock-provider'));
 assert(requests.some(x=>x.u.includes('user_id=eq.'+uid)),'Member status must query only their ledger');
 result=await tutor({request:request(true),env});body=await result.json();
 assert.equal(result.status,200);assert.equal(body.generation,'grounded-model-draft');
 assert.equal(body.remainingAiToday,2);
 assert.equal(providerCalls,1);assert.equal(meterCalls,1);
 assert(requests.find(x=>x.u.includes('/rpc/gu_v014103_reserve_ai_request')).opts.headers.apikey===env.SUPABASE_SECRET_KEY);
 assert(requests.filter(x=>x.u.includes('/rpc/gu_v014103_reserve_ai_request')).every(x=>!x.opts.headers.authorization),'Modern service key must not be bearer');
 assert(!requests.some(x=>x.u.includes('journal?')||x.u.includes('answer_key')),'Never fetch private answers or raw journal for model input');
 const inferenceRequest=requests.find(x=>x.u==='https://api.openai.com/v1/responses');
 assert.equal(JSON.parse(inferenceRequest.opts.body).store,false);
 assert(!inferenceRequest.opts.body.includes(uid),'Member identifier must never enter model input');
 reserved=false;permission='member_daily_limit';
 result=await tutor({request:request(true,'dddddddd-dddd-4ddd-8ddd-dddddddddddd'),env});body=await result.json();
 assert.equal(body.generation,'reviewed-glossary-logic');
 assert.equal(body.aiReason,'daily_limit_reached');assert.equal(providerCalls,1);
 permission='global_monthly_limit';
 result=await tutor({request:request(true,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),env});body=await result.json();
 assert.equal(body.aiReason,'service_capacity_reached');assert.equal(providerCalls,1);
 permission='duplicate_request';
 result=await tutor({request:request(true),env});body=await result.json();
 assert.equal(body.aiReason,'duplicate_request');assert.equal(providerCalls,1);
 meterStatus=false;reserved=true;
 result=await tutor({request:request(true),env});body=await result.json();
 assert.equal(body.generation,'reviewed-glossary-logic');assert.equal(providerCalls,1);
 result=await status({request:statusReq(),env});body=await result.json();
 assert.equal(body.enabled,false);assert.equal(body.state,'meter_unavailable');
 kind='showcase';result=await status({request:statusReq(),env});body=await result.json();
 assert.equal(body.authorized,false);
 kind='member';allow=false;result=await tutor({request:request(true),env});assert.equal(result.status,403);
 assert.equal(providerCalls,1);
 const sql=readFileSync(new URL('../supabase/migrations/v0.14.0.103_FIRST_PARTY_AI_BUDGET_OWNER_REVIEW_REQUIRED.sql',import.meta.url),'utf8');
 for(const token of ['ENABLE ROW LEVEL SECURITY','REVOKE ALL','pg_advisory_xact_lock','duplicate_request',
 'member_daily_limit','global_daily_limit','global_monthly_limit','service_role','request_id uuid NOT NULL UNIQUE']){
  assert(sql.includes(token),'Private AI budget invariant missing: '+token);
 }
 const ui=readFileSync(new URL('../assets/js/market-tutor.js',import.meta.url),'utf8');
 assert(ui.includes("allowModel:$('tutor-ai-consent')?.checked===true"),
  'Paid AI calls require an explicitly enabled member preference on each request');
 assert(ui.includes("Keep the member's Profile preference after each Tutor request."),
  'Preserve the Owner-approved persistent Tutor preference instead of clearing it after each answer');
 assert(!ui.includes("if($('tutor-ai-consent'))$('tutor-ai-consent').checked=false"),
  'Do not erase the member-selected profile preference between questions');
 assert(!ui.includes('priorTurns:TUTOR.entries.filter'), 'Forged client Tutor turns must not be forwarded');
 assert(!sql.includes('UPDATE public.competency'),'AI quota must not award official skills');
 assert(!sql.includes('INSERT INTO public.gu_member_tutor_exchanges'),'Do not duplicate installed v102 private history');
 console.log('PASS v103: paid first-party AI request metering, member entitlement, source-only fallback, per-user/site caps, disabled/provider/missing schema, isolated member status and no leakage.');
}finally{globalThis.fetch=savedFetch}
