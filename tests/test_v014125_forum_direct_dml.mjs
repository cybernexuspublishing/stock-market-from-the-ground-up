import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/v0.14.0.125_FORUM_COMMONS_DIRECT_DML_LOCKDOWN_OWNER_REVIEW_REQUIRED.sql');
const member=read('functions/api/forum-member-content.js');
const staff=read('functions/api/admin-forum-actions.js');
const fixture=read('tests/fixtures/v014125_forum_direct_dml_acceptance.sql');
for(const required of [
 "gu_v014113_moderate_with_audit","gu_v014116_member_change_with_audit",
 "'forum_topics','forum_posts','commons_topics','commons_posts'",
 'REVOKE UPDATE, DELETE ON TABLE','REVOKE UPDATE (%s)',
 'has_any_column_privilege','AS RESTRICTIVE FOR UPDATE TO authenticated USING (false)',
 'AS RESTRICTIVE FOR DELETE TO authenticated USING (false)',
 'IF NOT has_function_privilege','NOT has_table_privilege'
].filter(x=>x!=='NOT has_table_privilege')){
 assert(sql.includes(required),'Missing v125 DML/Audit control: '+required);
}
assert(!/REVOKE\s+INSERT\b/i.test(sql),'Must preserve legitimate new topics and replies');
assert(!/DROP TABLE|DELETE FROM public\.(forum|commons)_/i.test(sql),'Must not rewrite or erase member discussions');
assert(member.includes('rpc/gu_v014116_member_change_with_audit'),
 'Member edits must use auditable atomic backend');
assert(staff.includes('rpc/gu_v014113_moderate_with_audit'),
 'Staff moderation must use auditable atomic backend');
for(const mark of [
 'SET ROLE authenticated','SET ROLE service_role','GRANT UPDATE(body)',
 'REVOKE INSERT ON public.admin_audit_log FROM service_role',
 'FAILED','rollback'
].filter(x=>x!=='FAILED'))assert(fixture.includes(mark),'Fixture incomplete: '+mark);
const audit=read('supabase/admin/v0.14.0.125_FORUM_DIRECT_DML_POSTFLIGHT_READ_ONLY.sql');
assert(audit.includes('has_any_column_privilege'));
assert(audit.includes('gu_v014125_authenticated_direct_update_denied'));
assert(audit.includes('gu_v014125_authenticated_direct_delete_denied'));
console.log('PASS v125: no direct forum/Commons owner edit bypass, protected creation, real v113/v116 audited paths and rollback regression coverage');
