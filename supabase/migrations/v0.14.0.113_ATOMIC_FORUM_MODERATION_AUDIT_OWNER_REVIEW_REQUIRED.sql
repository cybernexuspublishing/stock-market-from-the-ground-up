-- v0.14.0.113 | EXISTING Supabase project — Owner review before run.
-- Atomic moderation and Owner audit for BOTH legacy forum and Market Commons.
-- No new forum tables, roles, products, public policies or direct browser grants.
BEGIN;
CREATE OR REPLACE FUNCTION public.gu_v014113_moderate_with_audit(
 p_actor uuid,p_scope text,p_type text,p_id bigint,p_action text,
 p_version text,p_note text,p_body text DEFAULT NULL,p_title text DEFAULT NULL,
 p_confirmation text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $forum_v014113$
DECLARE
 v_table text;v_item jsonb;v_owner boolean;v_staff boolean;
 v_status text;v_body_limit integer;v_title_limit integer;
 v_rows integer;v_audit bigint;v_timestamp timestamptz;
BEGIN
 IF p_actor IS NULL OR p_id IS NULL OR p_id<=0 OR p_id>9223372036854775807
   OR p_scope NOT IN ('legacy','commons') OR p_type NOT IN ('topic','post')
   OR p_action NOT IN ('edit','hide','restore','delete','lock','unlock','pin','unpin')
   OR (p_type='post' AND p_action NOT IN ('edit','hide','restore','delete'))
   OR p_version IS NULL OR length(p_version)<10 OR length(p_version)>100
   OR p_note IS NULL OR char_length(trim(p_note)) NOT BETWEEN 5 AND 500
 THEN RETURN jsonb_build_object('ok',false,'reason','invalid_request'); END IF;
 BEGIN v_timestamp:=p_version::timestamptz;
 EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
  RETURN jsonb_build_object('ok',false,'reason','invalid_version');
 END;
 IF NOT EXISTS (SELECT 1 FROM public.profiles
  WHERE id=p_actor AND account_kind='member')
 OR EXISTS (SELECT 1 FROM public.admin_user_flags
  WHERE user_id=p_actor AND lower(status) IN ('restricted','suspended'))
 THEN RETURN jsonb_build_object('ok',false,'reason','denied'); END IF;
 IF EXISTS (SELECT 1 FROM public.admin_user_roles
   WHERE user_id=p_actor AND role_code='SHOWCASE_VIEWER'
   AND (expires_at IS NULL OR expires_at>now()))
 THEN RETURN jsonb_build_object('ok',false,'reason','denied'); END IF;
 SELECT EXISTS(SELECT 1 FROM public.admin_user_roles
  WHERE user_id=p_actor AND role_code='OWNER'
  AND (expires_at IS NULL OR expires_at>now())) INTO v_owner;
 SELECT EXISTS(SELECT 1 FROM public.admin_user_roles r
  JOIN public.admin_role_permissions p ON p.role_code=r.role_code
  WHERE r.user_id=p_actor AND (r.expires_at IS NULL OR r.expires_at>now())
    AND p.permission_code='forum.moderate') INTO v_staff;
 IF NOT v_owner AND NOT v_staff THEN
  RETURN jsonb_build_object('ok',false,'reason','denied');END IF;
 v_table:=CASE
  WHEN p_scope='legacy' AND p_type='topic' THEN 'forum_topics'
  WHEN p_scope='legacy' AND p_type='post' THEN 'forum_posts'
  WHEN p_scope='commons' AND p_type='topic' THEN 'commons_topics'
  WHEN p_scope='commons' AND p_type='post' THEN 'commons_posts'
  ELSE NULL END;
 IF v_table IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','invalid_request');END IF;
 -- Acquire actual row-level lock before inspecting version/status and until
 -- both mutation and audit INSERT are committed by the same statement.
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',v_table)
  INTO v_item USING p_id;
 IF v_item IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found');END IF;
 IF p_scope='commons' AND p_type='topic'
  AND coalesce((v_item->>'is_official')::boolean,false) AND NOT v_owner
 THEN RETURN jsonb_build_object('ok',false,'reason','denied');END IF;
 IF (v_item->>'updated_at')::timestamptz IS DISTINCT FROM v_timestamp
 THEN RETURN jsonb_build_object('ok',false,'reason','conflict');END IF;
 v_status:=v_item->>'status';
 IF p_action='edit' AND v_status NOT IN ('published','hidden') THEN
  RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
 IF p_action='hide' AND v_status<>'published' THEN
  RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
 IF p_action='restore' AND v_status NOT IN ('hidden','deleted') THEN
  RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
 IF p_action='restore' AND v_status='deleted' AND NOT v_owner THEN
  RETURN jsonb_build_object('ok',false,'reason','denied'); END IF;
 IF p_action='delete' AND p_confirmation<>'DELETE' THEN
  RETURN jsonb_build_object('ok',false,'reason','invalid_request');END IF;
 IF p_action='edit' THEN
  v_body_limit:=CASE WHEN p_scope='legacy'
   THEN CASE WHEN p_type='topic' THEN 12000 ELSE 8000 END ELSE 10000 END;
  IF p_body IS NULL OR char_length(trim(p_body)) <
   CASE WHEN p_type='topic' THEN 10 ELSE 2 END
   OR char_length(trim(p_body))>v_body_limit
  THEN RETURN jsonb_build_object('ok',false,'reason','invalid_request');END IF;
  IF p_type='topic' THEN
   v_title_limit:=CASE WHEN p_scope='legacy' THEN 140 ELSE 180 END;
   IF p_title IS NULL OR char_length(trim(p_title)) NOT BETWEEN 5 AND v_title_limit
   THEN RETURN jsonb_build_object('ok',false,'reason','invalid_request');END IF;
   EXECUTE format('UPDATE public.%I SET body=$1,title=$2,updated_at=clock_timestamp() WHERE id=$3',v_table)
    USING trim(p_body),trim(p_title),p_id;
  ELSE
   EXECUTE format('UPDATE public.%I SET body=$1,updated_at=clock_timestamp() WHERE id=$2',v_table)
    USING trim(p_body),p_id;
  END IF;
 ELSIF p_action IN ('hide','restore','delete') THEN
  EXECUTE format('UPDATE public.%I SET status=$1,updated_at=clock_timestamp() WHERE id=$2',v_table)
   USING CASE p_action WHEN 'hide' THEN 'hidden' WHEN 'restore' THEN 'published'
    ELSE 'deleted' END,p_id;
 ELSIF p_action IN ('lock','unlock') THEN
  EXECUTE format('UPDATE public.%I SET is_locked=$1,updated_at=clock_timestamp() WHERE id=$2',v_table)
   USING p_action='lock',p_id;
 ELSIF p_action IN ('pin','unpin') THEN
  EXECUTE format('UPDATE public.%I SET is_pinned=$1,updated_at=clock_timestamp() WHERE id=$2',v_table)
   USING p_action='pin',p_id;
 END IF;
 GET DIAGNOSTICS v_rows=ROW_COUNT;
 IF v_rows<>1 THEN RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
 -- Deliberately leave any audit INSERT exception UNCAUGHT: PostgreSQL rolls
 -- back the UPDATE in the same RPC transaction instead of losing the audit.
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(p_actor,'forum.moderate.'||p_action,p_scope||'.'||p_type,p_id::text,
  jsonb_build_object('scope',p_scope,'note',trim(p_note),
    'fields',CASE WHEN p_action='edit'
     THEN CASE WHEN p_type='topic' THEN jsonb_build_array('title','body')
      ELSE jsonb_build_array('body') END ELSE '[]'::jsonb END,
    'atomic',true,'source','gu_v014113_moderate_with_audit'))
 RETURNING id INTO v_audit;
 RETURN jsonb_build_object('ok',true,'action',p_action,
  'auditRecorded',true,'atomic',true,'auditId',v_audit);
END $forum_v014113$;
REVOKE ALL ON FUNCTION public.gu_v014113_moderate_with_audit(
 uuid,text,text,bigint,text,text,text,text,text,text
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014113_moderate_with_audit(
 uuid,text,text,bigint,text,text,text,text,text,text
) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
-- The existing forum-action API MUST call only this RPC for mutations.
-- It fails closed when this migration has not yet been executed.
-- Independent live owner verification must cover row version collision,
-- audit INSERT failure rollback, Showcase/non-staff, deleted restoration,
-- Owner-only official Commons records, and forum/Commons topic/post edits.
