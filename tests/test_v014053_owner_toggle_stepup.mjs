import assert from 'node:assert/strict';
const api=await import(new URL('../functions/api/gu39-sandbox.js',import.meta.url).href);
const url='https://example.com/api/gu39-sandbox';
const headers={origin:'https://example.com',authorization:'Bearer mock-owner', 'content-type':'application/json'};
const env={
 SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_mock',
 GU39_SANDBOX_SHADOW_GATE:'true',GU39_STRIPE_TEST_SECRET_KEY:'sk_test_mock',
 GU39_STRIPE_TEST_WEBHOOK_SECRET:'whsec_mock',
 GU39_STRIPE_TEST_PRICE_MAP_JSON:'{}'
};
const request=()=>new Request(url,{method:'POST',headers,body:JSON.stringify({action:'toggle',enabled:true,updatedAt:'2026-10-17T18:55:00Z'})});
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const original=globalThis.fetch;
let stepup=false,toggleCalls=0,caseName='success';
globalThis.fetch=async(uri)=>{
 const u=String(uri);
 if(u.endsWith('/auth/v1/user'))return reply({id:'a6c51d30-3763-4dbf-a74e-051402cefe68'});
 if(u.endsWith('/rpc/gu_staff_role_v01432r1'))return reply({ok:true,role:'OWNER'});
 if(u.endsWith('/rpc/gu_staff_stepup_active_v01432r1')){
  if(caseName==='stepup_down')return reply({code:'PGRST001',message:'db error'},503);
  return reply(stepup);
 }
 if(u.endsWith('/rpc/gu39_sandbox_owner_toggle')){
  toggleCalls++;
  if(caseName==='stale')return reply({code:'40001',message:'SETTINGS_STALE_REFRESH'},409);
  if(caseName==='audit')return reply({code:'23502',message:'database internal reason must not appear in UI'},400);
  if(caseName==='missing')return reply({code:'PGRST202',message:'function unavailable'},404);
  if(caseName==='forbidden')return reply({code:'42501',message:'permission denied'},403);
  return reply({ok:true,enabled:true,updatedAt:'2026-10-17T18:56:00Z'});
 }
 throw Error('Unexpected network request '+u);
};
try{
 let response=await api.onRequestPost({request:request(),env});
 assert.equal(response.status,403);assert.equal((await response.json()).error,'PASSWORD_RECONFIRM_REQUIRED');
 assert.equal(toggleCalls,0,'unconfirmed Owner must never modify DB');
 stepup=true;caseName='stale';
 response=await api.onRequestPost({request:request(),env});
 assert.equal((await response.json()).error,'SETTINGS_STALE_REFRESH');
 caseName='audit';response=await api.onRequestPost({request:request(),env});
 const masked=await response.json();assert.equal(masked.error,'SHADOW_TOGGLE_DATABASE_REJECTED');
 assert(!JSON.stringify(masked).includes('database internal reason'),'never leak internal database exceptions');
 caseName='missing';response=await api.onRequestPost({request:request(),env});
 assert.equal((await response.json()).error,'SHADOW_TOGGLE_RPC_UNAVAILABLE');
 caseName='forbidden';response=await api.onRequestPost({request:request(),env});
 assert.equal((await response.json()).error,'SHADOW_TOGGLE_AUTH_REJECTED');
 caseName='stepup_down';response=await api.onRequestPost({request:request(),env});
 assert.equal((await response.json()).error,'STAFF_STEPUP_CHECK_UNAVAILABLE');
 caseName='success';response=await api.onRequestPost({request:request(),env});
 assert.equal(response.status,200);
 const ok=await response.json();assert.equal(ok.enabled,true);assert.equal(ok.liveCheckout,false);
 assert.equal(toggleCalls,5,'Owner toggle runs only after database stepup confirms');
 console.log('PASS v53: Owner password confirmation required, safe typed Supabase diagnostics, exact 1 RPC per retry, live payments OFF.');
}finally{globalThis.fetch=original}
