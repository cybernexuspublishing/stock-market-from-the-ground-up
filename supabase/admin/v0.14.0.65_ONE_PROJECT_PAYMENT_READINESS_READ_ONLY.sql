-- Cyber Nexus | The Stock Market: From the Ground Up | v0.14.0.65
-- Document ID: GU-WEB-PAY-ONE-PROJECT-PREFLIGHT-014065-20261018
-- Location: EXISTING Supabase project -> SQL Editor. READ ONLY.
-- NEVER creates a new database, test customer, Stripe session, membership,
-- payment, extension, table, function, role, or migration.
-- A PASS is structural evidence only, NEVER permission to enable LIVE billing.
BEGIN TRANSACTION READ ONLY;

WITH canonical(kind, code) AS (
 VALUES ('plan','FULL_MONTHLY'),('plan','FULL_ANNUAL'),('plan','LIFETIME'),
        ('plan','ONDEMAND_MONTHLY'),('tool','INTERACTIVE_LEARNING'),
        ('tool','JOURNAL_ANALYTICS'),('tool','MARKET_SIMULATOR'),('tool','MARKET_TUTOR')
), offers AS (
 SELECT c.kind,c.code,
        CASE WHEN c.kind='plan' THEN p.plan_code ELSE t.tool_code END AS found_code,
        CASE WHEN c.kind='plan' THEN p.price_cents ELSE t.individual_price_cents END AS cents,
        CASE WHEN c.kind='plan' THEN p.active ELSE t.active END AS active,
        CASE WHEN c.kind='plan' THEN p.public_visible ELSE t.public_visible END AS visible,
        CASE WHEN c.kind='plan' THEN p.checkout_enabled ELSE NULL::boolean END AS plan_checkout,
        t.status AS tool_status
 FROM canonical c
 LEFT JOIN public.platform_plans p ON c.kind='plan' AND p.plan_code=c.code
 LEFT JOIN public.platform_tools t ON c.kind='tool' AND t.tool_code=c.code
), signals AS (
 SELECT
   (SELECT enabled FROM public.gu39_sandbox_settings WHERE id=true LIMIT 1) AS test_mode,
   (SELECT count(*) FROM public.gu39_sandbox_intents
     WHERE status='prepared' AND session_id IS NULL) AS orphan_prepared,
   (SELECT count(*) FROM public.gu39_sandbox_intents
     WHERE status='prepared' AND session_id IS NOT NULL) AS bound_prepared,
   (SELECT count(*) FROM offers WHERE found_code IS NOT NULL AND cents>0) AS valid_offers
), checks(area,check_name,status,evidence) AS (
 SELECT 'OWNER MODE','TEST/LIVE selector',
   CASE WHEN test_mode IS TRUE THEN 'TEST_MODE_ACTIVE'
        WHEN test_mode IS FALSE THEN 'TEST_MODE_OFF'
        ELSE 'HOLD' END,
   'Mode state is not permission to charge' FROM signals
 UNION ALL SELECT 'SHADOW','Unbound prepared TEST intents',
   CASE WHEN orphan_prepared=0 THEN 'PASS' ELSE 'RECONCILE' END,
   orphan_prepared::text||' unresolved TEST prepared intent(s); verify Stripe TEST logs before creating another checkout'
   FROM signals
 UNION ALL SELECT 'SHADOW','Prepared TEST intents with session IDs',
   CASE WHEN bound_prepared=0 THEN 'PASS' ELSE 'REVIEW' END,
   bound_prepared::text||' prepared shadow records with a bound session'
   FROM signals
 UNION ALL SELECT 'CATALOG','Canonical 8 SKUs present with positive DB prices',
   CASE WHEN valid_offers=8 THEN 'PASS' ELSE 'HOLD' END,
   valid_offers::text||'/8; SQL does not verify the independent LIVE Stripe price catalog'
   FROM signals
 UNION ALL SELECT 'TABLE','Shadow payment tables isolated from member access',
   CASE WHEN to_regclass('public.gu39_sandbox_access') IS NOT NULL AND
       to_regclass('public.gu39_sandbox_events') IS NOT NULL THEN 'PASS' ELSE 'HOLD' END,
   'GU39 shadow tables cannot stand in for customer membership fulfillment'
 UNION ALL SELECT 'TABLE','LIVE checkout intent and signed event ledgers installed',
   CASE WHEN to_regclass('public.gu58_live_checkout_intents') IS NOT NULL AND
             to_regclass('public.gu58_live_stripe_events') IS NOT NULL THEN 'PRESENT' ELSE 'NOT_INSTALLED_OR_INCOMPLETE' END,
   'Presence only; no automatic migration or LIVE approval'
 UNION ALL SELECT 'SQL CONTRACT','LIVE service-role fulfillment RPC installed',
   CASE WHEN to_regprocedure('public.gu58_live_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone,text,boolean)') IS NOT NULL
        THEN 'PRESENT' ELSE 'NOT_INSTALLED' END,
   'Installed function must still match reviewed GU58 code and RLS'
 UNION ALL SELECT 'SECURITY','No authenticated EXECUTE permission on LIVE fulfillment',
   CASE WHEN NOT coalesce(has_function_privilege('authenticated',
        to_regprocedure('public.gu58_live_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone,text,boolean)'), 'EXECUTE'),false)
        THEN 'PASS' ELSE 'HOLD' END,
   'Client JWT must not be allowed to invoke billing entitlement mutations'
 UNION ALL SELECT 'SECURITY','No anonymous SELECT on LIVE event ledger',
   CASE WHEN NOT coalesce(has_table_privilege('anon',to_regclass('public.gu58_live_stripe_events'),'SELECT'),false)
        THEN 'PASS' ELSE 'HOLD' END,
   'Rows, event IDs and customer data are never returned'
 UNION ALL SELECT 'SECURITY','No authenticated UPDATE on LIVE checkout intents',
   CASE WHEN NOT coalesce(has_table_privilege('authenticated',to_regclass('public.gu58_live_checkout_intents'),'UPDATE'),false)
        THEN 'PASS' ELSE 'HOLD' END,
   'Clients must not mutate bound payment intents'
 UNION ALL SELECT 'SECURITY','GU58 RLS on both LIVE ledgers',
   CASE WHEN coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu58_live_checkout_intents')),false)
       AND coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu58_live_stripe_events')),false)
        THEN 'PASS' ELSE 'HOLD_OR_NOT_INSTALLED' END,
   'RLS enabled is necessary but not sufficient for approval'
 UNION ALL SELECT 'OWNER APPROVAL','LIVE merchant credentials, LIVE webhook, tax and terms',
   'EXTERNAL_REVIEW_REQUIRED',
   'Cloudflare/Stripe settings cannot be established by read-only Supabase SQL'
 UNION ALL SELECT 'OWNER APPROVAL','LIVE customer payment activation',
   'NOT_APPROVED',
   'No customer payment or entitlement migration is authorized by this report'
 UNION ALL
 SELECT 'SKU',o.kind||':'||o.code,
    CASE WHEN o.found_code IS NULL OR o.cents IS NULL OR o.cents<1 THEN 'HOLD'
         WHEN o.active IS DISTINCT FROM TRUE OR o.visible IS DISTINCT FROM TRUE THEN 'NOT_RELEASED'
         WHEN o.kind='plan' AND o.plan_checkout IS DISTINCT FROM TRUE THEN 'CHECKOUT_LOCKED_AS_CONFIGURED'
         WHEN o.kind='tool' AND o.tool_status IS DISTINCT FROM 'live' THEN 'TOOL_NOT_RELEASED'
         ELSE 'STRUCTURAL_PASS_NOT_LIVE_APPROVAL' END,
    coalesce(o.cents::text,'missing')||' cents in database; live Stripe Price ID NOT verified'
 FROM offers o
)
SELECT area,check_name,status,evidence
FROM checks ORDER BY
 CASE area WHEN 'OWNER MODE' THEN 1 WHEN 'SHADOW' THEN 2
 WHEN 'CATALOG' THEN 3 WHEN 'SKU' THEN 4 WHEN 'TABLE' THEN 5
 WHEN 'SQL CONTRACT' THEN 6 WHEN 'SECURITY' THEN 7 ELSE 8 END,check_name;
ROLLBACK;
