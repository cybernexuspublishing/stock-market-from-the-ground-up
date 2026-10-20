-- v124 owner-safe read-only Supabase reconciliation status; no member IDs.
WITH checks(label,ready) AS (
 VALUES
 ('GU58 first paid-event notice binding guard enabled',EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.gu58_live_checkout_intents') AND tgname='gu_v014124_initial_subscription_notice' AND tgenabled IN('O','A'))),
 ('Reconciliation state tables installed',to_regclass('public.gu_billing_reconcile_cursor_v014124') IS NOT NULL AND to_regclass('public.gu_billing_reconcile_issues_v014124') IS NOT NULL),
 ('Reconciliation plan and tool cursors',EXISTS(SELECT 1 FROM public.gu_billing_reconcile_cursor_v014124 WHERE source_kind='plan') AND EXISTS(SELECT 1 FROM public.gu_billing_reconcile_cursor_v014124 WHERE source_kind='tool')),
 ('Batch scan service-only allowed',COALESCE(has_function_privilege('service_role',to_regprocedure('public.gu_v014124_next_reconcile_batch(text,integer)'),'EXECUTE'),false)),
 ('Batch scan member direct blocked',COALESCE(NOT has_function_privilege('authenticated',to_regprocedure('public.gu_v014124_next_reconcile_batch(text,integer)'),'EXECUTE'),false)),
 ('Alert write member direct blocked',COALESCE(NOT has_function_privilege('authenticated',to_regprocedure('public.gu_v014124_record_reconcile_result(text,bigint,text,text)'),'EXECUTE'),false)),
 ('Private alerts member SELECT blocked',COALESCE(NOT has_table_privilege('authenticated',to_regclass('public.gu_billing_reconcile_issues_v014124'),'SELECT'),false))
)
SELECT label,CASE WHEN ready THEN 'PASS' ELSE 'BLOCKED' END result FROM checks ORDER BY label;
-- Owner incident counts only, after all checks above pass:
-- SELECT issue_kind,count(*) FROM public.gu_billing_reconcile_issues_v014124
-- WHERE resolved_at IS NULL GROUP BY issue_kind;
