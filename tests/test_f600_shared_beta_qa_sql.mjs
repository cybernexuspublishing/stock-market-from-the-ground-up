// Noncommercial Founder QA must reuse Owner tool passes without inventing
// paid founders, book ownership, Sparks, charges or Extended Council rights.
// Source-contract check. Genuine authenticated member proof remains separate.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base='supabase/migrations/v0.14.0.289_FOUNDER_SHARED_BETA_QA_OWNER_REVIEW_REQUIRED';
const sql=readFileSync(base+'.sql','utf8');
const rollback=readFileSync(base+'.rollback.sql','utf8');
const ui=readFileSync('assets/js/founders-commons-v014178.js','utf8');
const editor=readFileSync('assets/js/account-management-entitlements-v01478.js','utf8');
for(const s of ["auth.uid()","p_user IS DISTINCT FROM uid","account_kind='member'",
 "SHOWCASE_VIEWER","status IN ('suspended','restricted')",
 "adminGrantedBy","role_code='OWNER'","F600_GUIDED_QA_V1:",
 "user_tool_passes","tool_code='ONDEMAND_TRAINING'",
 "interval '30 days 1 minute'","ends_at IS NOT NULL",
 "provider IS NULL","provider_subscription_id IS NULL",
 "IF p_scope='shared' AND public.gu_founder_noncommercial_qa_v014289(uid)",
 "REVOKE ALL ON FUNCTION public.gu_founder_noncommercial_qa_v014289(uuid) FROM PUBLIC,anon,authenticated"])
 assert(sql.includes(s),'Missing scoped QA protection '+s);
assert(!sql.includes("IF p_scope='council' AND public.gu_founder_noncommercial_qa"),'QA cannot open Extended Council');
assert(!/INSERT\s+INTO\s+public\.(?:gu_founder_members|site_subscriptions|gu_founder_paid_cycles|groundup_question_pass)/i.test(sql),
 'QA migration may not create paid Founder or Sparks records');
assert(!/UPDATE\s+public\.(?:gu_founder_members|site_subscriptions|platform_plans)/i.test(sql),
 'QA migration may not rewrite paid Founder accounts');
assert(rollback.includes('DROP FUNCTION IF EXISTS public.gu_founder_noncommercial_qa_v014289(uuid)'),
 'Rollback must remove only additive QA helper');
assert(rollback.includes('CREATE OR REPLACE FUNCTION public.gu_founder_commons_access_v014174'),
 'Rollback must restore original shared/council access');
assert(ui.includes('Authorized Beta Tester'));
assert(ui.includes("if(!council&&f.forum_code==='F600_COUNCIL')continue"));
assert(ui.includes("'gu_founder_noncommercial_qa_v014289'"));
assert(editor.includes("F600_GUIDED_QA_V1:"));
console.log('PASS Founding shared QA migration: original Founder rights preserved; expiring owner pass only; no paid seats or Council; rollback present.');
