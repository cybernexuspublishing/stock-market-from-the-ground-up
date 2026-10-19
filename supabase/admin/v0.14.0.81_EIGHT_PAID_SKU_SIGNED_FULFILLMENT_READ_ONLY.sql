-- Cyber Nexus | v0.14.0.81 | EXISTING PRODUCTION SUPABASE PROJECT
-- PAID GU58 EIGHT-SKU / FULFILLMENT ACCEPTANCE — READ ONLY
-- No customer identities, account IDs, Stripe IDs, credentials, charges, or
-- event payloads are returned. This is not a replacement for a real checkout.
-- Run once before opening paid checkout and again AFTER a real signed payment.
BEGIN TRANSACTION READ ONLY;
WITH expected(kind,sku_code,expected_cents,expected_cycle) AS (
 VALUES
 ('plan','FULL_MONTHLY',6999,'month'),
 ('plan','FULL_ANNUAL',69900,'year'),
 ('plan','LIFETIME',249900,'lifetime'),
 ('plan','ONDEMAND_MONTHLY',1999,'month'),
 ('tool','INTERACTIVE_LEARNING',2999,'month'),
 ('tool','JOURNAL_ANALYTICS',2999,'month'),
 ('tool','MARKET_SIMULATOR',2999,'month'),
 ('tool','MARKET_TUTOR',2999,'month')
),
catalog AS (
 SELECT e.kind,e.sku_code,e.expected_cents,e.expected_cycle,
 CASE WHEN e.kind='plan' THEN p.price_cents ELSE t.individual_price_cents END AS price_cents,
 CASE WHEN e.kind='plan' THEN p.billing_interval ELSE 'month' END AS cycle,
 CASE WHEN e.kind='plan' THEN p.currency ELSE 'USD' END AS currency,
 CASE WHEN e.kind='plan' THEN p.active ELSE t.active END AS active,
 CASE WHEN e.kind='plan' THEN p.public_visible ELSE t.public_visible END AS public_visible,
 CASE WHEN e.kind='plan' THEN p.checkout_enabled ELSE (t.status='live') END AS sku_checkout_eligible,
 CASE WHEN e.kind='plan' THEN p.plan_code IS NOT NULL ELSE t.tool_code IS NOT NULL END AS exists_in_db
 FROM expected e
 LEFT JOIN public.platform_plans p ON e.kind='plan' AND e.sku_code=p.plan_code
 LEFT JOIN public.platform_tools t ON e.kind='tool' AND e.sku_code=t.tool_code
),
paid_evidence AS (
 SELECT i.sku_kind,i.sku_code,
 COUNT(*) AS total_intents,
 COUNT(*) FILTER (WHERE i.status IN ('prepared','checkout_created')) AS pending_intents,
 COUNT(*) FILTER (WHERE i.status IN ('past_due','canceled','refunded','disputed','failed')) AS non_active_intents,
 COUNT(*) FILTER (
  WHERE i.stripe_session_id IS NOT NULL
  AND (i.stripe_subscription_id IS NOT NULL OR i.stripe_payment_intent_id IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM public.gu58_live_stripe_events ev
    WHERE ev.intent_id=i.id AND ev.outcome='applied'
      AND ev.event_type IN ('subscription_active','lifetime_paid')
  )
  AND (
   (i.sku_kind='plan' AND i.sku_code<>'LIFETIME' AND EXISTS (
      SELECT 1 FROM public.site_subscriptions s
      WHERE s.user_id=i.user_id AND s.plan_code=i.sku_code
        AND s.provider_subscription_id=i.stripe_subscription_id
        AND s.provider='STRIPE_MANAGED' AND s.status='active'
        AND s.current_period_end>now()))
   OR (i.sku_kind='tool' AND EXISTS(
      SELECT 1 FROM public.user_tool_passes t
      WHERE t.user_id=i.user_id AND t.tool_code=i.sku_code
        AND t.provider_subscription_id=i.stripe_subscription_id
        AND t.provider='STRIPE_MANAGED' AND t.status='active'
        AND COALESCE(t.current_period_end,t.ends_at)>now()))
   OR (i.sku_kind='plan' AND i.sku_code='LIFETIME' AND EXISTS(
      SELECT 1 FROM public.user_plan_grants g
      WHERE g.id=i.created_grant_id AND g.user_id=i.user_id AND g.plan_code='LIFETIME'
        AND g.status='active' AND g.source='payment_webhook'
        AND g.source_reference=i.stripe_payment_intent_id))
  )
 ) AS signed_payment_and_access_proofs,
 COUNT(*) FILTER (
  WHERE EXISTS (SELECT 1 FROM public.gu58_live_stripe_events ev
    WHERE ev.intent_id=i.id AND ev.outcome='applied'
    AND ev.event_type IN ('subscription_past_due','subscription_canceled',
       'subscription_refunded','subscription_disputed',
       'payment_refunded','payment_disputed'))
 ) AS signed_reversal_or_dunning_events,
 MAX(i.updated_at) AS last_payment_ledger_update
 FROM public.gu58_live_checkout_intents i
 GROUP BY i.sku_kind,i.sku_code
)
SELECT c.kind,c.sku_code,
 CASE WHEN NOT c.exists_in_db THEN 'BLOCKED_MISSING_PRODUCT'
      WHEN c.price_cents IS DISTINCT FROM c.expected_cents THEN 'REVIEW_PRICE_MISMATCH'
      WHEN c.cycle IS DISTINCT FROM c.expected_cycle THEN 'REVIEW_BILLING_INTERVAL'
      WHEN upper(coalesce(c.currency,''))<>'USD' THEN 'REVIEW_CURRENCY'
      ELSE 'CATALOG_STRUCTURE_OK' END AS product_contract,
 CASE WHEN c.active IS DISTINCT FROM true THEN 'OFF_INACTIVE'
      WHEN c.public_visible IS DISTINCT FROM true THEN 'OFF_NOT_VISIBLE'
      WHEN c.sku_checkout_eligible IS DISTINCT FROM true THEN 'OFF_SKU_GATE'
      ELSE 'SKU_ELIGIBLE_ONLY__GLOBAL_LIVE_APPROVAL_NOT_CHECKED' END AS configured_offer,
 COALESCE(p.total_intents,0) AS recorded_live_intents,
 COALESCE(p.pending_intents,0) AS unresolved_intents,
 COALESCE(p.signed_payment_and_access_proofs,0) AS matching_signed_payment_and_access,
 COALESCE(p.signed_reversal_or_dunning_events,0) AS lifecycle_events_observed,
 CASE WHEN COALESCE(p.signed_payment_and_access_proofs,0)>0
      THEN 'SIGNED_LIVE_ACCESS_EVIDENCE__REQUIRES_STRIPE_AND_UI_CONFIRMATION'
      ELSE 'NOT_VERIFIED_BY_REAL_PAID_STRIPE_CHECKOUT' END AS paid_fulfillment_status,
 p.last_payment_ledger_update
FROM catalog c
LEFT JOIN paid_evidence p ON p.sku_kind=c.kind AND p.sku_code=c.sku_code
ORDER BY CASE c.kind WHEN 'plan' THEN 0 ELSE 1 END,c.sku_code;
ROLLBACK;
