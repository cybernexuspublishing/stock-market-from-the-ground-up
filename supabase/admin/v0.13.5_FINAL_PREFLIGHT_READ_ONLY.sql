-- v0.13.5 final package: READ ONLY, run BEFORE any new v0.13.5 migration.
-- This does not alter tables, privileges, staff roles or entitlements.
select 'base profiles' as check_name,to_regclass('public.profiles') is not null as pass
union all select 'base catalog',to_regclass('public.catalog_products') is not null
union all select 'base purchase intents',to_regclass('public.checkout_intents') is not null
union all select 'base webhook ledger',to_regclass('public.payment_webhook_events') is not null
union all select 'base membership tools',to_regclass('public.platform_tools') is not null
union all select 'base plan entitlements',to_regclass('public.user_plan_grants') is not null
union all select 'base product library',to_regclass('public.user_library') is not null
union all select 'base order table',to_regclass('public.site_orders') is not null
union all select 'base order items',to_regclass('public.site_order_items') is not null
union all select 'base competencies',to_regclass('public.competency_definitions') is not null
union all select 'base competency evidence',to_regclass('public.competency_evidence') is not null
union all select 'base replay Labs',to_regclass('public.platform_labs') is not null
union all select 'base historical progress',to_regclass('public.site_lab_progress') is not null
union all select 'base existing staff roles',to_regclass('public.admin_user_roles') is not null
order by check_name;
select 'PHASE 1 migration A present' as item,to_regclass('public.book_editions_v135') is not null as installed
union all select 'PHASE 2 migration B present',to_regprocedure('public.my_platform_access_before_v135()') is not null
union all select 'PHASE 2 migration C present',to_regclass('public.replay_practice_sessions_v135') is not null
union all select 'FINAL migration D present',to_regclass('public.competency_cases_v135') is not null
union all select 'FINAL migration E present',to_regprocedure('public.apply_order_webhook_v135(text,text,text,integer,text)') is not null;
-- This report reveals potentially already-applied migrations; NEVER re-run one blindly.
