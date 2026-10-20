-- v123 one-result read-only production preflight; no customer identifiers.
WITH checks(label,pass) AS (
 VALUES
 ('GU58 signed LIVE ledger exists',to_regclass('public.gu58_live_checkout_intents') IS NOT NULL),
 ('GU58 signed Stripe apply RPC exists',to_regprocedure('public.gu58_live_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamptz,timestamptz,text,boolean)') IS NOT NULL),
 ('Plan subscription table exists',to_regclass('public.site_subscriptions') IS NOT NULL),
 ('À-la-Carte subscription table exists',to_regclass('public.user_tool_passes') IS NOT NULL)
)
SELECT label,CASE WHEN pass THEN 'PASS' ELSE 'BLOCKED' END result FROM checks ORDER BY label;
