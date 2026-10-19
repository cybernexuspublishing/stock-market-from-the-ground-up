// v0.14.0.95 | Existing training, tutor, replay safety contracts.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest as training} from '../functions/api/interactive-training.js';
import {onRequest as tutor} from '../functions/api/market-tutor-v01492.js';
const member='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://fake.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const previous=globalThis.fetch, calls=[];
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
let attemptsAvailable=true;
globalThis.fetch=async(url,options={})=>{
 const path=String(url);calls.push({path,options});
 if(path.endsWith('/auth/v1/user'))return json({id:member});
 if(path.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(path.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(path.includes('/rpc/user_has_tool_access'))return json(true);
 if(path.includes('/decision_journal?'))return json([{mistakes:['Poor stop placement']}]);
 if(path.includes('/lab_attempts?'))return json([]);
 if(path.includes('/lab_training_attempts_v014?'))return attemptsAvailable?json([
  {lab_id:'F1-C02-L01',score:45,completed_at:'2026-10-19T20:00:00Z'},
  {lab_id:'F1-C02-L01',score:90,completed_at:'2026-10-18T20:00:00Z'},
  {lab_id:'F2-C01-L01',score:85,completed_at:'2026-10-19T18:00:00Z'},
  {lab_id:'F3-C01-L01',score:0,completed_at:'2026-10-19T18:00:00Z'}
 ]):json({message:'not installed'},404);
 if(path.includes('/lab_instruction_v014?'))return json([{book_number:1}]);
 if(path.includes('/lab_training_sets_v014?'))return json([{lab_id:'F1-C02-L01',review_state:'reviewed',source_status:'book_authored_unverified_market',
   questions:[{id:'Q',prompt:'Private reviewed prompt'}]}]);
 throw Error('Unexpected request '+path);
};
try{
 const req=new Request('https://site.example/api/market-tutor-v01492',{method:'POST',
  headers:{authorization:'Bearer valid-user','content-type':'application/json'},
  body:JSON.stringify({mode:'practice',question:'What should I practice next?'})});
 let resp=await tutor({request:req,env}),body=await resp.json();
 assert.equal(resp.status,200);
 assert.equal(body.gradedHistoryAvailable,true);
 assert.equal(body.recordedAssessmentCount,3);
 assert.deepEqual(body.gradedReview.map(x=>x.labId),['F3-C01-L01','F1-C02-L01']);
 assert.equal(body.gradedReview[1].latestRecordedScore,45);
 assert.equal(body.masteryAwarded,false);
 assert(!JSON.stringify(body).includes('Private reviewed prompt'));
 attemptsAvailable=false;resp=await tutor({request:req,env});body=await resp.json();
 assert.equal(resp.status,200);assert.equal(body.gradedHistoryAvailable,false);
 assert(body.recommendations.some(x=>x.topic==='Poor stop placement'));
 resp=await training({request:new Request(
  'https://site.example/api/interactive-training?action=available&labId=F1-C02-L01',
  {headers:{authorization:'Bearer valid-user'}}),env});
 const state=await resp.json();assert.equal(resp.status,200);assert.equal(state.available,true);
 for(const {path,options} of calls.filter(c=>c.path.includes('/rest/v1/'))){
  assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY,path);
  assert.equal(options.headers.authorization,undefined,'Opaque sb_secret_* MUST NOT be used as a JWT');
 }
 const sql=readFileSync(new URL('../supabase/migrations/v0.14.0.95_REPLAY_GUARDRAILS_OWNER_REVIEW_REQUIRED.sql',import.meta.url),'utf8');
 for(const clause of ['FOR UPDATE','FOR SHARE','next_at<=current_at','v01495_guard_published_replay_bars','gu_replay_published_immutability_v01495','licensed_for_member_display','evidence_verified','DROP TRIGGER IF EXISTS']){
  assert(sql.includes(clause),'Replay safety invariant missing: '+clause);
 }
 assert(!/CREATE TABLE |INSERT INTO public.gu_replay_bars_v01492/i.test(sql),'Upgrade must not recreate existing tables or fabricate market bars');
 console.log('PASS v95: opaque service key compatibility; existing graded lesson remediation; no private keys; immutable/chronological replay SQL safety.');
}finally{globalThis.fetch=previous}
