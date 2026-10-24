/* v0.14.0.170: isolated API contract. All Supabase endpoints are mocked.
 * Does NOT touch production membership, credits, payments, or private data. */
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/bootcamp-academy.js';
const env={SUPABASE_URL:'https://academy-fixture.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',
 SUPABASE_SECRET_KEY:'sb_secret_test'};
const userA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const origin='https://member.test';
const note='I reviewed a named source, its time, and the observed evidence. I compared alternatives, identified the missing market information, and wrote a specific next learning action.';
let writes=[],privateReads=[],forceConflict=false,forgeGrade=false,denyAccess=false,denyProfile=false;
const saved=globalThis.fetch;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const getUserFromAuth=authorization=>{
 if(authorization==='Bearer member-a')return userA;
 if(authorization==='Bearer member-b')return userB;
 return '';
};
function makeRequest({method='GET',query='',actor='member-a',data=null,foreignOrigin=false}={}){
 const headers={authorization:'Bearer '+actor};
 if(method==='POST'){
  headers['content-type']='application/json';
  headers.origin=foreignOrigin?'https://unrelated.example':origin;
  headers['sec-fetch-site']=foreignOrigin?'cross-site':'same-origin';
 }
 return new Request(origin+'/api/bootcamp-academy'+query,{
  method,headers,body:data===null?undefined:JSON.stringify(data)
 });
}
const input=(action,extras={})=>({program:'truth5',version:'0.14.0.168',
 day:action==='enroll'?0:1,action,...extras});
globalThis.fetch=async(url,options={})=>{
 const u=new URL(String(url)),pathname=u.pathname;
 const authorization=options.headers?.authorization;
 if(pathname==='/auth/v1/user')
  return getUserFromAuth(authorization)?json({id:getUserFromAuth(authorization)}):json({error:'bad token'},401);
 if(pathname==='/rest/v1/profiles')
  return json([{account_kind:denyProfile?'showcase':'member'}]);
 if(pathname==='/rest/v1/admin_user_flags')return json([]);
 if(pathname==='/rest/v1/rpc/user_has_tool_access'){
  const actor=JSON.parse(options.body||'{}').target_user;
  return json(!denyAccess&&actor===userA);
 }
 if(pathname==='/rest/v1/gu_bootcamp_academy_enrollments_v014168'){
  privateReads.push({path:pathname,query:u.search});
  assert(u.searchParams.get('user_id')==='eq.'+userA,'Cross-account enrollment read');
  return json([{status:'active',program_code:'truth5',program_version:'0.14.0.168'}]);
 }
 if(pathname==='/rest/v1/gu_bootcamp_academy_progress_v014168'){
  privateReads.push({path:pathname,query:u.search});
  assert(u.searchParams.get('user_id')==='eq.'+userA,'Cross-account progress read');
  return json([{day_number:1,status:'reflection_saved',revision:2,reflection:note,
   started_at:'2026-10-24T12:00:00Z',updated_at:'2026-10-24T12:01:00Z'}]);
 }
 if(pathname==='/rest/v1/rpc/gu_bootcamp_academy_save_v014168'){
  const payload=JSON.parse(options.body||'{}');
  assert(payload.p_user===userA,'An authenticated member must not write another member’s progress');
  writes.push(payload);
  if(forceConflict)return json({conflict:true,actualRevision:3});
  if(payload.p_action==='enroll')
   return json({ok:true,program:'truth5',enrollment:'active',
    graded:false,competencyMasteryAwarded:false});
  return json({program:'truth5',day:payload.p_day,revision:3,
   status:payload.p_action==='start'?'in_progress':'reflection_saved',
   graded:forgeGrade?true:false,competencyMasteryAwarded:false,marketOutcomeClaimed:false,
   reflection:payload.p_reflection});
 }
 throw Error('Unexpected external network call in mocked Academy API: '+pathname);
};
try{
 let response=await onRequest({request:makeRequest({query:'?action=catalog'}),env});
 let result=await response.json();
 assert.equal(response.status,200);
 assert.equal(result.programs.length,7);
 assert.equal(privateReads.length,0,'Public catalog must not access private member records');

 response=await onRequest({request:makeRequest({query:'?program=truth5'}),env});
 result=await response.json();
 assert.equal(response.status,200);
 assert.equal(result.program.code,'truth5');
 assert.equal(result.enrolled,true);
 assert.equal(result.progress[0].reflection,note);
 assert.equal(privateReads.length,2);

 response=await onRequest({request:makeRequest({actor:'member-b',query:'?program=truth5'}),env});
 assert.equal(response.status,403,'Other member without training entitlement is denied');
 assert.equal(privateReads.length,2,'Denied account may not read Academy progress');

 denyProfile=true;
 response=await onRequest({request:makeRequest({query:'?program=truth5'}),env});
 assert.equal(response.status,403,'Showcase users cannot inherit paid training access');
 denyProfile=false;
 denyAccess=true;
 response=await onRequest({request:makeRequest({query:'?program=truth5'}),env});
 assert.equal(response.status,403,'Missing entitlement must fail closed');
 denyAccess=false;

 response=await onRequest({request:makeRequest({method:'POST',foreignOrigin:true,data:input('enroll')}),env});
 assert.equal(response.status,403,'Cross-origin authenticated writes are blocked');
 assert.equal(writes.length,0,'Cross-site request may not reach private progress RPC');

 response=await onRequest({request:makeRequest({method:'POST',data:input('save_reflection',{reflection:'short',expectedRevision:0})}),env});
 assert.equal(response.status,400,'Insufficient reflection cannot change progress');
 assert.equal(writes.length,0);

 response=await onRequest({request:makeRequest({method:'POST',data:input('save_reflection',{reflection:note,expectedRevision:2})}),env});
 result=await response.json();assert.equal(response.status,200);
 assert.equal(result.progress.status,'reflection_saved');
 assert.equal(writes.length,1);
 assert.equal(writes[0].p_user,userA);
 assert.equal(writes[0].p_expected_revision,2);

 forceConflict=true;
 response=await onRequest({request:makeRequest({method:'POST',data:input('save_reflection',{reflection:note,expectedRevision:2})}),env});
 assert.equal(response.status,409,'Stale revision cannot overwrite another tab');
 forceConflict=false;

 forgeGrade=true;
 response=await onRequest({request:makeRequest({method:'POST',data:input('save_reflection',{reflection:note,expectedRevision:3})}),env});
 assert.equal(response.status,503,'Client must reject a response claiming an unreviewed graded outcome');
 forgeGrade=false;

 response=await onRequest({request:makeRequest({method:'POST',data:input('enroll')}),env});
 result=await response.json();
 assert.equal(response.status,200);assert.equal(result.enrolled,true);
 assert.equal(writes.at(-1).p_day,0);
 assert(!writes.some(x=>'p_grade' in x||'p_credit' in x||'p_mastery' in x),
  'Academy private study progress cannot award grades, credit or mastery');
 console.log('PASS Academy API: public catalog, member-only reads, denial, showcase restrictions, same origin, validation, optimistic lock, no self-grading or cross-account writes');
}finally{globalThis.fetch=saved}
