/* v0.14.0.255: all role fields and permissions saved in one call, no LIVE payments. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/admin.js';
const id='7e3c301b-8fb9-4293-bb71-8dfafbc25bab';
const env={SUPABASE_URL:'https://qa.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_qa',SUPABASE_SECRET_KEY:'sb_secret_qa'};
let role='OWNER',rpcCount=0,legacyWriteCount=0,stale=false;
const previousFetch=globalThis.fetch;
const body={role_code:'QA_TUTOR_EDITOR',name:'QA Tutor Editor',description:'Role QA mock',
 priority:120,is_assignable:true,permissions:['users.view'],
 expected_permissions:['audit.view'],expected_updated_at:'2026-10-25T15:00:00.000Z'};
try{
 globalThis.fetch=async(url,options={})=>{
  const u=String(url),method=options.method||'GET';
  const answer=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json'}});
  if(u.includes('/auth/v1/user'))return answer({id,email:'qa@example.test'});
  if(u.includes('/rest/v1/admin_user_roles?'))return answer([{role_code:role,expires_at:null}]);
  if(u.includes('/rest/v1/profiles?'))return answer([{account_kind:'member',deleted_at:null}]);
  if(u.includes('/rest/v1/admin_user_flags?'))return answer([{status:'active'}]);
  if(u.includes('/rest/v1/admin_role_permissions?select=permission_code'))return answer([{permission_code:'control_panel.access'},{permission_code:'roles.manage'}]);
  if(u.includes('/rest/v1/rpc/v014255_admin_role_editor_save')){
   rpcCount++;
   const x=JSON.parse(options.body);
   assert.deepEqual({code:x.p_role_code,name:x.p_name,description:x.p_description,priority:x.p_priority,assignable:x.p_is_assignable,
    desired:x.p_permissions,expected:x.p_expected_permissions,expectedDate:x.p_expected_updated_at},
    {code:body.role_code,name:body.name,description:body.description,priority:body.priority,assignable:body.is_assignable,
     desired:body.permissions,expected:body.expected_permissions,expectedDate:body.expected_updated_at});
   if(stale)return answer({message:'Role changed since this editor loaded. Refresh before saving.'},409);
   return answer({ok:true,role_code:body.role_code,created:false,permission_count:1,updated_at:'2026-10-25T16:00:00Z'});
  }
  if(method==='POST'&&u.includes('/rest/v1/admin_roles'))legacyWriteCount++;
  throw Error('Unexpected test fetch '+u);
 };
 const send=(action,data)=>onRequest({request:new Request('https://qa.test/api/admin?action='+action,{method:'POST',
  headers:{authorization:'Bearer fake-staff'},body:JSON.stringify(data)}),env});
 let response=await send('save_role_atomic',body);
 assert.equal(response.status,200,'Owner atomic role save succeeds');
 let result=await response.json();assert.equal(result.atomic,true);
 assert.equal(result.permissionsUpdated,1);assert.equal(rpcCount,1);assert.equal(legacyWriteCount,0);
 stale=true;
 response=await send('save_role_atomic',body);
 assert.equal(response.status,409,'Concurrent update must be reported as conflict');
 assert.match((await response.json()).error,/changed while this editor was open/);
 stale=false;role='ADMIN';
 response=await send('save_role_atomic',body);
 assert.equal(response.status,403,'Non-Owner staff cannot use role editor even with roles.manage');
 role='OWNER';
 response=await send('save_role_atomic',{...body,role_code:'OWNER'});
 assert.equal(response.status,400,'Protected role cannot be changed in generic editor');
 response=await send('save_role',body);
 assert.equal(response.status,409,'Retire old two-phase role metadata save');
 assert.equal(legacyWriteCount,0);
 const ui=readFileSync('assets/js/admin.js','utf8');
 assert(ui.includes("await api('save_role_atomic'"),'UI uses atomic save');
 assert(!ui.includes("await api('save_role',"),'UI does not perform obsolete first save');
 assert(!ui.includes("await api('set_role_permissions'"),'UI does not perform obsolete second save');
 assert(ui.includes("expected_updated_at:role.updated_at||null"),'UI sends previously observed version');
 const sql=readFileSync('supabase/migrations/v0.14.0.255_admin_role_editor_atomic_save.sql','utf8');
 assert(sql.includes('admin_audit_log')&&sql.includes('admin_role_permissions'),'SQL includes audit and permissions transaction');
 assert(sql.includes('GRANT EXECUTE')&&sql.includes('TO service_role'),'Database function restricted to server');
 console.log('PASS v0.14.0.255 atomic role edit, single UI call, stale conflict, Owner authorization and no legacy writes');
}finally{globalThis.fetch=previousFetch}
