-- Cyber Nexus | The Stock Market: From the Ground Up | v0.14.0.70
-- Document ID: GU-WEB-PAY-RPC-READONLY-014070-20261018
-- EXISTING PRODUCTION SUPABASE SQL EDITOR ONLY. READ-ONLY, NO DATABASE CHANGES.
-- Not proof of live signed webhook delivery, external merchant approval or a
-- byte-for-byte match to reviewed migration (Postgres normalizes definitions).
-- Report intentionally contains no user information and no function body.
BEGIN TRANSACTION READ ONLY;
WITH expected(label, signature) AS (
 VALUES
 ('LIVE event fulfillment','public.gu58_live_stripe_apply_event(text,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone,text,boolean)'),
 ('Verified session recovery','public.gu58_live_bind_verified_checkout(uuid,uuid,text,text,integer)')
), funcs AS (
 SELECT e.label, e.signature, to_regprocedure(e.signature)::oid AS fn_oid
 FROM expected e
), inspect AS (
 SELECT f.label,f.signature,f.fn_oid,p.prosecdef,p.proconfig,
        CASE WHEN f.fn_oid IS NULL THEN NULL ELSE pg_get_functiondef(f.fn_oid) END AS definition
 FROM funcs f LEFT JOIN pg_proc p ON p.oid=f.fn_oid
), func_checks AS (
 SELECT 'RPC'::text AS section,
        label||' installed' AS requirement,
        CASE WHEN fn_oid IS NOT NULL THEN 'PRESENT' ELSE 'HOLD' END AS status,
        CASE WHEN fn_oid IS NOT NULL THEN 'Existing function found' ELSE 'Do NOT auto-apply a migration' END AS detail
 FROM inspect
 UNION ALL
 SELECT 'RPC',label||' SECURITY DEFINER / locked search_path',
        CASE WHEN fn_oid IS NOT NULL AND prosecdef IS TRUE
          AND EXISTS(SELECT 1 FROM unnest(coalesce(proconfig,ARRAY[]::text[])) sp
          WHERE replace(sp,' ','')='search_path=pg_catalog,pg_temp')
          THEN 'PASS' ELSE 'HOLD' END,
        'Privilege boundary must be service-only; no user-context dependency'
 FROM inspect
 UNION ALL
 SELECT 'ACL',label||' service_role EXECUTE',
        CASE WHEN fn_oid IS NOT NULL AND coalesce(has_function_privilege('service_role',fn_oid,'EXECUTE'),false)
          THEN 'PASS' ELSE 'HOLD' END,'Service credential only'
 FROM inspect
 UNION ALL
 SELECT 'ACL',label||' anon/authenticated/PUBLIC blocked',
        CASE WHEN fn_oid IS NOT NULL
          AND NOT coalesce(has_function_privilege('anon',fn_oid,'EXECUTE'),false)
          AND NOT coalesce(has_function_privilege('authenticated',fn_oid,'EXECUTE'),false)
          AND NOT EXISTS (
           SELECT 1 FROM pg_proc grant_p
           JOIN LATERAL aclexplode(coalesce(grant_p.proacl,acldefault('f',grant_p.proowner))) acl ON true
           WHERE grant_p.oid=fn_oid AND acl.grantee=0 AND acl.privilege_type='EXECUTE'
          )
          THEN 'PASS' ELSE 'HOLD' END,
        'Any PUBLIC EXECUTE exposes this SECURITY DEFINER function to every account'
 FROM inspect
 UNION ALL
 SELECT 'FINGERPRINT',label||' installed SQL definition MD5',
        CASE WHEN fn_oid IS NULL THEN 'NOT_INSTALLED' ELSE 'OBSERVED' END,
        coalesce(md5(definition),'not installed')||' (reference fingerprint ONLY, not source equality)'
 FROM inspect
), ledger(name,rel) AS (
 VALUES ('LIVE checkout intents','public.gu58_live_checkout_intents'),
        ('LIVE Stripe event ledger','public.gu58_live_stripe_events')
), ledger_checks AS (
 SELECT 'TABLE'::text AS section,name||' existence / RLS' AS requirement,
   CASE WHEN to_regclass(rel) IS NOT NULL AND
    coalesce((SELECT c.relrowsecurity FROM pg_class c WHERE c.oid=to_regclass(rel)),false)
    THEN 'PASS' ELSE 'HOLD' END AS status,
   'Service-only ledger, row-level security enforced' AS detail
 FROM ledger
 UNION ALL
 SELECT 'ACL',name||' member writes denied',
   CASE WHEN to_regclass(rel) IS NOT NULL AND
     NOT coalesce(has_table_privilege('anon',to_regclass(rel),'INSERT,UPDATE,DELETE'),false)
     AND NOT coalesce(has_table_privilege('authenticated',to_regclass(rel),'INSERT,UPDATE,DELETE'),false)
    THEN 'PASS' ELSE 'HOLD' END,
   'Public and member credentials cannot create, update, or delete LIVE payment rows'
 FROM ledger
), markers AS (
 SELECT 'SOURCE CONTRACT'::text AS section,'Refund/dispute idempotency and hold semantics' AS requirement,
   CASE WHEN definition IS NULL THEN 'HOLD'
     WHEN position('refund_hold_invoice_id' in definition)>0 AND
          position('pg_advisory_xact_lock' in definition)>0 AND
          position('gu58_live_stripe_events' in definition)>0 AND
          position('stripe_session_id' in definition)>0 AND
          position('stale_ignored' in definition)>0 THEN 'MARKERS_PRESENT'
     ELSE 'REVIEW_REQUIRED' END AS status,
   'Markers are not an exact source match, functional proof, or webhook delivery test' AS detail
 FROM inspect WHERE label='LIVE event fulfillment'
 UNION ALL
 SELECT 'SOURCE CONTRACT','Verified session recovery cannot issue grants',
   CASE WHEN definition IS NULL THEN 'HOLD'
    WHEN position('gu58_live_checkout_intents' in definition)>0 AND
     position('stripe_session_id' in definition)>0 AND
     position('created_grant_id' in definition)=0 AND
     position('user_tool_passes' in definition)=0 AND
     position('user_plan_grants' in definition)=0 THEN 'MARKERS_PRESENT'
    ELSE 'REVIEW_REQUIRED' END,
   'Service-only bind function must not grant membership; marker absence is not exhaustive proof'
 FROM inspect WHERE label='Verified session recovery'
), approvals AS (
 SELECT 'OWNER GATES'::text AS section,'LIVE signed webhook delivery' AS requirement,
        'NOT_TESTED' AS status,
        'A Stripe destination and signing secret format do not prove webhook signature acceptance or fulfilled membership' AS detail
 UNION ALL SELECT 'OWNER GATES','Managed Payments business and product eligibility',
        'EXTERNAL_REVIEW_REQUIRED','Stripe active charges/payouts alone do not establish merchant-of-record eligibility'
 UNION ALL SELECT 'OWNER GATES','LIVE payment launch',
        'NOT_APPROVED','Do not enable customer checkout or authorization switches from this read-only report'
)
SELECT section,requirement,status,detail
FROM (
 SELECT * FROM func_checks UNION ALL SELECT * FROM ledger_checks UNION ALL
 SELECT * FROM markers UNION ALL SELECT * FROM approvals
) checks
ORDER BY section,requirement;
ROLLBACK;
