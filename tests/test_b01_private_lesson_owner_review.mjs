// B01 private teaching source approval uses existing authenticated Owner API.
// This fixture sends no real auth request and never inserts/approves production rows.
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/training-editor.js';
import {readFileSync} from 'node:fs';
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_SECRET_KEY:'secret',SUPABASE_PUBLISHABLE_KEY:'public'};
const id='F1-C02-L01',revision='2026-10-26 06:17:42.056045+00';
const teaching={
 id,lessonBatch:'2026-10-25-B01',
 objective:'Set up an exact blind historical replay with a documented source and observation boundary.',
 what:'A replay is a strictly bounded historical chart observation, not a view of future completed bars.',
 why:'Explicit data provenance, market session and timestamps make a decision independently reproducible.',
 when:'Use historical replay only after the chosen data source and its labeling convention are verified.',
 limitation:'This fictional case cannot identify real trade execution, hidden market participants or future outcomes.',
 commonError:'Treating a known historical date as if that automatically verifies data accuracy or replay blindness.',
 workedExample:'FICTIONAL: A five-minute candle starts at 09:40 ET and ends at 09:45 ET. At the 09:45 decision pause, check the provider convention before concluding the candle was available.',
 historicalEvidence:'NOT VERIFIED: all values are FICTIONAL exercises, never an authentic market history or licensed quote feed.',
 steps:[
  'Choose the exact observation date, ticker, exchange session and reference source.',
  'Verify the provider convention for candle timestamps and completion state.',
  'Hide later candles and record the declared decision time before reasoning.',
  'Explain the available evidence and name what the chart still cannot prove.'
 ],
 questions:['Explain what can be known at the pause.'],
 teaching:{how:['Check the source and timezone.','Set the pause boundary.','Check completed candle labels.','Record evidence.']}
};
let reviewer=true,mutate=false,lesson=teaching,source='original_hypothetical_unreviewed_v01496',patches=0;
const old=globalThis.fetch;
const asJson=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,init={})=>{
 const u=new URL(String(url)),pathname=u.pathname;
 if(pathname==='/auth/v1/user')return asJson({id:actor});
 if(pathname==='/rest/v1/profiles')return asJson([{account_kind:'member'}]);
 if(pathname==='/rest/v1/admin_user_roles')return asJson(reviewer?[{role_code:'OWNER',expires_at:null}]:[]);
 if(pathname==='/rest/v1/admin_user_flags')return asJson([{status:'active'}]);
 if(pathname==='/rest/v1/lab_instruction_v014'){
  if(init.method==='GET')return asJson([{
   lab_id:id,updated_at:revision,source_status:source,reviewed_at:null,content:lesson
  }]);
  if(init.method==='PATCH'){
   assert.equal(u.searchParams.get('source_status'),'eq.original_hypothetical_unreviewed_v01496');
   assert.equal(u.searchParams.get('updated_at'),'eq.'+revision);
   const data=JSON.parse(init.body);
   assert.equal(data.reviewed_by,actor);
   assert.equal(data.source_status,'editorially_reviewed_educational_illustrative_b01_v1');
   assert(data.reviewed_at);
   patches++;return asJson([{lab_id:id}]);
  }
 }
 throw Error('Unexpected source fetch: '+pathname);
};
const get=()=>onRequest({env,request:new Request('https://site.test/api/training-editor?action=lesson-status&labId='+id,{headers:{authorization:'Bearer owner'}})});
const review=expectedUpdatedAt=>onRequest({env,request:new Request('https://site.test/api/training-editor?action=review-lesson',{
 method:'POST',headers:{authorization:'Bearer owner','origin':'https://site.test','content-type':'application/json'},
 body:JSON.stringify({labId:id,expectedUpdatedAt,confirmPhrase:'REVIEW B01 PRIVATE LESSON'})
})});
try{
 let r=await get();assert.equal(r.status,200);
 const safe=await r.json();assert.equal(safe.substantivePrecheck,true);
 assert(!JSON.stringify(safe).includes(teaching.workedExample),'Private source must remain server-only');
 r=await review('stale');assert.equal(r.status,409);assert.equal(patches,0);
 lesson={...teaching,steps:['Short']};
 r=await review(revision);assert.equal(r.status,409,'Missing substantive instruction must fail');
 assert.equal(patches,0);
 lesson=teaching;
 reviewer=false;r=await review(revision);assert.equal(r.status,403,'Non-OWNER review must be forbidden');reviewer=true;
 r=await review(revision);assert.equal(r.status,200,'Exact authorized lesson should be eligible');
 assert.equal(patches,1);
 source='editorially_reviewed_educational_illustrative_b01_v1';
 r=await review(revision);assert.equal(r.status,409,'Never reapprove previously approved lesson');
 const ui=readFileSync('assets/js/training-editor.js','utf8');
 assert(ui.includes("api('review-lesson'"),'Review action missing from existing Owner interface');
 const html=readFileSync('training-editor.html','utf8');
 assert(html.includes('author-lesson-review-approve'));
 const migration=readFileSync('supabase/migrations/v0.14.0.281_b01_private_lesson_review.sql','utf8');
 const rollback=readFileSync('supabase/rollbacks/v0.14.0.281_b01_private_lesson_review_ROLLBACK.sql','utf8');
 for(const rule of ['SECURITY DEFINER','SET search_path=pg_catalog','LAB_PRIVATE_LESSON_REVIEW_APPROVED',
  'REVOKE ALL ON FUNCTION','CREATE TRIGGER gu_v014281_lesson_review_audit']){
  assert(migration.includes(rule),'Production lesson audit DDL missing '+rule);
 }
 assert(!migration.includes('answer_key'));
 assert(!migration.includes('DELETE FROM'));
 assert(rollback.includes('DROP TRIGGER IF EXISTS gu_v014281_lesson_review_audit'));
 assert(!rollback.includes('DROP TABLE')&&!rollback.includes('DROP COLUMN'));
 console.log('PASS B01 teaching review: Owner-only, private source redacted, CAS enforced, and non-destructive audit rollback.');
}finally{globalThis.fetch=old}
