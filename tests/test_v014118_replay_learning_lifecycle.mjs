// v0.14.0.118 — route contract + source invariants; real PostgreSQL in CI separately.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest as reviewAPI} from '../functions/api/journal-replay-review-v014118.js';
import {onRequest as skillsAPI} from '../functions/api/competencies.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/v0.14.0.118_REPLAY_LIFECYCLE_OWNER_REVIEW_REQUIRED.sql');
for(const fragment of [
 'v01494_replay_finish_to_journal','gu_v014118_replay_lock_integrity',
 'gu_v014118_replay_journal_guard','gu_v014118_review_transaction',
 'gu_v014118_replay_review_note_guard','gu_v014118_protect_replay_review',
 'gu_replay_journal_links_v01494','public.journal_reviews',
 'ON CONFLICT (journal_id,review_stage) DO NOTHING',
 'FOR UPDATE','FOR SHARE','originalSynthetic',
 'outcomeVerified',"'graded',false",'REVOKE ALL ON FUNCTION',
 'TO service_role','p_action',"'lock','reveal','complete'",
 'NOTIFY pgrst', 'COMMIT;'
])assert(sql.includes(fragment),'Missing lifecycle invariant: '+fragment);
assert(!/INSERT\s+INTO\s+public\.competency_evidence/i.test(sql));
assert(!/INSERT\s+INTO\s+public\.lab_attempts/i.test(sql));
assert(!/SET\s+net_pnl\s*=/.test(sql));
const replay=read('functions/api/learning-replay-v01492.js');
assert(replay.includes('bar_index=lte.')&&replay.includes('rpc/v01492_replay_advance'));
assert(replay.includes("GU_REPLAY_JOURNAL_V01494_ENABLED==='true'"));
assert(read('assets/js/journal-entry.js').includes('journal-replay-reflection'));
assert(read('assets/js/review-queue.js').includes("replayAPI('lock'"));
assert(read('assets/js/review-queue.js').includes("replayAPI('reveal'"));
assert(read('assets/js/review-queue.js').includes("replayAPI('complete'"));
assert(read('assets/js/skills.js').includes('replayLearningActivity'));
assert(read('functions/api/competencies.js').includes('competencyGradesAwarded:0'));

const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://fake.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock'};
let allowed=true,role='member',state=[],lockNote=null,revealed=false,done=false;
let reviewerWrites=0;
const original=globalThis.fetch;
const respond=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,init={})=>{
 const path=String(url),method=init.method||'GET';
 if(path.endsWith('/auth/v1/user'))return respond({id:user});
 if(path.includes('/rest/v1/profiles?'))return respond([{account_kind:role}]);
 if(path.includes('/rest/v1/admin_user_flags?'))return respond([{status:'active'}]);
 if(path.includes('/rest/v1/admin_user_roles?'))return respond([]);
 if(path.includes('/rest/v1/rpc/user_has_tool_access'))return respond(allowed);
 if(path.includes('/rest/v1/gu_replay_review_locks_v014118?'))return respond(state);
 if(path.includes('/rest/v1/gu_replay_journal_links_v01494?'))
  return respond([{session_id:'11111111-1111-4111-8111-111111111111',journal_id:20}]);
 if(path.includes('/rest/v1/rpc/gu_v014118_review_transaction')){
  reviewerWrites++;assert.equal(method,'POST');
  assert.equal(init.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(init.headers.authorization,undefined,'Opaque secret cannot be sent as bearer');
  const x=JSON.parse(init.body);
  assert.equal(x.p_actor,user);
  if(x.p_review!==4)return respond({message:'review unavailable'},400);
  if(x.p_action==='lock'){
   if(!lockNote)lockNote=x.p_note;
   state=[{review_id:4,journal_id:20,pre_reveal_note:lockNote,locked_at:'2026-10-20T00:00:00Z',revealed_at:revealed?'2026-10-20T01:00:00Z':null,completed_at:done?'2026-10-20T02:00:00Z':null}];
   return respond({ok:true,locked:true,alreadyLocked:lockNote!==x.p_note,revealed});
  }
  if(x.p_action==='reveal'){
   if(!lockNote)return respond({message:'Lock before reveal'},400);
   revealed=true;return respond({ok:true,locked:true,revealed:true});
  }
  if(x.p_action==='complete'){
   if(!revealed)return respond({message:'Reveal first'},400);
   done=true;state[0].completed_at='2026-10-20T02:00:00Z';
   return respond({ok:true,completed:true});
  }
 }
 if(path.includes('/rest/v1/competency_definitions?'))return respond([{
  competency_code:'CHART_STRUCTURE',name:'Chart Structure',category:'Chart',
  pass_score:80,mastery_score:90,minimum_evidence:12,metadata:{mastery_pass_streak:3}
 }]);
 if(path.includes('/rest/v1/competency_evidence?'))return respond([]);
 throw Error('Unexpected request '+path);
};
const reviewCall=(action,body=null,token=true,origin='https://course.test')=>{
 const method=['states','access'].includes(action)?'GET':'POST';
 return reviewAPI({env,request:new Request('https://course.test/api/journal-replay-review-v014118?action='+action,{
  method,headers:{...(token?{authorization:'Bearer test-member-token'}:{}),
   ...(method==='POST'?{'content-type':'application/json',origin}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 })});
};
try{
 let res=await reviewCall('access',null,false);assert.equal(res.status,401);
 allowed=false;res=await reviewCall('access');assert.equal(res.status,403);allowed=true;
 role='showcase';res=await reviewCall('access');assert.equal(res.status,403);role='member';
 res=await reviewCall('complete',{reviewId:4,note:'Comparison after later evidence is revealed.'});
 assert.equal(res.status,409,'Cannot complete before locking first notes');
 res=await reviewCall('lock',{reviewId:4,note:'Observe the first bar alone. Do not infer a market fill.'},true,'https://bad.invalid');
 assert.equal(res.status,403);
 res=await reviewCall('lock',{reviewId:4,note:'Too short'});
 assert.equal(res.status,400);
 res=await reviewCall('lock',{reviewId:4,note:'Observe the first bar alone. Do not infer a market fill.'});
 assert.equal(res.status,200);
 res=await reviewCall('lock',{reviewId:4,note:'A completely different attempt to rewrite the prior observation.'});
 assert.equal(res.status,200);
 assert.equal(lockNote,'Observe the first bar alone. Do not infer a market fill.');
 res=await reviewCall('states');let payload=await res.json();
 assert.equal(payload.states[0].preRevealNote,lockNote);
 res=await reviewCall('reveal',{reviewId:4});assert.equal(res.status,200);
 res=await reviewCall('complete',{reviewId:4,note:'The hypothetical next observation supplies no verifiable order-fill evidence.'});
 assert.equal(res.status,200);assert.equal(done,true);
 assert.equal(reviewerWrites,5);
 res=await skillsAPI({env,request:new Request('https://course.test/api/competencies?action=summary',
  {headers:{authorization:'Bearer test-member-token'}})});
 payload=await res.json();assert.equal(res.status,200);
 assert.equal(payload.replayLearningActivity.replaySessionsLinked,1);
 assert.equal(payload.replayLearningActivity.spacedReviewsCompleted,1);
 assert.equal(payload.replayLearningActivity.competencyGradesAwarded,0);
 assert.equal(payload.skills[0].status,'Not Yet Assessed');
 assert.equal(payload.skills[0].evidenceCount,0);
 console.log('PASS v118: private replay review lifecycle, account authorization, frozen pre-reveal note, no fabricated grade and Skills practice reporting.');
}finally{globalThis.fetch=original}
