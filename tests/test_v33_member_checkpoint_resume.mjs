/* Genuine first-party checkpoint client executed with isolated mocked Supabase.
 * Persistence integration uses existing site_lab_progress and a SECURITY INVOKER
 * authenticated RPC. Mocked network is NOT an authenticated production journey.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const source=read('assets/js/lab-journey-checkpoint-v33.js');
const {globalThis:root}={globalThis:{}};
vm.runInNewContext(source,{globalThis:root},{filename:'lab-journey-checkpoint-v33.js',timeout:2000});
const checkpoint=root.GroundUpLabJourneyCheckpointV33;
assert.equal(typeof checkpoint.create,'function');
const ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lab='F2-C07-L01';
const input={
 version:1,mode:'guided',stage:4,observations:'Visible candle high and low',
 prediction:'The next observation might invalidate the thesis',
 predictionLocked:true,practice:'50',practiceCount:2,practiceResolved:true,
 practiceAssisted:true,transfer:'37.5',transferCount:0,transferResolved:true,
 selfReview:true,reflection:'Review my first calculation',
 learnerReplies:[[2,['Changes the real body']],[4,['50']]],rubric:'FORBIDDEN',
 score:100,masteryAwarded:true,correctAnswer:'PRIVATE MUST NEVER BE SAVED'
};
const cleaned=checkpoint.normalize(input,'guided');
assert(cleaned,'Valid guided input');
assert.equal(cleaned.stage,4);
assert(!('rubric' in cleaned)&&!('score' in cleaned)&&
 !('masteryAwarded' in cleaned)&&!('correctAnswer' in cleaned));
assert.equal(checkpoint.normalize({...input,mode:'assessment'},'assessment'),null);
assert.equal(checkpoint.normalize({...input,stage:9},'guided'),null);
assert.equal(checkpoint.normalize({...input,stage:-1},'guided'),null);
assert.equal(checkpoint.normalize({...input,stage:'8'},'guided'),null);
assert.equal(checkpoint.normalize({...input,mode:'practice'},'guided'),null);
assert.equal(checkpoint.normalize(null,'guided'),null);
let accountActive=true,db={responses:{q1:'Older site Lab response'}},calls=0,maxConcurrent=0,concurrent=0;
const sb={
 from(table){
  assert.equal(table,'site_lab_progress');
  return {select(cols){assert.equal(cols,'responses');
   return {eq(key,value){assert.equal(key,'user_id');assert.equal(value,ID);
    return {eq(k,v){assert.equal(k,'lab_id');assert.equal(v,lab);
     return {async maybeSingle(){return {data:JSON.parse(JSON.stringify(db)),error:null}}}}}}}}
  }
 },
 async rpc(name,parameters){
  assert.equal(name,'gu_v33_save_lab_journey');
  assert.equal(parameters.p_lab,lab);
  assert(!('rubric' in parameters.p_checkpoint));
  calls++;concurrent++;maxConcurrent=Math.max(maxConcurrent,concurrent);
  await new Promise(resolve=>setTimeout(resolve,2));
  const lastRev=db.responses.learning_journey_v33?.rev||0;
  if(lastRev!==parameters.p_expected_revision){
   concurrent--;return {data:null,error:{code:'40001',message:'stale writer'}};
  }
  const saved={...parameters.p_checkpoint,rev:lastRev+1};
  db.responses={...db.responses,learning_journey_v33:saved};
  concurrent--;return {data:{ok:true,saved},error:null};
 }
};
const store=checkpoint.create({sb,userId:ID,labId:lab,mode:'guided',alive:()=>accountActive});
assert(store);
assert.equal(await store.load(),null);
const first=store.save(input);
const second=store.save({...input,stage:5});
await Promise.all([first,second]);
assert.equal(db.responses.q1,'Older site Lab response','Original Lab reflection must survive checkpoint');
assert.equal(db.responses.learning_journey_v33.stage,5);
assert.equal(maxConcurrent,1,'Queued checkpoint writes must be serialized');
assert.equal(calls,2);
assert.equal(db.responses.learning_journey_v33.rev,2,'Confirmed CAS revisions increment for each distinct write');
const otherTab=checkpoint.create({sb,userId:ID,labId:lab,mode:'guided',alive:()=>accountActive});
await otherTab.load();
await store.save({...input,stage:6});
await assert.rejects(otherTab.save({...input,stage:3}),/newer draft/i,
 'A stale tab cannot overwrite a later learning checkpoint');
assert.equal(db.responses.learning_journey_v33.stage,6);
const resumed=await store.load();
assert.equal(resumed.stage,6);
assert.equal(resumed.practiceCount,2);
assert.equal(resumed.learnerReplies.length,2);
const practiceOnly=checkpoint.create({sb,userId:ID,labId:lab,mode:'practice',alive:()=>accountActive});
assert.equal(await practiceOnly.load(),null,'The practice mode cannot preload guided instructional state');
accountActive=false;
await assert.rejects(store.save({...input,stage:6}),/account changed/i);
assert.equal(calls,4,'Sign-out must block stale writes');
assert.equal(await store.load(),null,'Account swap must not reuse private checkpoint');
assert.equal(checkpoint.create({sb,userId:'bad',labId:lab,mode:'guided'}),null);
const player=read('assets/js/lab-player.js'),engine=read('assets/js/lab-engine-v32-universal.js');
assert(player.includes('progressStore:window.GroundUpLabJourneyCheckpointV33'));
assert(player.includes('labPlayerSessionEpoch===epoch'));
assert(engine.includes('if(sessions.get(target)!==token)return false;'));
assert(engine.includes('saveCheckpointNow()'));
assert(engine.includes('progressStore.load()'));
assert(engine.includes('progressStore.save(checkpoint)'));
assert(engine.includes('Independent competency mastery'));
assert(engine.includes('Not Yet Assessed'));
assert(!source.includes('localStorage'));
const html=read('lab-player.html');
assert(html.indexOf('lab-journey-checkpoint-v33.js')>html.indexOf('lab-engine-v32-universal.js'));
assert(html.indexOf('lab-journey-checkpoint-v33.js')<html.indexOf('assets/js/lab-player.js'));
const sql=read('supabase/migrations/20261027_lab_journey_v33_private_checkpoint.sql');
for(const token of ['SECURITY INVOKER','auth.uid()','site_lab_progress','jsonb_set','ON CONFLICT',
 'learning_journey_v33','REVOKE ALL','GRANT EXECUTE','authenticated','in_progress'])
 assert(sql.includes(token),'Missing private Postgres checkpoint invariant '+token);
assert(sql.includes('p_expected_revision bigint')&&sql.includes("ERRCODE='40001'"));
assert(!sql.includes('UPDATE public.lab_progress'));
assert(!sql.includes('INSERT INTO public.lab_attempts'));
assert(!sql.includes('GRANT EXECUTE ON FUNCTION public.gu_v33_save_lab_journey(text,jsonb) TO anon'));
console.log('PASS v3.3 member progress: 9-stage safe serialization, original response preserved, auth epoch prevents stale writes; never grades or exposes rubric.');
