-- GU-WEB-ROADMAP-PREFLIGHT-014063 / v0.14.0.63
-- READ-ONLY. Run in Supabase SQL Editor ONLY after source work is complete.
-- No table creation, mutation, permissions, administrative account reads,
-- payments, or schema changes. Intended for Owner handoff, not automatic run.
-- Output: a set of documentary checks. Missing objects return NOT_INSTALLED.
with objects as (
  select name,
         to_regclass('public.'||name) as relation_oid
  from (values
   ('site_settings'),('admin_audit_log'),('admin_user_roles'),
   ('admin_user_flags'),('profiles')
  ) t(name)
), fields as (
 select table_name,column_name
 from information_schema.columns
 where table_schema='public'
 and table_name in ('site_settings','admin_audit_log','admin_user_roles','admin_user_flags','profiles')
), policies as (
 select tablename,cmd,qual,with_check,roles
 from pg_policies where schemaname='public' and tablename='site_settings'
), reports as (
 select 'table/'||name as check_id,
  case when relation_oid is null then 'NOT_INSTALLED' else 'PRESENT' end as result,
  'Source requirement: private Owner roadmap reads existing public.'||name as detail
 from objects
 union all
 select 'column/site_settings/'||x as check_id,
  case when exists(select 1 from fields where table_name='site_settings' and column_name=x)
       then 'PRESENT' else 'MISSING' end,
  'Required for Owner status compare-and-swap without a schema migration'
 from (values ('setting_key'),('value'),('public_read'),('updated_at'),('updated_by')) a(x)
 union all
 select 'column/admin_audit_log/'||x,
  case when exists(select 1 from fields where table_name='admin_audit_log' and column_name=x)
       then 'PRESENT' else 'MISSING' end,
  'Required to document Owner task updates'
 from (values ('actor_user_id'),('action'),('target_type'),('target_id'),('details')) a(x)
 union all
 select 'rls/site_settings',
  case when (select relrowsecurity from pg_class where oid=to_regclass('public.site_settings')) is true
       then 'ENABLED' else 'MISSING_OR_DISABLED' end,
  'RLS should be enabled; sensitive settings have public_read=false and no direct client mutation grants'
 union all
 select 'policy/site_settings_count',
  (select count(*)::text from policies),
  'Inspect pg_policies separately; only intended public-read settings should be queryable by anon/authenticated'
 union all
 select 'grant/anon-site_settings-update',
  case when coalesce(has_table_privilege('anon',to_regclass('public.site_settings'),'UPDATE'),false) then 'REVIEW_PERMISSION' else 'DENIED' end,
  'Client roles should not update Owner roadmap settings'
 union all
 select 'grant/authenticated-site_settings-update',
  case when coalesce(has_table_privilege('authenticated',to_regclass('public.site_settings'),'UPDATE'),false) then 'REVIEW_PERMISSION' else 'DENIED' end,
  'Client roles should not update Owner roadmap settings'
)
select check_id,result,detail from reports order by check_id;

-- OPTIONAL second read-only inspection. Keep actual role policy qualification
-- private: do not paste private permissions/account rows into support tickets.
select tablename,policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname='public' and tablename='site_settings'
order by policyname;
