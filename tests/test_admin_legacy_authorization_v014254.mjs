/* v0.14.0.254 — legacy Admin surfaces deny revoked or synthetic staff and support opaque Supabase keys. */
import assert from 'node:assert/strict';
import {onRequest as access} from '../functions/api/admin-access-v01355.js';
import {onRequest as site} from '../functions/api/admin-site-v01354.js';
import {onRequest as reports} from '../functions/api/admin-operations-center-v0135.js';
import {onRequest as operations} from '../functions/api/admin-operations-v0135.js';
import {readFileSync} from 'node:fs';

const id='7e3c301b-8fb9-4293-bb71-8dfafbc25bab';
const env={SUPABASE_URL:'https://qa.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_qa',SUPABASE_SECRET_KEY:'sb_secret_qa'};
let roleCodes=['OWNER'],accountKind='member',staffStatus='active',deletedAt=null;
let serviceCalls=0,invalidSecretBearer=0;
const savedFetch=globalThis.fetch;
const modules=[
 ['Account & Access',access,'admin-access-v01355?tab=not_a_real_section'],
 ['Site Management',site,'admin-site-v01354?action=not_a_real_action'],
 ['Operations Intelligence',reports,'admin-operations-center-v0135?action=security'],
 ['Operational Registry',operations,'admin-operations-v0135?action=not_a_real_action']
];
try{
 globalThis.fetch=async(url,options={})=>{
  const u=String(url),head=options.headers||{};
  const response=data=>new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json','content-range':'*/0'}});
  if(u.endsWith('/auth/v1/user'))return response({id,email:'qa@example.test'});
  if(u.includes('/rest/v1/')){serviceCalls++;assert.equal(head.apikey,'sb_secret_qa');if(head.authorization?.includes('sb_secret_'))invalidSecretBearer++;}
  if(u.includes('admin_user_roles?'))return response(roleCodes.map(role_code=>({role_code,expires_at:null})));
  if(u.includes('profiles?select='))return response([{account_kind:accountKind,deleted_at:deletedAt,id}]);
  if(u.includes('admin_user_flags?'))return response([{status:staffStatus}]);
  if(u.includes('admin_role_permissions?'))return response([{role_code:'OWNER',permission_code:'control_panel.access'},{role_code:'OWNER',permission_code:'audit.view'}]);
  return response([]);
 };
 const call=(path,handler)=>handler({request:new Request('https://qa.example/api/'+path,{headers:{authorization:'Bearer qa-login'}}),env});
 const run=async(valid)=>{
  for(const [name,handler,path] of modules){
   const res=await call(path,handler);
   if(valid)assert.notEqual(res.status,403,name+' should reach action routing for active Owner');
   else assert.equal(res.status,403,name+' must reject invalid or restricted staff');
  }
 };
 await run(true);
 staffStatus='restricted';await run(false);
 staffStatus='suspended';await run(false);
 staffStatus='active';accountKind='test';await run(false);
 accountKind='member';deletedAt='2026-10-24T00:00:00Z';await run(false);
 deletedAt=null;roleCodes=['OWNER','SHOWCASE_VIEWER'];await run(false);
 roleCodes=['OWNER'];await run(true);
 assert.equal(invalidSecretBearer,0,'Legacy modules must not send modern secret keys as Bearer tokens');
 assert(serviceCalls>20,'Authorize through service-backed identity and restrictions on every request');
 for(const path of ['functions/api/admin-access-v01355.js','functions/api/admin-operations-v0135.js','functions/api/admin-operations-center-v0135.js']){
  const source=readFileSync(path,'utf8');
  assert(source.includes("startsWith('sb_secret_')"),'Modern secret header branch missing from '+path);
 }
 console.log('PASS legacy Admin Owner authorization, restricted/deleted/test/mixed Showcase denial, and opaque secret support');
}finally{globalThis.fetch=savedFetch}
