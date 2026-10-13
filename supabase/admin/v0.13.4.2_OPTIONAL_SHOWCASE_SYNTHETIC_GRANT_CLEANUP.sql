-- v0.13.4.2 OPTIONAL DATA REMEDIATION — DO NOT RUN UNTIL PREVIEW/REVIEW AND BACKUP.
-- Only removes specifically tagged synthetic records belonging to Showcase identities.
-- Does NOT delete account, billing records, orders, or legitimately paid grants.
-- The owner should save counts from v0.13.4.2_PREFLIGHT_READ_ONLY.sql first.
-- This script is not required if preflight found ZERO tagged synthetic grants.
begin;
-- Reject attempting cleanup if required security classification is missing.
do $$ begin
 if to_regclass('public.profiles') is null or to_regclass('public.admin_user_roles') is null then
   raise exception 'Required Showcase identity tables are missing';
 end if;
end $$;
create temporary table v1342_showcase_ids on commit drop as
select id as user_id from public.profiles where account_kind='showcase'
union
select user_id from public.admin_user_roles where role_code='SHOWCASE_VIEWER';
-- Audit what will be affected BEFORE actual deletes. Run preflight separately; SQL Editor
-- normally displays only the final result when executing a batch.
delete from public.user_plan_grants g using v1342_showcase_ids s
where g.user_id=s.user_id and (g.source='showcase' or coalesce(g.metadata->>'showcase','false')='true');
delete from public.user_library g using v1342_showcase_ids s
where g.user_id=s.user_id and (g.source_channel='showcase' or coalesce(g.metadata->>'showcase','false')='true');
delete from public.user_tool_passes g using v1342_showcase_ids s
where g.user_id=s.user_id and coalesce(g.metadata->>'showcase','false')='true';
delete from public.competency_evidence g using v1342_showcase_ids s
where g.user_id=s.user_id and coalesce(g.metadata->>'showcase','false')='true';
commit;
