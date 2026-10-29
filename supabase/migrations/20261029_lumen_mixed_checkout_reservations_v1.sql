-- Mixed Lumen/cash checkout escrow, reserved for future provider integration.
-- No customer-facing reserve/bind/capture route, no provider charges, no SKU enabled.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_lumen_mixed_intents_v1(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id uuid NOT NULL,
 sku text NOT NULL CHECK(sku ~ '^(addon|book|course|feature|membership|plan|tool):[A-Z0-9_-]{2,90}$'),
 original_cents integer NOT NULL CHECK(original_cents BETWEEN 1 AND 50000000),
 lumens_reserved integer NOT NULL CHECK(lumens_reserved BETWEEN 1 AND 10000000),
 discount_cents integer NOT NULL CHECK(discount_cents BETWEEN 1 AND 50000000),
 cash_due_cents integer NOT NULL CHECK(cash_due_cents BETWEEN 0 AND 50000000),
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','checkout_bound','cash_verified','released','disputed')),
 stripe_session_id text UNIQUE,
 stripe_payment_intent_id text,
 paid_event_id text UNIQUE,
 provider_paid_cents integer,
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '30 minutes'),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id),
 CHECK(discount_cents+cash_due_cents=original_cents),
 CHECK(discount_cents<=lumens_reserved*7),
 CHECK(discount_cents>=(lumens_reserved-1)*7+1),
 CHECK(stripe_session_id IS NULL OR stripe_session_id ~ '^cs_(test|live)_[A-Za-z0-9_]+$'),
 CHECK(stripe_payment_intent_id IS NULL OR stripe_payment_intent_id ~ '^pi_[A-Za-z0-9_]+$')
);
CREATE TABLE IF NOT EXISTS public.gu_lumen_mixed_debits_v1(
 intent_id uuid NOT NULL REFERENCES public.gu_lumen_mixed_intents_v1(id) ON DELETE CASCADE,
 bucket_id uuid NOT NULL REFERENCES public.groundup_question_pass_buckets(id),
 amount integer NOT NULL CHECK(amount>=1),
 returned_at timestamptz,
 PRIMARY KEY(intent_id,bucket_id)
);
ALTER TABLE public.gu_lumen_mixed_intents_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_lumen_mixed_debits_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_lumen_mixed_intents_v1,public.gu_lumen_mixed_debits_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_lumen_mixed_intents_v1 TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.gu_lumen_mixed_debits_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.gu_lumen_mixed_reserve_v1(
 p_user uuid,p_sku text,p_request uuid,p_lumens integer,p_expected_cents integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path='pg_catalog','pg_temp' AS $body$
DECLARE v_reg record;v_listing record;v_prior record;v_balance integer;
 v_discount integer;v_cash integer;v_id uuid;v_bucket record;
 v_take integer;v_remaining integer;
BEGIN
 IF p_user IS NULL OR p_request IS NULL OR p_sku IS NULL OR
 p_sku !~ '^(addon|book|course|feature|membership|plan|tool):[A-Z0-9_-]{2,90}$'
 OR p_lumens IS NULL OR p_lumens<1 OR p_lumens>10000000
 OR p_expected_cents IS NULL OR p_expected_cents<1 OR p_expected_cents>50000000
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REQUEST');END IF;
 -- This is the same user lock all current chart/ad-free/Lumen-only debits use.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,489301));
 SELECT * INTO v_prior FROM public.gu_lumen_mixed_intents_v1
 WHERE user_id=p_user AND request_id=p_request;
 IF FOUND THEN
  IF v_prior.sku<>p_sku OR v_prior.lumens_reserved<>p_lumens OR
    v_prior.original_cents<>p_expected_cents THEN
   RETURN jsonb_build_object('ok',false,'error','REQUEST_REUSED'); END IF;
  RETURN jsonb_build_object('ok',true,'id',v_prior.id,'status',v_prior.status,
   'cashCents',v_prior.cash_due_cents,'lumens',v_prior.lumens_reserved,
   'expiresAt',v_prior.expires_at,'alreadyReserved',true);
 END IF;
 SELECT sku,amount_cents,currency,billing_interval INTO v_reg
 FROM public.gu_owner_stripe_registry_v1 WHERE sku=p_sku;
 SELECT sku,sale_ready,visible,status INTO v_listing
 FROM public.gu_storefront_items_v014174 WHERE sku=p_sku;
 IF NOT FOUND OR v_reg.amount_cents IS NULL OR v_reg.amount_cents<>p_expected_cents
  OR v_reg.currency<>'usd' OR v_listing.sku IS NULL OR
   v_listing.sale_ready IS DISTINCT FROM true OR
   v_listing.visible IS DISTINCT FROM true OR
   v_listing.status IN ('paused','coming_soon','in_development','unavailable')
 THEN RETURN jsonb_build_object('ok',false,'error','OFFER_NOT_READY_OR_PRICE_CHANGED');END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles p JOIN auth.users a ON a.id=p.id
    WHERE p.id=p_user AND p.account_kind='member' AND p.deleted_at IS NULL
    AND a.email_confirmed_at IS NOT NULL AND a.deleted_at IS NULL
    AND (a.banned_until IS NULL OR a.banned_until<=now())) OR
 EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=p_user
  AND lower(f.status) IN ('suspended','restricted')) OR
 EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=p_user
  AND r.role_code='SHOWCASE_VIEWER'
  AND (r.expires_at IS NULL OR r.expires_at>now()))
 THEN RETURN jsonb_build_object('ok',false,'error','NOT_ELIGIBLE');END IF;
 IF EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=p_user
  AND r.role_code='OWNER' AND (r.expires_at IS NULL OR r.expires_at>now()))
 THEN RETURN jsonb_build_object('ok',false,'error','ALREADY_INCLUDED_OWNER');END IF;
 IF left(p_sku,5)='tool:' AND public.user_has_tool_access(p_user,substring(p_sku from 6))
 THEN RETURN jsonb_build_object('ok',false,'error','ALREADY_INCLUDED');END IF;
 -- Unresolved reservations on the same SKU must be resolved before repeat.
 IF EXISTS(SELECT 1 FROM public.gu_lumen_mixed_intents_v1 i
  WHERE i.user_id=p_user AND i.sku=p_sku AND
   i.status IN ('reserved','checkout_bound','disputed'))
 THEN RETURN jsonb_build_object('ok',false,'error','EXISTING_RESERVATION');END IF;
 IF p_lumens>(p_expected_cents+6)/7
 THEN RETURN jsonb_build_object('ok',false,'error','EXCEEDS_PRODUCT_PRICE');END IF;
 v_discount:=least(p_expected_cents,p_lumens*7);
 v_cash:=p_expected_cents-v_discount;
 SELECT coalesce(sum(remaining_credits),0)::integer INTO v_balance
 FROM public.groundup_question_pass_buckets
 WHERE user_id=p_user AND remaining_credits>0 AND expires_at IS NULL;
 IF v_balance<p_lumens
 THEN RETURN jsonb_build_object('ok',false,'error','INSUFFICIENT_LUMENS','available',v_balance);END IF;
 INSERT INTO public.gu_lumen_mixed_intents_v1(user_id,request_id,sku,original_cents,
   lumens_reserved,discount_cents,cash_due_cents)
 VALUES(p_user,p_request,p_sku,p_expected_cents,p_lumens,v_discount,v_cash)
 RETURNING id INTO v_id;
 v_remaining:=p_lumens;
 FOR v_bucket IN SELECT id,remaining_credits FROM public.groundup_question_pass_buckets
  WHERE user_id=p_user AND remaining_credits>0 AND expires_at IS NULL
  ORDER BY issued_at,id FOR UPDATE LOOP
  v_take:=least(v_bucket.remaining_credits,v_remaining);
  UPDATE public.groundup_question_pass_buckets
   SET remaining_credits=remaining_credits-v_take WHERE id=v_bucket.id;
  INSERT INTO public.gu_lumen_mixed_debits_v1(intent_id,bucket_id,amount)
    VALUES(v_id,v_bucket.id,v_take);
  v_remaining:=v_remaining-v_take;
  EXIT WHEN v_remaining=0;
 END LOOP;
 IF v_remaining<>0 THEN RAISE EXCEPTION 'ATOMIC_LUMEN_RESERVE_MISMATCH';END IF;
 RETURN jsonb_build_object('ok',true,'id',v_id,'status','reserved',
   'cashCents',v_cash,'lumens',p_lumens,'discountCents',v_discount,
   'alreadyReserved',false,'expiresAt',now()+interval '30 minutes');
END $body$;

-- Only a verified Stripe Checkout creation/binding service may call this
-- after cross-checking Stripe's id, subtotal, account, mode and intent metadata.
CREATE OR REPLACE FUNCTION public.gu_lumen_mixed_bind_v1(
 p_id uuid,p_session text,p_cash_cents integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='pg_catalog','pg_temp'
AS $body$
DECLARE i public.gu_lumen_mixed_intents_v1%rowtype;
BEGIN
 IF p_id IS NULL OR p_session !~ '^cs_(test|live)_[A-Za-z0-9_]+$'
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REQUEST');END IF;
 SELECT * INTO i FROM public.gu_lumen_mixed_intents_v1 WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','NOT_FOUND');END IF;
 IF i.status='checkout_bound' AND i.stripe_session_id=p_session AND i.cash_due_cents=p_cash_cents
 THEN RETURN jsonb_build_object('ok',true,'alreadyBound',true);END IF;
 IF i.status<>'reserved' OR i.cash_due_cents<>p_cash_cents OR i.expires_at<=now()
 THEN RETURN jsonb_build_object('ok',false,'error','RESERVATION_NOT_BINDABLE');END IF;
 IF p_cash_cents<=0
 THEN RETURN jsonb_build_object('ok',false,'error','FULL_LUMEN_ORDER_NEEDS_SEPARATE_FULFILLMENT');END IF;
 UPDATE public.gu_lumen_mixed_intents_v1 SET
  stripe_session_id=p_session,status='checkout_bound',updated_at=now()
  WHERE id=p_id;
 RETURN jsonb_build_object('ok',true,'alreadyBound',false);
END $body$;

-- Called only AFTER a signed Stripe event + independent Stripe API verification.
-- This audit step deliberately DOES NOT grant an entitlement or mark fulfilled.
CREATE OR REPLACE FUNCTION public.gu_lumen_mixed_mark_cash_verified_v1(
 p_id uuid,p_session text,p_payment_intent text,p_event text,p_paid_cents integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='pg_catalog','pg_temp'
AS $body$
DECLARE i public.gu_lumen_mixed_intents_v1%rowtype;
BEGIN
 IF p_id IS NULL OR p_session IS NULL OR
 p_payment_intent !~ '^pi_[A-Za-z0-9_]+$' OR
 p_event !~ '^evt_[A-Za-z0-9_]+$' OR p_paid_cents IS NULL
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_PROOF');END IF;
 SELECT * INTO i FROM public.gu_lumen_mixed_intents_v1 WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','NOT_FOUND');END IF;
 IF i.status='cash_verified' AND i.paid_event_id=p_event AND
  i.stripe_session_id=p_session AND i.provider_paid_cents=p_paid_cents
 THEN RETURN jsonb_build_object('ok',true,'alreadyVerified',true);END IF;
 IF i.status<>'checkout_bound' OR i.stripe_session_id<>p_session
   OR i.cash_due_cents<>p_paid_cents
 THEN RETURN jsonb_build_object('ok',false,'error','PAYMENT_MISMATCH');END IF;
 UPDATE public.gu_lumen_mixed_intents_v1 SET status='cash_verified',
  stripe_payment_intent_id=p_payment_intent,paid_event_id=p_event,
  provider_paid_cents=p_paid_cents,updated_at=now()
 WHERE id=p_id;
 RETURN jsonb_build_object('ok',true,'requiresFulfillment',true);
END $body$;

-- Release reserved credits ONLY after provider confirmation of no payment.
-- Never release cash_verified/disputed: those need audited refund/reconciliation.
CREATE OR REPLACE FUNCTION public.gu_lumen_mixed_release_v1(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='pg_catalog','pg_temp'
AS $body$
DECLARE i public.gu_lumen_mixed_intents_v1%rowtype; d record;
BEGIN
 SELECT * INTO i FROM public.gu_lumen_mixed_intents_v1 WHERE id=p_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','NOT_FOUND');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(i.user_id::text,489301));
 SELECT * INTO i FROM public.gu_lumen_mixed_intents_v1 WHERE id=p_id FOR UPDATE;
 IF i.status='released' THEN RETURN jsonb_build_object('ok',true,'alreadyReleased',true);END IF;
 IF i.status NOT IN ('reserved','checkout_bound')
 THEN RETURN jsonb_build_object('ok',false,'error','NEEDS_PAYMENT_RECONCILIATION');END IF;
 FOR d IN SELECT * FROM public.gu_lumen_mixed_debits_v1
  WHERE intent_id=p_id FOR UPDATE LOOP
  IF d.returned_at IS NOT NULL THEN RAISE EXCEPTION 'PARTIAL_RETURN_REVIEW_REQUIRED';END IF;
  UPDATE public.groundup_question_pass_buckets SET remaining_credits=remaining_credits+d.amount
    WHERE id=d.bucket_id AND user_id=i.user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'WALLET_BUCKET_MISSING';END IF;
  UPDATE public.gu_lumen_mixed_debits_v1 SET returned_at=now()
    WHERE intent_id=p_id AND bucket_id=d.bucket_id;
 END LOOP;
 UPDATE public.gu_lumen_mixed_intents_v1 SET status='released',updated_at=now()
   WHERE id=p_id;
 RETURN jsonb_build_object('ok',true,'releasedLumens',i.lumens_reserved);
END $body$;
REVOKE ALL ON FUNCTION public.gu_lumen_mixed_reserve_v1(uuid,text,uuid,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gu_lumen_mixed_bind_v1(uuid,text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gu_lumen_mixed_mark_cash_verified_v1(uuid,text,text,text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gu_lumen_mixed_release_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_lumen_mixed_reserve_v1(uuid,text,uuid,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.gu_lumen_mixed_bind_v1(uuid,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.gu_lumen_mixed_mark_cash_verified_v1(uuid,text,text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.gu_lumen_mixed_release_v1(uuid) TO service_role;
COMMIT;