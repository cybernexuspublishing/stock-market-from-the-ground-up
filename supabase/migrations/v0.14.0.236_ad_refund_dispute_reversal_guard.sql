-- v0.14.0.236 | Owner-verified refund/dispute: stop delivery immediately
-- once Stripe confirms that an invoice was fully refunded or disputed.
CREATE OR REPLACE FUNCTION public.gu_ad_revoke_verified_invoice_v014236(
 p_actor uuid,p_campaign bigint,p_invoice text,p_state text
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp AS $revoke$
DECLARE changed integer;
BEGIN
 IF p_actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.admin_user_roles r
 WHERE r.user_id=p_actor AND r.role_code='OWNER'
 AND (r.expires_at IS NULL OR r.expires_at>now()))
 THEN RETURN jsonb_build_object('ok',false,'error','OWNER_REQUIRED');END IF;
 IF p_state NOT IN('refunded','disputed') OR p_invoice !~ '^in_[A-Za-z0-9_]{6,}$'
 THEN RETURN jsonb_build_object('ok',false,'error','VERIFIED_REFUND_OR_DISPUTE_REQUIRED');END IF;
 PERFORM pg_advisory_xact_lock(20261024,236);
 UPDATE public.gu_ad_order_evidence_v014226 SET state=p_state
 WHERE invoice_ref=p_invoice AND campaign_id=p_campaign AND state='verified_paid'
 AND payment_mode='live';
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>1 THEN RETURN jsonb_build_object('ok',false,'error','PAID_INVOICE_NOT_FOUND');END IF;
 UPDATE public.ad_campaigns
 SET payment_state=p_state,status=CASE WHEN status IN('scheduled','active') THEN 'paused' ELSE status END,
 updated_at=now()
 WHERE id=p_campaign AND last_verified_invoice=p_invoice;
 IF NOT FOUND THEN RAISE EXCEPTION 'PAID_CAMPAIGN_MISMATCH';END IF;
 INSERT INTO public.gu_ad_admin_audit_v014226(actor,action,resource_type,resource_id,details)
 VALUES(p_actor,'revoke_paid_invoice','ad_campaign',p_campaign::text,
 jsonb_build_object('invoice',p_invoice,'reason',p_state,'deliveryStopped',true));
 RETURN jsonb_build_object('ok',true,'revoked',true,'adDeliveryStopped',true);
END $revoke$;
REVOKE ALL ON FUNCTION public.gu_ad_revoke_verified_invoice_v014236(uuid,bigint,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_ad_revoke_verified_invoice_v014236(uuid,bigint,text,text) TO service_role;
