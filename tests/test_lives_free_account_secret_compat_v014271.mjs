import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/account.js';

const url='https://oxihglyfgzywsupnyicb.supabase.co';
const common={
 SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_ci_test',
 SUPABASE_SECRET_KEY:'sb_secret_ci_test',ENFORCE_AUTH_TURNSTILE_V135:'false'
};
const data={firstName:'Fictional',lastName:'Learner',dateOfBirth:'01/01/2000',
 username:'BetaLearner',email:'learner@testing.invalid',password:'SecureBETA!1234',
 confirmPassword:'SecureBETA!1234',termsAccepted:true};
test('signup uses modern sb_secret_ only as apikey and preserves all profile+age writes',async()=>{
 const saved=globalThis.fetch,logs=[];
 globalThis.fetch=async(address,opt={})=>{
   const u=new URL(address);logs.push({path:u.pathname,options:opt});
   if(u.pathname.includes('/rest/v1/')&&opt.headers.apikey===common.SUPABASE_SECRET_KEY){
    assert.equal(opt.headers.authorization,undefined,'Modern sb_secret_ must NOT be a legacy Bearer token');
   }
   const body=u.pathname.endsWith('/rpc/username_is_available')?'true':
    u.pathname==='/rest/v1/site_feature_controls'?'[{"enabled":true}]':
    u.pathname==='/auth/v1/signup'?JSON.stringify({user:{id:'11111111-1111-4111-8111-111111110271'}}):
    '{}';
   return new Response(body,{status:200,headers:{'content-type':'application/json'}});
 };
 try{
  const r=await onRequest({request:new Request('https://site.example/api/account?action=signup',
   {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}),env:common});
  assert.equal(r.status,200);
  const x=await r.json();assert.equal(x.ok,true);
  assert.deepEqual(logs.map(x=>x.path),[
   '/rest/v1/rpc/username_is_available','/rest/v1/site_feature_controls',
   '/auth/v1/signup','/rest/v1/profiles','/rest/v1/account_private_identity']);
  assert.equal(logs[2].options.headers.apikey,common.SUPABASE_PUBLISHABLE_KEY);
  assert.equal(logs[3].options.headers.authorization,undefined);
  assert.equal(logs[4].options.headers.authorization,undefined);
  const profile=JSON.parse(logs[3].options.body);
  assert.equal(profile.account_kind,'member');
  const identity=JSON.parse(logs[4].options.body);
  assert.equal(identity.age_eligible,true);
  assert.equal(identity.date_of_birth,'2000-01-01');
 }finally{globalThis.fetch=saved}
});
test('missing backend service key fails closed before any account creation network call',async()=>{
 const saved=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('No network authorized')};
 try{
  const r=await onRequest({request:new Request('https://site.example/api/account?action=signup',
   {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}),env:{...common,SUPABASE_SECRET_KEY:''}});
  assert.equal(r.status,503);assert.equal(calls,0);
  const x=await r.json();assert.equal(x.ok,false);
 }finally{globalThis.fetch=saved}
});
test('legacy JWT service credentials retain supported Bearer authentication',async()=>{
 const legacy='eyJheader.eyJpayload.signature',saved=globalThis.fetch;let found=false;
 globalThis.fetch=async(address,opt={})=>{
  if(String(address).includes('/rest/v1/rpc/username_is_available')){
   found=true;assert.equal(opt.headers.apikey,legacy);
   assert.equal(opt.headers.authorization,'Bearer '+legacy);
  }
  const p=new URL(address).pathname;
  return new Response(p.endsWith('/rpc/username_is_available')?'true':p==='/rest/v1/site_feature_controls'?'[{"enabled":true}]':p==='/auth/v1/signup'?'{"user":{"id":"11111111-1111-4111-8111-111111110271"}}':'{}',{status:200,headers:{'content-type':'application/json'}});
 };
 try{
  const r=await onRequest({request:new Request('https://site.example/api/account?action=signup',
  {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}),env:{...common,SUPABASE_SECRET_KEY:legacy}});
  assert.equal(r.status,200);assert.equal(found,true);
 }finally{globalThis.fetch=saved}
});
