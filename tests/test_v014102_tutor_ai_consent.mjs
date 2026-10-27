// Optional generative AI is OFF per request unless the member explicitly opts in.
// This test is entirely mocked and cannot spend money.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/market-tutor-v01492.js';
import {ungradedResponseReview} from '../functions/_lib/tutor-response-scaffold-v014102.js';
const env={SUPABASE_URL:'https://mock.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 SUPABASE_SECRET_KEY:'sb_secret_mock',
 AI_SERVICE_ENABLED:'true',AI_SERVICE_MEMBER_DAILY_LIMIT:'5',AI_SERVICE_GLOBAL_DAILY_LIMIT:'10',AI_SERVICE_GLOBAL_MONTHLY_LIMIT:'30',AI_TUTOR_API_KEY:'fake-do-not-use',AI_TUTOR_MODEL:'mock-model',
 AI_PAID_PROVIDER_OWNER_APPROVED:'true',AI_TUTOR_APPROVED_MODELS:'mock-model'};
let quotaCalls=0,modelCalls=0,prompt='',profileOptIn=false;
const original=globalThis.fetch,json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opts={})=>{
 const u=String(url);
 if(u.endsWith('/auth/v1/user'))return json({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',user_metadata:{market_tutor_ai_enabled:profileOptIn}});
 if(u.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(u.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(u.includes('/admin_user_roles?'))return json([]);
 if(u.includes('/rpc/user_has_tool_access'))return json(true);
 if(u.includes('/rpc/gu_v014103_reserve_ai_request')){quotaCalls++;return json({accepted:true,reason:'reserved',remainingMemberToday:4})}
 if(u==='https://api.openai.com/v1/responses'){
  modelCalls++;prompt=String(opts.body||'');
  return json({output:[{content:[{type:'output_text',
   text:'VWAP represents volume-weighted location, not a stand-alone signal. [1] Compare the available price action and invalidate the conclusion if context changes.'}]}]});
 }
 throw Error('Unexpected mock '+u);
};
async function ask(allowModel){
 const response=await onRequest({env,request:new Request('https://example.test/api/market-tutor-v01492',{
  method:'POST',headers:{authorization:'Bearer valid','content-type':'application/json'},
  body:JSON.stringify({question:'Explain VWAP in context',mode:'explain',allowModel,requestId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'})})});
 return {status:response.status,body:await response.json()};
}
try{
 const written=ungradedResponseReview('The observed candle and volume are uncertain; I will use a stop if invalidation appears.');
 assert(written.includes('specific visible evidence')&&written.includes('remaining uncertainty'));
 assert(written.includes('invalidation or risk boundary'));
 const incomplete=ungradedResponseReview('I think this looks promising.');
 assert(incomplete.includes('Consider adding:'));
 assert(!/\bscored 100\b/i.test(incomplete));
 let r=await ask(undefined);
 assert.equal(r.status,200);assert.equal(r.body.generation,'reviewed-glossary-logic');
 assert.equal(quotaCalls,0);assert.equal(modelCalls,0,'No model/fee without positive opt-in');
 r=await ask(false);assert.equal(quotaCalls,0);assert.equal(modelCalls,0);
 r=await ask(true);
 assert.equal(r.status,200);assert.equal(r.body.aiReason,'profile_ai_opt_in_required');
 assert.equal(quotaCalls,0);assert.equal(modelCalls,0,'Client-supplied true cannot bypass saved opt-out');
 profileOptIn=true;
 r=await ask(true);
 assert.equal(r.status,200);assert.equal(r.body.generation,'grounded-model-draft');
 assert.equal(quotaCalls,1);assert.equal(modelCalls,1);assert(prompt.includes('"store":false'));
 const html=readFileSync(new URL('../market-tutor.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../assets/js/market-tutor.js',import.meta.url),'utf8');
 assert(html.includes('id="tutor-ai-consent"'));
 assert(js.includes("allowModel:$('tutor-ai-consent')?.checked===true"));
 console.log('PASS v103: opt-in required before atomic first-party request quota and provider call; deterministic teaching otherwise.');
}finally{globalThis.fetch=original}
