-- v0.13.5 read-only preflight; run BEFORE migration. Does not require missing tables to exist.
select name, object_present from (values
 ('public.platform_tools',to_regclass('public.platform_tools') is not null),
 ('public.entitlements',to_regclass('public.entitlements') is not null),
 ('public.plan_tool_access',to_regclass('public.plan_tool_access') is not null),
 ('public.catalog_products',to_regclass('public.catalog_products') is not null),
 ('public.profiles',to_regclass('public.profiles') is not null),
 ('public.user_library',to_regclass('public.user_library') is not null),
 ('public.site_subscriptions',to_regclass('public.site_subscriptions') is not null),
 ('public.user_plan_grants',to_regclass('public.user_plan_grants') is not null),
 ('public.user_tool_passes',to_regclass('public.user_tool_passes') is not null),
 ('public.competency_definitions',to_regclass('public.competency_definitions') is not null),
 ('public.competency_evidence',to_regclass('public.competency_evidence') is not null),
 ('public.qa_account_presets',to_regclass('public.qa_account_presets') is not null)
) x(name,object_present) order by name;
-- Missing items should halt the v0.13.5 migration for investigation.
