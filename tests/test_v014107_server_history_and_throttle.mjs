// v0.14.0.107: server-attested Tutor responses, free-tier throttle and privacy.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/market-tutor-v01492.js';
import {onRequest as history} from '../functions/api/member-tutor-history-v014102.js';
import {tutorRequestLimit} from '../functions/_lib/tutor-rate-limit-v014107.js';
import {saveVerifiedTutorExchange} from '../functions/_lib/tutor-history-save-v014107.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',requests=[],previous=globalThis.fetch;
let rate='allowed',entitled=true,saves=0,persisted=null;
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock'};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opts={})=>{
 const u=String(url);requests.push({u,opts});
 if(u.endsWith('/auth/v1/user'))return json({id:uid});
 if(u.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(u.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(u.includes('/admin_user_roles?'))return json([]);
 if(u.includes('/rpc/user_has_tool_access'))return json(entitled);
 if(u.includes('/rpc/gu_v014107_take_tutor_request'))
  return json({accepted:rate==='allowed',reason:rate});
 if(u.includes('/rpc/gu_v014102_save_member_tutor_exchange')){
  saves++;const p=JSON.parse(opts.body);
  persisted={question:p.p_question,learner_answer:p.p_learner_answer,
   mode:p.p_mode,answer:p.p_answer,generation:p.p_generation};
  return json(id);
 }
 if(u.includes('/gu_member_tutor_exchanges_v014102?')){
  assert(u.includes('user_id=eq.'+uid));
  assert(u.includes('id=eq.'+id));
  return json(persisted?[persisted]:[]);
 }
 throw Error('Unexpected backend '+u);
};
async function ask(question,saveHistory){
 const request=new Request('https://site.test/api/market-tutor-v01492',{
  method:'POST',headers:{authorization:'Bearer member','content-type':'application/json'},
  body:JSON.stringify({question,mode:'explain',saveHistory})});
 const response=await onRequest({request,env});
 return {status:response.status,body:await response.json()};
}
try{
 let r=await ask('Explain VWAP in a safe ungraded way',true);
 assert.equal(r.status,200);
 assert.equal(r.body.historySaved,true);
 assert.equal(r.body.historyId,id);
 assert.equal(saves,1);
 assert(requests.some(x=>x.u.includes('gu_member_tutor_exchanges_v014102?')&&
   x.u.includes('user_id=eq.'+uid)),'D07 must read back exact member-saved reply');
 let call=requests.find(x=>x.u.includes('/rpc/gu_v014102_save_member_tutor_exchange'));
 let saved=JSON.parse(call.opts.body);
 assert.equal(saved.p_user_id,uid);
 assert.equal(saved.p_generation,'verified:reviewed-glossary-logic');
 assert(saved.p_answer.includes('VWAP'));
 assert(!('score' in saved)&&!('rubric' in saved));
 assert(!('authorization' in call.opts.headers),'sb_secret must never be sent as fake bearer');
 r=await ask('Explain VWAP in a safe ungraded way',false);
 assert.equal(r.status,200);assert.equal(saves,1);
 rate='minute_limit';
 r=await ask('Explain VWAP in a safe ungraded way',true);
 assert.equal(r.status,429);assert.equal(saves,1);
 rate='daily_limit';r=await ask('Explain VWAP in a safe ungraded way',true);
 assert.equal(r.status,429);
 rate='allowed';entitled=false;
 r=await ask('Explain VWAP in a safe ungraded way',true);
 assert.equal(r.status,403);assert.equal(saves,1);
 entitled=true;
 const fake=new Request('https://site.test/api/member-tutor-history-v014102',{
  method:'POST',headers:{authorization:'Bearer valid','content-type':'application/json'},
  body:JSON.stringify({question:'Explain VWAP',answer:'I just made this up',generation:'grounded-model-draft'})});
 const denied=await history({request:fake,env});
 assert.equal(denied.status,405,'Client cannot forge a model-labelled response');
 const sql=readFileSync(new URL('../supabase/migrations/v0.14.0.107_TUTOR_FEEDBACK_AND_RATE_LIMIT_OWNER_REVIEW_REQUIRED.sql',import.meta.url),'utf8');
 for(const term of ['gu_tutor_rate_bucket_v014107','pg_advisory_xact_lock','m>=8','d>=120',
   'service_role','REVOKE ALL','ON DELETE CASCADE','feedback_note','NOTIFY pgrst']){
  assert(sql.includes(term),'Missing user throttling/privacy boundary: '+term);
 }
 console.log('PASS v107: authentic source server transcript saves, no client-model forgery, optional private feedback, per-member general Tutor request throttling.');
}finally{globalThis.fetch=previous}
