import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../functions/api/admin-lantern-sparks.js',import.meta.url),'utf8')
 .replace("import {memberIdentity} from './member-tool-access.js';",
  'const memberIdentity=(...args)=>globalThis.__qaIdentity(...args);');
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const owner='22222222-2222-4222-8222-222222222222',
 member='33333333-3333-4333-8333-333333333333',
 nonce='88888888-8888-4888-8888-888888888888';
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
test('Only verified OWNER may credit own wallet, never remove/set, cross-credit or charge a provider',async()=>{
 const oldFetch=globalThis.fetch,oldIdentity=globalThis.__qaIdentity;
 let role='OWNER',restricted=false,posted=[],otherRpcCalls=0,profileKind='member';
 globalThis.__qaIdentity=async()=>({userId:owner});
 globalThis.fetch=async(url,opts={})=>{
  const u=String(url),body=opts.body?JSON.parse(opts.body):undefined;
  if(u.includes('/profiles?'))return json([{account_kind:profileKind,id:owner}]);
  if(u.includes('/admin_user_roles?'))return json([{role_code:role,expires_at:null}]);
  if(u.includes('/admin_user_flags?'))return json(restricted?[{status:'restricted'}]:[]);
  if(u.includes('/rpc/groundup_question_pass_summary'))return json({included:0,purchased:0,manual:0,available:0,nextExpiry:null});
  if(u.includes('/groundup_question_pass_adjustments?'))return json([]);
  if(u.includes('/rpc/groundup_owner_self_sparks_add')){
   posted.push(body);
   return json({ok:true,alreadyApplied:posted.length>1,delta:posted.length>1?0:20,
    balance:{included:0,purchased:0,manual:20,available:20,nextExpiry:null}});
  }
  if(u.includes('/rpc/groundup_question_pass_adjust')){otherRpcCalls++;return json({ok:false})}
  throw Error('Unexpected protected request '+u);
 };
 const req=(method,body,self=false)=>new Request('https://site.example/api/admin-lantern-sparks'+
  (self&&method==='GET'?'?self=1':''),{method,
  headers:{authorization:'Bearer synthetic-owner',...(body?{'content-type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})});
 const data={self:true,operation:'add',value:20,reason:'Owner-admin noncommercial self-credit for QA',requestId:nonce};
 try{
  let res=await onRequest({env,request:req('GET',null,true)});
  assert.equal(res.status,200);
  assert.equal((await res.json()).balance.available,0);
  for(const bad of [
   {...data,value:0},{...data,value:10001},{...data,value:1.1},
   {...data,operation:'set'},{...data,operation:'remove'},
   {...data,requestId:'not-a-uuid'},{...data,reason:'short'},
   {...data,userId:member}
  ]){
   res=await onRequest({env,request:req('POST',bad)});
   assert.notEqual(res.status,200,JSON.stringify(bad));
  }
  assert.equal(posted.length,0,'Malformed requests cannot reach credit RPC');
  role='ADMIN';
  res=await onRequest({env,request:req('POST',data)});
  assert.equal(res.status,403,'Admin without OWNER cannot self-credit');
  role='OWNER';restricted=true;
  res=await onRequest({env,request:req('POST',data)});
  assert.equal(res.status,403,'Restricted OWNER cannot self-credit');
  restricted=false;profileKind='showcase';
  res=await onRequest({env,request:req('POST',data)});
  assert.equal(res.status,403,'Showcase accounts cannot self-credit');
  profileKind='member';
  res=await onRequest({env,request:req('POST',data)});
  assert.equal(res.status,200);assert.equal((await res.json()).balance.available,20);
  res=await onRequest({env,request:req('POST',data)});
  assert.equal(res.status,200);
  assert.equal(posted.length,2);
  assert.deepEqual(posted[0],{p_actor_id:owner,p_value:20,
   p_reason:data.reason,p_request_id:nonce});
  assert.equal(otherRpcCalls,0,'Self pathway must never call ordinary member adjustments');
  assert.equal(posted[1].p_request_id,nonce,'Retries reuse request ID');
  console.log('PASS Owner API: self only, role/flag/amount validation, correct RPC, request idempotency');
 }finally{globalThis.fetch=oldFetch;globalThis.__qaIdentity=oldIdentity}
});
test('Self-service RPC is service-role only and writes manual buckets + adjustment + audit',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261028_owner_self_sparks_credit_v1.sql',import.meta.url),'utf8');
 for(const clause of ['pg_advisory_xact_lock','groundup_question_pass_adjustments',
  'admin_audit_log','source,origin_key',"role_code='OWNER'",
  'request_id=p_request_id','expires_at','revoke all on function','to service_role']){
  assert.match(sql,new RegExp(clause,'i'));
 }
});
