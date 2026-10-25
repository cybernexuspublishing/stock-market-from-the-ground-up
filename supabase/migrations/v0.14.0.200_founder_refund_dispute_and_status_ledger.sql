-- v0.14.0.200 Stripe-verified founder refund, dispute, cancellation and payment failure ledger.
-- The service-role caller MUST independently verify the provider event and invoice.
CREATE TABLE IF NOT EXISTS public.gu_founder_provider_events_v014200(
 event_id text PRIMARY KEY CHECK(event_id~'^evt_[A-Za-z0-9_]{6,}$'),
 event_type text NOT NULL CHECK(length(event_type) BETWEEN 5 AND 80),
 subscription_id text NOT NULL,
 invoice_id text,
 processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_founder_provider_events_v014200 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_founder_provider_events_v014200 FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.gu_founder_provider_events_v014200 TO service_role;
CREATE OR REPLACE FUNCTION public.gu_founder_reverse_paid_invoice_v014200(
 p_invoice text,p_subscription text,p_event text,p_reason text
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp AS $reverse$
DECLARE cycle public.gu_founder_paid_cycles_v014173%rowtype;
BEGIN
 IF p_invoice !~ '^in_[A-Za-z0-9_]{6,}$' OR p_subscription !~ '^sub_[A-Za-z0-9_]{6,}$'
 OR p_event !~ '^evt_[A-Za-z0-9_]{6,}$'
 OR p_reason NOT IN ('full_refund','payment_dispute')
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_PROVIDER_DATA');END IF;
 PERFORM pg_advisory_xact_lock(20261024,600);
 IF NOT EXISTS(SELECT 1 FROM public.gu_founder_release_v014173
 WHERE singleton AND fulfillment_enabled)
 THEN RETURN jsonb_build_object('ok',false,'error','FULFILLMENT_DISABLED');END IF;
 SELECT * INTO cycle FROM public.gu_founder_paid_cycles_v014173
 WHERE stripe_invoice_id=p_invoice AND stripe_subscription_id=p_subscription FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','CYCLE_NOT_FOUND');END IF;
 IF cycle.reversed_at IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'replayed',true);END IF;
 UPDATE public.gu_founder_paid_cycles_v014173 SET reversed_at=now() WHERE id=cycle.id;
 UPDATE public.groundup_question_pass_buckets
 SET remaining_credits=0
 WHERE user_id=cycle.user_id AND origin_key='FOUNDING600:'||p_invoice
 AND source='included' AND remaining_credits>0;
 IF NOT EXISTS(SELECT 1 FROM public.gu_founder_paid_cycles_v014173
 WHERE user_id=cycle.user_id AND reversed_at IS NULL)
 THEN
  UPDATE public.site_subscriptions SET status='canceled',updated_at=now()
  WHERE user_id=cycle.user_id AND provider_subscription_id=p_subscription AND provider='stripe';
  UPDATE public.gu_founder_members_v014173 SET vested_discount_bps=0 WHERE user_id=cycle.user_id;
 END IF;
 INSERT INTO public.gu_founder_provider_events_v014200(event_id,event_type,subscription_id,invoice_id)
 VALUES(p_event,p_reason,p_subscription,p_invoice) ON CONFLICT(event_id) DO NOTHING;
 RETURN jsonb_build_object('ok',true,'replayed',false,'unspentSparksRevoked',true,
 'foundingNumberPreserved',true);
END $reverse$;
REVOKE ALL ON FUNCTION public.gu_founder_reverse_paid_invoice_v014200(text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_founder_reverse_paid_invoice_v014200(text,text,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.gu_founder_update_provider_status_v014200(
 p_subscription text,p_event text,p_status text,p_period_end timestamptz
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp AS $status$
DECLARE r public.site_subscriptions%rowtype;
BEGIN
 IF p_subscription !~ '^sub_[A-Za-z0-9_]{6,}$' OR p_event !~ '^evt_[A-Za-z0-9_]{6,}$'
 OR p_status NOT IN ('active','past_due','canceled') OR p_period_end IS NULL
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_PROVIDER_DATA');END IF;
 PERFORM pg_advisory_xact_lock(20261024,600);
 IF NOT EXISTS(SELECT 1 FROM public.gu_founder_release_v014173 WHERE singleton AND fulfillment_enabled)
 THEN RETURN jsonb_build_object('ok',false,'error','FULFILLMENT_DISABLED');END IF;
 SELECT * INTO r FROM public.site_subscriptions WHERE provider='stripe' AND provider_subscription_id=p_subscription
 AND plan_code IN ('FOUNDING_30','FOUNDING_60') ORDER BY id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','SUBSCRIPTION_NOT_FOUND');END IF;
 IF r.current_period_end IS NOT NULL AND p_period_end<r.current_period_end
 THEN RETURN jsonb_build_object('ok',false,'error','STALE_PROVIDER_EVENT');END IF;
 IF EXISTS(SELECT 1 FROM public.gu_founder_provider_events_v014200 WHERE event_id=p_event)
 THEN RETURN jsonb_build_object('ok',true,'replayed',true);END IF;
 UPDATE public.site_subscriptions SET status=p_status,cancel_at_period_end=p_status='canceled',
 current_period_end=greatest(coalesce(r.current_period_end,p_period_end),p_period_end),
 updated_at=now() WHERE id=r.id;
 INSERT INTO public.gu_founder_provider_events_v014200(event_id,event_type,subscription_id)
 VALUES(p_event,p_status,p_subscription);
 RETURN jsonb_build_object('ok',true,'replayed',false);
END $status$;
REVOKE ALL ON FUNCTION public.gu_founder_update_provider_status_v014200(text,text,text,timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_founder_update_provider_status_v014200(text,text,text,timestamptz)
 TO service_role;
