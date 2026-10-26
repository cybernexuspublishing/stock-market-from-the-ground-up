/* Grading contract regression: local source tests only, no member or provider calls.
 * The production PostgreSQL migration and RLS/grant postflight are separate gates.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261026_grading_partial_credit_critical_errors.sql');
const rollback=read('supabase/rollbacks/20261026_grading_partial_credit_critical_errors_ROLLBACK.sql');
const author=read('functions/api/training-editor.js');
const gradeApi=read('functions/api/interactive-training.js');
const ui=read('assets/js/interactive-training.js');
const skills=read('functions/api/competencies.js');
for(const word of [
 'GRADING_MIGRATION_REQUIRES_REVIEWED_ATTEMPT_RECONCILIATION',
 'GRADING_MIGRATION_ALREADY_INSTALLED',
 'partialTolerance','partialCreditPct','criticalOnWrong',
 'creditFraction','criticalErrors',
 'critical_error_unresolved',
 "WHERE a.user_id=p_actor AND a.mode='assessment'",
 "IF a.mode IS DISTINCT FROM 'assessment'",
 "CREATE OR REPLACE FUNCTION public.v014_training_answer",
 'for update',
]){
 assert(migration.toLowerCase().includes(word.toLowerCase()),'Missing forward protected grading requirement: '+word);
}
assert.match(migration,/BEGIN;[\s\S]*COMMIT;/);
assert.match(rollback,/BEGIN;[\s\S]*COMMIT;/);
assert.match(rollback,/ROLLBACK_REQUIRES_INDEPENDENT_GRADE_RECONCILIATION/);
assert(!rollback.includes("partialTolerance=coalesce"),'Rollback must restore original binary scoring');
assert(migration.includes("'answer',s.answer_key"),'Private persisted report retains immutable key for audit');
assert(gradeApi.includes('function memberReport(raw)'));
assert(gradeApi.includes('creditFraction:'));
assert(gradeApi.includes('criticalError:entry?.criticalError===true'));
assert(!gradeApi.includes('report:attempt.completed_at?attempt.report:null'));
assert(!gradeApi.includes('return reply({...r,knowledgeSync'));
assert(!ui.includes('esc(x.answer)'),'Client never prints a protected correct answer');
assert(ui.includes('Partial credit:'));
assert(ui.includes('Critical risk or decision error:'));
assert(author.includes('partialCreditPct')&&author.includes('partialTolerance'));
assert(author.includes('criticalOnWrong'));
assert(skills.includes('latestCompleteClear'));
assert(skills.includes('m.independent===true'));
assert(skills.includes('unseen&&!x.independent'));
assert(skills.includes('independentAssessments:independentTries.length'));
assert(skills.includes("status==='Proficient'")||skills.includes("return'Proficient'"));
console.log('PASS grading source: protected keys, server-defined partial credit, critical-error evidence guard, rollback');
