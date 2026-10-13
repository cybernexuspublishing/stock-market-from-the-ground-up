-- v0.13.5 read-only postmigration QA (expected after running incremental migration).
select 'ONDEMAND_TOOL' as check_name,
 case when exists(select 1 from public.platform_tools where tool_code='ONDEMAND_TRAINING'
  and included_full and included_lifetime) then 'PASS' else 'FAIL' end as result;
select 'PREMIUM_PLAN_ACCESS_MATRIX' check_name,
 case when (select count(*) from public.plan_tool_access where tool_code='ONDEMAND_TRAINING'
 and plan_code in ('FULL_MONTHLY','FULL_ANNUAL','LIFETIME'))=3
 then 'PASS' else 'FAIL' end result;
select 'BUNDLE_NOT_PURCHASABLE' check_name,
 case when exists(select 1 from public.catalog_products
 where product_code='FOUNDATIONS_COMPLETE_BUNDLE' and not direct_digital_enabled and not direct_physical_enabled
 and coalesce(website_checkout_enabled,false)=false)
 then 'PASS' else 'FAIL' end result;
select 'NO_ACTIVE_QR_CAMPAIGNS_BY_DEFAULT' check_name,
 case when not exists(select 1 from public.book_activation_campaigns_v135 where active)
 then 'PASS' else 'REVIEW_OWNER_ENABLED' end result;
select 'SHOWCASE_PRESET_FREE_NOT_LIFETIME' check_name,
 case when exists(select 1 from public.qa_account_presets where preset_code='SHOWCASE' and plan_code='FREE')
 then 'PASS' else 'FAIL' end result;
select 'SKILL_DEFINITIONS_COUNT' check_name,
 count(*) as active_definitions from public.competency_definitions where active;
select 'HISTORICAL_LAB_COUNTS' check_name,
 count(*) as all_rows, count(*) filter(where active and registry_visible) as active_registry,
 count(*) filter(where active and not registry_visible) as hidden_active
 from public.platform_labs;
select 'SHOWCASE_ACTIVE_PLAN_GRANTS' check_name,count(*) as legacy_grant_count
from public.user_plan_grants g join public.profiles p on p.id=g.user_id
where p.account_kind='showcase' and g.status in ('active','trialing')
 and g.starts_at<=now() and (g.ends_at is null or g.ends_at>now());
select 'SHOWCASE_ACTIVE_BOOK_GRANTS' check_name,count(*) as legacy_grant_count
from public.user_library g join public.profiles p on p.id=g.user_id
where p.account_kind='showcase' and (g.expires_at is null or g.expires_at>now());
select 'SHOWCASE_SKILL_ROWS' check_name,count(*) as legacy_evidence_rows
from public.competency_evidence g join public.profiles p on p.id=g.user_id
where p.account_kind='showcase';
-- Do not automatically DELETE suspect legacy data. Investigate and back up first.
select 'SHOWCASE_ACTIVE_TOOL_PASSES' check_name,count(*) as legacy_grant_count
from public.user_tool_passes g join public.profiles p on p.id=g.user_id
where p.account_kind='showcase' and g.status in ('active','trialing')
 and (coalesce(g.current_period_end,g.ends_at) is null or coalesce(g.current_period_end,g.ends_at)>now());
select 'SHOWCASE_ACTIVE_SUBSCRIPTIONS' check_name,count(*) as legacy_grant_count
from public.site_subscriptions g join public.profiles p on p.id=g.user_id
where p.account_kind='showcase' and g.status in ('active','trialing')
 and (g.current_period_end is null or g.current_period_end>now());
