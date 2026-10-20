-- v0.14.0.116 | Owner review required. Additive service-only member edits.
-- Existing Forum and Market Commons tables, identities and audit ledger.
-- Rollback before activation: keep API blocked until SQL reviewed/installed.
-- No client grants, no new discussion schemas, no destructive data changes.
BEGIN;
CREATE OR REPLACE FUNCTION public.gu_v014116_member_change_with_audit(
 p_actor uuid,p_scope text,p_type text,p_id bigint,p_operation text,
 p_version text,p_body text DEFAULT NULL,p_title text DEFAULT NULL,
 p_confirmation text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $forum_v014116$
DECLARE
 v_table text; v_parent_table text; v_author text;
 v_peek jsonb; v_parent jsonb; v_item jsonb;
 v_ts timestamptz;v_parent_id bigint;v_count integer;v_audit bigint;
 v_body_limit integer;v_title_limit integer;
BEGIN
 IF p_actor IS NULL OR p_scope NOT IN ('legacy','commons') OR
 p_type NOT IN ('topic','post') OR p_id IS NULL OR p_id<=0 OR
 p_operation NOT IN ('edit','delete') OR p_version IS NULL OR
 length(p_version) NOT BETWEEN 10 AND 100 THEN
  RETURN jsonb_build_object('ok',false,'reason','invalid_request');END IF;
 BEGIN v_ts:=p_version::timestamptz;
 EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
  RETURN jsonb_build_object('ok',false,'reason','invalid_version');END;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND account_kind='member') OR
 EXISTS(SELECT 1 FROM public.admin_user_flags WHERE user_id=p_actor AND lower(status) IN ('restricted','suspended')) OR
 EXISTS(SELECT 1 FROM public.admin_user_roles WHERE user_id=p_actor AND role_code='SHOWCASE_VIEWER'
  AND (expires_at IS NULL OR expires_at>now())) THEN
  RETURN jsonb_build_object('ok',false,'reason','denied');END IF;
 v_table:=CASE WHEN p_scope='legacy' AND p_type='topic' THEN 'forum_topics'
  WHEN p_scope='legacy' AND p_type='post' THEN 'forum_posts'
  WHEN p_scope='commons' AND p_type='topic' THEN 'commons_topics'
  WHEN p_scope='commons' AND p_type='post' THEN 'commons_posts' ELSE NULL END;
 v_parent_table:=CASE WHEN p_scope='legacy' THEN 'forum_topics' ELSE 'commons_topics' END;
 v_author:=CASE WHEN p_scope='legacy' THEN 'author_id' ELSE 'author_user_id' END;
 IF v_table IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','invalid_request');END IF;
 IF p_type='post' THEN
  -- Preliminary parent ID is not trusted; verify it AGAIN after child lock.
  EXECUTE format('SELECT topic_id FROM public.%I WHERE id=$1',v_table) INTO v_parent_id USING p_id;
  IF v_parent_id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found');END IF;
  -- Lock parent first, so a simultaneous moderator lock/hide cannot cross
  -- member edit commit. FOR SHARE conflicts with moderator UPDATE.
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR SHARE',v_parent_table)
   INTO v_parent USING v_parent_id;
  IF v_parent IS NULL OR v_parent->>'status'<>'published' THEN
   RETURN jsonb_build_object('ok',false,'reason','conflict');END IF;
  IF p_operation='edit' AND coalesce((v_parent->>'is_locked')::boolean,false) THEN
   RETURN jsonb_build_object('ok',false,'reason','conflict');END IF;
 END IF;
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',v_table)
  INTO v_item USING p_id;
 IF v_item IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found');END IF;
 IF v_item->>v_author IS DISTINCT FROM p_actor::text THEN
  RETURN jsonb_build_object('ok',false,'reason','denied');END IF;
 IF v_item->>'status'<>'published' OR (v_item->>'updated_at')::timestamptz IS DISTINCT FROM v_ts THEN
  RETURN jsonb_build_object('ok',false,'reason','conflict');END IF;
 IF p_type='post' AND (v_item->>'topic_id')::bigint IS DISTINCT FROM v_parent_id THEN
  RETURN jsonb_build_object('ok',false,'reason','conflict');END IF;
 IF p_type='topic' THEN
  IF p_scope='commons' AND coalesce((v_item->>'is_official')::boolean,false) THEN
   RETURN jsonb_build_object('ok',false,'reason','denied');END IF;
  IF p_operation='edit' AND coalesce((v_item->>'is_locked')::boolean,false) THEN
   RETURN jsonb_build_object('ok',false,'reason','conflict');END IF;
 END IF;
 IF p_operation='delete' THEN
  IF p_confirmation<>'DELETE' THEN RETURN jsonb_build_object('ok',false,'reason','invalid_request');END IF;
  EXECUTE format('UPDATE public.%I SET status=$1,updated_at=clock_timestamp() WHERE id=$2',v_table)
   USING 'deleted',p_id;
 ELSE
  v_body_limit:=CASE WHEN p_scope='legacy' THEN CASE WHEN p_type='topic' THEN 12000 ELSE 8000 END ELSE 10000 END;
  IF p_body IS NULL OR char_length(trim(p_body)) NOT BETWEEN CASE WHEN p_type='topic' THEN 10 ELSE 2 END AND v_body_limit THEN
   RETURN jsonb_build_object('ok',false,'reason','invalid_request');END IF;
  IF p_type='topic' THEN
   v_title_limit:=CASE WHEN p_scope='legacy' THEN 140 ELSE 180 END;
   IF p_title IS NULL OR char_length(trim(p_title)) NOT BETWEEN 5 AND v_title_limit THEN
    RETURN jsonb_build_object('ok',false,'reason','invalid_request');END IF;
   EXECUTE format('UPDATE public.%I SET body=$1,title=$2,updated_at=clock_timestamp() WHERE id=$3',v_table)
    USING trim(p_body),trim(p_title),p_id;
  ELSE
   EXECUTE format('UPDATE public.%I SET body=$1,updated_at=clock_timestamp() WHERE id=$2',v_table)
    USING trim(p_body),p_id;
  END IF;
 END IF;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 IF v_count<>1 THEN RETURN jsonb_build_object('ok',false,'reason','conflict');END IF;
 -- Uncaught INSERT failure rolls back member content change atomically.
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(p_actor,'forum.member.'||p_operation,p_scope||'.'||p_type,p_id::text,
  jsonb_build_object('scope',p_scope,'atomic',true,'source','gu_v014116_member_change_with_audit'))
 RETURNING id INTO v_audit;
 RETURN jsonb_build_object('ok',true,'operation',p_operation,'atomic',true,'auditRecorded',true,'auditId',v_audit);
END $forum_v014116$;
REVOKE ALL ON FUNCTION public.gu_v014116_member_change_with_audit(uuid,text,text,bigint,text,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014116_member_change_with_audit(uuid,text,text,bigint,text,text,text,text,text)
 TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
-- Owner verifies actual installed columns and trigger behavior; no automatic deployment.
