// Contract regression for public Lab release gate: never unlock unpublished
// educational drafts or any of the 83 post-beta canonical identifiers.
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/lab-release-availability.js';
import {onRequest as scopeRequest} from '../functions/api/lab-beta-scope.js';
import {isBetaCandidateLab,isBetaUpcomingLab} from '../functions/_lib/lab-beta-scope-v014286.js';
import {BETA_CANDIDATE_IDS,BETA_UPCOMING_IDS} from '../functions/_lib/lab-beta-scope-v014286.js';

assert.equal(BETA_CANDIDATE_IDS.length,336);
assert.equal(BETA_UPCOMING_IDS.length,83);
assert.equal(new Set([...BETA_CANDIDATE_IDS,...BETA_UPCOMING_IDS]).size,419);
assert.equal(isBetaCandidateLab('F1-C02-L01'),true);
assert.equal(isBetaUpcomingLab('SITE-018'),true);
assert.equal(isBetaCandidateLab('SITE-018'),false);
assert.equal(isBetaUpcomingLab('SITE-017'),false);
const scope=await scopeRequest({request:new Request('https://site.example/api/lab-beta-scope')});
assert.equal(scope.status,200);
assert.equal(scope.headers.get('cache-control'),'no-store');
const scopeBody=await scope.json();
assert.equal(scopeBody.targetSelected,336);
assert.equal(scopeBody.targetUpcoming,83);
assert.equal(scopeBody.readiness,'candidate_selection_only_not_editorial_or_assessment_approval');
assert.equal(scopeBody.selectedForPrebeta.length,336);
assert.equal(scopeBody.upcoming.length,83);
assert(!JSON.stringify(scopeBody).includes('answer_key'));
const scopePost=await scopeRequest({request:new Request('https://site.example/api/lab-beta-scope',{method:'POST'})});
assert.equal(scopePost.status,405);


const originalFetch=globalThis.fetch;
const candidate='F1-C02-L01';
const draft='F1-C02-L02';
const upcoming='SITE-018';
const canonical='F2-C02-L01';
const empty='F2-C02-L02';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test_only'};
function mockFetch(url){
 const u=new URL(url);
 let data;
 if(u.pathname.endsWith('/platform_labs')) data=[
   {lab_id:candidate,active:true,registry_visible:true},
   {lab_id:draft,active:true,registry_visible:true},
   {lab_id:canonical,active:true,registry_visible:true,
    what:'This case uses an issuer announcement instead of social speculation.',
    why:'Time-stamping the original filing matters when interpreting market reactions.',
    objective:'Find the original disclosure and state the time boundary.',
    how:['Read the source announcement','Compare exchange trading sessions','Record uncertainty and risk']},
   {lab_id:empty,active:true,registry_visible:true},
   {lab_id:upcoming,active:true,registry_visible:true}
 ];
 else if(u.pathname.endsWith('/lab_instruction_v014')) data=[
   {lab_id:candidate,source_status:'editorially_reviewed_v1'},
   {lab_id:draft,source_status:'original_hypothetical_unreviewed_v01496',...{lesson_batch:'2026-10-25-B01',
   authoring_status:'ORIGINAL_AUTHORED_EDUCATIONAL_DRAFT_NOT_EDITORIALLY_OR_GRADING_ACCEPTED',
   concept:'A sourced trading observation',
   objective:'Explain what source confirms a hypothetical catalyst',
   why:'A screenshot may misidentify an issuer and omit the financial-reporting period.',
   steps:['Identify the original issuer and publication date','Compare timestamps before making a decision','Explain the evidence that would invalidate the claim']}},
   {lab_id:upcoming,source_status:'original_hypothetical_unreviewed_v01496',...{lesson_batch:'2026-10-25-B01',
   authoring_status:'ORIGINAL_AUTHORED_EDUCATIONAL_DRAFT_NOT_EDITORIALLY_OR_GRADING_ACCEPTED',
   concept:'A sourced trading observation',
   objective:'Explain what source confirms a hypothetical catalyst',
   why:'A screenshot may misidentify an issuer and omit the financial-reporting period.',
   steps:['Identify the original issuer and publication date','Compare timestamps before making a decision','Explain the evidence that would invalidate the claim']}}
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
 assert.deepEqual(body.guidedBetaIds,[draft,canonical].sort(), 'Authored private and canonical study must open for Guided Beta without official grade approval');
 assert(!body.guidedBetaIds.includes(upcoming),'No future SITE Lab should receive a beta Start');
 assert(!body.guidedBetaIds.includes(empty),'A selected Lab without any teaching source is not silently launched');
 assert.equal(body.guidedBetaPolicy,'ungraded_existing_private_or_canonical_teaching_no_mastery');
 assert(!JSON.stringify(body).includes('A sourced trading observation'),'Public listing must never return private lesson text');
 assert(!JSON.stringify(body).includes('authoring_status'),'Public response returns only eligible Lab IDs');
 const client=await import('node:fs').then(x=>x.readFileSync('assets/js/labs.js','utf8'));
 assert(client.includes("Open guided beta practice (ungraded)"));
 assert(client.includes("!publishedAssessments.has(labId)"),'Ungraded beta may not unlock progress/graded credit control');
 const registry=(await import('node:fs')).readFileSync('assets/js/lab-registry.js','utf8');
 assert(registry.includes('Open Guided Beta · Ungraded'),'The member registry must expose beta practice as a clickable item');
 assert(registry.includes('guidedBetaLabs?.has(l.lab_id)'),'Candidate beta links must be driven by the API, not by calendar position');

 assert.equal(body.betaReadyCertified,false, 'Public endpoint cannot certify beta readiness');

 globalThis.fetch=async()=>new Response('Database unavailable',{status:503});
 const failed=await onRequest({request:new Request('https://site.example/api/lab-release-availability'),env});
 assert.equal(failed.status,503,'Database outage must fail closed');
 assert.deepEqual((await failed.json()).publishedIds,undefined);

 const unauthorized=await onRequest({request:new Request('https://site.example/api/lab-release-availability',{method:'POST'}),env});
 assert.equal(unauthorized.status,405);
 console.log('PASS: 336/83 beta scope, reviewed-only Start, draft denial, 503 fail closed, 405 method rejection');
}finally{globalThis.fetch=originalFetch;}
