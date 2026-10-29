-- Additive Lumen-only tool-pass checkout. All offers remain DRAFT until priced
-- and approved; no existing buyer charged; no imported wallet credits changed.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_lumen_tool_offers_v1(
 offer_code text PRIMARY KEY CHECK(offer_code ~ '^[A-Z][A-Z0-9_]{2,79}$'),
 tool_code text NOT NULL REFERENCES public.platform_tools(tool_code),
 duration_days integer NOT NULL CHECK(duration_days IN (1,7,14,30,180)),
 price_cents integer CHECK(price_cents BETWEEN 1 AND 50000000),
 lumens_cost integer GENERATED ALWAYS AS ((price_cents+6)/7) STORED,
 state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','active','retired')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tool_code,duration_days),
 CHECK(state<>'active' OR price_cents IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS public.gu_lumen_tool_redemptions_v1(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id uuid NOT NULL,
 offer_code text NOT NULL REFERENCES public.gu_lumen_tool_offers_v1(offer_code),
 cost_lumens integer NOT NULL CHECK(cost_lumens>0),
 tool_pass_id bigint NOT NULL REFERENCES public.user_tool_passes(id),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id)
);
CREATE TABLE IF NOT EXISTS public.gu_lumen_tool_debits_v1(
 redemption_id uuid NOT NULL REFERENCES public.gu_lumen_tool_redemptions_v1(id),
 bucket_id uuid NOT NULL REFERENCES public.groundup_question_pass_buckets(id),
 amount integer NOT NULL CHECK(amount>0),
 PRIMARY KEY(redemption_id,bucket_id)
);
ALTER TABLE public.gu_lumen_tool_offers_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_lumen_tool_redemptions_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_lumen_tool_debits_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_lumen_tool_offers_v1 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.gu_lumen_tool_redemptions_v1 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.gu_lumen_tool_debits_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT, INSERT, UPDATE ON public.gu_lumen_tool_offers_v1 TO service_role;
GRANT SELECT, INSERT ON public.gu_lumen_tool_redemptions_v1 TO service_role;
GRANT SELECT, INSERT ON public.gu_lumen_tool_debits_v1 TO service_role;
INSERT INTO public.gu_lumen_tool_offers_v1(offer_code,tool_code,duration_days)
SELECT p.tool_code||'_'||d.day::text||'D',p.tool_code,d.day
FROM public.platform_tools p
CROSS JOIN (VALUES (1),(7),(14),(30),(180)) AS d(day)
WHERE p.tool_code IN ('JOURNAL_ANALYTICS','WATCHLIST_WORKBENCH')
ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.gu_lumen_tool_redeem_v1(
 p_user_id uuid,p_offer_code text,p_request_id uuid,p_expected_cost integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog','pg_temp'
AS $body$
DECLARE v_offer public.gu_lumen_tool_offers_v1%rowtype;
 v_previous public.gu_lumen_tool_redemptions_v1%rowtype;
 v_pass bigint;v_redemption uuid;v_until timestamptz;
 v_total integer;v_remaining integer;v_amount integer;v_bucket record;
BEGIN
 IF p_user_id IS NULL OR p_request_id IS NULL
 OR p_offer_code !~ '^[A-Z][A-Z0-9_]{2,79}$'
 OR p_expected_cost IS NULL OR p_expected_cost<1 OR p_expected_cost>10000000 THEN
 RETURN jsonb_build_object('ok',false,'error','INVALID_REQUEST');END IF;
 -- Shared lock with existing ad-free and chart redemption functions, so
 -- concurrent debits for this member cannot use the same credits twice.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,489301));
 SELECT * INTO v_previous FROM public.gu_lumen_tool_redemptions_v1
 WHERE user_id=p_user_id AND request_id=p_request_id;
 IF FOUND THEN
  IF v_previous.offer_code<>p_offer_code OR v_previous.cost_lumens<>p_expected_cost THEN
   RETURN jsonb_build_object('ok',false,'error','REQUEST_REUSED');END IF;
  RETURN jsonb_build_object('ok',true,'alreadyRedeemed',true,
    'spent',v_previous.cost_lumens,'expiresAt',v_previous.expires_at,
    'passId',v_previous.tool_pass_id);
 END IF;
 SELECT * INTO v_offer FROM public.gu_lumen_tool_offers_v1
 WHERE offer_code=p_offer_code AND state='active' FOR SHARE;
 IF NOT FOUND OR v_offer.lumens_cost IS NULL THEN
  RETURN jsonb_build_object('ok',false,'error','OFFER_UNAVAILABLE');END IF;
 IF v_offer.lumens_cost<>p_expected_cost THEN
  RETURN jsonb_build_object('ok',false,'error','PRICE_CHANGED');END IF;
 IF NOT EXISTS(SELECT 1 FROM public.platform_tools t
  WHERE t.tool_code=v_offer.tool_code AND t.active=true
  AND t.status IN ('live','beta')) THEN
  RETURN jsonb_build_object('ok',false,'error','PRODUCT_UNAVAILABLE');END IF;
 IF NOT EXISTS(SELECT 1 FROM public.gu_product_access_config_v1 a
  WHERE a.product_code=v_offer.tool_code AND a.paid_access=true
    AND v_offer.duration_days=ANY(a.purchase_durations)) THEN
  RETURN jsonb_build_object('ok',false,'error','DURATION_UNAVAILABLE');END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN auth.users a ON a.id=p.id
  WHERE p.id=p_user_id AND p.account_kind='member' AND p.deleted_at IS NULL
  AND a.email_confirmed_at IS NOT NULL AND a.deleted_at IS NULL
  AND (a.banned_until IS NULL OR a.banned_until<=now())) OR
 EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=p_user_id
  AND lower(f.status) IN ('restricted','suspended')) OR
 EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=p_user_id
  AND r.role_code='SHOWCASE_VIEWER'
  AND (r.expires_at IS NULL OR r.expires_at>now())) THEN
  RETURN jsonb_build_object('ok',false,'error','NOT_ELIGIBLE');END IF;
 IF public.user_has_tool_access(p_user_id,v_offer.tool_code) THEN
  RETURN jsonb_build_object('ok',false,'error','ALREADY_INCLUDED');END IF;
 SELECT coalesce(sum(remaining_credits),0)::integer INTO v_total
 FROM public.groundup_question_pass_buckets
 WHERE user_id=p_user_id AND remaining_credits>0 AND expires_at IS NULL;
 IF v_total<v_offer.lumens_cost THEN
  RETURN jsonb_build_object('ok',false,'error','INSUFFICIENT_LUMENS',
    'available',v_total);END IF;
 v_until:=clock_timestamp()+make_interval(days=>v_offer.duration_days);
 INSERT INTO public.user_tool_passes(
  user_id,tool_code,status,starts_at,ends_at,provider,
  current_period_end,cancel_at_period_end,metadata)
 VALUES(p_user_id,v_offer.tool_code,'active',clock_timestamp(),v_until,
   'CROWNLIGHT_LUMENS',v_until,true,
   jsonb_build_object('offer_code',v_offer.offer_code,'request_id',p_request_id,
    'payment_type','LUMENS_ONLY','auto_renew',false,'lumen_rate_cents',7))
 RETURNING id INTO v_pass;
 INSERT INTO public.gu_lumen_tool_redemptions_v1(
  user_id,request_id,offer_code,cost_lumens,tool_pass_id,expires_at)
 VALUES(p_user_id,p_request_id,v_offer.offer_code,v_offer.lumens_cost,v_pass,v_until)
 RETURNING id INTO v_redemption;
 v_remaining:=v_offer.lumens_cost;
 FOR v_bucket IN SELECT id,remaining_credits
 FROM public.groundup_question_pass_buckets
 WHERE user_id=p_user_id AND remaining_credits>0 AND expires_at IS NULL
 ORDER BY issued_at,id FOR UPDATE LOOP
  v_amount:=least(v_remaining,v_bucket.remaining_credits);
  UPDATE public.groundup_question_pass_buckets
  SET remaining_credits=remaining_credits-v_amount WHERE id=v_bucket.id;
  INSERT INTO public.gu_lumen_tool_debits_v1(redemption_id,bucket_id,amount)
  VALUES(v_redemption,v_bucket.id,v_amount);
  v_remaining:=v_remaining-v_amount;
  EXIT WHEN v_remaining=0;
 END LOOP;
 IF v_remaining<>0 THEN RAISE EXCEPTION 'ATOMIC_LUMEN_TOOL_DEBIT_FAILED';END IF;
 RETURN jsonb_build_object('ok',true,'alreadyRedeemed',false,
  'spent',v_offer.lumens_cost,'priceCents',v_offer.price_cents,
  'expiresAt',v_until,'passId',v_pass,'tool',v_offer.tool_code,
  'availableAfter',v_total-v_offer.lumens_cost);
END $body$;
REVOKE ALL ON FUNCTION public.gu_lumen_tool_redeem_v1(uuid,text,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_lumen_tool_redeem_v1(uuid,text,uuid,integer) TO service_role;
COMMIT;