-- Disposable-only v123 SQL transaction and access tests.
\set ON_ERROR_STOP on
INSERT INTO public.site_subscriptions(user_id,plan_code,provider,provider_subscription_id,
status,current_period_end,metadata) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','FULL_MONTHLY','STRIPE_MANAGED',
'sub_VERIFIED123','active',now()+interval '31 days',
 '{"source":"gu58_live_signed_stripe"}');
DO $x$ BEGIN
 IF (SELECT count(*) FROM public.gu_billing_notice_outbox_v014123)<>1 THEN
  RAISE EXCEPTION 'Signed active subscription failed to queue notification';
 END IF;
END $x$;
-- A duplicate status event in the same billing period must not re-notify.
UPDATE public.site_subscriptions SET status='active' WHERE plan_code='FULL_MONTHLY';
DO $x$ BEGIN
 IF (SELECT count(*) FROM public.gu_billing_notice_outbox_v014123)<>1 THEN
  RAISE EXCEPTION 'Duplicate LIVE status generated duplicate notice'; END IF;
END $x$;
UPDATE public.site_subscriptions SET current_period_end=current_period_end+interval '30 days'
 WHERE plan_code='FULL_MONTHLY';
UPDATE public.site_subscriptions SET status='past_due' WHERE plan_code='FULL_MONTHLY';
UPDATE public.site_subscriptions SET status='active',cancel_at_period_end=true
 WHERE plan_code='FULL_MONTHLY';
UPDATE public.site_subscriptions SET status='canceled' WHERE plan_code='FULL_MONTHLY';
INSERT INTO public.user_tool_passes(user_id,tool_code,provider,provider_subscription_id,status,
current_period_end,metadata) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','MARKET_TUTOR','STRIPE_MANAGED',
'sub_TUTOR123','paused',now()+interval '28 days',
'{"source":"gu58_live_signed_stripe"}');
-- Unrelated provider rows must not enter our signed-live queue.
INSERT INTO public.site_subscriptions(user_id,plan_code,provider,provider_subscription_id,status,
current_period_end,metadata) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','FULL_MONTHLY','LEMON_SQUEEZY',
'sub_UNRELATED123','active',now()+interval '30 days',
'{"source":"gu58_live_signed_stripe"}');
DO $x$ BEGIN
 IF (SELECT count(*) FROM public.gu_billing_notice_outbox_v014123)<>6
 OR (SELECT count(*) FROM public.gu_billing_notice_outbox_v014123
     WHERE notice_kind='payment_failed')<>1
 OR (SELECT count(*) FROM public.gu_billing_notice_outbox_v014123
     WHERE notice_kind='access_paused')<>1 THEN
  RAISE EXCEPTION 'Signed LIVE transition-to-notice mapping inaccurate';
 END IF;
 IF has_function_privilege('authenticated','public.gu_v014123_claim_notices(integer)','EXECUTE')
 OR has_table_privilege('authenticated','public.gu_billing_notice_outbox_v014123','SELECT') THEN
  RAISE EXCEPTION 'Queue exposed to members'; END IF;
END $x$;
SET ROLE service_role;
DO $x$
DECLARE q record;acked boolean;n integer:=0;
BEGIN
 FOR q IN SELECT * FROM public.gu_v014123_claim_notices(10) LOOP
  n:=n+1;
  acked:=public.gu_v014123_ack_notice(q.id,gen_random_uuid(),true,'wrong-token');
  IF acked THEN RAISE EXCEPTION 'Unauthorized lease token allowed ack'; END IF;
  acked:=public.gu_v014123_ack_notice(q.id,q.lease_token,true,'resend-mock-message');
  IF NOT acked THEN RAISE EXCEPTION 'Claimed delivery could not ack'; END IF;
  acked:=public.gu_v014123_ack_notice(q.id,q.lease_token,true,'duplicate');
  IF acked THEN RAISE EXCEPTION 'Duplicate ack allowed'; END IF;
 END LOOP;
 IF n<>6 OR EXISTS(SELECT 1 FROM public.gu_billing_notice_outbox_v014123
  WHERE delivery_status<>'sent') THEN
  RAISE EXCEPTION 'Claim/ack did not atomically settle all eligible items';
 END IF;
 RAISE NOTICE 'PASS v123: signed-live subscription events queued once, all service claims and tokens tested';
END $x$;
RESET ROLE;
