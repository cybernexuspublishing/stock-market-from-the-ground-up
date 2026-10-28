-- Crownlight Sparks centralized catalog and chart passes v1 (2026-10-28).
-- Service-role only catalog mutation; OWNER API writes with version checks and audit.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_sparks_price_catalog_v1(
 sku text PRIMARY KEY CHECK(sku ~ '^[A-Z][A-Z0-9_]{2,79}$'),
 category text NOT NULL CHECK(category IN ('CHART_STUDIO','AD_FREE','PRACTICE','OTHER')),
 label text NOT NULL CHECK(length(label) BETWEEN 3 AND 120),
 description text NOT NULL DEFAULT '',
 sparks_cost integer NOT NULL CHECK(sparks_cost BETWEEN 1 AND 100000),
 duration_hours integer CHECK(duration_hours IS NULL OR duration_hours BETWEEN 1 AND 8760),
 fulfillment text NOT NULL CHECK(fulfillment IN ('CHART_PASS','ADFREE_PASS','PRACTICE_ACTION','UNINTEGRATED')),
 state text NOT NULL DEFAULT 'planned' CHECK(state IN ('active','planned','disabled')),
 version integer NOT NULL DEFAULT 1 CHECK(version>=1),
 updated_by uuid REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT price_activation_requires_implementation CHECK(state<>'active' OR fulfillment<>'UNINTEGRATED')
);
ALTER TABLE public.gu_sparks_price_catalog_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_sparks_price_catalog_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_sparks_price_catalog_v1 TO service_role;
INSERT INTO public.gu_sparks_price_catalog_v1(sku,category,label,description,sparks_cost,duration_hours,fulfillment,state)
VALUES
 ('CHART_ADVANCED_DAY','CHART_STUDIO','Advanced Chart Studio — 24 hours','Advanced and Standard educational chart tools; no historical-data license',6,24,'CHART_PASS','active'),
 ('CHART_ADVANCED_WEEK','CHART_STUDIO','Advanced Chart Studio — 7 days','Advanced and Standard educational chart tools; no historical-data license',24,168,'CHART_PASS','active'),
 ('CHART_ADVANCED_MONTH','CHART_STUDIO','Advanced Chart Studio — 30 days','Advanced and Standard educational chart tools; no historical-data license',75,720,'CHART_PASS','active'),
 ('CHART_PROFESSIONAL_DAY','CHART_STUDIO','Professional Chart Studio — 24 hours','Professional, Advanced and Standard educational chart tools',12,24,'CHART_PASS','active'),
 ('CHART_PROFESSIONAL_WEEK','CHART_STUDIO','Professional Chart Studio — 7 days','Professional, Advanced and Standard educational chart tools',45,168,'CHART_PASS','active'),
 ('CHART_PROFESSIONAL_MONTH','CHART_STUDIO','Professional Chart Studio — 30 days','Professional, Advanced and Standard educational chart tools',125,720,'CHART_PASS','active'),
 ('ADFREE_DAY','AD_FREE','Ad-free — 24 hours','Temporary sponsor-ad suppression for eligible members',5,24,'ADFREE_PASS','active'),
 ('ADFREE_WEEK','AD_FREE','Ad-free — 7 days','Temporary sponsor-ad suppression for eligible members',18,168,'ADFREE_PASS','active'),
 ('ADFREE_MONTH','AD_FREE','Ad-free — 30 days','Temporary sponsor-ad suppression for eligible members',50,720,'ADFREE_PASS','active'),
 ('PRACTICE_REVEAL','PRACTICE','Ungraded answer reveal','Eligible ungraded answer reveal; never awards mastery',4,NULL,'PRACTICE_ACTION','active'),
 ('PRACTICE_SKIP','PRACTICE','Ungraded question skip','Eligible ungraded question skip; never awards mastery',4,NULL,'PRACTICE_ACTION','active')
ON CONFLICT (sku) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.gu_sparks_chart_passes_v1(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 tier text NOT NULL CHECK(tier IN ('ADVANCED','PROFESSIONAL')),
 expires_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,tier)
);
CREATE TABLE IF NOT EXISTS public.gu_sparks_chart_redemptions_v1(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 request_id uuid NOT NULL,
 sku text NOT NULL REFERENCES public.gu_sparks_price_catalog_v1(sku),
 tier text NOT NULL CHECK(tier IN ('ADVANCED','PROFESSIONAL')),
 sparks_spent integer NOT NULL CHECK(sparks_spent>0),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id)
);
CREATE TABLE IF NOT EXISTS public.gu_sparks_chart_debits_v1(
 redemption_id uuid NOT NULL REFERENCES public.gu_sparks_chart_redemptions_v1(id) ON DELETE RESTRICT,
 bucket_id uuid NOT NULL REFERENCES public.groundup_question_pass_buckets(id) ON DELETE RESTRICT,
 amount integer NOT NULL CHECK(amount>0),
 PRIMARY KEY(redemption_id,bucket_id)
);
ALTER TABLE public.gu_sparks_chart_passes_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_sparks_chart_redemptions_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_sparks_chart_debits_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_sparks_chart_passes_v1, public.gu_sparks_chart_redemptions_v1,
 public.gu_sparks_chart_debits_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_sparks_chart_passes_v1 TO service_role;
GRANT SELECT,INSERT ON public.gu_sparks_chart_redemptions_v1,public.gu_sparks_chart_debits_v1 TO service_role;
CREATE OR REPLACE FUNCTION public.gu_sparks_chart_redeem_v1(
 p_user_id uuid,p_sku text,p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_offer public.gu_sparks_price_catalog_v1%rowtype;
 v_tier text;v_previous record;v_cost integer;v_balance integer;
 v_bucket record;v_take integer;v_remaining integer;v_id uuid;v_old timestamptz;v_new timestamptz;
BEGIN
 IF p_user_id IS NULL OR p_request_id IS NULL OR p_sku NOT IN
 ('CHART_ADVANCED_DAY','CHART_ADVANCED_WEEK','CHART_ADVANCED_MONTH',
  'CHART_PROFESSIONAL_DAY','CHART_PROFESSIONAL_WEEK','CHART_PROFESSIONAL_MONTH')
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REQUEST');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,489301));
 SELECT sku,tier,sparks_spent,expires_at INTO v_previous
 FROM public.gu_sparks_chart_redemptions_v1
 WHERE user_id=p_user_id AND request_id=p_request_id;
 IF FOUND THEN
  IF v_previous.sku<>p_sku THEN RETURN jsonb_build_object('ok',false,'error','REQUEST_REUSED');END IF;
  RETURN jsonb_build_object('ok',true,'alreadyRedeemed',true,'spent',v_previous.sparks_spent,
    'tier',v_previous.tier,'expiresAt',v_previous.expires_at,
    'balance',public.groundup_question_pass_summary(p_user_id));
 END IF;
 SELECT * INTO v_offer FROM public.gu_sparks_price_catalog_v1
 WHERE sku=p_sku AND fulfillment='CHART_PASS' AND state='active' FOR SHARE;
 IF NOT FOUND OR v_offer.duration_hours IS NULL THEN
  RETURN jsonb_build_object('ok',false,'error','OFFER_UNAVAILABLE');END IF;
 v_tier:=CASE WHEN p_sku LIKE 'CHART_ADVANCED_%' THEN 'ADVANCED' ELSE 'PROFESSIONAL' END;
 IF NOT EXISTS (SELECT 1 FROM public.profiles p JOIN auth.users a ON a.id=p.id
   WHERE p.id=p_user_id AND p.account_kind='member' AND p.deleted_at IS NULL
    AND a.email_confirmed_at IS NOT NULL AND a.deleted_at IS NULL
    AND (a.banned_until IS NULL OR a.banned_until<=now()))
 OR EXISTS (SELECT 1 FROM public.admin_user_flags WHERE user_id=p_user_id
    AND lower(status) IN ('restricted','suspended'))
 OR EXISTS (SELECT 1 FROM public.admin_user_roles WHERE user_id=p_user_id
    AND role_code='SHOWCASE_VIEWER' AND (expires_at IS NULL OR expires_at>now()))
 THEN RETURN jsonb_build_object('ok',false,'error','NOT_ELIGIBLE');END IF;
 -- Prevent paying for tier already included by existing full memberships or founding paid cycles.
 IF EXISTS (SELECT 1 FROM public.user_plan_grants
   WHERE user_id=p_user_id AND plan_code IN ('FULL_MONTHLY','FULL_ANNUAL','LIFETIME')
    AND status='active' AND starts_at<=now() AND (ends_at IS NULL OR ends_at>now()))
 OR EXISTS (SELECT 1 FROM public.gu_founder_paid_cycles_v014173 c
   JOIN public.gu_founder_members_v014173 m ON m.user_id=c.user_id
   WHERE c.user_id=p_user_id AND m.revoked_at IS NULL AND c.reversed_at IS NULL
    AND c.billing_start<=now() AND c.billing_end>now()
    AND (c.plan_code='FOUNDING_60' OR (v_tier='ADVANCED' AND c.plan_code='FOUNDING_30')))
 THEN RETURN jsonb_build_object('ok',false,'error','ALREADY_INCLUDED');END IF;
 IF v_tier='ADVANCED' AND EXISTS(SELECT 1 FROM public.gu_sparks_chart_passes_v1
   WHERE user_id=p_user_id AND tier='PROFESSIONAL' AND expires_at>now())
 THEN RETURN jsonb_build_object('ok',false,'error','ALREADY_INCLUDED');END IF;
 v_cost:=v_offer.sparks_cost;v_remaining:=v_cost;
 SELECT coalesce(sum(remaining_credits),0)::integer INTO v_balance
 FROM public.groundup_question_pass_buckets
 WHERE user_id=p_user_id AND remaining_credits>0
 AND (expires_at IS NULL OR expires_at>now());
 IF v_balance<v_cost THEN RETURN jsonb_build_object('ok',false,'error','INSUFFICIENT_SPARKS',
   'balance',public.groundup_question_pass_summary(p_user_id));END IF;
 SELECT expires_at INTO v_old FROM public.gu_sparks_chart_passes_v1
 WHERE user_id=p_user_id AND tier=v_tier FOR UPDATE;
 v_new:=greatest(coalesce(v_old,clock_timestamp()),clock_timestamp())+
   make_interval(hours=>v_offer.duration_hours);
 IF v_new>clock_timestamp()+interval '365 days' THEN
   RETURN jsonb_build_object('ok',false,'error','PASS_EXTENSION_LIMIT');END IF;
 INSERT INTO public.gu_sparks_chart_redemptions_v1(user_id,request_id,sku,tier,sparks_spent,expires_at)
 VALUES(p_user_id,p_request_id,p_sku,v_tier,v_cost,v_new) RETURNING id INTO v_id;
 FOR v_bucket IN SELECT id,remaining_credits
  FROM public.groundup_question_pass_buckets WHERE user_id=p_user_id AND remaining_credits>0
   AND (expires_at IS NULL OR expires_at>now())
  ORDER BY expires_at ASC NULLS LAST,issued_at,id FOR UPDATE
 LOOP
  v_take:=least(v_remaining,v_bucket.remaining_credits);
  UPDATE public.groundup_question_pass_buckets SET remaining_credits=remaining_credits-v_take
    WHERE id=v_bucket.id;
  INSERT INTO public.gu_sparks_chart_debits_v1(redemption_id,bucket_id,amount)
   VALUES(v_id,v_bucket.id,v_take);
  v_remaining:=v_remaining-v_take;
  EXIT WHEN v_remaining=0;
 END LOOP;
 IF v_remaining<>0 THEN RAISE EXCEPTION 'ATOMIC_CHART_DEBIT_FAILURE';END IF;
 INSERT INTO public.gu_sparks_chart_passes_v1(user_id,tier,expires_at)
 VALUES(p_user_id,v_tier,v_new)
 ON CONFLICT(user_id,tier) DO UPDATE SET expires_at=EXCLUDED.expires_at,updated_at=now();
 RETURN jsonb_build_object('ok',true,'alreadyRedeemed',false,'spent',v_cost,
   'tier',v_tier,'expiresAt',v_new,'balance',public.groundup_question_pass_summary(p_user_id));
END $fn$;
REVOKE ALL ON FUNCTION public.gu_sparks_chart_redeem_v1(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_sparks_chart_redeem_v1(uuid,text,uuid) TO service_role;
COMMIT;
