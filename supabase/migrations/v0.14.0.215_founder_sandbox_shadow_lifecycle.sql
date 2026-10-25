-- v0.14.0.215: ISOLATED Stripe Sandbox Founding-600 acceptance ledger.
-- Never grants a real founding number, site_subscriptions, or Crownlight Sparks.
-- Only server role; test-mode event signature and Stripe re-fetch required.
CREATE TABLE IF NOT EXISTS public.gu_f600_sandbox_intents_v014215(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 founder_number smallint NOT NULL UNIQUE CHECK(founder_number BETWEEN 1 AND 600),
 plan_code text NOT NULL CHECK(plan_code IN ('FOUNDING_30','FOUNDING_60')),
 stripe_subscription_id text UNIQUE CHECK(stripe_subscription_id ~ '^sub_[A-Za-z0-9_]{6,}$'),
 stripe_customer_id text,
 status text NOT NULL DEFAULT 'prepared' CHECK(status IN('prepared','active','past_due','cancel_scheduled','canceled','refunded','disputed')),
 current_period_end timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gu_f600_sandbox_cycles_v014215(
 invoice_id text PRIMARY KEY CHECK(invoice_id ~ '^in_[A-Za-z0-9_]{6,}$'),
 intent_id uuid NOT NULL REFERENCES public.gu_f600_sandbox_intents_v014215(id),
 stripe_subscription_id text NOT NULL,
 plan_code text NOT NULL,
 amount_cents integer NOT NULL,
 included_sparks smallint NOT NULL,
 remaining_sparks smallint NOT NULL,
 billing_start timestamptz NOT NULL,
 billing_end timestamptz NOT NULL,
 spark_expiry timestamptz NOT NULL,
 reversed_at timestamptz,
 CHECK(billing_end>billing_start),
 CHECK(remaining_sparks BETWEEN 0 AND included_sparks),
 CHECK((plan_code='FOUNDING_30' AND amount_cents=4999 AND included_sparks=5)
 OR (plan_code='FOUNDING_60' AND amount_cents=5999 AND included_sparks=15))
);
CREATE TABLE IF NOT EXISTS public.gu_f600_sandbox_events_v014215(
 stripe_event_id text PRIMARY KEY CHECK(stripe_event_id~'^evt_[A-Za-z0-9_]{6,}$'),
 event_type text NOT NULL,
 intent_id uuid NOT NULL REFERENCES public.gu_f600_sandbox_intents_v014215(id),
 processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_f600_sandbox_intents_v014215 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_f600_sandbox_cycles_v014215 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_f600_sandbox_events_v014215 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_f600_sandbox_intents_v014215,public.gu_f600_sandbox_cycles_v014215,public.gu_f600_sandbox_events_v014215 FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.gu_f600_sandbox_intents_v014215,public.gu_f600_sandbox_cycles_v014215,public.gu_f600_sandbox_events_v014215 TO service_role;
CREATE OR REPLACE FUNCTION public.gu_f600_sandbox_apply_v014215(
 p_intent uuid,p_event text,p_kind text,p_subscription text,p_customer text,
 p_invoice text,p_amount integer,p_start timestamptz,p_end timestamptz
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp AS $apply$
DECLARE i public.gu_f600_sandbox_intents_v014215%rowtype;
 expected integer;term integer;sparks integer;expiry integer;updated_count integer;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.gu39_sandbox_settings WHERE id=true AND enabled=true)
 THEN RETURN jsonb_build_object('ok',false,'error','SANDBOX_GATE_OFF');END IF;
 IF p_intent IS NULL OR p_event !~ '^evt_[A-Za-z0-9_]{6,}$'
 OR p_subscription !~ '^sub_[A-Za-z0-9_]{6,}$'
 OR p_kind NOT IN ('invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted','charge.refunded','charge.dispute.created')
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_TEST_PROVIDER_EVENT');END IF;
 PERFORM pg_advisory_xact_lock(20261024,215);
 SELECT * INTO i FROM public.gu_f600_sandbox_intents_v014215 WHERE id=p_intent FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','NO_SANDBOX_INTENT');END IF;
 IF EXISTS(SELECT 1 FROM public.gu_f600_sandbox_events_v014215 WHERE stripe_event_id=p_event)
 THEN RETURN jsonb_build_object('ok',true,'replayed',true,'mode','SANDBOX');END IF;
 IF i.stripe_subscription_id IS NOT NULL AND i.stripe_subscription_id<>p_subscription
 THEN RETURN jsonb_build_object('ok',false,'error','SUBSCRIPTION_MISMATCH');END IF;
 IF p_customer !~ '^cus_[A-Za-z0-9_]{6,}$'
 OR (i.stripe_customer_id IS NOT NULL AND i.stripe_customer_id<>p_customer)
 THEN RETURN jsonb_build_object('ok',false,'error','CUSTOMER_MISMATCH');END IF;
 expected:=CASE WHEN i.plan_code='FOUNDING_30' THEN 4999 ELSE 5999 END;
 term:=CASE WHEN i.plan_code='FOUNDING_30' THEN 30 ELSE 60 END;
 sparks:=CASE WHEN i.plan_code='FOUNDING_30' THEN 5 ELSE 15 END;
 expiry:=CASE WHEN i.plan_code='FOUNDING_30' THEN 90 ELSE 150 END;
 IF p_kind='invoice.paid' THEN
   IF p_invoice !~ '^in_[A-Za-z0-9_]{6,}$' OR p_amount<>expected
    OR p_start IS NULL OR p_end IS NULL OR p_end-p_start<>make_interval(days=>term)
   THEN RETURN jsonb_build_object('ok',false,'error','PRICE_OR_TERM_MISMATCH');END IF;
   IF EXISTS(SELECT 1 FROM public.gu_f600_sandbox_cycles_v014215 WHERE invoice_id=p_invoice)
   THEN RETURN jsonb_build_object('ok',false,'error','DUPLICATE_INVOICE_EVENT_MISMATCH');END IF;
   IF EXISTS(SELECT 1 FROM public.gu_f600_sandbox_cycles_v014215 WHERE
       stripe_subscription_id=p_subscription AND billing_end>=p_end)
   THEN RETURN jsonb_build_object('ok',false,'error','STALE_CYCLE');END IF;
   INSERT INTO public.gu_f600_sandbox_cycles_v014215
    (invoice_id,intent_id,stripe_subscription_id,plan_code,amount_cents,included_sparks,remaining_sparks,billing_start,billing_end,spark_expiry)
   VALUES(p_invoice,i.id,p_subscription,i.plan_code,expected,sparks,sparks,
     p_start,p_end,p_end+make_interval(days=>expiry));
   UPDATE public.gu_f600_sandbox_intents_v014215
      SET stripe_subscription_id=p_subscription,stripe_customer_id=p_customer,
          status='active',current_period_end=p_end WHERE id=i.id;
 ELSIF p_kind IN ('charge.refunded','charge.dispute.created') THEN
   IF p_invoice !~ '^in_[A-Za-z0-9_]{6,}$'
   THEN RETURN jsonb_build_object('ok',false,'error','INVOICE_REQUIRED');END IF;
   UPDATE public.gu_f600_sandbox_cycles_v014215
     SET reversed_at=now(),remaining_sparks=0
   WHERE invoice_id=p_invoice AND intent_id=i.id AND stripe_subscription_id=p_subscription
      AND reversed_at IS NULL;
   GET DIAGNOSTICS updated_count=ROW_COUNT;
   IF updated_count=0 AND NOT EXISTS(SELECT 1 FROM public.gu_f600_sandbox_cycles_v014215
        WHERE invoice_id=p_invoice AND intent_id=i.id AND reversed_at IS NOT NULL)
   THEN RETURN jsonb_build_object('ok',false,'error','PAID_INVOICE_NOT_FOUND');END IF;
   IF NOT EXISTS(SELECT 1 FROM public.gu_f600_sandbox_cycles_v014215
     WHERE intent_id=i.id AND reversed_at IS NULL)
   THEN UPDATE public.gu_f600_sandbox_intents_v014215
     SET status=CASE WHEN p_kind='charge.refunded' THEN 'refunded' ELSE 'disputed' END WHERE id=i.id;END IF;
 ELSIF p_kind='invoice.payment_failed' THEN
   UPDATE public.gu_f600_sandbox_intents_v014215 SET status='past_due' WHERE id=i.id;
 ELSIF p_kind='customer.subscription.deleted' THEN
   UPDATE public.gu_f600_sandbox_intents_v014215 SET status='canceled' WHERE id=i.id;
 ELSE
   UPDATE public.gu_f600_sandbox_intents_v014215
     SET status=CASE WHEN i.status IN ('refunded','disputed','canceled') THEN i.status ELSE 'cancel_scheduled' END
   WHERE id=i.id;
 END IF;
 INSERT INTO public.gu_f600_sandbox_events_v014215(stripe_event_id,event_type,intent_id)
 VALUES(p_event,p_kind,i.id);
 RETURN jsonb_build_object('ok',true,'replayed',false,'mode','SANDBOX','plan',i.plan_code,
 'includedSparks',CASE WHEN p_kind='invoice.paid' THEN sparks ELSE 0 END);
END $apply$;
REVOKE ALL ON FUNCTION public.gu_f600_sandbox_apply_v014215(uuid,text,text,text,text,text,integer,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_f600_sandbox_apply_v014215(uuid,text,text,text,text,text,integer,timestamptz,timestamptz) TO service_role;
