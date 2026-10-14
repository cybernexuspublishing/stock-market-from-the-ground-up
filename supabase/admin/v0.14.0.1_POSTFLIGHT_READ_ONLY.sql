-- v0.14.0.1 | READ ONLY, after migration. Identifies function changes and limits.
BEGIN READ ONLY;
select p.proname, pg_get_functiondef(p.oid) like '%v_kind IS DISTINCT FROM ''member''%' as production_account_gate_present,
       pg_get_functiondef(p.oid) like '%pg_advisory_xact_lock%' as atomic_quota_lock_present
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('commons_create_topic','commons_create_reply');
select to_regprocedure('public.v0141_forum_member_write_allowed()') is not null as legacy_forum_write_gate_installed;
select setting_key,value,public_read from public.site_settings
where setting_key in ('community.max_topics_per_24h','community.max_replies_per_24h') order by setting_key;
select pg_get_functiondef('public.v014_owner_plan_visibility(uuid,text,boolean,boolean,boolean)'::regprocedure)
 like '%NOT oldrow.active OR NOT oldrow.public_visible%' as plan_reactivation_payment_guard_present;
select tablename, policyname, cmd, permissive
from pg_policies where schemaname='public' and policyname like 'v0141_real_member_%'
order by tablename,cmd;
select has_function_privilege('authenticated', 'public.v0141_forum_member_write_allowed()', 'EXECUTE') as member_check_callable,
 has_function_privilege('anon', 'public.v0141_forum_member_write_allowed()', 'EXECUTE') as anonymous_check_callable;
select conname,pg_get_constraintdef(oid) as compatibility_validation_rule
from pg_constraint where conrelid='public.forum_reports'::regclass and contype='c'
 and conname in ('forum_reports_v0141_target_check','forum_reports_v0141_status_check') order by conname;
select column_name,is_nullable from information_schema.columns
 where table_schema='public' and table_name='forum_reports'
 and column_name='reporter_id';
ROLLBACK;
