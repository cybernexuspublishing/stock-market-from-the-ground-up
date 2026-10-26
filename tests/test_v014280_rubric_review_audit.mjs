// Guardrail for the real Supabase rubric review audit migration.
// Production verification separately uses a rolled-back temporary trigger probe.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const migration=readFileSync('supabase/migrations/v0.14.0.280_b01_rubric_review_audit.sql','utf8');
const rollback=readFileSync('supabase/rollbacks/v0.14.0.280_b01_rubric_review_audit_ROLLBACK.sql','utf8');
for(const s of [migration,rollback])assert.match(s,/BEGIN;[\s\S]*COMMIT;/);
for(const s of ['CREATE TRIGGER gu_v014280_rubric_review_audit','AFTER UPDATE OF review_state',
 'SECURITY DEFINER','SET search_path=pg_catalog','public.admin_audit_log',
 "LAB_RUBRIC_REVIEW_APPROVED","LAB_RUBRIC_REVIEW_WITHDRAWN",
 'REVOKE ALL ON FUNCTION','actor_user_id']){
 assert(migration.includes(s),'Rubric audit control missing '+s);
}
for(const s of ['answer_key','questions','reflection','authorization','private_instruction']){
 assert(!migration.includes(s),'Private content or credentials must never be logged');
}
assert(rollback.includes('DROP TRIGGER IF EXISTS gu_v014280_rubric_review_audit'));
assert(rollback.includes('DROP FUNCTION IF EXISTS public.gu_v014280_audit_lab_rubric_review()'));
assert(!rollback.includes('DELETE FROM public.admin_audit_log'),'Audit history must survive rollback');
assert(!rollback.includes('DROP TABLE'),'Rollbacks must not destroy lesson or audit tables');
console.log('PASS v280 rubric review audit migration and safe rollback contract.');
