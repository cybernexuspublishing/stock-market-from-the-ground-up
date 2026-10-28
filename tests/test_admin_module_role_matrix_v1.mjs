/* Strict CI contract for production Admin reads, permission boundaries, and
 * status revocation. Mock Supabase transport; no personal data or mutations. */
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/admin.js';
import {readFileSync} from 'node:fs';

const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
const user='00000000-0000-4000-8000-000000000042';
const states={
 OWNER:['control_panel.access','dashboard.view','users.view','roles.view','catalog.view','content.view','commerce.view','settings.view','audit.view','system.view'],
 ADMIN:['control_panel.access','dashboard.view','users.view','roles.view','catalog.view','content.view','commerce.view','settings.view','audit.view','system.view'],
 MODERATOR:['control_panel.access','dashboard.view','users.view','forum.view','forum.moderate','audit.view'],
 SUPPORT:['control_panel.access','dashboard.view','users.view','commerce.view','entitlements.view','support.manage'],
 FREE:[],
 SHOWCASE_VIEWER:['control_panel.access']
};
let role='OWNER',suspended=false,deleted=false,mixedShowcase=false,lookups=[];
const previous=globalThis.fetch;
const result=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(input,options={})=>{
 const u=new URL(String(input)),p=u.pathname,select=u.searchParams.get('select')||'';
 lookups.push(p);
 if(p==='/auth/v1/user')return result({id:user,email:'ci@invalid.example'});
 if(p==='/rest/v1/admin_user_roles')return result(role==='FREE'?[]:[
  {role_code:role,expires_at:null},...(mixedShowcase?[{role_code:'SHOWCASE_VIEWER',expires_at:null}]:[])
 ]);
 if(p==='/rest/v1/profiles'&&select.includes('account_kind'))return result([{account_kind:role==='SHOWCASE_VIEWER'?'showcase':'member',deleted_at:deleted?'2026-10-26T00:00:00Z':null}]);
 if(p==='/rest/v1/admin_user_flags')return result(suspended?[{status:'suspended'}]:[]);
 if(p==='/rest/v1/admin_role_permissions')return result((states[role]||[]).map(permission_code=>({permission_code})));
 if(p.startsWith('/rest/v1/'))return result([]);
 throw Error('Unexpected Admin endpoint: '+p);
};
const call=async(action,token='valid')=>onRequest({env,request:new Request('https://example.invalid/api/admin?action='+action,{
 headers:token?{authorization:'Bearer '+token}:{}})});
try{
 const html=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
 const panels=[...html.matchAll(/data-admin-panel="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(panels,['dashboard','users','roles','products','commerce','content','community','sparks','settings','audit','system'],
  'Eleven canonical management panels remain mounted once each');
 let res=await call('roles',null);
 assert.equal(res.status,401,'Anonymous reads must be denied');

 role='FREE';
 for(const action of ['roles','audit','commerce','catalog','settings','system','content']){
  lookups=[];res=await call(action);assert.equal(res.status,403,'Free account must not read Admin '+action);
  assert(!lookups.some(p=>/admin_audit_log|site_orders|site_settings|catalog_products|managed_content/.test(p)),
   'Unprivileged request must not fetch administrative content '+action);
 }
 role='MODERATOR';
 for(const action of ['roles','commerce','catalog','settings','system','content']){
  res=await call(action);assert.equal(res.status,403,'Moderator must not read '+action);
 }
 res=await call('audit');assert.equal(res.status,200,'Moderator audit viewing is explicitly assigned');
 role='SUPPORT';
 for(const action of ['roles','audit','catalog','settings','system']){
  res=await call(action);assert.equal(res.status,403,'Support must not read '+action);
 }
 res=await call('commerce');assert.equal(res.status,200,'Support has commerce.view for account assistance');
 role='ADMIN';
 for(const action of ['roles','audit','catalog','settings','system','content','commerce']){
  res=await call(action);assert.equal(res.status,200,'Active Admin must read allowed '+action);
 }
 role='OWNER';
 for(const action of ['roles','audit','catalog','settings','system','content','commerce']){
  res=await call(action);assert.equal(res.status,200,'Active Owner must read allowed '+action);
 }
 for(const change of [{suspended:true},{deleted:true},{mixedShowcase:true}]){
  Object.assign(globalThis,{});suspended=!!change.suspended;deleted=!!change.deleted;mixedShowcase=!!change.mixedShowcase;
  res=await call('audit');assert.equal(res.status,403,'Revoked Owner must lose audit access immediately');
 }
 assert.equal((await call('roles',null)).status,401);
 console.log('PASS Admin role matrix: canonical panels, guest/Free denials, Moderator and Support least privilege, Admin/Owner reads, revoked Owner denial.');
}finally{globalThis.fetch=previous}
