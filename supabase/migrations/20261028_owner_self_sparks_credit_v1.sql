-- Owner self-service Crownlight Sparks manual credit.
-- Does not grant membership, transact with Stripe, or create purchased credits.
-- Uses the same advisory lock and adjustment ledger as regular owner corrections.
BEGIN;
CREATE OR REPLACE FUNCTION public.groundup_owner_self_sparks_add(
 p_actor_id uuid,p_value integer,p_reason text,p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public,pg_temp AS $function$
DECLARE
 v_previous bigint; v_existing record; v_balance jsonb;
BEGIN
 IF p_actor_id IS NULL OR p_request_id IS NULL OR p_value IS NULL
  OR p_value<1 OR p_value>10000
  OR char_length(btrim(coalesce(p_reason,''))) NOT BETWEEN 10 AND 500 THEN
  RETURN jsonb_build_object('ok',false,'error','Invalid Owner self-credit request');
 END IF;
 -- A service-role-only RPC is not sufficient authorization by itself.
 IF NOT EXISTS(
  SELECT 1 FROM public.profiles p WHERE p.id=p_actor_id
   AND p.account_kind='member' AND p.deleted_at IS NULL
 ) OR NOT EXISTS(
  SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=p_actor_id
   AND r.role_code='OWNER' AND (r.expires_at IS NULL OR r.expires_at>clock_timestamp())
 ) OR EXISTS(
  SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=p_actor_id
   AND lower(f.status) IN ('restricted','suspended')
 ) THEN
  RETURN jsonb_build_object('ok',false,'error','Active, unrestricted Owner authority required');
 END IF;
 -- Prevent double-crediting on concurrent replay, and serialize against spending.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor_id::text,489301));
 SELECT * INTO v_existing FROM public.groundup_question_pass_adjustments
 WHERE actor_user_id=p_actor_id AND request_id=p_request_id;
 IF FOUND THEN
  IF v_existing.user_id<>p_actor_id OR v_existing.operation<>'add'
   OR v_existing.requested_value<>p_value OR v_existing.reason<>btrim(p_reason) THEN
   RETURN jsonb_build_object('ok',false,'error','Request ID already used for another adjustment');
  END IF;
  RETURN jsonb_build_object('ok',true,'alreadyApplied',true,
   'delta',0,'balance',public.groundup_question_pass_summary(p_actor_id));
 END IF;
 SELECT coalesce(sum(remaining_credits),0) INTO v_previous
 FROM public.groundup_question_pass_buckets
 WHERE user_id=p_actor_id AND remaining_credits>0
 AND (expires_at IS NULL OR expires_at>clock_timestamp());
 IF v_previous+p_value>1000000000 THEN
  RETURN jsonb_build_object('ok',false,'error','Wallet balance limit exceeded');
 END IF;
 INSERT INTO public.groundup_question_pass_buckets
  (user_id,source,origin_key,initial_credits,remaining_credits,billing_period_ends_at,expires_at)
 VALUES(p_actor_id,'manual','owner-self-adjustment:'||p_request_id,p_value,p_value,NULL,NULL);
 INSERT INTO public.groundup_question_pass_adjustments
  (actor_user_id,user_id,request_id,operation,requested_value,delta,
   previous_available,resulting_available,reason)
 VALUES(p_actor_id,p_actor_id,p_request_id,'add',p_value,p_value,
  v_previous::integer,(v_previous+p_value)::integer,btrim(p_reason));
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(p_actor_id,'learning.lantern_sparks.owner_self_add','user',p_actor_id::text,
  jsonb_build_object('operation','add','source','manual','noExpiry',true,
   'requestedValue',p_value,'delta',p_value,
   'before',v_previous,'after',v_previous+p_value,
   'requestId',p_request_id,'reason',btrim(p_reason),'financialAmount',0));
 v_balance:=public.groundup_question_pass_summary(p_actor_id);
 RETURN jsonb_build_object('ok',true,'alreadyApplied',false,
  'delta',p_value,'balance',v_balance);
END $function$;
REVOKE ALL ON FUNCTION public.groundup_owner_self_sparks_add(uuid,integer,text,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.groundup_owner_self_sparks_add(uuid,integer,text,uuid)
 TO service_role;
COMMIT;
