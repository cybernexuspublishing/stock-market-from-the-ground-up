/* Lantern Sparks owner-only API contract: no Supabase connection, money movement,
 * or production billing events. Node mock captures all outbound requests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../functions/api/admin-lantern-sparks.js',import.meta.url),'utf8')
 .replace("import {memberIdentity} from './member-tool-access.js';",
  'const memberIdentity=globalThis.__sparkTestIdentity;');
const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const owner='22222222-2222-4222-8222-222222222222';
const member='33333333-3333-4333-8333-333333333333';
const requestId='44444444-4444-4444-8444-444444444444';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test'};
const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
test('Lantern Sparks protected account editor forbids non-Owner writes and audits valid adjustments',async()=>{
 const oldFetch=globalThis.fetch,oldIdentity=globalThis.__sparkTestIdentity;
 let actorRole='OWNER',memberType='member',writes=[],ownerRestricted=false;
 globalThis.__sparkTestIdentity=async()=>({userId:owner});
 globalThis.fetch=async(url,options={})=>{
  const u=String(url),body=options.body?JSON.parse(options.body):null;
  if(u.includes('/profiles?')){
   if(u.includes(owner))return response([{id:owner,account_kind:'member'}]);
   return response([{id:member,account_kind:memberType,username:'Reader'}]);
  }
  if(u.includes('/admin_user_roles?')){
   if(u.includes(owner))return response([{role_code:actorRole,expires_at:null}]);
   return response([]);
  }
  if(u.includes('/admin_user_flags?'))return response(ownerRestricted?[{status:'restricted'}]:[]);
  if(u.includes('/rpc/groundup_question_pass_summary'))
   return response({included:2,purchased:0,manual:1,available:3,nextExpiry:null});
  if(u.includes('/groundup_question_pass_adjustments?'))return response([]);
  if(u.includes('/rpc/groundup_question_pass_adjust')){
   writes.push(body);
   return response({ok:true,delta:2,balance:{included:2,purchased:0,manual:3,available:5}});
  }
  throw Error('Unexpected backend route '+u);
 };
 try{
  const make=(method,body)=>new Request('https://example.pages.dev/api/admin-lantern-sparks'+
   (method==='GET'?'?userId='+member:''),{
    method,headers:{authorization:'Bearer owner',...(body?{'content-type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})
   });
  const data={userId:member,operation:'add',value:2,reason:'Correction approved for customer support',requestId};
  let res=await api.onRequest({request:make('GET'),env});
  assert.equal(res.status,200);assert.equal((await res.json()).balance.available,3);
  actorRole='ADMIN';
  res=await api.onRequest({request:make('POST',data),env});
  assert.equal(res.status,403,'Administrators cannot adjust credits without OWNER');
  assert.equal(writes.length,0);
  actorRole='OWNER';memberType='showcase';
  res=await api.onRequest({request:make('POST',data),env});
  assert.equal(res.status,403,'Showcase accounts cannot acquire real Sparks');
  memberType='member';ownerRestricted=true;
  res=await api.onRequest({request:make('POST',data),env});
  assert.equal(res.status,403,'Restricted Owner cannot make credit changes');
  ownerRestricted=false;
  for(const invalid of [{...data,value:-1},{...data,value:1.5},{...data,reason:'short'},
   {...data,requestId:'invalid'},{...data,userId:owner}]){
   res=await api.onRequest({request:make('POST',invalid),env});
   assert.notEqual(res.status,200);
  }
  assert.equal(writes.length,0,'Invalid requests cannot mutate the ledger');
  res=await api.onRequest({request:make('POST',data),env});
  assert.equal(res.status,200,await res.text());
  assert.equal(writes.length,1);
  assert.deepEqual(writes[0],{p_actor_id:owner,p_user_id:member,p_operation:'add',
   p_value:2,p_reason:data.reason,p_request_id:requestId});
 }finally{
  globalThis.fetch=oldFetch;globalThis.__sparkTestIdentity=oldIdentity;
 }
});
test('Lantern Sparks migration uses owner audit and unique, serialized balance changes',()=>{
 const v163=readFileSync(new URL('../supabase/migrations/v0.14.0.163_QUESTION_PASS_LEDGER_OWNER_REVIEW_REQUIRED.sql',import.meta.url),'utf8');
 const v164=readFileSync(new URL('../supabase/migrations/v0.14.0.164_LANTERN_SPARKS_ADMIN_REVIEW_REQUIRED.sql',import.meta.url),'utf8');
 for(const source of [v163,v164]){
  assert.match(source,/pg_advisory_xact_lock/);
  assert.match(source,/security definer/);
  assert.match(source,/revoke all on function/);
 }
 assert.match(v163,/groundup_qp_once_per_request/);
 assert.match(v163,/groundup_qp_once_per_question/);
 assert.match(v164,/unique\(actor_user_id,request_id\)/);
 assert.match(v164,/admin_audit_log/);
 assert.match(v164,/source in \('included','purchased','manual'\)/);
 assert.match(v164,/interval '60 days'/);
});
