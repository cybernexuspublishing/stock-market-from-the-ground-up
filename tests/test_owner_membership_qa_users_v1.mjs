import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestGet,onRequestPost} from '../functions/api/owner-membership-qa-users-v1.js';
const env={SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock'};
let role='OWNER',stepup=true,created=[],audited=[],grants=0;
const realFetch=globalThis.fetch;
const request=(method,body,origin='https://site.example',authorized=true)=>
 new Request('https://site.example/api/owner-membership-qa-users-v1',{method,
 headers:{'content-type':'application/json',origin,...(authorized?{authorization:'Bearer fake-owner-session'}:{})},
 ...(body?{body:JSON.stringify(body)}:{})});
const ok=(v)=>Response.json(v);
const uuid=(n)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
globalThis.fetch=async(url,opts={})=>{
 const u=new URL(url),p=u.pathname;
 if(p==='/auth/v1/user')return ok({id:uuid(50)});
 if(p==='/rest/v1/rpc/gu_staff_role_v01432r1')return ok({ok:true,role});
 if(p==='/rest/v1/rpc/gu_staff_stepup_active_v01432r1')return ok(stepup);
 if(p==='/rest/v1/profiles'&&u.searchParams.has('username')){
  return ok(created.map(x=>({id:x.id,username:x.user_metadata.username,email:x.email,
   account_kind:'member',email_verified:true})));
 }
 if(p==='/auth/v1/admin/users'&&opts.method==='POST'){
  const data=JSON.parse(opts.body);
  assert.equal(data.email_confirm,true);
  assert.equal(data.password,'only-for-test-123!');
  assert.equal(data.app_metadata.smfgu_qa_only,true);
  assert.equal(data.app_metadata.noncommercial,true);
  assert(data.app_metadata.qa_target_plan);
  const made={...data,id:uuid(created.length+1)};created.push(made);return ok(made);
 }
 if(p.startsWith('/auth/v1/admin/users/')){
  const id=p.split('/').at(-1),record=created.find(x=>x.id===id);
  assert(record);return ok(record);
 }
 if(p==='/rest/v1/profiles'&&u.searchParams.has('id')){
  const id=u.searchParams.get('id').slice(3);
  const record=created.find(x=>x.id===id);
  return ok(record?[{id,username:record.user_metadata.username,email:record.email,
   account_kind:'member',email_verified:true}]:[]);
 }
 if(p==='/rest/v1/admin_audit_log'){
  const data=JSON.parse(opts.body);audited.push(data);
  assert.equal(data.actor_user_id,uuid(50));
  assert.equal(data.action,'qa.membership.noncommercial_identity_provisioned');
  assert.equal(data.details.plan_entitlement_granted,false);
  return ok([{id:audited.length}]);
 }
 if(p.includes('/user_plan_grants')||p.includes('/gu_founder_members')){
  grants++;throw Error('No paid or founding entitlements should be touched');
 }
 throw Error('Unexpected request: '+url);
};
try{
 assert.equal((await onRequestGet({request:request('GET'),env})).status,200);
 assert.equal((await (await onRequestGet({request:request('GET'),env})).json()).ready,0);
 role='SUPPORT';assert.equal((await onRequestGet({request:request('GET'),env})).status,403);
 role='OWNER';stepup=false;
 assert.equal((await onRequestPost({request:request('POST',{confirm:'CREATE_NINE_NONCOMMERCIAL_QA_ACCOUNTS',password:'only-for-test-123!'}),env})).status,403);
 stepup=true;
 assert.equal((await onRequestPost({request:request('POST',{confirm:'WRONG',password:'only-for-test-123!'}),env})).status,400);
 assert.equal((await onRequestPost({request:request('POST',{confirm:'CREATE_NINE_NONCOMMERCIAL_QA_ACCOUNTS',password:'only-for-test-123!'},'https://bad.site'),env})).status,403);
 assert.equal(created.length,0);
 const chart=await onRequestPost({request:request('POST',{confirm:'CREATE_THREE_CROWNLIGHT_QA_ACCOUNTS',password:'only-for-test-123!'}),env});
 assert.equal(chart.status,200);const qa=await chart.json();
 assert.equal(qa.created,3);assert.equal(qa.chartReady,3);
 assert.deepEqual(created.map(x=>x.app_metadata.qa_chart_tier),['STANDARD','ADVANCED','PROFESSIONAL']);
 assert.equal(created.length,3);
 const r=await onRequestPost({request:request('POST',{confirm:'CREATE_NINE_NONCOMMERCIAL_QA_ACCOUNTS',password:'only-for-test-123!'}),env});
 assert.equal(r.status,200);const d=await r.json();
 assert.equal(d.created,9);assert.equal(created.length,9);assert.equal(audited.length,9);
 assert.equal(new Set(created.map(x=>x.email)).size,9);
 assert.equal(created[0].user_metadata.username,'Test_Free');
 assert(created.some(x=>x.user_metadata.username==='Test_Founding_60'));
 assert.equal(grants,0);
 const qaAfter=await (await onRequestGet({request:request('GET'),env})).json();
 assert.equal(qaAfter.chartReady,3);
 const chartRepeated=await onRequestPost({request:request('POST',{confirm:'CREATE_THREE_CROWNLIGHT_QA_ACCOUNTS',password:'only-for-test-123!'}),env});
 assert.equal(chartRepeated.status,200);
 assert.equal(created.length,9);
 const after=await (await onRequestGet({request:request('GET'),env})).json();
 assert.equal(after.ready,9);
 const repeated=await onRequestPost({request:request('POST',{confirm:'CREATE_NINE_NONCOMMERCIAL_QA_ACCOUNTS',password:'only-for-test-123!'}),env});
 assert.equal(repeated.status,200);
 assert.equal(created.length,9,'Idempotent repeat must not create duplicate users');
 const client=readFileSync(new URL('../assets/js/admin-membership-qa-users-v1.js',import.meta.url),'utf8');
 assert.doesNotThrow(()=>new Function(client));
 assert.match(client,/Create Test Accounts/);
 assert.match(client,/GroundUpAdminPasswordConfirm\.ensure/);
 assert(!client.includes('123456789!Gu'),'QA shared password must never be embedded in shipped code');
 console.log('PASS: 9 noncommercial Owner-only QA Auth users, profile verification, step-up, audit, no grants, retry safe.');
}finally{globalThis.fetch=realFetch;}
