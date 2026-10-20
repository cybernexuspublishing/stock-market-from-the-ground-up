-- Disposable PG16 v125 security regression. NEVER live Supabase.
\set ON_ERROR_STOP on
DO $test$
DECLARE rel text;
BEGIN
 FOREACH rel IN ARRAY ARRAY['forum_topics','forum_posts','commons_topics','commons_posts'] LOOP
  IF has_any_column_privilege('authenticated','public.'||rel,'UPDATE') OR
     has_table_privilege('authenticated','public.'||rel,'DELETE') THEN
   RAISE EXCEPTION 'FAIL: % direct member mutation still permitted',rel; END IF;
  IF NOT has_table_privilege('authenticated','public.'||rel,'SELECT') OR
   NOT has_any_column_privilege('authenticated','public.'||rel,'INSERT') THEN
   RAISE EXCEPTION 'FAIL: % published READ/new topic WRITE was damaged',rel; END IF;
  IF NOT has_table_privilege('service_role','public.'||rel,'UPDATE') THEN
   RAISE EXCEPTION 'FAIL: service atomic SQL edit capability damaged: %',rel; END IF;
 END LOOP;
END $test$;
SET ROLE authenticated;
SELECT set_config('app.jwt_member_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
DO $blocked$
DECLARE rel text; cols text; rows integer;
BEGIN
 FOREACH rel IN ARRAY ARRAY['forum_topics','forum_posts','commons_topics','commons_posts'] LOOP
  BEGIN
   EXECUTE format('UPDATE public.%I SET body=$1 WHERE id=1',rel)
    USING 'An attacker secretly rewrote a financial discussion without an audit';
   GET DIAGNOSTICS rows=ROW_COUNT;
   IF rows>0 THEN RAISE EXCEPTION 'UNAUTHENTICATED_AUDIT_BYPASS_UPDATE:%',rel; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
   EXECUTE format('DELETE FROM public.%I WHERE id=1',rel);
   GET DIAGNOSTICS rows=ROW_COUNT;
   IF rows>0 THEN RAISE EXCEPTION 'UNAUTHENTICATED_AUDIT_BYPASS_DELETE:%',rel; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
 END LOOP;
END $blocked$;
-- Even if a later migration accidentally restores column-level UPDATE,
-- the v125 RESTRICTIVE RLS denial must still stop browser mutation.
RESET ROLE;
GRANT UPDATE(body) ON public.forum_topics TO authenticated;
SET ROLE authenticated;
DO $blocked$
DECLARE rows integer;
BEGIN
 UPDATE public.forum_topics SET body='Unlogged malicious claim' WHERE id=1;
 GET DIAGNOSTICS rows=ROW_COUNT;
 IF rows<>0 THEN RAISE EXCEPTION 'FAIL: Future column grant bypassed restrictive RLS';END IF;
END $blocked$;
RESET ROLE;
REVOKE UPDATE(body) ON public.forum_topics FROM authenticated;
SET ROLE authenticated;
-- CREATE permissions must remain usable under authenticated RLS.
INSERT INTO public.forum_topics(author_id,title,body) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','New legitimate educational topic',
 'Original introductory educational discussion');
RESET ROLE;
SET ROLE service_role;
DO $audit$
DECLARE v text;result jsonb;count_audits integer;old_body text;
BEGIN
 SELECT updated_at::text INTO v FROM public.forum_topics WHERE id=1;
 SELECT public.gu_v014116_member_change_with_audit(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','legacy','topic',1,'edit',
 v,'Source-backed edited discussion for market learning.','Edited legacy topic',NULL)
 INTO result;
 IF result->>'ok'<>'true' OR result->>'auditRecorded'<>'true' THEN
  RAISE EXCEPTION 'v116 member edit not committed with an audit: %',result;END IF;
 SELECT count(*) INTO count_audits FROM public.admin_audit_log
  WHERE action='forum.member.edit' AND target_type='legacy.topic';
 IF count_audits<>1 THEN RAISE EXCEPTION 'Member edit missing one audit row'; END IF;
 SELECT updated_at::text INTO v FROM public.commons_topics WHERE id=1;
 SELECT public.gu_v014113_moderate_with_audit(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','commons','topic',1,'hide',
 v,'Moderated inaccurate financial statement',NULL,NULL,NULL,NULL)
 INTO result;
 IF result->>'ok'<>'true' OR result->>'auditRecorded'<>'true' THEN
  RAISE EXCEPTION 'v113 staff moderation not committed with audit: %',result;END IF;
 IF (SELECT status FROM public.commons_topics WHERE id=1)<>'hidden' OR
    (SELECT count(*) FROM public.admin_audit_log
     WHERE action='forum.moderate.hide' AND target_type='commons.topic')<>1 THEN
  RAISE EXCEPTION 'Atomic moderation status/audit mismatch';END IF;
 RAISE NOTICE 'PASS v125: member direct update/delete denied, legitimate CREATE and both atomic audited member/moderator operations passed';
END $audit$;
RESET ROLE;
-- Audit ledger failure must rollback a content edit. This revocation is
-- disposable-fixture-only and intentionally never runs in production.
REVOKE INSERT ON public.admin_audit_log FROM service_role;
SET ROLE service_role;
DO $rollback$
DECLARE old_body text; v text;result jsonb;
BEGIN
 SELECT body,updated_at::text INTO old_body,v FROM public.forum_posts WHERE id=1;
 BEGIN
  SELECT public.gu_v014116_member_change_with_audit(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','legacy','post',1,'edit',
   v,'This audit-failure test must roll back the educational reply.',NULL,NULL)
  INTO result;
  RAISE EXCEPTION 'FAIL: edit was applied despite denied audit';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: edit was applied despite denied audit' THEN RAISE; END IF;
 END;
 IF (SELECT body FROM public.forum_posts WHERE id=1) IS DISTINCT FROM old_body THEN
  RAISE EXCEPTION 'Audit failure did not roll back the member reply edit'; END IF;
 RAISE NOTICE 'PASS v125: v116 audit INSERT failure rolled back unchanged reply';
END $rollback$;
RESET ROLE;
GRANT INSERT ON public.admin_audit_log TO service_role;
