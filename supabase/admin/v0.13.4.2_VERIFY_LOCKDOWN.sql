-- v0.13.4.2 verification. Execute after the privilege-lockdown migration.
select 'SHOWCASE_PERMISSION_LOCKDOWN' as check_name,
case when exists (
 select 1 from public.admin_role_permissions
 where role_code='SHOWCASE_VIEWER' and permission_code<>'control_panel.access'
) then 'FAIL' else 'PASS' end as result;
select 'SHOWCASE_ROLE' as check_name,
case when exists (select 1 from public.admin_roles where role_code='SHOWCASE_VIEWER') then 'PASS' else 'FAIL' end as result;
select 'SHOWCASE_PRESET' as check_name,
case when exists(select 1 from public.qa_account_presets where preset_code='SHOWCASE' and plan_code='FREE'
and coalesce(metadata->>'synthetic_only','false')='true') then 'PASS' else 'FAIL' end as result;
select 'COMPETENCY_DEFINITIONS' as check_name,
case when count(*)=30 then 'PASS' else 'FAIL' end as result,
count(*) as actual from public.competency_definitions where active;
-- This reveals grants to be reviewed separately; no delete statement runs here.
with showcase_ids as (
 select id from public.profiles where account_kind='showcase'
 union
 select user_id from public.admin_user_roles where role_code='SHOWCASE_VIEWER'
)
select 'SHOWCASE_PLAN_GRANTS' as check_name,count(*) as records_for_review
from public.user_plan_grants g join showcase_ids s on g.user_id=s.id
where g.source='showcase' or coalesce(g.metadata->>'showcase','false')='true';
