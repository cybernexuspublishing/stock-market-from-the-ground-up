-- v0.14.0.123 | Owner-review production migration. No email sent by SQL.
BEGIN;
DO $$BEGIN
 IF to_regclass('public.site_subscriptions') IS NULL OR to_regclass('public.user_tool_passes') IS NULL
 OR to_regclass('public.gu58_live_checkout_intents') IS NULL
 THEN RAISE EXCEPTION 'GU58 signed LIVE subscription prerequisites missing'; END IF;
END$$;
CREATE TABLE IF NOT EXISTS public.gu_billing_notice_outbox_v014123(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 dedup_key text NOT NULL UNIQUE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 source_kind text NOT NULL CHECK(source_kind IN('plan','tool')),
 provider_subscription_id text NOT NULL,
 notice_kind text NOT NULL CHECK(notice_kind IN('activated','renewed','payment_failed','cancellation_scheduled','cancellation_reversed','canceled','access_paused')),
 current_period_end timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 delivery_status text NOT NULL DEFAULT 'pending' CHECK(delivery_status IN('pending','leased','retry','sent','dead')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 20),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_token uuid,
 lease_expires_at timestamptz,
 provider_message_id text,
 sent_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gu_billing_notice_pending_v014123
 ON public.gu_billing_notice_outbox_v014123(next_attempt_at,created_at)
 WHERE delivery_status IN('pending','retry','leased');
ALTER TABLE public.gu_billing_notice_outbox_v014123 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_billing_notice_outbox_v014123 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_billing_notice_outbox_v014123 TO service_role;
CREATE OR REPLACE FUNCTION public.gu_v014123_capture_signed_billing_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $body$
DECLARE old_status text; old_period timestamptz; old_cancel boolean; transition text; kind text;
BEGIN
 IF NEW.provider IS DISTINCT FROM 'STRIPE_MANAGED'
 OR NEW.metadata->>'source' IS DISTINCT FROM 'gu58_live_signed_stripe'
 OR NEW.provider_subscription_id IS NULL THEN RETURN NEW; END IF;
 kind:=CASE TG_TABLE_NAME WHEN 'site_subscriptions' THEN 'plan' ELSE 'tool' END;
 IF TG_OP='INSERT' THEN old_status:=NULL;old_period:=NULL;old_cancel:=false;
 ELSE old_status:=OLD.status;old_period:=OLD.current_period_end;
  old_cancel:=coalesce(OLD.cancel_at_period_end,false); END IF;
 IF TG_OP='UPDATE' AND NEW.status IS NOT DISTINCT FROM old_status
 AND NEW.current_period_end IS NOT DISTINCT FROM old_period
 AND NEW.cancel_at_period_end IS NOT DISTINCT FROM old_cancel
 THEN RETURN NEW; END IF;
 transition:=CASE
 WHEN NEW.status='canceled' THEN 'canceled'
 WHEN NEW.status='past_due' THEN 'payment_failed'
 WHEN NEW.status='paused' THEN 'access_paused'
 WHEN NEW.status IN ('active','trialing') AND NEW.cancel_at_period_end=true AND NOT old_cancel
    THEN 'cancellation_scheduled'
 WHEN NEW.status IN ('active','trialing') AND NEW.cancel_at_period_end=false AND old_cancel
    THEN 'cancellation_reversed'
 WHEN NEW.status='active' AND old_status='active'
    AND NEW.current_period_end IS DISTINCT FROM old_period THEN 'renewed'
 WHEN NEW.status='active' AND old_status IS DISTINCT FROM 'active' THEN 'activated'
 ELSE NULL END;
 IF transition IS NULL THEN RETURN NEW; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.gu58_live_checkout_intents i
 WHERE i.user_id=NEW.user_id AND i.stripe_subscription_id=NEW.provider_subscription_id
 AND i.sku_kind=kind AND i.sku_code=
 (CASE WHEN kind='plan' THEN to_jsonb(NEW)->>'plan_code' ELSE to_jsonb(NEW)->>'tool_code' END)
 AND i.stripe_session_id IS NOT NULL AND i.status<>'prepared')
 THEN RETURN NEW; END IF;
 INSERT INTO public.gu_billing_notice_outbox_v014123
 (dedup_key,user_id,source_kind,provider_subscription_id,notice_kind,current_period_end)
 VALUES(md5(NEW.user_id::text||'|'||kind||'|'||NEW.provider_subscription_id||'|'||
 transition||'|'||coalesce(NEW.current_period_end::text,'none')||'|'||
 coalesce(NEW.cancel_at_period_end,false)::text),NEW.user_id,kind,NEW.provider_subscription_id,transition,NEW.current_period_end)
 ON CONFLICT(dedup_key) DO NOTHING;
 RETURN NEW;
END $body$;
REVOKE ALL ON FUNCTION public.gu_v014123_capture_signed_billing_notice() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS gu_billing_notice_plan_v014123 ON public.site_subscriptions;
CREATE TRIGGER gu_billing_notice_plan_v014123 AFTER INSERT OR UPDATE OF
 status,current_period_end,cancel_at_period_end ON public.site_subscriptions
 FOR EACH ROW EXECUTE FUNCTION public.gu_v014123_capture_signed_billing_notice();
DROP TRIGGER IF EXISTS gu_billing_notice_tool_v014123 ON public.user_tool_passes;
CREATE TRIGGER gu_billing_notice_tool_v014123 AFTER INSERT OR UPDATE OF
 status,current_period_end,cancel_at_period_end ON public.user_tool_passes
 FOR EACH ROW EXECUTE FUNCTION public.gu_v014123_capture_signed_billing_notice();
CREATE OR REPLACE FUNCTION public.gu_v014123_claim_notices(p_limit integer DEFAULT 10)
RETURNS TABLE(id uuid,user_id uuid,notice_kind text,source_kind text,
 current_period_end timestamptz,lease_token uuid)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $claim$
BEGIN
 IF p_limit IS NULL OR p_limit<1 OR p_limit>25 THEN
  RAISE EXCEPTION 'BILLING_CLAIM_LIMIT_INVALID'; END IF;
 RETURN QUERY
 WITH pick AS (
  SELECT n.id FROM public.gu_billing_notice_outbox_v014123 n
  WHERE (n.delivery_status IN('pending','retry') AND n.next_attempt_at<=now())
  OR (n.delivery_status='leased' AND n.lease_expires_at<now())
  ORDER BY n.created_at,n.id LIMIT p_limit FOR UPDATE SKIP LOCKED
 ), take AS (
  UPDATE public.gu_billing_notice_outbox_v014123 n SET
   delivery_status='leased',attempts=n.attempts+1,
   lease_token=gen_random_uuid(),lease_expires_at=now()+interval '5 minutes',updated_at=now()
  FROM pick WHERE n.id=pick.id AND n.attempts<12
  RETURNING n.id,n.user_id,n.notice_kind,n.source_kind,n.current_period_end,n.lease_token
 )
 SELECT take.* FROM take;
END $claim$;
REVOKE ALL ON FUNCTION public.gu_v014123_claim_notices(integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014123_claim_notices(integer) TO service_role;
CREATE OR REPLACE FUNCTION public.gu_v014123_ack_notice(
 p_id uuid,p_token uuid,p_sent boolean,p_provider_message_id text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $ack$
DECLARE n integer;
BEGIN
 IF p_id IS NULL OR p_token IS NULL OR p_sent IS NULL THEN
  RAISE EXCEPTION 'INVALID_BILLING_NOTICE_ACK'; END IF;
 UPDATE public.gu_billing_notice_outbox_v014123 o SET
  delivery_status=CASE WHEN p_sent THEN 'sent'
     WHEN o.attempts>=12 THEN 'dead' ELSE 'retry' END,
  provider_message_id=CASE WHEN p_sent THEN left(coalesce(p_provider_message_id,''),180) ELSE NULL END,
  sent_at=CASE WHEN p_sent THEN now() ELSE NULL END,
  next_attempt_at=CASE WHEN p_sent THEN o.next_attempt_at ELSE
    now()+(least(86400,60*power(2,least(o.attempts,10)))::integer*interval '1 second') END,
  lease_token=NULL,lease_expires_at=NULL,updated_at=now()
 WHERE o.id=p_id AND o.lease_token=p_token AND o.delivery_status='leased'
  AND o.lease_expires_at>=now();
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN n=1;
END $ack$;
REVOKE ALL ON FUNCTION public.gu_v014123_ack_notice(uuid,uuid,boolean,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014123_ack_notice(uuid,uuid,boolean,text)
 TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;