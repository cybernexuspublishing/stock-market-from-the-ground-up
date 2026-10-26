// B01 release contract: protected version-pinned grading must never make drafts
// available because an unfinished attempt has survived a review withdrawal.
// All external Supabase operations are local fixtures. NO production records.
// This verifies server routing, not real paid-member completion or editorial review.
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/interactive-training.js';
const ids=["F1-C02-L01","F1-C02-L02","F1-C04-L01","F1-C06-L01","F1-C07-L01","F1-C07-L02","F1-C08-L01","F1-C08-L02","F1-C08-L03","F1-C09-L01","F1-C10-L01","F1-C10-L02","F1-C12-L01","F1-C13-L01","F1-C13-L02","F2-C01-L01","F2-C02-L01","F2-C02-L02","F2-C02-L03","F2-C03-L01"];
assert.equal(ids.length,20);
assert.equal(new Set(ids).size,20);
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const attempt='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const env={SUPABASE_URL:'https://fixture.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fake',
 SUPABASE_SECRET_KEY:'sb_secret_fake'};
let id=ids[0],memberBook='FOUNDATION_BOOK_1',mode='draft',rpcStart=0,
 leakableQuestions=0,queryCount=0;
const originalFetch=globalThis.fetch;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const get=(action,extra='')=>new Request('https://fixture.test/api/interactive-training?action='+action+extra,
 {headers:{authorization:'Bearer fixture-member'}});
const post=(action,body)=>new Request('https://fixture.test/api/interactive-training?action='+action,{
 method:'POST',headers:{authorization:'Bearer fixture-member',origin:'https://fixture.test','content-type':'application/json'},body:JSON.stringify(body)});
const privateQuestion={id:'PRIVATE_EXAM_Q',kind:'choice',
 prompt:'SECRET QUESTION THAT MUST NEVER BE DELIVERED FOR A WITHDRAWN REVIEW',
 options:['not yet reviewed','incorrect']};
globalThis.fetch=async(url,options={})=>{
 const u=new URL(String(url));const p=u.pathname;
 if(p==='/auth/v1/user')return json({id:actor});
 if(p==='/rest/v1/profiles')return json([{account_kind:'member'}]);
 if(p==='/rest/v1/admin_user_flags')return json([{status:'active'}]);
 if(p==='/rest/v1/rpc/user_has_tool_access')return json(true);
 if(p==='/rest/v1/platform_labs')return json([{lab_id:id,book_code:memberBook,active:true,registry_visible:true}]);
 if(p==='/rest/v1/lab_instruction_v014')return json([{book_number:memberBook==='FOUNDATION_BOOK_1'?1:2}]);
 if(p==='/rest/v1/user_library')
  return json(u.searchParams.get('product_code')==='eq.'+memberBook?[{product_code:memberBook,expires_at:null}]:[]);
 if(p==='/rest/v1/book_key_redemptions'||p==='/rest/v1/user_plan_grants'||p==='/rest/v1/site_subscriptions'||p==='/rest/v1/admin_user_roles')return json([]);
 if(p==='/rest/v1/lab_training_attempts_v014')
  return json([{id:attempt,user_id:actor,lab_id:id,set_version:97,mode:'guided',
   step_index:0,completed_at:null,report:null}]);
 if(p==='/rest/v1/lab_training_sets_v014'){
  queryCount++;
  if(u.searchParams.get('review_state')==='eq.reviewed'){
   if(mode==='draft')return json([]);
   return json([{lab_id:id,version:98,review_state:'reviewed',questions:[privateQuestion]}]);
  }
  // Pinned version 97 is withdrawn, even though 98 may now be reviewed.
  return json([{lab_id:id,version:97,review_state:mode==='reviewed'?'reviewed':'draft',
   source_status:'original_hypothetical_b01_individual_review_pending_v01497',
   questions:[privateQuestion]}]);
 }
 if(p==='/rest/v1/rpc/v014_training_start'){
  rpcStart++;
  return json({id:attempt,lab_id:id,set_version:97,step_index:0,mode:'guided',
   completed_at:null,resumed:true});
 }
 throw new Error('Unexpected network fixture '+p);
};
try{
 for(const lab of ids){
  id=lab;memberBook=id.startsWith('F1-')?'FOUNDATION_BOOK_1':'FOUNDATION_BOOK_2';
  mode='draft';
  let r=await onRequest({request:get('available','&labId='+id),env});
  let out=await r.json();
  assert.equal(r.status,200,id+' availability');
  assert.equal(out.available,false,id+' draft not publishable');
  r=await onRequest({request:post('start',{labId:id,mode:'guided'}),env});
  out=await r.json();
  assert.equal(r.status,404,id+' draft cannot start');
  assert(!JSON.stringify(out).includes('SECRET QUESTION'),id+' answer text protected');
  r=await onRequest({request:get('resume','&id='+attempt),env});
  out=await r.json();
  assert.equal(r.status,409,id+' withdrawn pinned rubric cannot resume');
  assert(!JSON.stringify(out).includes('SECRET QUESTION'),id+' withdrawn question must stay private');
 }
 assert.equal(rpcStart,0,'No draft may create a graded attempt');
 mode='withdrawn';id=ids[1];memberBook='FOUNDATION_BOOK_1';
 let r=await onRequest({request:post('start',{labId:id,mode:'guided'}),env});
 assert.equal(r.status,409,'A formerly reviewed, now withdrawn pinned set must not be delivered');
 let body=await r.json();
 assert(!JSON.stringify(body).includes('SECRET QUESTION'));
 assert.equal(rpcStart,1,'The existing start RPC was used, not bypassed');
 mode='reviewed';
 r=await onRequest({request:get('resume','&id='+attempt),env});
 body=await r.json();
 assert.equal(r.status,200,'An actual reviewed pinned version may be resumed');
 assert.equal(body.question.id,'PRIVATE_EXAM_Q');
 assert(!JSON.stringify(body).includes('answer_key'),'Live question must never include protected keys');
 assert(queryCount>=ids.length*3,'All IDs must be evaluated through private API path');
 console.log('PASS B01: 20 draft availability/start/resume gates; withdrawn pinned review denied; reviewed pinned resume preserved; no answer key leaks.');
}finally{globalThis.fetch=originalFetch}
