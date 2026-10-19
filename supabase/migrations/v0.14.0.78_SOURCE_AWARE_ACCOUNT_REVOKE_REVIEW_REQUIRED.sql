-- v0.14.0.78 | Existing production Supabase only. Owner review/apply once.
-- Single source-aware, id-bound revocation transaction and audit.
-- Never erase Stripe payments, subscriptions, orders, Book Key redemptions,
-- customer identities, earned competencies, or provider-generated entitlements.
BEGIN;
DO $pre$ BEGIN
 IF EXISTS (SELECT 1 FROM (VALUES ('public.user_plan_grants'),
   ('public.user_library'),('public.user_tool_passes'),('public.admin_user_roles'),
   ('public.profiles'),('public.admin_audit_log')) q(name)
   WHERE to_regclass(q.name) IS NULL)
 THEN RAISE EXCEPTION 'GU78_REQUIRED_EXISTING_TABLES_MISSING'; END IF;
END $pre$;

CREATE OR REPLACE FUNCTION public.gu78_admin_account_resource_revoke(
 p_actor uuid,p_target uuid,p_kind text,p_record_id bigint,p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $gu78$
DECLARE actor_owner boolean; actor_admin boolean; target_staff boolean;
 n integer:=0; source_name text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'GU78_SERVICE_ROLE_ONLY' USING ERRCODE='42501';
 END IF;
 IF p_actor IS NULL OR p_target IS NULL OR p_record_id IS NULL OR p_record_id<1
    OR p_kind NOT IN ('manual_plan','manual_book','manual_tool')
    OR length(trim(coalesce(p_reason,'')))<10
    OR length(trim(coalesce(p_reason,'')))>500 THEN
  RAISE EXCEPTION 'GU78_INVALID_MUTATION' USING ERRCODE='22023';
 END IF;
 IF p_actor=p_target THEN
  RAISE EXCEPTION 'GU78_STAFF_SELF_MUTATION_NOT_ALLOWED' USING ERRCODE='42501';
 END IF;
 SELECT EXISTS(SELECT 1 FROM public.admin_user_roles a
        WHERE a.user_id=p_actor AND a.role_code='OWNER'
          AND (a.expires_at IS NULL OR a.expires_at>now())) INTO actor_owner;
 SELECT EXISTS(SELECT 1 FROM public.admin_user_roles a
        WHERE a.user_id=p_actor AND a.role_code='ADMIN'
          AND (a.expires_at IS NULL OR a.expires_at>now())) INTO actor_admin;
 IF NOT actor_owner AND NOT actor_admin THEN
  RAISE EXCEPTION 'GU78_STAFF_AUTHORITY_REQUIRED' USING ERRCODE='42501';
 END IF;
 SELECT EXISTS(SELECT 1 FROM public.admin_user_roles a
        WHERE a.user_id=p_target AND a.role_code IN ('OWNER','ADMIN','MODERATOR')
          AND (a.expires_at IS NULL OR a.expires_at>now())) INTO target_staff;
 IF NOT actor_owner AND target_staff THEN
  RAISE EXCEPTION 'GU78_ONLY_OWNER_CAN_MANAGE_STAFF' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p
       WHERE p.id=p_target AND p.account_kind NOT IN ('showcase','test')) THEN
  RAISE EXCEPTION 'GU78_REAL_MEMBER_REQUIRED' USING ERRCODE='42501';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(
   'gu78:account:'||p_target::text,0));
 IF p_kind='manual_plan' THEN
  -- Past plans are left untouched. Only explicitly Owner-issued grants.
  UPDATE public.user_plan_grants g
   SET status='canceled',ends_at=LEAST(COALESCE(g.ends_at,now()),now()),
       updated_at=now(),metadata=COALESCE(g.metadata,'{}'::jsonb)||
          jsonb_build_object('adminRevokedBy',p_actor,'adminRevokedAt',now()::text,'reason',p_reason)
   WHERE g.id=p_record_id AND g.user_id=p_target
     AND (g.source='admin' OR left(g.source,6)='admin_')
     AND g.status IN ('active','trialing')
     AND g.starts_at<=now() AND (g.ends_at IS NULL OR g.ends_at>now());
  GET DIAGNOSTICS n=ROW_COUNT;
  source_name:='admin_plan';
 ELSIF p_kind='manual_book' THEN
  -- Book Key and purchase-linked items may not be revoked through this method.
  UPDATE public.user_library b
   SET expires_at=now(),metadata=COALESCE(b.metadata,'{}'::jsonb)||
       jsonb_build_object('adminRevokedBy',p_actor,'adminRevokedAt',now()::text,'reason',p_reason)
   WHERE b.id=p_record_id AND b.user_id=p_target
     AND b.source_channel='admin'
     AND (b.expires_at IS NULL OR b.expires_at>now());
  GET DIAGNOSTICS n=ROW_COUNT;
  source_name:='admin_book';
 ELSIF p_kind='manual_tool' THEN
  -- Null provider alone is insufficient: prove Owner-issued provenance.
  UPDATE public.user_tool_passes t
   SET status='canceled',ends_at=now(),updated_at=now(),
       metadata=COALESCE(t.metadata,'{}'::jsonb)||
          jsonb_build_object('adminRevokedBy',p_actor,'adminRevokedAt',now()::text,'reason',p_reason)
   WHERE t.id=p_record_id AND t.user_id=p_target
     AND t.provider IS NULL AND t.provider_subscription_id IS NULL
     AND (COALESCE(t.metadata->>'admin_manual','false')='true'
       OR COALESCE(t.metadata->>'source','') IN ('admin','owner_manual'))
     AND t.status IN ('active','trialing')
     AND t.starts_at<=now() AND (t.ends_at IS NULL OR t.ends_at>now());
  GET DIAGNOSTICS n=ROW_COUNT;
  source_name:='admin_tool';
 END IF;
 IF n<>1 THEN
  RAISE EXCEPTION 'GU78_NOT_OWNED_ACTIVE_MANUAL_RESOURCE' USING ERRCODE='23514';
 END IF;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
  VALUES(p_actor,'gu78.account_resource.revoked','user',p_target::text,
   jsonb_build_object('kind',p_kind,'recordId',p_record_id,
     'source',source_name,'reason',p_reason,'preserveProviderLedger',true));
 RETURN jsonb_build_object('ok',true,'revoked',true,'kind',p_kind,
   'recordId',p_record_id,'targetUser',p_target,'source',source_name);
END $gu78$;
REVOKE ALL ON FUNCTION public.gu78_admin_account_resource_revoke(uuid,uuid,text,bigint,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu78_admin_account_resource_revoke(uuid,uuid,text,bigint,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
