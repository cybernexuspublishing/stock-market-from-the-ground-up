-- LU301 — Reproducible NO-CHARGE, ROLLED-BACK database contract acceptance.
-- Run only through authorized Supabase SQL execution; requires existing TEST QA member.
-- No Stripe calls. Changes made in this block are ROLLED BACK unconditionally.
BEGIN;
SET LOCAL ROLE service_role;
DO $test$
DECLARE u uuid; oid uuid:=gen_random_uuid();
 s text:='cs_live_LumenAccountMock123'; pi text:='pi_LumenAccountMock123';
 r jsonb; before_wallet jsonb; after_wallet jsonb;
BEGIN
 SELECT user_id INTO u FROM public.gu_lumen_bundle_test_orders_v1
 WHERE status='refunded' ORDER BY updated_at DESC LIMIT 1;
 IF u IS NULL THEN RAISE EXCEPTION 'QA MEMBER REQUIRED';END IF;
 before_wallet:=public.groundup_question_pass_summary(u);
 INSERT INTO public.gu_lumen_live_orders_v1
  (id,user_id,request_id,sku,quantity,amount_cents,stripe_price_id,stripe_product_id,
   stripe_session_id,status)
 VALUES(oid,u,gen_random_uuid(),'SPARKS_25',25,500,
   'price_LU301Mock000001','prod_LU301Mock000001',s,'bound');
 r:=public.gu_lumen_live_apply_v1(oid,'evt_LU301WrongAmount001','paid',s,pi,1000);
 IF (r->>'ok')::boolean IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'INVALID PAYMENT AMOUNT ACCEPTED';END IF;
 r:=public.gu_lumen_live_apply_v1(oid,'evt_LU301ValidPaid001','paid',s,pi,500);
 IF (r->>'ok')::boolean IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'VALID PURCHASE NOT CREDITED %',r;END IF;
 after_wallet:=public.groundup_question_pass_summary(u);
 IF (after_wallet->>'purchased')::integer<>(before_wallet->>'purchased')::integer+25 OR
    (after_wallet->>'available')::integer<>(before_wallet->>'available')::integer+25
 THEN RAISE EXCEPTION 'SINGLE MEMBER WALLET NOT CREDITED';END IF;
 r:=public.gu_lumen_live_apply_v1(oid,'evt_LU301ValidPaid001','paid',s,pi,500);
 IF (r->>'duplicate')::boolean IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'DOUBLE-CREDIT ON REPLAY';END IF;
 UPDATE public.groundup_question_pass_buckets SET remaining_credits=15
  WHERE user_id=u AND origin_key='lumen-live-order:'||oid::text;
 r:=public.gu_lumen_live_apply_v1(oid,'evt_LU301ValidRefund01','refunded',s,pi);
 IF (r->>'ok')::boolean IS DISTINCT FROM true OR
    (r->>'unspentReversed')::integer<>15 OR
    (r->>'alreadyConsumed')::integer<>10 OR
    (r->>'reviewRequired')::boolean IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'FULL REFUND DID NOT AUDIT CONSUMED CREDITS %',r;END IF;
 r:=public.gu_lumen_live_apply_v1(oid,'evt_LU301ValidRefund01','refunded',s,pi);
 IF (r->>'duplicate')::boolean IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'DOUBLE-REFUND ON REPLAY';END IF;
 r:=public.gu_lumen_live_apply_v1(oid,'evt_LU301LatePaid0001','paid',s,pi,500);
 IF (r->>'ok')::boolean IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'LATE PAID EVENT RE-CREDITED REFUNDED ORDER';END IF;
 after_wallet:=public.groundup_question_pass_summary(u);
 IF after_wallet<>before_wallet THEN
  RAISE EXCEPTION 'REFUND MUTATED UNRELATED MEMBER WALLET BALANCE';END IF;
 IF (SELECT count(*) FROM public.gu_lumen_live_reversals_v1 WHERE order_id=oid)<>1 THEN
  RAISE EXCEPTION 'MISSING AUDIT RECORD';END IF;
END $test$;
ROLLBACK;
-- The SQL execution must complete without exception. A later read must confirm
-- zero test records remain in gu_lumen_live_orders_v1 and purchased wallet buckets.
