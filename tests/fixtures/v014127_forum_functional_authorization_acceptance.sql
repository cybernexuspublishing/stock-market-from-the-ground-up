-- v0.14.0.127: DISPOSABLE PostgreSQL 16 fixture ONLY. DO NOT RUN IN SUPABASE.
-- Run after v125 schema, v113, v116, v125 migrations AND v125 acceptance.
-- Adds coverage absent from v125: identity isolation, expired-role recovery,
-- suspended/Showcase denial, optimistic conflicts, parent lock, delete/audit,
-- moderator authorization and protection of official Commons content.
\set ON_ERROR_STOP on
SET ROLE service_role;
DO $v127$
DECLARE
 v_owner uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 v_other uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 v_forum_topic bigint;
 v_forum_reply bigint;
 v_commons_topic bigint;
 v_commons_reply bigint;
 v_version text;
 v_result jsonb;
 v_before integer;
 v_after integer;
BEGIN
 INSERT INTO public.forum_topics(author_id,title,body)
 VALUES(v_other,'Second member original topic','An independent educational market discussion')
 RETURNING id INTO v_forum_topic;
 INSERT INTO public.forum_posts(topic_id,author_id,body)
 VALUES(1,v_other,'A second member contribution')
 RETURNING id INTO v_forum_reply;
 INSERT INTO public.commons_topics(author_user_id,title,body)
 VALUES(v_other,'Second member Commons topic','An independent Commons learning discussion')
 RETURNING id INTO v_commons_topic;
 INSERT INTO public.commons_posts(topic_id,author_user_id,body)
 VALUES(v_commons_topic,v_other,'Evidence, not a recommendation')
 RETURNING id INTO v_commons_reply;

 SELECT updated_at::text INTO v_version FROM public.forum_topics WHERE id=v_forum_topic;
 SELECT count(*) INTO v_before FROM public.admin_audit_log;

 -- An otherwise healthy user must NOT edit another member's content.
 SELECT public.gu_v014116_member_change_with_audit(
   v_owner,'legacy','topic',v_forum_topic,'edit',v_version,
   'Unauthorized rewriting of the other member discussion','Wrong owner',NULL)
 INTO v_result;
 IF v_result->>'reason'<>'denied' THEN
   RAISE EXCEPTION 'v127 cross-user edit was not denied: %',v_result; END IF;
 SELECT public.gu_v014116_member_change_with_audit(
   v_other,'legacy','topic',v_forum_topic,'edit','2000-01-01T00:00:00Z',
   'Outdated content not authorized to overwrite','Outdated title',NULL)
 INTO v_result;
 IF v_result->>'reason'<>'conflict' THEN
   RAISE EXCEPTION 'v127 stale version was not rejected: %',v_result; END IF;

 -- A live Showcase restriction must deny. Expired role must not continue
 -- blocking eligible production members (same semantics as v116 RPC).
 INSERT INTO public.admin_user_roles(user_id,role_code,expires_at)
 VALUES(v_other,'SHOWCASE_VIEWER',NULL);
 SELECT public.gu_v014116_member_change_with_audit(
   v_other,'legacy','topic',v_forum_topic,'edit',v_version,
   'Live Showcase must not edit learning discussions','Live Showcase',NULL)
 INTO v_result;
 IF v_result->>'reason'<>'denied' THEN
   RAISE EXCEPTION 'v127 active Showcase role was not denied: %',v_result; END IF;
 UPDATE public.admin_user_roles
 SET expires_at=now()-interval '1 day'
 WHERE user_id=v_other AND role_code='SHOWCASE_VIEWER';

 -- Suspended user must still be denied even with expired Showcase.
 INSERT INTO public.admin_user_flags(user_id,status) VALUES(v_other,'suspended');
 SELECT public.gu_v014116_member_change_with_audit(
   v_other,'legacy','topic',v_forum_topic,'edit',v_version,
   'Suspended member may not change a discussion','Suspended title',NULL)
 INTO v_result;
 IF v_result->>'reason'<>'denied' THEN
   RAISE EXCEPTION 'v127 suspended account was not denied: %',v_result; END IF;
 DELETE FROM public.admin_user_flags WHERE user_id=v_other;

 -- An expired Showcase restriction must allow a legitimate, audited edit.
 SELECT public.gu_v014116_member_change_with_audit(
   v_other,'legacy','topic',v_forum_topic,'edit',v_version,
   'Edited after the temporary Showcase restriction expired.',
   'Authorized after expiration',NULL)
 INTO v_result;
 IF v_result->>'ok'<>'true' OR v_result->>'auditRecorded'<>'true'
 OR (SELECT title FROM public.forum_topics WHERE id=v_forum_topic)<>'Authorized after expiration' THEN
   RAISE EXCEPTION 'v127 expired Showcase did not recover authorized edit: %',v_result; END IF;
 SELECT count(*) INTO v_after FROM public.admin_audit_log;
 IF v_after<>v_before+1 THEN
   RAISE EXCEPTION 'v127 denied edits wrote audit records, or success lacked exactly one: % vs %',v_after,v_before; END IF;

 -- Parent lock must block member reply edits and write NO member audit.
 SELECT updated_at::text INTO v_version FROM public.forum_topics WHERE id=1;
 SELECT public.gu_v014113_moderate_with_audit(
   v_owner,'legacy','topic',1,'lock',v_version,
   'Temporarily lock discussion to verify member reply safety',NULL,NULL,NULL)
 INTO v_result;
 IF v_result->>'ok'<>'true' THEN
   RAISE EXCEPTION 'v127 owner cannot lock discussion: %',v_result; END IF;
 SELECT updated_at::text INTO v_version FROM public.forum_posts WHERE id=v_forum_reply;
 SELECT count(*) INTO v_before FROM public.admin_audit_log;
 SELECT public.gu_v014116_member_change_with_audit(
   v_other,'legacy','post',v_forum_reply,'edit',v_version,
   'This reply must remain unchanged while its parent is locked',NULL,NULL)
 INTO v_result;
 IF v_result->>'reason'<>'conflict' THEN
   RAISE EXCEPTION 'v127 locked-parent reply mutation not rejected: %',v_result; END IF;
 SELECT count(*) INTO v_after FROM public.admin_audit_log;
 IF v_after<>v_before THEN
   RAISE EXCEPTION 'v127 locked-parent conflict caused an audit write'; END IF;
 SELECT updated_at::text INTO v_version FROM public.forum_topics WHERE id=1;
 SELECT public.gu_v014113_moderate_with_audit(
   v_owner,'legacy','topic',1,'unlock',v_version,
   'Reopen discussion after verifying parent lock behavior',NULL,NULL,NULL)
 INTO v_result;
 IF v_result->>'ok'<>'true' THEN
   RAISE EXCEPTION 'v127 owner cannot unlock discussion: %',v_result; END IF;

 SELECT updated_at::text INTO v_version FROM public.forum_posts WHERE id=v_forum_reply;
 SELECT public.gu_v014116_member_change_with_audit(
   v_other,'legacy','post',v_forum_reply,'delete',v_version,NULL,NULL,'DELETE')
 INTO v_result;
 IF v_result->>'ok'<>'true' OR v_result->>'auditRecorded'<>'true'
 OR (SELECT status FROM public.forum_posts WHERE id=v_forum_reply)<>'deleted' THEN
   RAISE EXCEPTION 'v127 valid member soft-delete was not audited: %',v_result; END IF;

 -- Market Commons official topics require OWNER authorization, including
 -- against an otherwise authorized moderator.
 UPDATE public.commons_topics SET is_official=true WHERE id=v_commons_topic;
 SELECT updated_at::text INTO v_version FROM public.commons_topics WHERE id=v_commons_topic;
 SELECT public.gu_v014116_member_change_with_audit(
   v_other,'commons','topic',v_commons_topic,'edit',v_version,
   'Official editorial content cannot be edited by a regular member',
   'Disallowed editorial edit',NULL)
 INTO v_result;
 IF v_result->>'reason'<>'denied' THEN
   RAISE EXCEPTION 'v127 member could modify official Commons content: %',v_result; END IF;
 INSERT INTO public.admin_user_roles(user_id,role_code,expires_at)
 VALUES(v_other,'MODERATOR',NULL);
 INSERT INTO public.admin_role_permissions(role_code,permission_code)
 VALUES('MODERATOR','forum.moderate');
 SELECT public.gu_v014113_moderate_with_audit(
   v_other,'commons','topic',v_commons_topic,'hide',v_version,
   'A non-owner must not moderate protected official guides',NULL,NULL,NULL)
 INTO v_result;
 IF v_result->>'reason'<>'denied' THEN
   RAISE EXCEPTION 'v127 non-owner moderator changed official Commons: %',v_result; END IF;

 -- Conversely, moderator may hide ordinary Commons member content and
 -- must generate exactly one attributable audit entry.
 SELECT updated_at::text INTO v_version FROM public.commons_posts WHERE id=v_commons_reply;
 SELECT count(*) INTO v_before FROM public.admin_audit_log;
 SELECT public.gu_v014113_moderate_with_audit(
   v_other,'commons','post',v_commons_reply,'hide',v_version,
   'A moderation action with a stated educational integrity reason',NULL,NULL,NULL)
 INTO v_result;
 IF v_result->>'ok'<>'true' OR v_result->>'auditRecorded'<>'true'
 OR (SELECT status FROM public.commons_posts WHERE id=v_commons_reply)<>'hidden' THEN
   RAISE EXCEPTION 'v127 moderator could not atomically hide Commons reply: %',v_result; END IF;
 SELECT count(*) INTO v_after FROM public.admin_audit_log;
 IF v_after<>v_before+1 OR NOT EXISTS(
   SELECT 1 FROM public.admin_audit_log
   WHERE actor_user_id=v_other AND target_id=v_commons_reply::text
     AND action='forum.moderate.hide' AND target_type='commons.post'
     AND details->>'atomic'='true'
 ) THEN RAISE EXCEPTION 'v127 moderator hide lacked precisely one attributable audit';END IF;
 RAISE NOTICE 'PASS v127: identity isolation, version conflicts, Showcase expiry, suspension, locked parent, soft delete, official guide safety, authorized moderator audit';
END $v127$;
RESET ROLE;
