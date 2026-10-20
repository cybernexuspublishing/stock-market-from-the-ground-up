import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/admin/v0.14.0.126_FORUM_ATOMIC_DEPENDENCIES_READ_ONLY.sql');
const old=read('supabase/migrations/v0.14.0.125_FORUM_COMMONS_DIRECT_DML_LOCKDOWN_OWNER_REVIEW_REQUIRED.sql');
for(const name of ['gu_v014113_moderate_with_audit','gu_v014116_member_change_with_audit',
 'pg_attribute','pg_class','admin_audit_log','forum_topics','forum_posts',
 'commons_topics','commons_posts','EXECUTE','has_table_privilege','REQUIRES'])
  if(name!=='REQUIRES') assert(sql.includes(name),'Missing audit diagnostic '+name);
assert(!/^\s*\\set\b/m.test(sql),'No psql-only directives in production diagnostic');
assert(!/^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|GRANT|REVOKE|SET ROLE)\b/im.test(sql),'Diagnostic must not write');
assert(!sql.includes('FROM public.forum_topics')&&!sql.includes('FROM public.commons_posts'),
 'Do not inspect member discussion content');
assert(old.includes('V125_REQUIRES_INSTALLED_V113_AND_V116_SERVICE_ONLY_ATOMIC_AUDIT_RPCS'));
assert(read('functions/api/forum-member-content.js').includes('gu_v014116_member_change_with_audit'));
assert(read('functions/api/admin-forum-actions.js').includes('gu_v014113_moderate_with_audit'));
console.log('PASS v126: single-result read-only Supabase diagnostic and audited API prerequisites');
