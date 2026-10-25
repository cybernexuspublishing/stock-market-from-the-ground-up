import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/admin-founder-commons-v014179.js';

const origin='https://my.example';
const env={SUPABASE_URL:'https://aaaaabbbbbccccddddd.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pub_test_only',SUPABASE_SECRET_KEY:'srv_test_only'};
const request=(method='GET',token='member_token')=>new Request(origin+'/api/admin-founder-commons-v014179',{
 method,headers:{authorization:'Bearer '+token,origin}
});
function mockApi({role='MEMBER',kind='member',deleted=false,showcase=false}={}){
 const calls=[];const original=globalThis.fetch;
 globalThis.fetch=async(url,options={})=>{
  const u=new URL(String(url));calls.push({path:u.pathname,method:options.method||'GET'});
  const ok=value=>new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});
  if(u.pathname==='/auth/v1/user')return ok({id:'11111111-1111-4111-8111-111111110001'});
  if(u.pathname==='/rest/v1/admin_user_roles')return ok([{role_code:role,expires_at:null},...(showcase?[{role_code:'SHOWCASE_VIEWER',expires_at:null}]:[])]);
  if(u.pathname==='/rest/v1/profiles')return ok([{account_kind:kind,deleted_at:deleted?'2026-01-01T00:00:00Z':null}]);
  if(u.pathname==='/rest/v1/admin_user_flags')return ok([]);
  if(u.pathname.startsWith('/rest/v1/'))return ok([]);
  return new Response('not found',{status:404});
 };
 return {calls,restore:()=>{globalThis.fetch=original}};
}
test('anonymous admin request never touches backend',async()=>{
 const x=mockApi();
 try{
  const res=await onRequest({request:new Request(origin+'/api/admin-founder-commons-v014179'),env});
  assert.equal(res.status,401);
  assert.deepEqual(x.calls,[]);
 }finally{x.restore()}
});
test('ordinary member cannot read Founder Owner admin',async()=>{
 const x=mockApi({role:'MEMBER'});
 try{const res=await onRequest({request:request(),env});assert.equal(res.status,403);assert.equal(x.calls.some(y=>y.method==='POST'||y.method==='PATCH'),false)}
 finally{x.restore()}
});
test('Showcase identity cannot get Owner rights even if an Owner role also exists',async()=>{
 const x=mockApi({role:'OWNER',showcase:true});
 try{const res=await onRequest({request:request(),env});assert.equal(res.status,403)}
 finally{x.restore()}
});
test('Owner account that is deleted cannot access admin',async()=>{
 const x=mockApi({role:'OWNER',deleted:true});
 try{const res=await onRequest({request:request(),env});assert.equal(res.status,403)}
 finally{x.restore()}
});
test('active Owner can read but not mutate ordinary source lists',async()=>{
 const x=mockApi({role:'OWNER'});
 try{const res=await onRequest({request:request(),env});const data=await res.json();assert.equal(res.status,200);assert.equal(data.ok,true);assert.ok(Array.isArray(data.issues));assert.ok(Array.isArray(data.targetedNotices));assert.ok(Array.isArray(data.founderCertificates));assert.equal(x.calls.some(y=>y.method!=='GET'),false)}
 finally{x.restore()}
});
