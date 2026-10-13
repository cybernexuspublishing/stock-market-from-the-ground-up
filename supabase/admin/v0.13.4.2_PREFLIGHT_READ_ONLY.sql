-- THE STOCK MARKET: FROM THE GROUND UP | v0.13.4.2 | READ-ONLY DATABASE PREFLIGHT
-- Owner runs this in the Supabase SQL Editor. Nothing in this script changes data or schema.
-- Expected: all required tables PRESENT; v0.13.4 SHOWCASE broad grants are listed for repair.
with required(table_name) as (
  values ('profiles'),('admin_roles'),('admin_permissions'),('admin_role_permissions'),
  ('admin_user_roles'),('qa_account_presets'),('test_account_profiles'),
  ('test_account_credentials'),('account_private_identity'),
  ('competency_definitions'),('competency_evidence'),('site_feature_controls'),
  ('site_settings'),('user_plan_grants'),('user_library'),('user_tool_passes'),
  ('platform_labs'),('commons_topics')
)
select 'required_table' as test,
       table_name as object,
       case when to_regclass('public.'||quote_ident(table_name)) is not null then 'PASS' else 'FAIL' end as result
from required order by table_name;

select 'migration_seed' as test,
       (select count(*) from public.competency_definitions where active) as active_competencies,
       (select count(*) from public.admin_roles where role_code='SHOWCASE_VIEWER') as showcase_roles,
       (select count(*) from public.qa_account_presets where preset_code='SHOWCASE') as showcase_presets,
       (select value from public.site_settings where setting_key='site.version') as site_version;

select 'showcase_permission' as test,p.permission_code,
       case when p.permission_code='control_panel.access' then 'EXPECTED'
            else 'REMOVE' end as disposition
from public.admin_role_permissions p
where p.role_code='SHOWCASE_VIEWER'
order by p.permission_code;

-- These counts are diagnostic. They do not identify legitimate paid orders for deletion.
with showcase_ids as (
 select id from public.profiles where account_kind='showcase'
 union
 select user_id from public.admin_user_roles where role_code='SHOWCASE_VIEWER'
)
select 'showcase_accounts' as test,count(*)::bigint as count from showcase_ids;

with showcase_ids as (
 select id from public.profiles where account_kind='showcase'
 union
 select user_id from public.admin_user_roles where role_code='SHOWCASE_VIEWER'
)
select 'synthetic_records_in_production' as test,'plan_grants' as object,count(*) as count
from public.user_plan_grants g join showcase_ids s on g.user_id=s.id where g.source='showcase' or coalesce(g.metadata->>'showcase','false')='true'
union all
select 'synthetic_records_in_production','library_grants',count(*)
from public.user_library g join showcase_ids s on g.user_id=s.id where g.source_channel='showcase' or coalesce(g.metadata->>'showcase','false')='true'
union all
select 'synthetic_records_in_production','tool_passes',count(*)
from public.user_tool_passes g join showcase_ids s on g.user_id=s.id where coalesce(g.metadata->>'showcase','false')='true'
union all
select 'synthetic_records_in_production','competency_evidence',count(*)
from public.competency_evidence g join showcase_ids s on g.user_id=s.id where coalesce(g.metadata->>'showcase','false')='true';

-- RLS and table permission snapshots.
select 'rls' as test,c.relname as object,
 case when c.relrowsecurity then 'ENABLED' else 'DISABLED' end as result
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in (
 'profiles','competency_definitions','competency_evidence','test_account_credentials',
 'admin_user_roles','admin_role_permissions','user_plan_grants','user_library','commons_topics')
order by c.relname;
