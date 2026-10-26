import assert from 'node:assert/strict';
import {memberIdentity} from '../functions/api/member-tool-access.js';

// No external traffic, payment calls, credentials, or persistence.
// Distinguish rejected bearer tokens from genuine upstream outages.
const env={
 SUPABASE_URL:'https://example.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'public-unit-test',
 SUPABASE_SECRET_KEY:'server-unit-test'
};
const authenticated=new Request('https://example.test/private',{
 headers:{authorization:'Bearer deliberately-invalid-fixture-token'}
});
const originalFetch=globalThis.fetch;
let verified=0;
try{
 globalThis.fetch=async()=>{throw Error('Unauthenticated calls must not contact upstream')};
 await assert.rejects(
  memberIdentity(env,new Request('https://example.test/private')),
  err=>err.status===401 && err.message==='Sign in required.'
 );
 verified++;
 for(const upstreamStatus of [401,403]){
  globalThis.fetch=async()=>new Response(JSON.stringify({message:'Denied'}),
   {status:upstreamStatus,headers:{'content-type':'application/json'}});
  await assert.rejects(
   memberIdentity(env,authenticated),
   err=>err.status===401 && err.message==='Invalid session.',
   'GoTrue '+upstreamStatus+' must not report an infrastructure outage'
  );
  verified++;
 }
 for(const upstreamStatus of [429,500,503]){
  globalThis.fetch=async()=>new Response('{}',{status:upstreamStatus});
  await assert.rejects(
   memberIdentity(env,authenticated),
   err=>err.status===503 && err.message==='Training authorization unavailable.'
  );
  verified++;
 }
 globalThis.fetch=async()=>new Response('{}',{status:200,headers:{'content-type':'application/json'}});
 await assert.rejects(memberIdentity(env,authenticated),err=>err.status===401);
 verified++;
 globalThis.fetch=async()=>new Response(JSON.stringify({id:'fixture-member'}),
  {status:200,headers:{'content-type':'application/json'}});
 const authorized=await memberIdentity(env,authenticated);
 assert.equal(authorized.userId,'fixture-member');
 verified++;
}finally{
 globalThis.fetch=originalFetch;
}
console.log('PASS '+verified+' isolated training-auth denial/outage contract checks; 0 payment/provider operations');
