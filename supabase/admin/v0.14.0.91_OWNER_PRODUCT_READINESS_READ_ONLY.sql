-- v0.14.0.91 | Owner product-readiness factual preflight
-- Project: The Stock Market: From the Ground Up
-- Created: 2026-10-19 | Owner-operated in the EXISTING Supabase SQL Editor.
-- SELECT-only. Does not modify roles, entitlements, subscriptions, tables or policies.
-- No personal records, tokens, email addresses, learning responses or provider IDs are requested.
-- Run each numbered SELECT separately if your SQL Editor shows only the last result.
-- Export result CSVs/screenshots with the query number clearly visible.
-- If a source table is missing, STOP and share the exact error; never create or seed it blindly.
BEGIN READ ONLY;

-- 01: Installed object presence; all should be inspected without assuming installation.
SELECT '01_OBJECT_PRESENCE' AS check_group, x.object_name,
       to_regclass('public.' || x.object_name) IS NOT NULL AS exists_in_public
FROM (VALUES
 ('platform_plans'),('platform_tools'),('plan_tool_access'),('platform_labs'),
 ('lab_instruction_v014'),('lab_training_sets_v014'),('competency_cases_v135'),
 ('market_datasets'),('historical_context_envelopes'),('managed_content'),
 ('decision_journal'),('tool_workspace_records'),('user_plan_grants'),
 ('user_tool_passes'),('site_settings')
) AS x(object_name)
ORDER BY x.object_name;

-- 02: Membership price, availability and benefit flags. A plan marked active
-- or checkout_enabled is a database configuration, NOT proof that Stripe works.
SELECT '02_PLANS' AS check_group, plan_code, name, price_cents, billing_interval,
       active, public_visible, checkout_enabled,
       includes_all_tools, includes_all_books, ad_free
FROM public.platform_plans ORDER BY sort_order,plan_code;

-- 03: Tool catalog, expected from original v0.11 source: 21 definitions
-- (four principal LIVE source flags, 16 BETA and one PLANNED).
-- Record any unexpected missing or newly added codes instead of forcing 21.
SELECT '03_TOOLS' AS check_group, tool_code, name, category, status,
       active, public_visible, individual_price_cents, free_preview
FROM public.platform_tools ORDER BY sort_order,tool_code;

-- 04: How many cataloged Labs actually exist? 419 is a source/catalog target,
-- not a verified count of finished interactive lessons.
SELECT '04_LAB_IDS' AS check_group, count(*)::bigint AS actual_registered_lab_ids
FROM public.platform_labs;

-- 05: Private instructional and assessment tables. If any table was marked
-- missing in 01, do not run this query; send 01 first.
SELECT '05_CONTENT_COUNTS' AS check_group,
 (SELECT count(*) FROM public.lab_instruction_v014)::bigint AS authored_lab_instructions,
 (SELECT count(*) FROM public.lab_training_sets_v014)::bigint AS training_or_rubric_sets,
 (SELECT count(*) FROM public.competency_cases_v135)::bigint AS competency_cases;

-- 06: Historical inputs: zero means there is no centrally registered
-- verified market replay data. Imported member CSV is a separate case.
SELECT '06_DATASET_COUNTS' AS check_group,
 (SELECT count(*) FROM public.market_datasets)::bigint AS registered_market_datasets,
 (SELECT count(*) FROM public.historical_context_envelopes)::bigint AS historical_context_envelopes;

-- 07: Tutor source material. A positive count still does NOT prove a model-backed
-- AI runtime, generation accuracy, cited retrieval, rate limits or data protection.
SELECT '07_TUTOR_CONTENT' AS check_group,
 count(*)::bigint AS published_managed_tutor_topics
FROM public.managed_content
WHERE content_type='tutor_topic' AND status='published';

-- 08: Effective destructive privileges. TRUE for anon or authenticated
-- on user/content tables is a security REVIEW blocker. RLS does not govern TRUNCATE.
-- If all FALSE, still independently review actual APIs, policies, owners and grants.
SELECT '08_DESTRUCTIVE_GRANTS' AS check_group, x.table_name,
       has_table_privilege('anon',to_regclass('public.'||x.table_name),'TRUNCATE') AS anon_can_truncate,
       has_table_privilege('authenticated',to_regclass('public.'||x.table_name),'TRUNCATE') AS authenticated_can_truncate,
       has_table_privilege('anon',to_regclass('public.'||x.table_name),'TRIGGER') AS anon_can_trigger,
       has_table_privilege('authenticated',to_regclass('public.'||x.table_name),'TRIGGER') AS authenticated_can_trigger
FROM (VALUES ('profiles'),('entitlements'),('lab_attempts'),('lab_progress'),
 ('decision_journal'),('forum_categories'),('forum_topics'),('forum_posts')
) AS x(table_name)
ORDER BY x.table_name;

-- 09: Structural readiness of entitlement RPCs; a present function is not
-- proof of correct role authorization or signed provider fulfillment.
SELECT '09_RPC_PRESENCE' AS check_group,x.fn_name,
       to_regproc('public.'||x.fn_name) IS NOT NULL AS name_exists
FROM (VALUES ('my_platform_access'),('user_has_tool_access')) AS x(fn_name);

-- Intentional transaction end, with zero persistent effects.
ROLLBACK;
