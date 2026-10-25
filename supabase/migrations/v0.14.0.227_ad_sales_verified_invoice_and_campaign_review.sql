-- v0.14.0.227 | Transactional, audit-backed advertiser payment approval.
-- External Stripe invoices are read and validated server-side by the Owner API.
-- Neither this RPC nor Stripe webhook charges a card, starts delivery or marks
-- a member purchase as paid.
CREATE OR REPLACE FUNCTION public.gu_ad_verify_paid_invoice_v014227(
 p_actor uuid,p_campaign bigint,p_invoice text,p_paid_cents integer,
 p_stripe_livemode boolean,p_customer text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp AS $verify$
DECLARE camp public.ad_campaigns%rowtype; proof_id uuid;
BEGIN
 IF p_actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.admin_user_roles r
  WHERE r.user_id=p_actor AND r.role_code='OWNER'
  AND (r.expires_at IS NULL OR r.expires_at>now()))
 THEN RETURN jsonb_build_object('ok',false,'error','OWNER_REQUIRED');END IF;
 IF p_stripe_livemode IS DISTINCT FROM true OR
 p_invoice !~ '^in_[A-Za-z0-9_]{6,}$' OR
 p_customer !~ '^cus_[A-Za-z0-9_]{6,}$' OR
 p_paid_cents IS NULL OR p_paid_cents<=0
 THEN RETURN jsonb_build_object('ok',false,'error','VERIFIED_LIVE_INVOICE_REQUIRED');END IF;
 PERFORM pg_advisory_xact_lock(20261024,227);
 SELECT * INTO camp FROM public.ad_campaigns WHERE id=p_campaign FOR UPDATE;
 IF NOT FOUND OR camp.status<>'draft' OR camp.payment_state<>'unpaid'
 OR camp.amount_cents<=0 OR p_paid_cents<camp.amount_cents
 THEN RETURN jsonb_build_object('ok',false,'error','CAMPAIGN_NOT_BILLABLE');END IF;
 INSERT INTO public.gu_ad_order_evidence_v014226
   (campaign_id,invoice_ref,provider,expected_amount_cents,paid_amount_cents,
    verified_by,payment_mode,state)
 VALUES(camp.id,p_invoice,'stripe',camp.amount_cents,p_paid_cents,
    p_actor,'live','verified_paid')
 ON CONFLICT(invoice_ref) DO NOTHING RETURNING id INTO proof_id;
 IF proof_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','INVOICE_ALREADY_USED');END IF;
 UPDATE public.ad_campaigns SET payment_state='verified_paid',last_verified_invoice=p_invoice,
 updated_at=now() WHERE id=camp.id;
 INSERT INTO public.gu_ad_admin_audit_v014226(actor,action,resource_type,resource_id,details)
 VALUES(p_actor,'verify_paid_invoice','ad_campaign',camp.id::text,
 jsonb_build_object('invoice',p_invoice,'amountCents',p_paid_cents,'customer',p_customer));
 RETURN jsonb_build_object('ok',true,'campaignId',camp.id,'paymentVerified',true,
 'adDeliveryActivated',false);
END $verify$;

CREATE OR REPLACE FUNCTION public.gu_ad_review_campaign_v014227(
 p_actor uuid,p_campaign bigint,p_action text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp AS $review$
DECLARE camp public.ad_campaigns%rowtype;
BEGIN
 IF p_actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.admin_user_roles r
   WHERE r.user_id=p_actor AND r.role_code='OWNER'
   AND (r.expires_at IS NULL OR r.expires_at>now()))
 THEN RETURN jsonb_build_object('ok',false,'error','OWNER_REQUIRED');END IF;
 IF p_action NOT IN ('approve','reject','pause','publish')
 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_ACTION');END IF;
 PERFORM pg_advisory_xact_lock(20261024,228);
 SELECT * INTO camp FROM public.ad_campaigns WHERE id=p_campaign FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','NOT_FOUND');END IF;
 IF p_action='approve' AND camp.status='draft' AND camp.approval_state='pending' THEN
  UPDATE public.ad_campaigns SET approval_state='approved',approved_by=p_actor,
   approved_at=now(),updated_at=now() WHERE id=camp.id;
 ELSIF p_action='reject' AND camp.status='draft' THEN
  UPDATE public.ad_campaigns SET approval_state='rejected',updated_at=now() WHERE id=camp.id;
 ELSIF p_action='pause' AND camp.status IN('scheduled','active') THEN
  UPDATE public.ad_campaigns SET status='paused',updated_at=now() WHERE id=camp.id;
 ELSIF p_action='publish' AND camp.status='draft' AND camp.approval_state='approved'
 AND camp.payment_state='verified_paid' AND camp.starts_at IS NOT NULL
 AND camp.ends_at IS NOT NULL AND camp.ends_at>now()
 AND EXISTS(SELECT 1 FROM public.ad_creatives cr JOIN public.ad_placements pl
 ON pl.placement_code=cr.placement_code WHERE cr.campaign_id=camp.id
 AND cr.status='approved' AND pl.active=true)
 AND EXISTS(SELECT 1 FROM public.gu_ad_sales_settings_v014226
 WHERE singleton AND accepting_payments AND ad_delivery_enabled)
 THEN
  UPDATE public.ad_campaigns SET status=CASE WHEN camp.starts_at>now() THEN 'scheduled' ELSE 'active' END,
   updated_at=now() WHERE id=camp.id;
 ELSE RETURN jsonb_build_object('ok',false,'error','PRECONDITIONS_NOT_MET');END IF;
 INSERT INTO public.gu_ad_admin_audit_v014226(actor,action,resource_type,resource_id)
 VALUES(p_actor,p_action||'_campaign','ad_campaign',camp.id::text);
 RETURN jsonb_build_object('ok',true,'campaignId',camp.id,'action',p_action);
END $review$;

REVOKE ALL ON FUNCTION public.gu_ad_verify_paid_invoice_v014227(uuid,bigint,text,integer,boolean,text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.gu_ad_review_campaign_v014227(uuid,bigint,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_ad_verify_paid_invoice_v014227(uuid,bigint,text,integer,boolean,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.gu_ad_review_campaign_v014227(uuid,bigint,text) TO service_role;

-- No user-supplied URL can carry executable schemes or inline script.
ALTER TABLE public.ad_creatives
 ADD CONSTRAINT gu_ad_https_destination_v014227
 CHECK(destination_url ~* '^https://[A-Za-z0-9][^[:space:]<>"'']{4,1950}$');
-- Ad creatives are APPROVED manually; recording a paid invoice cannot override it.
