import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const source=readFileSync(new URL('functions/api/admin-accounts-v01353.js',root),'utf8');
const front=readFileSync(new URL('assets/js/admin-operations.js',root),'utf8');
const app=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const origin='https://stock-market-from-the-ground-up.pages.dev';
const admin='11111111-1111-4111-8111-111111111111';
const member='7187dfa0-6c41-454c-8457-f13ba2b373b3';
const env={
 SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 SUPABASE_SECRET_KEY:'sb_secret_mock',
 GU72_QA_ALLOWED_USER_ID:member
};
const init=()=>({qa:true,qaActive:true,manual:false,external:false,paid:false,
 resetRpcError:false,forcePlan:null,roles:[{role_code:'OWNER',expires_at:null}],calls:[]});
let state=init();
const J=(data={},status=200)=>new Response(status===204?null:JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const orig=globalThis.fetch;
globalThis.fetch=async(url,opts={})=>{
 const u=String(url),method=opts.method||'GET',body=opts.body?JSON.parse(opts.body):null;
 state.calls.push({u,method,body});
 if(u.includes('/auth/v1/user'))return J({id:admin,email_confirmed_at:'2026-10-18T00:00:00Z'});
 if(u.includes('/rest/v1/profiles?')){
  return J([{id:u.includes('id=eq.'+admin)?admin:member,username:'QaMember',
   account_kind:'member'}]);
 }
 if(u.includes('/rest/v1/admin_user_roles?'))return J(u.includes('user_id=eq.'+admin)?state.roles:[]);
 if(u.includes('/rest/v1/test_account_profiles?'))return J([]);
 if(u.includes('/rest/v1/platform_plans?'))return J([{plan_code:'FREE'}]);
 if(u.includes('/rest/v1/site_subscriptions?'))return J(state.paid?[{id:8,status:'active'}]:[]);
 if(u.includes('/rest/v1/user_plan_grants?')){
  const active=[
   ...(state.qaActive?[{id:7,source:'stripe_zero_monthly_qa_v72',plan_code:'FULL_MONTHLY',starts_at:'2026-01-01T00:00:00Z',ends_at:'2099-01-01T00:00:00Z',status:'active'}]:[]),
   ...(state.manual?[{id:9,source:'admin',plan_code:'FULL_ANNUAL',status:'active'}]:[]),
   ...(state.external?[{id:11,source:'stripe_live',plan_code:'FULL_MONTHLY',status:'active'}]:[])
  ];
  if(method==='PATCH'){
   assert.match(u,/id=eq.9/,'Only manual grants can be patched directly');
   state.manual=false;return J(null,204);
  }
  return J(active);
 }
 if(u.includes('/rest/v1/rpc/gu76_reset_zero_monthly_qa')){
  assert.equal(method,'POST');assert.equal(body.p_user_id,member);
  if(state.resetRpcError)return J({message:'GU76 not installed'},404);
  state.qaActive=false;return J({ok:true,resetCount:1});
 }
 if(u.includes('/rest/v1/rpc/my_platform_access_for_user')){
  return J({planCode:state.forcePlan||(state.paid||state.qaActive||state.external?'FULL_MONTHLY':state.manual?'FULL_ANNUAL':'FREE')});
 }
 if(u.includes('/rest/v1/admin_audit_log')){
  assert.equal(method,'POST');return J(null,204);
 }
 throw Error('Unexpected '+method+' '+u);
};
const req=(plan='FREE',who=member)=>new Request(origin+'/api/admin-accounts-v01353?action=membership',{
 method:'POST',
 headers:{authorization:'Bearer owner_token','content-type':'application/json'},
 body:JSON.stringify({userId:who,planCode:plan})
});
const calls=match=>state.calls.filter(x=>x.u.includes(match));
try{
 let r=await app.onRequest({request:req(),env}),d=await r.json();
 assert.equal(r.status,200,JSON.stringify(d));
 assert.equal(d.membership.planCode,'FREE');
 assert.equal(d.membership.zeroQaResetCount,1);
 assert.equal(state.qaActive,false);
 assert.equal(calls('gu76_reset_zero_monthly_qa').length,1);
 assert.equal(calls('user_plan_grants?').filter(x=>x.method==='PATCH').length,0);
 assert.equal(calls('/v1/checkout/sessions').length,0);
 state=init();r=await app.onRequest({request:req(),env:{...env,GU72_QA_ALLOWED_USER_ID:admin}});
 d=await r.json();assert.equal(r.status,403);assert.equal(state.qaActive,true);
 assert.equal(calls('gu76_reset_zero_monthly_qa').length,0);
 state=init();state.paid=true;
 r=await app.onRequest({request:req(),env});assert.equal(r.status,409);
 assert.equal(calls('gu76_reset_zero_monthly_qa').length,0);
 state=init();state.external=true;
 r=await app.onRequest({request:req(),env});assert.equal(r.status,409);
 assert.equal(calls('gu76_reset_zero_monthly_qa').length,0);
 state=init();state.resetRpcError=true;
 r=await app.onRequest({request:req(),env});d=await r.json();
 assert.equal(r.status,503);assert.match(d.error,/Supabase SQL/i);
 state=init();r=await app.onRequest({request:req('FULL_MONTHLY'),env});
 assert.equal(r.status,409);assert.equal(calls('gu76_reset_zero_monthly_qa').length,0);
 state=init();state.roles=[];
 r=await app.onRequest({request:req(),env});assert.equal(r.status,403);
 assert.equal(calls('gu76_reset_zero_monthly_qa').length,0);
 assert.ok(front.includes('member.zeroQaActive'),'Owner editor must show special QA source details');
 assert.ok(front.includes('result.membership?.zeroQaResetCount>0'),
  'Owner editor must report confirmed FREE transition instead of just saved dates');
 console.log('PASS v77: Owner QA FULL_MONTHLY→FREE uses guarded RPC; paid/external grants, owner auth and missing SQL protections preserved');
}finally{globalThis.fetch=orig}
