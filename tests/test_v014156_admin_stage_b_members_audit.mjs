/* D16 Stage B zero-cost source security contracts; production QA deferred to D18. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAdminClient} from '../assets/js/admin-unified-core-v014156.mjs';
import {safeMemberId,boundedAdminPage,listParams,pageControlsInfo,authorizedMemberDetailRows,rolePermissionSummary} from '../assets/js/admin-unified-people-v014156.mjs';
import {onRequest} from '../functions/api/admin.js';
const userId='123e4567-e89b-12d3-a456-426614174000';
assert.equal(safeMemberId(userId),userId);
for(const bad of ['abc','../path','',null,'not-an-id','123e4567-e89b-12d3-a456-426614174000&x=1'])
 assert.equal(safeMemberId(bad),null);
for(const bad of [NaN,Infinity,-1,0,1.1,10001,'2'])assert.equal(boundedAdminPage(bad),1);
assert.deepEqual(listParams({id:'members'},{page:3,search:' alice@example.test '}),{page:3,per_page:50,q:'alice@example.test'});
assert.deepEqual(listParams({id:'audit'},{page:2}),{page:2,limit:50});
assert.deepEqual(listParams({id:'roles'}),{});
assert.equal(pageControlsInfo({id:'members'},{page:3,hasNext:true,searchScope:'CURRENT_AUTH_PAGE_ONLY'}).hasNext,true);
assert.match(pageControlsInfo({id:'members'},{searchScope:'CURRENT_AUTH_PAGE_ONLY'}).scope,/not a global/);
assert.equal(pageControlsInfo({id:'audit'},{page:3,hasNext:false}).hasPrev,true);
const detail=authorizedMemberDetailRows({user:{email:'safe@example.test'},profile:{username:'Safe'},roles:[{role_code:'OWNER'}],
 notes:[{note:'PRIVATE NOTE NEVER RENDER'}],orders:[{provider_secret:'PRIVATE TOKEN'}]});
assert(detail.some(x=>x.title==='Username'&&x.detail==='Safe'));
assert(!JSON.stringify(detail).includes('PRIVATE NOTE')&&!JSON.stringify(detail).includes('PRIVATE TOKEN'));
const roles=rolePermissionSummary({roles:[{name:'Reader',role_code:'READER',is_assignable:true}],
 rolePermissions:[{role_code:'READER',permission_code:'users.view'},{role_code:'OTHER',permission_code:'audit.view'}]});
assert.match(roles[0].detail,/1 assigned permission/);
let network=0,tokens=0;
const adminRead=createAdminClient({getToken:async()=>{tokens++;return 'token';},transport:async()=>{network++;return {ok:true,json:async()=>({ok:true})}}});
await assert.rejects(adminRead('user_detail',{params:{id:'not-a-uuid'}}),/Invalid member identifier/);
await assert.rejects(adminRead('dashboard',{params:{id:userId}}),/Unsupported/);
await assert.rejects(adminRead('users',{params:{page:'NaN'}}),/pagination/);
await assert.rejects(adminRead('roles',{params:{action:'assign_role'}}),/Unsupported/);
assert.equal(network,0);assert.equal(tokens,0,'Invalid client requests must fail before token retrieval');
await adminRead('user_detail',{params:{id:userId}});
assert.equal(network,1);
let authEndpointCalls=0,queries=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const u=String(url);queries.push(u);
 const reply=x=>new Response(JSON.stringify(x),{status:200,headers:{'content-type':'application/json','content-range':'0-0/0'}});
 if(u.includes('/auth/v1/user'))return reply({id:userId,email:'admin@example.test'});
 if(u.includes('admin_user_roles?select=role_code'))return reply([{role_code:'OWNER',expires_at:null}]);
 if(u.includes('admin_role_permissions?select=permission_code'))return reply([{permission_code:'users.view'},{permission_code:'audit.view'}]);
 if(u.includes('/auth/v1/admin/users')){authEndpointCalls++;return reply({users:[]})}
 if(u.includes('/rest/v1/admin_audit_log?'))return reply([]);
 throw Error('Unexpected mock route '+u);
};
const env={SUPABASE_URL:'https://example.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock'};
const req=q=>new Request('https://site.example/api/admin?'+q,{headers:{authorization:'Bearer session.mock'}});
try{
 for(const q of ['action=users&page=NaN','action=users&page=0','action=users&per_page=9999999','action=audit&page=-4']){
  const response=await onRequest({request:req(q),env});
  assert.equal(response.status,400,'Invalid pagination must fail closed');
 }
 assert.equal(authEndpointCalls,0,'Do not query privileged user directory for invalid pages');
 let response=await onRequest({request:req('action=users&page=2&per_page=50&q=alice'),env});
 assert.equal(response.status,200);
 let data=await response.json();
 assert.equal(data.page,2);assert.equal(data.perPage,50);
 assert.equal(data.searchScope,'CURRENT_AUTH_PAGE_ONLY');
 assert.equal(data.hasNext,false);
 response=await onRequest({request:req('action=audit&page=3&limit=50'),env});
 assert.equal(response.status,200);
 assert(queries.some(q=>q.includes('admin_audit_log?')&&q.includes('offset=100')&&q.includes('limit=50')));
}finally{globalThis.fetch=originalFetch}
const html=readFileSync('assets/js/admin-unified-preview-v014156.mjs','utf8');
assert(!/innerHTML|MutationObserver|setInterval\(/.test(html),'No bypass to legacy unsafe DOM paths');
assert(html.includes('inspectMember')&&html.includes("adminRead('user_detail'"));
assert(html.includes('searchCurrentPage')&&html.includes('addPager'));
assert(html.includes("q('v014-training-slot')")===false,'No lesson prototype changes introduced');
console.log('PASS D16 bounded member/audit reads, client allowlists, safe summaries, staff-only Admin API and paged source contracts');
