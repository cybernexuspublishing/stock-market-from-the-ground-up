/* Phase A protected B01 candle checkpoint and critical policy: key-free source checks. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const m=read('supabase/migrations/20261027_b01_phase_a_candle_pause_private_backup.sql');
const rb=read('supabase/rollbacks/20261027_b01_phase_a_candle_pause_ROLLBACK.sql');
const audit=read('supabase/reviews/20261027_b01_phase_a_candle_policy_postflight_READ_ONLY.sql');
const release=read('docs/releases/2026-10-27_B01_REMAINING60_AND_EIGHT_FULL_RUBRICS.md');
assert(m.includes('private.b01_candle_pause_backup_20261027')&&m.includes('ENABLE ROW LEVEL SECURITY'));
assert(m.includes('FROM PUBLIC,anon,authenticated,service_role'));
assert(rb.includes("current_record.review_state<>'draft'")&&rb.includes('lab_training_attempts_v014'));
assert(rb.includes('snapshot.revised_md5')&&rb.includes('snapshot.prior_applied_md5'));
assert(rb.includes('prior_questions')&&rb.includes('admin_audit_log'));
assert(audit.includes('BEGIN READ ONLY;')&&audit.includes('ROLLBACK;'));
for(const guard of ['both_private_rollback_checkpoints_valid','no_exact_key_echo',
  'no_real_attempts','finality_and_delivery_clear','critical_integrity_flag_preserved'])
 assert(audit.includes(guard),'Missing protected postflight '+guard);
for(const s of [m,rb,audit]){
 assert(!/INSERT\s+INTO\s+public\.lab_training_attempts_v014/i.test(s));
 assert(!/UPDATE\s+public\.lab_training_sets_v014\s+SET\s+review_state\s*=\s*'reviewed'/i.test(s));
 assert(!s.includes('The completed 09:40')&&!s.includes('09:45–09:50 bar because'),
  'Private answer choices must not enter public repo');
}
assert(release.includes('CANDLE AVAILABILITY RESOLVED IN DRAFT'));
assert(release.includes('NOT GENUINELY AUTHENTICATED'));
console.log('PASS B01 Phase A: private reversible draft correction, CAS, zero grade/approval, no answer-key publication.');
