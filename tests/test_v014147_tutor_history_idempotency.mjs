import assert from 'node:assert/strict';
import {saveVerifiedTutorExchange} from '../functions/_lib/tutor-history-save-v014107.js';
import {onRequest as history} from '../functions/api/member-tutor-history-v014102.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',requestId='cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 savedId='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const old=globalThis.fetch;let saved=null,postCount=0,storageFault=false,own=true;
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opts={})=>{
 const u=String(url);
 if(u.includes('rpc/gu_v014102_save_member_tutor_exchange')){
  postCount++;const b=JSON.parse(opts.body);
  assert.equal(b.p_request_id,requestId);
  if(!saved)saved={question:b.p_question,learner_answer:b.p_learner_answer,
   mode:b.p_mode,answer:b.p_answer,generation:b.p_generation};
  return json(savedId);
 }
 if(u.includes('gu_member_tutor_exchanges_v014102?')){
  if(opts.method==='PATCH')return json([{}]);
  if(opts.method==='DELETE')return new Response(null,{status:204});
  if(storageFault)return json({code:'PGRST301'},403);
  if(u.includes('select=question,learner_answer,mode,answer,generation')){
   assert(u.includes('user_id=eq.'+uid));return json([saved]);
  }
  if(u.includes('feedback,feedback_note,feedback_at'))return json({code:'42703'},400);
  return json([saved]);
 }
 if(u.endsWith('/auth/v1/user'))return json({id:uid});
 if(u.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(u.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(u.includes('/admin_user_roles?'))return json([]);
 if(u.includes('/rpc/user_has_tool_access'))return json(own);
 throw Error('Unexpected mock '+u);
};
const record={requestId,question:'Explain VWAP mechanics',learnerAnswer:'',
 mode:'explain',answer:'A verified copy of this educational response [1].',
 generation:'reviewed-glossary-logic',sources:[]};
const req=(method,headers={})=>new Request('https://school.test/api/member-tutor-history-v014102',
 {method,headers:{authorization:'Bearer x','content-type':'application/json',...headers},
 ...(method==='PATCH'?{body:JSON.stringify({id:savedId,feedback:'report',note:'Please review explanation'})}:{})});
try{
 let id=await saveVerifiedTutorExchange(env,uid,record);
 assert.equal(id,savedId);
 id=await saveVerifiedTutorExchange(env,uid,record);
 assert.equal(id,savedId,'Idempotent same request may reference the actual saved copy');
 id=await saveVerifiedTutorExchange(env,uid,{...record,answer:'Different content with same request ID'});
 assert.equal(id,null,'Never label a different response saved using a reused UUID');
 assert.equal(postCount,3);
 let r=await history({env,request:req('GET')});
 assert.equal(r.status,200,'Fallback to old history schema only after confirmed missing v107 column');
 storageFault=true;r=await history({env,request:req('GET')});
 assert.equal(r.status,503,'RLS/network failures must not be silently treated as missing optional column');
 storageFault=false;r=await history({env,request:req('DELETE',{origin:'https://evil.test'})});assert.equal(r.status,403);
 r=await history({env,request:req('PATCH',{'sec-fetch-site':'cross-site'})});assert.equal(r.status,403);
 own=false;r=await history({env,request:req('GET')});assert.equal(r.status,403);
 console.log('PASS D07: verified idempotent server-side Tutor history, no wrong-answer save acknowledgement, scoped legacy fallback and history mutation CSRF denial.');
}finally{globalThis.fetch=old}
