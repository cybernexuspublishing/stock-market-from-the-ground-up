-- GU39 Founding 600 Stripe TEST shadow ledger reliability.
-- Exact repeat paid invoices under distinct signed Stripe event IDs must be
-- idempotent, not a perpetual 503; stale failed-renewal notices must not
-- downgrade a newer paid cycle. Shadow tables only, LIVE policies untouched.
BEGIN;
DO $repair$
DECLARE definition text; before text;
old_dup text := $old$   IF EXISTS(SELECT 1 FROM public.gu_f600_sandbox_cycles_v014215 WHERE invoice_id=p_invoice)
   THEN RETURN jsonb_build_object('ok',false,'error','DUPLICATE_INVOICE_EVENT_MISMATCH');END IF;$old$;
new_dup text := $new$   IF EXISTS(SELECT 1 FROM public.gu_f600_sandbox_cycles_v014215 WHERE invoice_id=p_invoice)
   THEN
     IF NOT EXISTS(SELECT 1 FROM public.gu_f600_sandbox_cycles_v014215
       WHERE invoice_id=p_invoice AND intent_id=i.id
         AND stripe_subscription_id=p_subscription AND plan_code=i.plan_code
         AND amount_cents=expected AND billing_start=p_start AND billing_end=p_end)
     THEN RETURN jsonb_build_object('ok',false,'error','DUPLICATE_INVOICE_EVENT_MISMATCH');END IF;
     -- One settled invoice is allowed to be referenced by multiple valid
     -- signed delivery events. Never mint a second cycle or Sparks credit.
     INSERT INTO public.gu_f600_sandbox_events_v014215(stripe_event_id,event_type,intent_id)
       VALUES(p_event,p_kind,i.id);
     RETURN jsonb_build_object('ok',true,'replayed',true,'mode','SANDBOX',
       'plan',i.plan_code,'includedSparks',0);
   END IF;$new$;
old_failed text := $old2$ ELSIF p_kind='invoice.payment_failed' THEN
   UPDATE public.gu_f600_sandbox_intents_v014215 SET status='past_due' WHERE id=i.id;$old2$;
new_failed text := $new2$ ELSIF p_kind='invoice.payment_failed' THEN
   IF p_invoice !~ '^in_[A-Za-z0-9_]{6,}$'
      OR p_start IS NULL OR p_end IS NULL
      OR p_end-p_start<>make_interval(days=>term)
   THEN RETURN jsonb_build_object('ok',false,'error','FAILED_INVOICE_PERIOD_INVALID');END IF;
   -- Stripe may deliver an old payment_failed AFTER a more recent paid
   -- invoice. Preserve the newer entitlement and terminal statuses.
   IF i.current_period_end IS NULL OR p_end>i.current_period_end THEN
     UPDATE public.gu_f600_sandbox_intents_v014215 SET status='past_due'
       WHERE id=i.id AND status NOT IN ('canceled','refunded','disputed');
   END IF;$new2$;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO definition FROM pg_proc p
 WHERE p.pronamespace='public'::regnamespace
   AND p.proname='gu_f600_sandbox_apply_v014215'
   AND pg_get_function_identity_arguments(p.oid)=
    'p_intent uuid, p_event text, p_kind text, p_subscription text, p_customer text, p_invoice text, p_amount integer, p_start timestamp with time zone, p_end timestamp with time zone';
 IF definition IS NULL THEN RAISE EXCEPTION 'Founder TEST shadow function missing';END IF;
 before:=definition;
 IF strpos(definition,old_dup)=0 OR strpos(definition,old_failed)=0
 THEN RAISE EXCEPTION 'Sandbox SQL source changed; require manual review before replacement';END IF;
 definition:=replace(replace(definition,old_dup,new_dup),old_failed,new_failed);
 IF before=definition OR strpos(definition,old_dup)>0 OR strpos(definition,old_failed)>0
 THEN RAISE EXCEPTION 'TEST shadow patch verification failed'; END IF;
 EXECUTE definition;
END $repair$;
-- Preserve server-only RPC: prevent an external member from fabricating
-- paid invoices or payment-failed events.
REVOKE ALL ON FUNCTION public.gu_f600_sandbox_apply_v014215(uuid,text,text,text,text,text,integer,timestamptz,timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_f600_sandbox_apply_v014215(uuid,text,text,text,text,text,integer,timestamptz,timestamptz)
 TO service_role;
COMMIT;