-- v0.14.0.0 PRE-FLIGHT (READ ONLY). Safe to run BEFORE the new migration.
-- Confirm you are in the original Supabase project. Returns inventories only.
BEGIN READ ONLY;
select 'required_table' as kind,x.name, to_regclass('public.'||x.name) is not null as exists_in_database
from (values
 ('profiles'),('admin_user_roles'),('admin_audit_log'),('platform_plans'),
 ('user_plan_grants'),('site_subscriptions'),('user_tool_passes'),
 ('entitlements'),('user_library'),('platform_labs'),
 ('forum_reports'),('site_settings'),('member_presence_v01353'),
 ('lab_training_sets_v014'),('lab_training_attempts_v014'),('gws_client_drafts_v014')
) x(name) order by name;
select 'required_function' as kind, f.signature, to_regprocedure(f.signature) is not null as exists_in_database
from (values
 ('public.user_has_tool_access(uuid,text)'),
 ('public.my_platform_access()'),
 ('public.v1355_owner_access_mutation(uuid,uuid,text,text,bigint,timestamptz)'),
 ('public.v014_owner_plan_visibility(uuid,text,boolean,boolean,boolean)'),
 ('public.v014_training_start(uuid,text,text)'),
 ('public.v014_training_answer(uuid,uuid,text,integer)'),
 ('public.v014_community_report(uuid,text,text,text,text)')
) f(signature) order by signature;
select table_name,column_name,data_type from information_schema.columns
where table_schema='public' and table_name in ('platform_plans','forum_reports','lab_training_sets_v014','lab_training_attempts_v014')
order by table_name,ordinal_position;
select c.relname as table_name,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('platform_plans','forum_reports','lab_training_sets_v014','lab_training_attempts_v014','gws_client_drafts_v014');
-- Plan state can be reviewed without revealing personal membership details.
select p.plan_code,p.name,p.price_cents,p.billing_interval,p.active,p.public_visible,
       (to_jsonb(p)->>'checkout_enabled') as checkout_enabled_if_present
from public.platform_plans p order by p.sort_order,p.plan_code;
ROLLBACK;
