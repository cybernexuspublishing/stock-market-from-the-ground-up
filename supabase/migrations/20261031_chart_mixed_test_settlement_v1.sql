-- Chart Studio mixed Lumens + Stripe TEST V1; additive; no live commerce authorization.
BEGIN;
CREATE TABLE IF NOT EXISTS public.crownlight_chart_mixed_test_v1(
 upgrade_id uuid PRIMARY KEY REFERENCES public.crownlight_chart_cash_upgrades_v1(id),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id uuid NOT NULL,
 sku text NOT NULL CHECK(sku IN ('CHART_ADVANCED_30D','CHART_PROFESSIONAL_30D')),
 original_cents integer NOT NULL CHECK(original_cents IN (999,1999)),
 lumens integer NOT NULL CHECK(lumens>0),
 discount_cents integer NOT NULL CHECK(discount_cents>0),
 cash_cents integer NOT NULL CHECK(cash_cents>=0 AND (cash_cents=0 OR cash_cents>=50)),
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','bound','active','refunded','disputed','expired')),
 stripe_session_id text UNIQUE,
 stripe_payment_intent_id text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id),
 CONSTRAINT chart_mixed_exact_total CHECK(original_cents=discount_cents+cash_cents),
 CONSTRAINT chart_mixed_exact_sku CHECK((sku='CHART_ADVANCED_30D' AND original_cents=999) OR (sku='CHART_PROFESSIONAL_30D' AND original_cents=1999))
);
CREATE TABLE IF NOT EXISTS public.crownlight_chart_mixed_test_debits_v1(
 upgrade_id uuid NOT NULL REFERENCES public.crownlight_chart_mixed_test_v1(upgrade_id),
 bucket_id uuid NOT NULL REFERENCES public.groundup_question_pass_buckets(id),
 lumens integer NOT NULL CHECK(lumens>0),
 returned_at timestamptz,
 PRIMARY KEY(upgrade_id,bucket_id)
);
CREATE TABLE IF NOT EXISTS public.crownlight_chart_mixed_test_events_v1(
 event_id text PRIMARY KEY,
 upgrade_id uuid NOT NULL REFERENCES public.crownlight_chart_mixed_test_v1(upgrade_id),
 kind text NOT NULL CHECK(kind IN ('paid','zero','refunded','disputed','expired')),
 occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crownlight_chart_mixed_test_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crownlight_chart_mixed_test_debits_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crownlight_chart_mixed_test_events_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crownlight_chart_mixed_test_v1,public.crownlight_chart_mixed_test_debits_v1,public.crownlight_chart_mixed_test_events_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.crownlight_chart_mixed_test_v1,public.crownlight_chart_mixed_test_debits_v1,public.crownlight_chart_mixed_test_events_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.chart_mixed_test_reserve_v1(p_user uuid,p_sku text,p_request uuid,p_lumens integer,p_price text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','pg_temp' AS $fn$
DECLARE t text; original integer; off_cents integer; remainder integer; have integer; rem integer; b record; v_id uuid; existing record;
BEGIN
 IF p_user IS NULL OR p_request IS NULL OR p_price !~ '^price_[A-Za-z0-9_]{6,}$' OR
 p_lumens IS NULL OR p_lumens<1 OR p_sku NOT IN ('CHART_ADVANCED_30D','CHART_PROFESSIONAL_30D')
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_RESERVATION');END IF;
 t:=CASE p_sku WHEN 'CHART_ADVANCED_30D' THEN 'ADVANCED' ELSE 'PROFESSIONAL' END;
 original:=CASE p_sku WHEN 'CHART_ADVANCED_30D' THEN 999 ELSE 1999 END;
 IF p_lumens>ceil(original/7.0)::integer THEN RETURN jsonb_build_object('ok',false,'error','EXCESS_LUMENS');END IF;
 off_cents:=least(original,p_lumens*7);remainder:=original-off_cents;
 IF remainder BETWEEN 1 AND 49 THEN RETURN jsonb_build_object('ok',false,'error','CARD_MINIMUM');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,489301));
 SELECT * INTO existing FROM public.crownlight_chart_mixed_test_v1 WHERE user_id=p_user AND request_id=p_request;
 IF FOUND THEN
  IF existing.sku<>p_sku OR existing.lumens<>p_lumens OR existing.status NOT IN ('reserved','bound','active') THEN
   RETURN jsonb_build_object('ok',false,'error','REQUEST_CONFLICT');END IF;
  RETURN jsonb_build_object('ok',true,'upgradeId',existing.upgrade_id,'cashCents',existing.cash_cents,'status',existing.status,'alreadyReserved',true);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE p.id=p_user
  AND u.email_confirmed_at IS NOT NULL AND u.deleted_at IS NULL AND p.deleted_at IS NULL)
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_MEMBER');END IF;
 IF EXISTS(SELECT 1 FROM public.crownlight_chart_mixed_test_v1 WHERE user_id=p_user AND status IN ('reserved','bound'))
 THEN RETURN jsonb_build_object('ok',false,'error','PENDING_MIXED_ORDER');END IF;
 IF EXISTS(SELECT 1 FROM public.crownlight_chart_cash_upgrades_v1 WHERE user_id=p_user AND
  ((state='pending' AND sku=p_sku) OR (state='active' AND revoked_at IS NULL AND expires_at>now() AND
   (tier=t OR tier='PROFESSIONAL'))))
 THEN RETURN jsonb_build_object('ok',false,'error','ALREADY_OWNED_OR_PENDING');END IF;
 SELECT coalesce(sum(remaining_credits),0)::integer INTO have FROM public.groundup_question_pass_buckets
 WHERE user_id=p_user AND remaining_credits>0 AND expires_at IS NULL;
 IF have<p_lumens THEN RETURN jsonb_build_object('ok',false,'error','INSUFFICIENT_LUMENS');END IF;
 INSERT INTO public.crownlight_chart_cash_upgrades_v1(user_id,sku,tier,stripe_price_id,amount_cents)
 VALUES(p_user,p_sku,t,p_price,original) RETURNING id INTO v_id;
 INSERT INTO public.crownlight_chart_mixed_test_v1(upgrade_id,user_id,request_id,sku,original_cents,lumens,discount_cents,cash_cents)
 VALUES(v_id,p_user,p_request,p_sku,original,p_lumens,off_cents,remainder);
 rem:=p_lumens;
 FOR b IN SELECT id,remaining_credits FROM public.groundup_question_pass_buckets
 WHERE user_id=p_user AND remaining_credits>0 AND expires_at IS NULL ORDER BY issued_at,id FOR UPDATE LOOP
  EXIT WHEN rem=0;
  UPDATE public.groundup_question_pass_buckets SET remaining_credits=remaining_credits-least(rem,b.remaining_credits) WHERE id=b.id;
  INSERT INTO public.crownlight_chart_mixed_test_debits_v1(upgrade_id,bucket_id,lumens) VALUES(v_id,b.id,least(rem,b.remaining_credits));
  rem:=rem-least(rem,b.remaining_credits);
 END LOOP;
 IF rem<>0 THEN RAISE EXCEPTION 'WALLET_RESERVE_INVARIANT';END IF;
 RETURN jsonb_build_object('ok',true,'upgradeId',v_id,'cashCents',remainder,'discountCents',off_cents,'lumens',p_lumens,'status','reserved','alreadyReserved',false);
END $fn$;

CREATE OR REPLACE FUNCTION public.chart_mixed_test_bind_v1(p_upgrade uuid,p_session text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','pg_temp' AS $fn$
DECLARE o public.crownlight_chart_mixed_test_v1%ROWTYPE;
BEGIN
 IF p_session !~ '^cs_test_[A-Za-z0-9_]{6,}$' THEN RETURN jsonb_build_object('ok',false,'error','INVALID_SESSION');END IF;
 SELECT * INTO o FROM public.crownlight_chart_mixed_test_v1 WHERE upgrade_id=p_upgrade FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','NOT_FOUND');END IF;
 IF o.status='bound' AND o.stripe_session_id=p_session THEN RETURN jsonb_build_object('ok',true,'duplicate',true);END IF;
 IF o.status<>'reserved' OR o.cash_cents<50 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_BIND');END IF;
 UPDATE public.crownlight_chart_mixed_test_v1 SET stripe_session_id=p_session,status='bound',updated_at=now() WHERE upgrade_id=p_upgrade;
 UPDATE public.crownlight_chart_cash_upgrades_v1 SET stripe_session_id=p_session,updated_at=now() WHERE id=p_upgrade AND state='pending';
 RETURN jsonb_build_object('ok',true);
END $fn$;

CREATE OR REPLACE FUNCTION public.chart_mixed_test_apply_v1(p_upgrade uuid,p_kind text,p_event text,p_session text DEFAULT NULL,p_intent text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','pg_temp' AS $fn$
DECLARE o public.crownlight_chart_mixed_test_v1%ROWTYPE; d record; current_status text; now_at timestamptz:=now();
BEGIN
 IF p_upgrade IS NULL OR p_kind NOT IN ('paid','zero','refunded','disputed','expired') OR p_event IS NULL
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_EVENT');END IF;
 IF p_kind='zero' AND p_event<>('zero_'||p_upgrade::text) THEN RETURN jsonb_build_object('ok',false,'error','INVALID_ZERO_PROOF');END IF;
 IF p_kind<>'zero' AND p_event !~ '^evt_[A-Za-z0-9_]{6,}$' THEN RETURN jsonb_build_object('ok',false,'error','INVALID_STRIPE_EVENT');END IF;
 SELECT * INTO o FROM public.crownlight_chart_mixed_test_v1 WHERE upgrade_id=p_upgrade;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','UNKNOWN_ORDER');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(o.user_id::text,489301));
 SELECT * INTO o FROM public.crownlight_chart_mixed_test_v1 WHERE upgrade_id=p_upgrade FOR UPDATE;
 SELECT state INTO current_status FROM public.crownlight_chart_cash_upgrades_v1 WHERE id=p_upgrade FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.crownlight_chart_mixed_test_events_v1 WHERE event_id=p_event)
 THEN RETURN jsonb_build_object('ok',true,'duplicate',true,'status',o.status);END IF;
 IF p_kind='paid' OR p_kind='zero' THEN
  IF (p_kind='paid' AND (o.status<>'bound' OR o.cash_cents<50 OR o.stripe_session_id IS DISTINCT FROM p_session OR p_intent !~ '^pi_[A-Za-z0-9_]{6,}$')) OR
   (p_kind='zero' AND (o.status<>'reserved' OR o.cash_cents<>0 OR p_intent IS NOT NULL OR p_session IS NOT NULL)) OR
   current_status<>'pending' THEN RETURN jsonb_build_object('ok',false,'error','FULFILLMENT_MISMATCH');END IF;
  UPDATE public.crownlight_chart_mixed_test_v1 SET status='active',stripe_payment_intent_id=p_intent,updated_at=now_at WHERE upgrade_id=p_upgrade;
  UPDATE public.crownlight_chart_cash_upgrades_v1 SET state='active',stripe_payment_intent_id=p_intent,
   starts_at=now_at,expires_at=now_at+interval '30 days',updated_at=now_at WHERE id=p_upgrade;
 ELSIF p_kind IN ('refunded','disputed') THEN
  IF o.status NOT IN ('active','disputed','refunded') OR o.cash_cents=0 OR o.stripe_payment_intent_id IS DISTINCT FROM p_intent THEN
   RETURN jsonb_build_object('ok',false,'error','REVERSAL_MISMATCH');END IF;
  IF o.status='active' THEN
   FOR d IN SELECT * FROM public.crownlight_chart_mixed_test_debits_v1 WHERE upgrade_id=p_upgrade FOR UPDATE LOOP
    IF d.returned_at IS NOT NULL THEN RAISE EXCEPTION 'CREDITS_ALREADY_RETURNED';END IF;
    UPDATE public.groundup_question_pass_buckets SET remaining_credits=remaining_credits+d.lumens
     WHERE id=d.bucket_id AND user_id=o.user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'MISSING_LUMEN_BUCKET';END IF;
    UPDATE public.crownlight_chart_mixed_test_debits_v1 SET returned_at=now_at WHERE upgrade_id=p_upgrade AND bucket_id=d.bucket_id;
   END LOOP;
  END IF;
  UPDATE public.crownlight_chart_mixed_test_v1 SET status=CASE WHEN o.status='refunded' THEN 'refunded' ELSE p_kind END,updated_at=now_at WHERE upgrade_id=p_upgrade;
  UPDATE public.crownlight_chart_cash_upgrades_v1 SET state=CASE WHEN o.status='refunded' THEN 'refunded' ELSE p_kind END,
   revoked_at=coalesce(revoked_at,now_at),updated_at=now_at WHERE id=p_upgrade;
 ELSE
  IF o.status NOT IN ('reserved','bound') OR current_status<>'pending' THEN RETURN jsonb_build_object('ok',false,'error','EXPIRE_MISMATCH');END IF;
  FOR d IN SELECT * FROM public.crownlight_chart_mixed_test_debits_v1 WHERE upgrade_id=p_upgrade FOR UPDATE LOOP
   IF d.returned_at IS NOT NULL THEN RAISE EXCEPTION 'CREDITS_ALREADY_RETURNED';END IF;
   UPDATE public.groundup_question_pass_buckets SET remaining_credits=remaining_credits+d.lumens WHERE id=d.bucket_id AND user_id=o.user_id;
   IF NOT FOUND THEN RAISE EXCEPTION 'MISSING_LUMEN_BUCKET';END IF;
   UPDATE public.crownlight_chart_mixed_test_debits_v1 SET returned_at=now_at WHERE upgrade_id=p_upgrade AND bucket_id=d.bucket_id;
  END LOOP;
  UPDATE public.crownlight_chart_mixed_test_v1 SET status='expired',updated_at=now_at WHERE upgrade_id=p_upgrade;
  UPDATE public.crownlight_chart_cash_upgrades_v1 SET state='expired',updated_at=now_at WHERE id=p_upgrade;
 END IF;
 INSERT INTO public.crownlight_chart_mixed_test_events_v1(event_id,upgrade_id,kind) VALUES(p_event,p_upgrade,p_kind);
 RETURN jsonb_build_object('ok',true,'status',p_kind);
END $fn$;
REVOKE ALL ON FUNCTION public.chart_mixed_test_reserve_v1(uuid,text,uuid,integer,text),public.chart_mixed_test_bind_v1(uuid,text),public.chart_mixed_test_apply_v1(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.chart_mixed_test_reserve_v1(uuid,text,uuid,integer,text),public.chart_mixed_test_bind_v1(uuid,text),public.chart_mixed_test_apply_v1(uuid,text,text,text,text) TO service_role;
COMMIT;
