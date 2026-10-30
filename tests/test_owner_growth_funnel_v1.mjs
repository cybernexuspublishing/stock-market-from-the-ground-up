/* Owner growth funnel V1: deterministic mocks only; never contact user accounts. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('functions/api/owner-growth-funnel.js','utf8');
const page=readFileSync('owner-growth-funnel.html','utf8');
const ui=readFileSync('assets/js/owner-growth-funnel-v1.js','utf8');
const admin=readFileSync('assets/js/admin-prelive-v014247.js','utf8');
assert(page.includes('data-route-access="staff"')&&page.includes('noindex,nofollow'),'Private report must not be public discovery');
assert(admin.includes("growthLink.href='/owner-growth-funnel.html'")&&admin.includes("context.roles?.includes('OWNER')"),'Owner-only control panel entry missing');
assert(!/method:\s*['"]POST['"]|\.insert\(|\.update\(|\.delete\(/.test(source+ui),'Read-only requirement violated');
assert(source.includes("email_confirmed_at")&&source.includes("day_started")&&source.includes("reflection_saved"),'Actual authoritative proof must be counted');
assert(!/innerHTML\s*=/.test(ui),'Do not interpolate report into HTML');
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const id={owner:'11111111-1111-4111-8111-111111111111',james:'22222222-2222-4222-8222-222222222222',
 member:'33333333-3333-4333-8333-333333333333',older:'44444444-4444-4444-8444-444444444444'};
const recent=new Date(Date.now()-86400000).toISOString(),old=new Date(Date.now()-60*86400000).toISOString();
const fixture={
 auth:[
  {id:id.owner,created_at:recent,email_confirmed_at:recent,is_anonymous:false},
  {id:id.james,created_at:recent,email_confirmed_at:recent,is_anonymous:false},
  {id:id.member,created_at:recent,email_confirmed_at:recent,is_anonymous:false},
  {id:id.older,created_at:old,email_confirmed_at:null,is_anonymous:false}
 ],
 profiles:[
  {id:id.owner,username:'Owner',account_kind:'member',deleted_at:null},
  {id:id.james,username:'James_Test',account_kind:'member',deleted_at:null},
  {id:id.member,username:'OrdinaryLearner',account_kind:'member',deleted_at:null},
  {id:id.older,username:'ReturningLearner',account_kind:'member',deleted_at:null}
 ],
 roles:[{user_id:id.owner,role_code:'OWNER',expires_at:null},{user_id:id.james,role_code:'ADMIN',expires_at:null}],
 enrolled:[{user_id:id.owner,program_code:'free5'},{user_id:id.james,program_code:'free5'},
  {user_id:id.member,program_code:'free5'}],
 audit:[{member_id:id.james,program_code:'free5',day_number:1,event_kind:'day_started'},
  {member_id:id.member,program_code:'free5',day_number:1,event_kind:'day_started'}],
 progress:[{user_id:id.james,program_code:'free5',day_number:1,status:'reflection_saved',started_at:recent,first_reflected_at:recent},
 {user_id:id.member,program_code:'free5',day_number:1,status:'reflection_saved',started_at:recent,first_reflected_at:recent}]
};
const oldFetch=globalThis.fetch;
globalThis.fetch=async (input,init)=>{
 const url=new URL(String(input)),p=url.pathname,header=init?.headers||{};
 let val=[];
 if(p==='/auth/v1/user'){
  if(header.authorization!=='Bearer owner-token')return new Response(JSON.stringify({error:'unauthorized'}),{status:401});
  val={id:id.owner};
 }else if(p==='/auth/v1/admin/users')val=url.searchParams.get('page')==='1'?fixture.auth:[];
 else if(p.endsWith('/admin_user_roles'))val=url.searchParams.has('user_id')?fixture.roles.filter(x=>x.user_id===id.owner):fixture.roles;
 else if(p.endsWith('/profiles'))val=url.searchParams.has('id')?fixture.profiles.filter(x=>x.id===id.owner):fixture.profiles;
 else if(p.endsWith('/admin_user_flags'))val=[];
 else if(p.endsWith('/gu_bootcamp_academy_enrollments_v014168'))val=fixture.enrolled;
 else if(p.endsWith('/gu_bootcamp_academy_audit_v014295'))val=fixture.audit;
 else if(p.endsWith('/gu_bootcamp_academy_progress_v014168'))val=fixture.progress;
 else throw Error('Unexpected provider destination '+p);
 if(p==='/auth/v1/admin/users')val={users:val};
 return new Response(JSON.stringify(val),{status:200,headers:{'content-type':'application/json'}});
};
const env={SUPABASE_URL:'https://mock-supabase.test',SUPABASE_PUBLISHABLE_KEY:'mock-public',SUPABASE_SECRET_KEY:'sb_secret_mock'};
const call=async (auth='Bearer owner-token',query='?days=7',method='GET')=>{
 const headers=auth?{authorization:auth}:{};
 return onRequest({request:new Request('https://example.test/api/owner-growth-funnel'+query,{method,headers}),env});
};
try{
 let response=await call(null);assert.equal(response.status,401);
 response=await call('Bearer wrong');assert.equal(response.status,403);
 response=await call('Bearer owner-token','?days=777');assert.equal(response.status,400);
 response=await call('Bearer owner-token','?days=7','POST');assert.equal(response.status,405);
 response=await call();
 assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 const v=await response.json();
 assert.equal(v.ok,true);
 assert.deepEqual(v.cohort,{registered:1,verified:1,free5_enrolled:1,day1_started:1,day1_saved:1,day5_saved:0});
 assert.deepEqual(v.all_time,{registered:2,verified:1,free5_enrolled:1,day1_started:1,day1_saved:1,day5_saved:0});
 assert.equal(v.exclusions.staff_and_known_qa,2);
 assert.equal(v.exclusions.unclassified_profiles,0);
 assert.equal(v.registration_days.length,7);
 assert(!JSON.stringify(v).includes(id.owner)&&!JSON.stringify(v).includes(id.member)&&
   !JSON.stringify(v).includes('OrdinaryLearner'),'No identity leaks');
 fixture.auth.push({id:'55555555-5555-4555-8555-555555555555',created_at:recent,email_confirmed_at:null,is_anonymous:false});
 const extended=await (await call()).json();
 assert.equal(extended.exclusions.unclassified_profiles,1,'Missing profiles are not silently counted');
 console.log('PASS owner growth funnel V1: OWNER auth, QA exclusion, verified email, real Free5 starts, read-only and no identity leak');
}finally{globalThis.fetch=oldFetch;}
