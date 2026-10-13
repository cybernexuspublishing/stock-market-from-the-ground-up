-- Run after BOTH Phase2 incremental migrations. READ ONLY.
select 'resolver_wrapper_live' as audit, to_regprocedure('public.my_platform_access()') is not null as pass;
select 'resolver_original_preserved' as audit, to_regprocedure('public.my_platform_access_before_v135()') is not null as pass;
select 'admin_resolver_wrapper' as audit, to_regprocedure('public.my_platform_access_for_user(uuid)') is not null as pass;
select 'admin_resolver_original_preserved' as audit, to_regprocedure('public.my_platform_access_for_user_before_v135(uuid)') is not null as pass;
select 'replay_ledger_present' as audit, to_regclass('public.replay_practice_sessions_v135') is not null as pass;
select 'showcase_legacy_triggers' as audit,
 (select count(*) from pg_trigger where tgname in ('v135_showcase_legacy_grant_guard','v135_showcase_key_redemption_guard') and not tgisinternal)=2 as pass;
select 'replay_decision_lock_trigger' as audit,
 exists(select 1 from pg_trigger where tgname='v135_replay_decision_lock' and not tgisinternal) as pass;
select 'replay_ledger_rls' as audit, relrowsecurity as pass from pg_class where oid='public.replay_practice_sessions_v135'::regclass;
-- Read-only: shows how many historical Showcase grants require separate owner-reviewed handling.
with showcase as (
 select id as user_id from public.profiles where account_kind='showcase'
 union
 select user_id from public.admin_user_roles where role_code='SHOWCASE_VIEWER'
)
select 'historical_showcase_grant_review' as audit,
 (select count(*) from public.user_plan_grants where user_id in (select user_id from showcase) and status in ('active','trialing')) as active_plan_rows,
 (select count(*) from public.user_library where user_id in (select user_id from showcase) and (expires_at is null or expires_at>now())) as live_book_rows,
 (select count(*) from public.user_tool_passes where user_id in (select user_id from showcase) and status in ('active','trialing')) as active_tool_rows,
 (select count(*) from public.entitlements where user_id in (select user_id from showcase) and status in ('active','trialing')) as legacy_entitlement_rows;
