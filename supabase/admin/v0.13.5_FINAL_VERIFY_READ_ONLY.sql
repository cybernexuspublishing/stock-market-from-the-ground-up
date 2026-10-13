-- v0.13.5 final package: READ ONLY postmigration audit.
-- Every check below should pass, or its exception must be reviewed before activation.
select 'competency private cases' as check_name,
 to_regclass('public.competency_cases_v135') is not null and not has_table_privilege('authenticated','public.competency_cases_v135','SELECT') as pass
union all select 'competency private attempts',to_regclass('public.competency_attempts_v135') is not null and not has_table_privilege('authenticated','public.competency_attempts_v135','INSERT')
union all select 'order ledger is service only',to_regclass('public.order_entitlement_ledger_v135') is not null and not has_table_privilege('authenticated','public.order_entitlement_ledger_v135','INSERT')
union all select 'atomic order fulfillment RPC',to_regprocedure('public.apply_order_webhook_v135(text,text,text,integer,text)') is not null
union all select 'trusted competency RPC',to_regprocedure('public.submit_competency_case_v135(uuid,text,jsonb)') is not null
union all select 'showcase guard exists',to_regprocedure('public.is_showcase_account_v135(uuid)') is not null
union all select 'showcase resolver wrapper installed',to_regprocedure('public.my_platform_access_before_v135()') is not null
union all select 'catalog bundle component table',to_regclass('public.book_bundle_components_v135') is not null
union all select 'private QR sessions',to_regclass('public.book_activation_sessions_v135') is not null
order by check_name;
select product_code,title,kdp_select,direct_digital_enabled,direct_physical_enabled,website_checkout_enabled,sales_status
from public.catalog_products where product_code in ('FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','FOUNDATIONS_COMPLETE_SERIES')
order by product_code;
select (select count(*) from public.platform_labs where active and registry_visible) as visible_active_labs,
 (select count(*) from public.competency_definitions where active) as active_skills,
 (select count(*) from public.competency_cases_v135 where active and reviewed_at is not null) as published_scored_cases,
 (select count(*) from public.competency_cases_v135 where active is false) as draft_or_retired_cases,
 (select count(*) from public.book_activation_campaigns_v135 where active) as active_qr_campaigns;
-- Production entitlement residue for prior Showcase identities; should be ZERO
-- unless separately reviewed and awaiting controlled cleanup (no deletion here).
with show as (
 select id from public.profiles where account_kind='showcase'
 union
 select user_id from public.admin_user_roles where role_code='SHOWCASE_VIEWER'
)
select 'Showcase production plan grants' as issue,count(*) as rows_to_review
from public.user_plan_grants g join show s on g.user_id=s.id where g.status in ('active','trialing')
union all
select 'Showcase book grants',count(*) from public.user_library l join show s on l.user_id=s.id where l.expires_at is null or l.expires_at>now()
union all
select 'Showcase competency evidence',count(*) from public.competency_evidence e join show s on e.user_id=s.id;
