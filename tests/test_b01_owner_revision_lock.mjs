// Gate 1: Owner-only rubric update must use a precise DB revision.
// All backend calls are local fixtures. No real accounts, grades or keys.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/training-editor.js';
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture',SUPABASE_SECRET_KEY:'fixture'};
let reviewState='draft',rev='2026-10-26 06:17:42.056045+00',simultaneous=false,writes=0;
const old=globalThis.fetch, reply=x=>new Response(JSON.stringify(x),{headers:{'content-type':'application/json'}});
const questions=[
 {id:'EVIDENCE',kind:'choice',prompt:'Which completed candle is visible?',options:['The last completed bar','An unrevealed future bar'],explanation:'The last bar belongs to known evidence while the following bar remains unrevealed.'},
 {id:'ORIGINAL_MATH',kind:'number',prompt:'FICTIONAL: Multiply two by four.',tolerance:0,explanation:'Two multiplied by four equals eight in this separate illustrative exercise.'}
];
globalThis.fetch=async(raw,opts={})=>{
 const u=new URL(String(raw)),p=u.pathname;
 if(p==='/auth/v1/user')return reply({id:actor});
 if(p==='/rest/v1/profiles')return reply([{account_kind:'member'}]);
 if(p==='/rest/v1/admin_user_roles')return reply([{role_code:'OWNER',expires_at:null}]);
 if(p==='/rest/v1/admin_user_flags')return reply([{status:'active'}]);
 if(p==='/rest/v1/lab_training_sets_v014'){
  if(opts.method==='GET')return reply([{version:97,review_state:reviewState,source_status:'book_authored_unverified_market',updated_at:rev}]);
  if(opts.method==='PATCH'){
   assert.equal(u.searchParams.get('review_state'),'eq.draft','Never overwrite reviewed content');
   assert.equal(u.searchParams.get('updated_at'),'eq.'+rev,'Must lock exact DB revision');
   if(simultaneous)return reply([]);
   writes++;return reply([{lab_id:'LAB_B',version:97,updated_at:'2026-10-26 06:19:00+00'}]);
  }
 }
 throw Error('Unexpected network fixture '+p);
};
const submit=expectedUpdatedAt=>onRequest({env,request:new Request('https://site.test/api/training-editor?action=draft',{
 method:'POST',headers:{authorization:'Bearer owner','origin':'https://site.test','content-type':'application/json'},
 body:JSON.stringify({labId:'LAB_B',title:'Original Verified Lesson',questions,
  answerKey:{EVIDENCE:'The last completed bar',ORIGINAL_MATH:8},expectedUpdatedAt})})});
try{
 let r=await submit(undefined);assert.equal(r.status,409,'Missing original version must fail');
 r=await submit('2026-10-25 00:00:00+00');assert.equal(r.status,409,'Stale version must fail');
 assert.equal(writes,0);
 simultaneous=true;r=await submit(rev);assert.equal(r.status,409,'Race during database PATCH must fail');
 assert.equal(writes,0);
 simultaneous=false;r=await submit(rev);assert.equal(r.status,200,'Correct unchanged version must save');
 assert.equal((await r.json()).updatedAt,'2026-10-26 06:19:00+00');
 reviewState='reviewed';r=await submit(undefined);assert.equal(r.status,409,'Old edit cannot revert a reviewed version');
 assert.equal(writes,1);
 const client=readFileSync('assets/js/training-editor.js','utf8');
 for(const token of ['editorRevision=s.updated_at||null','expectedUpdatedAt:editorRevision','editorRevision=r.updatedAt||null'])
  assert(client.includes(token),'UI must carry server revision '+token);
 console.log('PASS Gate 1 Owner editor denies missing, stale, concurrently changed, and reviewed drafts.');
}finally{globalThis.fetch=old}
