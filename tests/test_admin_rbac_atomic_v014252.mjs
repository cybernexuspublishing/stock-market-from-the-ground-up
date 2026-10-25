/* Owner-only atomic RBAC and modern Supabase secret-key regression. */
import assert from 'node:assert/strict';
import {onRequest as admin} from '../functions/api/admin.js';
import {onRequest as registry} from '../functions/api/admin-control-registry.js';
import {readFileSync} from 'node:fs';
const id='7e3c301b-8fb9-4293-bb71-8dfafbc25bab';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_qa',SUPABASE_SECRET_KEY:'sb_secret_qa'};
let role='OWNER',flag='active',showcase=false,dbHeaders=[],rpcCalls=0,deleteCalls=0;
const original=globalThis.fetch;
try{
 globalThis.fetch=async(url,opts={})=>{
  const u=String(url),method=opts.method||'GET';
  const answer=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
  if(u.includes('/auth/v1/user'))return answer({id,email:'qa@example.test'});
  if(u.includes('/rest/v1/')){
   dbHeaders.push(opts.headers||{});
   assert(!String(opts.headers?.authorization||'').includes('sb_secret_'),'sb_secret keys cannot be Bearer tokens');
  }
  if(u.includes('/admin_user_roles?'))return answer([{role_code:role,expires_at:null},...(showcase?[{role_code:'SHOWCASE_VIEWER',expires_at:null}]:[])]);
  if(u.includes('/admin_role_permissions?select=permission_code'))return answer([{permission_code:'control_panel.access'},{permission_code:'roles.manage'},{permission_code:'roles.view'}]);
  if(u.includes('/profiles?select=account_kind'))return answer([{account_kind:'member'}]);
  if(u.includes('/admin_user_flags?'))return answer([{status:flag}]);
  if(u.includes('/admin_control_registry_v01409?'))return answer([{control_key:'builtin:panel-dashboard',label:'Dashboard',is_visible:true}]);
  if(u.includes('/rpc/v014252_admin_role_permissions_replace')){
   rpcCalls++;
   const body=JSON.parse(opts.body);
   assert.equal(body.p_actor,id);
   assert.equal(body.p_role_code,'MODERATOR');
   assert.deepEqual(body.p_expected_permissions,['audit.view']);
   return answer({ok:true,role_code:'MODERATOR',count:1,changed:true});
  }
  if(u.includes('/rpc/v01409_admin_control_save'))return answer({ok:true});
  if(u.includes('/admin_role_permissions?role_code=eq.')&&method==='DELETE')deleteCalls++;
  throw Error('Unexpected test request '+u);
 };
 const call=(action,body)=>admin({request:new Request('https://site.test/api/admin?action='+action,{method:'POST',headers:{authorization:'Bearer qa-session'},body:JSON.stringify(body)}),env});
 let response=await call('set_role_permissions',{role_code:'MODERATOR',permissions:['forum.view'],expected_permissions:['audit.view']});
 assert.equal(response.status,200);
 assert.equal((await response.json()).atomic,true);
 assert.equal(rpcCalls,1);
 assert.equal(deleteCalls,0,'No separate DELETE before INSERT');
 role='ADMIN';
 response=await call('set_role_permissions',{role_code:'MODERATOR',permissions:['forum.view'],expected_permissions:['audit.view']});
 assert.equal(response.status,403,'Only an actual Owner can edit permission matrix');
 role='OWNER';
 response=await call('set_role_permissions',{role_code:'OWNER',permissions:['forum.view'],expected_permissions:['audit.view']});
 assert.equal(response.status,403,'Owner permission matrix must stay immutable');
 response=await call('set_role_permissions',{role_code:'MODERATOR',permissions:['forum.view']});
 assert.equal(response.status,400,'Expected version of permissions is mandatory');
 showcase=true;
 response=await registry({request:new Request('https://site.test/api/admin-control-registry',{headers:{authorization:'Bearer qa-session'}}),env});
 assert.equal(response.status,403,'Mixed Showcase/Owner must deny');
 showcase=false;
 response=await registry({request:new Request('https://site.test/api/admin-control-registry',{headers:{authorization:'Bearer qa-session'}}),env});
 assert.equal(response.status,200,'Owner registry reads using modern Supabase secret');
 assert(dbHeaders.some(h=>h.apikey==='sb_secret_qa'&&!('authorization' in h)),'Modern secret uses apikey only');
 flag='restricted';
 response=await registry({request:new Request('https://site.test/api/admin-control-registry',{headers:{authorization:'Bearer qa-session'}}),env});
 assert.equal(response.status,403,'Suspended/restricted Owner blocked');
 const ui=readFileSync('assets/js/admin.js','utf8');
 assert(ui.includes('expected_permissions:[...assigned]'),'UI transmits last-observed permissions');
 assert(ui.includes("!['OWNER','SHOWCASE_VIEWER'].includes(r.role_code)"),'Protected roles are not offered for generic editing');
 console.log('PASS: atomic RBAC Owner-only, modern Supabase secret, showcase denial, protected roles, optimistic concurrency');
}finally{globalThis.fetch=original}
