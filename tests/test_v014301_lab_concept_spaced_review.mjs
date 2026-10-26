import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const source=read('assets/js/lab-concept-reviews.js');
const scope={window:{},document:{addEventListener(){}}};
runInNewContext(source,scope);
const prompts=['1D','7D','30D'].map(review_stage=>
 scope.window.GroundUpLabConceptRecall.prompt({lab_id:'F1-C02-L01',review_stage}));
assert.equal(new Set(prompts).size,3);
assert(prompts[1].includes('Different fictional case'));
assert(prompts[2].includes('Independent transfer'));
const sql=read('supabase/migrations/v0.14.0.303_LAB_CONCEPT_SPACED_REVIEW_OWNER_REVIEW_REQUIRED.sql');
for(const control of ["review_stage IN ('1D','7D','30D')",'ENABLE ROW LEVEL SECURITY',
 'FOR SELECT TO authenticated','ON CONFLICT(user_id,lab_id,review_stage) DO NOTHING',
 'AND due_at<=now()','char_length(btrim(p_note)) NOT BETWEEN 30 AND 1500']){
 assert(sql.includes(control),control);
}
assert(!sql.includes('competency_evidence'),'Recall cannot award mastery');
assert(!sql.includes('lab_training_attempts'),'Recall cannot alter grades');
const rollback=read('supabase/rollbacks/v0.14.0.303_LAB_CONCEPT_SPACED_REVIEW_ROLLBACK.sql');
assert(rollback.includes('Lab recall records exist'),'Rollback must refuse member-data deletion');
assert(source.includes("sb.rpc('gu_lab_concept_review_complete_v014'"));
assert(source.includes('if(thisEpoch!==epoch)return'));
assert(read('assets/js/lab-engine-v32-universal.js').includes("if(stage===8&&typeof recallScheduler==='function')"));
assert(read('assets/js/lab-player.js').includes('recallScheduler:scheduleLabConceptRecall'));
assert(read('skills.html').includes('id="lab-concept-review"'));
console.log('PASS 1/7/30 recall prompts, RLS, no scoring, safe rollback, integration.');
