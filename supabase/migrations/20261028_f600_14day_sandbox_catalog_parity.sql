-- F600 14-day sandbox parity | 2026-10-28
-- Limits all writes to existing isolated GU39 / F600 TEST ledger only.
-- Existing historical paid test cycles (5/15 Sparks) are preserved as historical evidence;
-- all newly billed 14/30/60-day cycles use approved 10/15/20 Sparks.
-- LIVE user entitlements, paid cycles, checkout gates, and Stripe secrets are untouched.
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.gu_f600_sandbox_intents_v014215 WHERE plan_code NOT IN('FOUNDING_30','FOUNDING_60'))
 THEN RAISE EXCEPTION 'Unexpected sandbox plan before parity migration';END IF;
END $$;
ALTER TABLE public.gu_f600_sandbox_intents_v014215
 DROP CONSTRAINT gu_f600_sandbox_intents_v014215_plan_code_check;
ALTER TABLE public.gu_f600_sandbox_intents_v014215
 ADD CONSTRAINT gu_f600_sandbox_intents_v014215_plan_code_check
 CHECK(plan_code IN('FOUNDING_14','FOUNDING_30','FOUNDING_60'));
ALTER TABLE public.gu_f600_sandbox_cycles_v014215
 DROP CONSTRAINT gu_f600_sandbox_cycles_v014215_check2;
ALTER TABLE public.gu_f600_sandbox_cycles_v014215
 ADD CONSTRAINT gu_f600_sandbox_cycles_v014215_check2
 CHECK(
  (plan_code='FOUNDING_14' AND amount_cents=2299 AND included_sparks=10)
  OR (plan_code='FOUNDING_30' AND amount_cents=4999 AND included_sparks=15)
  OR (plan_code='FOUNDING_60' AND amount_cents=5999 AND included_sparks=20)
  OR (billing_start < TIMESTAMPTZ '2026-10-28 00:00:00+00'
    AND ((plan_code='FOUNDING_30' AND amount_cents=4999 AND included_sparks=5)
      OR (plan_code='FOUNDING_60' AND amount_cents=5999 AND included_sparks=15)))
 );
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
 expected:=CASE i.plan_code WHEN 'FOUNDING_14' THEN 2299 WHEN 'FOUNDING_30' THEN 4999 WHEN 'FOUNDING_60' THEN 5999 ELSE NULL END;
 term:=CASE i.plan_code WHEN 'FOUNDING_14' THEN 14 WHEN 'FOUNDING_30' THEN 30 WHEN 'FOUNDING_60' THEN 60 ELSE NULL END;
 sparks:=CASE i.plan_code WHEN 'FOUNDING_14' THEN 10 WHEN 'FOUNDING_30' THEN 15 WHEN 'FOUNDING_60' THEN 20 ELSE NULL END;
 expiry:=CASE i.plan_code WHEN 'FOUNDING_14' THEN 60 WHEN 'FOUNDING_30' THEN 90 WHEN 'FOUNDING_60' THEN 150 ELSE NULL END;
 IF expected IS NULL OR term IS NULL OR sparks IS NULL OR expiry IS NULL
 THEN RETURN jsonb_build_object('ok',false,'error','UNSUPPORTED_FOUNDING_QA_PLAN');END IF;
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
