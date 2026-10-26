// Contract regression for public Lab release gate: never unlock unpublished
// educational drafts or any of the 83 post-beta canonical identifiers.
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/lab-release-availability.js';
import {BETA_CANDIDATE_IDS,BETA_UPCOMING_IDS} from '../functions/_lib/lab-beta-scope-v014286.js';

assert.equal(BETA_CANDIDATE_IDS.length,336);
assert.equal(BETA_UPCOMING_IDS.length,83);
assert.equal(new Set([...BETA_CANDIDATE_IDS,...BETA_UPCOMING_IDS]).size,419);

const originalFetch=globalThis.fetch;
const candidate='F1-C02-L01';
const draft='F1-C02-L02';
const upcoming='SITE-018';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test_only'};
function mockFetch(url){
 const u=new URL(url);
 let data;
 if(u.pathname.endsWith('/platform_labs')) data=[
   {lab_id:candidate,active:true,registry_visible:true},
   {lab_id:draft,active:true,registry_visible:true},
   {lab_id:upcoming,active:true,registry_visible:true}
 ];
 else if(u.pathname.endsWith('/lab_instruction_v014')) data=[
   {lab_id:candidate,source_status:'editorially_reviewed_v1'},
   {lab_id:draft,source_status:'original_hypothetical_unreviewed_v01496'},
   {lab_id:upcoming,source_status:'editorially_reviewed_v1'}
 ];
 else if(u.pathname.endsWith('/lab_training_sets_v014')) data=[
   {lab_id:candidate,review_state:'reviewed',reviewed_by:'reviewer',reviewed_at:'2026-10-26T00:00:00Z'},
   {lab_id:draft,review_state:'reviewed',reviewed_by:'reviewer',reviewed_at:'2026-10-26T00:00:00Z'},
   {lab_id:upcoming,review_state:'reviewed',reviewed_by:'reviewer',reviewed_at:'2026-10-26T00:00:00Z'}
 ];
 else throw Error('Unexpected test fetch '+u.pathname);
 return Promise.resolve(new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}}));
}
try{
 globalThis.fetch=mockFetch;
 const response=await onRequest({request:new Request('https://site.example/api/lab-release-availability'),env});
 assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'no-store, max-age=0');
 const body=await response.json();
 assert.deepEqual(body.publishedIds,[candidate], 'No draft and no SITE-018–100 can receive Start');
 assert.equal(body.betaReadyCertified,false, 'Public endpoint cannot certify beta readiness');

 globalThis.fetch=async()=>new Response('Database unavailable',{status:503});
 const failed=await onRequest({request:new Request('https://site.example/api/lab-release-availability'),env});
 assert.equal(failed.status,503,'Database outage must fail closed');
 assert.deepEqual((await failed.json()).publishedIds,undefined);

 const unauthorized=await onRequest({request:new Request('https://site.example/api/lab-release-availability',{method:'POST'}),env});
 assert.equal(unauthorized.status,405);
 console.log('PASS: 336/83 beta scope, reviewed-only Start, draft denial, 503 fail closed, 405 method rejection');
}finally{globalThis.fetch=originalFetch;}
