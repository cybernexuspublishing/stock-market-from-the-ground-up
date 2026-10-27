import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('assets/js/lab-journey-checkpoint-v33.js','utf8');
const context={globalThis:{},console};
vm.runInNewContext(source,context,{timeout:2000});
const checkpoint=context.globalThis.GroundUpLabJourneyCheckpointV33;
const member='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',labId='F2-C06-L01';
const snap=(mode,stage=0)=>({
 version:1,mode,stage,observations:'Original fictional chart evidence',prediction:'',
 predictionLocked:false,practice:'',practiceCount:0,practiceResolved:false,
 practiceAssisted:false,transfer:'',transferCount:0,transferResolved:false,
 selfReview:false,reflection:'',learnerReplies:[]
});
let stored=null,writes=0,alive=true;
const sb={
 from(name){
  assert.equal(name,'site_lab_progress');
  return{select(col){assert.equal(col,'responses');return {
   eq(key,value){assert(['user_id','lab_id'].includes(key));assert(key==='user_id'?value===member:value===labId);
    return {eq(key2,value2){assert.equal(key2,'lab_id');assert.equal(value2,labId);return {
     maybeSingle:async()=>({data:stored?{responses:{learning_journey_v33:stored}}:null,error:null})
    }}}}
  }}}
 },
 async rpc(name,args){
  assert.equal(name,'gu_v33_save_lab_journey');
  assert.equal(args.p_lab,labId);
  const rev=stored?.rev||0;writes++;
  if(args.p_expected_revision!==rev)return {data:null,error:{code:'40001'}};
  const modes=stored?.version===2?{...stored.modes}:
   stored?.mode?{[stored.mode]:Object.fromEntries(Object.entries(stored).filter(([k])=>k!=='rev'))}:{};
  const saved={version:2,rev:rev+1,modes:{...modes,[args.p_checkpoint.mode]:args.p_checkpoint}};
  stored=saved;return {data:{ok:true,saved},error:null};
 }
};
const make=(mode)=>checkpoint.create({sb,userId:member,labId,mode,alive:()=>alive});
const guided=make('guided');
assert.equal(await guided.load(),null);
await guided.save(snap('guided',2));
assert.equal(stored.modes.guided.stage,2);
const practice=make('practice');
assert.equal(await practice.load(),null);
await practice.save(snap('practice',1));
assert.equal(stored.modes.guided.stage,2,'Guided stage survived Practice save');
assert.equal(stored.modes.practice.stage,1);
const guidedElsewhere=make('guided');
assert.equal((await guidedElsewhere.load()).stage,2);
await guidedElsewhere.save(snap('guided',3));
assert.equal(stored.modes.practice.stage,1,'Practice mode survives other-device Guided update');
await assert.rejects(()=>guided.save(snap('guided',4)),/Another device or tab saved a newer draft/);
assert.equal(stored.modes.guided.stage,3,'Stale tab does not overwrite newer learning state');
alive=false;
await assert.rejects(()=>practice.save(snap('practice',2)),/Member account changed/);
assert.equal(stored.modes.practice.stage,1,'Signed-out session cannot save work');
alive=true;
// The actual legacy flat v1 member record must be migrated in place, not lost.
const old={...snap('guided',2),rev:9};
stored=old;
const newPractice=make('practice');
assert.equal(await newPractice.load(),null,'No prior Practice version yet');
await newPractice.save(snap('practice',2));
assert.equal(stored.rev,10,'Shared CAS must use legacy parent revision');
assert.equal(stored.modes.guided.stage,2);
assert.equal(stored.modes.practice.stage,2);
const reloaded=make('guided');
assert.equal((await reloaded.load()).stage,2,'Legacy Guided lesson survives migration');
assert.equal(reloaded.load!==undefined,true);
const sql=readFileSync('supabase/migrations/20261027_lab_journey_v33_dual_mode_atomic_review.sql','utf8');
for(const required of ["v_prior->'modes'","v_prior->>'mode'","jsonb_build_object('version',2",
 "jsonb_set(v_modes,ARRAY[p_checkpoint->>'mode']","p_expected_revision+1",
 "IF coalesce(v_current_revision,0)<>p_expected_revision",
 "stage evidence is incomplete","site_lab_progress","SECURITY INVOKER"])
 assert(sql.toLowerCase().includes(required.toLowerCase()),'Missing SQL invariant '+required);
const rollback=readFileSync('supabase/rollbacks/20261027_lab_journey_v33_dual_mode_atomic_ROLLBACK.sql','utf8');
assert(rollback.includes('IF EXISTS (SELECT 1 FROM public.site_lab_progress'));
assert(rollback.includes("RAISE EXCEPTION"));
console.log('PASS dual-mode checkpoint: separate Guided/Practice persisted, legacy v1 retained, cross-device CAS protected, logout stops writes, strict rollback gate.');
