/* Offline provisioning regression: mocks Auth/REST, never sends email or creates live users. */
import assert from 'node:assert/strict';
import {roleForNewAccount,onRequest} from '../functions/api/admin-accounts-v01353.js';

import {readFileSync} from 'node:fs';
const clientSource=readFileSync(new URL('../assets/js/admin-operations.js',import.meta.url),'utf8');
assert(clientSource.includes('data-v1352-staff-role hidden'),'Create Account must present an explicit specialist-role selector');
assert(clientSource.includes("const assignments=(await roleList()).filter"),'Staff role choices must come from server-authorized assignable roles');
assert(clientSource.includes("staffSelect.dataset.loaded!=='1'"),'Staff role selection must not be enabled before the role list loads');
assert(clientSource.includes("if(data.type==='admin'&&(!f.elements.roleCode"),'Creating Administrator without verified role selection must fail closed');

const assignable=['ADMIN','MODERATOR','SUPPORT','COMMUNITY_MANAGER','LEARNING_MANAGER'];
assert.equal(roleForNewAccount('admin','SUPPORT',assignable),'SUPPORT');
assert.equal(roleForNewAccount('admin','COMMUNITY_MANAGER',assignable),'COMMUNITY_MANAGER');
assert.equal(roleForNewAccount('admin','NONE',assignable),'ADMIN');
assert.equal(roleForNewAccount('moderator','NONE',assignable),'MODERATOR');
assert.equal(roleForNewAccount('showcase','NONE',assignable),'SHOWCASE_VIEWER');
assert.equal(roleForNewAccount('test','NONE',assignable),null);
assert.equal(roleForNewAccount('member','NONE',assignable),null);
for(const [kind,requested] of [
 ['admin','OWNER'],['admin','MODERATOR'],['admin','SHOWCASE_VIEWER'],
 ['admin','NONEXISTENT'],['member','ADMIN'],['test','SUPPORT'],
 ['moderator','SUPPORT'],['owner','ADMIN'],['showcase','ADMIN']
]){
 assert.throws(()=>roleForNewAccount(kind,requested,assignable),/role|assignable/i,
  kind+'/'+requested+' must fail before Auth provisioning');
}
assert.throws(()=>roleForNewAccount('admin','ADMIN',[]),/assignable/,
 'Backend role catalog must be available before creating a new staff identity');

const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock'};
const owner='00000000-0000-4000-8000-000000000011';
const created='00000000-0000-4000-8000-000000000012';
const original=globalThis.fetch;
let authCreations=0,issuedRoles=[],auditActions=[],profileWrites=0,actorRole='OWNER';
const response=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const u=new URL(String(url)),p=u.pathname,method=options.method||'GET';
 if(p==='/auth/v1/user')return response({id:owner,email:'owner@example.invalid'});
 if(p==='/rest/v1/profiles'){
  if(u.searchParams.has('username'))return response([]);
  if(method==='POST'){profileWrites++;return response(null)}
  if(u.searchParams.get('id')==='eq.'+created)return response([{id:created,username:'QaSupport',account_kind:'member',deleted_at:null}]);
  return response([{id:owner,account_kind:'member',deleted_at:null}]);
 }
 if(p==='/rest/v1/admin_user_roles'){
  if(method==='POST'){issuedRoles.push(JSON.parse(options.body).role_code);return response(null)}
  if(u.searchParams.get('user_id')==='eq.'+created)return response([{role_code:'SUPPORT',expires_at:null}]);
  return response([{role_code:actorRole,expires_at:null}]);
 }
 if(p==='/rest/v1/admin_user_flags')return response([]);
 if(p==='/rest/v1/test_account_profiles')return response([]);
 if(p==='/rest/v1/admin_roles')return response(assignable.map(role_code=>({role_code,name:role_code,is_assignable:true})));
 if(p==='/rest/v1/admin_audit_log'){
  if(method==='POST')auditActions.push(JSON.parse(options.body).action);
  return response(null);
 }
 if(p==='/auth/v1/invite'){authCreations++;return response({user:{id:created}})}
 if(p.startsWith('/auth/v1/admin/')){authCreations++;return response({id:created})}
 if(p==='/rest/v1/account_private_identity'&&method==='POST')return response(null);
 throw Error('Unexpected provisioning request '+method+' '+p);
};
const call=async(type,roleCode)=>onRequest({env,request:new Request('https://site.invalid/api/admin-accounts-v01353?action=create',{
 method:'POST',headers:{authorization:'Bearer owner-qa-token','content-type':'application/json'},
 body:JSON.stringify({type,roleCode,firstName:'Role',lastName:'Fixture',
  username:'Qa'+roleCode.replace(/\W/g,'').slice(0,12),
  email:'qa-fixture@example.com',dateOfBirth:'1990-02-03',creationMethod:'invite',planCode:'FREE'})
})});
try{
 for(const [type,role] of [['admin','OWNER'],['admin','MODERATOR'],['member','ADMIN']]){
  const res=await call(type,role);
  assert.equal(res.status,400,'Invalid role/type must be denied');
 }
 assert.equal(authCreations,0,'Invalid roles must not create users or send invitations');
 assert.equal(profileWrites,0,'Invalid roles must not write member profiles');
 let res=await call('admin','SUPPORT');
 assert.equal(res.status,201);
 assert.equal(authCreations,1);
 assert.deepEqual(issuedRoles,['SUPPORT'],'Selected Support role, not ADMIN, must be assigned');
 assert(auditActions.includes('v1353.account.create.request'));
 assert(auditActions.includes('v1353.account.created'));
 assert.equal(profileWrites,1);
 actorRole='ADMIN';
 const specialist=await onRequest({env,request:new Request('https://site.invalid/api/admin-accounts-v01353?action=detail&id='+created,{headers:{authorization:'Bearer delegated-admin'}})});
 assert.equal(specialist.status,403,'Delegated Administrator cannot inspect or mutate specialist Support account via member editor');
 assert.equal(authCreations,1,'Denied delegated staff read cannot reach Auth admin identity endpoint');
 console.log('PASS account provisioning least privilege: real staff role mapping, invalid requests fail before invite, synthetic separation, creation audit (mocked).');
}finally{globalThis.fetch=original}
