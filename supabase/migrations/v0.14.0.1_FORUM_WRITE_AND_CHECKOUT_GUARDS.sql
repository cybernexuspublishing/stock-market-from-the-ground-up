-- v0.14.0.1 | Controlled security addition; apply ONCE after v0.14.0.0.
-- Do NOT rerun historic cumulative migrations; this updates 3 named RPCs plus forum-report constraints.
-- Removes Supabase-direct Showcase/TEST forum-write bypass; applies atomic quotas.
-- Maintains every existing Commons ID/post, RLS policy, and book/source metadata.
BEGIN;

-- COMPATIBILITY REPAIR: the historic v0.5 forum_reports schema had a
-- NOT-NULL reporter_id, a (topic_id XOR post_id) CHECK, and a status CHECK
-- allowing only open/reviewed/closed. Later v0.10/v0.11 and v0.14 reports use
-- reporter_user_id, content_id and reviewing/resolved/dismissed instead.
-- The additive columns alone do not remove the old checks: inserts and newer
-- moderation transitions would fail on any database that ever ran v0.5.
-- Preserve all historic rows and both format families; do not delete or rewrite
-- existing reports. Fail closed on unrecognized constraints for manual review.
DO $v0141_reports$
DECLARE c record; definition text;
BEGIN
 IF to_regclass('public.forum_reports') IS NULL THEN
  RAISE EXCEPTION 'forum_reports prerequisite table missing; no changes applied';
 END IF;
 IF EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='forum_reports' AND column_name='reporter_id') THEN
  ALTER TABLE public.forum_reports ALTER COLUMN reporter_id DROP NOT NULL;
 END IF;
 -- Only replace a recognizable legacy exclusive topic_id/post_id constraint.
 IF EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='forum_reports' AND column_name='topic_id')
    AND EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='forum_reports' AND column_name='post_id') THEN
  FOR c IN SELECT conname,pg_get_constraintdef(oid) AS def FROM pg_constraint
            WHERE conrelid='public.forum_reports'::regclass AND contype='c' LOOP
   definition:=lower(c.def);
   IF position('topic_id' IN definition)>0 AND position('post_id' IN definition)>0 THEN
    IF position('= 1' IN definition)=0 THEN
     RAISE EXCEPTION 'Unrecognized forum_reports target constraint: %; manual review required',c.conname;
    END IF;
    EXECUTE format('ALTER TABLE public.forum_reports DROP CONSTRAINT %I',c.conname);
   END IF;
  END LOOP;
  ALTER TABLE public.forum_reports DROP CONSTRAINT IF EXISTS forum_reports_v0141_target_check;
  ALTER TABLE public.forum_reports ADD CONSTRAINT forum_reports_v0141_target_check
   CHECK ((topic_id IS NOT NULL)::integer+(post_id IS NOT NULL)::integer=1
           OR length(trim(coalesce(content_id,'')))>0);
 END IF;
 -- A prior named legacy status constraint might block new moderation statuses.
 FOR c IN SELECT conname,pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conrelid='public.forum_reports'::regclass AND contype='c'
            AND conname='forum_reports_status_check' LOOP
  IF position('status' IN lower(c.def))=0 THEN
   RAISE EXCEPTION 'Unrecognized forum_reports status constraint; manual review required';
  END IF;
  ALTER TABLE public.forum_reports DROP CONSTRAINT forum_reports_status_check;
 END LOOP;
 ALTER TABLE public.forum_reports DROP CONSTRAINT IF EXISTS forum_reports_v0141_status_check;
 ALTER TABLE public.forum_reports ADD CONSTRAINT forum_reports_v0141_status_check
  CHECK (status IS NULL OR status IN
   ('open','reviewed','closed','reviewing','resolved','dismissed'));
END $v0141_reports$;

-- Initial abuse limits are stored in Owner-administered site_settings, not hardcoded
-- inside the forum RPC. Defaults are intentionally conservative and can be changed
-- under the existing Site Settings OWNER workflow after live verification.
INSERT INTO public.site_settings(setting_key,category,value,public_read,description)
VALUES
 ('community.max_topics_per_24h','community','10'::jsonb,false,'Maximum new Market Commons discussions per eligible member in a rolling 24-hour window.'),
 ('community.max_replies_per_24h','community','60'::jsonb,false,'Maximum Market Commons replies per eligible member in a rolling 24-hour window.')
ON CONFLICT(setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.commons_create_topic(p_forum_code text,p_title text,p_body text,p_ticker text DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE v_uid uuid:=auth.uid(); v_id bigint; v_flag text; v_kind text; v_limit integer; v_total bigint;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT account_kind INTO v_kind FROM public.profiles WHERE id=v_uid;
 IF v_kind IS DISTINCT FROM 'member' OR EXISTS(
   SELECT 1 FROM public.admin_user_roles WHERE user_id=v_uid AND role_code='SHOWCASE_VIEWER'
     AND (expires_at IS NULL OR expires_at>now())) THEN
   RAISE EXCEPTION 'Only genuine production members can create discussions';
 END IF;
 SELECT status INTO v_flag FROM public.admin_user_flags WHERE user_id=v_uid;
 IF v_flag IN ('restricted','suspended') THEN RAISE EXCEPTION 'Posting is restricted for this account'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.commons_forums WHERE forum_code=p_forum_code AND active=true)
 THEN RAISE EXCEPTION 'Forum is not available'; END IF;
 IF length(trim(coalesce(p_title,''))) NOT BETWEEN 5 AND 180 OR
    length(trim(coalesce(p_body,''))) NOT BETWEEN 10 AND 10000 OR
    length(coalesce(p_ticker,''))>16 THEN RAISE EXCEPTION 'Invalid discussion length'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text,142011));
 SELECT CASE WHEN jsonb_typeof(value)='number' AND
   (value #>> '{}') ~ '^[0-9]{1,4}$' THEN LEAST(500,GREATEST(1,(value #>> '{}')::integer)) ELSE 10 END
 INTO v_limit FROM public.site_settings WHERE setting_key='community.max_topics_per_24h';
 v_limit:=coalesce(v_limit,10);
 SELECT count(*) INTO v_total FROM public.commons_topics
 WHERE author_user_id=v_uid AND created_at>now()-interval '24 hours';
 IF v_total>=v_limit THEN RAISE EXCEPTION 'Daily discussion limit reached'; END IF;
 INSERT INTO public.commons_topics(forum_code,author_user_id,title,body,ticker)
 VALUES(p_forum_code,v_uid,trim(p_title),trim(p_body),nullif(upper(trim(coalesce(p_ticker,''))),'')) RETURNING id INTO v_id;
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.commons_create_topic(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.commons_create_topic(text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.commons_create_reply(p_topic_id bigint,p_body text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE v_uid uuid:=auth.uid(); v_id bigint; v_flag text; v_kind text; v_limit integer; v_total bigint;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT account_kind INTO v_kind FROM public.profiles WHERE id=v_uid;
 IF v_kind IS DISTINCT FROM 'member' OR EXISTS(
   SELECT 1 FROM public.admin_user_roles WHERE user_id=v_uid AND role_code='SHOWCASE_VIEWER'
     AND (expires_at IS NULL OR expires_at>now())) THEN
   RAISE EXCEPTION 'Only genuine production members can post replies';
 END IF;
 SELECT status INTO v_flag FROM public.admin_user_flags WHERE user_id=v_uid;
 IF v_flag IN ('restricted','suspended') THEN RAISE EXCEPTION 'Posting is restricted for this account'; END IF;
 IF length(trim(coalesce(p_body,''))) NOT BETWEEN 2 AND 10000 THEN
   RAISE EXCEPTION 'Reply must be 2–10,000 characters'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text,142012));
 -- Under the lock, check again that moderators have not locked/hidden the topic.
 IF NOT EXISTS(SELECT 1 FROM public.commons_topics WHERE id=p_topic_id AND status='published' AND is_locked=false)
 THEN RAISE EXCEPTION 'Topic is locked or unavailable'; END IF;
 SELECT CASE WHEN jsonb_typeof(value)='number' AND
   (value #>> '{}') ~ '^[0-9]{1,4}$' THEN LEAST(1000,GREATEST(1,(value #>> '{}')::integer)) ELSE 60 END
 INTO v_limit FROM public.site_settings WHERE setting_key='community.max_replies_per_24h';
 v_limit:=coalesce(v_limit,60);
 SELECT count(*) INTO v_total FROM public.commons_posts
 WHERE author_user_id=v_uid AND created_at>now()-interval '24 hours';
 IF v_total>=v_limit THEN RAISE EXCEPTION 'Daily reply limit reached'; END IF;
 INSERT INTO public.commons_posts(topic_id,author_user_id,body)
 VALUES(p_topic_id,v_uid,trim(p_body)) RETURNING id INTO v_id;
 UPDATE public.commons_topics SET reply_count=reply_count+1,last_post_at=now(),updated_at=now()
 WHERE id=p_topic_id;
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.commons_create_reply(bigint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.commons_create_reply(bigint,text) TO authenticated;


-- Legacy /forum-topic.html remains a protected compatibility route. Its old
-- Supabase tables had username-only RLS; authorization could be bypassed if
-- direct table write grants existed. Preserve legitimate posting while denying synthetic,
-- restricted and suspended identities at the database boundary.
-- RESTRICTIVE policies compose with (never replace) existing Lab-gating RLS.
-- This authorization helper runs as SECURITY DEFINER, because members do not
-- have SELECT permission on internal role/flag tables. It reads auth.uid()
-- rather than accepting an arbitrary UUID from a client request.
CREATE OR REPLACE FUNCTION public.v0141_forum_member_write_allowed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL
  AND EXISTS(SELECT 1 FROM public.profiles p
             WHERE p.id=auth.uid() AND p.account_kind='member')
  AND NOT EXISTS(SELECT 1 FROM public.admin_user_roles r
       WHERE r.user_id=auth.uid() AND r.role_code='SHOWCASE_VIEWER'
         AND (r.expires_at IS NULL OR r.expires_at>now()))
  AND NOT EXISTS(SELECT 1 FROM public.admin_user_flags f
       WHERE f.user_id=auth.uid() AND f.status IN ('restricted','suspended'));
$$;
REVOKE ALL ON FUNCTION public.v0141_forum_member_write_allowed() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.v0141_forum_member_write_allowed() TO authenticated;

DO $$
DECLARE rel text; op text; policy_name text;
BEGIN
 FOREACH rel IN ARRAY ARRAY['forum_topics','forum_posts','forum_reports'] LOOP
  FOREACH op IN ARRAY ARRAY['INSERT','UPDATE'] LOOP
   IF rel='forum_reports' AND op='UPDATE' THEN CONTINUE; END IF;
   policy_name:='v0141_real_member_'||rel||'_'||lower(op);
   EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',policy_name,rel);
   IF op='INSERT' THEN
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.v0141_forum_member_write_allowed())',policy_name,rel);
   ELSE
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.v0141_forum_member_write_allowed()) WITH CHECK (public.v0141_forum_member_write_allowed())',policy_name,rel);
   END IF;
  END LOOP;
 END LOOP;
END $$;

-- Treat a plan-visibility edit as an OFF-only payment control. An Owner cannot
-- accidentally reactivate a previously hidden item using this ordinary panel.
CREATE OR REPLACE FUNCTION public.v014_owner_plan_visibility(
 p_actor uuid,p_code text,p_active boolean,p_visible boolean,p_pause_checkout boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE oldrow record; newrow record;
BEGIN
 IF p_actor IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.admin_user_roles r JOIN public.profiles p ON p.id=r.user_id
  WHERE r.user_id=p_actor AND r.role_code='OWNER'
    AND (r.expires_at IS NULL OR r.expires_at>now()) AND p.account_kind='member'
 ) THEN RAISE EXCEPTION 'OWNER role required'; END IF;
 IF p_code='FREE' AND NOT p_active THEN RAISE EXCEPTION 'FREE fallback cannot be disabled'; END IF;
 SELECT plan_code,active,public_visible,checkout_enabled INTO oldrow FROM public.platform_plans
 WHERE plan_code=p_code FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Plan does not exist'; END IF;
 IF p_code IN ('FOUNDING_MONTHLY','FOUNDING_ANNUAL') AND (p_active OR p_visible) THEN
  RAISE EXCEPTION 'Founding offer requires separately approved payment rollout'; END IF;
 UPDATE public.platform_plans SET active=p_active,public_visible=p_visible,
  checkout_enabled=CASE
   WHEN NOT p_active OR NOT p_visible OR p_pause_checkout THEN false
   WHEN NOT oldrow.active OR NOT oldrow.public_visible THEN false
   ELSE checkout_enabled END,
  updated_at=now() WHERE plan_code=p_code
 RETURNING plan_code,active,public_visible,checkout_enabled INTO newrow;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(p_actor,'v0141.plan_visibility_update','platform_plan',p_code,
  jsonb_build_object('before',jsonb_build_object('active',oldrow.active,'public_visible',oldrow.public_visible,'checkout_enabled',oldrow.checkout_enabled),
   'after',jsonb_build_object('active',newrow.active,'public_visible',newrow.public_visible,'checkout_enabled',newrow.checkout_enabled)));
 RETURN jsonb_build_object('ok',true,'planCode',newrow.plan_code,'active',newrow.active,
    'publicVisible',newrow.public_visible,'checkoutEnabled',newrow.checkout_enabled);
END; $$;
REVOKE ALL ON FUNCTION public.v014_owner_plan_visibility(uuid,text,boolean,boolean,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v014_owner_plan_visibility(uuid,text,boolean,boolean,boolean) TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
