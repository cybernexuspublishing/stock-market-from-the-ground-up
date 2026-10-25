/* v0.14.0.253 — revocable staff privileges and synthetic separation. No real account changes. */
import assert from 'node:assert/strict';
import {onRequest as core} from '../functions/api/admin.js';
import {onRequest as people} from '../functions/api/admin-accounts-v01353.js';
import {onRequest as prelive} from '../functions/api/admin-prelive-v014247.js';

const user='7e3c301b-8fb9-4293-bb71-8dfafbc25bab';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock'};
let status='active',accountKind='member',deletedAt=null,roles=['OWNER'],calls=0,secretLeaks=0;
const originalFetch=globalThis.fetch;
const request=(route,action)=>new Request('https://qa.example/api/'+route+'?action='+action,{headers:{authorization:'Bearer mock-staff-jwt'}});
try{
 globalThis.fetch=async(url,options={})=>{
  calls++;
  const address=String(url),head=options.headers||{};
  const reply=(value,http=200)=>new Response(JSON.stringify(value),{status:http,headers:{'content-type':'application/json'}});
  if(address.includes('/auth/v1/user'))return reply({id:user,email:'owner@example.test'});
  if(address.includes('/rest/v1/')){
   if(head.authorization?.includes('sb_secret_'))secretLeaks++;
   assert.equal(head.apikey,'sb_secret_mock');
  }
  if(address.includes('/admin_user_roles?'))return reply(roles.map(role_code=>({role_code,expires_at:null})));
  if(address.includes('/admin_user_flags?'))return reply([{status}]);
  if(address.includes('/profiles?'))return reply([{id:user,account_kind:accountKind,deleted_at:deletedAt}]);
  if(address.includes('/admin_role_permissions?'))return reply([{permission_code:'control_panel.access'},{permission_code:'system.view'}]);
  if(address.includes('/admin_roles?'))return reply([{role_code:'MODERATOR',name:'Moderator',is_assignable:true}]);
  if(address.includes('/rest/v1/gu_'))return reply([]);
  if(address.includes('/rest/v1/platform_labs')||address.includes('/rest/v1/competency_definitions'))return reply([]);
  throw Error('Unexpected fake request '+address);
 };
 const check=async(expectCore,expectPeople,expectPrelive)=>{
  const c=await core({request:request('admin','system'),env});
  const p=await people({request:request('admin-accounts-v01353','roles'),env});
  const a=await prelive({request:request('admin-prelive-v014247','status'),env});
  assert.equal(c.status,expectCore,'General Admin current-staff authorization');
  assert.equal(p.status,expectPeople,'Account editor current-staff authorization');
  assert.equal(a.status,expectPrelive,'Owner release diagnostics current-staff authorization');
 };
 // Active Owner remains authorized for the existing Admin and account editor.
 // Pre-LIVE status works even if source counts are unavailable (all checked fail closed).
 await check(200,200,200);
 status='restricted';await check(403,403,403);
 status='suspended';await check(403,403,403);
 status='watch';await check(200,200,200);
 status='active';
 accountKind='test';await check(403,403,403);
 accountKind='member';deletedAt='2026-10-24T00:00:00Z';await check(403,403,403);
 deletedAt=null;roles=['OWNER','SHOWCASE_VIEWER'];await check(403,403,403);
 roles=['OWNER'];await check(200,200,200);
 assert.equal(secretLeaks,0,'Modern Supabase secret is only used as apikey');
 assert(calls>20,'Authorizations are recomputed on each request, not cached');
 console.log('PASS Admin and Account Management blocked immediately after suspension, deletion, test identity, or mixed Showcase role');
}finally{globalThis.fetch=originalFetch}
