-- Read only; presence/permissions are necessary but NOT end-to-end proof.
BEGIN TRANSACTION READ ONLY;
SELECT
 to_regclass('public.gu_stripe_checkout_intents_v01438') IS NOT NULL AS checkout_intents_installed,
 to_regclass('public.gu_stripe_events_v01438') IS NOT NULL AS events_installed,
 to_regprocedure('public.gu_stripe_apply_event_v01438(text,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone,text)') IS NOT NULL AS handler_installed,
 COALESCE(has_function_privilege('anon',to_regprocedure('public.gu_stripe_apply_event_v01438(text,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone,text)'),'EXECUTE'),false) AS anon_may_execute,
 COALESCE(has_function_privilege('authenticated',to_regprocedure('public.gu_stripe_apply_event_v01438(text,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone,text)'),'EXECUTE'),false) AS member_may_execute,
 COALESCE(has_function_privilege('service_role',to_regprocedure('public.gu_stripe_apply_event_v01438(text,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone,text)'),'EXECUTE'),false) AS server_may_execute;
SELECT relname,relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND relname IN ('gu_stripe_checkout_intents_v01438','gu_stripe_events_v01438');
SELECT count(*) AS staged_intents, count(*) FILTER(WHERE status='active') AS active_intents FROM public.gu_stripe_checkout_intents_v01438;
ROLLBACK;
