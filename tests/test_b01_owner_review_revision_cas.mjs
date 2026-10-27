/* Owner rubric approval must review EXACT version and timestamp from its Owner GET.
 * Synthetic fixtures only: no protected keys, real member records or promotions.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/training-editor.js';
const api=readFileSync(new URL('../functions/api/training-editor.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../assets/js/training-editor.js',import.meta.url),'utf8');
assert(api.includes("String(set.updated_at)!==expected"),'Reject stale Owner UI revision');
assert(api.includes("'&review_state=eq.draft&updated_at=eq.'+enc(expected)"),'CAS must use the specific Owner-inspected revision');
assert(ui.includes('expectedUpdatedAt:editorRevision'),'Owner UI must supply loaded timestamp');
assert(ui.includes("if(!editorRevision)"),'No approval without source revision');

const id='F1-C02-L01',stamp='2026-10-27T10:00:00.123456Z';
const env={SUPABASE_URL:'https://fixture.invalid',SUPABASE_PUBLISHABLE_KEY:'public',SUPABASE_SECRET_KEY:'fixture-only-secret'};
let updated=0,owner=true,revision=stamp,seenReviewPath='';
const answer=(b,status=200)=>new Response(JSON.stringify(b),{status,headers:{'content-type':'application/json'}});
const original=globalThis.fetch;
globalThis.fetch=async(target,options={})=>{
 const url=new URL(String(target));
 if(url.pathname==='/auth/v1/user')return answer({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
 if(url.pathname==='/rest/v1/profiles')return answer([{account_kind:'member'}]);
 if(url.pathname==='/rest/v1/admin_user_roles')return answer(owner?[{role_code:'OWNER',expires_at:null}]:[]);
 if(url.pathname==='/rest/v1/admin_user_flags')return answer([]);
 if(url.pathname==='/rest/v1/lab_training_sets_v014'&&options.method==='PATCH'){
  seenReviewPath=url.search;
  if(!url.searchParams.get('updated_at')?.endsWith(revision)||!owner)return answer([]);
  updated++;return answer([{lab_id:id,version:97}]);
 }
 if(url.pathname==='/rest/v1/lab_training_sets_v014')
  return answer([{lab_id:id,version:97,review_state:'draft',updated_at:revision,
    source_status:'original_hypothetical_b01_individual_review_pending_v01497',
    questions:[],answer_key:{}}]);
 throw Error('Unexpected fixture path '+url.pathname);
};
async function request(expectedUpdatedAt){
 return onRequest({env,request:new Request('https://site.test/api/training-editor?action=review',{
  method:'POST',headers:{authorization:'Bearer genuine-owner-fixture-only',origin:'https://site.test','content-type':'application/json'},
  body:JSON.stringify({labId:id,version:97,title:'Unpublished fictional review',
   expectedUpdatedAt,confirmPhrase:'REVIEW BOOK RUBRIC'})})});
}
try{
 let response=await request(undefined);
 assert.equal(response.status,409);assert.equal(updated,0);
 response=await request('2026-10-27T09:59:59.999999Z');
 assert.equal(response.status,409);assert.equal(updated,0);
 const err=await response.json();assert.match(err.error,/changed after it was loaded/i);
 response=await request(stamp);
 assert.notEqual(response.status,409,'Exact timestamp moves to normal authored-content checks, not stale rejection');
 assert.equal(updated,0,'Invalid synthetic questions cannot be approved');
 assert.equal(seenReviewPath,'','Malformed content must be refused before PATCH');
 owner=false;
 response=await request(stamp);assert.equal(response.status,403);
 assert.equal(updated,0);
}finally{globalThis.fetch=original;}
console.log('PASS Owner assessment publication: requires original inspected timestamp, stale view blocked, invalid content denied, no Member/Owner bypass.');
